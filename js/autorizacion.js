/**
 * Panel de autorización — por ordenador
 */

let solicitudActual = null;
let ordenadorPanel = null;

document.addEventListener('DOMContentLoaded', () => {
  ordenadorPanel = getOrdenadorFromUrl();
  renderNav('autorizacion');
  mostrarFlashNotificacionEnvio();

  if (!ordenadorPanel) {
    mostrarSelectorOrdenador();
    return;
  }

  mostrarPanelOrdenador();
  renderListaSolicitudes();
  initModalAutorizacion();
});

function mostrarSelectorOrdenador() {
  document.getElementById('panelOrdenador').innerHTML = `
    <div class="panel-marca">
      <img src="assets/logo-casmer.png" alt="CASMER - FEPREMI" class="logo-casmer">
    </div>
    <header class="panel-header">
      <h1>PANELES DE AUTORIZACIÓN</h1>
      <p class="panel-subtitulo">Seleccione el panel correspondiente a su rol de ordenador</p>
    </header>
    <div class="selector-ordenadores">
      ${Object.entries(ORDENADORES).map(([key, info]) => `
        <a href="autorizacion.html?ordenador=${key}" class="tarjeta-ordenador">
          <h2>${info.label}</h2>
          <p>Ver solicitudes pendientes de autorización</p>
        </a>
      `).join('')}
    </div>
  `;
  document.getElementById('panelFiltros').style.display = 'none';
}

function mostrarPanelOrdenador() {
  document.getElementById('panelOrdenador').innerHTML = `
    <div class="panel-marca">
      <img src="assets/logo-casmer.png" alt="CASMER - FEPREMI" class="logo-casmer">
    </div>
    <header class="panel-header">
      <h1>PANEL DE AUTORIZACIÓN — ${labelOrdenador(ordenadorPanel).toUpperCase()}</h1>
      <p class="panel-subtitulo">Solicitudes enviadas a ${labelOrdenador(ordenadorPanel)} para autorizar o rechazar</p>
    </header>
  `;
}

function renderListaSolicitudes() {
  if (!ordenadorPanel) return;

  const contenedor = document.getElementById('listaSolicitudes');
  const filtro = document.getElementById('filtroEstado')?.value || 'pendiente';

  const filtradas = getSolicitudes().filter((s) => {
    if (s.ordenador !== ordenadorPanel) return false;
    if (tipoCompraEsStock(s.tipoCompra)) return false;
    if (filtro === 'todas') return true;
    return s.estado === filtro;
  });

  if (filtradas.length === 0) {
    contenedor.innerHTML = `<p class="sin-datos">No hay solicitudes para ${labelOrdenador(ordenadorPanel)}.</p>`;
    return;
  }

  contenedor.innerHTML = filtradas.map((s) => `
    <article class="tarjeta-solicitud estado-${s.estado}">
      <div class="tarjeta-header">
        <span class="tarjeta-numero">Nº ${escapeHtml(s.numero)}</span>
        <span class="badge badge-${s.estado}">${estadoLabel(s.estado)}</span>
      </div>
      <div class="tarjeta-body">
        <p><strong>Fecha:</strong> ${formatFecha(s.fecha)}</p>
        <p><strong>Sector:</strong> ${escapeHtml(s.sector)}</p>
        <p><strong>Solicitante:</strong> ${escapeHtml(s.nombreSolicitante)}</p>
        <p><strong>Productos:</strong> ${productosValidos(s).length} ítem(s)</p>
      </div>
      <div class="tarjeta-acciones">
        <button type="button" class="btn-ver" data-id="${s.id}">Ver detalle</button>
        ${s.estado === 'pendiente' ? `
          <button type="button" class="btn-autorizar-si" data-id="${s.id}">SI</button>
          <button type="button" class="btn-autorizar-no" data-id="${s.id}">NO</button>
        ` : `
          <button type="button" class="btn-imprimir-item" data-id="${s.id}">Imprimir</button>
          <button type="button" class="btn-pdf-item" data-id="${s.id}">PDF</button>
        `}
      </div>
    </article>
  `).join('');

  bindAccionesTarjetas(contenedor);
}

