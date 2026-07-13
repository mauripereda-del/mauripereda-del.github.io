/**
 * Pedidos COMPRA STOCK — sin autorización de ordenador
 */

let pedidoEditando = null;

document.addEventListener('DOMContentLoaded', () => {
  renderNav('stock');
  renderListaStock();
  initModalesStock();
});

function esPedidoStockActivo(s) {
  return tipoCompraEsStock(s.tipoCompra) && s.estado === 'autorizado';
}

function stockTieneItemsUrgentes(s) {
  return productosValidos(s).some((p) => p.urgente);
}

function renderListaStock() {
  const contenedor = document.getElementById('listaStock');
  const busqueda = document.getElementById('buscarStock')?.value.trim().toLowerCase() || '';

  const pedidos = getSolicitudes()
    .filter(esPedidoStockActivo)
    .filter((s) => {
      if (!busqueda) return true;
      return (
        s.numero.includes(busqueda)
        || s.nombreSolicitante.toLowerCase().includes(busqueda)
        || labelSector(s.sector).toLowerCase().includes(busqueda)
      );
    })
    .sort((a, b) => (stockTieneItemsUrgentes(b) ? 1 : 0) - (stockTieneItemsUrgentes(a) ? 1 : 0));

  if (pedidos.length === 0) {
    contenedor.innerHTML = '<p class="sin-datos">No hay pedidos COMPRA STOCK pendientes de gestión.</p>';
    return;
  }

  const hayUrgentes = pedidos.some(stockTieneItemsUrgentes);

  contenedor.innerHTML = `
    ${hayUrgentes ? '<p class="aviso-lista-urgente"><span class="alerta-urgente-icon">!</span> Hay pedidos <strong>COMPRA STOCK</strong> con ítems <strong>URGENTES</strong> pendientes de gestión.</p>' : ''}
    ${pedidos.map((s) => {
      const urgente = stockTieneItemsUrgentes(s);
      return `
      <article class="tarjeta-solicitud estado-autorizado ${urgente ? 'pedido-con-urgente' : ''}">
        <div class="tarjeta-header">
          <span class="tarjeta-numero">Pedido COMPRA STOCK Nº ${escapeHtml(s.numero)}</span>
          <span class="tarjeta-badges">
            ${urgente ? '<span class="alerta-urgente" title="Contiene ítems urgentes"><span class="alerta-urgente-icon">!</span> URGENTE</span>' : ''}
            <span class="badge badge-stock">COMPRA STOCK</span>
          </span>
        </div>
        <div class="tarjeta-body">
          <p><strong>Fecha:</strong> ${formatFecha(s.fecha)}</p>
          <p><strong>Sector:</strong> ${escapeHtml(labelSector(s.sector))}</p>
          <p><strong>Solicitante:</strong> ${escapeHtml(s.nombreSolicitante)}</p>
          <p><strong>Productos:</strong> ${productosValidos(s).length} ítem(s)</p>
        </div>
        <div class="tarjeta-acciones">
          <button type="button" class="btn-ver" data-id="${s.id}">Ver</button>
          <button type="button" class="btn-tabla-editar" data-id="${s.id}">Editar pedido</button>
          <button type="button" class="btn-gestionar" data-id="${s.id}">Cerrar pedido</button>
        </div>
      </article>
      `;
    }).join('')}
  `;

  contenedor.querySelectorAll('.btn-ver').forEach((btn) => {
    btn.addEventListener('click', () => abrirDetalleStock(btn.dataset.id));
  });
  contenedor.querySelectorAll('.btn-tabla-editar').forEach((btn) => {
    btn.addEventListener('click', () => abrirEditarStock(btn.dataset.id));
  });
  contenedor.querySelectorAll('.btn-gestionar').forEach((btn) => {
    btn.addEventListener('click', () => abrirCerrarStock(btn.dataset.id));
  });
}

function abrirDetalleStock(id) {
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

  document.getElementById('detalleContenido').innerHTML = `
    <h2>Pedido COMPRA STOCK Nº ${escapeHtml(s.numero)}${stockTieneItemsUrgentes(s) ? ' <span class="urgente-tag">URGENTE</span>' : ''}</h2>
    <div class="detalle-grid">
      <p><strong>Fecha:</strong> ${formatFecha(s.fecha)}</p>
      <p><strong>Sector:</strong> ${escapeHtml(labelSector(s.sector))}</p>
      <p><strong>Solicitante:</strong> ${escapeHtml(s.nombreSolicitante)}</p>
      <p><strong>Jefe sector:</strong> ${escapeHtml(s.jefeSector)}</p>
    </div>
    <table class="detalle-tabla">
      <thead><tr><th>CÓD.</th><th>CANT.</th><th>DESCRIPCIÓN</th><th>REF.</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <p><strong>Justificación:</strong> ${escapeHtml(s.justificacionPedido)}</p>
  `;
  document.getElementById('modalDetalle').classList.add('activo');
}

