/**
 * Solicitud de Pedidos — lógica principal
 */

document.addEventListener('DOMContentLoaded', () => {
  renderNav('index');
  initCatalogosFormulario();
  initCabecera();
  initTablaProductos();
  initTipoCompra();
  initFormulario();
  initAccionesDocumento();
  actualizarJustificacionUrgente();
  actualizarBloqueOrdenador();
});

function initCatalogosFormulario() {
  poblarSelectSectores(document.getElementById('sector'));
  poblarSelectTiposCompra(document.getElementById('tipoCompra'));
}

function initCabecera() {
  document.getElementById('numero').value = String(getCorrelativo() + 1).padStart(5, '0');
  document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
}

function initTablaProductos() {
  document.getElementById('btnAgregarFila').addEventListener('click', () => agregarFila());
  agregarFila({ codigo: '18885', cantidad: 5, descripcion: 'Lámpara led 12W', urgente: true, ref: 'OC 11111' });
  agregarFila({ cantidad: 2, descripcion: 'Caja organizadora 36 litros' });
}

function agregarFila(datos = {}) {
  const tbody = document.getElementById('productosBody');
  const tr = document.createElement('tr');

  const tdCod = document.createElement('td');
  tdCod.innerHTML = `<input type="text" class="input-codigo" value="${escapeHtml(datos.codigo || '')}">`;

  const tdCant = document.createElement('td');
  tdCant.innerHTML = `<input type="number" class="input-cantidad" min="1" value="${datos.cantidad || 1}" required>`;

  const tdDesc = document.createElement('td');
  tdDesc.innerHTML = `<input type="text" class="input-descripcion" value="${escapeHtml(datos.descripcion || '')}" required>`;

  const tdUrg = document.createElement('td');
  tdUrg.className = 'icon-urgente-cell';
  tdUrg.innerHTML = `<button type="button" class="btn-urgente ${datos.urgente ? 'activo' : ''}" title="Marcar como urgente">!</button>`;

  const tdObs = crearCeldaObs(tr, datos.adjuntos || []);

  const tdRef = document.createElement('td');
  tdRef.innerHTML = `<input type="text" class="input-ref" placeholder="-" value="${escapeHtml(datos.ref || '')}">`;

  const tdAcc = document.createElement('td');
  tdAcc.innerHTML = `<button type="button" class="btn-eliminar-fila" title="Eliminar fila">&times;</button>`;

  tr.append(tdCod, tdCant, tdDesc, tdUrg, tdObs, tdRef, tdAcc);

  tr.querySelector('.btn-urgente').addEventListener('click', (e) => {
    e.currentTarget.classList.toggle('activo');
    actualizarJustificacionUrgente();
  });

  tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => {
    if (tbody.children.length > 1) {
      tr.remove();
      actualizarJustificacionUrgente();
    }
  });

  tbody.appendChild(tr);
}

function obtenerFilasProductos() {
  const filas = [];
  document.querySelectorAll('#productosBody tr').forEach((tr) => {
    filas.push({
      codigo: tr.querySelector('.input-codigo').value.trim(),
      cantidad: parseInt(tr.querySelector('.input-cantidad').value, 10),
      descripcion: tr.querySelector('.input-descripcion').value.trim(),
      urgente: tr.querySelector('.btn-urgente').classList.contains('activo'),
      adjuntos: obtenerAdjuntosFila(tr),
      ref: tr.querySelector('.input-ref').value.trim(),
    });
  });
  return filas;
}

function hayItemsUrgentes() {
  return document.querySelectorAll('#productosBody .btn-urgente.activo').length > 0;
}

function initTipoCompra() {
  document.getElementById('tipoCompra').addEventListener('change', () => {
    actualizarJustificacionUrgente();
    actualizarBloqueOrdenador();
  });
}

function actualizarBloqueOrdenador() {
  const bloque = document.getElementById('bloqueOrdenador');
  const hint = document.getElementById('hintOrdenador');
  const contenedor = document.querySelector('.ordenador-options');
  const tipoCodigo = document.getElementById('tipoCompra').value;
  const esStock = tipoCompraEsStock(tipoCodigo);
  const ordenadorFijo = getOrdenadorFijoPorTipo(tipoCodigo);
  const seleccionPrevio = document.querySelector('input[name="ordenador"]:checked')?.value;

  bloque.hidden = esStock;
  const aviso = document.getElementById('avisoStock');
  if (aviso) aviso.hidden = !esStock;

  if (!contenedor) return;

  if (esStock) {
    contenedor.innerHTML = '';
  } else if (ordenadorFijo) {
    const etiqueta = ordenadorFijo === 'consejo_directivo'
      ? 'Consejo'
      : labelOrdenador(ordenadorFijo);
    contenedor.innerHTML = `
      <label data-ordenador="${ordenadorFijo}">
        <input type="radio" name="ordenador" value="${ordenadorFijo}" checked>
        <span class="ordenador-texto">${escapeHtml(etiqueta)}</span>
      </label>`;
  } else {
    contenedor.innerHTML = Object.entries(ORDENADORES).map(([valor, info]) => `
      <label data-ordenador="${valor}">
        <input type="radio" name="ordenador" value="${valor}"${seleccionPrevio === valor ? ' checked' : ''}>
        <span class="ordenador-texto">${escapeHtml(info.label)}</span>
      </label>`).join('');
  }

  if (hint) {
    if (esStock) {
      hint.textContent = 'Los pedidos COMPRA STOCK no requieren autorización del ordenador';
    } else if (ordenadorFijo === 'consejo_directivo') {
      hint.textContent = 'Este tipo de pedido requiere autorización del Consejo Directivo';
    } else {
      hint.textContent = 'Al enviar, la solicitud irá al panel de autorización del ordenador seleccionado';
    }
  }
}

