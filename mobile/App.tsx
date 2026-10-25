import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import DeviceListScreen from './src/screens/DeviceListScreen';
import DiagnosticConsoleScreen from './src/screens/DiagnosticConsoleScreen';
import InstallationFormScreen from './src/screens/InstallationFormScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { initAutoSyncListener } from './src/sync/syncService';

type Tab = 'discovery' | 'ssh' | 'install' | 'history';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('discovery');

  useEffect(() => {
    // Inicia el listener de conectividad para auto-flush de la cola outbox (RF-07)
    const unsubscribe = initAutoSyncListener();
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Network Diagnostics Suite</Text>
        <Text style={styles.headerSubtitle}>FCyT Sede Concepción del Uruguay - DAM 2026</Text>
      </View>

      <View style={styles.content}>
        {activeTab === 'discovery' && <DeviceListScreen />}
        {activeTab === 'ssh' && <DiagnosticConsoleScreen />}
        {activeTab === 'install' && <InstallationFormScreen />}
        {activeTab === 'history' && <HistoryScreen />}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'discovery' && styles.activeTab]}
          onPress={() => setActiveTab('discovery')}
        >
          <Text style={[styles.tabText, activeTab === 'discovery' && styles.activeTabText]}>
            Descubrir
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ssh' && styles.activeTab]}
          onPress={() => setActiveTab('ssh')}
        >
          <Text style={[styles.tabText, activeTab === 'ssh' && styles.activeTabText]}>
            SSH
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'install' && styles.activeTab]}
          onPress={() => setActiveTab('install')}
        >
          <Text style={[styles.tabText, activeTab === 'install' && styles.activeTabText]}>
            Instalar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            Historial
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 16, backgroundColor: '#1e293b', borderBottomWidth: 1, borderColor: '#334155' },
  headerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#38bdf8', fontSize: 12, marginTop: 2 },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderTopWidth: 2, borderColor: '#38bdf8' },
  tabText: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
  activeTabText: { color: '#38bdf8' },
});