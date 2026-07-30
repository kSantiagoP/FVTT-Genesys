/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file
 */

import GenesysCombat, { register as registerCombatSocket } from '@/combat/GenesysCombat';
import GenesysCombatant from '@/combat/GenesysCombatant';
import GenesysCombatTracker from '@/combat/GenesysCombatTracker';

export function register() {
	(CONFIG.Combat as any).documentClass = GenesysCombat;
	(CONFIG.Combatant as any).documentClass = GenesysCombatant;

	(CONFIG.ui as any).combat = GenesysCombatTracker;

	registerCombatSocket();
}
