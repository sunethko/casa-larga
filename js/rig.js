// Camera rig for Contemporary Two-Storey Residence
// Smooth transition from top-down blueprint sheet to eye-level walkthrough

import { CUT_PLAN, CUT_OPEN } from './plan.js';

const io = (t) => t * t * (3 - 2 * t);
const io5 = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lin = (t) => t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const rad = Math.PI / 180;

function track(keys) {
  return (s) => {
    if (s <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (s <= keys[i][0]) {
        const t = (s - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]);
        const e = (keys[i][2] ?? lin)(t);
        return keys[i - 1][1] + (keys[i][1] - keys[i - 1][1]) * e;
      }
    }
    return keys[keys.length - 1][1];
  };
}

function glide(keys) {
  const n = keys.length;
  const xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]);
  const d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  return (s) => {
    if (s <= xs[0]) return ys[0];
    if (s >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (s > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (s - xs[i]) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

export const STOPS = { sheetEnd: 0.06, liftEnd: 0.34, landed: 0.58, walk: 0.64, end: 1 };

export function makeRig(aspect, floorKey = 'ground') {
  const portrait = aspect < 0.9;
  const fovWalk = portrait ? 74 : aspect < 1.5 ? 60 : 54;

  // Framing centered on the two-storey residence (width ~13m, length ~17m)
  const F0 = portrait ? 46 : 34;
  const cn = portrait ? 4.2 : 2.8;
  const cx = portrait ? 0.0 : 0.8 - 0.22 * ((F0 * aspect) / 2);
  const frame = { cx, cn, w: F0 * aspect, h: F0 };

  const L = Math.log, T = (deg) => Math.tan((deg * rad) / 2);
  const isFirst = floorKey === 'first';
  const DOOR_Z = isFirst ? 1.0 : 0.0;
  const REST_Z = isFirst ? 6.5 : 5.8;
  const landFrame = 2 * (REST_Z - DOOR_Z) * T(fovWalk);
  const { sheetEnd: s1, liftEnd: s2, landed: s3 } = STOPS;

  const early = (t) => 0.5 * io(t) + 0.5 * (1 - (1 - t) * (1 - t));
  const elev = track([[0, 90], [s1, 90], [s2, 35, early], [s3, 0, io]]);
  const fovL = track([[0, L(T(2))], [s1, L(T(2))], [s2, L(T(4.6)), io], [s3, L(T(fovWalk)), io5]]);
  const frmL = track([[0, L(F0)], [s1, L(F0)], [s2, L(portrait ? 36 : 28), io], [s3, L(landFrame), io5]]);

  const targetX = isFirst ? -0.8 : -1.1;
  const tx = track([[0, cx], [s1, cx], [s2, portrait ? 0.5 : targetX, io], [s3, targetX, io]]);
  const ty = track([[0, 0], [s1, 0], [s2, 1.4, io], [s3, 1.55, io]]);
  const tz = track([[0, -cn], [s1, -cn], [s2, -3.5, io], [s3, DOOR_Z, io]]);

  const cut = track([[0, CUT_PLAN], [s1 + 0.01, CUT_PLAN], [s2, 2.7, io], [0.455, 2.75, lin], [0.555, CUT_OPEN, io]]);
  const fogN = track([[0, L(4000)], [s2, L(4000)], [s3, L(28), io]]);
  const fogF = track([[0, L(9000)], [s2, L(9000)], [s3, L(95), io]]);

  const pz = glide([
    [s3, REST_Z],
    [0.64, REST_Z - 0.4],
    [0.76, 2.8],
    [0.88, 0.4],
    [0.96, -1.8],
    [1, -2.6]
  ]);

  function at(sIn) {
    const s = clamp01(sIn);
    const o = { s };
    o.cut = cut(s);
    o.fogNear = Math.exp(fogN(s));
    o.fogFar = Math.exp(fogF(s));
    if (s <= s3) {
      const e = elev(s) * rad;
      const tanHalf = Math.exp(fovL(s));
      const dist = Math.exp(frmL(s)) / (2 * tanHalf);
      o.fov = (2 * Math.atan(tanHalf)) / rad;
      o.pitch = -e;
      o.yaw = 0;
      o.x = tx(s);
      o.y = ty(s) + dist * Math.sin(e);
      o.z = tz(s) + dist * Math.cos(e);
      o.dist = dist;
      o.door = 0;
      o.hall = 0;
    } else {
      const z = pz(s);
      o.fov = fovWalk;
      o.yaw = 0;
      o.pitch = -3.5 * rad * io(clamp01((1.6 - z) / 2.4));
      o.x = targetX;
      o.y = 1.55 + 0.1 * io(clamp01((3.0 - z) / 1.0));
      o.z = z;
      o.dist = 6;
      o.door = io(clamp01((4.8 - z) / 3.2));
      o.hall = clamp01((1.2 - z) / 2.0);
    }
    o.near = Math.max(0.08, (o.y - 5) * 0.5);
    o.far = o.y > 60 ? o.y * 1.6 + 500 : 700;
    return o;
  }

  return { at, frame, portrait, fovWalk };
}
