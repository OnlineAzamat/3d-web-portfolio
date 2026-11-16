/*
  ATMOSFERA — osmon gumbazi va kun/tun almashinuvi
  --------------------------------------------------
  Oldin osmon CSS gradient edi (canvas shaffof). Endi osmon sahnaning
  o'zida — ichkaridan ko'rinadigan ulkan sfera (gumbaz). Sabablari:
    1) bloom (porlash) effekti shaffof canvas bilan ishlamaydi;
    2) osmon rangini kun/tun o'rtasida silliq o'zgartirish kerak.

  Butun holat BITTA son bilan boshqariladi: k = 0 (tun) … 1 (kun).
  apply(k) barcha ranglarni shu ikki holat orasida aralashtiradi —
  main.js faqat k ni tween qiladi, qolgani shu yerda.
*/

import * as THREE from 'three';

const NIGHT = {
  top: 0x141433,
  horizon: 0x362d5b,        // fog ham AYNAN shu rang — yer chekkasi osmonga singadi
  hemiSky: 0x9a94d8,
  hemiGround: 0x3a5a3a,
  hemiIntensity: 0.9,
  sunColor: 0xfff0dd,
  sunIntensity: 1.3,
  sunPosition: new THREE.Vector3(6, 10, 5),
  ground: new THREE.Color(1, 1, 1),
  hill: 0x3a3468,
  cloud: 0x8f88c4,
  cloudOpacity: 0.3,
  bloomStrength: 0.4,
  bloomThreshold: 0.62,
  fogNear: 26,
  fogFar: 95
};

const DAY = {
  top: 0x3b86d8,
  horizon: 0xbfe0f2,
  hemiSky: 0xe8f3ff,
  hemiGround: 0xa9c890,
  hemiIntensity: 1.9,
  sunColor: 0xfff3d6,
  sunIntensity: 2.3,
  sunPosition: new THREE.Vector3(-7, 12, 8),
  // Yer MeshBasicMaterial (yorug'likka javob bermaydi) — kunduzi uni
  // rang ko'paytiruvchisi bilan "yoritamiz": to'q tungi maysa → quyoshli o'tloq
  ground: new THREE.Color(2.5, 2.05, 1.7),
  hill: 0x8fb6ad,
  cloud: 0xffffff,
  cloudOpacity: 0.85,
  bloomStrength: 0.12,
  bloomThreshold: 0.98,
  // Kunduzi havo tiniqroq: tuman uzoqroqdan boshlanadi
  fogNear: 45,
  fogFar: 160
};

const SUNSET_GLOW = new THREE.Color(0xff7a3c); // almashinuv o'rtasida ufqda yonadi

