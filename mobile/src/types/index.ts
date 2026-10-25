export type DeviceType = 'ont' | 'router' | 'switch' | 'antenna' | 'unknown';

export interface DiscoveredDevice {
  ip: string;
  mac?: string;
  hostname?: string;
  deviceType: DeviceType;
  discoveredVia: 'mdns' | 'arp_scan';
  lastSeen: string;
}

export interface SnmpQueryResult {
  sysName?: string;
  sysDescr?: string;
  uptime?: string;
  interfaceTraffic?: {
    inOctets: number;
    outOctets: number;
    inFormatted?: string;
    outFormatted?: string;
  };
  rawStatus: 'ok' | 'timeout' | 'error';
}

export interface SshDiagnosticResult {
  command: string;
  output: string;
  timestamp: string;
  status: 'success' | 'failed';
}

export interface DeviceTechnicalSheet {
  model: string;
  vendor: string;
  deviceType: DeviceType;
  serialNumber: string;
  hardwareRev: string;
  firmwareVersion: string;
  ports: string[];
  opticalPowerRange?: string;
  defaultIp: string;
}

export interface DiagnosticLog {
  id: string;
  deviceIp: string;
  type: 'SNMP' | 'SSH';
  details: string;
  timestamp: string;
}

export interface OutboxItem {
  id: string;
  actionType: 'SYNC_REPORT' | 'SYNC_DEVICE';
  payload: string; // JSON serializado
  status: 'pending' | 'processing' | 'failed';
  retries: number;
  createdAt: string;
}

export interface InstallationReport {
  id: string;
  technicianName: string;
  deviceIp: string;
  deviceMac?: string;
  serialNumber?: string;
  qrCode?: string;
  latitude: number;
  longitude: number;
  notes: string;
  photoUri?: string;
  pdfPath?: string;
  createdAt: string;
  synced: boolean;
}
