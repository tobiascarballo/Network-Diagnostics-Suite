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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint de sincronización por lotes (Outbox flush)
app.post('/api/sync', (req, res) => {
  const { reports = [], devices = [] } = req.body;

  if (reports.length > 0) {
    reports.forEach(r => syncedReports.push({ ...r, serverReceivedAt: new Date().toISOString() }));
    console.log(`[SYNC] Se recibieron ${reports.length} reportes de instalación.`);
  }

  if (devices.length > 0) {
    devices.forEach(d => syncedDevices.push({ ...d, serverReceivedAt: new Date().toISOString() }));
    console.log(`[SYNC] Se registraron ${devices.length} dispositivos de red.`);
  }

  res.status(200).json({
    success: true,
    processedReports: reports.length,
    processedDevices: devices.length,
    timestamp: new Date().toISOString()
  });
});

// Consulta de datos sincronizados
app.get('/api/reports', (req, res) => {
  res.json({ total: syncedReports.length, reports: syncedReports });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Backend Stub] Corriendo en http://0.0.0.0:${PORT}`);
});