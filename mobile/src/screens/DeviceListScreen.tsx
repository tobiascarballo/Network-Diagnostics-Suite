import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { scanSubnet, scanMdns } from '../discovery/lanScanner';
import { querySnmpDevice } from '../protocols/snmpClient';
import { DiscoveredDevice, SnmpQueryResult } from '../types';

export default function DeviceListScreen() {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'lan' | 'mdns'>('lan');
  const [baseSubnet, setBaseSubnet] = useState('192.168.1');
  const [snmpData, setSnmpData] = useState<{ [ip: string]: SnmpQueryResult }>({});
  const [queryingIp, setQueryingIp] = useState<string | null>(null);

  const handleScan = async () => {
    setScanning(true);
    try {
      if (scanMode === 'lan') {
        const found = await scanSubnet(baseSubnet, 1, 20);
        setDevices(found);
        if (found.length === 0) {
          Alert.alert('Escaneo LAN', `No se detectaron equipos activos en el rango ${baseSubnet}.1-20.`);
        }
      } else {
        const found = await scanMdns(2500);
        setDevices(found);
        if (found.length === 0) {
          Alert.alert('mDNS / Bonjour', 'No se encontraron servicios anunciados en la red local.');
        }
      }
    } catch (e: any) {
      Alert.alert('Error', 'Fallo al escanear la red: ' + e.message);
    } finally {
      setScanning(false);
    }
  };

  const handleSnmpQuery = async (ip: string) => {
    setQueryingIp(ip);
    try {
      const res = await querySnmpDevice(ip, 'public', 3000);
      setSnmpData((prev) => ({ ...prev, [ip]: res }));
      if (res.rawStatus === 'ok') {
        Alert.alert(
          'Respuesta SNMP (UDP/161)',
          `Nombre: ${res.sysName}\n` +
          `Uptime: ${res.uptime}\n` +
          `Tráfico RX: ${res.interfaceTraffic?.inFormatted || '--'}\n` +
          `Tráfico TX: ${res.interfaceTraffic?.outFormatted || '--'}`
        );
      } else {
        Alert.alert('SNMP Timeout', `El equipo ${ip} no respondió al paquete GetRequest en UDP/161.`);
      }
    } finally {
      setQueryingIp(null);
    }
  };

  const renderItem = ({ item }: { item: DiscoveredDevice }) => {
    const snmp = snmpData[item.ip];
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons
              name={
                item.deviceType === 'router'
                  ? 'router-wireless'
                  : item.deviceType === 'switch'
                  ? 'server-network'
                  : 'access-point'
              }
              size={24}
              color="#38bdf8"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.rowBetween}>
              <Text style={styles.ipText}>{item.ip}</Text>
              <View style={[styles.badge, item.discoveredVia === 'mdns' ? styles.badgeMdns : styles.badgeLan]}>
                <Text style={styles.badgeText}>{item.discoveredVia.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.subText}>Host: <Text style={styles.bold}>{item.hostname || 'Desconocido'}</Text></Text>
            <Text style={styles.subText}>MAC: <Text style={styles.mono}>{item.mac || 'No disponible'}</Text></Text>
          </View>
        </View>

        {snmp && snmp.rawStatus === 'ok' && (
          <View style={styles.snmpResultBox}>
            <View style={styles.snmpHeader}>
              <Ionicons name="stats-chart" size={14} color="#38bdf8" />
              <Text style={styles.snmpTitle}> Telemetría SNMP MIB-II (UDP/161):</Text>
            </View>
            <Text style={styles.snmpText}>• <Text style={styles.bold}>sysName:</Text> {snmp.sysName}</Text>
            {snmp.sysDescr ? <Text style={styles.snmpText}>• <Text style={styles.bold}>sysDescr:</Text> {snmp.sysDescr}</Text> : null}
            <Text style={styles.snmpText}>• <Text style={styles.bold}>Uptime:</Text> {snmp.uptime}</Text>
            {snmp.interfaceTraffic && (
              <View style={styles.trafficRow}>
                <Text style={styles.trafficBadgeIn}>RX: {snmp.interfaceTraffic.inFormatted || `${snmp.interfaceTraffic.inOctets} B`}</Text>
                <Text style={styles.trafficBadgeOut}>TX: {snmp.interfaceTraffic.outFormatted || `${snmp.interfaceTraffic.outOctets} B`}</Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.snmpButton}
          onPress={() => handleSnmpQuery(item.ip)}
          disabled={queryingIp === item.ip}
        >
          {queryingIp === item.ip ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Feather name="activity" size={14} color="#ffffff" />
              <Text style={styles.buttonText}>Consultar SNMP (sysName, Uptime, Tráfico)</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Selector de Modo de Descubrimiento */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, scanMode === 'lan' && styles.toggleBtnActive]}
          onPress={() => setScanMode('lan')}
        >
          <Text style={[styles.toggleText, scanMode === 'lan' && styles.toggleTextActive]}>
            Barrido LAN (Sockets/ARP)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, scanMode === 'mdns' && styles.toggleBtnActive]}
          onPress={() => setScanMode('mdns')}
        >
          <Text style={[styles.toggleText, scanMode === 'mdns' && styles.toggleTextActive]}>
            mDNS / Bonjour
          </Text>
        </TouchableOpacity>
      </View>

      {scanMode === 'lan' && (
        <View style={styles.subnetInputBox}>
          <Text style={styles.subnetLabel}>Subred:</Text>
          <TextInput
            style={styles.subnetInput}
            value={baseSubnet}
            onChangeText={setBaseSubnet}
            placeholder="192.168.1"
            placeholderTextColor="#64748b"
          />
          <Text style={styles.subnetRange}>.1 a .20</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.scanButton, scanning && styles.disabledButton]}
        onPress={handleScan}
        disabled={scanning}
      >
        {scanning ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="search" size={18} color="#ffffff" />
            <Text style={styles.scanButtonText}>
              {scanMode === 'lan' ? 'Escanear Subred Local (RF-01)' : 'Descubrir Servicios mDNS (RF-01)'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.ip}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          !scanning ? (
            <View style={styles.emptyContainer}>
              <Feather name="wifi" size={40} color="#334155" />
              <Text style={styles.emptyText}>
                Presione "Escanear" para descubrir equipos activos (IP, MAC y Hostname).
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 14 },
  toggleRow: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 8, padding: 4, marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: '#0284c7' },
  toggleText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  toggleTextActive: { color: '#ffffff' },
  subnetInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  subnetLabel: { color: '#94a3b8', fontSize: 13, marginRight: 8, fontWeight: 'bold' },
  subnetInput: { flex: 1, color: '#f8fafc', fontSize: 14, paddingVertical: 2 },
  subnetRange: { color: '#64748b', fontSize: 12 },
  scanButton: {
    backgroundColor: '#0284c7',
    padding: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  scanButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  disabledButton: { opacity: 0.6 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconBox: {
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ipText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeLan: { backgroundColor: '#1e3a8a' },
  badgeMdns: { backgroundColor: '#3b0764' },
  badgeText: { color: '#93c5fd', fontSize: 10, fontWeight: 'bold' },
  subText: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  bold: { color: '#e2e8f0', fontWeight: '600' },
  mono: { fontFamily: 'monospace', color: '#cbd5e1' },
  snmpButton: {
    backgroundColor: '#0369a1',
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  snmpResultBox: {
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 6,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderColor: '#38bdf8',
  },
  snmpHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  snmpTitle: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold' },
  snmpText: { color: '#cbd5e1', fontSize: 11, marginVertical: 1 },
  trafficRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  trafficBadgeIn: { backgroundColor: '#064e3b', color: '#34d399', fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontFamily: 'monospace' },
  trafficBadgeOut: { backgroundColor: '#451a03', color: '#fb923c', fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontFamily: 'monospace' },
  emptyContainer: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 12, fontSize: 13 },
});
