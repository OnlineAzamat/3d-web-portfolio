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

  /*
    Katta derazalarning O'ZINING oynasi — yarim shaffof: orqadagi ichki
    siluetlar "parda ortidan" xira ko'rinadi. Emissive ataylab pasaytirilgan
    (0.3), aks holda oynaning o'z nuri ichkaridagi manzarani yuvib yuborardi.
    glassMaterial (0.85, xira emas) eshik darchasi va xat tirqishi kabi
    mayda, "ichi ko'rinmaydigan" nur nuqtalari uchun qoladi.
  */
  const windowGlassMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a1a0a,
    emissive: 0xffb75e,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.65
  });

  /*
    Ichki manzara materiallari. Maqsad fotorealizm emas — "kimdir uyda"
    hissi: iliq xona foni ustida to'q siluetlar. MeshBasicMaterial ataylab
    tanlangan: yorug'likka bog'lanmaydi (siluet doim bir xil o'qiladi)
    va toon materialdan arzonroq.
  */
  const roomMaterial = new THREE.MeshBasicMaterial({ color: 0x3b2214 });      // xona foni — iliq to'q jigarrang
  const silhouetteMaterial = new THREE.MeshBasicMaterial({ color: 0x160d08 }); // mebel siluetlari — deyarli qora
  // Stol lampasi — xonadagi asosiy "hayot" nuqtasi, iliq nur sochadi
  const lampGlowMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a1a0a,
    emissive: 0xffc87a,
    emissiveIntensity: 1.35
  });
  // Noutbuk ekrani — xira sovuq-ko'k nur (kodlash tungi sessiyasi!)
  const screenGlowMaterial = new THREE.MeshStandardMaterial({
    color: 0x081020,
    emissive: 0x4d8dff,
    emissiveIntensity: 0.7
  });

  const frameMaterial = toon(0xfff4e0); // deraza/eshik hoshiyalari — oq-krem
  const trimMaterial = toon(0x8a5a3a);  // qavatlar orasidagi karniz — jigarrang

  /*
    Deraza endi yassi panel emas — "diorama qutisi".
    Sabab: devorlar yaxlit BoxGeometry, ichida haqiqiy xona yo'q. Obyektni
    devor ICHIGA qo'ysak, devorning old yuzasi uni to'sib qo'yadi. Shuning
    uchun har deraza o'zi bilan kichik chuqurlik olib keladi:

      orqa panel (xona foni) → siluetlar → yarim shaffof oyna
      z = -0.17                z ≈ -0.1     z = +0.17

    Hoshiya to'rtta alohida planka (yaxlit box emas!) — aks holda hoshiyaning
    o'zi ham siluetlarni to'sardi. Guruh devor yuzasidan WINDOW_DEPTH/2 ga
    chiqarib joylashtiriladi, shunda orqa panel devor yuzasiga yopishadi.
  */
  const WINDOW_DEPTH = 0.4;

  function createWindow(width, height) {
    const win = new THREE.Group();
    const t = 0.09; // hoshiya plankasining qalinligi

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(width, t, WINDOW_DEPTH),
      frameMaterial
    );
    top.position.y = height / 2 - t / 2;
    const bottom = top.clone();
    bottom.position.y = -(height / 2 - t / 2);

    const left = new THREE.Mesh(
      new THREE.BoxGeometry(t, height - 2 * t, WINDOW_DEPTH),
      frameMaterial
    );
    left.position.x = -(width / 2 - t / 2);
    const right = left.clone();
    right.position.x = width / 2 - t / 2;

    // Xona foni — usiz oynadan devorning krem tashqi yuzasi ko'rinib qolardi
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.06, height - 0.06, 0.05),
      roomMaterial
    );
    back.position.z = -WINDOW_DEPTH / 2 + 0.03;

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.16, height - 0.16, 0.05),
      windowGlassMaterial
    );
    glass.name = 'glass'; // keyin pulse'ga ulash uchun nom bilan topiladi
    glass.position.z = WINDOW_DEPTH / 2 - 0.03;

    win.add(top, bottom, left, right, back, glass);
    return win;
  }

  /*
    Deraza ortidagi ichki manzara. `win` guruhining o'ziga qo'shiladi —
    deraza qavat group'i ichida turgani uchun ichki manzara ham qavat
    bilan birga ko'tariladi/siljiydi (tanlash animatsiyasida ortda
    qolib ketmaydi) va deraza qaysi tomonga qaragan bo'lsa (rotation.y),
    manzara ham avtomatik o'sha tomonga buriladi.

    Uch tur — uch hikoya:
      'about'    — kitob javoni + yonib turgan stol lampasi
      'projects' — ish stoli + ochiq noutbuk (ko'k ekran nuri)
      'skills'   — raflar, ustidagi asbob-idish siluetlari
  */
  function createWindowInterior(win, type, scale = 1) {
    const interior = new THREE.Group();
    interior.name = `interior-${type}`;

    if (type === 'about') {
      // Kitob javoni: ikki polka, har birida bo'yi har xil kitoblar qatori
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.035, 0.1),
        silhouetteMaterial
      );
      board.position.set(-0.16, -0.02, 0);
      const board2 = board.clone();
      board2.position.y = -0.28;
      interior.add(board, board2);

      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 4; i++) {
          const book = new THREE.Mesh(
            new THREE.BoxGeometry(0.055, 0.12 + ((i + row) % 3) * 0.025, 0.08),
            silhouetteMaterial
          );
          book.position.set(
            -0.31 + i * 0.075,
            (row === 0 ? 0.07 : -0.19),
            0
          );
          interior.add(book);
        }
      }

      // Stol lampasi: tagi + oyoq siluet, qalpoq esa nur sochadi
      const lampBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.03, 0.12),
        silhouetteMaterial
      );
      lampBase.position.set(0.24, -0.34, 0);
      const lampStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.24, 6),
        silhouetteMaterial
      );
      lampStem.position.set(0.24, -0.21, 0);
      const lampShade = new THREE.Mesh(
        new THREE.ConeGeometry(0.09, 0.11, 12),
        lampGlowMaterial
      );
      lampShade.position.set(0.24, -0.05, 0);
      /*
        Pulse metadata: animate() bu belgini ko'rib emissiveIntensity'ni
        sinus bo'yicha tebrantiradi. Barcha 'about' lampalari va 1-qavat
        oynalari BIR XIL speed/phase oladi — butun qavat go'yo bitta
        chiroqdan yoritilgandek sinxron "nafas oladi".
      */
      lampShade.userData.pulse = { base: 1.35, amp: 0.35, speed: 1.3, phase: 0 };
      interior.add(lampBase, lampStem, lampShade);
    }

    if (type === 'projects') {
      // Ish stoli va oyoqlari
      const desk = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.035, 0.16),
        silhouetteMaterial
      );
      desk.position.set(0, -0.16, 0);
      const legL = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.22, 0.14),
        silhouetteMaterial
      );
      legL.position.set(-0.24, -0.28, 0);
      const legR = legL.clone();
      legR.position.x = 0.24;
      interior.add(desk, legL, legR);

      // Noutbuk: tagi siluet, ekrani xira ko'k nur — tungi kod sessiyasi
      const laptopBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.02, 0.14),
        silhouetteMaterial
      );
      laptopBase.position.set(0.03, -0.13, 0.02);
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.17, 0.02),
        screenGlowMaterial
      );
      screen.position.set(0.03, -0.05, -0.05);
      screen.rotation.x = -0.18; // biroz orqaga yotgan ochiq ekran
      interior.add(laptopBase, screen);

      // Bir chekkada kofe krujkasi — mayda, lekin hikoya to'liq bo'ladi
      const mug = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8),
        silhouetteMaterial
      );
      mug.position.set(-0.19, -0.11, 0.02);
      interior.add(mug);
    }

    if (type === 'skills') {
      // Ikki qavatli raf — ustida idish-asboblar qatori
      const shelfTop = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.03, 0.12),
        silhouetteMaterial
      );
      shelfTop.position.set(0, 0.1, 0);
      const shelfBottom = shelfTop.clone();
      shelfBottom.position.y = -0.18;
      interior.add(shelfTop, shelfBottom);

      const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.1, 8),
        silhouetteMaterial
      );
      jar.position.set(-0.15, 0.17, 0);
      const box1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.08, 0.09),
        silhouetteMaterial
      );
      box1.position.set(0.03, 0.16, 0);
      const box2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.12, 0.07),
        silhouetteMaterial
      );
      box2.position.set(0.16, 0.18, 0);
      // Pastki rafda yotiq bolg'a siluetiga o'xshash shakl
      const tool = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.035, 0.05),
        silhouetteMaterial
      );
      tool.position.set(-0.08, -0.15, 0);
      const toolHead = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.07, 0.06),
        silhouetteMaterial
      );
      toolHead.position.set(-0.16, -0.14, 0);
      interior.add(jar, box1, box2, tool, toolHead);
    }

    // Manzara orqa panelga yaqin turadi — oynadan qarasangiz chuqurlik seziladi
    interior.position.z = -0.05;
    interior.scale.setScalar(scale);
    win.add(interior);
    return interior;
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

  /*
    Old derazalar — eshikning ikki yonida.
    Diraza guruhi devor yuzasidan WINDOW_DEPTH/2 ga chiqariladi —
    diorama qutisining orqa paneli aynan devor yuzasiga tegib turadi.
  */
  const win1Left = createWindow(0.9, 1.0);
  win1Left.position.set(-1.45, 1.35, FLOOR1_D / 2 + WINDOW_DEPTH / 2);
  const win1Right = createWindow(0.9, 1.0);
  win1Right.position.set(1.45, 1.35, FLOOR1_D / 2 + WINDOW_DEPTH / 2);
  floor1.add(win1Left, win1Right);

  // Yon derazalar (chap va o'ng devorlarda bittadan)
  const win1SideR = createWindow(0.9, 1.0);
  win1SideR.rotation.y = Math.PI / 2;
  win1SideR.position.set(FLOOR1_W / 2 + WINDOW_DEPTH / 2, 1.35, 0);
  const win1SideL = createWindow(0.9, 1.0);
  win1SideL.rotation.y = -Math.PI / 2;
  win1SideL.position.set(-(FLOOR1_W / 2 + WINDOW_DEPTH / 2), 1.35, 0);
  floor1.add(win1SideR, win1SideL);

  // Har deraza ortida — kutubxona burchagi va yonib turgan lampa
  const floor1Windows = [win1Left, win1Right, win1SideR, win1SideL];
  floor1Windows.forEach((win) => {
    createWindowInterior(win, 'about');
    // Oynaning tashqi nuri lampalar bilan bir maromda pulse qiladi —
    // speed/phase lampanikiga aynan mos (createWindowInterior ichiga qarang)
    win.getObjectByName('glass').userData.pulse = {
      base: 0.3, amp: 0.12, speed: 1.3, phase: 0
    };
  });

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
  win2Left.position.set(-0.95, 1.15, FLOOR2_D / 2 + WINDOW_DEPTH / 2);
  const win2Right = createWindow(0.85, 0.95);
  win2Right.position.set(0.95, 1.15, FLOOR2_D / 2 + WINDOW_DEPTH / 2);
  floor2.add(win2Left, win2Right);

  // Yon derazalar
  const win2SideR = createWindow(0.85, 0.95);
  win2SideR.rotation.y = Math.PI / 2;
  win2SideR.position.set(FLOOR2_W / 2 + WINDOW_DEPTH / 2, 1.15, 0);
  const win2SideL = createWindow(0.85, 0.95);
  win2SideL.rotation.y = -Math.PI / 2;
  win2SideL.position.set(-(FLOOR2_W / 2 + WINDOW_DEPTH / 2), 1.15, 0);
  floor2.add(win2SideR, win2SideL);

  // 2-qavat — ish xonasi: har deraza ortida stol, noutbuk va ko'k ekran nuri
  [win2Left, win2Right, win2SideR, win2SideL].forEach((win) => {
    createWindowInterior(win, 'projects');
  });

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

  /*
    Old frontondagi dumaloq chordoq darchasi — endi u ham mini-diorama:
    orqa disk (xona foni) → asboblar silueti → yarim shaffof oyna →
    old tomonda halqa hoshiya. Ichidagi manzara — 'skills' turi, lekin
    darcha kichik bo'lgani uchun 0.5 masshtabda.
  */
  const atticWindow = new THREE.Group();
  atticWindow.position.set(0, 0.62, ROOF_D / 2 + 0.14);

  const atticBack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.05, 24),
    roomMaterial
  );
  atticBack.rotation.x = Math.PI / 2; // diskni old tomonga qaratamiz
  atticBack.position.z = -0.12;

  const atticGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.04, 24),
    windowGlassMaterial
  );
  atticGlass.rotation.x = Math.PI / 2;
  atticGlass.position.z = 0.06;

  // Halqa hoshiya — darchaga "illyuminator" ko'rinishi beradi
  const atticRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.27, 0.05, 10, 24),
    frameMaterial
  );
  atticRim.position.z = 0.08;

  atticWindow.add(atticBack, atticGlass, atticRim);
  createWindowInterior(atticWindow, 'skills', 0.5);
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
   8. ATROF-MUHIT (Environment)
   Uy endi "bo'shliqda muallaq" emas — jonli hovli ichida turadi:
   daraxtlar, tosh yo'lka, hovli chetidagi butalar, uzoqdagi tepalik
   siluetlari va rang-barang yer.

   MUHIM: bu yerdagi HECH BIR obyekt raycaster'ga tushmaydi.
   pickGroup() faqat interactiveGroups (uy qavatlari) ichida qidiradi,
   shuning uchun daraxt yoki toshga bosilsa card ochilmaydi — bu
   ataylab shunday: butun atrof faqat dekoratsiya.
   ============================================================ */

