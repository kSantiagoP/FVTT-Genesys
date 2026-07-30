/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file Item Sheet Registration
 */

import AbilitySheet from '@/vue/sheets/item/AbilitySheet.vue';
import ArmorSheet from '@/item/sheets/ArmorSheet';
import EquipmentSheet from '@/vue/sheets/item/EquipmentSheet.vue';
import InjurySheet from '@/vue/sheets/item/InjurySheet.vue';
import ItemQualitySheet from '@/vue/sheets/item/ItemQualitySheet.vue';
import SkillSheet from '@/vue/sheets/item/SkillSheet.vue';
import TalentSheet from '@/vue/sheets/item/TalentSheet.vue';
import BaseWeaponSheet from '@/item/sheets/BaseWeaponSheet';
import WeaponSheet from '@/vue/sheets/item/WeaponSheet.vue';
import VehicleWeaponSheet from '@/vue/sheets/item/VehicleWeaponSheet.vue';
import ArchetypeSheet from '@/item/sheets/ArchetypeSheet';
import CareerSheet from '@/item/sheets/CareerSheet';
import VueSheet from '@/vue/VueSheet';
import GenesysItemSheet from '@/item/GenesysItemSheet';
import { GenesysItemSheetData, ItemSheetContext } from '@/vue/SheetContext';

type VueSheetConstructor = new (...args: any[]) => {
	getVueContext(): Promise<ItemSheetContext | undefined>;
};

/**
 * Constructs a vue-based ItemSheet subclass with little extra processing.
 * @param vueComponent Vue component to use for the sheet.
 * @param sheetType Base class to use for the sheet.
 */
function basicSheet(vueComponent: any, sheetType: VueSheetConstructor = VueSheet(GenesysItemSheet as any)) {
	return class extends sheetType {
		get vueComponent() {
			return vueComponent;
		}

		override async getVueContext(): Promise<ItemSheetContext | undefined> {
			const thisAsSheet = this as unknown as GenesysItemSheet;
			return {
				sheet: thisAsSheet,
				data: (await thisAsSheet.getData()) as GenesysItemSheetData,
			};
		}
	} as unknown as ConstructorOf<GenesysItemSheet>;
}

/**
 * Registers Item sheets used by the system.
 */
export function register() {
	Items.unregisterSheet('core', ItemSheet);

	Items.registerSheet('genesys', basicSheet(AbilitySheet) as any, {
		types: ['ability'],
		makeDefault: true,
	});

	Items.registerSheet('genesys', ArmorSheet as any, {
		types: ['armor'],
		makeDefault: true,
	});

	Items.registerSheet('genesys', basicSheet(EquipmentSheet) as any, {
		types: ['consumable', 'container', 'gear'],
		makeDefault: true,
	});

	Items.registerSheet('genesys', basicSheet(InjurySheet) as any, {
		types: ['injury'],
		makeDefault: true,
	});

	Items.registerSheet('genesys', basicSheet(ItemQualitySheet) as any, {
		types: ['quality'],
		makeDefault: true,
	});

	Items.registerSheet('genesys', basicSheet(SkillSheet) as any, {
		types: ['skill'],
		makeDefault: true,
	});

	Items.registerSheet('genesys', basicSheet(TalentSheet) as any, {
		types: ['talent'],
		makeDefault: true,
	});

	Items.registerSheet('genesys', basicSheet(WeaponSheet, BaseWeaponSheet as VueSheetConstructor) as any, {
		types: ['weapon'],
		makeDefault: true,
	});

	Items.registerSheet('genesys', basicSheet(VehicleWeaponSheet, BaseWeaponSheet as VueSheetConstructor) as any, {
		types: ['vehicleWeapon'],
		makeDefault: true,
	});

	Items.registerSheet('genesys', ArchetypeSheet as any, {
		types: ['archetype'],
		makeDefault: true,
	});

	Items.registerSheet('genesys', CareerSheet as any, {
		types: ['career'],
		makeDefault: true,
	});
}