export function createAtmosphere({ scene, hemiLight, sunLight }) {
  /* ---------- Osmon gumbazi ---------- */

  const uniforms = {
    topColor: { value: new THREE.Color() },
    horizonColor: { value: new THREE.Color() },
    glowColor: { value: SUNSET_GLOW },
    glowAmount: { value: 0 }
  };

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(190, 32, 16),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide, // sferaning ICHKI yuzasi chiziladi
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 glowColor;
        uniform float glowAmount;
        varying vec3 vDirection;
        void main() {
          // h: 0 — ufq, 1 — zenit. pow < 1: ufq rangi tez, zenit sekin ochiladi
          float h = max(normalize(vDirection).y, 0.0);
          vec3 color = mix(horizonColor, topColor, pow(h, 0.55));
          // Shafaq: faqat ufq yaqinidagi tor belbog'
          color += glowColor * glowAmount * pow(1.0 - h, 7.0);
          gl_FragColor = vec4(color, 1.0);
          #include <colorspace_fragment>
        }
      `
    })
  );
  dome.renderOrder = -10; // eng birinchi chiziladi — hamma narsa uning ustida
  dome.raycast = () => {};
  scene.add(dome);

  /* ---------- Quyosh va oy ---------- */

  // Qattiq disk + atrofida yumshoq halo — ikkalasiga bitta tekstura
  function discTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.24, 'rgba(255,255,255,1)');
    g.addColorStop(0.28, 'rgba(255,255,255,0.32)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }

  const texture = discTexture();
  const makeBody = (color, scale) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, color, transparent: true, depthWrite: false, fog: false
    }));
    sprite.scale.setScalar(scale);
    sprite.renderOrder = -9;
    sprite.raycast = () => {};
    return sprite;
  };

  /*
    Ikkalasi bitta o'q (pivot) atrofida, bir-biriga QARAMA-QARSHI turadi.
    Pivot 180° burilsa oy botadi, quyosh chiqadi — almashinuv o'rtasida
    ikkalasi ham ufq yaqinida ko'rinadi.
  */
  const pivot = new THREE.Group();
  const R = 170;
  const moon = makeBody(0xdfe6ff, 30);
  moon.position.set(-0.5 * R, 0.5 * R, -0.7 * R);
  const sun = makeBody(0xfff0b8, 46);
  sun.position.set(0.5 * R, -0.5 * R, -0.7 * R);
  pivot.add(moon, sun);
  scene.add(pivot);

  /* ---------- Holatni qo'llash ---------- */

  const _a = new THREE.Color();
  const _b = new THREE.Color();
  const mixColor = (target, from, to, k) =>
    target.copy(_a.set(from)).lerp(_b.set(to), k);

  const state = {
    k: 0,
    glow: 1,          // derazalar/chiroqlar nur koeffitsiyenti (tun=1)
    night: 1,         // faqat tunda ko'rinadigan narsalar (yulduz, nur dog'lari)
    bloomStrength: NIGHT.bloomStrength,
    bloomThreshold: NIGHT.bloomThreshold,
    ground: new THREE.Color(1, 1, 1),
    hill: new THREE.Color(),
    cloud: new THREE.Color(),
    cloudOpacity: NIGHT.cloudOpacity,
    fog: new THREE.Color()
  };

  function apply(k) {
    const lerp = THREE.MathUtils.lerp;
    state.k = k;

    mixColor(uniforms.topColor.value, NIGHT.top, DAY.top, k);
    mixColor(uniforms.horizonColor.value, NIGHT.horizon, DAY.horizon, k);
    uniforms.glowAmount.value = Math.sin(k * Math.PI) * 0.75;

    // Fog = ufq rangi (+ shafaqning bir qismi), aks holda yer chekkasida "tikuv" ko'rinadi
    state.fog.copy(uniforms.horizonColor.value)
      .lerp(SUNSET_GLOW, Math.sin(k * Math.PI) * 0.22);
    scene.fog.color.copy(state.fog);
    scene.fog.near = lerp(NIGHT.fogNear, DAY.fogNear, k);
    scene.fog.far = lerp(NIGHT.fogFar, DAY.fogFar, k);

    mixColor(hemiLight.color, NIGHT.hemiSky, DAY.hemiSky, k);
    mixColor(hemiLight.groundColor, NIGHT.hemiGround, DAY.hemiGround, k);
    hemiLight.intensity = lerp(NIGHT.hemiIntensity, DAY.hemiIntensity, k);

    mixColor(sunLight.color, NIGHT.sunColor, DAY.sunColor, k);
    sunLight.intensity = lerp(NIGHT.sunIntensity, DAY.sunIntensity, k);
    sunLight.position.lerpVectors(NIGHT.sunPosition, DAY.sunPosition, k);

    state.ground.copy(NIGHT.ground).lerp(DAY.ground, k);
    mixColor(state.hill, NIGHT.hill, DAY.hill, k);
    mixColor(state.cloud, NIGHT.cloud, DAY.cloud, k);
    state.cloudOpacity = lerp(NIGHT.cloudOpacity, DAY.cloudOpacity, k);

    // Chiroqlar kech "yonadi": k ning birinchi yarmida deyarli to'liq nur
    const night = 1 - THREE.MathUtils.smoothstep(k, 0.25, 0.8);
    state.night = night;
    state.glow = lerp(0.12, 1, night);
    state.bloomStrength = lerp(NIGHT.bloomStrength, DAY.bloomStrength, k);
    state.bloomThreshold = lerp(NIGHT.bloomThreshold, DAY.bloomThreshold, k);

    pivot.rotation.z = k * Math.PI;
    return state;
  }

  apply(0);
  return { apply, state };
}
