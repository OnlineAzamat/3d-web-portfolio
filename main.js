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
    Derazaning "yonib turgan xona" fon paneli — derazadagi eng muhim
    qatlam: kuchli iliq emissive aynan "ichkarida chiroq yoniq" hissini
    beradi. Rang (0xffb84d) keyingi bosqichda derazalarga qo'yiladigan
    haqiqiy yorug'lik manbalari (PointLight) bilan BIR XIL oilada bo'lishi
    kerak — manba va uning ko'rinadigan "shishasi" birga ishlaydi.
  */
  const glowPanelMaterial = new THREE.MeshStandardMaterial({
    color: 0xffcc77,
    emissive: 0xffb84d,
    emissiveIntensity: 1.2
  });

  /*
    Shisha qatlami — iliq sarg'ish-oq, yarim shaffof va sal yaltiroq
    (roughness 0.2): orqadagi porloq fon va siluetlar biroz xiralashib
    ko'rinadi, sirtida esa yorug'lik aksi o'ynaydi — "shisha" hissi
    aynan shu ikkisining qo'shilishidan keladi.
  */
  const glassPaneMaterial = new THREE.MeshStandardMaterial({
    color: 0xffe9b3,
    transparent: true,
    opacity: 0.6,
    roughness: 0.2,
    metalness: 0
  });

  /*
    Mebel siluetlari — porloq fon USTIDA deyarli qora shakllar.
    MeshBasicMaterial ataylab: yorug'likka bog'lanmaydi, siluet har
    burchakdan bir xil "qora kontur" bo'lib o'qiladi.
  */
  const silhouetteMaterial = new THREE.MeshBasicMaterial({ color: 0x160d08 });
  // Stol lampasi — porloq fondan ham yorqinroq iliq nuqta
  const lampGlowMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a1a0a,
    emissive: 0xffc87a,
    emissiveIntensity: 1.35
  });
  // Noutbuk ekrani — sovuq-ko'k nur, iliq deraza fonida darhol ajralib turadi
  const screenGlowMaterial = new THREE.MeshStandardMaterial({
    color: 0x081020,
    emissive: 0x4d8dff,
    emissiveIntensity: 0.7
  });

  // Deraza hoshiyalari — to'q yog'och: och krem/qum devorlardan aniq
  // ajralib turadi (kontrast), eshik va karniz palitrasiga mos
  const frameMaterial = toon(0x5e3a1f);
  const trimMaterial = toon(0x8a5a3a); // qavatlar orasidagi karniz — jigarrang

  /*
    Deraza — devor yuzasiga yopishgan yupqa qatlamli "sendvich".
    (Devor yaxlit BoxGeometry bo'lgani uchun qatlamlarni devor ICHIGA
    botirib bo'lmaydi — old yuzasi to'sib qo'yadi; shuning uchun hammasi
    yuzaning ustida, millimetrik masofalarda teriladi.)

      z=0.012  porloq panel — "chiroq yoniq" nurining o'zi
      z=0.05   siluetlar    — createWindowInterior; porloq fon ustida qora shakllar
      z=0.095  shisha       — yarim shaffof, sal yaltiroq qatlam
      z=0.085  hoshiya      — 4 yupqa planka, shisha atrofida faqat kontur

    Eng bo'rtgan nuqta bor-yo'g'i ~0.11 — karnizning o'zi (0.175) dan ham
    kam, shuning uchun deraza devor bilan deyarli bir tekis o'qiladi.
  */
  const FRAME_DEPTH = 0.05; // hoshiya kontur bo'lib qoladi, qalin box emas
  const GLOW_Z = 0.012;
  const GLASS_Z = 0.095;
  const FRAME_Z = 0.085;

  function createWindow(wallGroup, position, size) {
    const { width, height } = size;
    const win = new THREE.Group();
    win.position.copy(position); // guruh asli devor YUZASIDA turadi

    // 1-qatlam: porloq fon paneli
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.14, height - 0.14, 0.02),
      glowPanelMaterial
    );
    glow.name = 'glow'; // keyin pulse'ga ulash uchun nom bilan topiladi
    glow.position.z = GLOW_Z;

    // 2-qatlam (siluetlar) createWindowInterior orqali alohida qo'shiladi

    // 3-qatlam: shisha
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.12, height - 0.12, 0.015),
      glassPaneMaterial
    );
    glass.name = 'glass';
    glass.position.z = GLASS_Z;

    // Hoshiya: to'rtta yupqa planka — yaxlit box emas, aks holda
    // hoshiyaning o'zi orqadagi qatlamlarni to'sib qo'yardi
    const t = 0.09; // planka yuz kengligi
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(width, t, FRAME_DEPTH),
      frameMaterial
    );
    top.position.set(0, height / 2 - t / 2, FRAME_Z);
    const bottom = top.clone();
    bottom.position.y = -(height / 2 - t / 2);

    const left = new THREE.Mesh(
      new THREE.BoxGeometry(t, height - 2 * t, FRAME_DEPTH),
      frameMaterial
    );
    left.position.set(-(width / 2 - t / 2), 0, FRAME_Z);
    const right = left.clone();
    right.position.x = width / 2 - t / 2;

    win.add(glow, glass, top, bottom, left, right);
    wallGroup.add(win);
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
        derazalarining porloq panellari BIR XIL speed/phase oladi — butun
        qavat go'yo bitta chiroqdan yoritilgandek sinxron "nafas oladi".
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

    /*
      Manzara porloq fon (z=0.012) va shisha (z=0.095) ORASIDA turadi.
      Z o'qi bo'yicha 0.35 ga siqiladi: mebel shakllari asli 0.1-0.16
      chuqur, yassilanmasa shishani teshib chiqardi. Siluetga chuqurlik
      baribir kerak emas — porloq fonda faqat kontur o'qiladi.
    */
    interior.position.z = 0.05;
    interior.scale.set(scale, scale, scale * 0.35);
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

  // Old derazalar — eshikning ikki yonida, devor yuzasi bilan bir tekis
  const WIN1_SIZE = { width: 0.9, height: 1.0 };
  const win1Left = createWindow(
    floor1, new THREE.Vector3(-1.45, 1.35, FLOOR1_D / 2), WIN1_SIZE
  );
  const win1Right = createWindow(
    floor1, new THREE.Vector3(1.45, 1.35, FLOOR1_D / 2), WIN1_SIZE
  );

  // Yon derazalar (chap va o'ng devorlarda bittadan)
  const win1SideR = createWindow(
    floor1, new THREE.Vector3(FLOOR1_W / 2, 1.35, 0), WIN1_SIZE
  );
  win1SideR.rotation.y = Math.PI / 2;
  const win1SideL = createWindow(
    floor1, new THREE.Vector3(-FLOOR1_W / 2, 1.35, 0), WIN1_SIZE
  );
  win1SideL.rotation.y = -Math.PI / 2;

  // Har deraza ortida — kutubxona burchagi va yonib turgan lampa
  [win1Left, win1Right, win1SideR, win1SideL].forEach((win) => {
    createWindowInterior(win, 'about');
    // Derazaning porloq fon paneli lampalar bilan bir maromda pulse
    // qiladi — speed/phase lampanikiga aynan mos
    win.getObjectByName('glow').userData.pulse = {
      base: 1.2, amp: 0.3, speed: 1.3, phase: 0
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
  const WIN2_SIZE = { width: 0.85, height: 0.95 };
  const win2Left = createWindow(
    floor2, new THREE.Vector3(-0.95, 1.15, FLOOR2_D / 2), WIN2_SIZE
  );
  const win2Right = createWindow(
    floor2, new THREE.Vector3(0.95, 1.15, FLOOR2_D / 2), WIN2_SIZE
  );

  // Yon derazalar
  const win2SideR = createWindow(
    floor2, new THREE.Vector3(FLOOR2_W / 2, 1.15, 0), WIN2_SIZE
  );
  win2SideR.rotation.y = Math.PI / 2;
  const win2SideL = createWindow(
    floor2, new THREE.Vector3(-FLOOR2_W / 2, 1.15, 0), WIN2_SIZE
  );
  win2SideL.rotation.y = -Math.PI / 2;

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
    Old frontondagi dumaloq chordoq darchasi — to'rtburchak derazalardagi
    qatlamli mantiqning aynan o'zi, faqat CircleGeometry bilan:
    porloq doira → 'skills' siluetlari (0.5 masshtab) → yarim shaffof
    shisha doira → halqa hoshiya ("illyuminator" ko'rinishi).
  */
  const atticWindow = new THREE.Group();
  atticWindow.position.set(0, 0.62, ROOF_D / 2);

  const atticGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.24, 24),
    glowPanelMaterial
  );
  atticGlow.position.z = GLOW_Z;

  const atticGlass = new THREE.Mesh(
    new THREE.CircleGeometry(0.26, 24),
    glassPaneMaterial
  );
  atticGlass.position.z = GLASS_Z;

  const atticRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.27, 0.04, 10, 24),
    frameMaterial
  );
  atticRim.position.z = FRAME_Z;

  atticWindow.add(atticGlow, atticGlass, atticRim);
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
      crownMain.name = 'crown'; // shamol tebranishi shu nom bo'yicha topadi
      crownMain.position.y = 1.85;
      const crownTop = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 12, 10),
        leafEmerald
      );
      crownTop.name = 'crown';
      crownTop.position.set(0.3, 2.5, 0.2);
      tree.add(crownMain, crownTop);
    } else {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.85, 2.2, 9),
        leafDark
      );
      cone.name = 'crown';
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

