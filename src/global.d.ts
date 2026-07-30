/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file Provides overridden, system-specific type data for Foundry's CONFIG global.
 */

import GenesysActor from '@/actor/GenesysActor';
import GenesysItem from '@/item/GenesysItem';
import GenesysCombat from '@/combat/GenesysCombat';
import { GENESYS_CONFIG } from '@/config';
import GenesysActorDirectory from '@/sidebar/GenesysActorDirectory';
import GenesysItemDirectory from '@/sidebar/GenesysItemDirectory';

declare global {
	const ui: FoundryUI<
		GenesysActor,
		GenesysActorDirectory<GenesysActor>,
		GenesysItem,
		GenesysItemDirectory<GenesysItem>,
		ChatMessage<GenesysActor>,
		ChatLog<ChatMessage<GenesysActor>>,
		CompendiumDirectory,
		GenesysCombat
	>;
	const canvas: Canvas;

	// Extend the V14 CONFIG interface with system-specific config via declaration merging.
	interface CONFIG {
		genesys: typeof GENESYS_CONFIG;
	}

	const game: Game<GenesysActor, Actors<GenesysActor>, ChatMessage<GenesysActor>, GenesysCombat, GenesysItem, Macro, Scene, User<GenesysActor>>;
}
