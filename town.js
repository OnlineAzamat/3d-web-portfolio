/*
  LOYIHALAR SHAHARCHASI (v1.0)
  --------------------------------------------------
  Uy hovlisi atrofida halqa yo'l va uning bo'yida 8 ta bino: har biri
  data.js dagi bitta loyihaning (yoki loyihalar guruhining) "uyi".
  Bino shakli loyihaning o'zini eslatadi: ERP — ofis, do'kon daftari —
  qurilish mollari do'koni, POS — baqqollik kioski, DocSense — tomida
  ochiq kitobli kutubxona va h.k.

  main.js bilan shartnoma — createTown({ gradientMap }) qaytaradi:
    group         — sahnaga qo'shiladigan THREE.Group
    stations[]    — { id, def, group, position, toCenter, height }
                    (group.userData.id bor — raycaster shu orqali taniydi)
    update(time)  — har kadr: tishli g'ildirak, to'lqinlar, o'yin taxtasi...
    glowMaterials — derazalar/chiroqlar (kun/tun almashinuvi boshqaradi)
    nightMaterials— faqat tunda ko'rinadigan nur dog'lari
    obstacles[]   — uchar chiroq uchun doira to'siqlar { x, z, r }
*/

import * as THREE from 'three';
import { STATIONS } from './data.js';

export const ROAD_RADIUS = 12.5;  // halqa yo'l o'rta chizig'i
const ROAD_WIDTH = 1.7;
const LOT_RADIUS = 17.6;          // binolar markazi shu aylanada
const FIRST_ANGLE = THREE.MathUtils.degToRad(67.5); // birinchi bino: old-o'ng tomonda
const ANGLE_STEP = -Math.PI / 4;  // soat mili bo'ylab har 45°

