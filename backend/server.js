const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '25mb' })); // Soporta fotos de evidencia

// Almacén en memoria de sincronizaciones recibidas
const syncedReports = [];
const syncedDevices = [];

// Healthcheck
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Network Diagnostics Backend Stub',
    timestamp: new Date().toISOString()
  });
});

// Endpoint de sincronización por lotes (Outbox flush - RF-07)
app.post('/api/sync', (req, res) => {
  const { reports = [], devices = [] } = req.body;

  if (reports.length > 0) {
    reports.forEach(r => syncedReports.push({ ...r, serverReceivedAt: new Date().toISOString() }));
    console.log(`[SYNC] Se recibieron y persistieron ${reports.length} reportes de instalación con éxito.`);
  }

  if (devices.length > 0) {
    devices.forEach(d => syncedDevices.push({ ...d, serverReceivedAt: new Date().toISOString() }));
    console.log(`[SYNC] Se registraron ${devices.length} dispositivos descubiertos en LAN.`);
  }

  res.status(200).json({
    success: true,
    processedReports: reports.length,
    processedDevices: devices.length,
    totalStoredReports: syncedReports.length,
    timestamp: new Date().toISOString()
  });
});

// Consulta de reportes consolidados
app.get('/api/reports', (req, res) => {
  res.json({ total: syncedReports.length, reports: syncedReports });
});

// Consulta de dispositivos registrados
app.get('/api/devices', (req, res) => {
  res.json({ total: syncedDevices.length, devices: syncedDevices });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`======================================================`);
  console.log(`[Backend Stub] Network Diagnostics Suite`);
  console.log(`Listo y escuchando en http://0.0.0.0:${PORT}`);
  console.log(`Endpoints activos:`);
  console.log(`  - GET  /health`);
  console.log(`  - POST /api/sync   (Flush de Outbox diferido)`);
  console.log(`  - GET  /api/reports`);
  console.log(`  - GET  /api/devices`);
  console.log(`======================================================`);
});
