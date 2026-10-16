// Contemporary Residence: 3D Architectural Model for Ground Floor and First Floor.
// Built from architectural drawings (Scale 8' to an inch, 1 ft = 0.3048 m).
// Plan coordinates: (x east, n north, y up). Three.js: (x, y, -n).

import * as THREE from 'three';
import { RectSolid, pushBox, bucketToGeometry } from './solid.js';
import {
  BASE_Y, GROUND_Y, TREES,
  GROUND_ROOMS, FIRST_ROOMS
} from './plan.js';

const roomAtFloor = (rooms, x, n, y = 0) => {
  for (const r of rooms) {
    if (x >= r.x0 && x <= r.x1 && n >= r.n0 && n <= r.n1 && y < r.ceil + 0.1) return r.key;
  }
  return 'rest';
};

class Kit {
  constructor() {
    this.b = {};
    this.e = {};
  }
  bucket(room, mat) {
    const k = room + '|' + mat;
    if (!this.b[k]) this.b[k] = { p: [], n: [], uv: [], idx: [] };
    return this.b[k];
  }
  edges(room) {
    if (!this.e[room]) this.e[room] = [];
    return this.e[room];
  }
  box(room, mat, x0, n0, x1, n1, y0, y1, edges = true) {
    pushBox(
      this.bucket(room, mat),
      edges ? this.edges(room) : null,
      Math.min(x0, x1), Math.min(y0, y1), -Math.max(n0, n1),
      Math.max(x0, x1), Math.max(y0, y1), -Math.min(n0, n1)
    );
  }
  geo(room, mat, g, edgeAngle = 30) {
    const B = this.bucket(room, mat);
    const src = g.index ? g.toNonIndexed() : g;
    const p = src.attributes.position, nrm = src.attributes.normal, uv = src.attributes.uv;
    const base = B.p.length / 3;
    for (let i = 0; i < p.count; i++) {
      B.p.push(p.getX(i), p.getY(i), p.getZ(i));
      B.n.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
      B.uv.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      B.idx.push(base + i);
    }
    if (edgeAngle !== null) {
      const eg = new THREE.EdgesGeometry(g, edgeAngle);
      const E = this.edges(room), ep = eg.attributes.position;
      for (let i = 0; i < ep.count; i++) E.push(ep.getX(i), ep.getY(i), ep.getZ(i));
    }
  }
}

const place = (g, x, y, n, ry = 0, sx = 1, sy = 1, sz = 1) => {
  g.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, -n),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry),
      new THREE.Vector3(sx, sy, sz)
    )
  );
  return g;
};

// Helper to build a car in the carport
function buildCar(K, room, cx, cn) {
  // Body lower
  K.box(room, 'bronze', cx - 0.95, cn - 2.1, cx + 0.95, cn + 2.1, 0.18, 0.72);
  // Cabin upper
  K.box(room, 'bronze', cx - 0.85, cn - 0.8, cx + 0.85, cn + 1.2, 0.72, 1.38);
  // Glass windows
  K.box(room, 'glass', cx - 0.86, cn - 0.75, cx + 0.86, cn + 1.15, 0.76, 1.34);
  // Wheels
  for (const dx of [-0.98, 0.98]) {
    for (const dn of [-1.3, 1.3]) {
      K.box(room, 'ceramicDark', cx + dx - 0.12, cn + dn - 0.32, cx + dx + 0.12, cn + dn + 0.32, 0.0, 0.62);
    }
  }
  // Headlights
  K.box(room, 'lamp', cx - 0.75, cn - 2.12, cx - 0.45, cn - 2.08, 0.45, 0.62);
  K.box(room, 'lamp', cx + 0.45, cn - 2.12, cx + 0.75, cn - 2.08, 0.45, 0.62);
}

// Helper to build a bed
function buildBed(K, room, x, n, w, l, matWood = 'oakLong') {
  K.box(room, matWood, x, n, x + w, n + l, 0, 0.45); // base
  K.box(room, matWood, x - 0.05, n + l - 0.1, x + w + 0.05, n + l, 0, 1.05); // headboard
  K.box(room, 'generic', x + 0.08, n + 0.08, x + w - 0.08, n + l - 0.15, 0.45, 0.58); // mattress
  // pillows
  const pw = (w - 0.3) / 2;
  K.box(room, 'generic', x + 0.1, n + l - 0.7, x + 0.1 + pw, n + l - 0.2, 0.58, 0.66);
  K.box(room, 'generic', x + 0.2 + pw, n + l - 0.7, x + 0.2 + pw * 2, n + l - 0.2, 0.58, 0.66);
  // bedside nightstands
  K.box(room, matWood, x - 0.55, n + l - 0.55, x - 0.1, n + l - 0.05, 0, 0.48);
  K.box(room, matWood, x + w + 0.1, n + l - 0.55, x + w + 0.55, n + l - 0.05, 0, 0.48);
  K.box(room, 'lamp', x - 0.4, n + l - 0.38, x - 0.25, n + l - 0.22, 0.48, 0.72);
  K.box(room, 'lamp', x + w + 0.25, n + l - 0.38, x + w + 0.4, n + l - 0.22, 0.48, 0.72);
}

