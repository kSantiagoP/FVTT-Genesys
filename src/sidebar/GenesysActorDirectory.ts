import GenesysActor from '@/actor/GenesysActor';
import { DragTransferData, constructDragTransferTypeFromData } from '@/data/DragTransferData';

export default class GenesysActorDirectory extends ActorDirectory {
	protected _onDragStart(event: ElementDragEvent): void {
		const dragData = JSON.parse(event.dataTransfer?.getData('text/plain') ?? '{}') as DragTransferData;
		if (dragData.type === 'Actor' && dragData.uuid) {
			const draggedActor = foundry.utils.fromUuidSync(dragData.uuid) as { type: string } | null;
			if (draggedActor) {
				const genesysTransferType = constructDragTransferTypeFromData(draggedActor.type, dragData.uuid as ActorUUID);
				event.dataTransfer?.setData(genesysTransferType, '');
			}
		}
	}
}
