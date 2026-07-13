/**
 * Pedidos autorizados — sector Compras
 */

let pedidoActual = null;
let pedidoAsignar = null;

document.addEventListener('DOMContentLoaded', () => {
  renderNav('pedidos');
  poblarFiltroCompradores();
  renderListaPedidos();
  initModales();
});

function esPedidoAutorizadoCompras(s) {
  return s.estado === 'autorizado' && !tipoCompraEsStock(s.tipoCompra);
}

function solicitudTieneItemsUrgentes(s) {
  return productosValidos(s).some((p) => p.urgente);
}

function textoCompradorAsignado(s) {
  const nombre = labelComprador(s.compradorId);
  return nombre
    ? `<span class="comprador-asignado">${escapeHtml(nombre)}</span>`
    : '<span class="comprador-sin-asignar">Sin asignar</span>';
}

function poblarFiltroCompradores() {
  const select = document.getElementById('filtroComprador');
  if (!select) return;

  const valorActual = select.value;
  const compradores = getCompradores(true);

  select.innerHTML = `
    <option value="">Todos</option>
    <option value="__sin_asignar__">Sin asignar</option>
    ${compradores.map((c) => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join('')}
  `;

  if (valorActual && [...select.options].some((o) => o.value === valorActual)) {
    select.value = valorActual;
  }
}

function renderListaPedidos() {
  const contenedor = document.getElementById('listaPedidos');
  const busqueda = document.getElementById('buscarPedido')?.value.trim().toLowerCase() || '';
  const filtroComprador = document.getElementById('filtroComprador')?.value || '';

  const pedidos = getSolicitudes()
    .filter(esPedidoAutorizadoCompras)
    .filter((s) => {
      if (filtroComprador === '__sin_asignar__') return !s.compradorId;
      if (filtroComprador) return s.compradorId === filtroComprador;
      return true;
    })
    .filter((s) => {
      if (!busqueda) return true;
      const comprador = (labelComprador(s.compradorId) || '').toLowerCase();
      return (
        s.numero.includes(busqueda)
        || labelSector(s.sector).toLowerCase().includes(busqueda)
        || labelTipoCompra(s.tipoCompra).toLowerCase().includes(busqueda)
        || comprador.includes(busqueda)
      );
    })
    .sort((a, b) => (solicitudTieneItemsUrgentes(b) ? 1 : 0) - (solicitudTieneItemsUrgentes(a) ? 1 : 0));

  if (pedidos.length === 0) {
    contenedor.innerHTML = '<p class="sin-datos">No hay pedidos autorizados para gestionar.</p>';
    return;
  }

  const hayUrgentes = pedidos.some(solicitudTieneItemsUrgentes);

  contenedor.innerHTML = `
    ${hayUrgentes ? '<p class="aviso-lista-urgente"><span class="alerta-urgente-icon">!</span> Hay pedidos autorizados con ítems <strong>URGENTES</strong> pendientes de gestión.</p>' : ''}
    <div class="table-wrapper">
      <table class="tabla-pedidos-autorizados">
        <thead>
          <tr>
            <th>Nº solicitud</th>
            <th>Fecha</th>
            <th>Sector</th>
            <th>Tipo de pedido</th>
            <th>Comprador</th>
            <th class="col-acciones-lista">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${pedidos.map((s) => {
            const urgente = solicitudTieneItemsUrgentes(s);
            return `
              <tr class="${urgente ? 'pedido-con-urgente' : ''}">
                <td>
                  <span class="pedido-numero-celda">${escapeHtml(s.numero)}</span>
                  ${urgente ? '<span class="alerta-urgente" title="Contiene ítems urgentes"><span class="alerta-urgente-icon">!</span> URGENTE</span>' : ''}
                </td>
                <td>${formatFecha(s.fecha)}</td>
                <td>${escapeHtml(labelSector(s.sector))}</td>
                <td>${escapeHtml(labelTipoCompra(s.tipoCompra))}</td>
                <td>${textoCompradorAsignado(s)}</td>
                <td class="celda-acciones">
                  <button type="button" class="btn-ver" data-id="${s.id}">Ver pedido</button>
                  <button type="button" class="btn-asignar" data-id="${s.id}">Asignar</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  bindAccionesLista(contenedor);
}

