/**
 * Utilidades: archivos adjuntos, impresión y PDF
 */

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

function validarArchivo(file, soloPdf = false) {
  const tipos = soloPdf ? ['application/pdf'] : ALLOWED_TYPES;
  if (!tipos.includes(file.type)) {
    return soloPdf ? 'Solo se permiten archivos PDF.' : 'Solo se permiten imágenes (JPG, PNG, GIF, WEBP) y PDF.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'El archivo no puede superar 2 MB.';
  }
  return null;
}

function leerArchivoComoBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function procesarArchivos(files, soloPdf = false) {
  const adjuntos = [];
  for (const file of files) {
    const error = validarArchivo(file, soloPdf);
    if (error) {
      alert(`${file.name}: ${error}`);
      continue;
    }
    const dataUrl = await leerArchivoComoBase64(file);
    adjuntos.push({ nombre: file.name, tipo: file.type, tamano: file.size, dataUrl });
  }
  return adjuntos;
}

async function procesarArchivoUnico(file, soloPdf = false) {
  const lista = await procesarArchivos([file], soloPdf);
  return lista[0] || null;
}

function iconoArchivo(tipo) {
  if (tipo.startsWith('image/')) return '🖼';
  if (tipo === 'application/pdf') return '📄';
  return '📎';
}

function crearCeldaObs(tr, adjuntosIniciales = []) {
  const td = document.createElement('td');
  td.className = 'col-obs-cell';
  const adjuntos = [...adjuntosIniciales];

  const contenedor = document.createElement('div');
  contenedor.className = 'obs-upload';

  const input = document.createElement('input');
  input.type = 'file';
  input.className = 'input-archivo-oculto';
  input.accept = 'image/*,.pdf';
  input.multiple = true;

  const btnAdjuntar = document.createElement('button');
  btnAdjuntar.type = 'button';
  btnAdjuntar.className = 'btn-adjuntar';
  btnAdjuntar.title = 'Adjuntar foto o PDF';
  btnAdjuntar.textContent = '+ Archivo';

  const lista = document.createElement('div');
  lista.className = 'lista-adjuntos';

  function renderLista() {
    lista.innerHTML = '';
    adjuntos.forEach((adj, i) => {
      const item = document.createElement('div');
      item.className = 'adjunto-item';
      item.innerHTML = `
        <span class="adjunto-icon">${iconoArchivo(adj.tipo)}</span>
        <a href="${adj.dataUrl}" target="_blank" class="adjunto-nombre" title="Ver archivo">${escapeHtml(adj.nombre)}</a>
        <button type="button" class="btn-quitar-adjunto" title="Quitar">&times;</button>
      `;
      item.querySelector('.btn-quitar-adjunto').addEventListener('click', () => {
        adjuntos.splice(i, 1);
        renderLista();
      });
      lista.appendChild(item);
    });
    tr.dataset.adjuntos = JSON.stringify(adjuntos);
  }

  btnAdjuntar.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    if (!input.files.length) return;
    adjuntos.push(...await procesarArchivos(Array.from(input.files)));
    renderLista();
    input.value = '';
  });

  contenedor.append(btnAdjuntar, input, lista);
  td.appendChild(contenedor);
  renderLista();
  return td;
}

function obtenerAdjuntosFila(tr) {
  try {
    return JSON.parse(tr.dataset.adjuntos || '[]');
  } catch {
    return [];
  }
}

function productosValidos(datos) {
  return (datos.productos || []).filter((p) => p.descripcion && p.descripcion.trim());
}

