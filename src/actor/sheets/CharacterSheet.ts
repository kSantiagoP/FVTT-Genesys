/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file Player Character Sheet
 */

import VueCharacterSheet from '@/vue/sheets/actor/CharacterSheet.vue';
import GenesysItem from '@/item/GenesysItem';
import BaseItemDataModel from '@/item/data/BaseItemDataModel';
import CharacterDataModel from '@/actor/data/CharacterDataModel';
import ArchetypeDataModel from '@/item/data/ArchetypeDataModel';
import CareerDataModel from '@/item/data/CareerDataModel';
import SkillDataModel from '@/item/data/SkillDataModel';
import { EntryType } from '@/actor/data/character/ExperienceJournal';
import CareerSkillPrompt from '@/app/CareerSkillPrompt';
import TalentDataModel from '@/item/data/TalentDataModel';
import VueSheet from '@/vue/VueSheet';
import GenesysActorSheet from '@/actor/GenesysActorSheet';
import { ActorSheetContext } from '@/vue/SheetContext';
import { DragTransferData } from '@/data/DragTransferData';
import { transferInventoryBetweenActors } from '@/operations/TransferBetweenActors';
import { EquipmentState } from '@/item/data/EquipmentDataModel';
import GenesysActor from '@/actor/GenesysActor';

/**
 * Actor sheet used for Player Characters
 */
export default class CharacterSheet extends VueSheet(GenesysActorSheet<CharacterDataModel>) {

    override get vueComponent() {
        return VueCharacterSheet;
    }

    override async getVueContext(): Promise<ActorSheetContext<any>> {
        return {
            sheet: this,
            data: await this.getData(),
        };
    }

    static override get defaultOptions() {
        return {
            ...super.defaultOptions,
            tabs: [
                {
                    navSelector: '.sheet-tabs',
                    contentSelector: '.sheet-body',
                    initial: 'skills',
                },
            ],
        };
    }

