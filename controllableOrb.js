/*
  UCHAR CHIROQ (controllable orb) — o'yin elementi
  --------------------------------------------------
  Foydalanuvchi WASD/strelkalar (mobilda virtual joystick) bilan
  boshqaradigan kichik porloq jism. Vazifasi — hovlidagi 4 ta YASHIRIN
  hotspot nuqtasini ochish (hobbi, sertifikatlar, fakt, CV). U asosiy
  navigatsiya (uy qavatlari) bilan raqobatlashmaydi: raycaster'ga
  tushmaydi, bosib bo'lmaydi, faqat "uchirib borib topiladi".

  main.js bilan shartnoma:
    createOrb(scene)            — bir marta, sahna qurilgandan keyin
    updateOrb(dt, time)         — animate() ichida har kadr
    checkHotspots(camera, dt)   — animate() ichida har kadr
*/

import * as THREE from 'three';

/* ============================================================
   SOZLAMALAR
   ============================================================ */

const BASE_Y = 2.0;        // parvoz balandligi (talab: 1.5–3 oralig'i)
const ACCEL = 16;          // tezlanish, birlik/s²
const MAX_SPEED = 5.5;     // maksimal tezlik, birlik/s
const FRICTION = 5.5;      // qo'yib yuborilgandagi sekinlashish koeffitsiyenti

// Hovli chegaralari: butalar to'sig'i (±7.4) ichida, old tomonda esa
// yo'lka oxirigacha (z≈9.5) ruxsat — hotspot va lavha o'sha tomonda
const BOUNDS = { minX: -7, maxX: 7, minZ: -7, maxZ: 9.8 };

const HOTSPOT_RADIUS = 1.5;   // shu masofada tooltip ko'rinadi
const HOTSPOT_REARM = 2.2;    // shu masofadan uzoqlashganda hotspot qayta "qurollanadi"
const DWELL_TIME = 1.0;       // card ochilishi uchun to'xtab turish vaqti, soniya

/*
  To'siqlar — main.js dagi sahna joylashuvining NUSXASI (uy o'lchamlari,
  daraxt/pochta qutisi/lavha pozitsiyalari o'sha yerda belgilangan).
  Agar main.js da biror obyekt ko'chirilsa, bu ro'yxatni ham yangilash kerak.
  Murakkab fizika yo'q: uy — kengaytirilgan AABB, qolganlari — doiralar.
*/
const HOUSE_HALF = 2.6; // devor 2.2 + jism radiusi + kichik zaxira

const CIRCLE_OBSTACLES = [
  { x: -6.5, z: 2.5, r: 1.3 },  // katta daraxt (chapda)
  { x: -8.5, z: -3.5, r: 1.6 }, // chekka daraxt (asosan chegara ortida)
  { x: 6.5, z: -5.5, r: 1.15 }, // o'ng orqa daraxt
  { x: 9.0, z: 2.0, r: 1.4 },   // o'ng chekka daraxt
  { x: -4.5, z: 8.0, r: 1.0 },  // old chap daraxt
  { x: 2.6, z: 3.4, r: 0.55 },  // pochta qutisi
  { x: 3.1, z: 6.6, r: 0.55 }   // nom lavhasi ustuni
];

/*
  Yashirin nuqtalar. Har biri hovlidagi biror "diqqatga sazovor joy"
  yonida — foydalanuvchi chiroqni aylantirar ekan tabiiy yo'lda uchraydi.
  data-hotspot atributi index.html dagi .secret-card bilan bog'laydi.
*/
const HOTSPOT_DEFS = [
  { id: 'hobbies', x: -5.2, z: 3.4 },      // katta daraxt soyasida
  { id: 'certificates', x: 0, z: -5.4 },   // uyning orqa hovlisida
  { id: 'fact', x: 3.9, z: 4.3 },          // pochta qutisi yonida
  { id: 'cv', x: 4.6, z: 7.3 }             // nom lavhasi yonida
];

/* ============================================================
   MODUL HOLATI
   ============================================================ */

const orb = new THREE.Group();
orb.name = 'orb';

const velocity = new THREE.Vector3();
const keys = { up: false, down: false, left: false, right: false };
const joystick = { x: 0, z: 0 }; // -1..1, virtual joystickdan