const environment = createEnvironment();
scene.add(environment);

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
   9. JONLILIK — qushlar, shamol, tutun, bulutlar
   Sahnani "muzlagan rasm"dan "yashayotgan olam"ga aylantiruvchi
   mayda harakatlar. Hammasi ATAYLAB arzon: ~12 mesh + 2 ta Points
   obyekti (18 tutun zarrasi + 130 yulduz, har biri bitta draw call) +
   11 ta pozitsiya tebranishi — har kadrda faqat sinus hisoblari,
   birorta ham yangi obyekt yaratilmaydi.
   Barcha yangilanish bitta updateAmbientAnimations(time) da jamlangan,
   uni animate() chaqiradi.
   ============================================================ */

// Barcha jonli elementlarga havolalar bir joyda — updateAmbientAnimations
// faqat shu obyekt ustida ishlaydi, sahnani qidirib yurmaydi
const ambient = { birds: [], crowns: [], clouds: [], smoke: null };

/* ---------- 9.1 Qushlar ----------
   Kechki osmonda faqat siluet ko'rinadi, shuning uchun material —
   yorug'likka bog'lanmagan qop-qora MeshBasicMaterial. Har qush:
   mayda tana + ikki yassi uchburchak qanot (3 vertexli BufferGeometry —
   bundan ham arzon geometriya bo'lmaydi). */