function actualizarJustificacionUrgente() {
  const textarea = document.getElementById('justificacionUrgente');
  const asterisco = document.getElementById('asteriscoJustificacionUrgente');
  const obligatorio = requiereJustificacionUrgente();

  textarea.required = obligatorio;
  if (asterisco) asterisco.hidden = !obligatorio;

  if (esPedidoUrgente()) {
    textarea.placeholder = 'Obligatorio: justifique el motivo del pedido urgente';
  } else if (hayItemsUrgentes()) {
    textarea.placeholder = 'Obligatorio: justifique los ítems marcados como urgentes';
  } else {
    textarea.placeholder = 'Completar solo si hay ítems marcados como urgentes';
  }
}

function initFormulario() {
  document.getElementById('solicitudForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarErrores();
    if (!validarFormulario()) return;

    const btnEnviar = e.submitter || document.querySelector('.btn-enviar[type="submit"]');
    const textoOriginal = btnEnviar?.textContent;
    if (btnEnviar) {
      btnEnviar.disabled = true;
      btnEnviar.textContent = 'ENVIANDO...';
    }

    const datos = recopilarDatos();
    datos.id = `SC-${Date.now()}`;
    datos.fechaEnvio = new Date().toISOString();
    datos.numeroOrdenCompra = '';
    datos.observacionesCompras = '';
    datos.adjuntoOrdenCompra = null;

    if (tipoCompraEsStock(datos.tipoCompra)) {
      datos.estado = 'autorizado';
      datos.autorizado = true;
      datos.ordenador = null;
      datos.nombreOrdenador = 'No requerido — Pedido STOCK';
      datos.fechaAutorizacion = new Date().toLocaleString('es-AR');
      saveSolicitud(datos);
      setCorrelativo(parseInt(datos.numero, 10));
      window.location.href = 'pedidos-stock.html';
      return;
    }

    datos.estado = 'pendiente';
    datos.autorizado = null;
    const ordenador = datos.ordenador;
    saveSolicitud(datos);
    setCorrelativo(parseInt(datos.numero, 10));

    const notificacion = await notificarOrdenadorPendiente(datos);
    sessionStorage.setItem('flash_notificacion', JSON.stringify(notificacion));

    if (btnEnviar) {
      btnEnviar.disabled = false;
      btnEnviar.textContent = textoOriginal;
    }

    window.location.href = getUrlPanelAutorizacion(ordenador);
  });
}

function initAccionesDocumento() {
  document.getElementById('btnImprimir').addEventListener('click', () => {
    if (!validarFormularioBasico()) return;
    imprimirSolicitud(recopilarDatos());
  });

  document.getElementById('btnExportarPdf').addEventListener('click', async () => {
    if (!validarFormularioBasico()) return;
    await exportarSolicitudPdf(recopilarDatos());
  });
}

function validarFormularioBasico() {
  if (obtenerFilasProductos().filter((f) => f.descripcion).length === 0) {
    alert('Ingrese al menos un producto con descripción para imprimir/exportar.');
    return false;
  }
  return true;
}

function recopilarDatos() {
  const form = document.getElementById('solicitudForm');
  const formData = new FormData(form);
  const tipoCompra = formData.get('tipoCompra');
  const ordenadorFijo = getOrdenadorFijoPorTipo(tipoCompra);
  return {
    numero: formData.get('numero'),
    fecha: formData.get('fecha'),
    sector: formData.get('sector'),
    tipoCompra,
    ordenador: ordenadorFijo || formData.get('ordenador'),
    productos: obtenerFilasProductos(),
    justificacionUrgente: formData.get('justificacionUrgente'),
    justificacionPedido: formData.get('justificacionPedido'),
    nombreSolicitante: formData.get('nombreSolicitante'),
    jefeSector: formData.get('jefeSector'),
    autorizado: null,
  };
}

function validarFormulario() {
  let valido = true;

  ['justificacionPedido', 'nombreSolicitante', 'jefeSector'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      marcarError(el, 'Campo obligatorio');
      valido = false;
    }
  });

  const esStock = tipoCompraEsStock(document.getElementById('tipoCompra').value);
  if (!esStock && !document.querySelector('input[name="ordenador"]:checked')) {
    mostrarErrorEn(document.querySelector('.ordenador-fieldset'), 'Seleccione un ordenador');
    valido = false;
  }

  if (obtenerFilasProductos().filter((f) => f.descripcion).length === 0) {
    alert('Debe ingresar al menos un producto con descripción.');
    valido = false;
  }

  if (requiereJustificacionUrgente()) {
    const justUrg = document.getElementById('justificacionUrgente');
    if (!justUrg.value.trim()) {
      const msg = esPedidoUrgente()
        ? 'Justifique el motivo del pedido urgente'
        : 'Justifique los ítems urgentes';
      marcarError(justUrg, msg);
      valido = false;
    }
  }

  return valido;
}

function marcarError(elemento, mensaje) {
  elemento.classList.add('campo-error');
  const span = document.createElement('span');
  span.className = 'mensaje-error';
  span.textContent = mensaje;
  elemento.parentElement.appendChild(span);
}

function mostrarErrorEn(contenedor, mensaje) {
  const span = document.createElement('span');
  span.className = 'mensaje-error';
  span.textContent = mensaje;
  contenedor.appendChild(span);
}

function limpiarErrores() {
  document.querySelectorAll('.campo-error').forEach((el) => el.classList.remove('campo-error'));
  document.querySelectorAll('.mensaje-error').forEach((el) => el.remove());
}
