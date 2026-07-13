/**
 * Histórico de Pedidos — consulta, filtros y exportación
 */

const REGISTROS_POR_PAGINA = 10;

let resultadosFiltrados = [];
let paginaActual = 1;
let historicoEditando = null;

document.addEventListener('DOMContentLoaded', () => {
  renderNav('historico');
  initFiltrosHistorico();
  initAccionesHistorico();
  aplicarBusqueda();
});

function initFiltrosHistorico() {
  const anio = new Date().getFullYear();
  document.getElementById('filtroFechaDesde').value = `${anio}-01-01`;
  document.getElementById('filtroFechaHasta').value = `${anio}-12-31`;

  poblarSelectSectores(document.getElementById('filtroSector'), '');
  const sectorSelect = document.getElementById('filtroSector');
  sectorSelect.insertAdjacentHTML('afterbegin', '<option value="">Todos los sectores</option>');
  sectorSelect.value = '';

  poblarSelectTiposCompra(document.getElementById('filtroTipo'), '');
  const tipoSelect = document.getElementById('filtroTipo');
  tipoSelect.insertAdjacentHTML('afterbegin', '<option value="">Todos los tipos</option>');
  tipoSelect.value = '';

  const compradorSelect = document.getElementById('filtroComprador');
  compradorSelect.innerHTML = `
    <option value="">Todos los compradores</option>
    <option value="__sin_asignar__">Sin asignar</option>
    ${getCompradores(true).map((c) => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join('')}
  `;
  compradorSelect.value = '';
}

function initAccionesHistorico() {
  document.getElementById('formFiltrosHistorico').addEventListener('submit', (e) => {
    e.preventDefault();
    paginaActual = 1;
    aplicarBusqueda();
  });

  document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarFiltros);
  document.getElementById('btnExportarExcel').addEventListener('click', exportarHistoricoExcel);
  document.getElementById('btnGuardarEdicionHist').addEventListener('click', guardarEdicionHistorico);
  document.getElementById('btnAgregarFilaEditHist').addEventListener('click', () => agregarFilaEdicionHist());

  document.querySelectorAll('[data-cerrar-modal]').forEach((btn) => {
    btn.addEventListener('click', () => cerrarModalHistorico(btn.dataset.cerrarModal));
  });

  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cerrarModalHistorico(overlay.id);
    });
  });
}

function limpiarFiltros() {
  const anio = new Date().getFullYear();
  document.getElementById('formFiltrosHistorico').reset();
  document.getElementById('filtroFechaDesde').value = `${anio}-01-01`;
  document.getElementById('filtroFechaHasta').value = `${anio}-12-31`;
  document.getElementById('filtroSector').value = '';
  document.getElementById('filtroTipo').value = '';
  document.getElementById('filtroEstado').value = '';
  document.getElementById('filtroOrdenador').value = '';
  document.getElementById('filtroComprador').value = '';
  paginaActual = 1;
  aplicarBusqueda();
}

function obtenerFiltros() {
  const form = document.getElementById('formFiltrosHistorico');
  const fd = new FormData(form);
  return {
    fechaDesde: fd.get('fechaDesde'),
    fechaHasta: fd.get('fechaHasta'),
    sector: fd.get('sector'),
    tipo: fd.get('tipo'),
    estado: fd.get('estado'),
    numero: (fd.get('numero') || '').trim().toLowerCase(),
    solicitante: (fd.get('solicitante') || '').trim().toLowerCase(),
    ordenador: fd.get('ordenador'),
    comprador: fd.get('comprador'),
    soloUrgente: document.getElementById('filtroSoloUrgente').checked,
  };
}

function fechaSolicitudComparable(s) {
  return s.fecha || (s.fechaEnvio ? s.fechaEnvio.split('T')[0] : '');
}

function solicitudEnRangoFechas(s, desde, hasta) {
  const fecha = fechaSolicitudComparable(s);
  if (!fecha) return true;
  if (desde && fecha < desde) return false;
  if (hasta && fecha > hasta) return false;
  return true;
}

function solicitudTieneItemsUrgentes(s) {
  return productosValidos(s).some((p) => p.urgente);
}