const birdMaterial = new THREE.MeshBasicMaterial({
  color: 0x1a1426,
  side: THREE.DoubleSide // qanot yassi — ikkala tomoni ham ko'rinishi kerak
});

// direction: +1 o'ng qanot, -1 chap qanot (uchburchak shu tomonga cho'zilgan)
function createWingGeometry(direction) {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    0, 0, 0.14,               // tanaga yopishgan old nuqta
    0, 0, -0.14,              // tanaga yopishgan orqa nuqta
    direction * 0.5, 0.04, 0  // qanot uchi — sal yuqorida (tabiiy egilish)
  ]);
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  return geometry;
}

function createBird() {
  const bird = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.07, 0.32),
    birdMaterial
  );
  const wingL = new THREE.Mesh(createWingGeometry(-1), birdMaterial);
  const wingR = new THREE.Mesh(createWingGeometry(1), birdMaterial);

  bird.add(body, wingL, wingR);
  return { bird, wingL, wingR };
}

/*
  3 ta qush — har biri o'z radiusi, balandligi, tezligi va fazasi bilan
  uy atrofida aylanadi. Bittasining tezligi manfiy — teskari yo'nalishda
  uchadi, shunda "gala bo'lib parad qilayotgan" sun'iy ko'rinish yo'qoladi.
*/
[
  { radius: 13, height: 8.5, speed: 0.22, phase: 0 },
  { radius: 16, height: 10.0, speed: 0.17, phase: 2.4 },
  { radius: 14.5, height: 9.2, speed: -0.19, phase: 4.4 }
].forEach((config) => {
  const { bird, wingL, wingR } = createBird();
  scene.add(bird);
  ambient.birds.push({ group: bird, wingL, wingR, ...config });
});

