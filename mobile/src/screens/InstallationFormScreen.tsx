import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { registerInstallation } from '../evidence/installationService';
import { getFieldLocation } from '../evidence/locationService';
import { fetchTechnicalSheet } from '../protocols/technicalSheet';
import { printOrDownloadHtmlPdf } from '../evidence/pdfReport';
import { DeviceTechnicalSheet, InstallationReport } from '../types';

// Fotos de evidencia predefinidas para demostración técnica de campo
const SAMPLE_PHOTOS = [
  {
    name: 'Gabinete y Patchpanel',
    uri: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Conexión de Fibra Óptica',
    uri: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Router y Switch en Rack',
    uri: 'https://images.unsplash.com/photo-1597733336794-12d05021d510?w=600&auto=format&fit=crop&q=80',
  },
];

const SAMPLE_QRS = [
  { code: 'ONT-HW-EG8145V5-9821', desc: 'Huawei ONT EchoLife GPON', ip: '192.168.100.1', mac: '48:D5:39:D0:A9:1B' },
  { code: 'RT-MIK-RB4011-4412', desc: 'MikroTik Router RB4011 10G', ip: '192.168.88.1', mac: 'CC:2D:E0:B8:92:0C' },
  { code: 'SW-CIS-C2960-7730', desc: 'Cisco Catalyst 2960 Switch 24p', ip: '192.168.1.254', mac: '00:1B:D4:FO:C2:13' },
];

