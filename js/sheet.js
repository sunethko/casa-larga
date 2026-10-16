// 2D Architectural Drawing Sheet: Blueprint lines, annotations, dimensions, door swings,
// and title block for Ground Floor (A-101) and First Floor (A-102).

import * as THREE from 'three';
import {
  INK, PAPER, GROUND_Y,
  GROUND_ROOMS, GROUND_SIDE_ROOMS, GROUND_DOORS,
  FIRST_ROOMS, FIRST_SIDE_ROOMS, FIRST_DOORS,
  getFloorData, TREES
} from './plan.js';

const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
const SERIF = '"Instrument Serif", "Cormorant Garamond", Georgia, serif';
const CAP = 0.7;
const PXM = 110;

const fmt = (v) => v.toFixed(2);

export function buildSheet({ frame, portrait, labelScale = 1, anisotropy = 8, planesFor, floorKey = 'ground' }) {
  const isFirst = floorKey === 'first';
  const data = getFloorData(floorKey);
  const rooms = data.rooms;
  const sideRooms = data.sideRooms;
  const doors = data.doors;
  const project = data.project;

  const group = new THREE.Group();
  const lines = {};
  const seg = (key, x0, n0, x1, n1, y) => (lines[key] ??= []).push(x0, y, -n0, x1, y, -n1);
  const FLOOR = 0.004, OUT = GROUND_Y + 0.004;
  const disposables = [];

  // ---- text ------------------------------------------------------------
  function textBlock(rows, { room = 'rest', x, n, y = FLOOR, rot = 0, align = 'center' }) {
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    const specs = rows.map((r) => {
      const cap = r.cap * labelScale;
      const px = (cap / CAP) * PXM;
      return { ...r, px, font: `${r.weight ?? 400} ${px}px ${r.font ?? MONO}`, track: (r.track ?? 0.08) * px, lead: cap * PXM * (r.lead ?? 1.65) };
    });
    let w = 0, h = 0;
    for (const s of specs) {
      g.font = s.font;
      if ('letterSpacing' in g) g.letterSpacing = s.track + 'px';
      s.w = g.measureText(s.t).width;
      w = Math.max(w, s.w);
      h += s.lead;
    }
    const pad = 8;
    c.width = Math.ceil(w + pad * 2);
    c.height = Math.ceil(h + pad * 2);
    let yy = pad;
    g.fillStyle = INK;
    g.textBaseline = 'alphabetic';
    for (const s of specs) {
      g.font = s.font;
      if ('letterSpacing' in g) g.letterSpacing = s.track + 'px';
      g.globalAlpha = s.alpha ?? 1;
      const tx = align === 'center' ? (c.width - s.w) / 2 : pad;
      g.fillText(s.t, tx, yy + s.lead * 0.5 + s.px * CAP * 0.5);
      yy += s.lead;
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, fog: true, clippingPlanes: planesFor(room) });
    const geo = new THREE.PlaneGeometry(c.width / PXM, c.height / PXM);
    const m = new THREE.Mesh(geo, mat);
    m.rotation.set(-Math.PI / 2, 0, rot);
    m.position.set(x, y, -n);
    m.renderOrder = 2;
    group.add(m);
    disposables.push(tex, mat, geo);
    return m;
  }

  // ---- room labels -------------------------------------------------------
  for (const r of rooms) {
    const cx = (r.x0 + r.x1) / 2;
    const cn = (r.n0 + r.n1) / 2;
    textBlock(
      [
        { t: r.name, cap: 0.36, weight: 500, track: 0.1 },
        { t: r.size ? r.size : `${fmt(r.clear[0])} × ${fmt(r.clear[1])}`, cap: 0.26 },
        { t: `${(r.clear[0] * r.clear[1]).toFixed(1)} m²`, cap: 0.24, alpha: 0.75 },
      ],
      { room: r.key, x: cx, n: cn }
    );
  }

  for (const r of sideRooms) {
    const rows = [{ t: r.name, cap: r.small ? 0.24 : 0.3, weight: 500, track: 0.1 }];
    if (r.size) rows.push({ t: r.size, cap: 0.22, alpha: 0.85 });
    textBlock(rows, { x: r.x, n: r.n, rot: r.vertical ? Math.PI / 2 : 0 });
  }

  // ---- dimension strings ---------------------------------------------------
  function dimString(along, at, ticks, { from, minLabel = 1.0, side = -1 } = {}) {
    const T = 0.25;
    const a0 = ticks[0], a1 = ticks[ticks.length - 1];
    if (along === 'n') {
      seg('anno|rest', at, a0 - 0.4, at, a1 + 0.4, OUT);
      for (const t of ticks) {
        seg('anno|rest', at - T, t - T, at + T, t + T, OUT);
        if (from !== undefined) seg('thin|rest', from, t, at + side * 0.25, t, OUT);
      }
      for (let i = 0; i < ticks.length - 1; i++) {
        const d = ticks[i + 1] - ticks[i];
        if (d < minLabel) continue;
        textBlock([{ t: fmt(d) + 'm', cap: 0.26, lead: 1.4 }], { x: at + side * 0.45, n: (ticks[i] + ticks[i + 1]) / 2, y: OUT, rot: Math.PI / 2 });
      }
    } else {
      seg('anno|rest', a0 - 0.4, at, a1 + 0.4, at, OUT);
      for (const t of ticks) {
        seg('anno|rest', t - T, at - T, t + T, at + T, OUT);
        if (from !== undefined) seg('thin|rest', t, from, t, at - side * 0.25, OUT);
      }
      for (let i = 0; i < ticks.length - 1; i++) {
        const d = ticks[i + 1] - ticks[i];
        if (d < minLabel) continue;
        textBlock([{ t: fmt(d) + 'm', cap: 0.26, lead: 1.4 }], { x: (ticks[i] + ticks[i + 1]) / 2, n: at - side * 0.45, y: OUT });
      }
    }
  }

  if (!isFirst) {
    // West dimension: Carport, Pantry
    dimString('n', -7.6, [-6.4, 0.0, 6.22, 10.18], { from: -6.5 });
    // East dimension: Bed 04, Bath 05
    dimString('n', 7.4, [0.0, 4.88, 6.4], { from: 6.1, side: 1 });
    // South dimension: Across front width
    dimString('x', -7.6, [-6.4, -2.6, 1.0, 6.05], { from: -6.5, side: 1 });
    // North dimension: Rear width
    dimString('x', 11.2, [-6.0, 0.45], { from: 10.3, side: -1 });
  } else {
    // West dimension: Terrace, Master Suite
    dimString('n', -7.6, [-6.4, -1.8, 2.47, 3.47], { from: -6.5 });
    // East dimension: Bed 11, Bath 10
    dimString('n', 7.4, [0.0, 5.03, 6.55], { from: 6.1, side: 1 });
    // South dimension: Master, Balcony, Bed 11
    dimString('x', -7.6, [-6.4, -3.0, 1.1, 4.0, 6.05], { from: -6.5, side: 1 });
    // North dimension: Bed 12
    dimString('x', 7.6, [-3.0, 1.0], { from: 5.7, side: -1 });
  }

  // ---- door swings ---------------------------------------------------------
  const arc = (key, cx, cn, r, a0, a1, y) => {
    const N = 18;
    for (let i = 0; i < N; i++) {
      const t0 = ((a0 + ((a1 - a0) * i) / N) * Math.PI) / 180;
      const t1 = ((a0 + ((a1 - a0) * (i + 1)) / N) * Math.PI) / 180;
      seg(key, cx + Math.cos(t0) * r, cn + Math.sin(t0) * r, cx + Math.cos(t1) * r, cn + Math.sin(t1) * r, y);
    }
  };

  for (const d of doors) {
    arc('thin|rest', d.x, d.n, 0.85, d.open, d.closed, FLOOR);
  }

  // ---- Floor Joint Hatching / Grids ---------------------------------------
  const grid = (key, x0, n0, x1, n1, ox, on, y) => {
    for (let x = ox; x < x1 - 0.01; x += 1.2) if (x > x0 + 0.01) seg(key, x, n0, x, n1, y);
    for (let n = on; n < n1 - 0.01; n += 1.2) if (n > n0 + 0.01) seg(key, x0, n, x1, n, y);
  };

  if (!isFirst) {
    grid('hatch|living', -2.6, 0.0, 1.0, 6.22, -2.6 + 0.6, 0.4, FLOOR);
    grid('hatch|dining', -2.6, 6.22, 0.45, 10.18, -2.6 + 0.6, 6.22 + 0.4, FLOOR);
    grid('hatch|carpark', -6.4, -6.4, -2.6, 0.0, -6.4 + 0.8, -6.4 + 0.8, FLOOR);
  } else {
    grid('hatch|terrace', -6.4, -6.4, -2.6, -1.8, -6.4 + 0.8, -6.4 + 0.8, FLOOR);
    grid('hatch|family', -3.0, 0.0, 1.1, 2.44, -3.0 + 0.6, 0.4, FLOOR);
    grid('hatch|master', -6.2, -1.8, -3.0, 2.47, -6.2 + 0.6, -1.8 + 0.4, FLOOR);
  }

  // Trees dashed circles
  for (const t of TREES) {
    arc('dash|rest', t.x, t.n, t.r, 0, 360, OUT);
  }

  // ---- Sheet Border & Title Block ------------------------------------------
  const inset = 1.3;
  const side = portrait ? -8 : inset;
  const bx0 = frame.cx - frame.w / 2 + side, bx1 = frame.cx + frame.w / 2 - side;
  const bn0 = frame.cn - frame.h / 2 + inset, bn1 = frame.cn + frame.h / 2 - inset;
  for (const k of [0, 0.22]) {
    seg('anno|rest', bx0 + k, bn0 + k, bx1 - k, bn0 + k, OUT);
    seg('anno|rest', bx1 - k, bn0 + k, bx1 - k, bn1 - k, OUT);
    seg('anno|rest', bx1 - k, bn1 - k, bx0 + k, bn1 - k, OUT);
    seg('anno|rest', bx0 + k, bn1 - k, bx0 + k, bn0 + k, OUT);
  }

  const TW = portrait ? frame.w - 2.4 : 21.0, TH = portrait ? 7.6 : 9.5;
  const tb = titleBlock(TW, TH, portrait ? 1.2 : 1, project);
  tb.texture.anisotropy = anisotropy;
  const tbm = new THREE.Mesh(
    new THREE.PlaneGeometry(TW, TH),
    new THREE.MeshBasicMaterial({ map: tb.texture, transparent: true, depthWrite: false, toneMapped: false, fog: true })
  );
  tbm.rotation.x = -Math.PI / 2;
  tbm.position.set(portrait ? frame.cx : bx1 - 0.22 - TW / 2, OUT, -(bn0 + 0.22 + TH / 2));
  tbm.renderOrder = 2;
  group.add(tbm);
  disposables.push(tb.texture, tbm.material, tbm.geometry);

  return { group, lines, dispose: () => disposables.forEach((d) => d.dispose()) };
}