// lookAt uchun qayta ishlatiladigan vektor — har kadrda new Vector3()
// yaratib GC (garbage collector)ni bezovta qilmaslik uchun
const _birdTarget = new THREE.Vector3();

/* ---------- 9.2 Daraxt shoxlarining shamolda tebranishi ----------
   createTree ichida har barg qismiga name='crown' berilgan edi — shu
   belgini yig'ib olamiz. Har biriga o'z fazasi: hammasi bir vaqtda
   emas, navbat bilan "to'lqinlanib" tebranadi. */
let crownIndex = 0;
environment.traverse((obj) => {
  if (obj.name === 'crown') {
    ambient.crowns.push({
      mesh: obj,
      baseX: obj.position.x, // tebranish shu asl nuqta ATROFIDA bo'ladi
      baseZ: obj.position.z,
      phase: crownIndex++ * 1.7 // har daraxtga har xil faza
    });
  }
});

/* ---------- 9.3 Mo'ridan tutun ----------
   THREE.Points — 18 zarra, bitta draw call. Zarralar mo'ri tepasidan
   spiral bo'ylab ko'tarilib, tepada qaytadan pastdan boshlanadi (loop).

   Nuance: PointsMaterial'da har zarraga alohida opacity berib bo'lmaydi.
   Shuning uchun "so'nish" rang orqali qilinadi: zarra ko'tarilgani sari
   rangi och kulrangdan osmon-fog rangiga (0x2f2a55) qarab lerp qilinadi —
   qorong'i fonda bu xuddi opacity kamayganday ko'rinadi.

   Tutun ROOF group'iga qo'shiladi (sahnaga emas!) — "Skills" tanlanganda
   tom qanchaga siljisa, tutun ham birga boradi, havoda yolg'iz qolmaydi. */
const SMOKE_COUNT = 18;

const smokeGeometry = new THREE.BufferGeometry();
smokeGeometry.setAttribute(
  'position', new THREE.BufferAttribute(new Float32Array(SMOKE_COUNT * 3), 3)
);
smokeGeometry.setAttribute(
  'color', new THREE.BufferAttribute(new Float32Array(SMOKE_COUNT * 3), 3)
);

/*
  Teksturasiz PointsMaterial har zarrani KVADRAT qilib chizadi — tutunga
  yarashmaydi. Kichik canvas'da radial gradient (markazda oq, chetda
  shaffof) chizib, undan tekstura yasaymiz — zarralar yumshoq dumaloq
  "paxta" bo'lib ko'rinadi. Bir marta, bir necha millisekundda bajariladi.
*/
function createSmokeTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.55)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

const smokeMaterial = new THREE.PointsMaterial({
  size: 0.38,
  map: createSmokeTexture(),
  vertexColors: true,   // har zarraning o'z rangi — "so'nish" shu orqali
  transparent: true,
  opacity: 0.55,
  depthWrite: false     // shaffof zarralar bir-birini "kesib" tashlamasligi uchun
});

const smokePoints = new THREE.Points(smokeGeometry, smokeMaterial);
// Mo'rining tepasi (roof group lokal koordinatalarida): mo'ri (1.2, 1.05, -1.1)
// markazda, bo'yi 0.9 — demak og'zi y=1.5 da
smokePoints.position.set(1.2, 1.5, -1.1);
/*
  Raycaster Points'ni ham "ko'radi" (threshold bilan) — tutun ustiga
  kursor kelganda tom hover bo'lib qolmasligi uchun raycast o'chiriladi.
*/
smokePoints.raycast = () => {};

house.getObjectByName('roof').add(smokePoints);

