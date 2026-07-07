/**
 * Persistencia de solicitudes en localStorage
 */

const STORAGE_KEY = 'solicitud_compra_correlativo';
const SOLICITUDES_KEY = 'solicitudes_compra';

const ORDENADORES = {
  gerencia: { label: 'Gerencia', slug: 'gerencia' },
  direccion_tecnica: { label: 'Dirección Técnica', slug: 'direccion-tecnica' },
  consejo_directivo: { label: 'Consejo Directivo', slug: 'consejo-directivo' },
};

const ORDENADORES_EMAILS_KEY = 'config_ordenadores_email';
const API_NOTIFICACIONES_KEY = 'config_api_notificaciones';
const API_NOTIFICACIONES_DEFAULT = 'http://127.0.0.1:3001/api/notificar-ordenador';
const ORDENADORES_CONFIG_VERSION_KEY = 'config_ordenadores_version';
const ORDENADORES_CONFIG_VERSION = 1;

const ORDENADORES_EMAILS_DEFAULT = {
  gerencia: 'mauripereda@gmail.com',
  direccion_tecnica: 'mauripereda@gmail.com',
  consejo_directivo: 'mauripereda@gmail.com',
};

function getCorrelativo() {
  return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
}

function setCorrelativo(numero) {
  localStorage.setItem(STORAGE_KEY, String(numero));
}

