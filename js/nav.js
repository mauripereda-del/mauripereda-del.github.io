/**
 * Navegación compartida
 */

function renderNav(paginaActiva) {
  const nav = document.querySelector('.nav-principal');
  if (!nav) return;

  const ordenadorActivo = getOrdenadorFromUrl();

  const links = [
    { href: 'index.html', label: 'Nueva solicitud', key: 'index' },
    { href: 'autorizacion.html?ordenador=gerencia', label: 'Aut. Gerencia', key: 'auth-gerencia' },
    { href: 'autorizacion.html?ordenador=direccion_tecnica', label: 'Aut. Dir. Técnica', key: 'auth-dt' },
    { href: 'autorizacion.html?ordenador=consejo_directivo', label: 'Aut. Consejo', key: 'auth-consejo' },
    { href: 'pedidos-autorizados.html', label: 'Pedidos autorizados', key: 'pedidos' },
    { href: 'pedidos-stock.html', label: 'Pedidos Stock', key: 'stock' },
    { href: 'admin.html', label: 'Administración', key: 'admin' },
  ];

  nav.innerHTML = links.map((l) => {
    let activo = paginaActiva === l.key;
    if (paginaActiva === 'autorizacion' && l.key.startsWith('auth-')) {
      const map = {
        gerencia: 'auth-gerencia',
        direccion_tecnica: 'auth-dt',
        consejo_directivo: 'auth-consejo',
      };
      activo = map[ordenadorActivo] === l.key;
    }
    return `<a href="${l.href}" class="nav-link${activo ? ' activo' : ''}">${l.label}</a>`;
  }).join('');
}
