let Geolocation: any = null;
try {
  Geolocation = require('react-native-geolocation-service').default || require('react-native-geolocation-service');
} catch (_) {}

import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Solicita permisos de ubicación en Android
 */
async function requestLocationPermission(): Promise<boolean> {
  if (!Geolocation) return false;
  if (Platform.OS === 'ios') {
    try {
      const auth = await Geolocation.requestAuthorization('whenInUse');
      return auth === 'granted';
    } catch (_) {
      return false;
    }
  }

  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Permiso de Ubicación para Relevamiento',
        message: 'La app requiere coordenadas precisas para georreferenciar las instalaciones.',
        buttonNeutral: 'Preguntar luego',
        buttonNegative: 'Cancelar',
        buttonPositive: 'Aceptar',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  return false;
}

/**
 * Obtiene la posición GPS actual del técnico de campo (RF-05)
 */
export async function getFieldLocation(): Promise<{ latitude: number; longitude: number }> {
  const hasPermission = await requestLocationPermission();

  if (!hasPermission) {
    // Fallback: Sede FCyT Concepción del Uruguay (-32.4844, -58.2327)
    return { latitude: -32.4844, longitude: -58.2327 };
  }

  return new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      (position: any) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error: any) => {
        console.warn('[GPS] Error obteniendo ubicación real, usando fallback:', error.message);
        resolve({ latitude: -32.4844, longitude: -58.2327 });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });
}