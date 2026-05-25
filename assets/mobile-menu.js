(() => {
  document.body.classList.add('reveal-ready');

  const header = document.getElementById('site-header');
  const toggle = document.querySelector('#site-header .menu-toggle');
  const navLinks = document.querySelectorAll('#site-header nav a');

  if (header) {
    const syncHeader = () => {
      header.classList.toggle('scrolled', window.scrollY > 30);
    };

    syncHeader();
    window.addEventListener('scroll', syncHeader, { passive: true });
  }

  document.querySelectorAll('.reveal').forEach((element) => {
    if (!('IntersectionObserver' in window)) {
      element.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        instance.unobserve(entry.target);
      });
    }, { threshold: 0.16 });

    observer.observe(element);
  });

  if (!header || !toggle) return;

  const closeMenu = () => {
    header.classList.remove('nav-open');
    document.body.classList.remove('no-scroll');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Abrir menu');

  toggle.addEventListener('click', () => {
    const isOpen = header.classList.toggle('nav-open');
    document.body.classList.toggle('no-scroll', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeMenu();
    }
  });
})();
