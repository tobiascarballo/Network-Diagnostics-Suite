import NetInfo from '@react-native-community/netinfo';
import { database } from '../database';
import Report from '../database/models/Report';
import { InstallationReport } from '../types';
import { generateInstallationPdf } from './pdfReport';
import { getFieldLocation } from './locationService';
import { enqueueAction } from '../sync/outboxQueue';
import { flushOutbox } from '../sync/syncService';

export interface CreateReportInput {
  technicianName: string;
  deviceIp: string;
  deviceMac?: string;
  qrCode?: string;
  notes: string;
  photoUri?: string;
}

/**
 * Orquesta el registro completo de una instalación (RF-05, RF-06, RF-07)
 */
export async function registerInstallation(input: CreateReportInput): Promise<InstallationReport> {
  const coords = await getFieldLocation();
  const reportId = `REP-${Date.now()}`;
  const now = new Date();

  const reportData: InstallationReport = {
    id: reportId,
    technicianName: input.technicianName,
    deviceIp: input.deviceIp,
    deviceMac: input.deviceMac,
    qrCode: input.qrCode,
    latitude: coords.latitude,
    longitude: coords.longitude,
    notes: input.notes,
    photoUri: input.photoUri,
    createdAt: now.toISOString(),
    synced: false,
  };

  // 1. Generar documento PDF
  const pdfPath = await generateInstallationPdf(reportData);
  reportData.pdfPath = pdfPath;

  // 2. Persistir localmente en WatermelonDB (Offline-First)
  await database.write(async () => {
    const reportsCol = database.get<Report>('reports');
    await reportsCol.create((entry) => {
      entry.technicianName = reportData.technicianName;
      entry.deviceIp = reportData.deviceIp;
      entry.deviceMac = reportData.deviceMac;
      entry.qrCode = reportData.qrCode;
      entry.latitude = reportData.latitude;
      entry.longitude = reportData.longitude;
      entry.notes = reportData.notes;
      entry.photoUri = reportData.photoUri;
      entry.pdfPath = reportData.pdfPath;
      entry.createdAt = now;
      entry.isSynced = false;
    });
  });

  // 3. Evaluar estado de conectividad (Diagrama de Flujo del TP6)
  const netState = await NetInfo.fetch();
  if (netState.isConnected && netState.isInternetReachable !== false) {
    // Si hay conexión inmediata, encolamos y ejecutamos flush directo
    await enqueueAction('SYNC_REPORT', reportData);
    await flushOutbox();
    reportData.synced = true;
  } else {
    // Modo desconectado: queda encolado en la tabla Outbox
    await enqueueAction('SYNC_REPORT', reportData);
    console.log('[Installation] Sin red disponible. Reporte encolado en Outbox.');
  }

  return reportData;
}