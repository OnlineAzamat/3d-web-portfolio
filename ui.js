/*
  UI — HTML qatlam: cardlar, navigatsiya paneli (dock), tur paneli
  --------------------------------------------------
  Cardlar endi index.html da qo'lda yozilmaydi — hammasi data.js dan
  generatsiya qilinadi. Matn bir joyda o'zgarsa, sayt o'zi yangilanadi.

  Bu modul faqat DOM yasaydi va tugma bosilishlarini main.js ga
  uzatadi (handlers orqali). 3D holat haqida hech narsa bilmaydi.
*/

import { PROFILE, EXPERIENCE, SKILLS, STATIONS, SECRETS, HOUSE_SECTIONS } from './data.js';

// Matnni HTML ga xavfsiz qo'yish (data.js o'zimizniki, lekin odat yaxshi)
const esc = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));

const linkButton = ({ label, href, download }) =>
  `<a class="btn" href="${esc(href)}" ${download ? 'download' : 'target="_blank" rel="noopener"'}>${esc(label)}</a>`;

const closeButton = '<button class="card-close" aria-label="Close">&times;</button>';

/*
  Rasmlar data-src bilan yoziladi va card BIRINCHI marta ochilgandagina
  yuklanadi (revealImages) — sahifa ochilishida 10 ta skrinshot
  bekorga tortilmaydi.
*/
const lazyImage = (src, alt) =>
  `<img class="card-shot" data-src="${esc(src)}" alt="${esc(alt)}" />`;

/* ---------- Card shablonlari ---------- */

function aboutCard() {
  return `
    <article class="info-card" data-section="about">
      ${closeButton}
      <div class="card-body">
        <div class="about-header">
          <img class="avatar" src="${esc(PROFILE.photo)}" alt="${esc(PROFILE.name)}" />
          <div>
            <h2>${esc(PROFILE.name)}</h2>
            <p class="subtitle">${esc(PROFILE.role)}</p>
            <p class="meta">${esc(PROFILE.location)}</p>
          </div>
        </div>
        ${PROFILE.about.map((p, i) => `<p${i === 0 ? ' class="lead"' : ''}>${esc(p)}</p>`).join('')}
        ${statStrip(PROFILE.proof)}
        <div class="card-actions">
          ${linkButton({ label: 'Get my resume', href: PROFILE.cv, download: true })}
          ${linkButton({ label: 'Classic portfolio', href: PROFILE.site })}
        </div>
      </div>
    </article>`;
}

function statStrip(stats) {
  return `
    <div class="stat-strip">
      ${stats.map((s) => `<div><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></div>`).join('')}
    </div>`;
}

function experienceCard() {
  return `
    <article class="info-card" data-section="experience">
      ${closeButton}
      <div class="card-body">
        <h2>Experience</h2>
        <p class="meta">Development and teaching roles in Nukus, since 2025.</p>
        <ol class="timeline">
          ${EXPERIENCE.map((job) => `
            <li>
              <span class="timeline-date">${esc(job.period)} · ${esc(job.employment)}</span>
              <h3>${esc(job.title)}</h3>
              <p class="subtitle">${esc(job.company)}</p>
              <p>${esc(job.description)}</p>
            </li>`).join('')}
        </ol>
      </div>
    </article>`;
}