export function createTown({ gradientMap }) {
  const town = new THREE.Group();
  town.name = 'town';

  const glowMaterials = [];
  const nightMaterials = [];
  const animators = [];
  const obstacles = [];

  /* ---------- Material va mesh yordamchilari ---------- */

  // Bir xil rangdagi toon material qayta yaratilmaydi — keshdan olinadi
  const toonCache = new Map();
  const toon = (color) => {
    if (!toonCache.has(color)) {
      toonCache.set(color, new THREE.MeshToonMaterial({ color, gradientMap }));
    }
    return toonCache.get(color);
  };

  /*
    Nur sochuvchi material (deraza, ekran, chiroq). Asos rangi to'q shisha:
    kunduzi emissive pasaytirilganda deraza "o'chgan oyna" bo'lib ko'rinadi.
    baseEmissive — kun/tun koeffitsiyenti shu qiymatga ko'paytiriladi.
  */
  const glow = (emissive, intensity = 1, color = 0x2c3a48) => {
    const material = new THREE.MeshStandardMaterial({
      color, emissive, emissiveIntensity: intensity, roughness: 0.6
    });
    material.userData.baseEmissive = intensity;
    glowMaterials.push(material);
    return material;
  };

  const put = (parent, geometry, material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const box = (p, w, h, d, m, x, y, z) => put(p, new THREE.BoxGeometry(w, h, d), m, x, y, z);
  const cyl = (p, rt, rb, h, m, x, y, z, seg = 14) =>
    put(p, new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
  const ball = (p, r, m, x, y, z) => put(p, new THREE.SphereGeometry(r, 12, 10), m, x, y, z);

  // Ikki nishabli tom / fronton: uchburchak kesim, chuqurlik bo'ylab cho'zilgan
  const prism = (p, w, h, d, m, x, y, z) => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(0, h);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    geometry.translate(0, 0, -d / 2);
    return put(p, geometry, m, x, y, z);
  };

  /* ---------- Canvas teksturalar: yozuvlar va yumshoq dog'lar ---------- */

  function radialTexture(stops) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([at, color]) => g.addColorStop(at, color));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }

  const lightTexture = radialTexture([
    [0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']
  ]);
  const shadowTexture = radialTexture([
    [0, 'rgba(0,0,0,0.55)'], [0.55, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']
  ]);

  const FONT = '"Quicksand", "Trebuchet MS", "Segoe UI", sans-serif';

  // Fasad yozuvi: rangli taxtacha ustida matn
  function signTexture(text, bg, fg) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = 76;
    do { // matn taxtachaga sig'guncha shrift kichrayadi
      ctx.font = `700 ${size}px ${FONT}`;
      size -= 4;
    } while (ctx.measureText(text).width > 460);
    ctx.fillText(text, 256, 68);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  function facadeSign(parent, text, w, h, bg, fg, x, y, z) {
    box(parent, w + 0.14, h + 0.14, 0.08, toon(0x3a2a20), x, y, z - 0.05);
    return put(
      parent,
      new THREE.PlaneGeometry(w, h),
      // 0.82 — yozuv bloom chegarasidan pastda qoladi, tunda "kuyib" ketmaydi
      new THREE.MeshBasicMaterial({ map: signTexture(text, bg, fg), color: 0xd0d0d0 }),
      x, y, z
    );
  }

  // Bino tepasida suzib turadigan nom yorlig'i (doim kameraga qaraydi)
  function labelSprite(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `700 54px ${FONT}`;
    const textWidth = Math.ceil(ctx.measureText(text).width);
    canvas.width = textWidth + 96;
    canvas.height = 112;

    ctx.font = `700 54px ${FONT}`; // canvas o'lchami o'zgarsa kontekst tiklanadi
    ctx.fillStyle = 'rgba(26, 24, 48, 0.88)';
    ctx.strokeStyle = 'rgba(255, 183, 94, 0.9)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(6, 6, canvas.width - 12, canvas.height - 12, 50);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe2b0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 3);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, color: 0xc8c8c8, transparent: true, depthWrite: false
    }));
    const height = 0.72;
    sprite.scale.set(height * (canvas.width / canvas.height), height, 1);
    return sprite;
  }

  // Chiziqli soyabon (do'kon/kiosk peshtoqi): ikki rang navbatlashgan taxtachalar
  function awning(parent, width, depth, count, colorA, colorB, x, y, z) {
    const group = new THREE.Group();
    const w = width / count;
    for (let i = 0; i < count; i++) {
      box(group, w, 0.07, depth, toon(i % 2 ? colorB : colorA), -width / 2 + w / 2 + i * w, 0, 0);
    }
    group.position.set(x, y, z);
    group.rotation.x = 0.38; // old tomoni pastga egilgan
    parent.add(group);
    return group;
  }

  /* ============================================================
     BINOLAR — har biri lokal koordinatada quriladi, old tomoni +z
     (keyin butun guruh shaharcha markaziga qaratib buriladi).
     Funksiya binoning balandligini qaytaradi — yorliq shundan tepaga qo'yiladi.
     ============================================================ */

  const builders = {
    /* ---- Ortopromed ERP/CRM: ofis binosi + dala xizmati furgoni ---- */
    office(g) {
      const wall = toon(0xeef2f3);
      const teal = toon(0x1f9d8f);
      const windowGlow = glow(0xffd58a, 1.0);

      box(g, 5.0, 0.12, 3.8, toon(0x9a9aa5), 0, 0.06, 0);
      box(g, 3.4, 2.6, 2.4, wall, -0.5, 1.42, -0.3);
      box(g, 3.6, 0.22, 2.6, teal, -0.5, 2.83, -0.3);
      box(g, 1.5, 0.9, 1.4, wall, -1.1, 3.39, -0.4);
      box(g, 1.62, 0.14, 1.52, teal, -1.1, 3.91, -0.4);

      // Derazalar: yuqori qatorda 4 ta, pastda eshik ikki yonida 2 ta
      for (let c = 0; c < 4; c++) {
        box(g, 0.5, 0.55, 0.06, windowGlow, -1.7 + c * 0.8, 2.05, 0.91);
        if (c === 0 || c === 3) box(g, 0.5, 0.55, 0.06, windowGlow, -1.7 + c * 0.8, 1.0, 0.91);
      }
      box(g, 0.95, 1.45, 0.08, glow(0x9be8dc, 0.7), -0.5, 0.85, 0.91); // shisha eshik
      box(g, 1.3, 0.1, 0.5, teal, -0.5, 1.68, 1.1);                    // eshik ayvonchasi

      // Tibbiy xoch — tomdagi blok fasadida yonib turadi
      const cross = glow(0x35e0c8, 1.5, 0x0f5a52);
      box(g, 0.62, 0.2, 0.08, cross, -1.1, 3.4, 0.33);
      box(g, 0.2, 0.62, 0.08, cross, -1.1, 3.4, 0.33);

      // Furgon: texniklar hududlarga shu bilan chiqadi
      const van = new THREE.Group();
      box(van, 0.85, 0.72, 1.15, wall, 0, 0.62, -0.25);
      box(van, 0.85, 0.5, 0.55, wall, 0, 0.51, 0.6);
      box(van, 0.87, 0.14, 1.15, teal, 0, 0.6, -0.25);
      box(van, 0.74, 0.26, 0.05, toon(0x2a3b47), 0, 0.62, 0.89);
      const headlight = glow(0xfff0b0, 1.4);
      box(van, 0.14, 0.09, 0.04, headlight, -0.28, 0.4, 0.89);
      box(van, 0.14, 0.09, 0.04, headlight, 0.28, 0.4, 0.89);
      [[-0.43, -0.55], [0.43, -0.55], [-0.43, 0.5], [0.43, 0.5]].forEach(([x, z]) => {
        cyl(van, 0.19, 0.19, 0.14, toon(0x22252b), x, 0.19, z).rotation.z = Math.PI / 2;
      });
      van.position.set(1.85, 0.12, 0.75);
      van.rotation.y = -0.35;
      g.add(van);

      return 4.0;
    },

    /* ---- Nukus Tools: qurilish mollari do'koni ---- */
    shop(g) {
      const wall = toon(0xd9a35b);
      box(g, 4.8, 0.12, 3.8, toon(0x9a9aa5), 0, 0.06, 0);
      box(g, 3.6, 2.1, 2.5, wall, -0.3, 1.17, -0.4);
      box(g, 3.8, 0.3, 2.7, toon(0x8a5a3a), -0.3, 2.37, -0.4); // parapet
      awning(g, 3.5, 0.9, 7, 0xc8442f, 0xf3ead8, -0.3, 1.75, 1.2);

      box(g, 1.9, 0.95, 0.06, glow(0xffc070, 1.1), -0.9, 1.0, 0.86); // vitrina
      box(g, 0.75, 1.4, 0.08, toon(0x6b3f22), 0.85, 0.82, 0.86);     // eshik
      box(g, 0.3, 0.2, 0.1, glow(0xffc070, 1.0), 0.85, 1.2, 0.87);
      facadeSign(g, 'NUKUS TOOLS', 2.5, 0.55, '#22303f', '#ffd27a', -0.3, 2.85, 0.6);

      // G'isht taxlami
      const brick = toon(0xb5533c);
      for (let layer = 0; layer < 3; layer++) {
        for (let i = 0; i < 3 - layer; i++) {
          box(g, 0.5, 0.2, 0.3, brick, 1.65 + i * 0.54 - (2 - layer) * 0.27 + 0.27, 0.22 + layer * 0.21, 1.25);
        }
      }
      // Devorga suyab qo'yilgan taxtalar
      const plank = toon(0xc9a36b);
      [0, 1, 2].forEach((i) => {
        const p = box(g, 0.16, 2.0, 0.06, plank, 1.75 + i * 0.2, 1.05, 0.3 - i * 0.04);
        p.rotation.x = -0.22;
      });
      // Bo'yoq chelaklari
      cyl(g, 0.17, 0.15, 0.3, toon(0x4a6fa5), -2.05, 0.27, 1.25);
      cyl(g, 0.17, 0.15, 0.3, toon(0xd94f3d), -1.65, 0.27, 1.4);

      return 3.2;
    },

    /* ---- Sanaq POS: baqqollik kioski, peshtaxtada kassa ---- */
    kiosk(g) {
      const green = toon(0x3fa66b);
      box(g, 4.6, 0.12, 3.6, toon(0x9a9aa5), 0, 0.06, 0);
      box(g, 3.2, 1.9, 2.2, green, 0, 1.07, -0.4);
      box(g, 3.4, 0.22, 2.4, toon(0xf3ead8), 0, 2.12, -0.4);
      awning(g, 3.2, 0.95, 8, 0x2f8a56, 0xf3ead8, 0, 1.72, 1.05);

      // Ochiq savdo oynasi — ichkaridan iliq yorug'lik
      box(g, 2.4, 0.85, 0.06, glow(0xffd58a, 1.15), 0, 1.25, 0.71);
      box(g, 2.7, 0.1, 0.5, toon(0x8a5a3a), 0, 0.8, 0.9); // peshtaxta

      // Kassa apparati: yashil ekrani doim yoniq — "oflayn ham ishlaydi"
      box(g, 0.42, 0.22, 0.3, toon(0x2a3b47), 0.75, 0.96, 0.9);
      const screen = box(g, 0.34, 0.24, 0.04, glow(0x59f0a0, 1.5, 0x0d3a24), 0.75, 1.17, 0.84);
      screen.rotation.x = -0.3;

      facadeSign(g, 'SANAQ', 1.7, 0.5, '#f3ead8', '#1f6b41', 0, 2.55, 0.5);

      // Meva-sabzavot yashiklari
      const crate = toon(0xa9773f);
      const produce = [0xf39c12, 0xd94f3d, 0x7fc25a];
      produce.forEach((color, i) => {
        const x = -1.3 + i * 0.75;
        const c = box(g, 0.62, 0.3, 0.45, crate, x, 0.3, 1.45);
        c.rotation.x = -0.25;
        for (let k = 0; k < 5; k++) {
          ball(g, 0.11, toon(color), x - 0.2 + (k % 3) * 0.2, 0.5 + (k > 2 ? 0.07 : 0), 1.42 + (k > 2 ? -0.08 : 0.06));
        }
      });

      return 3.0;
    },

    /* ---- DocSense: kutubxona, tomida ochiq kitob — satrlar navbat bilan yonadi ---- */
    library(g) {
      const stone = toon(0xcfc4e6);
      const dark = toon(0x4b3f7a);
      box(g, 4.8, 0.12, 3.8, toon(0x9a9aa5), 0, 0.06, 0);
      box(g, 3.5, 2.4, 2.5, stone, 0, 1.32, -0.4);
      box(g, 3.75, 0.24, 2.75, dark, 0, 2.64, -0.4);

      // Baland tor derazalar va eshik
      const windowGlow = glow(0xffd58a, 0.8);
      [-1.25, -0.65, 0.65, 1.25].forEach((x) => box(g, 0.34, 1.3, 0.06, windowGlow, x, 1.45, 0.86));
      box(g, 0.8, 1.5, 0.08, dark, 0, 0.87, 0.86);
      box(g, 0.5, 0.3, 0.1, windowGlow, 0, 1.3, 0.87);
      facadeSign(g, 'DOCSENSE', 1.7, 0.36, '#3a3068', '#ffe2b0', 0, 2.3, 0.87);

      // Ochiq kitob: ikki sahifa "V" shaklida
      const book = new THREE.Group();
      const pageMaterial = toon(0xfff6e0);
      const lines = [];
      [-1, 1].forEach((side) => {
        const page = new THREE.Group();
        box(page, 1.45, 0.08, 1.9, pageMaterial, side * 0.74, 0, 0);
        box(page, 1.5, 0.06, 1.96, dark, side * 0.74, -0.07, 0); // muqova
        for (let i = 0; i < 4; i++) {
          // Har satr o'z materialiga ega — bittasini alohida "yoritish" uchun
          const material = new THREE.MeshStandardMaterial({ color: 0x8a86a0, emissive: 0xffd23a, emissiveIntensity: 0 });
          lines.push(box(page, 1.05, 0.03, 0.16, material, side * 0.74, 0.055, -0.62 + i * 0.4));
        }
        page.rotation.z = side * 0.3;
        book.add(page);
      });
      book.position.set(0, 3.1, -0.4);
      book.rotation.x = 0.5; // kameraga (shaharcha markaziga) qaratib egilgan
      g.add(book);

      /*
        "Javob manbasi topildi": har ~1.2 soniyada navbatdagi satr sariq
        marker bilan bo'yalgandek yonadi — DocSense'ning asosiy g'oyasi.
      */
      animators.push((time) => {
        const active = Math.floor(time / 1.2) % lines.length;
        lines.forEach((line, i) => {
          const on = i === active;
          line.material.emissiveIntensity = on ? 1.5 : 0;
          line.material.color.set(on ? 0xffd23a : 0x8a86a0);
        });
      });

      return 4.4;
    },

    /* ---- Dots and Boxes: ulkan o'yin taxtasi, o'yin o'zi o'ynalib turadi ---- */
    arcade(g) {
      box(g, 4.6, 0.12, 3.6, toon(0x9a9aa5), 0, 0.06, 0);
      box(g, 3.8, 0.5, 2.2, toon(0x2d3561), 0, 0.37, -0.2);
      box(g, 3.9, 0.1, 2.3, toon(0xffb75e), 0, 0.66, -0.2);

      const board = new THREE.Group();
      box(board, 3.3, 3.3, 0.16, toon(0x1b2040), 0, 0, 0);
      box(board, 3.5, 3.5, 0.1, toon(0xffb75e), 0, 0, -0.08);

      const N = 5;          // 5×5 nuqta = 4×4 katak
      const CELL = 0.66;
      const at = (i) => -((N - 1) * CELL) / 2 + i * CELL;

      const dotMaterial = glow(0xffffff, 1.2, 0x555566);
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) ball(board, 0.075, dotMaterial, at(c), at(r), 0.1);
      }

      const red = glow(0xff4d6d, 1.3, 0x5a1420);
      const blue = glow(0x3db8ff, 1.3, 0x10405e);
      const redFill = new THREE.MeshBasicMaterial({ color: 0x8a2a3c });
      const blueFill = new THREE.MeshBasicMaterial({ color: 0x1f5f8a });

      /*
        Ssenariy: yurishlar ketma-ketligi. ['h'|'v', qator, ustun] — chiziq,
        ['box', qator, ustun, o'yinchi] — yopilgan katak. Yurishlar navbat
        bilan paydo bo'ladi, oxirida taxta tozalanib qayta boshlanadi.
      */
      const script = [
        ['h', 0, 0], ['v', 0, 0], ['h', 1, 0], ['v', 0, 1], ['box', 0, 0, 0],
        ['h', 0, 1], ['h', 1, 1], ['v', 0, 2], ['box', 0, 1, 1],
        ['v', 1, 3], ['h', 2, 2], ['v', 1, 2], ['h', 1, 2], ['box', 1, 2, 0],
        ['h', 3, 1], ['v', 2, 1], ['v', 2, 2], ['h', 2, 1], ['box', 2, 1, 1],
        ['v', 3, 0], ['h', 4, 0], ['h', 3, 0], ['v', 3, 1], ['box', 3, 0, 0]
      ];
      const moves = script.map((step, index) => {
        const [type, r, c, player] = step;
        const material = index % 2 ? blue : red;
        let mesh;
        if (type === 'h') mesh = box(board, CELL - 0.16, 0.07, 0.05, material, at(c) + CELL / 2, at(r), 0.1);
        else if (type === 'v') mesh = box(board, 0.07, CELL - 0.16, 0.05, material, at(c), at(r) + CELL / 2, 0.1);
        else mesh = box(board, CELL - 0.2, CELL - 0.2, 0.03, player ? blueFill : redFill, at(c) + CELL / 2, at(r) + CELL / 2, 0.09);
        mesh.visible = false;
        return mesh;
      });

      animators.push((time) => {
        // Har 0.45s da bitta yurish; oxirida 3s to'liq taxta ko'rinib turadi
        const shown = Math.floor(time / 0.45) % (moves.length + 7);
        moves.forEach((mesh, i) => { mesh.visible = i < shown; });
      });

      board.position.set(0, 2.45, -0.5);
      board.rotation.x = -0.28;
      g.add(board);
      // Taxta tirgaklari
      box(g, 0.16, 1.9, 0.16, toon(0x2d3561), -1.3, 1.5, -1.1);
      box(g, 0.16, 1.9, 0.16, toon(0x2d3561), 1.3, 1.5, -1.1);

      return 4.6;
    },

    /* ---- Karakalpak TTS: o'tov (qora uy) + ovoz to'lqinlari tarqatuvchi minora ---- */
    yurt(g) {
      const felt = toon(0xe8dcc0);
      const ornament = toon(0xb0452e);
      box(g, 4.8, 0.1, 4.0, toon(0xb9a27c), 0, 0.05, 0);

      cyl(g, 1.75, 1.75, 1.35, felt, -0.6, 0.77, -0.3, 20);
      cyl(g, 1.78, 1.78, 0.16, ornament, -0.6, 1.2, -0.3, 20);   // bezakli belbog'
      cyl(g, 1.78, 1.78, 0.08, toon(0x2a6f97), -0.6, 0.98, -0.3, 20);
      cyl(g, 0.5, 1.9, 0.95, toon(0xdccdaa), -0.6, 1.92, -0.3, 20); // gumbaz
      put(g, new THREE.TorusGeometry(0.5, 0.07, 8, 20), toon(0x8a5a3a), -0.6, 2.4, -0.3)
        .rotation.x = Math.PI / 2;                                // shanaraq
      cyl(g, 0.46, 0.46, 0.04, glow(0xffb75e, 1.2), -0.6, 2.39, -0.3, 16); // o'choq nuri

      // Eshik (ergenek) — naqshli, tirqishidan nur chiqib turadi
      box(g, 0.75, 1.15, 0.1, ornament, -0.6, 0.68, 1.43);
      box(g, 0.45, 0.85, 0.06, glow(0xffc070, 1.1), -0.6, 0.68, 1.47);
      box(g, 0.06, 0.85, 0.08, ornament, -0.6, 0.68, 1.49);

      // Mikrofon — yozuv studiyasi belgisi
      cyl(g, 0.03, 0.03, 1.1, toon(0x2a3b47), 0.9, 0.65, 1.3, 8);
      cyl(g, 0.2, 0.2, 0.05, toon(0x2a3b47), 0.9, 0.12, 1.3, 12);
      ball(g, 0.14, toon(0x9aa3ad), 0.9, 1.28, 1.3);

      // Antenna va undan tarqalayotgan to'lqin halqalari
      const mastX = 1.75, mastTop = 4.3;
      cyl(g, 0.05, 0.09, mastTop, toon(0x8b929a), mastX, mastTop / 2, -0.9, 8);
      ball(g, 0.12, glow(0xff5a4d, 1.8, 0x5a1a14), mastX, mastTop + 0.08, -0.9);

      const rings = [0, 1, 2].map(() => {
        const ring = put(
          g,
          new THREE.TorusGeometry(0.5, 0.035, 6, 28),
          new THREE.MeshBasicMaterial({
            color: 0x7fd8ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
          }),
          mastX, mastTop - 0.35, -0.9
        );
        return ring;
      });
      animators.push((time) => {
        rings.forEach((ring, i) => {
          const progress = (time * 0.45 + i / 3) % 1; // 0 → 1: kengayadi va so'nadi
          ring.scale.setScalar(0.35 + progress * 2.1);
          ring.material.opacity = (1 - progress) * 0.75;
        });
      });

      return 4.7;
    },

    /* ---- Tarix muzeyi: zinapoya, ustunlar va fronton ---- */
    museum(g) {
      const stone = toon(0xe6dcc3);
      const shade = toon(0xc7b58a);
      box(g, 4.9, 0.14, 3.9, shade, 0, 0.07, 0.1);
      box(g, 4.5, 0.14, 3.5, stone, 0, 0.21, 0.0);
      box(g, 4.1, 0.14, 3.1, shade, 0, 0.35, -0.1);

      box(g, 3.7, 2.2, 1.9, toon(0xd9c9a3), 0, 1.52, -0.6);
      box(g, 3.9, 0.22, 2.9, stone, 0, 2.73, -0.1);          // arxitrav
      prism(g, 3.9, 0.95, 2.9, shade, 0, 2.84, -0.1);        // fronton
      ball(g, 0.18, glow(0xffd58a, 1.1), 0, 3.2, 1.36);      // frontondagi medalyon

      [-1.5, -0.5, 0.5, 1.5].forEach((x) => {
        cyl(g, 0.17, 0.2, 2.2, stone, x, 1.52, 1.0, 12);
        box(g, 0.5, 0.1, 0.5, shade, x, 0.47, 1.0);
        box(g, 0.5, 0.1, 0.5, shade, x, 2.59, 1.0);
      });

      box(g, 0.9, 1.6, 0.08, toon(0x5e3a1f), 0, 1.22, 0.38);
      box(g, 0.6, 0.3, 0.1, glow(0xffc070, 1.0), 0, 1.75, 0.39);
      // Ustunlar orasidagi bayroqchalar — ko'rgazma e'lonlari
      box(g, 0.5, 1.3, 0.04, toon(0x2a7fbf), -1.0, 1.75, 0.4);
      box(g, 0.5, 1.3, 0.04, toon(0xc8442f), 1.0, 1.75, 0.4);

      return 4.3;
    },

    /* ---- Open source ustaxonasi: aylanib turgan tishli g'ildirak ---- */
    workshop(g) {
      const wall = toon(0x4a6fa5);
      box(g, 4.8, 0.12, 3.8, toon(0x9a9aa5), 0, 0.06, 0);
      box(g, 3.3, 1.9, 2.5, wall, -0.2, 1.07, -0.4);
      prism(g, 3.6, 1.15, 2.8, toon(0x34495e), -0.2, 2.02, -0.4);

      // Ochiq darvoza — ichkarida ish qizg'in
      box(g, 1.7, 1.45, 0.06, glow(0xffb75e, 1.15), -0.75, 0.85, 0.86);
      box(g, 1.9, 0.12, 0.12, toon(0x34495e), -0.75, 1.62, 0.9);
      box(g, 0.55, 0.55, 0.06, glow(0x7fd8ff, 0.9), 0.85, 1.25, 0.86);
      facadeSign(g, '{ open source }', 1.9, 0.34, '#22303f', '#9be8dc', -0.2, 2.2, 1.02);

      // Tishli g'ildirak — fronton tepasida sekin aylanadi
      const gear = new THREE.Group();
      const gearMaterial = toon(0xf2a33a);
      cyl(gear, 0.5, 0.5, 0.14, gearMaterial, 0, 0, 0, 20).rotation.x = Math.PI / 2;
      for (let i = 0; i < 8; i++) {
        const tooth = box(gear, 0.2, 0.22, 0.14, gearMaterial, 0, 0, 0);
        const a = (i / 8) * Math.PI * 2;
        tooth.position.set(Math.cos(a) * 0.56, Math.sin(a) * 0.56, 0);
        tooth.rotation.z = a + Math.PI / 2;
      }
      cyl(gear, 0.16, 0.16, 0.18, toon(0x34495e), 0, 0, 0, 12).rotation.x = Math.PI / 2;
      gear.position.set(-0.2, 2.85, 1.08);
      g.add(gear);
      animators.push((time) => { gear.rotation.z = time * 0.6; });

      // Yashiklar: har biri bitta kichik loyiha
      const crateColors = [0xa9773f, 0xc08a4a, 0x8f6233];
      [[1.75, 0.37, 0.9, 0.5], [2.2, 0.32, 0.35, 0.4], [1.8, 0.82, 0.85, 0.4]].forEach(([x, y, z, s], i) => {
        const crate = box(g, s, s, s, toon(crateColors[i]), x, y, z);
        crate.rotation.y = i * 0.4;
      });

      return 3.9;
    }
  };

  /* ============================================================
     JOYLASHUV — binolarni halqa bo'ylab terish
     ============================================================ */

  const stations = STATIONS.map((def, index) => {
    const angle = FIRST_ANGLE + index * ANGLE_STEP;
    const x = Math.cos(angle) * LOT_RADIUS;
    const z = Math.sin(angle) * LOT_RADIUS;

    const group = new THREE.Group();
    group.name = `station-${def.id}`;
    const height = builders[def.building](group);

    group.position.set(x, 0, z);
    // Lokal +z (fasad) shaharcha markaziga — uyga qaraydi
    group.rotation.y = Math.atan2(-x, -z);
    group.userData = { id: def.id, title: def.title, station: true, targetScale: 1 };

    const label = labelSprite(def.label);
    label.position.set(0, height + 0.75, 0);
    group.add(label);

    // Yumshoq "soxta soya" — binoni yerga "o'tqazadi" (haqiqiy shadow map'siz)
    const shadow = put(
      town,
      new THREE.PlaneGeometry(8.5, 8.5),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }),
      x, 0.03, z
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.raycast = () => {};

    // Yo'ldan binogacha ikki toshli yo'lakcha
    const toCenter = new THREE.Vector3(-x, 0, -z).normalize();
    [2.7, 3.5].forEach((distance, i) => {
      const stone = box(
        town, 0.9 - i * 0.1, 0.07, 0.55, toon(0xb8b0a0),
        x + toCenter.x * distance, 0.04, z + toCenter.z * distance
      );
      stone.rotation.y = group.rotation.y + (i ? 0.2 : -0.15);
      stone.raycast = () => {};
    });

    town.add(group);
    obstacles.push({ x, z, r: 2.7 });

    return { id: def.id, def, group, position: new THREE.Vector3(x, 0, z), toCenter, height };
  });

  /* ============================================================
     HALQA YO'L va KO'CHA CHIROQLARI
     ============================================================ */

  const road = put(
    town,
    new THREE.RingGeometry(ROAD_RADIUS - ROAD_WIDTH / 2, ROAD_RADIUS + ROAD_WIDTH / 2, 96),
    toon(0x8d8794),
    0, 0.02, 0
  );
  road.rotation.x = -Math.PI / 2;
  road.raycast = () => {};

  // Yo'l chetidagi och hoshiya chiziqlari
  [ROAD_RADIUS - ROAD_WIDTH / 2 - 0.08, ROAD_RADIUS + ROAD_WIDTH / 2].forEach((inner) => {
    const edge = put(town, new THREE.RingGeometry(inner, inner + 0.08, 96), toon(0xd8d2c4), 0, 0.025, 0);
    edge.rotation.x = -Math.PI / 2;
    edge.raycast = () => {};
  });

  // Uy yo'lkasini halqa yo'lga ulaydigan qo'shimcha toshlar
  [[2.25, 10.3, 0.25], [2.55, 11.15, -0.1]].forEach(([x, z, rot]) => {
    const stone = box(town, 0.85, 0.08, 0.55, toon(0xb8b0a0), x, 0.04, z);
    stone.rotation.y = rot;
    stone.raycast = () => {};
  });

  /*
    Chiroqlar binolar ORASIDA (har 45°, binolardan 22.5° siljigan) turadi.
    Haqiqiy PointLight ishlatilmaydi (8 ta yorug'lik har pikselda hisob —
    qimmat): lampochka emissive, atrofidagi nur — additive sprite, yerdagi
    yorug'lik — additive dog'. Hammasi tunda ko'rinadi, kunduzi so'nadi.
  */
  const poleMaterial = toon(0x3a3f4a);
  const bulbMaterial = glow(0xffd58a, 1.8, 0x5a4a2a);

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = ROAD_RADIUS + ROAD_WIDTH / 2 + 0.55;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const lamp = new THREE.Group();
    cyl(lamp, 0.05, 0.08, 2.6, poleMaterial, 0, 1.3, 0, 8);
    box(lamp, 0.07, 0.07, 0.7, poleMaterial, 0, 2.6, 0.3); // yo'l ustiga cho'zilgan qo'l
    box(lamp, 0.24, 0.08, 0.3, poleMaterial, 0, 2.58, 0.62);
    box(lamp, 0.18, 0.06, 0.24, bulbMaterial, 0, 2.52, 0.62);

    const haloMaterial = new THREE.SpriteMaterial({
      map: lightTexture, color: 0xffc878, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    haloMaterial.userData.baseOpacity = 0.5;
    nightMaterials.push(haloMaterial);
    const halo = new THREE.Sprite(haloMaterial);
    halo.scale.setScalar(1.5);
    halo.position.set(0, 2.5, 0.62);
    lamp.add(halo);

    const poolMaterial = new THREE.MeshBasicMaterial({
      map: lightTexture, color: 0xffb75e, transparent: true, opacity: 0.2,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    poolMaterial.userData.baseOpacity = 0.2;
    nightMaterials.push(poolMaterial);
    const pool = put(lamp, new THREE.PlaneGeometry(5, 5), poolMaterial, 0, 0.045, 0.62);
    pool.rotation.x = -Math.PI / 2;

    lamp.position.set(x, 0, z);
    lamp.rotation.y = Math.atan2(-x, -z); // qo'li yo'l tomonga
    lamp.traverse((obj) => { obj.raycast = () => {}; });
    town.add(lamp);
    obstacles.push({ x, z, r: 0.45 });
  }

  return {
    group: town,
    stations,
    glowMaterials,
    nightMaterials,
    obstacles,
    update(time) {
      animators.forEach((animate) => animate(time));
    }
  };
}
