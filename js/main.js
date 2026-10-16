// Contemporary Two-Storey Residence: 3D Architectural Plan Web Viewer
// Full support for Ground Floor (A-101) and First Floor (A-102) with dynamic toggle and walk.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

import {
  PAPER, INK, GROUND_Y, SUN_ELEV, SUN_HEADING,
  CURRENT_FLOOR, setFloor, getFloorData
} from './plan.js';
import {
  CUT, SWEEP_PLANES, setRoomReveal, makeMaterials,
  texturesReady, setAnisotropy, configureRoomSweeps
} from './materials.js';
import { buildHouse } from './house.js';
import { buildSheet } from './sheet.js';
import { makeRig } from './rig.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture');
const errors = (window.__errors = []);
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
setAnisotropy(renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
scene.background = new THREE.Color(PAPER);
scene.fog = new THREE.Fog(new THREE.Color(PAPER), 4000, 9000);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.3;

const camera = new THREE.PerspectiveCamera(2, window.innerWidth / window.innerHeight, 1, 5000);
camera.rotation.order = 'YXZ';

// The sheet of paper the house stands on
const paper = new THREE.Mesh(
  new THREE.PlaneGeometry(9000, 9000),
  new THREE.MeshBasicMaterial({ color: PAPER, toneMapped: false, fog: false })
);
paper.rotation.x = -Math.PI / 2;
paper.position.y = GROUND_Y;
scene.add(paper);

// ---------------------------------------------------------------------------
// Ink Lines
// ---------------------------------------------------------------------------
const LINE = {
  structure: { w: 1.25, color: INK, cut: true },
  furniture: { w: 0.85, color: INK, cut: true },
  anno: { w: 0.8, color: INK },
  thin: { w: 0.55, color: INK },
  hatch: { w: 0.5, color: '#aaa69c' },
  dash: { w: 0.65, color: INK, dashed: true },
};

const planesFor = (room, cut = false) => {
  const p = [];
  if (cut) p.push(CUT);
  if (SWEEP_PLANES[room]) p.push(SWEEP_PLANES[room]);
  return p;
};

const lineMats = [];
function lines(kind, room, positions) {
  const k = LINE[kind] || LINE.thin;
  const g = new LineSegmentsGeometry();
  g.setPositions(positions);
  const m = new LineMaterial({
    color: new THREE.Color(k.color),
    linewidth: k.w,
    worldUnits: false,
    fog: true,
    toneMapped: false,
    dashed: !!k.dashed,
    dashSize: 0.34,
    gapSize: 0.2,
    clippingPlanes: planesFor(room, k.cut),
  });
  lineMats.push(m);
  const l = new LineSegments2(g, m);
  if (k.dashed) l.computeLineDistances();
  l.frustumCulled = false;
  l.renderOrder = 1;
  return l;
}

// ---------------------------------------------------------------------------
// 3D House Model & Dynamic Floor Swapping
// ---------------------------------------------------------------------------
const M = makeMaterials();
const house = new THREE.Group();
scene.add(house);

let currentDoorGroup = null;

function renderHouseModel(floorKey) {
  // Clear previous house children safely
  while (house.children.length > 0) {
    const obj = house.children[0];
    house.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
  }

  const H = buildHouse(floorKey);

  const solid = (geo, mat, shadows = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = shadows;
    m.receiveShadow = shadows;
    house.add(m);
    return m;
  };

  for (const key in H.shell.geos) solid(H.shell.geos[key], M[key] || M.plaster);
  for (const key in H.roof.geos) solid(H.roof.geos[key], key === 'ceiling' ? M.ceiling : M.generic);
  for (const key in H.kit.b) {
    const mat = key.split('|')[1];
    const mesh = solid(H.bucketToGeometry(H.kit.b[key]), M[mat] || M.generic, mat !== 'glass' && mat !== 'lamp');
    if (mat === 'glass') mesh.renderOrder = 3;
  }
  for (const room in H.shell.edges) house.add(lines('structure', room, H.shell.edges[room]));
  for (const room in H.roof.edges) house.add(lines('structure', room, H.roof.edges[room]));
  for (const room in H.kit.e) house.add(lines('furniture', room, H.kit.e[room]));

  // Pivot door
  currentDoorGroup = new THREE.Group();
  currentDoorGroup.position.copy(H.door.pivot);
  const leaf = new THREE.Mesh(H.door.leaf, M.oakDoor);
  const pull = new THREE.Mesh(H.door.pull, M.bronze);
  leaf.castShadow = leaf.receiveShadow = pull.castShadow = true;
  currentDoorGroup.add(leaf, pull, lines('furniture', 'living', H.door.edges));
  house.add(currentDoorGroup);

  renderer.shadowMap.needsUpdate = true;
}

// Initial House Render
renderHouseModel('ground');

// ---------------------------------------------------------------------------
// Sunlight & Ambience
// ---------------------------------------------------------------------------
const el = (SUN_ELEV * Math.PI) / 180;
const sunDir = new THREE.Vector3(
  SUN_HEADING[0] * Math.cos(el),
  -Math.sin(el),
  SUN_HEADING[1] * Math.cos(el)
).normalize();

const sun = new THREE.DirectionalLight(0xffc98f, 11);
sun.target.position.set(0, 1, -2);
sun.position.copy(sun.target.position).addScaledVector(sunDir, -70);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 10, far: 140 });
sun.shadow.bias = -0.0002;
sun.shadow.normalBias = 0.015;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0xeef2f8, 0xdccfb9, 0.75));