function abrirEditarStock(id) {
  pedidoEditando = id;
  const s = getSolicitudById(id);
  if (!s) return;

  document.getElementById('editTitulo').textContent = `Editar pedido COMPRA STOCK Nº ${s.numero}`;

  const selectSector = document.getElementById('editSector');
  poblarSelectSectores(selectSector, s.sector);

  document.getElementById('editSolicitante').value = s.nombreSolicitante;
  document.getElementById('editJefeSector').value = s.jefeSector;
  document.getElementById('editJustificacion').value = s.justificacionPedido;

  const tbody = document.getElementById('editProductosBody');
  tbody.innerHTML = '';
  productosValidos(s).forEach((p) => agregarFilaEdicion(p));
  if (!tbody.children.length) agregarFilaEdicion();

  document.getElementById('modalEditar').classList.add('activo');
}

function agregarFilaEdicion(p = {}) {
  const tbody = document.getElementById('editProductosBody');
  const tr = document.createElement('tr');
  tr.dataset.urgente = p.urgente ? '1' : '0';
  tr.innerHTML = `
    <td><input type="text" class="edit-codigo" value="${escapeHtml(p.codigo || '')}"></td>
    <td><input type="number" class="edit-cantidad" min="1" value="${p.cantidad || 1}"></td>
    <td><input type="text" class="edit-descripcion" value="${escapeHtml(p.descripcion || '')}"></td>
    <td><input type="text" class="edit-ref" value="${escapeHtml(p.ref || '')}"></td>
    <td><button type="button" class="btn-eliminar-fila">&times;</button></td>
  `;
  tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => {
    if (tbody.children.length > 1) tr.remove();
  });
  tbody.appendChild(tr);
}

function guardarEdicionStock() {
  if (!pedidoEditando) return;

  const productos = [];
  document.querySelectorAll('#editProductosBody tr').forEach((tr) => {
    const descripcion = tr.querySelector('.edit-descripcion').value.trim();
    if (!descripcion) return;
    productos.push({
      codigo: tr.querySelector('.edit-codigo').value.trim(),
      cantidad: parseInt(tr.querySelector('.edit-cantidad').value, 10) || 1,
      descripcion,
      urgente: tr.dataset.urgente === '1',
      adjuntos: [],
      ref: tr.querySelector('.edit-ref').value.trim(),
    });
  });

  if (!productos.length) {
    alert('Debe haber al menos un producto con descripción.');
    return;
  }

  updateSolicitud(pedidoEditando, {
    sector: document.getElementById('editSector').value,
    nombreSolicitante: document.getElementById('editSolicitante').value.trim(),
    jefeSector: document.getElementById('editJefeSector').value.trim(),
    justificacionPedido: document.getElementById('editJustificacion').value.trim(),
    productos,
  });

  cerrarModal('modalEditar');
  pedidoEditando = null;
  renderListaStock();
  mostrarToast('Pedido COMPRA STOCK actualizado');
}

function abrirCerrarStock(id) {
  pedidoEditando = id;
  const s = getSolicitudById(id);
  if (!s) return;

  document.getElementById('cerrarTitulo').textContent = `Cerrar pedido COMPRA STOCK Nº ${s.numero}`;
  document.getElementById('stockNumeroOC').value = s.numeroOrdenCompra || '';
  document.getElementById('stockObservaciones').value = s.observacionesCompras || '';
  document.getElementById('previewAdjuntoStock').innerHTML = '';
  document.getElementById('inputAdjuntoStock').value = '';
  document.getElementById('modalCerrarStock').classList.add('activo');
}

async function confirmarCerrarStock() {
  if (!pedidoEditando) return;

  const numeroOC = document.getElementById('stockNumeroOC').value.trim();
  if (!numeroOC) {
    alert('Ingrese el número de Orden de Compra o referencia.');
    return;
  }

  const cambios = {
    numeroOrdenCompra: numeroOC,
    observacionesCompras: document.getElementById('stockObservaciones').value.trim(),
    estado: 'finalizado',
    fechaFinalizacion: new Date().toLocaleString('es-AR'),
  };

  const input = document.getElementById('inputAdjuntoStock');
  if (input.files.length > 0) {
    const adjunto = await procesarArchivoUnico(input.files[0], true);
    if (adjunto) cambios.adjuntoOrdenCompra = adjunto;
  }

  const idCerrado = pedidoEditando;
  updateSolicitud(pedidoEditando, cambios);
  cerrarModal('modalCerrarStock');
  const oc = numeroOC;
  const solicitud = getSolicitudById(idCerrado);
  pedidoEditando = null;
  renderListaStock();

  const resultado = await notificarSectorPedidoProcesado(solicitud, oc);
  if (resultado.ok) {
    mostrarToast(resultado.mensaje || 'Notificación enviada al sector por correo electrónico');
  } else if (resultado.error) {
    mostrarToast(`Pedido cerrado. ${resultado.error}`);
  }
  mostrarNotificacionPedidoFinalizado(oc);
}

function initModalesStock() {
  document.getElementById('buscarStock').addEventListener('input', renderListaStock);
  document.getElementById('btnAgregarFilaEdit').addEventListener('click', () => agregarFilaEdicion());
  document.getElementById('btnGuardarEdicion').addEventListener('click', guardarEdicionStock);
  document.getElementById('btnConfirmarCerrarStock').addEventListener('click', confirmarCerrarStock);
  document.getElementById('btnAdjuntarStock').addEventListener('click', () => {
    document.getElementById('inputAdjuntoStock').click();
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
