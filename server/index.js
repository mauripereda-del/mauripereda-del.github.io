/**
 * Servidor de notificaciones por correo — Solicitud de Pedidos CASMER
 * Ejecutar: npm install && npm start
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const PORT = parseInt(process.env.PORT || '3001', 10);
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function crearTransportador() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function armarCuerpoHtml(datos) {
  return `
    <div style="font-family:Arial,sans-serif;color:#222;max-width:600px;">
      <h2 style="color:#1a4d2e;margin-bottom:8px;">Solicitud pendiente de autorización</h2>
      <p>Estimado/a <strong>${datos.ordenador}</strong>,</p>
      <p>Tiene una nueva <strong>Solicitud de Pedidos</strong> pendiente de su autorización:</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;">
        <tr><td style="padding:6px 0;"><strong>Nº solicitud:</strong></td><td>${datos.numero}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Fecha:</strong></td><td>${datos.fecha}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Sector:</strong></td><td>${datos.sector}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Tipo de pedido:</strong></td><td>${datos.tipoPedido}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Solicitante:</strong></td><td>${datos.solicitante}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Jefe de sector:</strong></td><td>${datos.jefeSector || '—'}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Ítems:</strong></td><td>${datos.cantidadItems}</td></tr>
      </table>
      <p>
        <a href="${datos.panelUrl}" style="display:inline-block;background:#1a4d2e;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px;">
          Ir al panel de autorización
        </a>
      </p>
      <p style="font-size:12px;color:#666;margin-top:24px;">Mensaje automático — Solicitud de Pedidos CASMER / FEPREMI</p>
    </div>
  `;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, servicio: 'notificaciones-solicitud-pedidos' });
});

app.post('/api/notificar-ordenador', async (req, res) => {
  const datos = req.body || {};
  const requeridos = ['destinatario', 'ordenador', 'numero', 'panelUrl'];
  const faltante = requeridos.find((campo) => !datos[campo]);
  if (faltante) {
    return res.status(400).json({ error: `Falta el campo: ${faltante}` });
  }
  if (!validarEmail(datos.destinatario)) {
    return res.status(400).json({ error: 'Correo del destinatario inválido' });
  }

  const transportador = crearTransportador();
  if (!transportador) {
    return res.status(500).json({
      error: 'Servidor de correo no configurado. Complete SMTP en server/.env',
    });
  }

  const asunto = `Solicitud Nº ${datos.numero} — Pendiente de autorización (${datos.ordenador})`;
  const textoPlano = [
    `Solicitud pendiente de autorización`,
    ``,
    `Ordenador: ${datos.ordenador}`,
    `Nº solicitud: ${datos.numero}`,
    `Fecha: ${datos.fecha || '—'}`,
    `Sector: ${datos.sector || '—'}`,
    `Tipo: ${datos.tipoPedido || '—'}`,
    `Solicitante: ${datos.solicitante || '—'}`,
    ``,
    `Panel: ${datos.panelUrl}`,
  ].join('\n');

  try {
    await transportador.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: datos.destinatario,
      subject: asunto,
      text: textoPlano,
      html: armarCuerpoHtml(datos),
    });
    return res.json({ ok: true, mensaje: 'Notificación enviada correctamente' });
  } catch (err) {
    console.error('Error al enviar correo:', err.message);
    return res.status(500).json({ error: 'No se pudo enviar el correo. Revise la configuración SMTP.' });
  }
});

app.post('/api/notificar-sector-autorizacion', async (req, res) => {
  const datos = req.body || {};
  const requeridos = ['destinatario', 'numero', 'sector', 'autorizada'];
  const faltante = requeridos.find((campo) => datos[campo] === undefined || datos[campo] === '');
  if (faltante && faltante !== 'autorizada') {
    return res.status(400).json({ error: `Falta el campo: ${faltante}` });
  }
  if (datos.autorizada === undefined) {
    return res.status(400).json({ error: 'Falta el campo: autorizada' });
  }
  if (!validarEmail(datos.destinatario)) {
    return res.status(400).json({ error: 'Correo del destinatario inválido' });
  }

  const transportador = crearTransportador();
  if (!transportador) {
    return res.status(500).json({
      error: 'Servidor de correo no configurado. Complete SMTP en server/.env',
    });
  }

  const estadoTexto = datos.autorizada ? 'AUTORIZADA' : 'RECHAZADA';
  const editada = datos.editada === true;
  const asunto = `Solicitud Nº ${datos.numero} — ${estadoTexto}${editada ? ' (con modificaciones)' : ''}`;

  const cambiosHtml = (datos.cambiosProductos || []).map((c) => `
    <li>
      <strong>${c.descripcionAnterior || c.codigo || 'Ítem'}</strong>:
      cantidad ${c.cantidadAnterior} → ${c.cantidadNueva},
      descripción "${c.descripcionAnterior}" → "${c.descripcionNueva}"
    </li>
  `).join('');

  const productosHtml = (datos.productos || []).map((p) => `
    <tr>
      <td style="border:1px solid #ddd;padding:6px;">${p.codigo || '—'}</td>
      <td style="border:1px solid #ddd;padding:6px;">${p.cantidad}</td>
      <td style="border:1px solid #ddd;padding:6px;">${p.descripcion}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#222;max-width:640px;">
      <h2 style="color:#1a4d2e;">Solicitud ${estadoTexto.toLowerCase()}</h2>
      <p>Estimado/a sector <strong>${datos.sector}</strong>,</p>
      <p>La solicitud Nº <strong>${datos.numero}</strong> fue <strong>${estadoTexto}</strong> por ${datos.nombreOrdenador || datos.ordenador || 'el ordenador'}.</p>
      <table style="border-collapse:collapse;width:100%;margin:12px 0;">
        <tr><td style="padding:4px 0;"><strong>Fecha:</strong></td><td>${datos.fecha || '—'}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Solicitante:</strong></td><td>${datos.solicitante || '—'}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Tipo:</strong></td><td>${datos.tipoPedido || '—'}</td></tr>
      </table>
      ${datos.observacion ? `<p><strong>Observación del ordenador:</strong> ${datos.observacion}</p>` : ''}
      ${editada ? `<p style="color:#c0392b;"><strong>La solicitud fue modificada por el ordenador antes de autorizar.</strong></p>${cambiosHtml ? `<ul>${cambiosHtml}</ul>` : ''}` : ''}
      ${datos.autorizada && productosHtml ? `
        <h3 style="font-size:14px;margin-top:16px;">Productos ${editada ? 'actualizados' : 'autorizados'}</h3>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <thead>
            <tr style="background:#eee;">
              <th style="border:1px solid #ddd;padding:6px;">CÓD.</th>
              <th style="border:1px solid #ddd;padding:6px;">CANT.</th>
              <th style="border:1px solid #ddd;padding:6px;">DESCRIPCIÓN</th>
            </tr>
          </thead>
          <tbody>${productosHtml}</tbody>
        </table>
      ` : ''}
      <p style="font-size:12px;color:#666;margin-top:24px;">Mensaje automático — Solicitud de Compras CASMER / FEPREMI</p>
    </div>
  `;

  const textoPlano = [
    `Solicitud ${estadoTexto}`,
    `Nº: ${datos.numero}`,
    `Sector: ${datos.sector}`,
    `Ordenador: ${datos.nombreOrdenador || datos.ordenador || '—'}`,
    editada ? 'Incluye modificaciones del ordenador.' : 'Sin modificaciones.',
    datos.observacion ? `Observación: ${datos.observacion}` : '',
  ].filter(Boolean).join('\n');

  try {
    await transportador.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: datos.destinatario,
      subject: asunto,
      text: textoPlano,
      html,
    });
    return res.json({ ok: true, mensaje: 'Notificación enviada al sector correctamente' });
  } catch (err) {
    console.error('Error al enviar correo al sector:', err.message);
    return res.status(500).json({ error: 'No se pudo enviar el correo. Revise la configuración SMTP.' });
  }
});

app.post('/api/notificar-sector-pedido-procesado', async (req, res) => {
  const datos = req.body || {};
  const requeridos = ['destinatario', 'numero', 'sector', 'numeroOrdenCompra'];
  const faltante = requeridos.find((campo) => !datos[campo]);
  if (faltante) {
    return res.status(400).json({ error: `Falta el campo: ${faltante}` });
  }
  if (!validarEmail(datos.destinatario)) {
    return res.status(400).json({ error: 'Correo del destinatario inválido' });
  }

  const transportador = crearTransportador();
  if (!transportador) {
    return res.status(500).json({
      error: 'Servidor de correo no configurado. Complete SMTP en server/.env',
    });
  }

  const asunto = `Solicitud Nº ${datos.numero} — Pedido procesado (OC: ${datos.numeroOrdenCompra})`;

  const html = `
    <div style="font-family:Arial,sans-serif;color:#222;max-width:640px;">
      <h2 style="color:#1a4d2e;">Pedido procesado correctamente</h2>
      <p>Estimado/a sector <strong>${datos.sector}</strong>,</p>
      <p>Su solicitud Nº <strong>${datos.numero}</strong> fue procesada correctamente.</p>
      <table style="border-collapse:collapse;width:100%;margin:12px 0;">
        <tr><td style="padding:4px 0;"><strong>Fecha solicitud:</strong></td><td>${datos.fecha || '—'}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Solicitante:</strong></td><td>${datos.solicitante || '—'}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Tipo:</strong></td><td>${datos.tipoPedido || '—'}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Nº Orden de Compra:</strong></td><td><strong>${datos.numeroOrdenCompra}</strong></td></tr>
      </table>
      <p>Consulte a la brevedad en <strong>Proveeduría / Recepción de Insumos</strong>.</p>
      <p style="font-size:12px;color:#666;margin-top:24px;">Mensaje automático — Solicitud de Compras CASMER / FEPREMI</p>
    </div>
  `;

  const textoPlano = [
    'Pedido procesado correctamente',
    `Solicitud Nº: ${datos.numero}`,
    `Sector: ${datos.sector}`,
    `Solicitante: ${datos.solicitante || '—'}`,
    `Nº Orden de Compra: ${datos.numeroOrdenCompra}`,
    'Consulte a la brevedad en Proveeduría / Recepción de Insumos.',
  ].join('\n');

  try {
    await transportador.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: datos.destinatario,
      subject: asunto,
      text: textoPlano,
      html,
    });
    return res.json({ ok: true, mensaje: 'Notificación enviada al sector correctamente' });
  } catch (err) {
    console.error('Error al enviar correo al sector (pedido procesado):', err.message);
    return res.status(500).json({ error: 'No se pudo enviar el correo. Revise la configuración SMTP.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servicio de correo (API) → http://127.0.0.1:${PORT}`);
  console.log(`  Health check: http://127.0.0.1:${PORT}/api/health`);
  console.log(`  La app web sigue en http://127.0.0.1:5500 (Live Server)`);
  if (!crearTransportador()) {
    console.warn('AVISO: SMTP no configurado. Copie server/.env.example a server/.env');
  }
});
