import { database } from '../database';
import Outbox from '../database/models/Outbox';

/**
 * Encola una acción en la tabla local Outbox cuando no hay red (RF-07)
 */
export async function enqueueAction(actionType: 'SYNC_REPORT' | 'SYNC_DEVICE', payload: object): Promise<void> {
  await database.write(async () => {
    const outboxCol = database.get<Outbox>('outbox');
    await outboxCol.create((item) => {
      item.actionType = actionType;
      item.payload = JSON.stringify(payload);
      item.status = 'pending';
      item.retries = 0;
      item.createdAt = new Date();
    });
  });
  console.log(`[Outbox] Acción encolada: ${actionType}`);
}

/**
 * Obtiene todas las acciones pendientes de sincronización
 */
export async function getPendingOutboxItems(): Promise<Outbox[]> {
  const outboxCol = database.get<Outbox>('outbox');
  return await outboxCol.query().fetch();
}