function generarHtmlImpresion(datos) {
  const productos = productosValidos(datos);
  const logoUrl = urlLogoCasmer();
  const filasHtml = productos.map((p) => `
    <tr>
      <td style="border:1px solid #999;padding:6px;">${escapeHtml(p.codigo) || '—'}</td>
      <td style="border:1px solid #999;padding:6px;">${p.cantidad}</td>
      <td style="border:1px solid #999;padding:6px;">${escapeHtml(p.descripcion)}${p.urgente ? ' <strong style="color:#c0392b">(!)</strong>' : ''}</td>
      <td style="border:1px solid #999;padding:6px;">${p.adjuntos?.length ? p.adjuntos.map((a) => escapeHtml(a.nombre)).join(', ') : '—'}</td>
      <td style="border:1px solid #999;padding:6px;">${escapeHtml(p.ref) || '—'}</td>
    </tr>
  `).join('');

  const autorizadoTexto = datos.autorizado === true ? 'SI'
    : datos.autorizado === false ? 'NO' : 'Pendiente';

  let bloqueCompras = '';
  if (datos.numeroOrdenCompra || datos.observacionesCompras) {
    bloqueCompras = `
      <div style="margin-top:16px;padding-top:12px;border-top:2px solid #00838f;">
        <p style="margin:4px 0;"><strong>Nº Orden de Compra:</strong> ${escapeHtml(datos.numeroOrdenCompra) || '—'}</p>
        <p style="margin:4px 0;"><strong>Observaciones Compras:</strong> ${escapeHtml(datos.observacionesCompras) || '—'}</p>
        ${datos.adjuntoOrdenCompra ? `<p style="margin:4px 0;"><strong>OC adjunta:</strong> ${escapeHtml(datos.adjuntoOrdenCompra.nombre)}</p>` : ''}
      </div>
    `;
  }

  return `
    <div style="font-family:Segoe UI,Tahoma,sans-serif;color:#333;padding:10px;">
      <div style="text-align:center;margin-bottom:12px;">
        <img src="${logoUrl}" alt="CASMER - FEPREMI" style="max-height:72px;max-width:420px;width:auto;height:auto;">
      </div>
      <h1 style="text-align:center;color:#1a5f8a;font-size:22px;margin:0 0 16px;">SOLICITUD DE PEDIDOS</h1>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-bottom:16px;font-size:13px;">
        <p style="margin:2px 0;"><strong>Nº:</strong> ${escapeHtml(datos.numero)}</p>
        <p style="margin:2px 0;"><strong>FECHA:</strong> ${formatFecha(datos.fecha)}</p>
        <p style="margin:2px 0;"><strong>SECTOR SOLICITANTE:</strong> ${escapeHtml(datos.sector)}</p>
        <p style="margin:2px 0;"><strong>TIPO DE PEDIDOS:</strong> ${escapeHtml(labelTipoCompra(datos.tipoCompra))}</p>
        <p style="margin:2px 0;"><strong>ORDENADOR:</strong> ${labelOrdenador(datos.ordenador)}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px;">
        <thead>
          <tr>
            <th style="border:1px solid #999;padding:6px;background:#ddd;text-align:left;">CÓD.</th>
            <th style="border:1px solid #999;padding:6px;background:#ddd;text-align:left;">CANT.</th>
            <th style="border:1px solid #999;padding:6px;background:#ddd;text-align:left;">DESCRIPCIÓN</th>
            <th style="border:1px solid #999;padding:6px;background:#ddd;text-align:left;">OBS.</th>
            <th style="border:1px solid #999;padding:6px;background:#ddd;text-align:left;">REF.</th>
          </tr>
        </thead>
        <tbody>${filasHtml || '<tr><td colspan="5" style="border:1px solid #999;padding:6px;">Sin productos</td></tr>'}</tbody>
      </table>
      ${datos.justificacionUrgente ? `<p style="margin:8px 0;font-size:13px;"><strong>Justificación ítems urgentes:</strong> ${escapeHtml(datos.justificacionUrgente)}</p>` : ''}
      <p style="margin:8px 0;font-size:13px;"><strong>Justificación pedido:</strong> ${escapeHtml(datos.justificacionPedido) || '—'}</p>
      <p style="margin:8px 0;font-size:13px;"><strong>Nombre solicitante:</strong> ${escapeHtml(datos.nombreSolicitante) || '—'}</p>
      <p style="margin:8px 0;font-size:13px;"><strong>Jefe sector:</strong> ${escapeHtml(datos.jefeSector) || '—'}</p>
      <div style="margin-top:16px;padding-top:12px;border-top:2px solid #1a5f8a;">
        <p style="margin:4px 0;font-size:13px;"><strong>AUTORIZADO POR ORDENADOR:</strong> ${autorizadoTexto}</p>
        ${datos.fechaAutorizacion ? `<p style="margin:4px 0;font-size:13px;"><strong>Fecha autorización:</strong> ${escapeHtml(datos.fechaAutorizacion)}</p>` : ''}
        ${datos.nombreOrdenador ? `<p style="margin:4px 0;font-size:13px;"><strong>Ordenador:</strong> ${escapeHtml(datos.nombreOrdenador)}</p>` : ''}
        ${datos.observacionOrdenador ? `<p style="margin:4px 0;font-size:13px;"><strong>Observación:</strong> ${escapeHtml(datos.observacionOrdenador)}</p>` : ''}
      </div>
      ${bloqueCompras}
    </div>
  `;
}

