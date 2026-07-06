/*
  3D Portfolio — 1-bosqich: fundament (bo'sh sahna)
  --------------------------------------------------
  Bu faylda faqat "skelet" bor: sahna, kamera, renderer, kontrollar,
  tuman (fog), yer tekisligi va animatsiya sikli.
  Uy, yorug'lik va boshqa detallar keyingi bosqichlarda qo'shiladi.
*/

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ============================================================
   1. SAHNA (Scene)
   Barcha 3D obyektlar shu konteynerga qo'shiladi.
   ============================================================ */
const scene = new THREE.Scene();

/*
  Tuman (Fog) — kechqurun atmosferasining asosi.
  Rang gradientning o'rta tonlaridan olingan (#2f2a55), shunda uzoqdagi
  obyektlar "erigan" holda CSS'dagi osmon gradientiga tabiiy qo'shilib ketadi.
  near=15: kameraga yaqin joylar toza ko'rinadi,
  far=60: shu masofadan keyin hamma narsa tumanga to'liq singib ketadi.
  scene.background ataylab qo'yilmagan — fon CSS gradient zimmasida.
*/
scene.fog = new THREE.Fog(0x2f2a55, 15, 60);

/* ============================================================
   2. KAMERA (PerspectiveCamera)
   ============================================================ */
const camera = new THREE.PerspectiveCamera(
  50,                                    // FOV — 50° tabiiy, "keng burchak" buzilishlarisiz
  window.innerWidth / window.innerHeight, // ekran nisbati
  0.1,                                   // eng yaqin ko'rinadigan masofa
  100                                    // eng uzoq masofa — fog.far(60) dan katta bo'lishi kifoya
);

/*
  Boshlang'ich pozitsiya: uy (kelajakda sahna markazida turadi) biroz
  yon tomondan va tepadan ko'rinadigan qulay burchak.
*/
camera.position.set(8, 6, 10);

/* ============================================================
   3. RENDERER (WebGLRenderer)
   ============================================================ */
const canvas = document.getElementById('scene');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true, // qirralarni silliqlaydi — arxitektura (uy) uchun juda muhim
  alpha: true      // shaffof fon — orqadagi CSS osmon gradienti ko'rinishi uchun
});

renderer.setSize(window.innerWidth, window.innerHeight);

/*
  Retina/4K ekranlarda rasm yorqin bo'lishi uchun pixel ratio'ni hisobga
  olamiz, lekin 2 bilan cheklaymiz — undan yuqorisi ko'zga sezilmaydi,
  GPU'ni esa bekorga qiynaydi.
*/
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/* ============================================================
   4. KONTROLLAR (OrbitControls)
   Foydalanuvchi uyni sichqoncha bilan aylantirib tomosha qiladi.
   ============================================================ */
const controls = new OrbitControls(camera, renderer.domElement);

/*
  Kamera nishoni — yer sathidan biroz yuqorida (kelajakdagi uyning
  o'rtasi taxminan shu balandlikda bo'ladi). Kamera doim shu nuqta
  atrofida aylanadi.
*/
controls.target.set(0, 1, 0);

controls.enablePan = false;      // surish o'chirilgan — foydalanuvchi sahnadan "adashib" ketmasin
controls.enableDamping = true;   // harakatga silliq inersiya beradi (animate'da update() shart)
controls.dampingFactor = 0.05;

/* Zoom cheklangan: juda yaqin ham, juda uzoq ham ketib bo'lmaydi */
controls.minDistance = 5;
controls.maxDistance = 25;

/*
  Vertikal burchak chegarasi: kamera yer ostiga tushib ketmasligi uchun.
  PI/2 = ufq sathi; 0.05 ayirmasi kamerani yerdan sal yuqorida ushlab turadi.
*/
controls.maxPolarAngle = Math.PI / 2 - 0.05;

/* ============================================================
   5. YER (PlaneGeometry)
   ============================================================ */
const groundGeometry = new THREE.PlaneGeometry(80, 80);

