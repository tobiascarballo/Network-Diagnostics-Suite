import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { database } from '../database';
import Report from '../database/models/Report';
import { flushOutbox } from '../sync/syncService';
import { getPendingOutboxItems } from '../sync/outboxQueue';

export default function HistoryScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [viewTab, setViewTab] = useState<'reports' | 'diagnostics'>('reports');

  const loadData = async () => {
    try {
      const reportsCol = database.get<Report>('reports');
      const allReports = await reportsCol.query().fetch();
      setReports(allReports);

      const pending = await getPendingOutboxItems();
      setPendingCount(pending.length);
    } catch (_) {}
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    const processed = await flushOutbox();
    setSyncing(false);
    Alert.alert(
      'Sincronización Outbox (RF-07)',
      `Se despacharon ${processed} elementos hacia el Backend Stub.`
    );
    loadData();
  };

  const renderReport = ({ item }: { item: Report }) => (
    <TouchableOpacity style={styles.reportCard} onPress={() => setSelectedReport(item)}>
      <View style={styles.rowBetween}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons name="file-document-outline" size={18} color="#38bdf8" />
          <Text style={styles.ip}>{item.deviceIp}</Text>
        </View>
        <Text style={[styles.badge, item.isSynced ? styles.synced : styles.pending]}>
          {item.isSynced ? '✓ Sincronizado' : '⏳ En Outbox'}
        </Text>
      </View>
      <Text style={styles.meta}>Técnico: <Text style={styles.bold}>{item.technicianName}</Text></Text>
      <Text style={styles.meta}>MAC: {item.deviceMac || 'No especificada'} | QR: {item.qrCode || '--'}</Text>
      <Text style={styles.meta}>GPS: {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}</Text>
      <Text style={styles.notes} numberOfLines={2}>"{item.notes}"</Text>
      <Text style={styles.viewPdfLink}>Tocar para previsualizar reporte PDF →</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Barra de Estado de Sincronización Outbox (RF-07) */}
      <View style={styles.statusBar}>
        <View>
          <Text style={styles.statusTitle}>Cola Offline (Outbox Pattern)</Text>
          <Text style={styles.statusSubtitle}>
            {pendingCount === 0
              ? 'Todos los datos están sincronizados'
              : `${pendingCount} acción(es) pendiente(s) de red`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.syncBtn, syncing && styles.disabledBtn]}
          onPress={handleManualSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="cloud-lightning" size={14} color="#ffffff" />
              <Text style={styles.syncBtnText}>Sincronizar</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Pestañas de Historial */}
      <View style={styles.tabToggleRow}>
        <TouchableOpacity
          style={[styles.tabToggle, viewTab === 'reports' && styles.tabToggleActive]}
          onPress={() => setViewTab('reports')}
        >
          <Text style={[styles.tabToggleText, viewTab === 'reports' && styles.tabToggleTextActive]}>
            Reportes Relevados ({reports.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabToggle, viewTab === 'diagnostics' && styles.tabToggleActive]}
          onPress={() => setViewTab('diagnostics')}
        >
          <Text style={[styles.tabToggleText, viewTab === 'diagnostics' && styles.tabToggleTextActive]}>
            Diagnósticos Locales (RF-08)
          </Text>
        </TouchableOpacity>
      </View>

      {viewTab === 'reports' ? (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderReport}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Feather name="inbox" size={36} color="#334155" />
              <Text style={styles.empty}>No hay reportes de instalación guardados en base local.</Text>
            </View>
          }
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={styles.diagCard}>
            <View style={styles.diagHeader}>
              <Ionicons name="hardware-chip-outline" size={16} color="#38bdf8" />
              <Text style={styles.diagTitle}>SNMP MIB-II: 192.168.1.1 (Router Core)</Text>
            </View>
            <Text style={styles.diagBody}>• sysName: Router-Edge-1</Text>
            <Text style={styles.diagBody}>• Uptime: 38 días, 14:15:22</Text>
            <Text style={styles.diagBody}>• Tráfico interfaces: In: 15.42 MB | Out: 8.91 MB</Text>
            <Text style={styles.diagTime}>Última consulta offline: Hace 10 minutos</Text>
          </View>

          <View style={styles.diagCard}>
            <View style={styles.diagHeader}>
              <Feather name="terminal" size={16} color="#22c55e" />
              <Text style={styles.diagTitle}>SSH Consola: 192.168.1.1:22</Text>
            </View>
            <Text style={styles.diagBody}>• Comando: `uptime` & `show interfaces`</Text>
            <Text style={styles.diagBody}>• Estado: Exitoso (Autenticado vía Keystore)</Text>
            <Text style={styles.diagBody}>• Interfaces activas: eth0 (UP), gpon0 (UP)</Text>
            <Text style={styles.diagTime}>Última ejecución offline: Hace 25 minutos</Text>
          </View>
        </ScrollView>
      )}

      {/* Modal de Detalle de Reporte PDF */}
      <Modal visible={!!selectedReport} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <Feather name="file-text" size={20} color="#38bdf8" />
              <Text style={styles.modalTitle}> Reporte Técnico #{selectedReport?.id}</Text>
            </View>

            {selectedReport && (
              <ScrollView style={{ marginVertical: 10 }}>
                <View style={styles.pdfPaper}>
                  <Text style={styles.pdfPaperHeader}>NETWORK DIAGNOSTICS SUITE</Text>
                  <Text style={styles.pdfPaperSub}>Auditoría de Infraestructura — FCyT DAM</Text>
                  <View style={styles.pdfDivider} />

                  <Text style={styles.pdfLine}><Text style={styles.bold}>Técnico:</Text> {selectedReport.technicianName}</Text>
                  <Text style={styles.pdfLine}><Text style={styles.bold}>Equipo IP:</Text> {selectedReport.deviceIp}</Text>
                  <Text style={styles.pdfLine}><Text style={styles.bold}>MAC:</Text> {selectedReport.deviceMac || '--'}</Text>
                  <Text style={styles.pdfLine}><Text style={styles.bold}>Código QR:</Text> {selectedReport.qrCode || '--'}</Text>
                  <Text style={styles.pdfLine}><Text style={styles.bold}>Coordenadas GPS:</Text> {selectedReport.latitude?.toFixed(6)}, {selectedReport.longitude?.toFixed(6)}</Text>
                  <Text style={styles.pdfLine}><Text style={styles.bold}>Observaciones:</Text> {selectedReport.notes}</Text>

                  {selectedReport.photoUri && (
                    <View style={{ marginTop: 8, alignItems: 'center' }}>
                      <Text style={[styles.bold, { color: '#0f172a', marginBottom: 4 }]}>Evidencia Fotográfica:</Text>
                      <Image source={{ uri: selectedReport.photoUri }} style={styles.pdfImage} />
                    </View>
                  )}

                  <View style={styles.pdfFooter}>
                    <Text style={styles.pdfFooterText}>
                      Sincronización: {selectedReport.isSynced ? 'Completada con Servidor' : 'Pendiente en Outbox'}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedReport(null)}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 14 },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusTitle: { color: '#f8fafc', fontWeight: 'bold', fontSize: 13 },
  statusSubtitle: { color: '#94a3b8', fontSize: 11, marginTop: 1 },
  syncBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  syncBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  disabledBtn: { opacity: 0.6 },
  tabToggleRow: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 6, padding: 3, marginBottom: 12 },
  tabToggle: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 4 },
  tabToggleActive: { backgroundColor: '#0369a1' },
  tabToggleText: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold' },
  tabToggleTextActive: { color: '#ffffff' },
  reportCard: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ip: { color: '#f8fafc', fontWeight: 'bold', fontSize: 15 },
  badge: { fontSize: 10, fontWeight: 'bold', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
  synced: { backgroundColor: '#14532d', color: '#4ade80' },
  pending: { backgroundColor: '#713f12', color: '#fde047' },
  meta: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  notes: { color: '#cbd5e1', fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  viewPdfLink: { color: '#38bdf8', fontSize: 11, marginTop: 6, fontWeight: '600' },
  bold: { color: '#f8fafc', fontWeight: 'bold' },
  emptyBox: { alignItems: 'center', marginTop: 40 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 8, fontSize: 12 },
  diagCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  diagHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  diagTitle: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
  diagBody: { color: '#cbd5e1', fontSize: 11, marginVertical: 1 },
  diagTime: { color: '#64748b', fontSize: 10, marginTop: 6, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#1e293b', width: '100%', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#334155' },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  modalTitle: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold' },
  pdfPaper: { backgroundColor: '#ffffff', padding: 16, borderRadius: 6 },
  pdfPaperHeader: { color: '#0f172a', fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  pdfPaperSub: { color: '#64748b', fontSize: 10, textAlign: 'center', marginBottom: 6 },
  pdfDivider: { height: 1, backgroundColor: '#cbd5e1', marginVertical: 6 },
  pdfLine: { color: '#1e293b', fontSize: 11, marginBottom: 3 },
  pdfImage: { width: '100%', height: 120, borderRadius: 4, marginTop: 4 },
  pdfFooter: { marginTop: 10, borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 6 },
  pdfFooterText: { color: '#0369a1', fontSize: 10, textAlign: 'center', fontWeight: 'bold' },
  modalCloseBtn: { backgroundColor: '#334155', padding: 10, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  modalCloseText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
});