    // ts-expect-error - Ocultado pelo Mixin do Vue
    protected override async _onDropItem(event: DragEvent, data: any): Promise<GenesysItem<any>[] | boolean> {
        event.stopPropagation();

        const dragData = data as DragTransferData;
        if (!dragData.uuid) {
            return false;
        }

        const droppedItem = (await foundry.utils.fromUuid(dragData.uuid)) as unknown as GenesysItem<any>;
        if (!droppedItem || droppedItem.actor?.uuid === this.actor.uuid) {
            return false;
        }

        if (!this.isEditable) {
            return false;
        }

        let clonedDroppedItem: GenesysItem<any>[] | undefined | boolean;
        
        if (CharacterDataModel.isRelevantTypeForContext('APTITUDE', droppedItem.type as string)) {
            if ((droppedItem.type as string) === 'archetype') {
                const existingArchetype = this.actor.items.find((i: any) => (i.type as string) === 'archetype');
                if (existingArchetype) {
                    if (!this.canRemoveArchetype()) {
                        return false;
                    }
                    await this.removeArchetype(existingArchetype as GenesysItem<ArchetypeDataModel>);
                }

                await this.applyArchetype(droppedItem as GenesysItem<ArchetypeDataModel>);

                // @ts-expect-error
                clonedDroppedItem = await super._onDropItem(event, data);
            } else if ((droppedItem.type as string) === 'career') {
                if (this.actor.systemData.experienceJournal.entries.some((entry: any) => (entry.type as string) === EntryType.Skill)) {
                    return false;
                }

                const existingCareer = this.actor.items.find((i: any) => (i.type as string) === 'career');
                if (existingCareer) {
                    await this.removeCareer(existingCareer as GenesysItem<CareerDataModel>);
                }

                const career = await this.applyCareer(droppedItem as GenesysItem<CareerDataModel>);
                clonedDroppedItem = [career];
            } else {
                // @ts-expect-error
                clonedDroppedItem = await super._onDropItem(event, data);
            }
        } else if (CharacterDataModel.isRelevantTypeForContext('SKILL', droppedItem.type as string)) {
            if ((droppedItem.type as string) === 'skill' && this.actor.items.find((item: any) => (item.type as string) === 'skill' && item.name === droppedItem.name)) {
                return false;
            }
            // @ts-expect-error
            clonedDroppedItem = await super._onDropItem(event, data);
        } else if (CharacterDataModel.isRelevantTypeForContext('COMBAT', droppedItem.type as string)) {
            // @ts-expect-error
            clonedDroppedItem = await super._onDropItem(event, data);
        } else if (CharacterDataModel.isRelevantTypeForContext('TALENT', droppedItem.type as string)) {
            if ((droppedItem.type as string) === 'ability') {
                // @ts-expect-error
                clonedDroppedItem = await super._onDropItem(event, data);
            } else if ((droppedItem.type as string) === 'talent') {
                const droppedTalent = droppedItem as GenesysItem<TalentDataModel>;
                let targetTalent = this.actor.items.find((i: any) => (i.type as string) === 'talent' && i.name === droppedTalent.name) as GenesysItem<TalentDataModel> | undefined;

                if (targetTalent) {
                    if (targetTalent.systemData.ranked === 'no') {
                        ui.notifications?.info((game as any).i18n.format('Genesys.Notifications.TalentNotRanked', { talentName: targetTalent.name }));
                        return false;
                    }

                    const newRank = targetTalent.systemData.rank + 1;
                    const newEffectiveTier = targetTalent.systemData.effectiveNextTier;
                    const cost = targetTalent.systemData.advanceCost;
                    const talentPyramidTotals = this.actor.systemData.talentPyramidTotals;

                    if (talentPyramidTotals[newEffectiveTier - 1] <= talentPyramidTotals[newEffectiveTier] + 1) {
                        ui.notifications?.info(
                            (game as any).i18n.format('Genesys.Notifications.CannotPurchaseTalentTier', {
                                tier: newEffectiveTier,
                                lowerTier: newEffectiveTier - 1,
                                minimum: talentPyramidTotals[newEffectiveTier] + 2,
                            }),
                        );
                        return false;
                    } else if (this.actor.systemData.availableXP < cost) {
                        ui.notifications?.info((game as any).i18n.format('Genesys.Notifications.CannotAffordRankedTalent', { name: droppedTalent.name, newRank, cost }));
                        return false;
                    }

                    await targetTalent.update({
                        'system.rank': newRank,
                    } as Record<string, unknown>);

                    await this.actor.update({
                        'system.experienceJournal.entries': [
                            ...this.actor.systemData.experienceJournal.entries,
                            {
                                amount: -cost,
                                type: EntryType.TalentRank,
                                data: {
                                    name: targetTalent.name,
                                    id: targetTalent.id,
                                    tier: newEffectiveTier,
                                    rank: newRank,
                                },
                            },
                        ],
                    } as Record<string, unknown>);
                } else {
                    const newEffectiveTier = droppedTalent.systemData.tier;
                    const cost = newEffectiveTier * 5;
                    const talentPyramidTotals = this.actor.systemData.talentPyramidTotals;

                    if (talentPyramidTotals[newEffectiveTier - 1] <= talentPyramidTotals[newEffectiveTier] + 1) {
                        ui.notifications?.info(
                            (game as any).i18n.format('Genesys.Notifications.CannotPurchaseTalentTier', {
                                tier: newEffectiveTier,
                                lowerTier: newEffectiveTier - 1,
                                minimum: talentPyramidTotals[newEffectiveTier] + 2,
                            }),
                        );
                        return false;
                    } else if (this.actor.systemData.availableXP < cost) {
                        ui.notifications?.info((game as any).i18n.format('Genesys.Notifications.CannotAffordTalent', { name: droppedTalent.name, cost }));
                        return false;
                    }

                    //ts-expect-error
                    [targetTalent] = (await this._onDropItemCreate(droppedTalent.toObject())) as GenesysItem<TalentDataModel>[];

                    await this.actor.update({
                        'system.experienceJournal.entries': [
                            ...this.actor.systemData.experienceJournal.entries,
                            {
                                amount: -cost,
                                type: EntryType.NewTalent,
                                data: {
                                    name: targetTalent.name,
                                    id: targetTalent.id,
                                    tier: targetTalent.systemData.tier,
                                    rank: 1,
                                },
                            },
                        ],
                    } as Record<string, unknown>);
                }

                clonedDroppedItem = [targetTalent];
            } else {
                // @ts-expect-error
                clonedDroppedItem = await super._onDropItem(event, data);
            }
        } else if (CharacterDataModel.isRelevantTypeForContext('INVENTORY', droppedItem.type as string)) {
            if (droppedItem.actor) {
                clonedDroppedItem = await transferInventoryBetweenActors(dragData, this.actor, (type: any) => CharacterDataModel.isRelevantTypeForContext('INVENTORY', type));
            } else {
                // @ts-expect-error
                clonedDroppedItem = await super._onDropItem(event, data);
            }

            if (Array.isArray(clonedDroppedItem)) {
                await this.actor.systemData.handleEffectsStatus(clonedDroppedItem, { equipmentState: EquipmentState.Carried });
            }
        } else {
            return false;
        }

        return clonedDroppedItem ?? false;
    }

