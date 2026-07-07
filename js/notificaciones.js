/**
 * Notificaciones por correo electrónico al ordenador
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

  const apiUrl = getApiNotificacionesUrl();
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
    return { ok: true, mensaje: datos.mensaje || 'Correo enviado al ordenador' };
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