function filtrarSolicitudes(filtros) {
  return getSolicitudes().filter((s) => {
    if (!solicitudEnRangoFechas(s, filtros.fechaDesde, filtros.fechaHasta)) return false;
    if (filtros.sector && s.sector !== filtros.sector) return false;
    if (filtros.tipo && s.tipoCompra !== filtros.tipo) return false;
    if (filtros.estado && s.estado !== filtros.estado) return false;
    if (filtros.numero && !String(s.numero).toLowerCase().includes(filtros.numero)) return false;
    if (filtros.solicitante && !(s.nombreSolicitante || '').toLowerCase().includes(filtros.solicitante)) return false;
    if (filtros.ordenador && s.ordenador !== filtros.ordenador) return false;
    if (filtros.comprador === '__sin_asignar__' && s.compradorId) return false;
    if (filtros.comprador && filtros.comprador !== '__sin_asignar__' && s.compradorId !== filtros.comprador) return false;
    if (filtros.soloUrgente && !solicitudTieneItemsUrgentes(s)) return false;
    return true;
  });
}

function estadoHistoricoLabel(estado) {
  const map = {
    finalizado: 'COMPLETADO',
    autorizado: 'PARCIAL',
    pendiente: 'PENDIENTE',
    rechazado: 'RECHAZADO',
  };
  return map[estado] || (estado || '—').toUpperCase();
}

function claseBadgeEstado(estado) {
  const map = {
    finalizado: 'badge-completado',
    autorizado: 'badge-parcial',
    pendiente: 'badge-pendiente',
    rechazado: 'badge-rechazado-historico',
  };
  return map[estado] || 'badge-pendiente';
}

function formatFechaHoraSolicitud(s) {
  if (s.fechaEnvio) {
    const d = new Date(s.fechaEnvio);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    }
  }
  const f = formatFecha(fechaSolicitudComparable(s));
  return f || '—';
}

function formatFechaAutorizacion(valor) {
  if (!valor) return '—';
  return valor;
}

function porcentaje(parte, total) {
  if (!total) return '0,00';
  return ((parte / total) * 100).toFixed(2).replace('.', ',');
}

function aplicarBusqueda() {
  const filtros = obtenerFiltros();
  resultadosFiltrados = filtrarSolicitudes(filtros);
  renderResumen(resultadosFiltrados);
  renderTablaHistorico();
}

function renderResumen(pedidos) {
  const total = pedidos.length;
  const completados = pedidos.filter((s) => s.estado === 'finalizado').length;
  const parciales = pedidos.filter((s) => s.estado === 'autorizado').length;
  const rechazados = pedidos.filter((s) => s.estado === 'rechazado').length;

  document.getElementById('resumenHistorico').innerHTML = `
    <article class="tarjeta-resumen tarjeta-resumen-total">
      <div class="tarjeta-resumen-icono">📋</div>
      <div>
        <p class="tarjeta-resumen-valor">${total}</p>
        <p class="tarjeta-resumen-label">Total de pedidos</p>
      </div>
    </article>
    <article class="tarjeta-resumen tarjeta-resumen-completado">
      <div class="tarjeta-resumen-icono">✓</div>
      <div>
        <p class="tarjeta-resumen-valor">${completados}</p>
        <p class="tarjeta-resumen-label">Pedidos completados</p>
        <p class="tarjeta-resumen-pct">${porcentaje(completados, total)}% del total</p>
      </div>
    </article>
    <article class="tarjeta-resumen tarjeta-resumen-parcial">
      <div class="tarjeta-resumen-icono">◐</div>
      <div>
        <p class="tarjeta-resumen-valor">${parciales}</p>
        <p class="tarjeta-resumen-label">Pedidos parciales</p>
        <p class="tarjeta-resumen-pct">${porcentaje(parciales, total)}% del total</p>
      </div>
    </article>
    <article class="tarjeta-resumen tarjeta-resumen-rechazado">
      <div class="tarjeta-resumen-icono">✕</div>
      <div>
        <p class="tarjeta-resumen-valor">${rechazados}</p>
        <p class="tarjeta-resumen-label">Pedidos rechazados</p>
        <p class="tarjeta-resumen-pct">${porcentaje(rechazados, total)}% del total</p>
      </div>
    </article>
  `;
}