/*
  Hozircha MeshBasicMaterial — u yorug'liksiz ham ko'rinadi.
  Keyingi bosqichda yorug'lik qo'shganimizda buni MeshStandardMaterial'ga
  almashtiramiz (u soyalar va yorug'likka javob beradi).
*/
const groundMaterial = new THREE.MeshBasicMaterial({
  color: 0x1e4a2a // to'q o'tloq yashili — kechqurun qorong'ilashgan maysa
});

const ground = new THREE.Mesh(groundGeometry, groundMaterial);

/*
  PlaneGeometry sukut bo'yicha vertikal (devor kabi) turadi,
  shuning uchun uni -90° ga yotqizamiz — gorizontal yer bo'lsin.
*/
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

/* ============================================================
   6. VAQTINCHALIK YORUG'LIK
   MeshToonMaterial — yorug'likka bog'liq material: sahnada birorta
   ham yorug'lik bo'lmasa, u qop-qora ko'rinadi. Shuning uchun uy
   shakllari ko'rinishi uchun minimal "texnik" yorug'lik qo'yamiz.
   Keyingi bosqichda bular to'laqonli kechki yoritish (oy nuri,
   derazalardan taraladigan iliq nur) bilan almashtiriladi.
   ============================================================ */

/*
  HemisphereLight — tepadan osmon rangi (ko'k-binafsha), pastdan
  o'tloq aksi (yashil) tushadi. Bu sahnaga umumiy bazaviy yorug'lik beradi.
*/
const tempHemiLight = new THREE.HemisphereLight(0x9a94d8, 0x3a5a3a, 0.9);
scene.add(tempHemiLight);

/*
  DirectionalLight — bir tomondan tushadigan yo'nalishli nur.
  Busiz toon materialda "cel-shading" pog'onalari (yorug' tomon /
  soya tomon kontrasti) umuman ko'rinmaydi.
*/
const tempDirLight = new THREE.DirectionalLight(0xfff0dd, 1.3);
tempDirLight.position.set(6, 10, 5);
scene.add(tempDirLight);

/* ============================================================
   7. UY — cartoon uslubda, 3 ta interaktiv qism
   Har bir qism (floor1, floor2, roof, contact) ALOHIDA THREE.Group:
   keyingi bosqichda Raycaster sichqoncha qaysi qismga tekkanini
   aniqlaydi va group.userData orqali tegishli bo'limni (About,
   Projects, Skills, Contact) ochadi.
   ============================================================ */

/*
  Cartoon (cel-shading) effektining kaliti — gradient tekstura.
  MeshToonMaterial yorug'likni silliq emas, shu teksturadagi
  pog'onalar bo'yicha "kesib" ko'rsatadi: 4 ta qiymat = 4 ta
  yorug'lik bandi. NearestFilter shart — aks holda brauzer
  pog'onalarni yumshatib yuboradi va effekt yo'qoladi.
  Bitta tekstura barcha toon materiallarga baham ko'riladi.
*/
function createToonGradientMap() {
  const steps = new Uint8Array([80, 140, 200, 255]);
  const gradientMap = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;
  return gradientMap;
}