ambient.smoke = {
  geometry: smokeGeometry,
  // Har zarraning loop ichidagi o'z boshlang'ich nuqtasi va spiral fazasi
  data: Array.from({ length: SMOKE_COUNT }, (_, i) => ({
    offset: i / SMOKE_COUNT,
    phase: i * 2.1
  }))
};

const _smokeColor = new THREE.Color();
const SMOKE_BRIGHT = new THREE.Color(0xb0acc0); // yangi chiqqan tutun — och kulrang
const SMOKE_FADE = new THREE.Color(0x2f2a55);   // so'nayotgani — osmon/fog rangi

/* ---------- 9.4 Bulutlar ----------
   Uch cho'zilgan sferadan bitta yassi bulut. fog: false ataylab —
   bulutlar baland va uzoqda, fog ularni butunlay yutib yuborardi;
   shaffoflik va xira binafsha-kulrang rang o'zi kifoya. */
const cloudMaterial = new THREE.MeshBasicMaterial({
  color: 0x8f88c4,
  transparent: true,
  opacity: 0.3,
  depthWrite: false,
  fog: false
});

const cloudBlobGeometry = new THREE.SphereGeometry(1, 8, 6); // hammasi baham ko'radi

function createCloud(x, y, z, scale) {
  const cloud = new THREE.Group();

  // Markaziy katta blob + ikki yondagi kichigi = klassik cartoon bulut
  [
    { px: 0, py: 0, pz: 0, sx: 1.6, sy: 0.5, sz: 0.9 },
    { px: 1.3, py: 0.1, pz: 0.2, sx: 1.0, sy: 0.38, sz: 0.7 },
    { px: -1.2, py: 0.05, pz: -0.15, sx: 1.1, sy: 0.4, sz: 0.75 }
  ].forEach((blob) => {
    const mesh = new THREE.Mesh(cloudBlobGeometry, cloudMaterial);
    mesh.position.set(blob.px, blob.py, blob.pz);
    mesh.scale.set(blob.sx, blob.sy, blob.sz);
    cloud.add(mesh);
  });

  cloud.position.set(x, y, z);
  cloud.scale.setScalar(scale);
  scene.add(cloud);
  return cloud;
}

const CLOUD_WRAP_X = 50; // shu chegaradan chiqqan bulut narigi tomondan qaytadi

[
  { x: -20, y: 14, z: -12, scale: 1.6, speed: 0.35 },
  { x: 8, y: 16.5, z: 6, scale: 1.2, speed: 0.22 },
  { x: 28, y: 13, z: -4, scale: 1.0, speed: 0.28 }
].forEach((config) => {
  ambient.clouds.push({
    group: createCloud(config.x, config.y, config.z, config.scale),
    baseX: config.x, // harakat mutlaq vaqtdan hisoblanadi — boshlang'ich nuqta kerak
    speed: config.speed
  });
});

/* ---------- 9.5 Yulduzlar ----------
   130 yulduz — bitta THREE.Points, bitta draw call. Katta radiusli
   gumbaz (dome) bo'ylab sochilgan; radius (78) tepaliklardan ancha
   narida, shuning uchun ufqqa yaqin yulduzlar tog' siluetlari ortiga
   tabiiy ravishda yashirinadi (depth test o'zi hal qiladi).

   Ikki xil harakat:
   - hammasi mayin miltillaydi (twinkle) — yorqinlik sinus bilan tebranadi;
   - dastlabki 25 tasi "yashaydi": sekin paydo bo'ladi → porlaydi →
     so'nadi, va har safar qaytadan tug'ilganda YANGI tasodifiy joyga
     ko'chadi — osmon jonli, "o'zgaruvchan" bo'lib qoladi.

   Yorqinlik bu yerda ham rang orqali (tutundagi kabi): AdditiveBlending
   bilan qora rang = ko'rinmas, shuning uchun rangni 0 ga lerp qilish
   zarrani chindan "o'chiradi".
*/
const STAR_COUNT = 130;
const STAR_RADIUS = 78; // fog(60)dan narida, camera.far(100)dan berida

const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute(
  'position', new THREE.BufferAttribute(new Float32Array(STAR_COUNT * 3), 3)
);
starGeometry.setAttribute(
  'color', new THREE.BufferAttribute(new Float32Array(STAR_COUNT * 3), 3)
);

