(() => {
  const header = document.getElementById('header');
  const menuToggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('nav');
  const known = [
    'outcomes',
    'situations',
    'services',
    'clients',
    'process',
    'engagement',
    'principles',
    'faq',
    'contact',
  ];

  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const hash = location.hash.replace('#', '');
  if (known.includes(hash)) {
    document.querySelectorAll('a.lang-link').forEach((link) => {
      const url = new URL(link.getAttribute('href'), location.origin);
      url.hash = hash;
      link.setAttribute('href', `${url.pathname}${url.search}${url.hash}`);
    });
  }

  const track = (name, params) => {
    if (typeof window.careAnalytics === 'function') {
      window.careAnalytics(name, params);
    }
  };

  document.querySelectorAll('[data-track]').forEach((link) => {
    link.addEventListener('click', () => {
      const params = { placement: link.getAttribute('data-track') };
      const service = link.getAttribute('data-service');
      const audience = link.getAttribute('data-audience');
      if (service) params.serviceCode = service;
      if (audience) params.audience = audience;
      track('engineering_cta_click', params);
    });
  });
})();