/*
  Deterministik "tasodifiylik" (oddiy LCG generator).
  Math.random() o'rniga shuni ishlatamiz: har safar sahifa yangilanganda
  daraxtlar, toshlar va butalar AYNAN bir xil joyda turadi — sahna
  "sakrab" o'zgarmaydi, lekin joylashuv baribir tabiiy-tartibsiz ko'rinadi.
*/
function createSeededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function createEnvironment() {
  const environment = new THREE.Group();
  environment.name = 'environment';

  const gradientMap = createToonGradientMap();
  const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap });
  const rand = createSeededRandom(7);

  /*
    Materiallar oldindan, BIR marta yaratiladi va barcha nusxalar
    o'rtasida baham ko'riladi — 5 ta daraxt + o'nlab buta/tosh uchun
    alohida material yaratish GPU'ga ortiqcha yuk bo'lardi.
  */
  const trunkMaterial = toon(0x6b4226);  // daraxt tanasi — jigarrang
  const leafDark = toon(0x1d5c33);       // to'q yashil barglar
  const leafEmerald = toon(0x2e7d4f);    // zumrad tusli barglar (ikkinchi qatlam)
  const stoneMaterial = toon(0xb8b0a0);  // yo'lka toshlari — och kulrang-bej
  const bushMaterial = toon(0x1c4a2a);   // butalar — eng to'q yashil

  /* ---------- Daraxtlar ----------
     Past-poly cartoon daraxt: silindr tana + ustida sfera yoki konus
     shaklidagi "barg bulutlari". Har chaqiriq turli joylashuv va
     masshtab bilan yangi nusxa qaytaradi. */
  function createTree(x, z, scale) {
    const tree = new THREE.Group();

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.26, 1.3, 8),
      trunkMaterial
    );
    trunk.position.y = 0.65;
    tree.add(trunk);

    /*
      Ikki xil daraxt turi navbatlashadi:
      - yumaloq (ikki sfera — katta pastki + kichik "cho'qqi") — bargli daraxt
      - konussimon (bitta cho'zilgan konus) — archa
      Turlar aralashligi hovlini bir xillikdan qutqaradi.
    */
    if (rand() > 0.45) {
      const crownMain = new THREE.Mesh(
        new THREE.SphereGeometry(0.95, 12, 10),
        leafDark
      );
      crownMain.position.y = 1.85;
      const crownTop = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 12, 10),
        leafEmerald
      );
      crownTop.position.set(0.3, 2.5, 0.2);
      tree.add(crownMain, crownTop);
    } else {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.85, 2.2, 9),
        leafDark
      );
      cone.position.y = 2.1;
      tree.add(cone);
    }

    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    tree.rotation.y = rand() * Math.PI * 2; // har biri o'z tomoniga "qaragan"
    return tree;
  }

  // Uydan yiroqroqda, yo'lka (x≈0..2, z=3..9) va pochta qutisiga tegmaydigan joylarda
  environment.add(
    createTree(-6.5, 2.5, 1.15),
    createTree(-8.5, -3.5, 1.4),
    createTree(6.5, -5.5, 1.0),
    createTree(9.0, 2.0, 1.25),
    createTree(-4.5, 8.0, 0.85)
  );

  /* ---------- Tosh yo'lka ----------
     Eshikdan (z≈2.7) boshlab kameraning boshlang'ich tomoni sari
     cho'ziladi va oxiriga borib sekin +x ga (kamera turgan tarafga)
     buriladi — bu egri chiziq tomoshabin nigohini eshikka olib boradi.
     Har tosh biroz turlicha o'lchamda va qiya burchakda — qo'lda
     terilgan tabiiy yo'lka taassurotini beradi. */
  const STONE_COUNT = 9;
  for (let i = 0; i < STONE_COUNT; i++) {
    const t = i / (STONE_COUNT - 1); // 0 (eshik oldi) .. 1 (yo'lka oxiri)
    const stone = new THREE.Mesh(
      new THREE.BoxGeometry(
        0.75 + rand() * 0.25, // har toshning eni har xil
        0.08,                 // yassi plita
        0.5 + rand() * 0.15
      ),
      stoneMaterial
    );
    stone.position.set(
      t * t * 2.0 + (rand() - 0.5) * 0.35, // kvadratik drift: oxirida +x ga buriladi
      0.04,                                 // yerdan sal ko'tarilgan — z-fighting oldini oladi
      3.0 + t * 6.5
    );
    stone.rotation.y = (rand() - 0.5) * 0.5; // ±14° gacha tartibsiz burchak
    environment.add(stone);
  }

  /* ---------- Butalar (past to'siq) ----------
     Hovlining orqa va ikki yon chetida qator butalar — "bu yerdan
     hovli tugaydi" degan yumshoq chegara hissi. Old tomon (+z, yo'lka
     chiqadigan taraf) ataylab ochiq qoldirilgan — kirish taklifi. */
  function createBush(x, z, scale) {
    const bush = new THREE.Group();
    // 2-3 ta bir-biriga kirishib turgan sfera = bitta g'uj buta
    const blobs = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < blobs; i++) {
      const r = 0.3 + rand() * 0.18;
      const blob = new THREE.Mesh(
        new THREE.SphereGeometry(r, 10, 8),
        bushMaterial
      );
      blob.position.set(
        (rand() - 0.5) * 0.5,
        r * 0.75, // pastroq "cho'kkan" — sferaning bir qismi yerda
        (rand() - 0.5) * 0.4
      );
      bush.add(blob);
    }
    bush.position.set(x, 0, z);
    bush.scale.setScalar(scale);
    return bush;
  }

  const YARD = 7.4; // hovli chegarasi (uy markazidan)
  for (let i = -3; i <= 3; i++) {
    const step = i * 1.9;
    // orqa qator (z = -YARD)
    environment.add(createBush(step + (rand() - 0.5) * 0.6, -YARD, 0.8 + rand() * 0.5));
    // chap va o'ng qatorlar (x = ±YARD)
    environment.add(createBush(-YARD, step + (rand() - 0.5) * 0.6, 0.8 + rand() * 0.5));
    environment.add(createBush(YARD, step + (rand() - 0.5) * 0.6, 0.8 + rand() * 0.5));
  }

  /* ---------- Uzoqdagi tepaliklar ----------
     Kamera diapazoni (maxDistance=25) dan ancha narida, fog (15..60)
     ichiga chuqur botgan past-poly konuslar. MeshBasicMaterial ataylab:
     yorug'lik hisobi keraksiz — bular faqat siluet, fog ularni osmon
     rangiga o'zi qorishtiradi va sahnaga chuqurlik beradi. */
  const hillMaterial = new THREE.MeshBasicMaterial({ color: 0x3a3468 });
  const HILL_COUNT = 8;
  for (let i = 0; i < HILL_COUNT; i++) {
    // to'liq aylana bo'ylab, biroz notekis qadam bilan
    const angle = (i / HILL_COUNT) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const distance = 33 + rand() * 6; // yer tekisligi (40) ichida qoladi
    const height = 3.5 + rand() * 3.5;

    const hill = new THREE.Mesh(
      // 5 qirrali konus — "low-poly tog'" silueti uchun yetarli
      new THREE.ConeGeometry(7 + rand() * 6, height, 5),
      hillMaterial
    );
    hill.position.set(
      Math.cos(angle) * distance,
      height / 2, // konus markazdan o'lchanadi — asosini yerga qo'yamiz
      Math.sin(angle) * distance
    );
    hill.rotation.y = rand() * Math.PI;
    environment.add(hill);
  }

  return environment;
}

