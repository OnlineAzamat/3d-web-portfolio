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

/*
  Vaqtinchalik yordamchi to'r (grid) — bo'sh sahnada kontrollar
  ishlayotganini ko'rish uchun orientir. Uy qurilganda olib tashlaymiz.
  0.01 balandlik — yer bilan ustma-ust tushib "lippillash"
  (z-fighting) bo'lmasligi uchun.
*/
const grid = new THREE.GridHelper(80, 40, 0x3a6b4a, 0x2a5a3a);
grid.position.y = 0.01;
scene.add(grid);

/* ============================================================
   6. RESIZE — oyna o'lchami o'zgarganda
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
   7. ANIMATSIYA SIKLI (animate loop)
   Har kadrda (~60 fps) sahnani qayta chizadi.
   ============================================================ */
function animate() {
  requestAnimationFrame(animate);

  // Damping (inersiya) yoqilgan bo'lsa, har kadrda update() chaqirish SHART,
  // aks holda silliq harakat ishlamaydi
  controls.update();

  renderer.render(scene, camera);
}

animate();
