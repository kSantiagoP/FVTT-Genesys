/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file System Entry Point
 */

import { register as registerConfig, ready as readyConfigs } from '@/config';
import { register as registerCombat } from '@/combat';
import { register as registerSidebars } from '@/sidebar';
import { register as registerDice } from '@/dice';
import { register as registerEnrichers } from '@/enrichers';
import { register as registerFonts } from '@/fonts';
import { register as registerHandlebarsHelpers } from '@/handlebars';
import { NAMESPACE as SETTINGS_NAMESPACE, register as registerSettings } from '@/settings';
import { KEY_ALPHA_VERSION } from '@/settings/alpha';
import { KEY_DEFAULT_DIFFICULTY } from '@/settings/campaign';

import { register as registerStoryPointTracker } from '@/app/StoryPointTracker';
import { register as registerActors, AdversaryTypes } from '@/actor';
import { register as registerToken } from '@/token';
import { register as registerEffects } from '@/effects';
import { register as registerItems, CharacterCreationItemTypes, EquipmentItemTypes } from '@/item';
import { register as registerVehicles } from '@/actor/data/VehicleDataModel';
import DicePrompt, { registerWorker } from '@/app/DicePrompt';

import GenesysActor from '@/actor/GenesysActor';
import GenesysCompendium from '@/sidebar/GenesysCompendium';
import { performMigrations } from '@/migrations/MigrationHelper';

import './scss/index.scss';

async function doAlphaNotice(lastAlpha: string) {
    if (!game.user.isGM) {
        return;
    }

    const [lastMajor, lastMinor, lastRevision] = lastAlpha.split('.').map((v: string) => parseInt(v));
    const [currMajor, currMinor, currRevision] = game.system.version.split('.').map((v: string) => parseInt(v));

    if (lastMajor >= currMajor && lastMinor >= currMinor && lastRevision >= currRevision) {
        return;
    }

    const enrichedMessage = await TextEditor.enrichHTML(
        /*html*/ `
    <h3 style="font-family: 'Bebas Neue', sans-serif">Genesys Alpha ${game.system.version}</h3>
    <p>
        Hello! Thank you for giving the Genesys system a try! Please note that this system is currently in an alpha state; it is ready for some early playtesting and experimentation, but there are many features that are yet unimplemented and may be bugs!
    </p>
    <div style="text-align: center">@symbol[satfhd]</div>
    <h4 style="font-family: 'Bebas Neue', sans-serif">Bug Fixes & Updates</h4>
    <ul style="margin-top: 0">
      <li><a href="https://github.com/Mezryss/FVTT-Genesys/pull/258">[FIX]</a>: Allow dice pools modifications to scale with talent rank (thanks @KitCat420)</li>
      <li><a href="https://github.com/Mezryss/FVTT-Genesys/commit/920895a1d36372803c64ec54fa5b8a492020e0fb">[STYLING]</a>: Fix tooltips in FVTT13</li>
    </ul>
    <div style="text-align: center">@dice[apbdcs]</div>
    <h4 style="font-family: 'Bebas Neue', sans-serif">Useful Links</h4>
    <ul style="margin-top: 0">
        <li><a href="https://github.com/Mezryss/FVTT-Genesys/wiki">Project Wiki</a></li>
        <li><a href="https://github.com/Mezryss/FVTT-Genesys">Project Source Code</a></li>
        <li><a href="https://github.com/Mezryss/FVTT-Genesys/discussions">Discuss The System</a></li>
        <li><a href="https://github.com/Mezryss/FVTT-Genesys/issues">Report Bugs &amp; Suggest Features</a></li>
        <li><a href="https://github.com/Mezryss/FVTT-Genesys/blob/main/LICENSE">Licensed under the MIT License</a></li>
    </ul>
    `,
        { async: true } as any,
    );

    await ChatMessage.create({
        author: game.user.id,
        content: enrichedMessage,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    } as any);

    await game.settings.set(SETTINGS_NAMESPACE, KEY_ALPHA_VERSION, game.system.version);
}

Hooks.once('init', async () => {

	// Foundry v14 doesn't load styles declared in system.json automatically.
	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = `/systems/${game.system.id}/style.css`;
	document.head.appendChild(link);

    // System Documents
    registerActors();
    registerToken();
    registerEffects();
    registerItems();

    // Misc. modules with one-time registrations
    registerCombat();
    registerSidebars();
    registerEnrichers();
    registerFonts();
    registerDice();
    registerHandlebarsHelpers();
    registerSettings();
    registerConfig();
});