scene.add(createEnvironment());

/*
  Yer rangini boyitish: bir tekis yashil o'rniga vertex colors.
  Formula oddiy: uyga yaqin joy ochroq (chiroq yorug'i tushgandek),
  chekkalar to'qroq (qorong'ilikka singib ketadi), ustiga sinuslardan
  yasalgan arzon "noise" — maysa dog'-dog' bo'lib, jonli ko'rinadi.
  Shader yozilmagan — hammasi bir marta, geometriya darajasida hisoblanadi.
*/
function enhanceGround() {
  // Vertex colors ko'rinishi uchun tekislik segmentlarga bo'linadi:
  // har segment burchagida o'z rangi bo'ladi, oralari silliq aralashadi
  const geometry = new THREE.PlaneGeometry(80, 80, 64, 64);

  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);

  const innerColor = new THREE.Color(0x2a5f3a); // uy atrofi — ochroq maysa
  const outerColor = new THREE.Color(0x142e1d); // chekkalar — tungi to'q yashil
  const color = new THREE.Color();

  for (let i = 0; i < positions.count; i++) {
    // Plane hali yotqizilmagan: lokal x/y — kelajakdagi gorizontal koordinatalar
    const x = positions.getX(i);
    const y = positions.getY(i);

    const distance = Math.hypot(x, y); // markazdan (uydan) uzoqlik
    // Ikki chastotali sinus to'ri — haqiqiy noise'ning soddalashgan o'rinbosari
    const noise =
      Math.sin(x * 0.35 + y * 0.2) * Math.sin(x * 0.15 - y * 0.4) * 0.5 +
      Math.sin(x * 1.1) * Math.sin(y * 0.9) * 0.5;

    const t = THREE.MathUtils.clamp(distance / 38 + noise * 0.07, 0, 1);
    color.lerpColors(innerColor, outerColor, t);

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  ground.geometry.dispose(); // eski segmentsiz geometriyani xotiradan bo'shatamiz
  ground.geometry = geometry;
  ground.material.vertexColors = true;
  // Material rangi vertex ranglariga KO'PAYtiriladi — oq qilamiz,
  // aks holda eski to'q yashil hamma vertex rangini xiralashtirardi
  ground.material.color.set(0xffffff);
  ground.material.needsUpdate = true; // shader qayta kompilyatsiyasi uchun signal
}

