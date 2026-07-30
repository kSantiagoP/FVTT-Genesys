/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file
 */

/** */
type ActionTarget = HTMLElement & { dataset: { action: string } };

import GenesysCombat, { InitiativeSkill } from '@/combat/GenesysCombat';
import GenesysCombatant from '@/combat/GenesysCombatant';
import SkillDataModel from '@/item/data/SkillDataModel';
import GenesysItem from '@/item/GenesysItem';
import { Characteristic } from '@/data/Characteristics';

export default class GenesysCombatTracker extends CombatTracker {
	#initiativeSkills?: InitiativeSkill[];

	async initiativeSkills() {
		if (!this.#initiativeSkills || this.#initiativeSkills.length === 0) {
			const compendium = game.packs.get(CONFIG.genesys.settings.skillsCompendium);

			if (!compendium) {
				return [{ skillName: 'Unskilled', skillChar: Characteristic.Brawn }];
			}

			const docs = (await compendium.getDocuments()) as Item[];
			this.#initiativeSkills = docs
				.filter((i) => (i as any).type === 'skill' && (i.system as SkillDataModel).initiative)
				.map((s) => ({ skillName: s.name, skillChar: (s.system as SkillDataModel).characteristic }));
		}

		return this.#initiativeSkills;
	}

	async _onClaimInitiativeSlot(event: PointerEvent) {
		const slotIndex = +($(event.currentTarget as HTMLElement).data('claim-slot') as number);
		const combat = this.viewed as unknown as GenesysCombat;

		if (!canvas.tokens || !combat) return;

		const controlledTokenCount = canvas.tokens.controlled.length;

		// Ensure we have a single token selected to claim this slot.
		if (controlledTokenCount !== 1) {
			ui.notifications.warn(game.i18n.localize('Genesys.Notifications.SelectOneTokenForAction'));
			return;
		}

		const userToken = canvas.tokens.controlled[0];
		const combatant = userToken.combatant as GenesysCombatant;

		// No claiming initiative slots if you aren't in the combat!
		if (!combatant) {
			ui.notifications.warn(game.i18n.localize('Genesys.Notifications.TokenIsNotCombatant'));
			return;
		}

		// Ensure the selected combatant matches the PC/NPC side of the slot.
		if (
			(combatant.disposition === 'friendly' && (combat.turns[slotIndex] as GenesysCombatant).disposition !== 'friendly') ||
			(combatant.disposition !== 'friendly' && (combat.turns[slotIndex] as GenesysCombatant).disposition === 'friendly')
		) {
			ui.notifications.warn(game.i18n.format('Genesys.Notifications.CannotClaimOppositeSlot', { name: combatant.name }));
			return;
		}

		await combat.claimSlot(combat.round, slotIndex, combatant.id!);
	}

	protected override async _prepareTrackerContext(context: CombatTracker.RenderContext, options: CombatTracker.RenderOptions): Promise<CombatTracker.TrackerContext | void> {
		const combat = this.viewed as unknown as GenesysCombat;
		if (!combat) return;

		(combat as any).initiativeSkills = await this.initiativeSkills();

		// Compile a list of all the initiatives for all the combatants.
		const initiatives = combat.combatants.reduce(
			(accumulator, combatant) => {
				accumulator[combatant.id!] = [{ activationId: -1, initiative: combatant.initiative }];
				return accumulator;
			},
			{} as Record<string, { activationId: number; initiative: number | null }[]>,
		);

		combat.extraSlotsForRound(combat.round).forEach((slot) => {
			if (initiatives[slot.activationSource]) {
				initiatives[slot.activationSource].push({
					activationId: slot.index,
					initiative: slot.initiative,
				});
				initiatives[slot.activationSource].sort(this._sortByInitiative);
			}
		});

		const baseContext = await super._prepareTrackerContext(context, options) as CombatTracker.TrackerContext;
		if (!baseContext) return;

		const turns = baseContext.turns.map((t: CombatTracker.TurnContext, index: number) => {
			const combatant = combat.combatants.get(t.id!) as GenesysCombatant;
			const claimantId = combat.claimantForSlot(combat.round, index);
			const claimant = claimantId ? (combat.combatants.get(claimantId) as GenesysCombatant) : undefined;

			const claimed = combat.started ? claimantId !== undefined : true;
			const canClaim = combatant.disposition === 'friendly' || game.user.isGM;

			// Get the highest possible initiative for this combatant.
			const slotInitiative = initiatives[combatant.id!].pop()!;

			let claimantOverride = {};

			if (combat.started && claimant) {
				let defeated = claimant.isDefeated;
				const effects = new Set();
				if (claimant.token) {
					claimant.token.effects.forEach((e) => effects.add(e));
					if ((claimant.token as any).overlayEffect) {
						effects.add((claimant.token as any).overlayEffect);
					}
				}
				if (claimant.actor) {
					for (const e of claimant.actor.temporaryEffects) {
						if ((e as any).getFlag('core', 'statusId') === CONFIG.specialStatusEffects.DEFEATED) {
							defeated = true;
						} else if (e.img) {
							effects.add(e.img);
						}
					}
				}

				claimantOverride = {
					id: claimant.id,
					name: claimant.name,
					img: claimant.img ?? CONST.DEFAULT_TOKEN,
					owner: claimant.isOwner,
					defeated,
					hidden: claimant.hidden,
					canPing: claimant.sceneId === canvas.scene?.id && game.user.hasPermission('PING_CANVAS'),
					effects,
				};
			}

			return {
				...t,
				...claimantOverride,
				slotType: combatant.disposition === 'friendly' ? 'pc' : 'npc',
				initiative: slotInitiative.initiative,
				hasRolled: slotInitiative.initiative !== null,
				initiativeSkill: combatant.initiativeSkill?.skillName ?? (combat as any).initiativeSkills[0]?.skillName,
				claimed,
				canClaim,
				activationId: slotInitiative.activationId,
			};
		});

		// Give the player that claims the current slot the ability to control the turn.
		const claimantId = combat.claimantForSlot(combat.round, combat.turn!);
		const claimant = claimantId ? (combat.combatants.get(claimantId) as GenesysCombatant) : undefined;

		baseContext.turns = turns as CombatTracker.TurnContext[];

		(baseContext as any).control = claimant?.players?.includes(game.user!) ?? false;

		return baseContext;
	}

