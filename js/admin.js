/**
 * Backend administrativo — Sectores y Tipos de Compra
 */

let editandoSectorId = null;
let editandoTipoId = null;

document.addEventListener('DOMContentLoaded', () => {
  renderNav('admin');
  initFormularios();
  initOrdenadoresEmail();
  renderTablas();
});

function initFormularios() {
  document.getElementById('formSector').addEventListener('submit', (e) => {
    e.preventDefault();
    guardarSector();
  });

  document.getElementById('formTipoCompra').addEventListener('submit', (e) => {
    e.preventDefault();
    guardarTipoCompra();
  });

  document.getElementById('btnCancelarSector').addEventListener('click', resetFormSector);
  document.getElementById('btnCancelarTipo').addEventListener('click', resetFormTipo);
}

function renderTablas() {
  renderTablaSectores();
  renderTablaTipos();
}

function renderTablaSectores() {
  const tbody = document.getElementById('tablaSectoresBody');
  const sectores = getSectores();

  if (!sectores.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="sin-datos">Sin sectores registrados</td></tr>';
    return;
  }

  tbody.innerHTML = sectores.map((s) => `
    <tr>
      <td>${escapeHtml(s.nombre)}</td>
      <td><code>${escapeHtml(s.codigo)}</code></td>
      <td>${s.orden}</td>
      <td><span class="badge ${s.activo ? 'badge-autorizado' : 'badge-rechazado'}">${s.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td class="celda-acciones">
        <button type="button" class="btn-tabla-editar" data-id="${s.id}">Editar</button>
        <button type="button" class="btn-tabla-borrar" data-id="${s.id}">Borrar</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.btn-tabla-editar').forEach((btn) => {
    btn.addEventListener('click', () => editarSector(btn.dataset.id));
  });
  tbody.querySelectorAll('.btn-tabla-borrar').forEach((btn) => {
    btn.addEventListener('click', () => borrarSector(btn.dataset.id));
  });
}

function renderTablaTipos() {
  const tbody = document.getElementById('tablaTiposBody');
  const tipos = getTiposCompra();

  if (!tipos.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="sin-datos">Sin tipos registrados</td></tr>';
    return;
  }

  tbody.innerHTML = tipos.map((t) => `
    <tr>
      <td>${escapeHtml(t.nombre)}</td>
      <td><code>${escapeHtml(t.codigo)}</code></td>
      <td>${t.esUrgente ? 'Sí' : 'No'}</td>
      <td>${t.esStock ? 'Sí' : 'No'}</td>
      <td>${t.orden}</td>
      <td><span class="badge ${t.activo ? 'badge-autorizado' : 'badge-rechazado'}">${t.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td class="celda-acciones">
        <button type="button" class="btn-tabla-editar" data-id="${t.id}">Editar</button>
        <button type="button" class="btn-tabla-borrar" data-id="${t.id}">Borrar</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.btn-tabla-editar').forEach((btn) => {
    btn.addEventListener('click', () => editarTipoCompra(btn.dataset.id));
  });
  tbody.querySelectorAll('.btn-tabla-borrar').forEach((btn) => {
    btn.addEventListener('click', () => borrarTipoCompra(btn.dataset.id));
  });
}

function guardarSector() {
  const nombre = document.getElementById('sectorNombre').value.trim();
  const codigo = document.getElementById('sectorCodigo').value.trim();
  const activo = document.getElementById('sectorActivo').checked;
  const orden = parseInt(document.getElementById('sectorOrden').value, 10) || 1;

  if (!nombre) {
    alert('Ingrese el nombre del sector.');
    return;
  }

  const data = { nombre, codigo, activo, orden };
  const result = editandoSectorId
    ? updateSector(editandoSectorId, data)
    : addSector(data);

  if (result.error) {
    alert(result.error);
    return;
  }

  mostrarToast(editandoSectorId ? 'Sector actualizado' : 'Sector agregado');
  resetFormSector();
  renderTablaSectores();
}

function guardarTipoCompra() {
  const nombre = document.getElementById('tipoNombre').value.trim();
  const codigo = document.getElementById('tipoCodigo').value.trim();
  const activo = document.getElementById('tipoActivo').checked;
  const esUrgente = document.getElementById('tipoEsUrgente').checked;
  const esStock = document.getElementById('tipoEsStock').checked;
  const orden = parseInt(document.getElementById('tipoOrden').value, 10) || 1;

  if (!nombre) {
    alert('Ingrese el nombre del tipo de pedido.');
    return;
  }

  const data = { nombre, codigo, activo, esUrgente, esStock, orden };
  const result = editandoTipoId
    ? updateTipoCompra(editandoTipoId, data)
    : addTipoCompra(data);

  if (result.error) {
    alert(result.error);
    return;
  }

  mostrarToast(editandoTipoId ? 'Tipo actualizado' : 'Tipo agregado');
  resetFormTipo();
  renderTablaTipos();
}