// ---------------------------------------------------------------------------
// BUILD HOUSE
// ---------------------------------------------------------------------------
export function buildHouse(floorKey = 'ground') {
  const isFirst = floorKey === 'first';
  const rooms = isFirst ? FIRST_ROOMS : GROUND_ROOMS;
  const roomAt = (x, n, y = 0) => roomAtFloor(rooms, x, n, y);

  const S = new RectSolid();
  const A = (x0, n0, x1, n1, y0, y1) => S.add(x0, y0, -n0, x1, y1, -n1);
  const C = (x0, n0, x1, n1, y0, y1) => S.sub(x0, y0, -n0, x1, y1, -n1);

  const H_WALL = 3.2;
  const K = new Kit();
  const G = 'generic';

  if (!isFirst) {
    // =======================================================================
    // GROUND FLOOR
    // =======================================================================
    // 1. Floor Slabs
    A(-6.4, -6.4, -2.6, 0.0, BASE_Y, 0);     // Car park slab
    A(-2.6, -2.2, 0.0, 0.0, BASE_Y, 0);      // Verandah porch slab
    A(-2.6, -2.5, 0.0, -2.2, BASE_Y - 0.08, BASE_Y); // Entrance steps
    A(-6.0, 0.0, 1.0, 10.18, BASE_Y, 0);     // Living, Dining, Pantry slab
    A(1.0, 0.0, 6.05, 6.4, BASE_Y, 0);       // Stairs, Bed 04, Bath 05 slab

    // 2. Outer Walls
    // Front wall: Living & Verandah
    A(-2.6, 0.0, 1.0, 0.22, 0, H_WALL);
    // Bedroom 04 front wall
    A(3.0, 0.0, 6.05, 0.22, 0, H_WALL);

    // West wall: Pantry & Dining
    A(-6.0, 6.22, -5.78, 10.18, 0, H_WALL);

    // North wall (Rear): Pantry & Dining
    A(-6.0, 9.96, 0.45, 10.18, 0, H_WALL);

    // East wall: Bed 04 & Bath 05
    A(5.83, 0.0, 6.05, 6.4, 0, H_WALL);

    // North wall: Bath 05
    A(3.0, 6.18, 6.05, 6.4, 0, H_WALL);

    // 3. Interior Walls
    // Divider Living | Dining (cased archway)
    A(-2.6, 6.0, 1.0, 6.22, 0, H_WALL);
    C(-2.0, 5.9, 0.5, 6.3, 0, 2.7);

    // Divider Pantry | Dining
    A(-2.82, 6.22, -2.6, 10.18, 0, H_WALL);
    C(-2.9, 7.0, -2.5, 7.95, 0, 2.2); // Doorway to pantry

    // Living / Staircase wall
    A(0.78, 0.0, 1.0, 6.22, 0, H_WALL);
    C(0.7, 0.4, 1.1, 1.8, 0, 2.5);   // Opening from living to stairs & bedroom hall

    // Bedroom 04 west wall
    A(2.78, 0.0, 3.0, 6.22, 0, H_WALL);
    C(2.7, 0.6, 3.1, 1.5, 0, 2.2);   // Door to Bed 04
    C(2.7, 5.0, 3.1, 5.9, 0, 2.2);   // Door to Bath 05

    // Wall between Bed 04 and Bath 05
    A(3.0, 4.66, 6.05, 4.88, 0, H_WALL);

    // 4. Openings (Windows and Doors)
    // Main entrance door
    C(-1.6, -0.1, -0.6, 0.3, 0, 2.4);
    // Bedroom 04 front window
    C(3.8, -0.1, 5.3, 0.3, 0.9, 2.3);
    // Bedroom 04 side window
    C(5.8, 1.8, 6.1, 3.6, 0.9, 2.3);
    // Bath 05 high window
    C(5.8, 5.2, 6.1, 5.9, 1.8, 2.3);
    // Pantry west window
    C(-6.1, 7.5, -5.7, 9.2, 1.0, 2.2);
    // Dining rear french window
    C(-1.8, 9.9, -0.2, 10.3, 0, 2.5);

    // 5. Car Park Pergola Pillars & Beams
    for (const [px, pn] of [[-6.3, -6.3], [-2.8, -6.3], [-6.3, -0.2], [-2.8, -0.2]]) {
      K.box('carpark', 'bronze', px, pn, px + 0.25, pn + 0.25, 0, 2.85);
    }
    // Overhead pergola beams
    for (let bn = -6.0; bn <= -0.4; bn += 1.2) {
      K.box('carpark', 'oakLong', -6.4, bn, -2.6, bn + 0.14, 2.85, 3.0);
    }

    // Car inside carport
    buildCar(K, 'carpark', -4.5, -3.2);

    // 6. Staircase (Rising from y=0 to y=3.2 at first floor)
    const numSteps = 16;
    const stepH = 3.2 / numSteps;
    const stepL = 3.2 / 10;
    for (let i = 0; i < 9; i++) {
      // First flight
      const sn0 = 1.6 + i * stepL;
      K.box('living', 'oakLong', 1.05, sn0, 2.0, sn0 + stepL, 0, (i + 1) * stepH);
    }
    // Landing
    K.box('living', 'oakLong', 1.05, 4.48, 2.95, 5.3, 0, 9 * stepH);
    // Second flight heading back
    for (let i = 0; i < 7; i++) {
      const sn0 = 4.48 - i * stepL;
      K.box('living', 'oakLong', 2.0, sn0, 2.95, sn0 + stepL, 0, (10 + i) * stepH);
    }
    // Stair railing
    K.box('living', 'bronze', 1.95, 1.6, 2.05, 4.5, 0.9, 1.8);

    // 7. Living Room Furniture
    // L-Sofa
    K.box('living', 'leather', -2.2, 1.2, -1.2, 4.4, 0, 0.44);
    K.box('living', 'leather', -2.4, 1.2, -2.15, 4.4, 0.44, 0.82); // back
    K.box('living', 'leather', -2.2, 4.4, -0.4, 5.2, 0, 0.44);     // chaise
    // Coffee table
    K.box('living', 'oakLong', -1.0, 2.4, 0.2, 3.6, 0, 0.38);
    // TV Credenza on east wall
    K.box('living', 'oakLong', 0.45, 1.5, 0.75, 4.2, 0, 0.55);
    K.box('living', 'ceramicDark', 0.55, 2.2, 0.65, 3.5, 0.55, 1.35); // TV screen

    // 8. Dining Furniture
    K.box('dining', 'oakLong', -2.0, 7.2, -0.2, 9.2, 0.72, 0.77); // Table
    // Table legs
    for (const [lx, ln] of [[-1.9, 7.3], [-0.3, 7.3], [-1.9, 9.1], [-0.3, 9.1]]) {
      K.box('dining', 'bronze', lx, ln, lx + 0.08, ln + 0.08, 0, 0.72);
    }
    // 6 Chairs
    for (const cn of [7.5, 8.2, 8.9]) {
      K.box('dining', 'oakLong', -2.5, cn - 0.2, -2.1, cn + 0.2, 0, 0.46);
      K.box('dining', 'oakLong', -2.5, cn - 0.2, -2.45, cn + 0.2, 0.46, 0.85);
      K.box('dining', 'oakLong', -0.1, cn - 0.2, 0.3, cn + 0.2, 0, 0.46);
      K.box('dining', 'oakLong', 0.25, cn - 0.2, 0.3, cn + 0.2, 0.46, 0.85);
    }

    // 9. Pantry / Kitchen
    // L-counter
    K.box('pantry', 'stone', -5.75, 6.4, -3.2, 7.1, 0, 0.92);
    K.box('pantry', 'stone', -5.75, 7.1, -5.0, 9.8, 0, 0.92);
    // Sink and cooktop
    K.box('pantry', 'bronze', -5.6, 7.8, -5.15, 8.6, 0.92, 0.93);
    K.box('pantry', 'ceramicDark', -4.6, 6.5, -3.8, 6.95, 0.92, 0.94);

    // 10. Bedroom 04
    buildBed(K, 'rest', 3.3, 1.2, 1.9, 2.2);
    // Wardrobe along north wall
    K.box('rest', 'oakLong', 3.2, 4.1, 5.8, 4.65, 0, 2.4);

    // 11. Bathroom 05
    K.box('rest', 'stone', 3.2, 4.9, 4.2, 5.4, 0, 0.82); // Vanity
    K.box('rest', 'ceramicDark', 4.8, 5.7, 5.3, 6.1, 0, 0.45); // WC
    K.box('rest', 'glass', 4.3, 4.88, 4.35, 6.2, 0, 2.1); // Shower glass
  } else {
    // =======================================================================
    // FIRST FLOOR
    // =======================================================================
    // 1. Floor Slabs
    A(-6.4, -6.4, -2.6, -1.8, BASE_Y, 0);     // Open terrace over carport
    A(-6.2, -1.8, -3.0, 2.47, BASE_Y, 0);      // Master Bedroom slab
    A(-3.0, 0.0, 1.1, 2.44, BASE_Y, 0);        // Family Living slab
    A(1.1, 0.0, 4.0, 1.83, BASE_Y, 0);         // Study Area slab
    A(-3.0, 2.44, 1.0, 5.56, BASE_Y, 0);       // Bedroom 12 slab
    A(1.0, 1.83, 3.0, 5.2, BASE_Y, 0);         // Staircase landing & void area
    C(1.1, 2.0, 2.9, 4.8, BASE_Y - 0.2, 0.2); // Stair void opening (looking down!)
    A(3.0, 0.0, 6.05, 5.03, BASE_Y, 0);        // Bedroom 11 slab
    A(3.0, 5.03, 5.9, 6.55, BASE_Y, 0);        // Bathroom 10 slab

    // Balconies
    A(-3.0, -1.0, 4.0, 0.0, BASE_Y, 0);        // Front Balcony
    A(3.0, -1.0, 6.05, 0.0, BASE_Y, 0);        // Bed 11 Balcony
    A(-6.2, 2.47, -3.0, 3.47, BASE_Y, 0);      // Master side balcony

    // 2. Outer Walls
    // Front wall: Master, Family Living, Study, Bed 11
    A(-6.2, -1.8, -3.0, -1.58, 0, H_WALL);
    A(-3.0, 0.0, 1.1, 0.22, 0, H_WALL);
    A(1.1, 0.0, 4.0, 0.22, 0, H_WALL);
    A(3.0, 0.0, 6.05, 0.22, 0, H_WALL);

    // West wall: Master Bedroom
    A(-6.2, -1.8, -5.98, 2.47, 0, H_WALL);

    // North wall: Bed 12
    A(-3.0, 5.34, 1.0, 5.56, 0, H_WALL);

    // East wall: Bed 11 & Bath 10
    A(5.83, 0.0, 6.05, 6.55, 0, H_WALL);
    A(3.0, 6.33, 5.9, 6.55, 0, H_WALL);

    // 3. Interior Partitions
    // Master Bed | Family Living
    A(-3.0, -1.8, -2.78, 2.47, 0, H_WALL);
    // Family Living | Bed 12
    A(-3.0, 2.22, 1.0, 2.44, 0, H_WALL);
    // Bed 12 | Stair void
    A(0.78, 2.44, 1.0, 5.56, 0, H_WALL);
    // Bed 11 west wall
    A(2.78, 0.0, 3.0, 5.03, 0, H_WALL);
    // Bed 11 / Bath 10 partition
    A(3.0, 4.81, 5.9, 5.03, 0, H_WALL);

    // 4. Openings
    // Master door to Open Terrace
    C(-5.4, -1.9, -3.8, -1.5, 0, 2.4);
    // Master door to hallway
    C(-3.1, 0.4, -2.7, 1.3, 0, 2.2);
    // Family living balcony sliding glass
    C(-2.2, -0.1, 0.2, 0.3, 0, 2.4);
    // Study front window
    C(1.8, -0.1, 3.4, 0.3, 0.9, 2.2);
    // Bed 11 balcony door
    C(3.8, -0.1, 4.8, 0.3, 0, 2.4);
    // Bed 11 side window
    C(5.8, 1.8, 6.1, 3.8, 0.9, 2.2);
    // Bath 10 window
    C(5.8, 5.4, 6.1, 6.1, 1.8, 2.3);
    // Bed 12 rear window
    C(-1.8, 5.3, 0.2, 5.6, 0.9, 2.2);

    // 5. Terrace & Balcony Glass Railings
    // Open Terrace perimeter glass railing
    K.box('terrace', 'glass', -6.4, -6.4, -6.36, -1.8, 0, 1.05);
    K.box('terrace', 'glass', -6.4, -6.4, -2.6, -6.36, 0, 1.05);
    K.box('terrace', 'glass', -2.64, -6.4, -2.6, -1.8, 0, 1.05);
    K.box('terrace', 'bronze', -6.4, -6.4, -2.6, -1.8, 1.02, 1.06);

    // Balcony front glass railing
    K.box('family', 'glass', -3.0, -1.0, 4.0, -0.96, 0, 1.05);
    K.box('family', 'bronze', -3.0, -1.0, 4.0, -0.96, 1.02, 1.06);

    // Staircase Void protective balustrade
    K.box('family', 'glass', 1.05, 1.95, 2.95, 2.0, 0, 1.05);
    K.box('family', 'glass', 2.9, 2.0, 2.95, 4.85, 0, 1.05);
    K.box('family', 'bronze', 1.05, 1.95, 2.95, 4.85, 1.02, 1.06);

    // 6. Furniture: Master Suite
    buildBed(K, 'master', -5.7, -0.8, 2.0, 2.2);
    // Wardrobe
    K.box('master', 'oakLong', -3.6, -1.6, -3.0, 1.8, 0, 2.4);

    // 7. Furniture: Family Living
    K.box('family', 'leather', -2.4, 0.6, -0.2, 1.5, 0, 0.44); // Lounge sofa
    K.box('family', 'oakLong', -1.8, 1.7, -0.8, 2.2, 0, 0.38); // Coffee table

    // 8. Furniture: Study Area
    K.box('study', 'oakLong', 1.5, 0.4, 3.5, 1.1, 0.72, 0.76); // Desk
    K.box('study', 'bronze', 2.2, 0.6, 2.8, 1.0, 0, 0.72);      // Base
    K.box('study', 'ceramicDark', 2.1, 0.6, 2.7, 0.9, 0.76, 1.15); // Laptop/Monitor

    // 9. Furniture: Terrace
    K.box('terrace', 'oakLong', -5.2, -4.5, -4.0, -3.3, 0, 0.38); // Outdoor low table
    K.box('terrace', 'leather', -5.4, -3.0, -4.2, -2.2, 0, 0.42); // Lounger

    // 10. Bedrooms 11 and 12
    buildBed(K, 'rest', 3.3, 1.2, 1.9, 2.1); // Bed 11
    buildBed(K, 'rest', -2.2, 2.8, 1.8, 2.1); // Bed 12

    // 11. Bathroom 10
    K.box('rest', 'stone', 3.2, 5.15, 4.2, 5.65, 0, 0.82); // Vanity
    K.box('rest', 'ceramicDark', 4.8, 5.9, 5.3, 6.3, 0, 0.45); // WC
  }

  // Shell build
  const shell = S.build(
    (cx, cy, cz, nx, ny, nz) => {
      const n = -cz;
      if (ny > 0.5 && Math.abs(cy) < 1e-3) return 'floor';
      if (cx > 1.99 && cx < 2.19 && n > 0 && n < 7 && cy > 0 && cy < 2.7 && nx < 0.5) return 'oak';
      return 'plaster';
    },
    (mx, my, mz, ax, ay, az) => roomAt(ax, -az, ay)
  );

  // Roof build (solid lid for cut transition)
  const Rf = new RectSolid();
  const RA = (x0, n0, x1, n1, y0, y1) => Rf.add(x0, y0, -n0, x1, y1, -n1);
  if (!isFirst) {
    RA(-6.0, 0, 1.0, 10.18, 3.2, 3.5);
    RA(1.0, 0, 6.05, 6.4, 3.2, 3.5);
  } else {
    RA(-6.2, -1.8, 6.05, 6.55, 3.2, 3.5);
  }
  const roof = Rf.build(
    (cx, cy, cz, nx, ny) => (ny < -0.5 ? 'ceiling' : 'plaster'),
    (mx, my, mz, ax, ay, az) => roomAt(ax, -az, ay)
  );

  // Entrance Door
  const doorB = { p: [], n: [], uv: [], idx: [] };
  const pullB = { p: [], n: [], uv: [], idx: [] };
  const doorE = [];
  const doorPivot = isFirst ? new THREE.Vector3(-3.0, 0, 0.5) : new THREE.Vector3(-1.6, 0, 0.1);
  pushBox(doorB, doorE, -0.05, 0.012, -0.035, 0.95, 2.35, 0.035);
  pushBox(pullB, doorE, 0.82, 0.85, 0.035, 0.86, 1.65, 0.085);
  pushBox(pullB, doorE, 0.82, 0.85, -0.085, 0.86, 1.65, -0.035);

  return {
    shell, roof, kit: K,
    door: { leaf: bucketToGeometry(doorB), pull: bucketToGeometry(pullB), edges: doorE, pivot: doorPivot },
    bucketToGeometry,
  };
}