    async #updateForArchetype(workingData: CharacterDataModel) {
        await this.actor.update({
            'system.characteristics.brawn': workingData.characteristics.brawn,
            'system.characteristics.agility': workingData.characteristics.agility,
            'system.characteristics.intellect': workingData.characteristics.intellect,
            'system.characteristics.cunning': workingData.characteristics.cunning,
            'system.characteristics.willpower': workingData.characteristics.willpower,
            'system.characteristics.presence': workingData.characteristics.presence,
            'system.wounds.max': workingData.wounds.max,
            'system.strain.max': workingData.strain.max,
            'system.experienceJournal.entries': workingData.experienceJournal.entries,
        } as Record<string, unknown>);
    }

    canRemoveArchetype() {
        return this.actor.systemData.experienceJournal.entries.length <= 1;
    }

    async applyArchetype(archetype: GenesysItem<ArchetypeDataModel>) {
        const workingData = <CharacterDataModel>foundry.utils.deepClone(this.actor.systemData);
        const archetypeData = archetype.systemData;

        workingData.characteristics.brawn += archetypeData.characteristics.brawn;
        workingData.characteristics.agility += archetypeData.characteristics.agility;
        workingData.characteristics.intellect += archetypeData.characteristics.intellect;
        workingData.characteristics.cunning += archetypeData.characteristics.cunning;
        workingData.characteristics.willpower += archetypeData.characteristics.willpower;
        workingData.characteristics.presence += archetypeData.characteristics.presence;

        workingData.wounds.max += archetypeData.woundThreshold + archetypeData.characteristics.brawn;
        workingData.strain.max += archetypeData.strainThreshold + archetypeData.characteristics.willpower;

        const items = archetypeData.grantedItems;
        const nonSkills = items.filter((i: any) => i && i.type !== 'skill');
        
        await this.actor.createEmbeddedDocuments('Item', nonSkills as any);

        const grantedSkills = items.filter((i: any) => i && (i.type as string) === 'skill').map((s: any) => s.name);
        
        await Promise.all(
            this.actor.items
                .filter((i: any) => (i.type as string) === 'skill')
                .map(async (skill: any) => {
                    if (grantedSkills.includes(skill.name)) {
                        await skill.update({
                            'system.rank': (<SkillDataModel>skill.system).rank + 1,
                        });
                    }
                }),
        );

        workingData.experienceJournal.entries = [
            {
                amount: archetypeData.startingXP,
                type: EntryType.Starting,
            },
            ...workingData.experienceJournal.entries,
        ];

        await this.#updateForArchetype(workingData);
    }

    async removeArchetype(archetype: GenesysItem<ArchetypeDataModel>) {
        const workingData = <CharacterDataModel>foundry.utils.deepClone(this.actor.systemData);
        const archetypeData = archetype.systemData;

        workingData.characteristics.brawn -= archetypeData.characteristics.brawn;
        workingData.characteristics.agility -= archetypeData.characteristics.agility;
        workingData.characteristics.intellect -= archetypeData.characteristics.intellect;
        workingData.characteristics.cunning -= archetypeData.characteristics.cunning;
        workingData.characteristics.willpower -= archetypeData.characteristics.willpower;
        workingData.characteristics.presence -= archetypeData.characteristics.presence;

        workingData.wounds.max -= archetypeData.woundThreshold + archetypeData.characteristics.brawn;
        workingData.strain.max -= archetypeData.strainThreshold + archetypeData.characteristics.willpower;

        workingData.experienceJournal.entries = workingData.experienceJournal.entries.slice(1);

        const items = archetypeData.grantedItems;
        const nonSkills = items.filter((i: any) => i && i.type !== 'skill').map((a: any) => a.name);
        
        await Promise.all(
            this.actor.items
                .filter((i: any) => i.type !== 'skill')
                .map(async (i: any) => {
                    if (nonSkills.includes(i.name)) {
                        await i.delete();
                    }
                }),
        );

        const grantedSkills = items.filter((i: any) => i && (i.type as string) === 'skill').map((s: any) => s.name);
        await Promise.all(
            this.actor.items
                .filter((i: any) => (i.type as string) === 'skill')
                .map(async (i: any) => {
                    if (grantedSkills.includes(i.name)) {
                        await i.update({
                            'system.rank': (<SkillDataModel>i.system).rank - 1,
                        });
                    }
                }),
        );

        await this.#updateForArchetype(workingData);
        await archetype.delete();
    }

    async applyCareer(droppedCareer: GenesysItem<CareerDataModel>) {
        // ts-expect-error
        const [career] = await this._onDropItemCreate(droppedCareer.toObject()) as any;
        const careerSkillNames = droppedCareer.systemData.careerSkills.map((s: any) => s.name.toLowerCase());

        const commonSkills = <GenesysItem<SkillDataModel>[]>this.actor.items.filter((i: any) => (i.type as string) === 'skill' && careerSkillNames.includes(i.name.toLowerCase()));
        const selectedSkills = await CareerSkillPrompt.promptForSkills(commonSkills);

        await career.update({
            'system.selectedSkillIDs': selectedSkills,
        });

			await Promise.all(
            commonSkills.map(
                async (skill) =>
                    await skill.update({
                        'system.career': true,
                        'system.rank': skill.systemData.rank + (selectedSkills.includes(skill.id as string) ? 1 : 0),
                    } as Record<string, unknown>),
            ),
        );

        return career;
    }

    async removeCareer(career: GenesysItem<CareerDataModel>) {
        const careerData = career.systemData;
        const careerSkillNames = careerData.careerSkills.map((s: any) => s.name);
        const skills = <GenesysItem<SkillDataModel>[]>this.actor.items.filter((i: any) => (i.type as string) === 'skill');

		await Promise.all(
            skills.map(async (skill) => {
                if (careerSkillNames.includes(skill.name)) {
                    const rank = skill.systemData.rank - (careerData.selectedSkillIDs.includes(skill.id as string) ? 1 : 0);

                    await skill.update({
                        'system.career': false,
                        'system.rank': rank,
                    } as Record<string, unknown>);
                }
            }),
        );

        await career.delete();
    }
}