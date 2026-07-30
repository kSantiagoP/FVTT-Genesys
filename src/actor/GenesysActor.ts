/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file Base Genesys Actor
 */
import GenesysCombat from '@/combat/GenesysCombat';
import GenesysCombatant from '@/combat/GenesysCombatant';
import IHasPreCreate from '@/data/IHasPreCreate';
import IHasOnDelete from '@/data/IHasOnDelete';
import { DataModelWithTokenAttributes, TokenAttributeDetails } from '@/token/GenesysTokenDocument';

export default class GenesysActor<T extends foundry.abstract.DataModel<any, any, any> = any> extends Actor {

    get systemData(): T {
        return this.system as T;
    }

    protected override async _preCreate(data: any, options: any, user: any) {
        await (<IHasPreCreate<any>>this.systemData).preCreate?.(this, data, options, user);
        return super._preCreate(data, options, user);
    }

    protected override _onDelete(options: any, userId: string) {
        (<IHasOnDelete<any>>this.systemData).onDelete?.(this, options, userId);
        super._onDelete(options, userId);
    }

    static override createDialog(data?: { folder?: string | undefined } | undefined, options?: any): Promise<any> {
        const existingClasses = Array.isArray(options?.classes) ? options.classes : [];

        const touchedOptions = {
            ...options,
            classes: [...existingClasses, 'dialog', 'dialog-actor-create'],
        };

        return super.createDialog(data as any, touchedOptions as any);
    }

    override async modifyTokenAttribute(attribute: string, value: number, isDelta?: boolean, isBar?: boolean) {
        const tokenAttributes = (this.systemData.constructor as DataModelWithTokenAttributes)?.tokenAttributes;
        if (tokenAttributes) {
            const tokenAttribute = tokenAttributes[attribute] as TokenAttributeDetails | undefined;
            if (!tokenAttribute || !tokenAttribute.editable) {
                return this;
            }

            return await this.update({
                [`system.${tokenAttribute.valuePath}`]: isDelta ? Number(foundry.utils.getProperty(this.systemData, tokenAttribute.valuePath)) + value : value,
            });
        } else {
            return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
        }
    }

    override async rollInitiative(options?: Actor.RollInitiativeOptions) {
        await super.rollInitiative(options);

        // No V14 rollInitiative retorna void, então precisamos buscar o combate ativo manualmente
        const combat = (this as any).combat ?? game.combat;
        if (!combat) return;

        const extraSlots = combat.extraSlotsForRound(combat.round);
        const extraInitiativeRolls = extraSlots.reduce(
            (accum: any, slot: any) => {
                const combatant = combat.combatants.get(slot.activationSource) as GenesysCombatant | undefined;

                const cAny = combatant as any;

                if (
                    combatant &&
                    ((this.isToken && cAny.token === this.token) || (!this.isToken && cAny.actor === this)) &&
                    (options?.rerollInitiative ?? false) || slot.initiative === null
                ) {
                    accum.combatantsIds.push(cAny.id ?? cAny._id);
                    accum.activationIds.push(slot.index);
                }

                return accum;
            },
            { combatantsIds: [], activationIds: [] } as { combatantsIds: string[]; activationIds: number[] },
        );

        await combat.rollInitiative(extraInitiativeRolls.combatantsIds, options?.initiativeOptions, { extraSlotsRolls: extraInitiativeRolls.activationIds });
        return combat;
    }
}