function crearElementoDocumento(datos) {
  const contenedor = document.createElement('div');
  contenedor.style.cssText = 'position:fixed;left:0;top:0;width:794px;background:#fff;z-index:99999;';
  contenedor.innerHTML = generarHtmlImpresion(datos);
  document.body.appendChild(contenedor);
  return contenedor;
}

function abrirVentanaImpresion(html) {
  const ventana = window.open('', '_blank', 'width=800,height=900');
  if (!ventana) {
    alert('Permita ventanas emergentes para imprimir.');
    return;
  }
  ventana.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Solicitud de Pedidos</title></head><body>${html}</body></html>`);
  ventana.document.close();
  ventana.onload = () => {
    ventana.focus();
    ventana.print();
  };
}

function esperarImagenes(contenedor) {
  const imgs = contenedor.querySelectorAll('img');
  return Promise.all([...imgs].map((img) => new Promise((resolve) => {
    if (img.complete && img.naturalWidth > 0) {
      resolve();
      return;
    }
    img.onload = () => resolve();
    img.onerror = () => resolve();
  })));
}

async function exportarPdf(datos) {
  if (typeof html2pdf === 'undefined') {
    alert('La librería PDF no está cargada. Use Imprimir → Guardar como PDF.');
    return;
  }

  const contenedor = crearElementoDocumento(datos);

  try {
    await esperarImagenes(contenedor);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    await html2pdf().set({
      margin: [10, 10, 10, 10],
      filename: `solicitud-${datos.numero}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    }).from(contenedor).save();
  } finally {
    document.body.removeChild(contenedor);
  }
}

function imprimirSolicitud(datos) {
  abrirVentanaImpresion(generarHtmlImpresion(datos));
}

function exportarSolicitudPdf(datos) {
  return exportarPdf(datos);
}

function mostrarToast(mensaje) {
  const toast = document.createElement('div');
  toast.className = 'toast-exito';
  toast.textContent = mensaje;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function mostrarNotificacionPedidoFinalizado(numeroOC, opciones = {}) {
  const existente = document.getElementById('modalNotificacion');
  if (existente) existente.remove();

  const modal = document.createElement('div');
  modal.id = 'modalNotificacion';
  modal.className = 'modal-overlay activo';
  modal.innerHTML = `
    <div class="modal-contenido modal-notificacion">
      <div class="notificacion-icono">✓</div>
      <h2>Pedido procesado correctamente</h2>
      <p class="notificacion-texto">
        El pedido fue procesado correctamente.<br>
        <strong>Nº Orden de Compra:</strong> ${escapeHtml(numeroOC)}<br><br>
        Consulte a la brevedad en <strong>Proveeduría / Recepción de Insumos</strong>.
      </p>
      <button type="button" class="btn-enviar" id="btnCerrarNotificacion">Entendido</button>
    </div>
  `;
  document.body.appendChild(modal);

  const cerrarModal = async () => {
    if (typeof opciones.onEntendido === 'function') {
      await opciones.onEntendido();
    }
    modal.remove();
  };

  modal.querySelector('#btnCerrarNotificacion').addEventListener('click', cerrarModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrarModal();
  });
}