function bindAccionesTarjetas(contenedor) {
  contenedor.querySelectorAll('.btn-ver').forEach((btn) => {
    btn.addEventListener('click', () => abrirDetalle(btn.dataset.id));
  });
  contenedor.querySelectorAll('.btn-autorizar-si').forEach((btn) => {
    btn.addEventListener('click', () => abrirModalAutorizacion(btn.dataset.id, true));
  });
  contenedor.querySelectorAll('.btn-autorizar-no').forEach((btn) => {
    btn.addEventListener('click', () => abrirModalAutorizacion(btn.dataset.id, false));
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

function abrirDetalle(id) {
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
    <h2>Solicitud Nº ${escapeHtml(s.numero)}</h2>
    <div class="detalle-grid">
      <p><strong>Fecha:</strong> ${formatFecha(s.fecha)}</p>
      <p><strong>Sector:</strong> ${escapeHtml(s.sector)}</p>
      <p><strong>Tipo de pedido:</strong> ${escapeHtml(labelTipoCompra(s.tipoCompra))}</p>
      <p><strong>Ordenador:</strong> ${labelOrdenador(s.ordenador)}</p>
      <p><strong>Solicitante:</strong> ${escapeHtml(s.nombreSolicitante)}</p>
      <p><strong>Jefe sector:</strong> ${escapeHtml(s.jefeSector)}</p>
      <p><strong>Estado:</strong> <span class="badge badge-${s.estado}">${estadoLabel(s.estado)}</span></p>
    </div>
    <table class="detalle-tabla">
      <thead><tr><th>CÓD.</th><th>CANT.</th><th>DESCRIPCIÓN</th><th>ADJUNTOS</th><th>REF.</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    ${s.justificacionUrgente ? `<p><strong>Justificación urgente:</strong> ${escapeHtml(s.justificacionUrgente)}</p>` : ''}
    <p><strong>Justificación pedido:</strong> ${escapeHtml(s.justificacionPedido)}</p>
    ${s.nombreOrdenador ? `<p><strong>Autorizó:</strong> ${escapeHtml(s.nombreOrdenador)} (${escapeHtml(s.fechaAutorizacion)})</p>` : ''}
    ${s.observacionOrdenador ? `<p><strong>Observación:</strong> ${escapeHtml(s.observacionOrdenador)}</p>` : ''}
    <div class="detalle-acciones">
      <button type="button" class="btn-imprimir-detalle">Imprimir</button>
      ${s.estado === 'pendiente' ? `
        <button type="button" class="btn-autorizar-si-detalle">Autorizar (SI)</button>
        <button type="button" class="btn-autorizar-no-detalle">Rechazar (NO)</button>
      ` : ''}
    </div>
  `;

  const contenido = document.getElementById('detalleContenido');
  contenido.querySelector('.btn-imprimir-detalle')?.addEventListener('click', () => imprimirSolicitud(s));
  contenido.querySelector('.btn-autorizar-si-detalle')?.addEventListener('click', () => {
    cerrarModal('modalDetalle');
    abrirModalAutorizacion(s.id, true);
  });
  contenido.querySelector('.btn-autorizar-no-detalle')?.addEventListener('click', () => {
    cerrarModal('modalDetalle');
    abrirModalAutorizacion(s.id, false);
  });

  document.getElementById('modalDetalle').classList.add('activo');
}

function initModalAutorizacion() {
  const filtro = document.getElementById('filtroEstado');
  if (filtro) filtro.addEventListener('change', renderListaSolicitudes);

  document.getElementById('btnConfirmarAutorizacion').addEventListener('click', confirmarAutorizacion);

  document.querySelectorAll('[data-cerrar-modal]').forEach((btn) => {
    btn.addEventListener('click', () => cerrarModal(btn.dataset.cerrarModal));
  });

  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cerrarModal(overlay.id);
    });
  });
}

function abrirModalAutorizacion(id, autorizar) {
  solicitudActual = { id, autorizar, productosOriginales: null };
  const s = getSolicitudById(id);
  if (!s) return;

  solicitudActual.productosOriginales = JSON.parse(JSON.stringify(s.productos || []));

  document.getElementById('modalAutorizacionTitulo').textContent =
    autorizar ? `Autorizar solicitud Nº ${s.numero}` : `Rechazar solicitud Nº ${s.numero}`;

  const bloqueProductos = document.getElementById('bloqueEdicionProductos');
  const tbody = document.getElementById('productosAutorizacionBody');

  if (autorizar) {
    bloqueProductos.hidden = false;
    tbody.innerHTML = (s.productos || [])
      .map((p, idx) => {
        if (!p.descripcion) return '';
        return `
          <tr data-idx="${idx}">
            <td>${escapeHtml(p.codigo) || '—'}</td>
            <td><input type="number" class="auth-input-cantidad" min="1" value="${p.cantidad}" required></td>
            <td><input type="text" class="auth-input-descripcion" value="${escapeHtml(p.descripcion)}" required></td>
          </tr>
        `;
      })
      .join('');
  } else {
    bloqueProductos.hidden = true;
    tbody.innerHTML = '';
  }

  document.getElementById('nombreOrdenador').value = '';
  document.getElementById('observacionOrdenador').value = '';
  document.getElementById('modalAutorizacion').classList.add('activo');
}

function obtenerProductosEditadosAutorizacion(productosOriginales) {
  const productos = JSON.parse(JSON.stringify(productosOriginales || []));
  document.querySelectorAll('#productosAutorizacionBody tr[data-idx]').forEach((tr) => {
    const idx = parseInt(tr.dataset.idx, 10);
    productos[idx] = {
      ...productos[idx],
      cantidad: parseInt(tr.querySelector('.auth-input-cantidad').value, 10) || 1,
      descripcion: tr.querySelector('.auth-input-descripcion').value.trim(),
    };
  });
  return productos;
}

function detectarCambiosProductos(productosOriginales, productosActualizados) {
  const cambios = [];
  (productosOriginales || []).forEach((p, idx) => {
    if (!p.descripcion) return;
    const n = productosActualizados[idx];
    if (!n) return;
    if (p.cantidad !== n.cantidad || p.descripcion !== n.descripcion) {
      cambios.push({
        codigo: p.codigo || '',
        cantidadAnterior: p.cantidad,
        cantidadNueva: n.cantidad,
        descripcionAnterior: p.descripcion,
        descripcionNueva: n.descripcion,
      });
    }
  });
  return cambios;
}

function validarProductosAutorizacion() {
  const filas = document.querySelectorAll('#productosAutorizacionBody tr[data-idx]');
  for (const tr of filas) {
    const cantidad = parseInt(tr.querySelector('.auth-input-cantidad').value, 10);
    const descripcion = tr.querySelector('.auth-input-descripcion').value.trim();
    if (!descripcion) {
      alert('Todos los productos deben tener descripción.');
      return false;
    }
    if (!cantidad || cantidad < 1) {
      alert('La cantidad debe ser al menos 1.');
      return false;
    }
  }
  return true;
}

async function confirmarAutorizacion() {
  if (!solicitudActual) return;

  const nombreOrdenador = document.getElementById('nombreOrdenador').value.trim();
  if (!nombreOrdenador) {
    alert('Ingrese el nombre del ordenador.');
    return;
  }

  const { id, autorizar, productosOriginales } = solicitudActual;
  const observacionOrdenador = document.getElementById('observacionOrdenador').value.trim();
  const btnConfirmar = document.getElementById('btnConfirmarAutorizacion');

  let productosActualizados = productosOriginales;
  let cambiosProductos = [];

  if (autorizar) {
    if (!validarProductosAutorizacion()) return;
    productosActualizados = obtenerProductosEditadosAutorizacion(productosOriginales);
    cambiosProductos = detectarCambiosProductos(productosOriginales, productosActualizados);
  }

  btnConfirmar.disabled = true;
  btnConfirmar.textContent = 'CONFIRMANDO...';

  const cambiosSolicitud = {
    estado: autorizar ? 'autorizado' : 'rechazado',
    autorizado: autorizar,
    nombreOrdenador,
    observacionOrdenador,
    fechaAutorizacion: new Date().toLocaleString('es-AR'),
  };

  if (autorizar) {
    cambiosSolicitud.productos = productosActualizados;
    cambiosSolicitud.editadaPorOrdenador = cambiosProductos.length > 0;
  }

  updateSolicitud(id, cambiosSolicitud);
  const solicitudActualizada = getSolicitudById(id);

  const notificacion = await notificarSectorAutorizacion(solicitudActualizada, {
    autorizada: autorizar,
    editada: cambiosProductos.length > 0,
    cambiosProductos,
    observacion: observacionOrdenador,
    nombreOrdenador,
  });

  cerrarModal('modalAutorizacion');
  solicitudActual = null;
  renderListaSolicitudes();

  btnConfirmar.disabled = false;
  btnConfirmar.textContent = 'Confirmar';

  if (autorizar) {
    const msg = cambiosProductos.length > 0
      ? 'Solicitud autorizada con modificaciones'
      : 'Solicitud autorizada';
    mostrarToast(notificacion.ok ? `${msg}. ${notificacion.mensaje}` : `${msg}. ${notificacion.error}`);
  } else {
    mostrarToast(notificacion.ok ? `Solicitud rechazada. ${notificacion.mensaje}` : `Solicitud rechazada. ${notificacion.error}`);
  }
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove('activo');
  if (id === 'modalAutorizacion') {
    solicitudActual = null;
    const btn = document.getElementById('btnConfirmarAutorizacion');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Confirmar';
    }
  }
}
