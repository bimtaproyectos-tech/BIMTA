/**
 * Estudio Arquitectura — Portfolio
 * Conexión con Supabase + animaciones, modal, dark mode
 */
document.addEventListener('DOMContentLoaded', () => {

  // ========================================
  // SUPABASE CONFIG & API HELPERS
  // ========================================
  const SUPABASE_URL = 'https://reyyxaxxygzpbwlmnjgi.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJleXl4YXh4eWd6cGJ3bG1uamdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTM4NjEsImV4cCI6MjA5NTQ2OTg2MX0.xoW-aydfRL40yMTGs3qErQ2R1YpIH35r8ZrXrfj1mIM';

  const API_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };

  async function apiGet(path) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: API_HEADERS });
    if (!r.ok) throw new Error(`GET ${path}: ${r.status}`);
    return r.json();
  }

  // ========================================
  // STATE
  // ========================================
  let projectsData = [];
  let profileData = null;
  let contactData = null;

  // ========================================
  // DOM REFS
  // ========================================
  const $ = (id) => document.getElementById(id);
  const gallery = $('gallery');
  const aboutPhoto = $('aboutPhoto');
  const aboutText1 = $('aboutText1');
  const aboutText2 = $('aboutText2');
  const aboutSignature = $('aboutSignature');
  const aboutRole = $('aboutRole');
  const contactEmail = $('contactEmail');
  const contactPhone = $('contactPhone');
  const contactLocation = $('contactLocation');

  // ========================================
  // CARGAR DATOS DESDE SUPABASE
  // ========================================
  async function loadAll() {
    try {
      const [projects, profile, contact] = await Promise.all([
        apiGet('projects?select=*&order=sort_order.asc.nullslast,created_at.desc'),
        apiGet('profile?select=*&limit=1').then(d => d[0] || null),
        apiGet('contact_info?select=*&limit=1').then(d => d[0] || null),
      ]);
      projectsData = projects || [];
      profileData = profile;
      contactData = contact;
    } catch (e) {
      console.error('Error cargando datos:', e);
    }
    renderProjects();
    renderProfile();
    renderContact();
    setTimeout(observeReveals, 100);
  }

  // ========================================
  // RENDER: PROYECTOS
  // ========================================
  function renderProjects() {
    gallery.innerHTML = '';
    if (projectsData.length === 0) {
      gallery.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--color-text-muted);padding:3rem 0">Próximamente proyectos</p>';
      return;
    }

    const delays = ['reveal-delay-1','reveal-delay-2','reveal-delay-3','reveal-delay-4','reveal-delay-5'];

    projectsData.forEach((p, i) => {
      const item = document.createElement('div');
      item.className = `gallery__item reveal ${delays[i % delays.length]}`;
      item.dataset.index = i;

      item.innerHTML = `
        <img class="gallery__img" src="${p.cover_image || 'https://placehold.co/800x600/e5e5e5/8a8a8a?text=—'}" alt="${escapeHtml(p.title)}" loading="lazy" />
        <span class="gallery__category">${capitalize(p.category)}</span>
        <div class="gallery__overlay">
          <h3 class="gallery__project-name">${escapeHtml(p.title)}</h3>
          <p class="gallery__project-meta"><span>${escapeHtml(p.year)}</span><span>${escapeHtml(p.location)}</span></p>
        </div>
      `;

      item.addEventListener('click', () => openModal(i));
      gallery.appendChild(item);
    });
  }

  // ========================================
  // RENDER: FILOSOFÍA
  // ========================================
  function renderProfile() {
    if (!profileData) return;

    if (profileData.photo_url) {
      aboutPhoto.src = profileData.photo_url;
      aboutPhoto.alt = `${profileData.architect_name} — Foto de perfil`;
    }
    if (profileData.philosophy_1) aboutText1.textContent = profileData.philosophy_1;
    if (profileData.philosophy_2) aboutText2.textContent = profileData.philosophy_2;
    if (profileData.signature) aboutSignature.textContent = profileData.signature;
    if (profileData.role_title) aboutRole.textContent = profileData.role_title;
  }

  // ========================================
  // RENDER: CONTACTO
  // ========================================
  function renderContact() {
    if (!contactData) return;
    if (contactData.email) contactEmail.textContent = contactData.email;
    if (contactData.phone) contactPhone.textContent = contactData.phone;
    if (contactData.location) contactLocation.textContent = contactData.location;

    // WhatsApp buttons — si hay canal/número, actualizar href
    const waUrl = contactData.whatsapp_number;
    if (waUrl) {
      const waBtns = document.querySelectorAll('.contact__btn, .whatsapp-btn');
      waBtns.forEach(btn => btn.href = waUrl);
    }
  }

  // ========================================
  // HELPERS
  // ========================================
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ========================================
  // MODAL — CARRUSEL + info lateral
  // ========================================
  const modal = $('modal');
  const carouselTrack = $('carouselTrack');
  const carouselDots = $('carouselDots');
  const carouselCounter = $('carouselCounter');
  const carouselPrev = $('carouselPrev');
  const carouselNext = $('carouselNext');
  const modalTitle = $('modalTitle');
  const modalMeta = $('modalMeta');
  const modalDesc = $('modalDesc');
  const modalClose = $('modalClose');

  let carouselIndex = 0;
  let carouselImages = [];
  let autoInterval = null;

  function buildCarousel(images, title) {
    carouselTrack.innerHTML = '';
    carouselDots.innerHTML = '';
    carouselImages = images;
    carouselIndex = 0;

    if (images.length === 0) {
      carouselTrack.innerHTML = '<div class="carousel__slide" style="display:flex;align-items:center;justify-content:center;min-height:300px;color:rgba(255,255,255,0.3)">Sin imágenes</div>';
      carouselPrev.style.display = 'none';
      carouselNext.style.display = 'none';
      return;
    }

    images.forEach((src, i) => {
      const slide = document.createElement('div');
      slide.className = 'carousel__slide';
      slide.innerHTML = `<img src="${src}" alt="${escapeHtml(title)}" loading="${i === 0 ? 'eager' : 'lazy'}" />`;
      carouselTrack.appendChild(slide);

      const dot = document.createElement('button');
      dot.className = 'carousel__dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', `Imagen ${i + 1}`);
      dot.addEventListener('click', () => goToSlide(i));
      carouselDots.appendChild(dot);
    });

    updateCarousel();

    // Auto play
    startAutoPlay();
  }

  function updateCarousel() {
    const slides = carouselTrack.querySelectorAll('.carousel__slide');
    const dots = carouselDots.querySelectorAll('.carousel__dot');
    const offset = -carouselIndex * 100;

    slides.forEach((slide, i) => {
      slide.style.transform = `translateX(${offset}%)`;
    });

    dots.forEach((d, i) => {
      d.classList.toggle('is-active', i === carouselIndex);
    });

    if (carouselCounter && carouselImages.length > 1) {
      carouselCounter.textContent = `${carouselIndex + 1} / ${carouselImages.length}`;
      carouselCounter.style.display = '';
    } else if (carouselCounter) {
      carouselCounter.style.display = 'none';
    }

    carouselPrev.style.display = carouselImages.length > 1 ? '' : 'none';
    carouselNext.style.display = carouselImages.length > 1 ? '' : 'none';
  }

  function goToSlide(index) {
    if (index < 0) index = carouselImages.length - 1;
    if (index >= carouselImages.length) index = 0;
    carouselIndex = index;
    updateCarousel();
    resetAutoPlay();
  }

  carouselPrev.addEventListener('click', () => goToSlide(carouselIndex - 1));
  carouselNext.addEventListener('click', () => goToSlide(carouselIndex + 1));

  function startAutoPlay() {
    if (carouselImages.length <= 1) return;
    stopAutoPlay();
    autoInterval = setInterval(() => {
      goToSlide(carouselIndex + 1);
    }, 5000);
  }

  function stopAutoPlay() {
    if (autoInterval) { clearInterval(autoInterval); autoInterval = null; }
  }

  function resetAutoPlay() {
    stopAutoPlay();
    startAutoPlay();
  }

  // Pausar auto al hover
  const carousel = document.querySelector('.carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', stopAutoPlay);
    carousel.addEventListener('mouseleave', startAutoPlay);
  }

  // Teclado: flechas izq/der
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('is-open')) return;
    if (e.key === 'ArrowLeft') { goToSlide(carouselIndex - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { goToSlide(carouselIndex + 1); e.preventDefault(); }
  });

  function openModal(index) {
    const p = projectsData[index];
    if (!p) return;

    const images = [];
    if (p.cover_image) images.push(p.cover_image);
    if (p.images && Array.isArray(p.images)) {
      p.images.forEach(img => { if (img && !images.includes(img)) images.push(img); });
    }

    buildCarousel(images, p.title);

    modalTitle.textContent = p.title;
    modalMeta.textContent = `${capitalize(p.category)} — ${p.year} / ${p.location}`;
    modalDesc.textContent = p.description || '';

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    stopAutoPlay();
    carouselIndex = 0;
  }

  modalClose.addEventListener('click', closeModal);

  // Cerrar al hacer clic en el backdrop
  const modalBackdrop = document.querySelector('.modal__backdrop');
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', closeModal);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });

  // ========================================
  // NAVBAR
  // ========================================
  const navbar = $('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('is-scrolled', window.scrollY > 60);
  }, { passive: true });

  // ========================================
  // MOBILE MENU
  // ========================================
  const navToggle = $('navToggle');
  const navLinks = $('navLinks');

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('is-active');
    navLinks.classList.toggle('is-open');
    document.body.style.overflow = navLinks.classList.contains('is-open') ? 'hidden' : '';
  });

  navLinks.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('is-active');
      navLinks.classList.remove('is-open');
      document.body.style.overflow = '';
    });
  });

  // ========================================
  // THEME TOGGLE
  // ========================================
  const html = document.documentElement;
  const themeToggle = $('themeToggle');
  themeToggle.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  // ========================================
  // SCROLL REVEAL
  // ========================================
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  function observeReveals() {
    document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => revealObserver.observe(el));
  }

  // ========================================
  // SMOOTH SCROLL
  // ========================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.scrollY - 80,
          behavior: 'smooth'
        });
      }
    });
  });

  // ========================================
  // INIT
  // ========================================
  loadAll();

});