function createHouse() {
  const house = new THREE.Group();
  house.name = 'house';

  const gradientMap = createToonGradientMap();

  // Qisqa yordamchi: berilgan rangda cartoon material yasaydi
  const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap });

  /*
    Deraza oynasi — emissive material: yorug'liksiz ham "o'zidan nur
    sochib" ko'rinadi. Kechki sahnada derazalar xuddi ichkarida chiroq
    yongandek bo'ladi. Hamma deraza BITTA materialni bo'lishadi —
    keyinchalik nur kuchini (masalan, chiroq "yonishi"ni) bir joydan
    boshqarish oson bo'ladi.
  */
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a1a0a,          // o'chiq holatda to'q shisha rangi
    emissive: 0xffb75e,       // iliq sariq nur
    emissiveIntensity: 0.85
  });

  const frameMaterial = toon(0xfff4e0); // deraza/eshik hoshiyalari — oq-krem
  const trimMaterial = toon(0x8a5a3a);  // qavatlar orasidagi karniz — jigarrang

  /*
    Deraza yasovchi yordamchi: hoshiya (frame) + oyna (glass).
    Oyna hoshiyadan bir oz oldinroq chiqib turadi — ikki sirt
    ustma-ust tushib "lippillashi" (z-fighting) oldini oladi.
  */
  function createWindow(width, height) {
    const win = new THREE.Group();

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 0.12),
      frameMaterial
    );
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.16, height - 0.16, 0.14),
      glassMaterial
    );

    win.add(frame, glass);
    return win;
  }

  /* ---------- 1-QAVAT — "About Me" (keng asos) ---------- */
  const FLOOR1_W = 4.4, FLOOR1_H = 2.4, FLOOR1_D = 4.4;

  const floor1 = new THREE.Group();
  floor1.name = 'floor1';
  floor1.position.y = 0;
  // Raycaster uchun metadata; originalY — hover'da qavatni ko'tarib,
  // keyin joyiga qaytarish uchun boshlang'ich balandlik
  floor1.userData = { id: 'about', title: 'About Me', originalY: 0 };

  const walls1 = new THREE.Mesh(
    new THREE.BoxGeometry(FLOOR1_W, FLOOR1_H, FLOOR1_D),
    toon(0xf5e3c0) // krem devorlar
  );
  walls1.position.y = FLOOR1_H / 2; // box markazdan o'lchanadi, asosini yerga qo'yamiz
  floor1.add(walls1);

  // Qavat tepasidagi karniz — cartoon uslubga xos qalin ajratuvchi chiziq
  const trim1 = new THREE.Mesh(
    new THREE.BoxGeometry(FLOOR1_W + 0.35, 0.2, FLOOR1_D + 0.35),
    trimMaterial
  );
  trim1.position.y = FLOOR1_H;
  floor1.add(trim1);

  // Eshik — old tomonning markazida, devordan sal chiqib turadi
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 1.7, 0.1),
    toon(0x7a4a28)
  );
  door.position.set(0, 0.85, FLOOR1_D / 2 + 0.05);
  floor1.add(door);

  // Eshikdagi kichik darcha — u ham nur sochadi
  const doorWindow = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.3, 0.12),
    glassMaterial
  );
  doorWindow.position.set(0, 1.4, FLOOR1_D / 2 + 0.06);
  floor1.add(doorWindow);

  // Ostona toshi
  const doorStep = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.12, 0.5),
    toon(0x9a9aa5)
  );
  doorStep.position.set(0, 0.06, FLOOR1_D / 2 + 0.25);
  floor1.add(doorStep);

  // Old derazalar — eshikning ikki yonida
  const win1Left = createWindow(0.9, 1.0);
  win1Left.position.set(-1.45, 1.35, FLOOR1_D / 2 + 0.02);
  const win1Right = createWindow(0.9, 1.0);
  win1Right.position.set(1.45, 1.35, FLOOR1_D / 2 + 0.02);
  floor1.add(win1Left, win1Right);

  // Yon derazalar (chap va o'ng devorlarda bittadan)
  const win1SideR = createWindow(0.9, 1.0);
  win1SideR.rotation.y = Math.PI / 2;
  win1SideR.position.set(FLOOR1_W / 2 + 0.02, 1.35, 0);
  const win1SideL = createWindow(0.9, 1.0);
  win1SideL.rotation.y = -Math.PI / 2;
  win1SideL.position.set(-(FLOOR1_W / 2 + 0.02), 1.35, 0);
  floor1.add(win1SideR, win1SideL);

  house.add(floor1);

  /* ---------- 2-QAVAT — "Projects" (torroq) ---------- */
  const FLOOR2_W = 3.6, FLOOR2_H = 2.1, FLOOR2_D = 3.6;
  const FLOOR2_BASE = FLOOR1_H + 0.1; // 1-qavat karnizining ustidan boshlanadi

  const floor2 = new THREE.Group();
  floor2.name = 'floor2';
  floor2.position.y = FLOOR2_BASE;
  floor2.userData = { id: 'projects', title: 'Projects', originalY: FLOOR2_BASE };

  const walls2 = new THREE.Mesh(
    new THREE.BoxGeometry(FLOOR2_W, FLOOR2_H, FLOOR2_D),
    toon(0xeac89a) // 1-qavatdan farqli — iliq qum/shaftoli rang
  );
  walls2.position.y = FLOOR2_H / 2;
  floor2.add(walls2);

  const trim2 = new THREE.Mesh(
    new THREE.BoxGeometry(FLOOR2_W + 0.3, 0.2, FLOOR2_D + 0.3),
    trimMaterial
  );
  trim2.position.y = FLOOR2_H;
  floor2.add(trim2);

  // Old tomonda ikkita deraza
  const win2Left = createWindow(0.85, 0.95);
  win2Left.position.set(-0.95, 1.15, FLOOR2_D / 2 + 0.02);
  const win2Right = createWindow(0.85, 0.95);
  win2Right.position.set(0.95, 1.15, FLOOR2_D / 2 + 0.02);
  floor2.add(win2Left, win2Right);

  // Yon derazalar
  const win2SideR = createWindow(0.85, 0.95);
  win2SideR.rotation.y = Math.PI / 2;
  win2SideR.position.set(FLOOR2_W / 2 + 0.02, 1.15, 0);
  const win2SideL = createWindow(0.85, 0.95);
  win2SideL.rotation.y = -Math.PI / 2;
  win2SideL.position.set(-(FLOOR2_W / 2 + 0.02), 1.15, 0);
  floor2.add(win2SideR, win2SideL);

  house.add(floor2);

  /* ---------- TOM — "Skills" (uchburchak prizma) ---------- */
  const ROOF_W = 4.4, ROOF_H = 1.8, ROOF_D = 4.6; // 2-qavatdan kengroq — soyabon effekti
  const ROOF_BASE = FLOOR2_BASE + FLOOR2_H + 0.1; // 2-qavat karnizi ustidan

  const roof = new THREE.Group();
  roof.name = 'roof';
  roof.position.y = ROOF_BASE;
  roof.userData = { id: 'skills', title: 'Skills', originalY: ROOF_BASE };

  /*
    Uchburchak kesimni Shape bilan chizib, ExtrudeGeometry orqali
    orqaga cho'zamiz — klassik ikki nishabli (gable) tom hosil bo'ladi.
  */
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-ROOF_W / 2, 0);
  roofShape.lineTo(ROOF_W / 2, 0);
  roofShape.lineTo(0, ROOF_H);
  roofShape.closePath();

  const roofGeometry = new THREE.ExtrudeGeometry(roofShape, {
    depth: ROOF_D,
    bevelEnabled: false
  });
  roofGeometry.translate(0, 0, -ROOF_D / 2); // ekstruziya +z ga ketadi, markazga suramiz

  const roofMesh = new THREE.Mesh(roofGeometry, toon(0xb0452e)); // to'q g'isht-qizil
  roof.add(roofMesh);

  // Old frontondagi dumaloq chordoq darchasi — emissive
  const atticWindow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.1, 24),
    glassMaterial
  );
  atticWindow.rotation.x = Math.PI / 2; // silindrni old tomonga qaratamiz
  atticWindow.position.set(0, 0.62, ROOF_D / 2 + 0.02);
  roof.add(atticWindow);

  // Mo'ri — tom nishabiga botirib qo'yilgan
  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.9, 0.5),
    trimMaterial
  );
  chimney.position.set(1.2, 1.05, -1.1);
  roof.add(chimney);

  house.add(roof);

  /* ---------- POCHTA QUTISI — "Contact" ---------- */
  const contact = new THREE.Group();
  contact.name = 'contact';
  contact.position.set(2.6, 0, 3.4); // eshik yo'lagining o'ng tomonida
  contact.rotation.y = -0.35;        // biroz kameraga qaragan
  contact.userData = { id: 'contact', title: 'Contact', originalY: 0 };

  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 1.0, 0.14),
    toon(0x7a4a28)
  );
  post.position.y = 0.5;

  const mailboxBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.36, 0.62),
    toon(0x4a6fa5) // ko'k quti — iliq uy fonida yaxshi ajralib turadi
  );
  mailboxBody.position.y = 1.12;

  // Old qopqoqdagi xat tirqishi — emissive, keyin "yonadi"
  const mailSlot = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.06, 0.05),
    glassMaterial
  );
  mailSlot.position.set(0, 1.14, 0.31);

  // Qizil bayroqcha — pochta qutisining klassik belgisi
  const flagPole = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.3, 0.05),
    toon(0xd94f3d)
  );
  flagPole.position.set(0.24, 1.35, -0.15);
  const flag = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.12, 0.22),
    toon(0xd94f3d)
  );
  flag.position.set(0.24, 1.47, -0.06);

  contact.add(post, mailboxBody, mailSlot, flagPole, flag);
  house.add(contact);

  return house;
}