function skillsCard() {
  return `
    <article class="info-card" data-section="skills">
      ${closeButton}
      <div class="card-body">
        <h2>Technologies I use</h2>
        ${SKILLS.map((group) => `
          <h3 class="group-title">${esc(group.category)}</h3>
          <ul class="chips">${group.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
        `).join('')}
      </div>
    </article>`;
}

function contactCard() {
  return `
    <article class="info-card" data-section="contact">
      ${closeButton}
      <div class="card-body">
        <h2>Get in touch</h2>
        <p>
          For project enquiries or development roles, send me an email or message me on
          Telegram. Tell me what you’re working on and where you need help.
        </p>
        <div class="contact-links">
          ${linkButton({ label: PROFILE.email, href: `mailto:${PROFILE.email}`, download: false })}
          ${linkButton({ label: 'Telegram · @yakubbaevdev', href: PROFILE.telegram })}
          ${linkButton({ label: 'GitHub', href: PROFILE.github })}
          ${linkButton({ label: 'LinkedIn', href: PROFILE.linkedin })}
        </div>
        <p class="meta">${esc(PROFILE.location)}</p>
      </div>
    </article>`;
}

function stationCard(station) {
  const notes = (station.notes || []).map((note) => `
    <div class="note"><span>${esc(note.label)}</span><p>${esc(note.text)}</p></div>`).join('');

  const items = (station.items || []).map((item) => `
    <div class="project-item">
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.text)}</p>
      <p class="meta">${esc(item.tech)}</p>
      <div class="card-actions">${item.links.map(linkButton).join('')}</div>
    </div>`).join('');

  return `
    <article class="info-card station-card" data-section="${esc(station.id)}">
      ${closeButton}
      <div class="card-body">
        <div class="tag-row">
          <span class="tag">${esc(station.category)}</span>
          <span class="tag tag-status" data-status="${esc(station.status)}">${esc(station.status)}</span>
        </div>
        <h2>${esc(station.title)}</h2>
        <p class="subtitle">${esc(station.outcome)}</p>
        ${station.image ? lazyImage(station.image, station.title) : ''}
        <p class="lead">${esc(station.summary)}</p>
        ${notes}
        ${items}
        ${station.tech ? `<ul class="chips">${station.tech.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        ${station.links && station.links.length
          ? `<div class="card-actions">${station.links.map(linkButton).join('')}</div>` : ''}
      </div>
    </article>`;
}

function secretCard(secret) {
  return `
    <article class="info-card secret-card" data-hotspot="${esc(secret.id)}">
      ${closeButton}
      <div class="card-body">
        <span class="secret-tag">✦ Secret find</span>
        <h2>${esc(secret.title)}</h2>
        ${secret.text ? `<p>${esc(secret.text)}</p>` : ''}
        ${secret.stats ? statStrip(secret.stats) : ''}
        ${secret.link ? `<div class="card-actions">${linkButton(secret.link)}</div>` : ''}
      </div>
    </article>`;
}

/* ---------- Dock (pastki navigatsiya) ---------- */

function dockMarkup() {
  return `
    <div class="dock-menu" id="dock-menu" role="menu">
      ${STATIONS.map((s, i) => `
        <button role="menuitem" data-go="${esc(s.id)}">
          <span>${String(i + 1).padStart(2, '0')}</span>${esc(s.label)}
        </button>`).join('')}
    </div>
    <div class="dock-row">
      <button data-go="overview" title="See the whole town">Town</button>
      ${HOUSE_SECTIONS.map((s) => `<button data-go="${esc(s.id)}">${esc(s.nav)}</button>`).join('')}
      <span class="dock-sep"></span>
      <button data-go="prev" class="dock-arrow" aria-label="Previous project">‹</button>
      <button data-go="menu" class="dock-projects" aria-haspopup="true">Projects</button>
      <button data-go="next" class="dock-arrow" aria-label="Next project">›</button>
      <span class="dock-sep"></span>
      <button data-go="tour" class="dock-accent">▶ Tour</button>
      <button data-go="daynight" id="daynight-button" title="Switch day / night">Day</button>
    </div>`;
}

/* ============================================================
   OMMAVIY API
   ============================================================ */

/*
  renderUI() — main.js ENG BOSHIDA chaqiradi: 3D kod cardlarni
  querySelector bilan qidiradi, demak ular DOM'da oldinroq turishi kerak.
*/
export function renderUI() {
  const overlay = document.querySelector('.card-overlay');
  overlay.innerHTML = [
    aboutCard(),
    experienceCard(),
    skillsCard(),
    contactCard(),
    ...STATIONS.map(stationCard),
    ...SECRETS.map(secretCard)
  ].join('');

  document.getElementById('dock').innerHTML = dockMarkup();
}

// Card ochilganda uning kechiktirilgan rasmlarini yuklaydi
export function revealImages(card) {
  card.querySelectorAll('img[data-src]').forEach((img) => {
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
  });
}

/*
  bindDock(handlers) — tugmalarni main.js funksiyalariga ulaydi.
  handlers.go(id) — bo'lim/bino/overview/prev/next/tour/daynight.
*/
export function bindDock(handlers) {
  const dock = document.getElementById('dock');
  const menu = document.getElementById('dock-menu');

  dock.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-go]');
    if (!button) return;
    const target = button.dataset.go;

    if (target === 'menu') {
      menu.classList.toggle('open');
      return;
    }
    menu.classList.remove('open');
    handlers.go(target);
  });

  // Menyudan tashqariga bosilsa yopiladi
  window.addEventListener('pointerdown', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('#dock')) {
      menu.classList.remove('open');
    }
  });
}

// Dock'da joriy bo'limni belgilash (null — hech biri)
export function setActiveNav(id) {
  const isStation = STATIONS.some((s) => s.id === id);
  document.querySelectorAll('#dock button[data-go]').forEach((button) => {
    const go = button.dataset.go;
    button.classList.toggle('active', go === id || (go === 'menu' && isStation));
  });
}

export function setDayNightLabel(isDay) {
  document.getElementById('daynight-button').textContent = isDay ? 'Night' : 'Day';
}

/* ---------- Tur paneli ---------- */

export function showTour(index, total, title, duration) {
  const bar = document.getElementById('tour-bar');
  bar.classList.add('visible');
  bar.querySelector('.tour-step').textContent = `${index + 1} / ${total}`;
  bar.querySelector('.tour-title').textContent = title;

  // Progress chizig'i: animatsiyani qayta ishga tushirish uchun reflow kerak
  const fill = bar.querySelector('.tour-progress i');
  fill.style.transition = 'none';
  fill.style.width = '0%';
  void fill.offsetWidth;
  fill.style.transition = `width ${duration}ms linear`;
  fill.style.width = '100%';
}

export function hideTour() {
  document.getElementById('tour-bar').classList.remove('visible');
}

export function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.classList.add('done');
    setTimeout(() => loader.remove(), 900);
  }
}
