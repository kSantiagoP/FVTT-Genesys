import { DragTransferData, constructDragTransferTypeFromData } from '@/data/DragTransferData';

export default class GenesysCompendium extends Compendium {
	protected _onDragStart(event: ElementDragEvent): void {
		super._onDragStart(event);

		const dragData = JSON.parse(event.dataTransfer?.getData('text/plain') ?? '{}') as DragTransferData;
		if ((dragData.type === 'Actor' || dragData.type === 'Item') && dragData.uuid) {
			const draggedEntity = foundry.utils.fromUuidSync(dragData.uuid) as { type: string } | null;
			if (draggedEntity) {
				const genesysTransferType = constructDragTransferTypeFromData(draggedEntity.type, dragData.uuid as ItemUUID | ActorUUID);
				event.dataTransfer?.setData(genesysTransferType, '');
			}
		}
	}
}
