/**
 * FVTT-Genesys
 * Temporary type declarations for Foundry VTT v12 → v13 migration.
 *
 * This file provides backward-compatible type aliases for types that were
 * removed, renamed, or moved in the Foundry VTT v13 type definitions.
 *
 * These are INTERIM stubs. Each type should be resolved properly when its
 * consuming file is refactored in subsequent steps.
 *
 * @see /home/ksantiago/projetos/refactor-genesys.md
 */

// -- DataModel / Document types removed in v13 -- //

/** v12 → v13: Replaced by document-specific types like `Actor.CreateData` */
type PreDocumentId<T> = Record<string, unknown>;

/** v12 → v13: Replaced by namespace types like `Actor.Database.PreCreateOptions` */
type DocumentModificationContext<T> = Record<string, unknown>;

// -- Drag & Drop types -- //

/** v12 → v13: `ElementDragEvent` no longer exists; use `DragEvent` directly. */
interface ElementDragEvent extends DragEvent {}

/** v12 → v13: `DropCanvasData` removed. Drag data is typed inline. */
type DropCanvasData<TDocumentName extends string, D = unknown> = {
	type: TDocumentName;
	data: D;
	[x: string]: unknown;
};

// -- Sidebar -- //

/** v12 → v13: Renamed to `AbstractSidebarTab`. */
type SidebarTab = AbstractSidebarTab;

// -- Application / Sheet types -- //

/** v12 → v13: Replaced by ApplicationV2 Configuration types. */
type FormApplicationOptions = Record<string, unknown>;

/** v12 → v13: Removed. Sheet data is tied to specific document types. */
type DocumentSheetData<T extends foundry.abstract.Document<any, any, any> = foundry.abstract.Document<any, any, any>> = Record<string, unknown>;

/** v12 → v13: Removed. */
type DocumentSheetOptions = Record<string, unknown>;

/** v12 → v13: Removed. */
type ActorSheetData<T extends foundry.abstract.Document<any, any, any> = foundry.abstract.Document<any, any, any>> = Record<string, unknown>;

/** v12 → v13: Removed. */
type ItemSheetData<T extends foundry.abstract.Document<any, any, any> = foundry.abstract.Document<any, any, any>> = Record<string, unknown>;

/** v12 → v13: Removed. */
type RenderOptions = Record<string, unknown>;

/** v12 → v13: `DocumentSheet` moved to `appv1` with different generics. Interim stub. */
interface DocumentSheet<TDocument extends foundry.abstract.Document<any, any, any> = foundry.abstract.Document<any, any, any>, TOptions extends DocumentSheetOptions = DocumentSheetOptions> {}

// -- Combat -- //

/** v12 → v13: Moved to `Actor.RollInitiativeOptions`. */
type RollInitiativeOptions = Actor.RollInitiativeOptions;

/** v12 → v13: Removed. */
type CombatTrackerOptions = Record<string, unknown>;

// -- Dice -- //

/** v12 → v13: Removed. Interim stub. */
type DiceTermData = Record<string, unknown>;

/** v12 → v13: Removed. Interim stub. */
interface DiceTermResult {
	result: number;
	active: boolean;
}

/** v12 → v13: `Die` is module-scoped in the npm types. Interim stub. */
declare class DiceTerm {
	static DENOMINATION: string;
	faces: number;
	number: number;
	results: DiceTermResult[];

	constructor(termData?: Record<string, unknown>);
	getResultLabel(result: DiceTermResult): string;
	getResultCSS(result: DiceTermResult): (string | null)[];
}

/** v12 → v13: `Die` is module-scoped in the npm types. Interim stub. */
declare class Die extends DiceTerm {}

// -- Actor/Item UUID types -- //

/** v12 → v13: Removed. */
type ActorUUID = string;

/** v12 → v13: Removed. */
type ItemUUID = string;

/** v12 → v13: Removed. */
type DocumentUUID = string;

// -- Token -- //

/** v12 → v13: Removed. Token attributes typed inline. */
type TokenAttributeChoices = Record<string, unknown>;

/** v12 → v13: Removed. */
type TokenResourceData = Record<string, unknown>;

// -- Fonts -- //

/** v12 → v13: Removed. */
type FontDefinition = Record<string, unknown>;

// -- Effects -- //

/** v12 → v13: Removed. */
type ApplicableChangeData = Record<string, unknown>;

// -- Utility -- //

/** v12 → v13: Removed. */
type ConstructorOf<T> = new (...args: never[]) => T;

/** v12 → v13: Removed. Used as `Embedded<T>` for embedded document types. */
type Embedded<T extends foundry.abstract.Document<any, any, any>> = T;

// -- Context menu -- //

/** v12 → v13: Removed. */
type EntryContextOption = Record<string, unknown>;