function renderTablaHistorico() {
  const total = resultadosFiltrados.length;
  const totalPaginas = Math.max(1, Math.ceil(total / REGISTROS_POR_PAGINA));
  if (paginaActual > totalPaginas) paginaActual = totalPaginas;

  const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const pagina = resultadosFiltrados.slice(inicio, inicio + REGISTROS_POR_PAGINA);

  document.getElementById('tituloResultados').textContent =
    `RESULTADOS (${total} pedido${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''})`;

  const contenedor = document.getElementById('tablaHistorico');

  if (total === 0) {
    contenedor.innerHTML = '<p class="sin-datos">No se encontraron pedidos con los filtros seleccionados.</p>';
    renderPaginacion(0, 1);
    return;
  }

  contenedor.innerHTML = `
    <div class="table-wrapper">
      <table class="tabla-historico">
        <thead>
          <tr>
            <th>N° SOLICITUD</th>
            <th>FECHA SOLICITUD</th>
            <th>SECTOR SOLICITANTE</th>
            <th>ESTADO</th>
            <th>TOTAL ITEMS</th>
            <th>FECHA AUTORIZACIÓN</th>
            <th>SOLICITANTE</th>
            <th>ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          ${pagina.map((s) => `
            <tr class="${solicitudTieneItemsUrgentes(s) ? 'fila-urgente-historico' : ''}">
              <td>
                <strong>${escapeHtml(s.numero)}</strong>
                ${solicitudTieneItemsUrgentes(s) ? '<span class="alerta-urgente-mini">!</span>' : ''}
              </td>
              <td>${formatFechaHoraSolicitud(s)}</td>
              <td>${escapeHtml(labelSector(s.sector))}</td>
              <td><span class="badge-historico ${claseBadgeEstado(s.estado)}">${estadoHistoricoLabel(s.estado)}</span></td>
              <td>${productosValidos(s).length}</td>
              <td>${escapeHtml(formatFechaAutorizacion(s.fechaAutorizacion))}</td>
              <td>${escapeHtml(s.nombreSolicitante || '—')}</td>
              <td class="celda-acciones">
                <button type="button" class="btn-ver-detalle" data-id="${s.id}" title="Ver detalle">
                  <span aria-hidden="true">👁</span> Ver detalle
                </button>
                <button type="button" class="btn-icono-accion btn-icono-editar" data-id="${s.id}" title="Editar solicitud" aria-label="Editar">✏️</button>
                <button type="button" class="btn-icono-accion btn-icono-eliminar" data-id="${s.id}" title="Eliminar solicitud" aria-label="Eliminar">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  contenedor.querySelectorAll('.btn-ver-detalle').forEach((btn) => {
    btn.addEventListener('click', () => abrirDetalleHistorico(btn.dataset.id));
  });
  contenedor.querySelectorAll('.btn-icono-editar').forEach((btn) => {
    btn.addEventListener('click', () => abrirEditarHistorico(btn.dataset.id));
  });
  contenedor.querySelectorAll('.btn-icono-eliminar').forEach((btn) => {
    btn.addEventListener('click', () => eliminarHistorico(btn.dataset.id));
  });

  renderPaginacion(total, totalPaginas);
}