const house = createHouse();
scene.add(house);

/* ============================================================
   8. INTERAKTIVLIK — Raycaster: hover va tanlash
   Mexanika:
   - hover:  kursor qavat ustida → cursor 'pointer' + qavat 1.03x
             kattalashadi (silliq lerp bilan, animate() ichida)
   - click:  qavat yon-yuqoriga chiqadi, qolganlari xiralashadi,
             onSectionSelect(id) chaqiriladi
   - qayta click (o'sha qavat yoki bo'sh joy) → hammasi asl holatga
   ============================================================ */

const ANIM_DURATION = 450; // ms — barcha tanlash animatsiyalari uchun yagona muddat

// Tanlangan qavat qancha siljiydi: yon tomonga +3, biroz yuqoriga
const SELECT_OFFSET = new THREE.Vector3(3, 0.6, 0);

// Interaktiv guruhlar — uy ichidagi userData.id ga ega to'rttasi
const interactiveGroups = house.children.filter((child) => child.userData.id);

/*
  Materiallarni guruh bo'yicha ajratamiz. Uy qurilganda oyna, hoshiya
  va karniz materiallari guruhlar o'rtasida BAHAM ko'rilgan edi — endi
  bir guruhning opacity'sini o'zgartirsak boshqalariga ta'sir qilmasligi
  uchun har bir mesh materialning o'z nusxasini (clone) oladi.
  Guruhning barcha materiallari userData.materials ro'yxatida turadi —
  xiralashtirish animatsiyasi shu ro'yxat ustida ishlaydi.
*/
interactiveGroups.forEach((group) => {
  const materials = [];
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.material = obj.material.clone();
      /*
        transparent boshidanoq yoqib qo'yiladi. Sabab: three.js shaderni
        material birinchi render bo'lganda kompilyatsiya qiladi va
        transparent=false bo'lsa unga OPAQUE define kiradi — alpha doim
        1.0 ga majburlanadi. Keyin transparent'ni yoqish needsUpdate
        (shader qayta kompilyatsiyasi) talab qiladi va har bosishda
        qoqilish (hitch) beradi. Shu 30 ga yaqin material uchun doimiy
        transparent rejim arzonroq va xavfsizroq.
      */
      obj.material.transparent = true;
      materials.push(obj.material);
    }
  });
  group.userData.materials = materials;
  // Asl pozitsiya to'liq vektor sifatida (contact'da x/z ham noldan farqli)
  group.userData.basePosition = group.position.clone();
  // Hover uchun maqsad masshtab — animate() har kadrda shunga intiladi
  group.userData.targetScale = 1;
});

