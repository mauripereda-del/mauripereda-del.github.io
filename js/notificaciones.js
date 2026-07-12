/**
 * Notificaciones por correo electrónico
 */

async function notificarOrdenadorPendiente(solicitud) {
  const ordenador = solicitud.ordenador;
  if (!ordenador) {
    return { ok: false, error: 'No hay ordenador asignado' };
  }

  const destinatario = getEmailOrdenador(ordenador);
  if (!destinatario) {
    return {
      ok: false,
      error: `Configure el correo de ${labelOrdenador(ordenador)} en Administración`,
    };
  }

  const payload = {
    destinatario,
    ordenador: labelOrdenador(ordenador),
    numero: solicitud.numero,
    fecha: formatFecha(solicitud.fecha),
    sector: labelSector(solicitud.sector),
    tipoPedido: labelTipoCompra(solicitud.tipoCompra),
    solicitante: solicitud.nombreSolicitante,
    jefeSector: solicitud.jefeSector,
    cantidadItems: (solicitud.productos || []).filter((p) => p.descripcion).length,
    panelUrl: getUrlAbsolutaPanelAutorizacion(ordenador),
  };

  return enviarNotificacionApi(getApiNotificacionesUrl(), payload);
}

function getApiNotificarSectorUrl() {
  return getApiNotificacionesUrl().replace(
    '/api/notificar-ordenador',
    '/api/notificar-sector-autorizacion',
  );
}

async function notificarSectorAutorizacion(solicitud, opciones) {
  const destinatario = getEmailSector(solicitud.sector);
  if (!destinatario) {
    return {
      ok: false,
      error: `Configure el correo del sector ${labelSector(solicitud.sector)} en Administración`,
    };
  }

  const payload = {
    destinatario,
    numero: solicitud.numero,
    fecha: formatFecha(solicitud.fecha),
    sector: labelSector(solicitud.sector),
    tipoPedido: labelTipoCompra(solicitud.tipoCompra),
    solicitante: solicitud.nombreSolicitante,
    ordenador: labelOrdenador(solicitud.ordenador),
    nombreOrdenador: opciones.nombreOrdenador,
    autorizada: opciones.autorizada,
    editada: opciones.editada,
    observacion: opciones.observacion || '',
    cambiosProductos: opciones.cambiosProductos || [],
    productos: productosValidos(solicitud).map((p) => ({
      codigo: p.codigo || '',
      cantidad: p.cantidad,
      descripcion: p.descripcion,
    })),
  };

  return enviarNotificacionApi(getApiNotificarSectorUrl(), payload);
}

async function enviarNotificacionApi(apiUrl, payload) {
  try {
    const respuesta = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      return { ok: false, error: datos.error || `Error del servidor (${respuesta.status})` };
    }
    return { ok: true, mensaje: datos.mensaje || 'Notificación enviada correctamente' };
  } catch {
    return {
      ok: false,
      error: 'No se pudo conectar al servicio de correo. Verifique que el servidor esté activo.',
    };
  }
}

function mostrarFlashNotificacionEnvio() {
  const raw = sessionStorage.getItem('flash_notificacion');
  if (!raw) return;
  sessionStorage.removeItem('flash_notificacion');

  try {
    const resultado = JSON.parse(raw);
    if (resultado.ok) {
      mostrarToast(resultado.mensaje || 'Notificación enviada al ordenador por correo electrónico');
    } else if (resultado.error) {
      mostrarToast(`Solicitud registrada. ${resultado.error}`);
    }
  } catch {
    /* ignorar */
  }
}