// Bounced warm interior light
const bounce1 = new THREE.PointLight(0xffd3a6, 6, 10, 2);
bounce1.position.set(-1.0, 1.2, -3.0);
const bounce2 = new THREE.PointLight(0xffcfa0, 5, 8, 2);
bounce2.position.set(2.0, 1.2, -2.5);
const sky = new THREE.PointLight(0xe4ecff, 6, 12, 2);
sky.position.set(-1.2, 2.0, 1.5);
scene.add(bounce1, bounce2, sky);

// ---------------------------------------------------------------------------
// Rig, Sheet, Layout
// ---------------------------------------------------------------------------
let rig, sheet, sheetGroup;

function layout() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  rig = makeRig(w / h, CURRENT_FLOOR);

  if (sheetGroup) {
    scene.remove(sheetGroup);
    sheet.dispose();
    sheetGroup.traverse((o) => {
      if (o.isLineSegments2) {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
  }

  const pxPerMetre = h / rig.frame.h;
  sheet = buildSheet({
    frame: rig.frame,
    portrait: rig.portrait,
    labelScale: Math.min(1.25, Math.max(1, 15 / pxPerMetre)),
    anisotropy: renderer.capabilities.getMaxAnisotropy(),
    planesFor: (room) => planesFor(room),
    floorKey: CURRENT_FLOOR
  });

  sheetGroup = new THREE.Group();
  sheetGroup.add(sheet.group);
  for (const key in sheet.lines) {
    const [kind, room] = key.split('|');
    sheetGroup.add(lines(kind, room, sheet.lines[key]));
  }
  scene.add(sheetGroup);
}

// ---------------------------------------------------------------------------
// Frame Render Loop
// ---------------------------------------------------------------------------
const hud = {
  lens: document.getElementById('hud-lens'),
  height: document.getElementById('hud-height'),
  cut: document.getElementById('hud-cut')
};
const rail = [...document.querySelectorAll('#rail span')];
const grain = document.getElementById('grain');
const sp = (v) => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
let last = null;

function draw(s) {
  const o = rig.at(s);
  last = o;
  camera.position.set(o.x, o.y, o.z);
  camera.rotation.set(o.pitch, o.yaw, 0);
  camera.fov = o.fov;
  camera.near = o.near;
  camera.far = o.far;
  camera.updateProjectionMatrix();

  CUT.constant = o.cut;
  scene.fog.near = o.fogNear;
  scene.fog.far = o.fogFar;

  if (currentDoorGroup) currentDoorGroup.rotation.y = o.door * 1.5;

  const floorData = getFloorData(CURRENT_FLOOR);
  for (const r of floorData.rooms) {
    setRoomReveal(r.key, o.hall);
  }

  if (o.hall > 0) renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);

  if (hud.lens) hud.lens.textContent = o.fov.toFixed(1) + '°';
  const above = o.y - GROUND_Y;
  if (hud.height) hud.height.textContent = above > 20 ? sp(above) + ' m' : above.toFixed(2) + ' m';
  if (hud.cut) hud.cut.textContent = o.cut > 5.3 ? 'none' : '+' + o.cut.toFixed(2) + ' m';

  for (const r of rail) r.classList.remove('on');
  let on = rail[0];
  for (const r of rail) if (s >= +r.dataset.at) on = r;
  if (on) on.classList.add('on');

  if (grain) grain.style.opacity = (0.5 * (1 - o.hall)).toFixed(3);
}

// ---------------------------------------------------------------------------
// Scroll Timeline
// ---------------------------------------------------------------------------
const proxy = { s: 0 };
const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
tl.to(proxy, { s: 1, duration: 1 }, 0);
tl.to('#hero', { autoAlpha: 0, y: -30, duration: 0.04 }, 0.035);

const cap = (sel, a, b) => {
  tl.fromTo(sel, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.03 }, a);
  if (b) tl.to(sel, { autoAlpha: 0, y: -16, duration: 0.03 }, b);
};
cap('#cap-lift', 0.1, 0.3);
cap('#cap-fore', 0.56, 0.67);
cap('#cap-hall', 0.94, null);

