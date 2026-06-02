/**
 * Admin Panel — Estudio Arquitectura
 * Conecta con Supabase via REST API (sin librería externa)
 */
document.addEventListener('DOMContentLoaded', () => {

  // ========================================
  // SUPABASE CONFIG
  // ========================================
  const SUPABASE_URL = 'https://reyyxaxxygzpbwlmnjgi.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJleXl4YXh4eWd6cGJ3bG1uamdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTM4NjEsImV4cCI6MjA5NTQ2OTg2MX0.xoW-aydfRL40yMTGs3qErQ2R1YpIH35r8ZrXrfj1mIM';

  // ========================================
  // API HELPERS
  // ========================================
  function getHeaders(token) {
    const h = {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  async function apiGet(path, token) {
    const headers = getHeaders(token);
    const r = await authFetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
    if (!r.ok) throw new Error(`GET ${path}: ${r.status}`);
    return r.json();
  }

  async function apiPost(path, body, token) {
    const headers = getHeaders(token);
    const r = await authFetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`POST ${path}: ${r.status} ${t}`); }
    return r.json();
  }

  async function apiPatch(path, body, token) {
    const headers = getHeaders(token);
    const r = await authFetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`PATCH ${path}: ${r.status} ${t}`); }
    return r.json();
  }

  async function apiDelete(path, token) {
    const headers = getHeaders(token);
    const r = await authFetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: 'DELETE',
      headers,
    });
    if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`DELETE ${path}: ${r.status} ${t}`); }
    return r.json();
  }

  // ========================================
  // AUTH
  // ========================================
  let accessToken = null;
  let refreshToken = null;

  function saveSession(token, email, refresh) {
    accessToken = token;
    refreshToken = refresh || null;
    localStorage.setItem('sb-token', token);
    localStorage.setItem('sb-email', email);
    if (refresh) localStorage.setItem('sb-refresh', refresh);
  }

  function clearSession() {
    accessToken = null;
    refreshToken = null;
    localStorage.removeItem('sb-token');
    localStorage.removeItem('sb-email');
    localStorage.removeItem('sb-refresh');
  }

  function loadSession() {
    const token = localStorage.getItem('sb-token');
    const email = localStorage.getItem('sb-email');
    const refresh = localStorage.getItem('sb-refresh');
    if (token) {
      accessToken = token;
      refreshToken = refresh || null;
      return email;
    }
    return null;
  }

  async function refreshAccessToken() {
    if (!refreshToken) return false;
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!r.ok) return false;
      const data = await r.json();
      saveSession(data.access_token, localStorage.getItem('sb-email'), data.refresh_token || refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  async function authFetch(url, options) {
    const r = await fetch(url, options);
    // Si es 401, intentamos refrescar el token y reintentamos una vez
    if (r.status === 401 && refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const newHeaders = { ...options.headers, 'Authorization': `Bearer ${accessToken}` };
        return fetch(url, { ...options, headers: newHeaders });
      }
    }
    return r;
  }

  async function checkSession() {
    const email = loadSession();
    if (email && accessToken) {
      // Si hay refresh token, intentamos refreshear por las dudas
      if (refreshToken) await refreshAccessToken();
      currentUserEmail = email;
      showDashboard();
    }
  }

  async function login(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error_description || err.msg || 'Error al iniciar sesión');
    }
    const data = await r.json();
    saveSession(data.access_token, data.user.email, data.refresh_token);
    currentUserEmail = data.user.email;
    showDashboard();
  }

  async function signup(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.msg || 'Error al crear cuenta');
    }
    const data = await r.json();
    // Si el servidor devuelve access_token, auto-logueamos
    if (data.access_token) {
      saveSession(data.access_token, data.user.email, data.refresh_token);
      currentUserEmail = data.user.email;
      showDashboard();
      return;
    }
    // Si requiere confirmación de email
    alert('Cuenta creada. Revisá tu email para confirmar. Después iniciá sesión.');
    // Volvemos al modo login
    isLoginMode = true;
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    loginToggleText.textContent = '¿No tenés cuenta?';
    toggleAuthMode.textContent = 'Crear una';
  }

  // ========================================
  // STATE
  // ========================================
  let currentUserEmail = null;
  let projects = [];
  let profileData = null;
  let contactData = null;
  let editingProjectId = null;
  let deleteTargetId = null;

  // ========================================
  // DOM REFS
  // ========================================
  const $ = (id) => document.getElementById(id);

  const loginScreen     = $('loginScreen');
  const dashboard       = $('dashboard');
  const loginForm       = $('loginForm');
  const signupForm      = $('signupForm');
  const loginError      = $('loginError');
  const signupError     = $('signupError');
  const toggleAuthMode  = $('toggleAuthMode');
  const loginToggleText = $('loginToggleText');
  const userEmailEl     = $('userEmail');
  const logoutBtn       = $('logoutBtn');

  const projectsList    = $('projectsList');
  const projectsEmpty   = $('projectsEmpty');
  const addProjectBtn   = $('addProjectBtn');

  const projectModal    = $('projectModal');
  const modalTitle      = $('modalTitle');
  const modalClose      = $('modalClose');
  const modalCancel     = $('modalCancel');
  const projectForm     = $('projectForm');
  const projectId       = $('projectId');
  const pTitle          = $('pTitle');
  const pYear           = $('pYear');
  const pLocation       = $('pLocation');
  const pCategory       = $('pCategory');
  const pDescription    = $('pDescription');
  const pCover          = $('pCover');
  const pCoverPreview   = $('pCoverPreview');
  const pImages         = $('pImages');
  const pImagesPreview  = $('pImagesPreview');
  const modalSaveBtn    = $('modalSaveBtn');

  const confirmModal    = $('confirmModal');
  const confirmClose    = $('confirmClose');
  const confirmCancel   = $('confirmCancel');
  const confirmDelete   = $('confirmDelete');

  const profileForm     = $('profileForm');
  const profileName     = $('profileName');
  const profileRole     = $('profileRole');
  const profileText1    = $('profileText1');
  const profileText2    = $('profileText2');
  const profileSignature = $('profileSignature');
  const profilePhoto    = $('profilePhoto');
  const profilePhotoPreview = $('profilePhotoPreview');
  const profileSuccess  = $('profileSuccess');

  const contactForm     = $('contactForm');
  const contactEmail    = $('contactEmail');
  const contactPhone    = $('contactPhone');
  const contactLocation = $('contactLocation');
  const contactWhatsapp = $('contactWhatsapp');
  const contactWhatsappMsg = $('contactWhatsappMsg');
  const contactSuccess  = $('contactSuccess');

  // ========================================
  // AUTH UI
  // ========================================
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.remove('is-visible');
    const email = $('loginEmail').value;
    const password = $('loginPassword').value;
    const btn = $('loginBtn');
    btn.disabled = true;
    btn.textContent = 'Entrando...';
    try {
      await login(email, password);
    } catch (err) {
      loginError.textContent = err.message;
      loginError.classList.add('is-visible');
    }
    btn.disabled = false;
    btn.textContent = 'Entrar';
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupError.classList.remove('is-visible');
    const email = $('signupEmail').value;
    const password = $('signupPassword').value;
    const btn = $('signupBtn');
    btn.disabled = true;
    btn.textContent = 'Creando...';
    try {
      await signup(email, password);
    } catch (err) {
      signupError.textContent = err.message;
      signupError.classList.add('is-visible');
    }
    btn.disabled = false;
    btn.textContent = 'Crear cuenta';
  });

  logoutBtn.addEventListener('click', () => {
    clearSession();
    currentUserEmail = null;
    showLogin();
  });

  let isLoginMode = true;
  toggleAuthMode.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    loginForm.style.display = isLoginMode ? 'block' : 'none';
    signupForm.style.display = isLoginMode ? 'none' : 'block';
    loginToggleText.textContent = isLoginMode ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?';
    toggleAuthMode.textContent = isLoginMode ? 'Crear una' : 'Iniciar sesión';
  });

  function showLogin() {
    loginScreen.style.display = 'flex';
    dashboard.style.display = 'none';
    document.title = 'Panel — Estudio Arquitectura';
  }

  function showDashboard() {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'flex';
    userEmailEl.textContent = currentUserEmail || '';
    document.title = 'Admin — Estudio Arquitectura';
    loadAllData();
  }

  // ========================================
  // THEME TOGGLE — admin
  // ========================================
  const adminThemeToggle = document.getElementById('adminThemeToggle');
  if (adminThemeToggle) {
    adminThemeToggle.addEventListener('click', () => {
      const html = document.documentElement;
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  // ========================================
  // NAVEGACIÓN ENTRE SECCIONES
  // ========================================
  document.querySelectorAll('.dash-sidebar__item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dash-sidebar__item').forEach(b => b.classList.remove('is-active'));
      document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('is-visible'));
      btn.classList.add('is-active');
      const section = document.getElementById('section-' + btn.dataset.section);
      if (section) section.classList.add('is-visible');
    });
  });

  // ========================================
  // CARGAR TODOS LOS DATOS
  // ========================================
  async function loadAllData() {
    await Promise.all([loadProjects(), loadProfile(), loadContact()]);
  }

  // ========================================
  // HELPERS — UPLOAD IMAGE
  // ========================================
  function getStorageHeaders(token) {
    return {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${token}`,
      // No Content-Type — fetch lo setea automaticamente con FormData
    };
  }

  async function uploadFile(file, folder) {
    if (!file) return null;
    const ext = file.name.split('.').pop().replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    async function doUpload(token) {
      return fetch(`${SUPABASE_URL}/storage/v1/object/portfolio-images/${fileName}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': file.type,
          'x-upsert': 'true',
        },
        body: file,
      });
    }

    let r = await doUpload(accessToken);

    // Si el token expiró, refrescamos y reintentamos una vez
    if (r.status === 401 && refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) r = await doUpload(accessToken);
    }

    if (!r.ok) {
      const t = await r.text().catch(() => '');
      console.error('Upload error:', r.status, t);
      return null;
    }

    return `${SUPABASE_URL}/storage/v1/object/public/portfolio-images/${fileName}`;
  }

  function showPreview(input, container, single = true) {
    const files = input.files;
    if (!files || files.length === 0) return;
    // Para imágenes múltiples, append en vez de reemplazar
    if (!single) container.querySelector('.preview-label')?.remove();
    const show = (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        container.appendChild(img);
      };
      reader.readAsDataURL(file);
    };
    if (single) { container.innerHTML = ''; show(files[0]); }
    else Array.from(files).slice(0, 6).forEach(show);
  }

  pCover.addEventListener('change', () => showPreview(pCover, pCoverPreview, true));
  pImages.addEventListener('change', () => showPreview(pImages, pImagesPreview, false));
  profilePhoto.addEventListener('change', () => showPreview(profilePhoto, profilePhotoPreview, true));

  // ========================================
  // PROJECTS CRUD
  // ========================================
  async function loadProjects() {
    try {
      projects = await apiGet('projects?order=sort_order.asc.nullslast,created_at.desc', accessToken);
    } catch (e) {
      console.error('Error loading projects:', e);
      projects = [];
    }
    renderProjects();
  }

  function renderProjects() {
    projectsList.innerHTML = '';
    if (projects.length === 0) {
      projectsList.appendChild(projectsEmpty);
      return;
    }
    projectsEmpty.remove();
    projects.forEach(p => {
      const card = document.createElement('div');
      card.className = 'project-card';
      card.innerHTML = `
        <img class="project-card__thumb" src="${p.cover_image || 'https://placehold.co/72x56/e5e5e5/8a8a8a?text=—'}" alt="${p.title.replace(/"/g, '&quot;')}" loading="lazy" />
        <div class="project-card__info">
          <div class="project-card__title">${p.title}</div>
          <div class="project-card__meta">${p.year} — ${p.location} · ${p.category}</div>
        </div>
        <div class="project-card__actions">
          <button class="project-card__btn project-card__btn--edit" data-id="${p.id}">Editar</button>
          <button class="project-card__btn project-card__btn--delete" data-id="${p.id}">Eliminar</button>
        </div>
      `;
      card.querySelector('.project-card__btn--edit').addEventListener('click', () => openProjectModal(p.id));
      card.querySelector('.project-card__btn--delete').addEventListener('click', () => openDeleteConfirm(p.id));
      projectsList.appendChild(card);
    });
  }

  function openProjectModal(id = null) {
    editingProjectId = id;
    projectForm.reset();
    pCoverPreview.innerHTML = '';
    pImagesPreview.innerHTML = '';

    if (id) {
      const p = projects.find(x => x.id === id);
      if (!p) return;
      modalTitle.textContent = 'Editar proyecto';
      modalSaveBtn.textContent = 'Guardar cambios';
      projectId.value = p.id;
      pTitle.value = p.title;
      pYear.value = p.year;
      pLocation.value = p.location;
      pCategory.value = p.category;
      pDescription.value = p.description || '';
      if (p.cover_image) {
        pCoverPreview.innerHTML = `<img src="${p.cover_image}" alt="Portada actual" />`;
      }
      // Mostrar imágenes existentes en el preview
      if (p.images && Array.isArray(p.images) && p.images.length > 0) {
        p.images.forEach(src => {
          const img = document.createElement('img');
          img.src = src;
          img.title = 'Imagen existente';
          pImagesPreview.appendChild(img);
        });
        const label = document.createElement('p');
        label.className = 'preview-label';
        label.textContent = '— Imágenes actuales —';
        label.style.cssText = 'font-size:0.7rem;color:var(--color-text-muted);grid-column:1/-1;text-align:center;margin:0';
        pImagesPreview.insertBefore(label, pImagesPreview.firstChild);
      }
    } else {
      modalTitle.textContent = 'Nuevo proyecto';
      modalSaveBtn.textContent = 'Guardar proyecto';
      projectId.value = '';
    }
    projectModal.classList.add('is-open');
  }

  projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    modalSaveBtn.disabled = true;
    modalSaveBtn.textContent = 'Guardando...';

    const id = projectId.value;

    let coverUrl = null;
    if (pCover.files && pCover.files.length > 0) {
      coverUrl = await uploadFile(pCover.files[0], 'projects/covers');
    }

    let additionalUrls = [];
    if (pImages.files && pImages.files.length > 0) {
      for (const file of Array.from(pImages.files)) {
        const url = await uploadFile(file, 'projects/gallery');
        if (url) additionalUrls.push(url);
      }
    }

    let existingCover = null;
    if (!coverUrl && id) {
      const p = projects.find(x => x.id === Number(id));
      if (p) existingCover = p.cover_image;
    }

    let existingImages = [];
    if (id) {
      const p = projects.find(x => x.id === Number(id));
      if (p) {
        existingImages = Array.isArray(p.images) ? p.images : [];
      }
    }

    const payload = {
      title: pTitle.value.trim(),
      year: pYear.value.trim(),
      location: pLocation.value.trim(),
      category: pCategory.value,
      description: pDescription.value.trim() || null,
      cover_image: coverUrl || existingCover || null,
      images: [...existingImages, ...additionalUrls],
    };

    try {
      if (id) {
        await apiPatch(`projects?id=eq.${id}`, payload, accessToken);
      } else {
        await apiPost('projects', payload, accessToken);
      }
    } catch (err) {
      alert('Error al guardar: ' + err.message);
      modalSaveBtn.disabled = false;
      modalSaveBtn.textContent = id ? 'Guardar cambios' : 'Guardar proyecto';
      return;
    }

    modalSaveBtn.disabled = false;
    modalSaveBtn.textContent = id ? 'Guardar cambios' : 'Guardar proyecto';
    projectModal.classList.remove('is-open');
    await loadProjects();
  });

  [modalClose, modalCancel].forEach(el => {
    el.addEventListener('click', () => projectModal.classList.remove('is-open'));
  });
  projectModal.addEventListener('click', (e) => {
    if (e.target === projectModal) projectModal.classList.remove('is-open');
  });

  // ========================================
  // DELETE CONFIRM
  // ========================================
  function openDeleteConfirm(id) {
    deleteTargetId = id;
    confirmModal.classList.add('is-open');
  }

  confirmDelete.addEventListener('click', async () => {
    if (!deleteTargetId) return;
    try {
      await apiDelete(`projects?id=eq.${deleteTargetId}`, accessToken);
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
      return;
    }
    confirmModal.classList.remove('is-open');
    deleteTargetId = null;
    await loadProjects();
  });

  [confirmClose, confirmCancel].forEach(el => {
    el.addEventListener('click', () => confirmModal.classList.remove('is-open'));
  });
  confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) confirmModal.classList.remove('is-open');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      projectModal.classList.remove('is-open');
      confirmModal.classList.remove('is-open');
    }
  });

  // ========================================
  // PROFILE
  // ========================================
  async function loadProfile() {
    try {
      const data = await apiGet('profile?limit=1', accessToken);
      profileData = data && data.length > 0 ? data[0] : null;
      if (profileData) {
        profileName.value = profileData.architect_name || '';
        profileRole.value = profileData.role_title || '';
        profileText1.value = profileData.philosophy_1 || '';
        profileText2.value = profileData.philosophy_2 || '';
        profileSignature.value = profileData.signature || '';
        if (profileData.photo_url) {
          profilePhotoPreview.innerHTML = `<img src="${profileData.photo_url}" alt="Foto actual" />`;
        }
      }
    } catch (e) {
      console.error('Error loading profile:', e);
    }
  }

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    profileSuccess.classList.remove('is-visible');

    let photoUrl = null;
    if (profileData?.photo_url) photoUrl = profileData.photo_url;
    if (profilePhoto.files && profilePhoto.files.length > 0) {
      const url = await uploadFile(profilePhoto.files[0], 'profile');
      if (url) photoUrl = url;
    }

    const payload = {
      architect_name: profileName.value.trim(),
      role_title: profileRole.value.trim() || 'Arquitecto & Fundador',
      philosophy_1: profileText1.value.trim(),
      philosophy_2: profileText2.value.trim() || null,
      signature: profileSignature.value.trim() || null,
      photo_url: photoUrl || null,
    };

    try {
      if (profileData?.id) {
        await apiPatch(`profile?id=eq.${profileData.id}`, payload, accessToken);
      } else {
        await apiPost('profile', payload, accessToken);
      }
    } catch (err) {
      alert('Error al guardar: ' + err.message);
      return;
    }

    profileSuccess.classList.add('is-visible');
    setTimeout(() => profileSuccess.classList.remove('is-visible'), 3000);
    await loadProfile();
  });

  // ========================================
  // CONTACT
  // ========================================
  async function loadContact() {
    try {
      const data = await apiGet('contact_info?limit=1', accessToken);
      contactData = data && data.length > 0 ? data[0] : null;
      if (contactData) {
        contactEmail.value = contactData.email || '';
        contactPhone.value = contactData.phone || '';
        contactLocation.value = contactData.location || '';
        contactWhatsapp.value = contactData.whatsapp_number || '';
        contactWhatsappMsg.value = contactData.whatsapp_message || '';
      }
    } catch (e) {
      console.error('Error loading contact:', e);
    }
  }

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    contactSuccess.classList.remove('is-visible');

    const payload = {
      email: contactEmail.value.trim() || null,
      phone: contactPhone.value.trim() || null,
      location: contactLocation.value.trim() || null,
      whatsapp_number: contactWhatsapp.value.trim() || null,
      whatsapp_message: contactWhatsappMsg.value.trim() || null,
    };

    try {
      if (contactData?.id) {
        await apiPatch(`contact_info?id=eq.${contactData.id}`, payload, accessToken);
      } else {
        await apiPost('contact_info', payload, accessToken);
      }
    } catch (err) {
      alert('Error al guardar: ' + err.message);
      return;
    }

    contactSuccess.classList.add('is-visible');
    setTimeout(() => contactSuccess.classList.remove('is-visible'), 3000);
    await loadContact();
  });

  // ========================================
  // ADD PROJECT BUTTON
  // ========================================
  addProjectBtn.addEventListener('click', () => openProjectModal(null));

  // ========================================
  // INIT
  // ========================================
  checkSession();

});