let helloElapsed = 0;     // "salom" sakrash animatsiyasi taymeri
let trailState = null;    // { points, history[], timer }
let groundPool = null;    // yerdagi yorug'lik dog'i
let hotspots = [];        // { id, position, dwell, opened, element }
let tooltipEl = null;

// Har kadrda qayta ishlatiladigan vaqtinchalik vektorlar (GC'siz)
const _screenPos = new THREE.Vector3();
const _pushNormal = new THREE.Vector3();

/* ============================================================
   YASASH
   ============================================================ */

// Markazda oq, chetga qarab shaffof radial gradient — halo, iz va
// yorug'lik dog'ining umumiy teksturasi
function createGlowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

export function createOrb(scene) {
  const glowTexture = createGlowTexture();

  /* ---------- Jismning o'zi ---------- */

  // Yadro: kichik sfera, kuchli iliq emissive — "olov chivini" tanasi
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0x442200,
      emissive: 0xffcc66,
      emissiveIntensity: 1.5
    })
  );

  // Halo: har doim kameraga qaragan yumshoq porlash — sfera qirralarini
  // "eritib", nur atmosferada tarqalayotgandek ko'rsatadi
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xffcc66,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  halo.scale.setScalar(1.1);

  /*
    Atrofga haqiqiy yorug'lik: kuchsiz PointLight (masofa 3.5 bilan
    cheklangan — GPU butun sahnani emas, faqat yaqin atrofni hisoblaydi).
    Daraxt va uy devorlari (toon materiallar) chiroq yaqinlashganda
    haqiqatan yorishadi.
  */
  const light = new THREE.PointLight(0xffcc66, 2.5, 3.5, 2);

  orb.add(core, halo, light);

  /*
    Yerdagi yorug'lik dog'i — MUHIM ayyorlik: yer MeshBasicMaterial
    (yorug'likka javob bermaydi), shuning uchun PointLight maysada iz
    qoldirmaydi. Buni jism ostida suzib yuradigan additive "nur doirasi"
    bilan taqlid qilamiz — arzon va har qanday materialda ishlaydi.
  */
  groundPool = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshBasicMaterial({
      map: glowTexture,
      color: 0xffb75e,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  groundPool.rotation.x = -Math.PI / 2;
  groundPool.position.y = 0.05;
  scene.add(groundPool);

  /* ---------- Iz (trail) ---------- */

  const TRAIL_COUNT = 10;
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute(
    'position', new THREE.BufferAttribute(new Float32Array(TRAIL_COUNT * 3), 3)
  );
  trailGeometry.setAttribute(
    'color', new THREE.BufferAttribute(new Float32Array(TRAIL_COUNT * 3), 3)
  );

  /*
    Zarra ranglari BIR MARTA yoziladi: i-zarra doim "i qadam orqadagi"
    pozitsiyani ko'rsatadi, demak uning xiraligi ham doimiy —
    yangi (i=0) yorqin, eski (i=9) deyarli qora. AdditiveBlending'da
    qora = ko'rinmas, shuning uchun bu tayyor fade-out.
  */
  const trailColor = new THREE.Color(0xffcc66);
  for (let i = 0; i < TRAIL_COUNT; i++) {
    const fade = Math.pow(1 - i / TRAIL_COUNT, 1.6) * 0.7;
    trailGeometry.attributes.color.setXYZ(
      i, trailColor.r * fade, trailColor.g * fade, trailColor.b * fade
    );
  }

  const trailPoints = new THREE.Points(trailGeometry, new THREE.PointsMaterial({
    size: 0.22,
    map: glowTexture,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  trailPoints.raycast = () => {}; // izga bosib bo'lmaydi
  scene.add(trailPoints);

  // Oxirgi pozitsiyalar xotirasi — hammasi boshlang'ich nuqtada boshlanadi
  trailState = {
    points: trailPoints,
    history: Array.from({ length: TRAIL_COUNT }, () => new THREE.Vector3()),
    timer: 0
  };

  /* ---------- Boshlang'ich holat ---------- */

  // Uy oldida, tosh yo'lka ustida paydo bo'ladi — foydalanuvchi
  // sahifani ochganda darhol ko'zga tashlanadigan joy
  orb.position.set(1.2, BASE_Y, 5.4);
  trailState.history.forEach((v) => v.copy(orb.position));

  // Chiroqning o'zi ham dekoratsiya qatori: uy qavatlarini tanlaydigan
  // raycaster unga urilib qolmasin
  orb.traverse((obj) => { obj.raycast = () => {}; });

  scene.add(orb);

  /* ---------- Hotspotlar ---------- */

  tooltipEl = document.getElementById('orb-tooltip');

  hotspots = HOTSPOT_DEFS.map((def) => {
    /*
      Ko'rinmas marker (talabga ko'ra userData.hotspotId bilan) —
      sahnada "rasmiy manzil" bo'lib turadi; masofa hisobi va tooltip
      proyeksiyasi shu obyektning pozitsiyasidan olinadi.
    */
    const marker = new THREE.Object3D();
    marker.position.set(def.x, BASE_Y, def.z);
    marker.userData.hotspotId = def.id;
    scene.add(marker);

    return {
      id: def.id,
      position: marker.position,
      dwell: 0,
      opened: false,
      element: document.querySelector(`.secret-card[data-hotspot="${def.id}"]`)
    };
  });

  /* ---------- Boshqaruv ulanishi ---------- */
  bindKeyboard();
  bindJoystick();
  bindSecretCardClose();

  return orb;
}

/* ============================================================
   BOSHQARUV
   ============================================================ */

function bindKeyboard() {
  // event.code — klaviatura joylashuvidan mustaqil (masalan, nemis
  // klaviaturasida ham W o'sha fizik joyda)
  const map = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right'
  };

  window.addEventListener('keydown', (event) => {
    const action = map[event.code];
    if (!action) return;
    // Strelkalar sukut bo'yicha sahifani scroll qiladi — bloklaymiz
    event.preventDefault();
    keys[action] = true;
  });

  window.addEventListener('keyup', (event) => {
    const action = map[event.code];
    if (action) keys[action] = false;
  });
}

/*
  Virtual joystick: tashqi doira ichida barmoq bilan suriladigan tugmacha.
  Pointer Events ishlatiladi (touch emas) — sichqoncha bilan ham ishlaydi,
  setPointerCapture esa barmoq doiradan chiqib ketsa ham kuzatishda davom
  etadi. Doira faqat touch qurilmalarda ko'rinadi (CSS media qoidasi).
*/
function bindJoystick() {
  const base = document.getElementById('joystick');
  const knob = document.getElementById('joystick-knob');
  if (!base || !knob) return;

  const KNOB_RANGE = 34; // tugmacha markazdan necha px gacha siljiy oladi
  let activePointer = null;

  function applyInput(event) {
    const rect = base.getBoundingClientRect();
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);

    // Doiradan chiqmaslik uchun vektorni cheklaymiz
    const length = Math.hypot(dx, dy);
    if (length > KNOB_RANGE) {
      dx = (dx / length) * KNOB_RANGE;
      dy = (dy / length) * KNOB_RANGE;
    }

    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    // Ekran yuqorisi (dy < 0) = oldinga (-z) — klaviaturadagi W bilan bir xil
    joystick.x = dx / KNOB_RANGE;
    joystick.z = dy / KNOB_RANGE;
  }

  function release() {
    activePointer = null;
    joystick.x = 0;
    joystick.z = 0;
    // Markazga qaytish silliq (CSS'dagi transition ishlaydi)
    knob.style.transition = 'transform 0.15s ease';
    knob.style.transform = 'translate(0, 0)';
  }

  base.addEventListener('pointerdown', (event) => {
    activePointer = event.pointerId;
    base.setPointerCapture(event.pointerId);
    // Sudrash paytida transition o'chadi — tugmacha barmoqdan orqada
    // "sudralib" yurmasligi uchun
    knob.style.transition = 'none';
    applyInput(event);
  });
  base.addEventListener('pointermove', (event) => {
    if (event.pointerId === activePointer) applyInput(event);
  });
  base.addEventListener('pointerup', release);
  base.addEventListener('pointercancel', release);
}

/* ============================================================
   HAR KADR: HARAKAT
   ============================================================ */

export function updateOrb(dt, time) {
  if (!trailState) return; // createOrb hali chaqirilmagan

  /* ---------- Kirish → tezlanish ---------- */

  // Klaviatura va joystick qo'shiladi, [-1, 1] ga qirqiladi
  const inputX = THREE.MathUtils.clamp(
    (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + joystick.x, -1, 1
  );
  const inputZ = THREE.MathUtils.clamp(
    (keys.down ? 1 : 0) - (keys.up ? 1 : 0) + joystick.z, -1, 1
  );

  velocity.x += inputX * ACCEL * dt;
  velocity.z += inputZ * ACCEL * dt;

  /*
    Ishqalanish faqat kirish YO'Q o'qda: tugma bosilmagan zahoti jism
    keskin to'xtamaydi, eksponensial ravishda sekinlashadi (dt ga
    bog'langan — 144Hz da ham 60Hz dagidek his qilinadi).
  */
  const decay = Math.exp(-FRICTION * dt);
  if (inputX === 0) velocity.x *= decay;
  if (inputZ === 0) velocity.z *= decay;

  // Diagonal harakatda ham tezlik chegaradan oshmasin
  const speed = Math.hypot(velocity.x, velocity.z);
  if (speed > MAX_SPEED) {
    velocity.x = (velocity.x / speed) * MAX_SPEED;
    velocity.z = (velocity.z / speed) * MAX_SPEED;
  }

  orb.position.x += velocity.x * dt;
  orb.position.z += velocity.z * dt;

  /* ---------- Chegaralar va to'siqlar ---------- */

  // Hovli chetlari: devorga urilgandek — pozitsiya qirqiladi, tezlik nolga
  if (orb.position.x < BOUNDS.minX) { orb.position.x = BOUNDS.minX; velocity.x = 0; }
  if (orb.position.x > BOUNDS.maxX) { orb.position.x = BOUNDS.maxX; velocity.x = 0; }
  if (orb.position.z < BOUNDS.minZ) { orb.position.z = BOUNDS.minZ; velocity.z = 0; }
  if (orb.position.z > BOUNDS.maxZ) { orb.position.z = BOUNDS.maxZ; velocity.z = 0; }

  /*
    Uy — AABB: jism kengaytirilgan quti ichiga kirib qolsa, eng KAM
    botgan o'q bo'ylab tashqariga suriladi (bu "devor bo'ylab sirpanish"
    hissini beradi: bitta o'q to'xtaydi, ikkinchisi erkin qoladi).
  */
  const px = orb.position.x, pz = orb.position.z;
  if (Math.abs(px) < HOUSE_HALF && Math.abs(pz) < HOUSE_HALF) {
    const overlapX = HOUSE_HALF - Math.abs(px);
    const overlapZ = HOUSE_HALF - Math.abs(pz);
    if (overlapX < overlapZ) {
      orb.position.x = Math.sign(px || 1) * HOUSE_HALF;
      velocity.x = 0;
    } else {
      orb.position.z = Math.sign(pz || 1) * HOUSE_HALF;
      velocity.z = 0;
    }
  }

  // Daraxtlar, pochta qutisi, lavha — doira to'siqlar: radial surib chiqarish
  for (const c of CIRCLE_OBSTACLES) {
    const dx = orb.position.x - c.x;
    const dz = orb.position.z - c.z;
    const dist = Math.hypot(dx, dz);
    if (dist < c.r && dist > 0.0001) {
      _pushNormal.set(dx / dist, 0, dz / dist);
      orb.position.x = c.x + _pushNormal.x * c.r;
      orb.position.z = c.z + _pushNormal.z * c.r;
      // Tezlikning to'siq ICHIGA qaragan qismi olib tashlanadi,
      // urinma (tangensial) qismi qoladi — jism to'siqni aylanib o'tadi
      const inward = velocity.x * _pushNormal.x + velocity.z * _pushNormal.z;
      if (inward < 0) {
        velocity.x -= _pushNormal.x * inward;
        velocity.z -= _pushNormal.z * inward;
      }
    }
  }

  /* ---------- Balandlik: suzish + "salom" ---------- */

  // Doimiy mayin suzish (bob) — jism hech qachon qotib turmaydi
  let y = BASE_Y + Math.sin(time * 2.1) * 0.15;

  /*
    Birinchi ~2.6 soniyada "salom" sakrashi: baland-baland sakraydi,
    amplituda asta so'nadi. Bu foydalanuvchiga "men jonliman, meni
    boshqarsa bo'ladi" degan vizual taklif.
  */
  if (helloElapsed < 2.6) {
    helloElapsed += dt;
    const fade = 1 - helloElapsed / 2.6;
    y += Math.abs(Math.sin(helloElapsed * 4.2)) * 0.55 * fade;
  }

  orb.position.y = y;

  // Yorug'lik dog'i jism ostidan ergashadi
  groundPool.position.x = orb.position.x;
  groundPool.position.z = orb.position.z;

  /* ---------- Iz yangilanishi ---------- */

  trailState.timer += dt;
  if (trailState.timer > 0.045) {
    trailState.timer = 0;
    /*
      Ring almashinuvi GC'siz: eng eski vektor ro'yxat oxiridan olinib,
      joriy pozitsiya bilan to'ldiriladi va boshiga qo'yiladi —
      history[0] doim eng yangi nuqta.
    */
    const oldest = trailState.history.pop();
    oldest.copy(orb.position);
    trailState.history.unshift(oldest);
  }

  const positions = trailState.points.geometry.attributes.position;
  trailState.history.forEach((v, i) => positions.setXYZ(i, v.x, v.y, v.z));
  positions.needsUpdate = true;
}

/* ============================================================
   HAR KADR: HOTSPOTLAR
   ============================================================ */

function openSecretCard(hotspot) {
  // Bitta vaqtda faqat bitta maxfiy card ochiq turadi
  hotspots.forEach((h) => {
    if (h.element) h.element.classList.toggle('visible', h === hotspot);
  });
}

function closeSecretCard(hotspot) {
  if (hotspot.element) hotspot.element.classList.remove('visible');
}

function bindSecretCardClose() {
  document.querySelectorAll('.secret-card .card-close').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.secret-card').classList.remove('visible');
    });
  });
  // Escape maxfiy cardlarni ham yopadi (asosiy cardlar bilan bir qatorda)
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      document.querySelectorAll('.secret-card.visible')
        .forEach((card) => card.classList.remove('visible'));
    }
  });
}

