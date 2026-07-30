import GenesysItem from '@/item/GenesysItem';
import { DragTransferData, constructDragTransferTypeFromData } from '@/data/DragTransferData';

export default class GenesysItemDirectory extends ItemDirectory {
	protected _onDragStart(event: ElementDragEvent): void {
		// @ts-expect-error — Base type (v13) não declara _onDragStart, mas Foundry v14 fornece em runtime
		super._onDragStart(event);
		const dragData = JSON.parse(event.dataTransfer?.getData('text/plain') ?? '{}') as DragTransferData;
		if (dragData.type === 'Item' && dragData.uuid) {
			const draggedItem = foundry.utils.fromUuidSync(dragData.uuid) as { type: string } | null;
			if (draggedItem) {
				const genesysTransferType = constructDragTransferTypeFromData(draggedItem.type, dragData.uuid as ItemUUID);
				event.dataTransfer?.setData(genesysTransferType, '');
			}
		}
	}
}
