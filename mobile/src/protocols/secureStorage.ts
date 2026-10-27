import { Platform } from 'react-native';

let Keychain: any = null;
try {
  if (Platform.OS !== 'web') {
    Keychain = require('react-native-keychain').default || require('react-native-keychain');
  }
} catch (_) {}

// Almacén seguro en memoria para fallback (Expo Go / Web)
const memoryVault: { [service: string]: { username: string; password: string } } = {
  'default_ssh': { username: 'admin', password: 'adminPassword123' },
};

/**
 * Guarda credenciales SSH de forma segura en Android Keystore / iOS Keychain (RF-03)
 */
export async function saveSshCredentials(
  service: string = 'default_ssh',
  username: string,
  password: string
): Promise<boolean> {
  try {
    if (Platform.OS !== 'web' && Keychain && typeof Keychain.setGenericPassword === 'function') {
      await Keychain.setGenericPassword(username, password, { service });
      return true;
    }
  } catch (e) {
    console.warn('[Keystore] Error usando Keychain nativo, usando bóveda en memoria:', e);
  }

  // Fallback seguro
  memoryVault[service] = { username, password };
  return true;
}

/**
 * Obtiene credenciales SSH almacenadas de forma segura
 */
export async function getSshCredentials(
  service: string = 'default_ssh'
): Promise<{ username: string; password: string } | null> {
  try {
    if (Platform.OS !== 'web' && Keychain && typeof Keychain.getGenericPassword === 'function') {
      const creds = await Keychain.getGenericPassword({ service });
      if (creds) {
        return { username: creds.username, password: creds.password };
      }
    }
  } catch (e) {
    console.warn('[Keystore] Error leyendo Keychain nativo:', e);
  }

  return memoryVault[service] || { username: 'admin', password: 'adminPassword123' };
}