export function checkHotspots(camera, dt) {
  if (!tooltipEl || hotspots.length === 0) return;

  let tooltipHotspot = null;

  hotspots.forEach((h) => {
    const distance = orb.position.distanceTo(h.position);

    if (distance < HOTSPOT_RADIUS) {
      if (!h.opened) {
        h.dwell += dt;
        if (h.dwell >= DWELL_TIME) {
          // Yetarlicha to'xtab turdi — kashfiyot ochiladi (tugma shart emas)
          h.opened = true;
          openSecretCard(h);
        } else {
          tooltipHotspot = h; // hali ochilmagan — taklif pufakchasi ko'rinadi
        }
      }
    } else if (distance > HOTSPOT_REARM) {
      /*
        Gisterezis: qayta qurollanish radiusi (2.2) trigger radiusidan (1.5)
        katta. Jism chegarada arang tebransa card ochilib-yopilib
        "lipillamaydi". Uzoqlashganda card o'zi yopiladi — "kashfiyot
        hududi" hissi.
      */
      h.dwell = 0;
      if (h.opened) {
        h.opened = false;
        closeSecretCard(h);
      }
    }
  });

  /* ---------- Tooltip'ni ekranga proyeksiyalash ---------- */

  if (tooltipHotspot) {
    _screenPos.copy(tooltipHotspot.position);
    _screenPos.y += 0.6; // pufakcha nuqtaning sal tepasida tursin
    _screenPos.project(camera); // dunyo koordinatasi → NDC (-1..1)

    // NDC → piksel; z > 1 bo'lsa nuqta kamera ORQASIDA — ko'rsatmaymiz
    if (_screenPos.z < 1) {
      tooltipEl.style.left = `${(_screenPos.x * 0.5 + 0.5) * window.innerWidth}px`;
      tooltipEl.style.top = `${(-_screenPos.y * 0.5 + 0.5) * window.innerHeight}px`;
      tooltipEl.classList.add('visible');
      return;
    }
  }

  tooltipEl.classList.remove('visible');
}