export default function InstallationFormScreen() {
  const [techName, setTechName] = useState('Técnico de Campo (FCyT)');
  const [deviceIp, setDeviceIp] = useState('192.168.100.1');
  const [deviceMac, setDeviceMac] = useState('48:D5:39:D0:A9:1B');
  const [qrCode, setQrCode] = useState('ONT-HW-EG8145V5-9821');
  const [notes, setNotes] = useState('Instalación en rack secundario, potencia óptica normal (-19 dBm).');
  const [photoUri, setPhotoUri] = useState<string>(SAMPLE_PHOTOS[0].uri);
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [techSheet, setTechSheet] = useState<DeviceTechnicalSheet | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [lastReport, setLastReport] = useState<InstallationReport | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  useEffect(() => {
    // Obtener ubicación GPS al cargar
    getFieldLocation().then(coords => setGpsCoords(coords));
  }, []);

  const handleSelectQr = async (sample: typeof SAMPLE_QRS[0]) => {
    setQrCode(sample.code);
    setDeviceIp(sample.ip);
    setDeviceMac(sample.mac);
    setShowQrModal(false);

    // Cargar ficha técnica remota automáticamente (RF-04)
    const sheet = await fetchTechnicalSheet(sample.code);
    setTechSheet(sheet);
  };

  const handleOpenTechnicalSheet = async () => {
    if (!qrCode) {
      Alert.alert('Ficha Técnica', 'Ingrese o escanee un código QR primero.');
      return;
    }
    const sheet = await fetchTechnicalSheet(qrCode);
    setTechSheet(sheet);
    setShowSheetModal(true);
  };

  const handleSubmit = async () => {
    if (!techName || !deviceIp) {
      Alert.alert('Atención', 'Complete los campos obligatorios.');
      return;
    }
    setLoading(true);
    try {
      const report = await registerInstallation({
        technicianName: techName,
        deviceIp,
        deviceMac,
        qrCode,
        notes,
        photoUri,
      });

      setLastReport(report);
      Alert.alert(
        'Instalación Registrada',
        `Reporte ID: ${report.id}\nPDF: ${report.pdfPath || 'Generado con éxito'}\nEstado: ${
          report.synced ? 'Sincronizado con Backend' : 'Encolado en Outbox (Offline-First)'
        }`,
        [
          { text: 'Ver PDF', onPress: () => setShowPdfModal(true) },
          { text: 'Aceptar' },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', 'Fallo al procesar reporte: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Relevamiento Técnico de Instalación</Text>
      <Text style={styles.subtitle}>Documentación de infraestructura de campo (RF-04, RF-05, RF-06)</Text>

      {/* Identificación por Código QR / Barras */}
      <View style={styles.sectionCard}>
        <View style={styles.cardTitleRow}>
          <MaterialCommunityIcons name="qrcode-scan" size={18} color="#38bdf8" />
          <Text style={styles.cardTitle}>Identificación de Equipo (RF-04)</Text>
        </View>

        <Text style={styles.label}>Código QR / Serial Escaneado:</Text>
        <View style={styles.inputWithAction}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={qrCode}
            onChangeText={setQrCode}
            placeholder="ONT-HW-EG8145V5-9821"
            placeholderTextColor="#64748b"
          />
          <TouchableOpacity style={styles.iconActionBtn} onPress={() => setShowQrModal(true)}>
            <Feather name="camera" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.sheetLinkBtn} onPress={handleOpenTechnicalSheet}>
          <Ionicons name="document-text-outline" size={14} color="#38bdf8" />
          <Text style={styles.sheetLinkText}>Ver Ficha Técnica Remota del Fabricante</Text>
        </TouchableOpacity>
      </View>

      {/* Datos del Equipo */}
      <View style={styles.sectionCard}>
        <View style={styles.cardTitleRow}>
          <MaterialCommunityIcons name="router-network" size={18} color="#38bdf8" />
          <Text style={styles.cardTitle}>Parámetros de Red</Text>
        </View>

        <Text style={styles.label}>Dirección IP Asignada:</Text>
        <TextInput style={styles.input} value={deviceIp} onChangeText={setDeviceIp} />

        <Text style={styles.label}>Dirección MAC:</Text>
        <TextInput style={styles.input} value={deviceMac} onChangeText={setDeviceMac} />

        <Text style={styles.label}>Técnico Responsable:</Text>
        <TextInput style={styles.input} value={techName} onChangeText={setTechName} />
      </View>

      {/* Evidencia Fotográfica y GPS (RF-05) */}
      <View style={styles.sectionCard}>
        <View style={styles.cardTitleRow}>
          <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#38bdf8" />
          <Text style={styles.cardTitle}>Evidencia Georreferenciada (RF-05)</Text>
        </View>

        <View style={styles.gpsRow}>
          <Feather name="map-pin" size={14} color="#22c55e" />
          <Text style={styles.gpsText}>
            GPS:{' '}
            {gpsCoords
              ? `${gpsCoords.latitude.toFixed(6)}, ${gpsCoords.longitude.toFixed(6)} (Preciso)`
              : 'Obteniendo coordenadas satelitales...'}
          </Text>
        </View>

        <Text style={styles.label}>Evidencia Fotográfica de Instalación:</Text>
        <View style={styles.photoPickerRow}>
          {SAMPLE_PHOTOS.map((p, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.photoThumbBtn, photoUri === p.uri && styles.photoThumbBtnActive]}
              onPress={() => setPhotoUri(p.uri)}
            >
              <Image source={{ uri: p.uri }} style={styles.photoThumbImg} />
              <Text style={styles.photoThumbLabel} numberOfLines={1}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {photoUri && (
          <View style={styles.photoPreviewBox}>
            <Image source={{ uri: photoUri }} style={styles.photoMainPreview} />
            <Text style={styles.photoPreviewBadge}>Evidencia lista para adjuntar en PDF</Text>
          </View>
        )}

        <Text style={styles.label}>Notas Técnicas de Campo:</Text>
        <TextInput
          style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </View>

      {/* Botón Guardar y Generar PDF */}
      <TouchableOpacity
        style={[styles.saveButton, loading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="file-text" size={18} color="#ffffff" />
            <Text style={styles.saveButtonText}>Generar Reporte PDF y Guardar (RF-06)</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Modal Simulador de Escaneo QR (RF-04) */}
      <Modal visible={showQrModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Escáner QR / Barras de Equipos</Text>
            <Text style={styles.modalDesc}>
              Seleccione un código QR de equipo para simular la captura con cámara (vision-camera):
            </Text>

            {SAMPLE_QRS.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.qrItemBtn}
                onPress={() => handleSelectQr(item)}
              >
                <MaterialCommunityIcons name="qrcode" size={24} color="#38bdf8" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.qrItemCode}>{item.code}</Text>
                  <Text style={styles.qrItemDesc}>{item.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowQrModal(false)}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Ficha Técnica Remota (RF-04) */}
      <Modal visible={showSheetModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <MaterialCommunityIcons name="file-document" size={24} color="#38bdf8" />
              <Text style={styles.modalTitle}> Ficha Técnica del Equipo</Text>
            </View>

            {techSheet ? (
              <ScrollView style={{ maxHeight: 350, marginVertical: 10 }}>
                <View style={styles.sheetRow}><Text style={styles.sheetLabel}>Modelo:</Text><Text style={styles.sheetValue}>{techSheet.model}</Text></View>
                <View style={styles.sheetRow}><Text style={styles.sheetLabel}>Fabricante:</Text><Text style={styles.sheetValue}>{techSheet.vendor}</Text></View>
                <View style={styles.sheetRow}><Text style={styles.sheetLabel}>Tipo:</Text><Text style={styles.sheetValue}>{techSheet.deviceType.toUpperCase()}</Text></View>
                <View style={styles.sheetRow}><Text style={styles.sheetLabel}>Número de Serie:</Text><Text style={styles.sheetValue}>{techSheet.serialNumber}</Text></View>
                <View style={styles.sheetRow}><Text style={styles.sheetLabel}>Hardware Rev:</Text><Text style={styles.sheetValue}>{techSheet.hardwareRev}</Text></View>
                <View style={styles.sheetRow}><Text style={styles.sheetLabel}>Firmware:</Text><Text style={styles.sheetValue}>{techSheet.firmwareVersion}</Text></View>
                {techSheet.opticalPowerRange && (
                  <View style={styles.sheetRow}><Text style={styles.sheetLabel}>Rango Óptico:</Text><Text style={styles.sheetValue}>{techSheet.opticalPowerRange}</Text></View>
                )}
                <Text style={[styles.sheetLabel, { marginTop: 8, marginBottom: 4 }]}>Puertos e Interfaces:</Text>
                {techSheet.ports.map((port, pIdx) => (
                  <Text key={pIdx} style={styles.sheetPortItem}>• {port}</Text>
                ))}
              </ScrollView>
            ) : (
              <ActivityIndicator color="#38bdf8" />
            )}

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowSheetModal(false)}>
              <Text style={styles.modalCloseText}>Cerrar Ficha Técnica</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Previsualizador del PDF Generado (RF-06) */}
      <Modal visible={showPdfModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <Feather name="file-text" size={24} color="#38bdf8" />
              <Text style={styles.modalTitle}> Reporte de Instalación Generado</Text>
            </View>

            {lastReport && (
              <>
                <ScrollView style={{ marginVertical: 10 }}>
                  <View style={styles.pdfPaper}>
                    <Text style={styles.pdfPaperHeader}>REPORTE TÉCNICO DE INSTALACIÓN</Text>
                    <Text style={styles.pdfPaperSub}>Network Diagnostics Suite — DAM 2026</Text>
                    <View style={styles.pdfDivider} />

                    <Text style={styles.pdfItem}><Text style={styles.bold}>ID Reporte:</Text> {lastReport.id}</Text>
                    <Text style={styles.pdfItem}><Text style={styles.bold}>Fecha:</Text> {lastReport.createdAt}</Text>
                    <Text style={styles.pdfItem}><Text style={styles.bold}>Técnico:</Text> {lastReport.technicianName}</Text>
                    <Text style={styles.pdfItem}><Text style={styles.bold}>Equipo IP:</Text> {lastReport.deviceIp}</Text>
                    <Text style={styles.pdfItem}><Text style={styles.bold}>Dirección MAC:</Text> {lastReport.deviceMac || '--'}</Text>
                    <Text style={styles.pdfItem}><Text style={styles.bold}>QR / Serial:</Text> {lastReport.qrCode || '--'}</Text>
                    <Text style={styles.pdfItem}><Text style={styles.bold}>GPS:</Text> {lastReport.latitude.toFixed(6)}, {lastReport.longitude.toFixed(6)}</Text>
                    <Text style={styles.pdfItem}><Text style={styles.bold}>Observaciones:</Text> {lastReport.notes}</Text>

                    {lastReport.photoUri && (
                      <View style={{ marginTop: 10, alignItems: 'center' }}>
                        <Text style={[styles.bold, { color: '#0f172a', marginBottom: 4 }]}>Evidencia Fotográfica:</Text>
                        <Image source={{ uri: lastReport.photoUri }} style={styles.pdfImage} />
                      </View>
                    )}

                    <View style={styles.pdfFooter}>
                      <Text style={styles.pdfFooterText}>
                        Estado: {lastReport.synced ? 'Sincronizado con Central' : 'Almacenado Offline (Outbox)'}
                      </Text>
                    </View>
                  </View>
                </ScrollView>
                <TouchableOpacity
                  style={styles.downloadPdfBtn}
                  onPress={() => {
                    printOrDownloadHtmlPdf(lastReport);
                  }}
                >
                  <Feather name="printer" size={15} color="#ffffff" />
                  <Text style={styles.downloadPdfBtnText}>Descargar / Imprimir PDF Oficial</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowPdfModal(false)}>
              <Text style={styles.modalCloseText}>Cerrar Previsualización</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 14 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 2 },
  subtitle: { fontSize: 11, color: '#94a3b8', marginBottom: 14 },
  sectionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardTitle: { color: '#38bdf8', fontSize: 13, fontWeight: 'bold', marginLeft: 6 },
  label: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  input: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: 6,
    padding: 9,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 13,
  },
  inputWithAction: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  iconActionBtn: {
    backgroundColor: '#0284c7',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  sheetLinkText: { color: '#38bdf8', fontSize: 12, fontWeight: '600' },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  gpsText: { color: '#86efac', fontSize: 11, fontFamily: 'monospace' },
  photoPickerRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  photoThumbBtn: { flex: 1, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  photoThumbBtnActive: { borderColor: '#38bdf8', borderWidth: 2 },
  photoThumbImg: { width: '100%', height: 50 },
  photoThumbLabel: { backgroundColor: '#0f172a', color: '#94a3b8', fontSize: 9, textAlign: 'center', paddingVertical: 2 },
  photoPreviewBox: { borderRadius: 8, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  photoMainPreview: { width: '100%', height: 140 },
  photoPreviewBadge: { backgroundColor: '#0f172a', color: '#22c55e', fontSize: 10, textAlign: 'center', paddingVertical: 3, fontWeight: 'bold' },
  saveButton: {
    backgroundColor: '#0284c7',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  disabledButton: { opacity: 0.6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#1e293b', width: '100%', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#334155' },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: '#f8fafc', fontSize: 15, fontWeight: 'bold' },
  modalDesc: { color: '#94a3b8', fontSize: 11, marginBottom: 12 },
  qrItemBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', padding: 10, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  qrItemCode: { color: '#38bdf8', fontSize: 13, fontWeight: 'bold' },
  qrItemDesc: { color: '#94a3b8', fontSize: 11 },
  modalCloseBtn: { backgroundColor: '#334155', padding: 10, borderRadius: 6, alignItems: 'center', marginTop: 10 },
  modalCloseText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  sheetRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderColor: '#334155' },
  sheetLabel: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  sheetValue: { color: '#f8fafc', fontSize: 12, fontFamily: 'monospace' },
  sheetPortItem: { color: '#cbd5e1', fontSize: 11, marginLeft: 6, marginVertical: 1 },
  pdfPaper: { backgroundColor: '#ffffff', padding: 16, borderRadius: 6 },
  pdfPaperHeader: { color: '#0f172a', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  pdfPaperSub: { color: '#64748b', fontSize: 10, textAlign: 'center', marginBottom: 8 },
  pdfDivider: { height: 1, backgroundColor: '#cbd5e1', marginVertical: 8 },
  pdfItem: { color: '#1e293b', fontSize: 11, marginBottom: 4 },
  bold: { fontWeight: 'bold' },
  pdfImage: { width: '100%', height: 120, borderRadius: 4, marginTop: 4 },
  pdfFooter: { marginTop: 12, borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 6 },
  pdfFooterText: { color: '#0369a1', fontSize: 10, textAlign: 'center', fontWeight: 'bold' },
  downloadPdfBtn: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 6,
    gap: 8,
    marginTop: 10,
  },
  downloadPdfBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
});