/* ---------- Mini-tween tizimi ----------
   Har bir animatsiya: boshlanish vaqti + davomiylik + onUpdate(k),
   bunda k — 0..1 oralig'ida ease qilingan progress. animate() har
   kadrda updateTweens() ni chaqiradi. `key` bir xil bo'lgan eski tween
   bekor qilinadi — tez-tez bosilganda animatsiyalar to'qnashmasligi uchun. */
const activeTweens = new Map();

// Klassik ease-in-out: sekin boshlanadi, tezlashadi, sekin to'xtaydi
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function startTween(key, duration, onUpdate, onComplete) {
  activeTweens.set(key, { start: performance.now(), duration, onUpdate, onComplete });
}

function updateTweens(now) {
  for (const [key, tw] of activeTweens) {
    const t = Math.min((now - tw.start) / tw.duration, 1);
    tw.onUpdate(easeInOutCubic(t));
    if (t === 1) {
      activeTweens.delete(key);
      if (tw.onComplete) tw.onComplete();
    }
  }
}

/* ---------- Guruh animatsiyalari ---------- */

// Guruhni berilgan nuqtaga silliq ko'chiradi
function animateGroupPosition(group, targetPos) {
  const startPos = group.position.clone();
  startTween(`pos:${group.userData.id}`, ANIM_DURATION, (k) => {
    group.position.lerpVectors(startPos, targetPos, k);
  });
}