enhanceGround();

/* ============================================================
   9. INTERAKTIVLIK — Raycaster: hover va tanlash
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
      /*
        Har material o'zining "asl" opacity'sini eslab qoladi. Bu muhim:
        deraza oynalari boshidanoq 0.65 shaffof — xiralashtirish/tiklash
        animatsiyasi ularni 1.0 ga emas, har doim O'Z bazasiga qaytarishi
        kerak (aks holda birinchi tanlovdan keyin oynalar xira bo'lib,
        ichki manzara ko'rinmay qolardi).
      */
      obj.material.userData.baseOpacity = obj.material.opacity;
      materials.push(obj.material);
    }
  });
  group.userData.materials = materials;
  // Asl pozitsiya to'liq vektor sifatida (contact'da x/z ham noldan farqli)
  group.userData.basePosition = group.position.clone();
  // Hover uchun maqsad masshtab — animate() har kadrda shunga intiladi
  group.userData.targetScale = 1;
});

/*
  Pulse qiluvchi materiallar ro'yxati — lampalar va 1-qavat oynalari.
  MUHIM: bu yig'ish yuqoridagi clone() siklidan KEYIN turibdi — mesh'lar
  endi materialning shaxsiy nusxasiga ega, shuning uchun bu ro'yxatga
  aynan sahnada ko'rinadigan (klonlangan) materiallar tushadi. Oldinroq
  yig'ilganda asl (endi ishlatilmaydigan) materiallar tebranib, ekranda
  hech narsa o'zgarmasdi.
*/
const pulsingMaterials = [];
house.traverse((obj) => {
  if (obj.isMesh && obj.userData.pulse) {
    pulsingMaterials.push({ material: obj.material, ...obj.userData.pulse });
  }
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

// Guruhning barcha materiallarini berilgan KOEFFITSIYENTGA olib boradi:
// 1 = har material o'zining asl (baseOpacity) holatida, 0.3 = xiralashgan.
// Mutlaq qiymat emas, koeffitsiyent ishlatiladi — chunki deraza oynalari
// asli 0.65 shaffof, ularni "to'liq ravshan" holatda ham 1.0 ga emas,
// 0.65 ga qaytarish kerak.
function animateGroupOpacity(group, factor) {
  const materials = group.userData.materials;
  const startOpacities = materials.map((m) => m.opacity);

  startTween(`opacity:${group.userData.id}`, ANIM_DURATION, (k) => {
    materials.forEach((m, i) => {
      m.opacity = THREE.MathUtils.lerp(
        startOpacities[i],
        m.userData.baseOpacity * factor,
        k
      );
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
   10. RESIZE — oyna o'lchami o'zgarganda
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
   11. ANIMATSIYA SIKLI (animate loop)
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
    "Kimdir uyda" pulsi: lampalar va 1-qavat oynalari nuri sinus bo'yicha
    sekin kuchayib-pasayadi. Hammasi bir xil speed/phase bilan belgilangan,
    shuning uchun butun 1-qavat bir maromda "nafas oladi".
  */
  const time = performance.now() * 0.001;
  pulsingMaterials.forEach((p) => {
    p.material.emissiveIntensity = p.base + Math.sin(time * p.speed + p.phase) * p.amp;
  });

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
