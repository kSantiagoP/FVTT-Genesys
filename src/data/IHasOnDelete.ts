// Utility interface to mark Document DataModel instances that have custom onDelete callbacks.
export default interface IHasOnDelete<DocumentType extends foundry.abstract.Document<any, any, any>> {
	onDelete?(document: DocumentType, options: Record<string, unknown>, userId: string): void;
}