function renderPaginacion(total, totalPaginas) {
  const registrosPorPagina = REGISTROS_POR_PAGINA;
  const mostrando = total === 0 ? 0 : Math.min(registrosPorPagina, total - (paginaActual - 1) * registrosPorPagina);

  const htmlPaginas = totalPaginas <= 7
    ? Array.from({ length: totalPaginas }, (_, i) => i + 1)
        .map((n) => `<button type="button" class="btn-pagina${n === paginaActual ? ' activa' : ''}" data-pagina="${n}">${n}</button>`)
        .join('')
    : [
      paginaActual > 1 ? `<button type="button" class="btn-pagina" data-pagina="${paginaActual - 1}">‹</button>` : '',
      `<button type="button" class="btn-pagina activa" data-pagina="${paginaActual}">${paginaActual}</button>`,
      paginaActual < totalPaginas ? `<span class="pagina-sep">…</span><button type="button" class="btn-pagina" data-pagina="${totalPaginas}">${totalPaginas}</button>` : '',
      paginaActual < totalPaginas ? `<button type="button" class="btn-pagina" data-pagina="${paginaActual + 1}">›</button>` : '',
    ].join('');

  const bloque = `
    <div class="paginacion-controles">
      <span class="paginacion-info">Mostrando ${mostrando} registro${mostrando !== 1 ? 's' : ''} por página</span>
      <div class="paginacion-botones">${htmlPaginas}</div>
    </div>
  `;

  document.getElementById('paginacionTop').innerHTML = bloque;
  document.getElementById('paginacionBottom').innerHTML = bloque;

  document.querySelectorAll('.btn-pagina').forEach((btn) => {
    btn.addEventListener('click', () => {
      paginaActual = parseInt(btn.dataset.pagina, 10);
      renderTablaHistorico();
      document.querySelector('.historico-resultados')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function abrirDetalleHistorico(id) {
  const s = getSolicitudById(id);
  if (!s) return;

  const filas = productosValidos(s).map((p) => `
    <tr>
      <td>${escapeHtml(p.codigo) || '—'}</td>
      <td>${p.cantidad}</td>
      <td>${escapeHtml(p.descripcion)}${p.urgente ? ' <span class="urgente-tag">URGENTE</span>' : ''}</td>
      <td>${escapeHtml(p.ref) || '—'}</td>
    </tr>
  `).join('');

  document.getElementById('detalleHistoricoContenido').innerHTML = `
    <h2>Solicitud Nº ${escapeHtml(s.numero)}</h2>
    <div class="detalle-grid">
      <p><strong>Estado:</strong> <span class="badge-historico ${claseBadgeEstado(s.estado)}">${estadoHistoricoLabel(s.estado)}</span></p>
      <p><strong>Fecha solicitud:</strong> ${formatFechaHoraSolicitud(s)}</p>
      <p><strong>Sector:</strong> ${escapeHtml(labelSector(s.sector))}</p>
      <p><strong>Tipo de pedido:</strong> ${escapeHtml(labelTipoCompra(s.tipoCompra))}</p>
      <p><strong>Solicitante:</strong> ${escapeHtml(s.nombreSolicitante)}</p>
      <p><strong>Jefe sector:</strong> ${escapeHtml(s.jefeSector)}</p>
      <p><strong>Ordenador:</strong> ${s.ordenador ? labelOrdenador(s.ordenador) : '—'}</p>
      <p><strong>Fecha autorización:</strong> ${escapeHtml(formatFechaAutorizacion(s.fechaAutorizacion))}</p>
      <p><strong>Nº OC:</strong> ${escapeHtml(s.numeroOrdenCompra) || '—'}</p>
    </div>
    <table class="detalle-tabla">
      <thead><tr><th>CÓD.</th><th>CANT.</th><th>DESCRIPCIÓN</th><th>REF.</th></tr></thead>
      <tbody>${filas || '<tr><td colspan="4">Sin productos</td></tr>'}</tbody>
    </table>
    <p><strong>Justificación pedido:</strong> ${escapeHtml(s.justificacionPedido || '—')}</p>
    ${s.justificacionUrgente ? `<p><strong>Justificación urgente:</strong> ${escapeHtml(s.justificacionUrgente)}</p>` : ''}
    <div class="detalle-acciones">
      <button type="button" class="btn-imprimir-detalle">Imprimir</button>
      <button type="button" class="btn-pdf-detalle">PDF</button>
    </div>
  `;

  const contenido = document.getElementById('detalleHistoricoContenido');
  contenido.querySelector('.btn-imprimir-detalle')?.addEventListener('click', () => imprimirSolicitud(s));
  contenido.querySelector('.btn-pdf-detalle')?.addEventListener('click', () => exportarSolicitudPdf(s));

  document.getElementById('modalDetalleHistorico').classList.add('activo');
}

function abrirEditarHistorico(id) {
  historicoEditando = id;
  const s = getSolicitudById(id);
  if (!s) return;

  document.getElementById('editarHistoricoTitulo').textContent = `Editar solicitud Nº ${s.numero}`;

  poblarSelectSectores(document.getElementById('editHistSector'), s.sector);
  document.getElementById('editHistSolicitante').value = s.nombreSolicitante || '';
  document.getElementById('editHistJefeSector').value = s.jefeSector || '';
  document.getElementById('editHistJustificacion').value = s.justificacionPedido || '';

  const tbody = document.getElementById('editHistProductosBody');
  tbody.innerHTML = '';
  productosValidos(s).forEach((p) => agregarFilaEdicionHist(p));
  if (!tbody.children.length) agregarFilaEdicionHist();

  document.getElementById('modalEditarHistorico').classList.add('activo');
}

function agregarFilaEdicionHist(p = {}) {
  const tbody = document.getElementById('editHistProductosBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" class="edit-hist-codigo" value="${escapeHtml(p.codigo || '')}"></td>
    <td><input type="number" class="edit-hist-cantidad" min="1" value="${p.cantidad || 1}"></td>
    <td><input type="text" class="edit-hist-descripcion" value="${escapeHtml(p.descripcion || '')}"></td>
    <td><input type="text" class="edit-hist-ref" value="${escapeHtml(p.ref || '')}"></td>
    <td class="celda-check-urgente"><input type="checkbox" class="edit-hist-urgente" ${p.urgente ? 'checked' : ''}></td>
    <td><button type="button" class="btn-eliminar-fila">&times;</button></td>
  `;
  tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => {
    if (tbody.children.length > 1) tr.remove();
  });
  tbody.appendChild(tr);
}

function guardarEdicionHistorico() {
  if (!historicoEditando) return;

  const original = getSolicitudById(historicoEditando);
  if (!original) return;

  const productos = [];
  document.querySelectorAll('#editHistProductosBody tr').forEach((tr) => {
    const descripcion = tr.querySelector('.edit-hist-descripcion').value.trim();
    if (!descripcion) return;
    productos.push({
      codigo: tr.querySelector('.edit-hist-codigo').value.trim(),
      cantidad: parseInt(tr.querySelector('.edit-hist-cantidad').value, 10) || 1,
      descripcion,
      urgente: tr.querySelector('.edit-hist-urgente').checked,
      adjuntos: [],
      ref: tr.querySelector('.edit-hist-ref').value.trim(),
    });
  });

  if (!productos.length) {
    alert('Debe haber al menos un producto con descripción.');
    return;
  }

  updateSolicitud(historicoEditando, {
    sector: document.getElementById('editHistSector').value,
    nombreSolicitante: document.getElementById('editHistSolicitante').value.trim(),
    jefeSector: document.getElementById('editHistJefeSector').value.trim(),
    justificacionPedido: document.getElementById('editHistJustificacion').value.trim(),
    productos,
  });

  cerrarModalHistorico('modalEditarHistorico');
  historicoEditando = null;
  aplicarBusqueda();
  mostrarToast('Solicitud actualizada');
}

function eliminarHistorico(id) {
  const s = getSolicitudById(id);
  if (!s) return;
  if (!confirm(`¿Eliminar la solicitud Nº ${s.numero}? Esta acción no se puede deshacer.`)) return;
  deleteSolicitud(id);
  aplicarBusqueda();
  mostrarToast('Solicitud eliminada');
}

function cerrarModalHistorico(id) {
  document.getElementById(id).classList.remove('activo');
  if (id === 'modalEditarHistorico') historicoEditando = null;
}

function exportarHistoricoExcel() {
  if (resultadosFiltrados.length === 0) {
    alert('No hay pedidos para exportar con los filtros actuales.');
    return;
  }

  const columnas = [
    'N° SOLICITUD',
    'FECHA SOLICITUD',
    'SECTOR SOLICITANTE',
    'ESTADO',
    'TOTAL ITEMS',
    'FECHA AUTORIZACIÓN',
    'SOLICITANTE',
  ];

  const filas = resultadosFiltrados.map((s) => [
    s.numero,
    formatFechaHoraSolicitud(s),
    labelSector(s.sector),
    estadoHistoricoLabel(s.estado),
    productosValidos(s).length,
    formatFechaAutorizacion(s.fechaAutorizacion),
    s.nombreSolicitante || '',
  ]);

  const escapeCsv = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`;
  const csv = [
    columnas.map(escapeCsv).join(';'),
    ...filas.map((fila) => fila.map(escapeCsv).join(';')),
  ].join('\r\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const enlace = document.createElement('a');
  const fecha = new Date().toISOString().split('T')[0];
  enlace.href = URL.createObjectURL(blob);
  enlace.download = `historico-pedidos-${fecha}.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
  mostrarToast(`Exportados ${resultadosFiltrados.length} pedidos a Excel`);
}