function getSolicitudes() {
  try {
    return JSON.parse(localStorage.getItem(SOLICITUDES_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSolicitud(solicitud) {
  const lista = getSolicitudes();
  lista.unshift(solicitud);
  localStorage.setItem(SOLICITUDES_KEY, JSON.stringify(lista));
}

function updateSolicitud(id, cambios) {
  const lista = getSolicitudes();
  const idx = lista.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  lista[idx] = { ...lista[idx], ...cambios };
  localStorage.setItem(SOLICITUDES_KEY, JSON.stringify(lista));
  return lista[idx];
}

function getSolicitudById(id) {
  return getSolicitudes().find((s) => s.id === id) || null;
}

function getUrlPanelAutorizacion(ordenador) {
  const info = ORDENADORES[ordenador];
  if (!info) return 'autorizacion.html';
  return `autorizacion.html?ordenador=${ordenador}`;
}

function getOrdenadorFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const ordenador = params.get('ordenador');
  return ORDENADORES[ordenador] ? ordenador : null;
}

function formatFecha(isoDate) {
  if (!isoDate) return '';
  if (isoDate.includes('/')) return isoDate;
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function labelOrdenador(valor) {
  return ORDENADORES[valor]?.label || valor || '—';
}

function initOrdenadoresConfig() {
  const version = parseInt(localStorage.getItem(ORDENADORES_CONFIG_VERSION_KEY) || '0', 10);

  if (version < ORDENADORES_CONFIG_VERSION) {
    saveOrdenadoresEmails(ORDENADORES_EMAILS_DEFAULT);
    saveApiNotificacionesUrl(API_NOTIFICACIONES_DEFAULT);
    localStorage.setItem(ORDENADORES_CONFIG_VERSION_KEY, String(ORDENADORES_CONFIG_VERSION));
    return;
  }

  if (!localStorage.getItem(ORDENADORES_EMAILS_KEY)) {
    localStorage.setItem(ORDENADORES_EMAILS_KEY, JSON.stringify(ORDENADORES_EMAILS_DEFAULT));
  }
  if (!localStorage.getItem(API_NOTIFICACIONES_KEY)) {
    localStorage.setItem(API_NOTIFICACIONES_KEY, API_NOTIFICACIONES_DEFAULT);
  }
}

function getOrdenadoresEmails() {
  try {
    return { ...ORDENADORES_EMAILS_DEFAULT, ...JSON.parse(localStorage.getItem(ORDENADORES_EMAILS_KEY) || '{}') };
  } catch {
    return { ...ORDENADORES_EMAILS_DEFAULT };
  }
}

function saveOrdenadoresEmails(emails) {
  localStorage.setItem(ORDENADORES_EMAILS_KEY, JSON.stringify({ ...ORDENADORES_EMAILS_DEFAULT, ...emails }));
}

function getEmailOrdenador(ordenador) {
  return (getOrdenadoresEmails()[ordenador] || '').trim();
}

function getApiNotificacionesUrl() {
  return (localStorage.getItem(API_NOTIFICACIONES_KEY) || API_NOTIFICACIONES_DEFAULT).trim();
}

function saveApiNotificacionesUrl(url) {
  localStorage.setItem(API_NOTIFICACIONES_KEY, url.trim() || API_NOTIFICACIONES_DEFAULT);
}

function getUrlAbsolutaPanelAutorizacion(ordenador) {
  return new URL(getUrlPanelAutorizacion(ordenador), window.location.href).href;
}

function estadoLabel(estado) {
  const map = {
    pendiente: 'Pendiente',
    autorizado: 'Autorizado',
    rechazado: 'Rechazado',
    finalizado: 'Pedido finalizado',
  };
  return map[estado] || estado;
}

function deleteSolicitud(id) {
  const lista = getSolicitudes().filter((s) => s.id !== id);
  localStorage.setItem(SOLICITUDES_KEY, JSON.stringify(lista));
}

const LOGO_CASMER_PATH = 'assets/logo-casmer.png';

function urlLogoCasmer() {
  return new URL(LOGO_CASMER_PATH, window.location.href).href;
}

function escapeHtml(texto) {
  if (!texto) return '';
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

/* ── Catálogos administrables ── */

const SECTORES_KEY = 'catalogo_sectores';
const TIPOS_COMPRA_KEY = 'catalogo_tipos_compra';
const TIPOS_CATALOGO_VERSION_KEY = 'catalogo_tipos_version';
const TIPOS_CATALOGO_VERSION = 3;

const TIPOS_COMPRA_DEFAULT = [
  { id: 'tipo-compra-especial', nombre: 'COMPRA ESPECIAL', codigo: 'COMPRA_ESPECIAL', activo: true, esUrgente: false, esStock: false, orden: 1 },
  { id: 'tipo-compra-stock', nombre: 'COMPRA STOCK', codigo: 'COMPRA_STOCK', activo: true, esUrgente: false, esStock: true, orden: 2 },
  { id: 'tipo-compra-resol', nombre: 'COMPRA C/RESOL C.DIRECTIVO', codigo: 'COMPRA_RESOL_CD', activo: true, esUrgente: false, esStock: false, ordenadorFijo: 'consejo_directivo', orden: 3 },
  { id: 'tipo-servicios', nombre: 'SERVICIOS CONTRATADOS', codigo: 'SERVICIOS_CONTRATADOS', activo: true, esUrgente: false, esStock: false, orden: 4 },
];

const MIGRACION_TIPOS_PEDIDO = {
  ESPECIAL: 'COMPRA_ESPECIAL',
  NORMAL: 'COMPRA_ESPECIAL',
  URGENTE: 'COMPRA_ESPECIAL',
  STOCK: 'COMPRA_STOCK',
};

function migrarTiposEnSolicitudes() {
  const lista = getSolicitudes();
  let cambio = false;
  const actualizada = lista.map((s) => {
    const nuevo = MIGRACION_TIPOS_PEDIDO[s.tipoCompra];
    if (nuevo && nuevo !== s.tipoCompra) {
      cambio = true;
      return { ...s, tipoCompra: nuevo };
    }
    return s;
  });
  if (cambio) {
    localStorage.setItem(SOLICITUDES_KEY, JSON.stringify(actualizada));
  }
}

function sincronizarCatalogoTipos() {
  initCatalogos();
  const version = parseInt(localStorage.getItem(TIPOS_CATALOGO_VERSION_KEY) || '0', 10);

  if (version < TIPOS_CATALOGO_VERSION) {
    let lista = version < 2
      ? TIPOS_COMPRA_DEFAULT.map((t) => ({ ...t }))
      : getCatalogo(TIPOS_COMPRA_KEY, TIPOS_COMPRA_DEFAULT);

    const codigosRequeridos = TIPOS_COMPRA_DEFAULT.map((t) => t.codigo);
    codigosRequeridos.forEach((codigo) => {
      if (!lista.some((t) => t.codigo === codigo)) {
        lista.push({ ...TIPOS_COMPRA_DEFAULT.find((t) => t.codigo === codigo) });
      }
    });

    lista = lista
      .filter((t) => !['NORMAL', 'URGENTE', 'ESPECIAL', 'STOCK'].includes(t.codigo))
      .map((t) => {
        const defecto = TIPOS_COMPRA_DEFAULT.find((d) => d.codigo === t.codigo);
        return defecto
          ? { ...defecto, ...t, esStock: defecto.esStock, esUrgente: defecto.esUrgente, ordenadorFijo: defecto.ordenadorFijo ?? t.ordenadorFijo }
          : t;
      });

    saveCatalogo(TIPOS_COMPRA_KEY, lista);
    if (version < 2) migrarTiposEnSolicitudes();
    localStorage.setItem(TIPOS_CATALOGO_VERSION_KEY, String(TIPOS_CATALOGO_VERSION));
    return;
  }

  let lista = getCatalogo(TIPOS_COMPRA_KEY, TIPOS_COMPRA_DEFAULT);
  const codigosRequeridos = TIPOS_COMPRA_DEFAULT.map((t) => t.codigo);
  let cambio = false;

  codigosRequeridos.forEach((codigo) => {
    if (!lista.some((t) => t.codigo === codigo)) {
      lista.push({ ...TIPOS_COMPRA_DEFAULT.find((t) => t.codigo === codigo) });
      cambio = true;
    }
  });

  const obsoletos = ['NORMAL', 'URGENTE', 'ESPECIAL', 'STOCK'];
  const nuevaLista = lista
    .filter((t) => !obsoletos.includes(t.codigo))
    .map((t) => {
      const defecto = TIPOS_COMPRA_DEFAULT.find((d) => d.codigo === t.codigo);
      return defecto ? { ...defecto, ...t, esStock: defecto.esStock, esUrgente: defecto.esUrgente, ordenadorFijo: defecto.ordenadorFijo ?? t.ordenadorFijo } : t;
    });

  if (cambio || nuevaLista.length !== lista.length || JSON.stringify(nuevaLista) !== JSON.stringify(lista)) {
    saveCatalogo(TIPOS_COMPRA_KEY, nuevaLista);
  }
}

const SECTORES_DEFAULT = [
  { id: 'sec-compras', nombre: 'COMPRAS', codigo: 'COMPRAS', activo: true, orden: 1 },
  { id: 'sec-admin', nombre: 'ADMINISTRACIÓN', codigo: 'ADMINISTRACION', activo: true, orden: 2 },
  { id: 'sec-mant', nombre: 'MANTENIMIENTO', codigo: 'MANTENIMIENTO', activo: true, orden: 3 },
  { id: 'sec-prod', nombre: 'PRODUCCIÓN', codigo: 'PRODUCCION', activo: true, orden: 4 },
  { id: 'sec-log', nombre: 'LOGÍSTICA', codigo: 'LOGISTICA', activo: true, orden: 5 },
];

function initCatalogos() {
  if (!localStorage.getItem(SECTORES_KEY)) {
    localStorage.setItem(SECTORES_KEY, JSON.stringify(SECTORES_DEFAULT));
  }
  if (!localStorage.getItem(TIPOS_COMPRA_KEY)) {
    localStorage.setItem(TIPOS_COMPRA_KEY, JSON.stringify(TIPOS_COMPRA_DEFAULT));
  }
}

function getCatalogo(key, defaults) {
  initCatalogos();
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    return data.length ? data : [...defaults];
  } catch {
    return [...defaults];
  }
}

function saveCatalogo(key, lista) {
  localStorage.setItem(key, JSON.stringify(lista));
}

function getSectores(activosOnly = false) {
  const lista = getCatalogo(SECTORES_KEY, SECTORES_DEFAULT)
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
  return activosOnly ? lista.filter((s) => s.activo) : lista;
}

function getTiposCompra(activosOnly = false) {
  const lista = getCatalogo(TIPOS_COMPRA_KEY, TIPOS_COMPRA_DEFAULT)
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
  return activosOnly ? lista.filter((t) => t.activo) : lista;
}

function getSectorById(id) {
  return getSectores().find((s) => s.id === id) || null;
}

function getTipoCompraById(id) {
  return getTiposCompra().find((t) => t.id === id) || null;
}

function getSectorByCodigo(codigo) {
  return getSectores().find((s) => s.codigo === codigo) || null;
}

function getTipoCompraByCodigo(codigo) {
  return getTiposCompra().find((t) => t.codigo === codigo) || null;
}

function generarCodigoCatalogo(nombre) {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || `ITEM_${Date.now()}`;
}

function codigoCatalogoDuplicado(lista, codigo, idExcluir = null) {
  return lista.some((item) => item.codigo === codigo && item.id !== idExcluir);
}

function sectorEnUso(codigo) {
  return getSolicitudes().some((s) => s.sector === codigo);
}

function tipoCompraEnUso(codigo) {
  return getSolicitudes().some((s) => s.tipoCompra === codigo);
}

function addSector({ nombre, codigo, activo = true, orden }) {
  const lista = getSectores();
  const cod = codigo?.trim() || generarCodigoCatalogo(nombre);
  if (codigoCatalogoDuplicado(lista, cod)) return { error: 'Ya existe un sector con ese código.' };
  const item = {
    id: `sec-${Date.now()}`,
    nombre: nombre.trim(),
    codigo: cod,
    activo: !!activo,
    orden: orden || lista.length + 1,
  };
  lista.push(item);
  saveCatalogo(SECTORES_KEY, lista);
  return { item };
}

function updateSector(id, cambios) {
  const lista = getSectores();
  const idx = lista.findIndex((s) => s.id === id);
  if (idx === -1) return { error: 'Sector no encontrado.' };

  const actual = lista[idx];
  const nuevoCodigo = cambios.codigo?.trim() || actual.codigo;
  if (codigoCatalogoDuplicado(lista, nuevoCodigo, id)) {
    return { error: 'Ya existe un sector con ese código.' };
  }
  if (actual.codigo !== nuevoCodigo && sectorEnUso(actual.codigo)) {
    return { error: 'No se puede cambiar el código: hay solicitudes que lo usan.' };
  }

  lista[idx] = {
    ...actual,
    nombre: cambios.nombre?.trim() || actual.nombre,
    codigo: nuevoCodigo,
    activo: cambios.activo !== undefined ? !!cambios.activo : actual.activo,
    orden: cambios.orden !== undefined ? cambios.orden : actual.orden,
  };
  saveCatalogo(SECTORES_KEY, lista);
  return { item: lista[idx] };
}

function deleteSector(id) {
  const lista = getSectores();
  const sector = lista.find((s) => s.id === id);
  if (!sector) return { error: 'Sector no encontrado.' };
  if (sectorEnUso(sector.codigo)) {
    return { error: 'No se puede eliminar: hay solicitudes asociadas a este sector.' };
  }
  if (lista.filter((s) => s.activo).length <= 1 && sector.activo) {
    return { error: 'Debe quedar al menos un sector activo.' };
  }
  saveCatalogo(SECTORES_KEY, lista.filter((s) => s.id !== id));
  return { ok: true };
}

function addTipoCompra({ nombre, codigo, activo = true, esUrgente = false, esStock = false, orden }) {
  const lista = getTiposCompra();
  const cod = codigo?.trim() || generarCodigoCatalogo(nombre);
  if (codigoCatalogoDuplicado(lista, cod)) return { error: 'Ya existe un tipo con ese código.' };
  const item = {
    id: `tipo-${Date.now()}`,
    nombre: nombre.trim(),
    codigo: cod,
    activo: !!activo,
    esUrgente: !!esUrgente,
    esStock: !!esStock,
    orden: orden || lista.length + 1,
  };
  lista.push(item);
  saveCatalogo(TIPOS_COMPRA_KEY, lista);
  return { item };
}

function updateTipoCompra(id, cambios) {
  const lista = getTiposCompra();
  const idx = lista.findIndex((t) => t.id === id);
  if (idx === -1) return { error: 'Tipo de pedido no encontrado.' };

  const actual = lista[idx];
  const nuevoCodigo = cambios.codigo?.trim() || actual.codigo;
  if (codigoCatalogoDuplicado(lista, nuevoCodigo, id)) {
    return { error: 'Ya existe un tipo con ese código.' };
  }
  if (actual.codigo !== nuevoCodigo && tipoCompraEnUso(actual.codigo)) {
    return { error: 'No se puede cambiar el código: hay solicitudes que lo usan.' };
  }

  lista[idx] = {
    ...actual,
    nombre: cambios.nombre?.trim() || actual.nombre,
    codigo: nuevoCodigo,
    activo: cambios.activo !== undefined ? !!cambios.activo : actual.activo,
    esUrgente: cambios.esUrgente !== undefined ? !!cambios.esUrgente : actual.esUrgente,
    esStock: cambios.esStock !== undefined ? !!cambios.esStock : actual.esStock,
    orden: cambios.orden !== undefined ? cambios.orden : actual.orden,
  };
  saveCatalogo(TIPOS_COMPRA_KEY, lista);
  return { item: lista[idx] };
}

function deleteTipoCompra(id) {
  const lista = getTiposCompra();
  const tipo = lista.find((t) => t.id === id);
  if (!tipo) return { error: 'Tipo de pedido no encontrado.' };
  if (tipoCompraEnUso(tipo.codigo)) {
    return { error: 'No se puede eliminar: hay solicitudes asociadas a este tipo.' };
  }
  if (lista.filter((t) => t.activo).length <= 1 && tipo.activo) {
    return { error: 'Debe quedar al menos un tipo de pedido activo.' };
  }
  saveCatalogo(TIPOS_COMPRA_KEY, lista.filter((t) => t.id !== id));
  return { ok: true };
}

function getOrdenadorFijoPorTipo(codigo) {
  if (codigo === 'COMPRA_RESOL_CD') return 'consejo_directivo';
  const tipo = getTipoCompraByCodigo(codigo);
  return tipo?.ordenadorFijo || null;
}

function tipoCompraEsStock(codigo) {
  if (codigo === 'COMPRA_STOCK' || codigo === 'STOCK') return true;
  const tipo = getTipoCompraByCodigo(codigo);
  return tipo?.esStock === true;
}

function esPedidoStock(datos) {
  return tipoCompraEsStock(datos?.tipoCompra);
}

function labelTipoCompra(codigo) {
  return getTipoCompraByCodigo(codigo)?.nombre || codigo || '—';
}

function labelSector(codigo) {
  return getSectorByCodigo(codigo)?.nombre || codigo || '—';
}

function tipoCompraEsUrgente(codigo) {
  const tipo = getTipoCompraByCodigo(codigo);
  return tipo?.esUrgente === true;
}

function poblarSelectSectores(selectEl, valorSeleccionado = null) {
  if (!selectEl) return;
  const sectores = getSectores(true);
  selectEl.innerHTML = sectores.map((s) =>
    `<option value="${escapeHtml(s.codigo)}">${escapeHtml(s.nombre)}</option>`
  ).join('');
  if (valorSeleccionado && sectores.some((s) => s.codigo === valorSeleccionado)) {
    selectEl.value = valorSeleccionado;
  }
}

function poblarSelectTiposCompra(selectEl, valorSeleccionado = null) {
  if (!selectEl) return;
  const tipos = getTiposCompra(true);
  selectEl.innerHTML = tipos.map((t) =>
    `<option value="${escapeHtml(t.codigo)}" data-urgente="${t.esUrgente}" data-stock="${t.esStock}">${escapeHtml(t.nombre)}</option>`
  ).join('');
  if (valorSeleccionado && tipos.some((t) => t.codigo === valorSeleccionado)) {
    selectEl.value = valorSeleccionado;
  }
}

function esPedidoUrgente() {
  const el = document.getElementById('tipoCompra');
  return el ? tipoCompraEsUrgente(el.value) : false;
}

function requiereJustificacionUrgente(datos) {
  if (datos) {
    const itemsUrgentes = (datos.productos || []).some((p) => p.urgente);
    return tipoCompraEsUrgente(datos.tipoCompra) || itemsUrgentes;
  }
  return esPedidoUrgente() || document.querySelectorAll('#productosBody .btn-urgente.activo').length > 0;
}

initCatalogos();
initOrdenadoresConfig();
sincronizarCatalogoTipos();
