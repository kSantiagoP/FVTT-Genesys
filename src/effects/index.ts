/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file Effect registration
 */
import GenesysEffect from '@/effects/GenesysEffect';
import GenesysEffectSheetV2 from './GenesysEffectSheetV2';

export function register() {
	(CONFIG.ActiveEffect as any).documentClass = GenesysEffect;

	DocumentSheetConfig.unregisterSheet(ActiveEffect, 'core', ActiveEffectConfig);
	DocumentSheetConfig.registerSheet(ActiveEffect, 'genesys', GenesysEffectSheetV2 as any, {
		makeDefault: true,
	});
}
