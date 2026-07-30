/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file Base Genesys Item
 */

import GenesysActor from '@/actor/GenesysActor';
import BaseItemDataModel from '@/item/data/BaseItemDataModel';
import IHasPreCreate from '@/data/IHasPreCreate';

/**
 * Item class used as a base for all Genesys items.
 */
export default class GenesysItem<T extends BaseItemDataModel = any> extends Item {
    /**
     * Specialized property for accessing `item.system` in a typed manner.
     */
    get systemData(): T {
        return this.system as T;
    }

    /**
     * Override the _preCreate callback to call preCreate from the data model class, if present.
     * @inheritDoc
     */
    protected override async _preCreate(data: any, options: any, user: any) {
        // Alterado de <this> para <any> para evitar conflitos de restrição de 'Parent' na V14
        await (<IHasPreCreate<any>>this.systemData).preCreate?.(this, data, options, user);

        return super._preCreate(data, options, user);
    }

    /**
     * Override the createDialog callback to include an unique class that identifies the created dialog.
     * @inheritDoc
     */
    static override createDialog(data?: { folder?: string | undefined } | undefined, options?: any): Promise<any> {
        // Garante que 'classes' será tratado como array, evitando o erro de Symbol.iterator
        const existingClasses = Array.isArray(options?.classes) ? options.classes : [];

        const touchedOptions = {
            ...options,
            classes: [...existingClasses, 'dialog', 'dialog-item-create'],
        };

        return super.createDialog(data as any, touchedOptions as any);
    }
}