function titleBlock(TW, TH, k = 1, project) {
  const P = 72;
  const c = document.createElement('canvas');
  c.width = Math.round(TW * P);
  c.height = Math.round(TH * P);
  const g = c.getContext('2d');
  const W = c.width, H = c.height;

  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = INK;
  g.fillStyle = INK;
  g.lineWidth = 4;
  g.strokeRect(2, 2, W - 4, H - 4);

  const yA = Math.round(H * 0.47), yB = Math.round(H * 0.735);
  const line = (x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  g.lineWidth = 2;
  line(0, yA, W, yA);
  line(0, yB, W, yB);
  const xSheet = Math.round(W * 0.64);
  line(xSheet, yA, xSheet, yB);
  const cells = [0.2, 0.46, 0.64, 0.82].map((f) => Math.round(f * W));
  for (const x of cells) line(x, yB, x, H);

  const m = P * 0.34;
  const label = (t, x, y) => {
    g.font = `500 ${P * 0.32 * k}px ${MONO}`;
    if ('letterSpacing' in g) g.letterSpacing = P * 0.05 + 'px';
    g.globalAlpha = 0.6;
    g.fillText(t, x + m, y + m + P * 0.24 * k);
    g.globalAlpha = 1;
  };
  const value = (t, x, yBottom, size = 0.52) => {
    g.font = `400 ${P * size * k}px ${MONO}`;
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.fillText(t, x + m, yBottom - m);
  };

  // Project Header
  label('PROJECT', 0, 0);
  g.font = `400 ${Math.min(yA * 0.55, W * 0.12)}px ${SERIF}`;
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.fillText(project.name, m - P * 0.05, yA - m * 1.15);
  g.textAlign = 'right';
  value(project.place, W - 2 * m, yA, 0.46);
  g.textAlign = 'left';

  // Drawing & Sheet
  label('DRAWING', 0, yA);
  value(`${project.drawing}  ·  ${project.area}`, 0, yB, 0.54);
  label('SHEET', xSheet, yA);
  value(project.sheet, xSheet, yB, 0.8);

  // North Arrow
  const ch = H - yB;
  const ax = cells[0] * 0.5, ay = yB + ch * 0.54, r = Math.min(ch * 0.3, cells[0] * 0.3);
  g.lineWidth = 2.5;
  g.beginPath(); g.arc(ax, ay, r, 0, Math.PI * 2); g.stroke();
  line(ax, ay + r * 1.2, ax, ay - r * 1.2);
  g.beginPath(); g.moveTo(ax, ay - r * 1.2); g.lineTo(ax - r * 0.42, ay); g.lineTo(ax, ay); g.closePath(); g.fill();
  g.font = `500 ${P * 0.44 * k}px ${MONO}`;
  g.fillText('N', ax + r * 0.5, ay - r * 0.7);

  // Scale bar
  const u = P;
  const barM = Math.max(2, Math.min(4, Math.floor((cells[1] - cells[0] - 2.4 * m) / u)));
  const sx = cells[0] + m + P * 0.1, sy = H - m - P * 0.2;
  label('METRES', cells[0], yB);
  g.lineWidth = 2;
  g.strokeRect(sx, sy, barM * u, P * 0.2);
  for (let i = 0; i < barM; i += 2) g.fillRect(sx, sy, 0, 0), g.fillRect(sx + i * u, sy, u, P * 0.2);
  g.font = `400 ${P * 0.34 * k}px ${MONO}`;
  g.fillText('0', sx - P * 0.1, sy - P * 0.14);
  g.fillText(String(barM), sx + barM * u - P * 0.12, sy - P * 0.14);

  label('CUT AT', cells[1], yB);
  value('+1.20 m', cells[1], H, 0.48);
  label('SCALE', cells[2], yB);
  value(project.scale, cells[2], H, 0.48);
  label('DATE', cells[3], yB);
  value(project.date, cells[3], H, 0.44);

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture };
}