// Guruhning barcha materiallarini berilgan opacity'ga olib boradi
// (materiallar setup'da doimiy transparent qilib qo'yilgan — bu yerda
// faqat opacity qiymati animatsiya qilinadi)
function animateGroupOpacity(group, targetOpacity) {
  const materials = group.userData.materials;
  const startOpacities = materials.map((m) => m.opacity);

  startTween(`opacity:${group.userData.id}`, ANIM_DURATION, (k) => {
    materials.forEach((m, i) => {
      m.opacity = THREE.MathUtils.lerp(startOpacities[i], targetOpacity, k);
    });
  });
}

/* ---------- Tanlash holati ---------- */

let selectedGroup = null;

/* ---------- HTML card'lar bilan bog'lanish ---------- */

const infoCards = document.querySelectorAll('.info-card');

/*
  Bo'lim tanlanganda: mos card'ga .visible klassi qo'shiladi —
  chiqish/kirish animatsiyasining o'zi CSS transition zimmasida
  (desktopda chapdan, mobilda pastdan slayd). Qolganlari yopiladi.
*/
function onSectionSelect(id) {
  infoCards.forEach((card) => {
    card.classList.toggle('visible', card.dataset.section === id);
  });
}

function onSectionDeselect() {
  infoCards.forEach((card) => card.classList.remove('visible'));
}

function selectGroup(group) {
  selectedGroup = group;

  // Tanlangan qavat: asl joyidan yon-yuqoriga chiqadi, to'liq ravshan
  const target = group.userData.basePosition.clone().add(SELECT_OFFSET);
  animateGroupPosition(group, target);
  animateGroupOpacity(group, 1);

  // Qolganlari: joyiga qaytadi (agar oldin boshqasi tanlangan bo'lsa) va xiralashadi
  interactiveGroups.forEach((other) => {
    if (other !== group) {
      animateGroupPosition(other, other.userData.basePosition);
      animateGroupOpacity(other, 0.3);
    }
  });

  onSectionSelect(group.userData.id);
}

function deselectAll() {
  if (!selectedGroup) return;
  selectedGroup = null;

  interactiveGroups.forEach((group) => {
    animateGroupPosition(group, group.userData.basePosition);
    animateGroupOpacity(group, 1);
  });

  onSectionDeselect();
}

/* ---------- Raycasting ---------- */

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

/*
  Kursor ostidagi interaktiv guruhni topadi.
  Raycaster mesh'ga (masalan, derazaga) tegadi — undan yuqoriga,
  userData.id ga ega ota-guruhgacha ko'tarilamiz.
*/
function pickGroup(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(interactiveGroups, true);
  if (hits.length === 0) return null;

  let obj = hits[0].object;
  while (obj && !obj.userData.id) obj = obj.parent;
  return obj;
}

/* ---------- Hodisalar ---------- */

/*
  Hodisa card USTIDA yuz berdimi? Card canvas ustidagi HTML qatlam —
  usiz card ustida yurgan sichqoncha "orqasidagi" uyga ham tegib,
  hover/tanlov chalkashardi (masalan, card ichidagi tugmani bosish
  orqadagi bo'sh joyga bosish deb qabul qilinib, cardni yopib yuborardi).
*/
function isEventOnCard(event) {
  return event.target instanceof Element && event.target.closest('.info-card');
}

