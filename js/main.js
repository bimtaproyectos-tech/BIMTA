/**
 * Estudio Arquitectura — Portfolio
 * JavaScript: navegación, scroll reveal, modal, smooth scroll, dark mode
 */
document.addEventListener('DOMContentLoaded', () => {

  // ========================================
  // THEME TOGGLE — dark / light mode
  // ========================================
  const html = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');

  themeToggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  // ========================================
  // DATA — Proyectos para el modal
  // ========================================
  const projects = [
    { name: 'Casa Atemporal',     year: '2024', location: 'Punta del Este',      category: 'Residencial',
      img: 'https://images.unsplash.com/photo-1600585154340-4c0e3b4b0b1a?w=1200&q=80' },
    { name: 'Torre Celeste',      year: '2023', location: 'Ciudad de México',     category: 'Corporativo',
      img: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1200&q=80' },
    { name: 'Residencia Marbella', year: '2024', location: 'Marbella, España',    category: 'Residencial',
      img: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=1200&q=80' },
    { name: 'Museo del Silencio',  year: '2022', location: 'Oaxaca, México',      category: 'Cultural',
      img: 'https://images.unsplash.com/photo-1600566753198-0b0c7c3b4a5b?w=1200&q=80' },
    { name: 'Villa Horizonte',    year: '2023', location: 'Tulum, México',        category: 'Residencial',
      img: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=80' },
    { name: 'Pabellón Efímero',   year: '2024', location: 'Buenos Aires',         category: 'Cultural',
      img: 'https://images.unsplash.com/photo-1600566753376-12c8ab7c4a5b?w=1200&q=80' },
  ];

  // ========================================
  // NAVBAR — aparecer al scrollear
  // ========================================
  const navbar = document.getElementById('navbar');

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    navbar.classList.toggle('is-scrolled', y > 60);
  }, { passive: true });

  // ========================================
  // MOBILE MENU
  // ========================================
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.getElementById('navLinks');

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('is-active');
    navLinks.classList.toggle('is-open');
    document.body.style.overflow = navLinks.classList.contains('is-open') ? 'hidden' : '';
  });

  // Cerrar menú al navegar
  navLinks.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('is-active');
      navLinks.classList.remove('is-open');
      document.body.style.overflow = '';
    });
  });

  // ========================================
  // SCROLL REVEAL — IntersectionObserver
  // ========================================
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // ========================================
  // GALLERY MODAL
  // ========================================
  const modal        = document.getElementById('modal');
  const modalImg     = document.getElementById('modalImg');
  const modalTitle   = document.getElementById('modalTitle');
  const modalMeta    = document.getElementById('modalMeta');
  const modalClose   = document.getElementById('modalClose');
  const galleryItems = document.querySelectorAll('.gallery__item');

  function openModal(index) {
    const p = projects[index];
    if (!p) return;
    modalImg.src = p.img;
    modalImg.alt = p.name;
    modalTitle.textContent = p.name;
    modalMeta.textContent = `${p.category} — ${p.year} / ${p.location}`;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.dataset.index, 10);
      openModal(idx);
    });
  });

  modalClose.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });

  // ========================================
  // SMOOTH SCROLL — anclas del menú
  // ========================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

});
