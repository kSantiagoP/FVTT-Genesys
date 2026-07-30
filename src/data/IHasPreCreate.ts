/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @author Mezryss
 * @file Utility interface to mark Document DataModel instances that have custom preCreate callbacks.
 */

export default interface IHasPreCreate<DocumentType extends foundry.abstract.Document<any, any, any>> {
	preCreate?(document: DocumentType, data: Record<string, unknown>, options: Record<string, unknown>, user: foundry.documents.BaseUser): Promise<void>;
}