window.addEventListener('mousemove', (event) => {
  if (isEventOnCard(event)) {
    // Card ustida 3D hover o'chadi; kursorni card o'zi boshqaradi
    document.body.style.cursor = 'default';
    interactiveGroups.forEach((g) => { g.userData.targetScale = 1; });
    return;
  }

  const group = pickGroup(event);

  // Bosish mumkinligini kursor shakli bilan bildiramiz
  document.body.style.cursor = group ? 'pointer' : 'default';

  // Hover qilingan guruh kattalashish maqsadini oladi, qolganlari — 1.
  // Haqiqiy masshtablash animate() ichida silliq lerp bilan bo'ladi.
  interactiveGroups.forEach((g) => {
    g.userData.targetScale = g === group ? 1.03 : 1;
  });
});

/*
  OrbitControls bilan aylantirish ham mouseup'da 'click' hodisasini
  chiqaradi. Foydalanuvchi shunchaki kamerani burayotganda tasodifan
  qavat tanlanib qolmasligi uchun bosish boshlangan nuqtani eslab,
  qo'yib yuborilgunicha 6px dan ko'p siljigan bo'lsa — e'tiborsiz
  qoldiramiz (bu "drag", "click" emas).
*/
let pointerDownAt = null;

window.addEventListener('pointerdown', (event) => {
  pointerDownAt = { x: event.clientX, y: event.clientY };
});

window.addEventListener('click', (event) => {
  if (isEventOnCard(event)) return; // card ichidagi bosishlar 3D ga tegmaydi

  if (pointerDownAt) {
    const moved = Math.hypot(
      event.clientX - pointerDownAt.x,
      event.clientY - pointerDownAt.y
    );
    if (moved > 6) return; // bu kamera aylantirish edi, tanlov emas
  }

  const group = pickGroup(event);

  if (!group || group === selectedGroup) {
    // Bo'sh joyga yoki tanlangan qavatning o'ziga bosildi — asl holat
    deselectAll();
  } else {
    selectGroup(group);
  }
});

/*
  Ikki tomonlama deselect: card'dagi "×" tugmasi ham xuddi bo'sh
  joyga bosilgandek ishlaydi — deselectAll() qavatni joyiga qaytaradi,
  u esa onSectionDeselect() orqali card'ni yopadi. Yagona "haqiqat
  manbai" — 3D tanlov holati; UI doim unga ergashadi.
*/
document.querySelectorAll('.card-close').forEach((btn) => {
  btn.addEventListener('click', () => deselectAll());
});

// Escape ham cardni yopadi — klaviatura foydalanuvchilari uchun qulaylik
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') deselectAll();
});

/* ============================================================
   9. RESIZE — oyna o'lchami o'zgarganda
   ============================================================ */
window.addEventListener('resize', () => {
  // Kameraning ekran nisbatini yangilaymiz, aks holda rasm cho'ziladi
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // Renderer ham yangi o'lchamga moslashadi
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/* ============================================================
   10. ANIMATSIYA SIKLI (animate loop)
   Har kadrda (~60 fps) sahnani qayta chizadi.
   ============================================================ */
function animate() {
  requestAnimationFrame(animate);

  // Damping (inersiya) yoqilgan bo'lsa, har kadrda update() chaqirish SHART,
  // aks holda silliq harakat ishlamaydi
  controls.update();

  // Tanlash/xiralashtirish tween'larini yangilaymiz
  updateTweens(performance.now());

  /*
    Hover masshtabi: har guruh o'z targetScale (1 yoki 1.03) tomon
    har kadrda 15% yaqinlashadi — bu oddiy eksponensial lerp, keskin
    sakrashsiz yumshoq "nafas olish" effekti beradi.
  */
  interactiveGroups.forEach((group) => {
    const s = THREE.MathUtils.lerp(group.scale.x, group.userData.targetScale, 0.15);
    group.scale.setScalar(s);
  });

  renderer.render(scene, camera);
}

animate();