function setRandomStarPosition(index) {
  const azimuth = Math.random() * Math.PI * 2;
  /*
    sin(elevatsiya) kamida 0.12 — yulduz ufqning o'zida turmasin
    (u yerda baribir tog'/fog bor). Qolgani gumbaz bo'ylab tekis.
  */
  const sinElev = 0.12 + Math.random() * 0.88;
  const cosElev = Math.sqrt(1 - sinElev * sinElev);

  starGeometry.attributes.position.setXYZ(
    index,
    Math.cos(azimuth) * cosElev * STAR_RADIUS,
    sinElev * STAR_RADIUS,
    Math.sin(azimuth) * cosElev * STAR_RADIUS
  );
}

const _starColor = new THREE.Color();
ambient.stars = { geometry: starGeometry, data: [] };

for (let i = 0; i < STAR_COUNT; i++) {
  setRandomStarPosition(i);

  // Rang: to'rtdan uchi sovuq oq-ko'kish, qolgani iliq sarg'ish —
  // haqiqiy osmondagi yulduzlar ham shunday aralash bo'ladi
  _starColor.setHSL(
    Math.random() > 0.75 ? 0.12 : 0.62,
    0.35,
    0.75 + Math.random() * 0.2
  );
  // Har yulduzning o'z "kattaligi" yo'q (PointsMaterial'da size yagona),
  // shuning uchun xilma-xillik bazaviy yorqinlik orqali beriladi
  const baseBrightness = 0.55 + Math.random() * 0.45;

  ambient.stars.data.push({
    r: _starColor.r * baseBrightness,
    g: _starColor.g * baseBrightness,
    b: _starColor.b * baseBrightness,
    twinkleSpeed: 0.8 + Math.random() * 2.2,
    twinklePhase: Math.random() * Math.PI * 2,
    cycle: i < 25,                           // "tug'ilib-o'chadiganlar"
    cycleSpeed: 0.03 + Math.random() * 0.05, // to'liq hayot ~13-33 soniya
    cycleOffset: Math.random(),
    lastProgress: 0 // loop qayta boshlanganini (wrap) sezish uchun
  });
}

const starMaterial = new THREE.PointsMaterial({
  size: 2.8,
  sizeAttenuation: false,        // masofadan qat'i nazar ~3px — mitti nuqta
  map: createSmokeTexture(),     // o'sha radial gradient — yulduzga ham ideal
  vertexColors: true,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending, // nur "qo'shiladi" — chekkasiz toza porlash
  fog: false                     // fog yulduzlarni yutib yubormasin
});

const stars = new THREE.Points(starGeometry, starMaterial);
stars.raycast = () => {}; // osmonga bosish tanlovga xalaqit bermasin
scene.add(stars);

/* ---------- 9.6 Markaziy yangilovchi ----------
   animate() har kadrda shuni chaqiradi. time — sekundlarda. */
