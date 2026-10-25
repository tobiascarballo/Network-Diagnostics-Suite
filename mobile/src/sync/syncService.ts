import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { database } from '../database';
import Outbox from '../database/models/Outbox';
import Report from '../database/models/Report';

/**
 * Obtiene la URL por defecto según el entorno de ejecución
 */
export function getDefaultBackendUrl(): string {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
}

export const BACKEND_URL = getDefaultBackendUrl();

/**
 * Procesa todos los elementos pendientes encolados en Outbox (RF-07)
 */
export async function flushOutbox(serverUrl: string = getDefaultBackendUrl()): Promise<number> {
  let pendingItems: Outbox[] = [];
  try {
    const outboxCol = database.get<Outbox>('outbox');
    pendingItems = await outboxCol.query().fetch();
  } catch (_) {
    return 0;
  }

  if (pendingItems.length === 0) return 0;

  let processed = 0;
  const reportsPayload: any[] = [];
  const devicesPayload: any[] = [];

  for (const item of pendingItems) {
    try {
      const data = JSON.parse(item.payload);
      if (item.actionType === 'SYNC_REPORT') {
        reportsPayload.push(data);
      } else if (item.actionType === 'SYNC_DEVICE') {
        devicesPayload.push(data);
      }
    } catch (_) {}
  }

  try {
    const response = await fetch(`${serverUrl}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reports: reportsPayload,
        devices: devicesPayload,
      }),
    });

    if (response.ok) {
      // Eliminar elementos procesados de la base de datos local
      await database.write(async () => {
        for (const item of pendingItems) {
          await item.destroyPermanently();
        }

        // Marcar reportes locales como sincronizados
        const reportsCol = database.get<Report>('reports');
        const localReports = await reportsCol.query().fetch();
        for (const r of localReports) {
          await r.update((record) => {
            record.isSynced = true;
          });
        }
      });

      processed = pendingItems.length;
      console.log(`[SyncService] Se sincronizaron exitosamente ${processed} elementos con el backend.`);
    }
  } catch (err: any) {
    console.warn('[SyncService] Falló el flush de sincronización (servidor inalcanzable):', err.message);
  }

  return processed;
}

/**
 * Inicializa el listener reactivo de NetInfo para disparar la sincronización al volver la red
 */
export function initAutoSyncListener(serverUrl: string = getDefaultBackendUrl()) {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      console.log('[SyncService] Conectividad restaurada. Iniciando flush de outbox...');
      flushOutbox(serverUrl);
    }
  });
}
