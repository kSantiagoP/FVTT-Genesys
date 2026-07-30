/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file
 */

import GenesysActor from '@/actor/GenesysActor';
import AdversaryDataModel from '@/actor/data/AdversaryDataModel';
import CharacterDataModel from '@/actor/data/CharacterDataModel';
import GenesysCombat, { InitiativeSkill } from '@/combat/GenesysCombat';
import GenesysItem from '@/item/GenesysItem';
import SkillDataModel from '@/item/data/SkillDataModel';
import MinionDataModel from '@/actor/data/MinionDataModel';
import { Characteristic } from '@/data/Characteristics';
import GenesysRoller from '@/dice/GenesysRoller';

export default class GenesysCombatant extends Combatant {
	initiativeSkill?: InitiativeSkill;

	get disposition() {
		const token = this.actor?.token ?? (this.actor?.prototypeToken as any);
		if (!token) return 'neutral';

		switch (token.disposition) {
			case CONST.TOKEN_DISPOSITIONS.FRIENDLY:
				return 'friendly';

			case CONST.TOKEN_DISPOSITIONS.NEUTRAL:
				return 'neutral';

			case CONST.TOKEN_DISPOSITIONS.HOSTILE:
				return 'hostile';

			default:
				return 'neutral';
		}
	}

	override async rollInitiative(formula?: string): Promise<this | undefined> {
		const roll = this.getInitiativeRoll(formula ?? 'Unskilled');
		await roll.evaluate();
		const results = GenesysRoller.parseRollResults(roll);

		return this.update({ initiative: results.netSuccess + results.netAdvantage / 100 });
	}

	override getInitiativeRoll(skillName: string = 'Unskilled', charFallback: Characteristic = Characteristic.Brawn) {
		const actor = this.actor;
		if (!actor) return new Roll('0');

		const skill = actor.items.find((i) => (i.type as string) === 'skill' && i.name.toLowerCase() === skillName.toLowerCase()) as GenesysItem<SkillDataModel> | undefined;
		const characteristic = skill?.systemData?.characteristic ?? charFallback;
		const system = actor.system as CharacterDataModel | AdversaryDataModel;
		const characteristicValue = system.characteristics[characteristic];

		let skillValue = skill?.systemData?.rank ?? 0;
		if (skill && (actor.type as string) === 'minion') {
			skillValue = Math.clamp((actor.system as MinionDataModel).remainingMembers - 1, 0, 5);
		}

		const yellow = Math.min(characteristicValue, skillValue);
		const green = Math.max(characteristicValue, skillValue) - yellow;

		const useSuperCharacteristic = CONFIG.genesys.settings.useSuperCharacteristics && system.superCharacteristics.has(characteristic);

		return new Roll(`${yellow}dP${useSuperCharacteristic ? 'X' : ''}+${green}dA`);
	}
}
