/**
 * Pedidos autorizados — sector Compras
 */

let pedidoActual = null;

document.addEventListener('DOMContentLoaded', () => {
  renderNav('pedidos');
  renderListaPedidos();
  initModales();
});

function esPedidoAutorizadoCompras(s) {
  return s.estado === 'autorizado' && !tipoCompraEsStock(s.tipoCompra);
}

function renderListaPedidos() {
  const contenedor = document.getElementById('listaPedidos');
  const busqueda = document.getElementById('buscarPedido')?.value.trim().toLowerCase() || '';

  const pedidos = getSolicitudes()
    .filter(esPedidoAutorizadoCompras)
    .filter((s) => {
      if (!busqueda) return true;
      return (
        s.numero.includes(busqueda)
        || s.nombreSolicitante.toLowerCase().includes(busqueda)
        || (s.numeroOrdenCompra || '').toLowerCase().includes(busqueda)
        || labelSector(s.sector).toLowerCase().includes(busqueda)
      );
    });

  if (pedidos.length === 0) {
    contenedor.innerHTML = '<p class="sin-datos">No hay pedidos autorizados para gestionar.</p>';
    return;
  }

  contenedor.innerHTML = pedidos.map((s) => `
    <article class="tarjeta-solicitud estado-autorizado">
      <div class="tarjeta-header">
        <span class="tarjeta-numero">Solicitud Nº ${escapeHtml(s.numero)}</span>
        <span class="badge badge-autorizado">Autorizado</span>
      </div>
      <div class="tarjeta-body">
        <p><strong>Fecha solicitud:</strong> ${formatFecha(s.fecha)}</p>
        <p><strong>Sector:</strong> ${escapeHtml(labelSector(s.sector))}</p>
        <p><strong>Tipo de pedido:</strong> ${escapeHtml(labelTipoCompra(s.tipoCompra))}</p>
        <p><strong>Solicitante:</strong> ${escapeHtml(s.nombreSolicitante)}</p>
        <p><strong>Ordenador:</strong> ${labelOrdenador(s.ordenador)} — ${escapeHtml(s.nombreOrdenador || '')}</p>
        <p><strong>Nº Orden de Compra:</strong> ${escapeHtml(s.numeroOrdenCompra) || '<em>Sin asignar</em>'}</p>
        <p><strong>Productos:</strong> ${productosValidos(s).length} ítem(s)</p>
      </div>
      <div class="tarjeta-acciones">
        <button type="button" class="btn-ver" data-id="${s.id}">Ver pedido</button>
        <button type="button" class="btn-gestionar" data-id="${s.id}">Gestión pedido</button>
        <button type="button" class="btn-imprimir-item" data-id="${s.id}">Imprimir</button>
        <button type="button" class="btn-pdf-item" data-id="${s.id}">PDF</button>
      </div>
    </article>
  `).join('');

  bindAccionesLista(contenedor);
}

function bindAccionesLista(contenedor) {
  contenedor.querySelectorAll('.btn-ver').forEach((btn) => {
    btn.addEventListener('click', () => abrirDetallePedido(btn.dataset.id));
  });
  contenedor.querySelectorAll('.btn-gestionar').forEach((btn) => {
    btn.addEventListener('click', () => abrirModalGestion(btn.dataset.id));
  });
  contenedor.querySelectorAll('.btn-imprimir-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const s = getSolicitudById(btn.dataset.id);
      if (s) imprimirSolicitud(s);
    });
  });
  contenedor.querySelectorAll('.btn-pdf-item').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const s = getSolicitudById(btn.dataset.id);
      if (s) await exportarSolicitudPdf(s);
    });
  });
}