	protected _sortByInitiative(first: { initiative: number | null }, second: { initiative: number | null }) {
		// Sort all the initiatives from a combatant in ascending order.
		return (first.initiative ?? -Infinity) - (second.initiative ?? -Infinity);
	}

	protected override _getEntryContextOptions(): ContextMenu.Entry<HTMLElement>[] {
		const baseEntries = super._getEntryContextOptions() as ContextMenu.Entry<HTMLElement>[];

		// Update the Reroll Initiative behavior.
		const rerollIndex = baseEntries.findIndex((e) => e.name === 'COMBAT.CombatantReroll');
		const combat = this.viewed as unknown as GenesysCombat;

		if (rerollIndex >= 0) {
			baseEntries[rerollIndex].callback = (li) => {
				const combatant = combat.combatants.get($(li).data('combatant-id') as string);
				const activationId = +$(li).data('activation-id');
				const extraSlotsRolls = activationId >= 0 ? [activationId] : [];
				if (combatant) {
					return combat.rollInitiative([combatant.id!], { prompt: true, extraSlotsRolls });
				}
			};
		}

		// Allow GMs to revoke an initiative slot claim.
		const revokeClaim: ContextMenu.Entry<HTMLElement> = {
			name: 'Genesys.CombatTracker.RevokeInitiativeClaim',
			icon: '<i class="fas fa-broom"></i>',
			callback: async (li) => {
				const index = +$(li).data('slot-index')!;
				if (!isNaN(index)) {
					await combat.revokeSlot(combat.round, index);
				}
			},
		};

		return [...baseEntries, revokeClaim];
	}

	protected override async _onCombatantControl(event: PointerEvent, target: ActionTarget) {
		event.preventDefault();
		event.stopPropagation();

		const btn = event.currentTarget as HTMLElement;
		const li = btn.closest('.combatant') as HTMLElement;
		const combat = this.viewed as unknown as GenesysCombat;

		if (!combat) return;

		// Intercept use of the individual Roll Initiative buttons.
		switch (btn.dataset.control) {
			case 'rollInitiative':
				const activationId = +(li.dataset.activationId as string);
				const extraSlotsRolls = activationId >= 0 ? [activationId] : [];
				await combat.rollInitiative([li.dataset.combatantId as string], { prompt: true, extraSlotsRolls });
				break;

			case 'cycleInitiativeSkill':
				const combatant = combat.combatants.get(li.dataset.combatantId as string) as GenesysCombatant | undefined;
				const initiativeSkills = await this.initiativeSkills();
				if (!initiativeSkills || initiativeSkills.length < 2) {
					return;
				}

				if (combatant) {
					let skillIndex = 0;
					if (combatant.initiativeSkill) {
						skillIndex = initiativeSkills.findIndex((s) => s.skillName.toLowerCase() === combatant.initiativeSkill?.skillName.toLowerCase());
					}

					skillIndex += 1;

					if (skillIndex >= initiativeSkills.length) {
						skillIndex = 0;
					}

					combatant.initiativeSkill = initiativeSkills[skillIndex];
					btn.innerText = initiativeSkills[skillIndex].skillName;
				}
				break;

			default:
				await super._onCombatantControl(event, target);
		}
	}

	protected override async _onCombatantHoverIn(event: PointerEvent) {
		event.preventDefault();

		if (!(event.currentTarget as HTMLElement).classList.contains('claimed')) {
			return;
		}

		return super._onCombatantHoverIn(event);
	}

	protected override async _onCombatantMouseDown(event: PointerEvent, target: ActionTarget) {
		event.preventDefault();

		if (!(event.currentTarget as HTMLElement).classList.contains('claimed')) {
			return;
		}

		return super._onCombatantMouseDown(event, target);
	}

	protected override _onClickAction(event: PointerEvent, target: ActionTarget): Promise<void> {
		if (target.dataset.action === 'claim-slot') {
			return this._onClaimInitiativeSlot(event) as Promise<void>;
		}

		return super._onClickAction(event, target);
	}
}
