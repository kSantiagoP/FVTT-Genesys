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
import GenesysCombatTrackerV13 from '@/combat/GenesysCombatTracker[v13]';

export function register() {
	(CONFIG.Combat as any).documentClass = GenesysCombat;
	(CONFIG.Combatant as any).documentClass = GenesysCombatant;

	if (game.version.startsWith('13')) {
		(CONFIG.ui as any).combat = GenesysCombatTrackerV13;
	} else {
		(CONFIG.ui as any).combat = GenesysCombatTracker;
	}

	registerCombatSocket();
}
