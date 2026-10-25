import { DeviceTechnicalSheet } from '../types';

export const TECHNICAL_CATALOG: { [key: string]: DeviceTechnicalSheet } = {
  'ONT-HW-EG8145V5-9821': {
    model: 'EchoLife EG8145V5',
    vendor: 'Huawei Technologies',
    deviceType: 'ont',
    serialNumber: '48575443D0A91B82',
    hardwareRev: 'V1.0',
    firmwareVersion: 'V5R019C20S125',
    ports: ['1x SC/APC (GPON Class B+)', '4x GE RJ-45', '1x POTS FXS', 'Wi-Fi 2.4/5GHz 802.11ac'],
    opticalPowerRange: '-8 dBm a -27 dBm (Rx)',
    defaultIp: '192.168.100.1',
  },
  'RT-MIK-RB4011-4412': {
    model: 'RB4011iGS+5HacQ2HnD-IN',
    vendor: 'MikroTik RouterBOARD',
    deviceType: 'router',
    serialNumber: 'B8920C41A190',
    hardwareRev: 'r2',
    firmwareVersion: 'RouterOS v7.14.2 (stable)',
    ports: ['10x Gigabit Ethernet (1Gbps)', '1x SFP+ 10Gbps cage', 'Dual-band Wi-Fi Quad-Chain'],
    defaultIp: '192.168.88.1',
  },
  'SW-CIS-C2960-7730': {
    model: 'Catalyst 2960-Plus 24TC-L',
    vendor: 'Cisco Systems',
    deviceType: 'switch',
    serialNumber: 'FOC2134Y0ZP',
    hardwareRev: 'REV 3.2',
    firmwareVersion: 'Cisco IOS 15.2(2)E10',
    ports: ['24x 10/100 Fast Ethernet', '2x Dual-purpose Gigabit Uplinks (10/100/1000 or SFP)'],
    defaultIp: '192.168.1.254',
  },
};

/**
 * Consulta la ficha técnica asociada al código escaneado (RF-04)
 */
export async function fetchTechnicalSheet(code: string): Promise<DeviceTechnicalSheet> {
  // Simulación de latencia remota de API de inventario
  await new Promise(r => setTimeout(r, 400));

  const clean = code.trim().toUpperCase();
  if (TECHNICAL_CATALOG[clean]) {
    return TECHNICAL_CATALOG[clean];
  }

  // Si no coincide exacto, generar ficha técnica basada en el prefijo o código
  return {
    model: `Equipo Relevado (${code})`,
    vendor: code.includes('HW') || code.includes('HUAWEI') ? 'Huawei Technologies' : 'Cisco / MikroTik Vendor',
    deviceType: code.toLowerCase().includes('ont') ? 'ont' : code.toLowerCase().includes('sw') ? 'switch' : 'router',
    serialNumber: `SN-${Date.now().toString().slice(-8)}`,
    hardwareRev: 'REV 1.0',
    firmwareVersion: 'v2.4.1-rc3',
    ports: ['1x WAN / Uplink', '4x LAN Gigabit 10/100/1000'],
    opticalPowerRange: '-10 dBm a -25 dBm',
    defaultIp: '192.168.1.1',
  };
}