let drawn = -1;
function tick() {
  if (proxy.s !== drawn) {
    drawn = proxy.s;
    draw(drawn);
  }
}

// ---------------------------------------------------------------------------
// Floor Switching Controller
// ---------------------------------------------------------------------------
function switchFloor(floorKey) {
  if (CURRENT_FLOOR === floorKey) return;
  setFloor(floorKey);

  // Update UI buttons
  document.querySelectorAll('.floor-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.floor === floorKey);
  });

  const data = getFloorData(floorKey);

  // Update Captions & Eyebrow
  const eyebrow = document.getElementById('hero-eyebrow');
  if (eyebrow) {
    eyebrow.innerHTML = `${data.project.place} <span class="wide">&nbsp;·&nbsp; ${data.project.drawing}</span> &nbsp;·&nbsp; ${data.project.sheet}`;
  }
  const capLiftNo = document.getElementById('cap-lift-no');
  const capLiftSay = document.getElementById('cap-lift-say');
  if (capLiftNo && capLiftSay) {
    capLiftNo.textContent = data.captions.lift.no;
    capLiftSay.textContent = data.captions.lift.say;
  }
  const capForeNo = document.getElementById('cap-fore-no');
  const capForeSay = document.getElementById('cap-fore-say');
  if (capForeNo && capForeSay) {
    capForeNo.textContent = data.captions.mid.no;
    capForeSay.textContent = data.captions.mid.say;
  }
  const capHallNo = document.getElementById('cap-hall-no');
  const capHallSay = document.getElementById('cap-hall-say');
  if (capHallNo && capHallSay) {
    capHallNo.textContent = data.captions.walk.no;
    capHallSay.textContent = data.captions.walk.say;
  }

  // Update Material Sweeps
  configureRoomSweeps(data.rooms);

  // Rebuild 3D Model & 2D Blueprint Sheet
  renderHouseModel(floorKey);
  layout();

  // Reset scroll to top smoothly
  if (window.__lenis) {
    window.__lenis.scrollTo(0, { immediate: false, duration: 1.2 });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  tl.progress(0);
  proxy.s = 0;
  drawn = -1;
  draw(0);
}

// Keyboard shortcuts (1 for Ground Floor, 2 for First Floor)
window.addEventListener('keydown', (e) => {
  if (e.key === '1') switchFloor('ground');
  if (e.key === '2') switchFloor('first');
});

// Click handlers for buttons
document.getElementById('btn-ground')?.addEventListener('click', () => switchFloor('ground'));
document.getElementById('btn-first')?.addEventListener('click', () => switchFloor('first'));

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function boot() {
  await Promise.race([
    Promise.all([
      document.fonts.load('400 20px "IBM Plex Mono"'),
      document.fonts.load('500 20px "IBM Plex Mono"'),
      document.fonts.load('400 40px "Instrument Serif"'),
      document.fonts.load('italic 400 40px "Instrument Serif"'),
    ]),
    new Promise((r) => setTimeout(r, 3000)),
  ]);

  await texturesReady();
  layout();
  for (const m of Object.values(M)) m.needsUpdate = true;
  draw(0);

  if (CAPTURE) {
    window.__frame = (s) =>
      new Promise((res) => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, s * max);
        tl.progress(s);
        draw(proxy.s);
        requestAnimationFrame(() => requestAnimationFrame(() => res(true)));
      });
  } else {
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.create({ trigger: '#track', start: 'top top', end: 'bottom bottom', scrub: 0.8, animation: tl });
    gsap.ticker.add(tick);

    gsap.from('#hero h1 .l > span', { yPercent: 105, duration: 1.3, ease: 'expo.out', stagger: 0.12, delay: 0.25 });
    gsap.from('#hero .eyebrow, #hero .lede, #hero .floor-quick-nav, #hero .cue, #bar', {
      autoAlpha: 0,
      y: 12,
      duration: 1,
      ease: 'power2.out',
      stagger: 0.08,
      delay: 0.6
    });
  }

  window.addEventListener('resize', () => {
    layout();
    drawn = -1;
    if (CAPTURE) draw(proxy.s);
  });

  window.__switchFloor = switchFloor;
  window.__state = () => ({
    ...last,
    floor: CURRENT_FLOOR,
    errors: errors.length,
    calls: renderer.info.render.calls,
    tris: renderer.info.render.triangles
  });
  window.__draw = draw;

  const loading = document.getElementById('loading');
  if (CAPTURE) loading.style.transition = 'none';
  loading.classList.add('done');
  window.__ready = true;
}

boot().catch((e) => {
  errors.push(String(e && e.stack ? e.stack : e));
  console.error(e);
});
