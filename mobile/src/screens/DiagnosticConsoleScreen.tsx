import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { executeSshCommand } from '../protocols/sshClient';
import { saveSshCredentials, getSshCredentials } from '../protocols/secureStorage';

const PREDEFINED_COMMANDS = [
  'uptime',
  'show interfaces',
  'ip a',
  'show ip route',
  'free -m',
  'uname -a',
];

export default function DiagnosticConsoleScreen() {
  const [targetIp, setTargetIp] = useState('192.168.1.1');
  const [command, setCommand] = useState('uptime');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  // Credenciales seguras (RF-03)
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [isSecureStored, setIsSecureStored] = useState(false);
  const [showCredsModal, setShowCredsModal] = useState(false);

  useEffect(() => {
    async function loadSecure() {
      const creds = await getSshCredentials('default_ssh');
      if (creds) {
        setUsername(creds.username);
        setPassword(creds.password);
        setIsSecureStored(true);
      }
    }
    loadSecure();
  }, []);

  const handleSaveCredentials = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Ingrese usuario y contraseña.');
      return;
    }
    await saveSshCredentials('default_ssh', username, password);
    setIsSecureStored(true);
    setShowCredsModal(false);
    Alert.alert(
      'Keystore / Keychain Seguro',
      'Las credenciales han sido cifradas y almacenadas en el hardware seguro del sistema (react-native-keychain).'
    );
  };

  const handleRun = async () => {
    if (!targetIp || !command) return;
    setLoading(true);
    setOutput(`[SSH] Conectando a ${targetIp}:22 con credenciales seguras de Keystore...`);

    const res = await executeSshCommand(targetIp, command, 22, username, password);
    setOutput(res.output);
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Barra de Seguridad Keystore / Keychain */}
      <View style={styles.securityBanner}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <MaterialIcons name="security" size={20} color="#22c55e" />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.securityTitle}>Almacén Seguro de Credenciales (RF-03)</Text>
            <Text style={styles.securitySubtitle}>
              {isSecureStored ? 'Credenciales protegidas en Keystore' : 'Credenciales por defecto'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.keychainBtn}
          onPress={() => setShowCredsModal(!showCredsModal)}
        >
          <Text style={styles.keychainBtnText}>{showCredsModal ? 'Cerrar' : 'Configurar'}</Text>
        </TouchableOpacity>
      </View>

      {/* Formulario de credenciales seguras */}
      {showCredsModal && (
        <View style={styles.credsCard}>
          <Text style={styles.credsHeader}>Gestión Segura en Keystore (Keychain)</Text>
          <Text style={styles.credsDesc}>
            Las claves se protegen con cifrado de hardware y nunca se persisten en texto plano.
          </Text>

          <Text style={styles.label}>Usuario SSH:</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="admin"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Contraseña SSH:</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            secureTextEntry
          />

          <TouchableOpacity style={styles.saveCredsBtn} onPress={handleSaveCredentials}>
            <Feather name="lock" size={14} color="#ffffff" />
            <Text style={styles.saveCredsBtnText}>Guardar Cifrado en Keystore</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Configuración de Destino */}
      <View style={styles.formRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>IP Objetivo (SSH Puerto 22):</Text>
          <TextInput
            style={styles.input}
            value={targetIp}
            onChangeText={setTargetIp}
            placeholder="192.168.1.1"
            placeholderTextColor="#64748b"
          />
        </View>
      </View>

      <Text style={styles.label}>Comando de Diagnóstico:</Text>
      <TextInput
        style={styles.input}
        value={command}
        onChangeText={setCommand}
        placeholder="Comando"
        placeholderTextColor="#64748b"
        autoCapitalize="none"
      />

      {/* Comandos predefinidos según el vendor */}
      <Text style={styles.chipHeader}>Comandos Predefinidos del Sistema:</Text>
      <View style={styles.chipContainer}>
        {PREDEFINED_COMMANDS.map((cmd) => (
          <TouchableOpacity
            key={cmd}
            style={[styles.chip, command === cmd && styles.activeChip]}
            onPress={() => setCommand(cmd)}
          >
            <Text style={[styles.chipText, command === cmd && styles.activeChipText]}>{cmd}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.runButton, loading && styles.disabledButton]}
        onPress={handleRun}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="terminal" size={16} color="#ffffff" />
            <Text style={styles.runButtonText}>Ejecutar Vía SSH Embebido</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Consola SSH */}
      <View style={styles.consoleHeaderRow}>
        <Text style={styles.consoleLabel}>Consola de Salida SSH:</Text>
        <TouchableOpacity onPress={() => setOutput('')}>
          <Text style={styles.clearText}>Limpiar</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.consoleBox}>
        <Text style={styles.consoleText}>{output || '[Listo para conectar. Seleccione un comando y presione Ejecutar]'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 14 },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#059669',
  },
  securityTitle: { color: '#ecfdf5', fontSize: 13, fontWeight: 'bold' },
  securitySubtitle: { color: '#6ee7b7', fontSize: 11 },
  keychainBtn: {
    backgroundColor: '#047857',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  keychainBtnText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  credsCard: {
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  credsHeader: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  credsDesc: { color: '#94a3b8', fontSize: 11, marginBottom: 12 },
  saveCredsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 6,
  },
  saveCredsBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  formRow: { flexDirection: 'row', gap: 10 },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', marginBottom: 5 },
  input: {
    backgroundColor: '#1e293b',
    color: '#ffffff',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 13,
  },
  chipHeader: { color: '#64748b', fontSize: 11, fontWeight: 'bold', marginBottom: 6 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  chip: {
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeChip: { borderColor: '#38bdf8', backgroundColor: '#0369a1' },
  chipText: { color: '#cbd5e1', fontSize: 11 },
  activeChipText: { color: '#ffffff', fontWeight: 'bold' },
  runButton: {
    backgroundColor: '#0284c7',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  runButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  disabledButton: { opacity: 0.6 },
  consoleHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  consoleLabel: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  clearText: { color: '#38bdf8', fontSize: 11 },
  consoleBox: {
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    minHeight: 180,
  },
  consoleText: { color: '#22c55e', fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
});