function editarSector(id) {
  const s = getSectorById(id);
  if (!s) return;
  editandoSectorId = id;
  document.getElementById('sectorNombre').value = s.nombre;
  document.getElementById('sectorCodigo').value = s.codigo;
  document.getElementById('sectorOrden').value = s.orden;
  document.getElementById('sectorActivo').checked = s.activo;
  document.getElementById('tituloFormSector').textContent = 'Editar sector';
  document.getElementById('btnGuardarSector').textContent = 'Actualizar';
  document.getElementById('btnCancelarSector').hidden = false;
}

function editarTipoCompra(id) {
  const t = getTipoCompraById(id);
  if (!t) return;
  editandoTipoId = id;
  document.getElementById('tipoNombre').value = t.nombre;
  document.getElementById('tipoCodigo').value = t.codigo;
  document.getElementById('tipoOrden').value = t.orden;
  document.getElementById('tipoActivo').checked = t.activo;
  document.getElementById('tipoEsUrgente').checked = t.esUrgente;
  document.getElementById('tipoEsStock').checked = t.esStock;
  document.getElementById('tituloFormTipo').textContent = 'Editar tipo de pedido';
  document.getElementById('btnGuardarTipo').textContent = 'Actualizar';
  document.getElementById('btnCancelarTipo').hidden = false;
}

function borrarSector(id) {
  const s = getSectorById(id);
  if (!s) return;
  if (!confirm(`¿Eliminar el sector "${s.nombre}"?`)) return;
  const result = deleteSector(id);
  if (result.error) {
    alert(result.error);
    return;
  }
  mostrarToast('Sector eliminado');
  if (editandoSectorId === id) resetFormSector();
  renderTablaSectores();
}

function borrarTipoCompra(id) {
  const t = getTipoCompraById(id);
  if (!t) return;
  if (!confirm(`¿Eliminar el tipo "${t.nombre}"?`)) return;
  const result = deleteTipoCompra(id);
  if (result.error) {
    alert(result.error);
    return;
  }
  mostrarToast('Tipo eliminado');
  if (editandoTipoId === id) resetFormTipo();
  renderTablaTipos();
}

function resetFormSector() {
  editandoSectorId = null;
  document.getElementById('formSector').reset();
  document.getElementById('sectorActivo').checked = true;
  document.getElementById('sectorOrden').value = getSectores().length + 1;
  document.getElementById('tituloFormSector').textContent = 'Agregar sector';
  document.getElementById('btnGuardarSector').textContent = 'Agregar';
  document.getElementById('btnCancelarSector').hidden = true;
}

function resetFormTipo() {
  editandoTipoId = null;
  document.getElementById('formTipoCompra').reset();
  document.getElementById('tipoActivo').checked = true;
  document.getElementById('tipoOrden').value = getTiposCompra().length + 1;
  document.getElementById('tituloFormTipo').textContent = 'Agregar tipo de pedido';
  document.getElementById('btnGuardarTipo').textContent = 'Agregar';
  document.getElementById('btnCancelarTipo').hidden = true;
}

function initOrdenadoresEmail() {
  const emails = getOrdenadoresEmails();
  document.getElementById('emailGerencia').value = emails.gerencia || '';
  document.getElementById('emailDireccionTecnica').value = emails.direccion_tecnica || '';
  document.getElementById('emailConsejo').value = emails.consejo_directivo || '';
  document.getElementById('apiNotificaciones').value = getApiNotificacionesUrl();

  document.getElementById('formOrdenadoresEmail').addEventListener('submit', (e) => {
    e.preventDefault();
    saveOrdenadoresEmails({
      gerencia: document.getElementById('emailGerencia').value.trim(),
      direccion_tecnica: document.getElementById('emailDireccionTecnica').value.trim(),
      consejo_directivo: document.getElementById('emailConsejo').value.trim(),
    });
    saveApiNotificacionesUrl(document.getElementById('apiNotificaciones').value.trim());
    mostrarToast('Correos de ordenadores guardados');
  });
}