function updateAmbientAnimations(time) {
  // Qushlar: aylana trayektoriya + qanot qoqish
  ambient.birds.forEach((b) => {
    const angle = time * b.speed + b.phase;
    const x = Math.cos(angle) * b.radius;
    const z = Math.sin(angle) * b.radius;
    // Balandlik ham sal to'lqinlanadi — qush "suzib" uchayotganday
    const y = b.height + Math.sin(time * 0.8 + b.phase) * 0.5;
    b.group.position.set(x, y, z);

    /*
      Qush qayoqqa qarashi kerak? Aylana harakat tangensi:
      (cos, sin)' = (-sin, cos). Tezlik manfiy qushlarda yo'nalish
      teskari — Math.sign shuni hisobga oladi.
    */
    const dir = Math.sign(b.speed);
    _birdTarget.set(x - Math.sin(angle) * dir, y, z + Math.cos(angle) * dir);
    b.group.lookAt(_birdTarget);

    // Qanotlar qarama-qarshi yo'nalishda tez qoqiladi
    const flap = Math.sin(time * 9 + b.phase * 7) * 0.55;
    b.wingR.rotation.z = flap;
    b.wingL.rotation.z = -flap;
  });

  // Daraxt shoxlari: asl nuqta atrofida juda mayda tebranish.
  // Amplituda ataylab kichik (0.035) — "bo'ron" emas, yengil epkin.
  ambient.crowns.forEach((c) => {
    c.mesh.position.x = c.baseX + Math.sin(time * 1.3 + c.phase) * 0.035;
    c.mesh.position.z = c.baseZ + Math.cos(time * 1.1 + c.phase) * 0.02;
  });

  // Tutun: har zarra 0..1 progress bo'ylab loop qiladi
  const positions = ambient.smoke.geometry.attributes.position;
  const colors = ambient.smoke.geometry.attributes.color;

  ambient.smoke.data.forEach((p, i) => {
    // % 1 — zarra tepaga yetganda avtomatik boshiga qaytadi
    const progress = (time * 0.1 + p.offset) % 1;
    // Ko'tarilgani sari spiral kengayadi — tutun "tarqalishi"
    const spread = 0.08 + progress * 0.4;

    positions.setXYZ(
      i,
      Math.sin(progress * 7 + p.phase) * spread,
      progress * 2.4,
      Math.cos(progress * 5 + p.phase) * spread * 0.7
    );

    // "So'nish": rang osmon rangiga singib boradi (izoh 9.3 da)
    _smokeColor.lerpColors(SMOKE_BRIGHT, SMOKE_FADE, progress);
    colors.setXYZ(i, _smokeColor.r, _smokeColor.g, _smokeColor.b);
  });

  positions.needsUpdate = true;
  colors.needsUpdate = true;

  // Yulduzlar: miltillash + 25 tasining "hayot davri"
  const starColors = ambient.stars.geometry.attributes.color;
  let starMoved = false;

  ambient.stars.data.forEach((s, i) => {
    // Mayin twinkle: yorqinlik 0.6..1.0 orasida tebranadi
    let brightness = 0.8 + Math.sin(time * s.twinkleSpeed + s.twinklePhase) * 0.2;

    if (s.cycle) {
      const progress = (time * s.cycleSpeed + s.cycleOffset) % 1;
      /*
        Wrap aniqlandi (progress orqaga sakradi) = yulduz "o'ldi".
        Aynan shu payt uni yangi tasodifiy joyga ko'chiramiz — u baribir
        hozir ko'rinmas (brightness≈0), sakrash ko'zga tashlanmaydi.
      */
      if (progress < s.lastProgress) {
        setRandomStarPosition(i);
        starMoved = true;
      }
      s.lastProgress = progress;

      // sin(0..π): 0 → 1 → 0 — sekin tug'iladi, porlaydi, so'nadi
      brightness *= Math.sin(progress * Math.PI);
    }

    starColors.setXYZ(i, s.r * brightness, s.g * brightness, s.b * brightness);
  });

  starColors.needsUpdate = true;
  // Pozitsiyani faqat kimdir chindan ko'chgan kadrda GPU'ga qayta yuboramiz
  if (starMoved) ambient.stars.geometry.attributes.position.needsUpdate = true;

  /*
    Bulutlar: juda sekin X bo'ylab oqadi. Pozitsiya har kadrda qo'shib
    borilmaydi — mutlaq vaqtdan hisoblanadi (144Hz ekranda bulut 60Hz
    dagidan tez oqib ketmasligi uchun). Modul arifmetikasi wrap-around'ni
    o'zi bajaradi: chegaradan chiqqan bulut narigi tomondan kirib keladi.
  */
  const range = CLOUD_WRAP_X * 2;
  ambient.clouds.forEach((c) => {
    const traveled = c.baseX + time * c.speed + CLOUD_WRAP_X;
    c.group.position.x = ((traveled % range) + range) % range - CLOUD_WRAP_X;
  });
}

/* ============================================================
   10. INTERAKTIVLIK — Raycaster: hover va tanlash
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
   11. RESIZE — oyna o'lchami o'zgarganda
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
   12. ANIMATSIYA SIKLI (animate loop)
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

  // Jonlilik: qushlar, daraxt tebranishi, tutun, bulutlar (9-bo'lim)
  updateAmbientAnimations(time);

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