function abrirDetallePedido(id) {
  const s = getSolicitudById(id);
  if (!s) return;

  const filas = productosValidos(s).map((p) => `
    <tr>
      <td>${escapeHtml(p.codigo) || '—'}</td>
      <td>${p.cantidad}</td>
      <td>${escapeHtml(p.descripcion)}${p.urgente ? ' <span class="urgente-tag">URGENTE</span>' : ''}</td>
      <td>${p.adjuntos?.length
        ? p.adjuntos.map((a) => `<a href="${a.dataUrl}" target="_blank">${escapeHtml(a.nombre)}</a>`).join('<br>')
        : '—'}</td>
      <td>${escapeHtml(p.ref) || '—'}</td>
    </tr>
  `).join('');

  document.getElementById('detalleContenido').innerHTML = `
    <h2>Pedido autorizado Nº ${escapeHtml(s.numero)}</h2>
    <div class="detalle-grid">
      <p><strong>Fecha:</strong> ${formatFecha(s.fecha)}</p>
      <p><strong>Sector:</strong> ${escapeHtml(labelSector(s.sector))}</p>
      <p><strong>Solicitante:</strong> ${escapeHtml(s.nombreSolicitante)}</p>
      <p><strong>Jefe sector:</strong> ${escapeHtml(s.jefeSector)}</p>
      <p><strong>Autorizó:</strong> ${escapeHtml(s.nombreOrdenador)} (${escapeHtml(s.fechaAutorizacion)})</p>
      <p><strong>Nº OC:</strong> ${escapeHtml(s.numeroOrdenCompra) || '—'}</p>
    </div>
    <table class="detalle-tabla">
      <thead><tr><th>CÓD.</th><th>CANT.</th><th>DESCRIPCIÓN</th><th>ADJUNTOS</th><th>REF.</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <p><strong>Justificación pedido:</strong> ${escapeHtml(s.justificacionPedido)}</p>
    ${s.observacionesCompras ? `<p><strong>Observaciones Compras:</strong> ${escapeHtml(s.observacionesCompras)}</p>` : ''}
    ${s.adjuntoOrdenCompra ? `<p><strong>PDF Orden / Cotización:</strong> <a href="${s.adjuntoOrdenCompra.dataUrl}" target="_blank">${escapeHtml(s.adjuntoOrdenCompra.nombre)}</a></p>` : ''}
    <div class="detalle-acciones">
      <button type="button" class="btn-gestionar-detalle">Gestión pedido</button>
      <button type="button" class="btn-imprimir-detalle">Imprimir</button>
      <button type="button" class="btn-pdf-detalle">PDF</button>
    </div>
  `;

  const contenido = document.getElementById('detalleContenido');
  contenido.querySelector('.btn-gestionar-detalle')?.addEventListener('click', () => {
    cerrarModal('modalDetalle');
    abrirModalGestion(s.id);
  });
  contenido.querySelector('.btn-imprimir-detalle')?.addEventListener('click', () => imprimirSolicitud(s));
  contenido.querySelector('.btn-pdf-detalle')?.addEventListener('click', () => exportarSolicitudPdf(s));

  document.getElementById('modalDetalle').classList.add('activo');
}

function abrirModalGestion(id) {
  pedidoActual = id;
  const s = getSolicitudById(id);
  if (!s) return;

  document.getElementById('gestionTitulo').textContent = `Gestión pedido Nº ${s.numero}`;
  document.getElementById('numeroOrdenCompra').value = s.numeroOrdenCompra || '';
  document.getElementById('observacionesCompras').value = s.observacionesCompras || '';

  const preview = document.getElementById('previewAdjuntoOC');
  if (s.adjuntoOrdenCompra) {
    preview.innerHTML = `
      <div class="adjunto-item">
        <span class="adjunto-icon">📄</span>
        <a href="${s.adjuntoOrdenCompra.dataUrl}" target="_blank" class="adjunto-nombre">${escapeHtml(s.adjuntoOrdenCompra.nombre)}</a>
        <button type="button" class="btn-quitar-adjunto" id="btnQuitarOC">&times;</button>
      </div>
    `;
    document.getElementById('btnQuitarOC').addEventListener('click', () => {
      preview.innerHTML = '';
      preview.dataset.quitar = '1';
    });
  } else {
    preview.innerHTML = '';
    delete preview.dataset.quitar;
  }

  document.getElementById('inputAdjuntoOC').value = '';
  document.getElementById('modalGestion').classList.add('activo');
}

async function cerrarPedidoCompras() {
  if (!pedidoActual) return;

  const numeroOC = document.getElementById('numeroOrdenCompra').value.trim();
  if (!numeroOC) {
    alert('Ingrese el número de la Orden de Compra.');
    return;
  }

  const cambios = {
    numeroOrdenCompra: numeroOC,
    observacionesCompras: document.getElementById('observacionesCompras').value.trim(),
    fechaGestionCompras: new Date().toLocaleString('es-AR'),
    estado: 'finalizado',
    fechaFinalizacion: new Date().toLocaleString('es-AR'),
  };

  const preview = document.getElementById('previewAdjuntoOC');
  const inputOC = document.getElementById('inputAdjuntoOC');

  if (preview.dataset.quitar === '1') {
    cambios.adjuntoOrdenCompra = null;
  } else if (inputOC.files.length > 0) {
    const adjunto = await procesarArchivoUnico(inputOC.files[0], true);
    if (adjunto) cambios.adjuntoOrdenCompra = adjunto;
  }

  updateSolicitud(pedidoActual, cambios);
  cerrarModal('modalGestion');
  const oc = numeroOC;
  pedidoActual = null;
  renderListaPedidos();
  mostrarNotificacionPedidoFinalizado(oc);
}

function initModales() {
  document.getElementById('buscarPedido').addEventListener('input', renderListaPedidos);
  document.getElementById('btnCerrarPedido').addEventListener('click', cerrarPedidoCompras);
  document.getElementById('btnAdjuntarOC').addEventListener('click', () => {
    document.getElementById('inputAdjuntoOC').click();
  });

  document.querySelectorAll('[data-cerrar-modal]').forEach((btn) => {
    btn.addEventListener('click', () => cerrarModal(btn.dataset.cerrarModal));
  });

  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cerrarModal(overlay.id);
    });
  });
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove('activo');
}
