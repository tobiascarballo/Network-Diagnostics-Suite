let RNHTMLtoPDF: any = null;
try {
  RNHTMLtoPDF = require('react-native-html-to-pdf').default || require('react-native-html-to-pdf');
} catch (_) {}

import { InstallationReport } from '../types';

import { Platform } from 'react-native';

/**
 * Descarga o imprime directamente el documento HTML/PDF en navegadores Web
 */
export function printOrDownloadHtmlPdf(report: InstallationReport): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
    const htmlContent = generateHtmlTemplate(report);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 350);
    } else {
      // Si el navegador bloqueó la ventana emergente, crear descarga de archivo .html imprimible
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_${report.deviceIp.replace(/\./g, '_')}_${report.id}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }
}

function generateHtmlTemplate(report: InstallationReport): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Reporte Técnico - ${report.id}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; max-width: 800px; margin: 0 auto; background: #fff; }
          .header { border-bottom: 3px solid #0284c7; padding-bottom: 12px; margin-bottom: 24px; }
          .title { font-size: 24px; font-weight: bold; color: #0f172a; margin: 0; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 5px; }
          .section { margin-bottom: 20px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .section-title { font-size: 14px; font-weight: bold; color: #0369a1; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          .label { font-weight: 600; color: #475569; }
          .value { color: #0f172a; font-family: monospace; font-size: 13px; }
          .notes-box { font-size: 13px; line-height: 1.6; color: #334155; white-space: pre-line; background: #fff; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
          .footer { margin-top: 36px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 14px; }
          .photo-container { margin-top: 10px; text-align: center; }
          .photo { max-width: 100%; max-height: 280px; border-radius: 6px; border: 1px solid #cbd5e1; }
          @media print {
            body { padding: 0; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">Reporte Técnico de Instalación</h1>
          <div class="subtitle">Network Diagnostics Suite — FCyT DAM 2026</div>
        </div>

        <div class="section">
          <div class="section-title">Datos del Relevamiento</div>
          <div class="row"><span class="label">ID de Reporte:</span><span class="value">${report.id}</span></div>
          <div class="row"><span class="label">Fecha y Hora:</span><span class="value">${report.createdAt}</span></div>
          <div class="row"><span class="label">Técnico Responsable:</span><span class="value">${report.technicianName}</span></div>
          <div class="row"><span class="label">Coordenadas GPS:</span><span class="value">${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}</span></div>
        </div>

        <div class="section">
          <div class="section-title">Infraestructura y Dispositivo</div>
          <div class="row"><span class="label">Dirección IP:</span><span class="value">${report.deviceIp}</span></div>
          <div class="row"><span class="label">Dirección MAC:</span><span class="value">${report.deviceMac || 'No especificada'}</span></div>
          <div class="row"><span class="label">Código QR / Serial:</span><span class="value">${report.qrCode || 'No registrado'}</span></div>
        </div>

        <div class="section">
          <div class="section-title">Observaciones de Campo</div>
          <div class="notes-box">${report.notes || 'Sin observaciones adicionales registradas.'}</div>
        </div>

        ${
          report.photoUri
            ? `
          <div class="section">
            <div class="section-title">Evidencia Fotográfica</div>
            <div class="photo-container">
              <img src="${report.photoUri}" class="photo" alt="Evidencia de instalación" />
            </div>
          </div>
        `
            : ''
        }

        <div class="footer">
          Documento generado en modo Offline-First. Estado de sincronización: ${report.synced ? 'Sincronizado con Central' : 'Pendiente de conexión'}.
        </div>
      </body>
    </html>
  `;
}

/**
 * Genera el reporte de instalación técnico en formato PDF (RF-06)
 */
export async function generateInstallationPdf(report: InstallationReport): Promise<string | undefined> {
  const htmlContent = generateHtmlTemplate(report);

  if (Platform.OS === 'web') {
    // En Web invocamos la descarga/impresión para que el usuario obtenga el archivo
    printOrDownloadHtmlPdf(report);
    return `Reporte_${report.deviceIp.replace(/\./g, '_')}_${report.id}.pdf`;
  }

  try {
    if (!RNHTMLtoPDF || typeof RNHTMLtoPDF.convert !== 'function') {
      console.log('[PDF] Ejecución en Expo Go / Mock. Simulación de archivo PDF.');
      return `Documents/Reporte_${report.deviceIp.replace(/\./g, '_')}_mock.pdf`;
    }

    const options = {
      html: htmlContent,
      fileName: `Reporte_${report.deviceIp.replace(/\./g, '_')}_${Date.now()}`,
      directory: 'Documents',
    };

    const file = await RNHTMLtoPDF.convert(options);
    return file.filePath;
  } catch (error) {
    console.error('[PDF] Error generando archivo PDF:', error);
    return undefined;
  }
}