Hooks.once('ready', async () => {
    const lastAlpha = game.settings.get<string>(SETTINGS_NAMESPACE, KEY_ALPHA_VERSION) ?? '0.0.0';

    await doAlphaNotice(lastAlpha);
    readyConfigs();

    await performMigrations(lastAlpha);

    registerStoryPointTracker();
    registerVehicles();
    registerWorker();
});

function constructOptGroup(select: HTMLSelectElement, groupLabel: string, optValues?: string[]): HTMLOptGroupElement {
    const options = select.querySelectorAll<HTMLOptionElement>(':scope > option');
    const optgroup = document.createElement('optgroup');

    optgroup.label = groupLabel;
    optgroup.append(...Array.from(options).filter((option) => !optValues || optValues.includes(option.value)));

    return optgroup;
}

Hooks.on('renderDialog', (_dialog: any, html: any, _data: any) => {
    const container = html[0] as HTMLElement;

    if (container.classList.contains('dialog-item-create')) {
        const select = container.querySelector<HTMLSelectElement>('select[name=type]');

        if (select) {
            select.append(
                constructOptGroup(select, game.i18n.localize('Genesys.DialogGroups.Item.CharacterCreation'), CharacterCreationItemTypes),
                constructOptGroup(select, game.i18n.localize('Genesys.DialogGroups.Item.Equipment'), EquipmentItemTypes),
                constructOptGroup(select, game.i18n.localize('Genesys.DialogGroups.Item.Other')),
            );
            select.querySelector('option')!.selected = true;
        }

    } else if (container.classList.contains('dialog-actor-create')) {
        const select = container.querySelector<HTMLSelectElement>('select[name=type]');

        if (select) {
            select.append(constructOptGroup(select, game.i18n.localize('Genesys.DialogGroups.Actor.Adversary'), AdversaryTypes), constructOptGroup(select, game.i18n.localize('Genesys.DialogGroups.Actor.Other')));
            select.querySelector('option')!.selected = true;
        }
    }
});

Hooks.on('renderChatLog', (_sidebar: any, html: any, _data: any) => {
    if (game.version.startsWith('13')) {
        return;
    }

    const diceIcon = html.find('#chat-controls > .chat-control-icon');
    diceIcon.on('click', async (_event: any) => {
        const controlledTokens = (canvas as any).tokens?.controlled || [];

        let targetActor;
        if (controlledTokens.length > 1) {
            ui.notifications.error(game.i18n.localize('Genesys.Notifications.SelectNoneOrOneTokenForAction'));
            return;
        } else if (controlledTokens.length === 1) {
            if (controlledTokens[0].actor?.type === 'vehicle') {
                ui.notifications.error(game.i18n.localize('Genesys.Notifications.InvalidTokenTypeForAction'));
                return;
            } else {
                targetActor = (controlledTokens[0].actor ?? undefined) as GenesysActor | undefined;
            }
        }

        await DicePrompt.promptForRoll(targetActor, '');
    });
});

Hooks.on('chatMessage', (chatLog: any, message: string, _chatData: any) => {
    const commandR = /^\/gendr(?:oll)?/i;
    if (message.match(commandR)) {
        DicePrompt.promptForRoll(undefined, '');
        return false;
    }
    return true;
});

const wikiLinkPattern = /\[\[([^|\]]+)(\|([^\]]+))?\]\]/g;

Hooks.on('renderSettingsConfig', (_app: any, html: any, _data: any) => {
    const theHtml = game.version.startsWith('13') ? (html as unknown as HTMLElement) : html[0];

    let note = theHtml.querySelector(`[data-setting-id='genesys.${KEY_DEFAULT_DIFFICULTY}'] > .notes`);
    if (!note) {
        note = theHtml.querySelector(`.form-fields:has(input[name='genesys.${KEY_DEFAULT_DIFFICULTY}']) + p.hint`);
    }

    if (note) {
        note.innerHTML = note.innerHTML.replaceAll(wikiLinkPattern, (_m: any, g1: any, _g2: any, g3: any) => {
            return `<a href="https://github.com/Mezryss/FVTT-Genesys/wiki/${g1}" target="_blank">${g3 ? g3 : g1}</a>`;
        });
    }
});

const COMPENDIUM_PATCHING = {
    PATCHED: new Set<string>(),
    TYPES: ['Actor', 'Item'],
};

Hooks.on('renderCompendiumDirectory', (_sidebar: any, _html: any, _data: any) => {
    for (const pack of game.packs.values()) {
        if (!COMPENDIUM_PATCHING.PATCHED.has(pack.metadata.id)) {
            COMPENDIUM_PATCHING.PATCHED.add(pack.metadata.id);
            if (COMPENDIUM_PATCHING.TYPES.includes(pack.metadata.type)) {
                pack.apps.shift();
                pack.apps.push(new GenesysCompendium({ collection: pack }));
            }
        }
    }
});