function bindAccionesLista(contenedor) {
  contenedor.querySelectorAll('.btn-ver').forEach((btn) => {
    btn.addEventListener('click', () => abrirDetallePedido(btn.dataset.id));
  });
  contenedor.querySelectorAll('.btn-asignar').forEach((btn) => {
    btn.addEventListener('click', () => abrirModalAsignar(btn.dataset.id));
  });
}

function abrirModalAsignar(id) {
  pedidoAsignar = id;
  const s = getSolicitudById(id);
  if (!s) return;

  document.getElementById('asignarTitulo').textContent = `Asignar comprador — Solicitud Nº ${s.numero}`;

  const select = document.getElementById('selectCompradorAsignado');
  const compradores = getCompradores(true);
  select.innerHTML = `
    <option value="">— Seleccione un comprador —</option>
    ${compradores.map((c) => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join('')}
  `;
  if (s.compradorId && compradores.some((c) => c.id === s.compradorId)) {
    select.value = s.compradorId;
  }

  document.getElementById('modalAsignar').classList.add('activo');
}

function confirmarAsignacion() {
  if (!pedidoAsignar) return;

  const compradorId = document.getElementById('selectCompradorAsignado').value;
  if (!compradorId) {
    alert('Seleccione un comprador.');
    return;
  }

  updateSolicitud(pedidoAsignar, {
    compradorId,
    fechaAsignacionComprador: new Date().toLocaleString('es-AR'),
  });

  const nombre = labelComprador(compradorId);
  pedidoAsignar = null;
  cerrarModal('modalAsignar');
  renderListaPedidos();
  mostrarToast(`Pedido asignado a ${nombre}`);
}

function quitarAsignacion() {
  if (!pedidoAsignar) return;
  if (!confirm('¿Quitar la asignación de comprador de este pedido?')) return;

  updateSolicitud(pedidoAsignar, {
    compradorId: null,
    fechaAsignacionComprador: null,
  });

  pedidoAsignar = null;
  cerrarModal('modalAsignar');
  renderListaPedidos();
  mostrarToast('Asignación eliminada');
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

  const compradorTexto = labelComprador(s.compradorId) || 'Sin asignar';

  document.getElementById('detalleContenido').innerHTML = `
    <h2>Pedido autorizado Nº ${escapeHtml(s.numero)}</h2>
    <div class="detalle-grid">
      <p><strong>Fecha:</strong> ${formatFecha(s.fecha)}</p>
      <p><strong>Sector:</strong> ${escapeHtml(labelSector(s.sector))}</p>
      <p><strong>Comprador:</strong> ${escapeHtml(compradorTexto)}</p>
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
      <button type="button" class="btn-asignar-detalle">Asignar</button>
      <button type="button" class="btn-imprimir-detalle">Imprimir</button>
    </div>
  `;

  const contenido = document.getElementById('detalleContenido');
  contenido.querySelector('.btn-gestionar-detalle')?.addEventListener('click', () => {
    cerrarModal('modalDetalle');
    abrirModalGestion(s.id);
  });
  contenido.querySelector('.btn-asignar-detalle')?.addEventListener('click', () => {
    cerrarModal('modalDetalle');
    abrirModalAsignar(s.id);
  });
  contenido.querySelector('.btn-imprimir-detalle')?.addEventListener('click', () => imprimirSolicitud(s));

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

  const idCerrado = pedidoActual;
  updateSolicitud(pedidoActual, cambios);
  cerrarModal('modalGestion');
  const oc = numeroOC;
  const solicitud = getSolicitudById(idCerrado);
  pedidoActual = null;
  renderListaPedidos();
  mostrarNotificacionPedidoFinalizado(oc, {
    onEntendido: async () => {
      const resultado = await notificarSectorPedidoProcesado(solicitud, oc);
      if (resultado.ok) {
        mostrarToast(resultado.mensaje || 'Notificación enviada al sector por correo electrónico');
      } else if (resultado.error) {
        mostrarToast(`Pedido cerrado. ${resultado.error}`);
      }
    },
  });
}

function initModales() {
  document.getElementById('buscarPedido').addEventListener('input', renderListaPedidos);
  document.getElementById('filtroComprador').addEventListener('change', renderListaPedidos);
  document.getElementById('btnCerrarPedido').addEventListener('click', cerrarPedidoCompras);
  document.getElementById('btnConfirmarAsignacion').addEventListener('click', confirmarAsignacion);
  document.getElementById('btnQuitarAsignacion').addEventListener('click', quitarAsignacion);
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
  if (id === 'modalAsignar') pedidoAsignar = null;
}
