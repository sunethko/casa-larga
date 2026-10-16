// Contemporary Residence: Ground Floor and First Floor data
// Converted from Architectural Blueprints (Scale 8' to an inch) to metres.
//
// Plan coordinates: x runs east, n runs north from front wall line.
// In three.js that is (x, y up, z = -n). Walking north is down negative z.
// Everything is in metres (1 ft = 0.3048 m).

export const PAPER = '#f1eee6';
export const INK = '#17171a';

export const GROUND_Y = -0.16; // the sheet of paper the house stands on
export const BASE_Y = -0.15;   // underside of the floor slab
export const CUT_PLAN = 1.2;   // architect's cutting plane height (1.2m)
export const CUT_OPEN = 5.4;   // open above walls: nothing cut

export const EYE = 1.6;

// ---------------------------------------------------------------------------
// GROUND FLOOR (Sheet A-101, 1015 sq.ft)
// ---------------------------------------------------------------------------
export const GROUND_ROOMS = [
  { key: 'carpark', name: 'CAR PARK (06)', x0: -6.4, x1: -2.6, n0: -6.4, n1: 0.0, ceil: 2.9, walk: true, dir: [0, 1], clear: [3.66, 6.22], size: '10\'-0" x 20\'-5"' },
  { key: 'verandah', name: 'VERANDAH', x0: -2.6, x1: 0.0, n0: -1.8, n1: 0.0, ceil: 2.8, walk: true, dir: [0, 1], clear: [2.6, 1.8], size: '8\'-6" x 6\'-0"' },
  { key: 'living', name: 'LIVING (01)', x0: -2.6, x1: 1.0, n0: 0.0, n1: 6.22, ceil: 3.2, walk: true, dir: [0, 1], clear: [3.66, 6.22], size: '12\'-0" x 20\'-5"' },
  { key: 'dining', name: 'DINING (03)', x0: -2.6, x1: 0.45, n0: 6.22, n1: 10.18, ceil: 3.0, walk: true, dir: [0, 1], clear: [3.05, 3.96], size: '10\'-0" x 13\'-0"' },
  { key: 'pantry', name: 'PANTRY (02)', x0: -5.65, x1: -2.6, n0: 6.22, n1: 10.18, ceil: 2.8, walk: true, dir: [0, 1], clear: [3.05, 3.96], size: '10\'-0" x 13\'-0"' },
  { key: 'stairs', name: 'STAIRS', x0: 1.0, x1: 3.0, n0: 1.5, n1: 5.0, ceil: 5.8, walk: true, dir: [0, 1], clear: [2.0, 3.5], size: '6\'-6" x 11\'-6"' },
];

export const GROUND_SIDE_ROOMS = [
  { name: 'BED ROOM (04)', x: 4.5, n: 2.44, clear: [3.05, 4.88], size: '10\'-0" x 16\'-0"' },
  { name: 'BATH ROOM (05)', x: 4.5, n: 5.64, clear: [3.05, 1.52], small: true, size: '10\'-0" x 5\'-0"' },
];

export const GROUND_DOORS = [
  { x: -1.3, n: 0.0, open: 90, closed: 0 },   // Main entrance door
  { x: 3.0, n: 0.8, open: 0, closed: 90 },    // Bedroom 04 door
  { x: 3.0, n: 5.2, open: 0, closed: 90 },    // Bathroom 05 door
  { x: -2.6, n: 7.2, open: -90, closed: 0 },  // Pantry door
];

// ---------------------------------------------------------------------------
// FIRST FLOOR (Sheet A-102, 1367 sq.ft)
// ---------------------------------------------------------------------------
export const FIRST_ROOMS = [
  { key: 'family', name: 'FAMILY LIVING (07)', x0: -3.0, x1: 1.1, n0: 0.0, n1: 2.44, ceil: 3.0, walk: true, dir: [0, 1], clear: [4.11, 2.44], size: '13\'-6" x 8\'-0"' },
  { key: 'study', name: 'STUDY AREA (09)', x0: 1.1, x1: 4.0, n0: 0.0, n1: 1.83, ceil: 2.9, walk: true, dir: [0, 1], clear: [2.90, 1.83], size: '9\'-6" x 6\'-0"' },
  { key: 'terrace', name: 'OPEN TERRACE', x0: -6.4, x1: -2.6, n0: -6.4, n1: -1.8, ceil: 20, walk: true, dir: [0, 1], clear: [3.8, 4.6], size: '12\'-6" x 15\'-0"' },
  { key: 'master', name: 'MASTER BEDROOM (08)', x0: -6.2, x1: -3.0, n0: -1.8, n1: 2.47, ceil: 3.0, walk: true, dir: [0, 1], clear: [3.18, 4.27], size: '10\'-5" x 14\'-0"' },
];

export const FIRST_SIDE_ROOMS = [
  { name: 'BEDROOM (12)', x: -1.0, n: 4.0, clear: [3.96, 3.12], size: '13\'-0" x 10\'-3"' },
  { name: 'BEDROOM (11)', x: 4.5, n: 2.5, clear: [3.05, 5.03], size: '10\'-0" x 16\'-6"' },
  { name: 'BATHROOM (10)', x: 4.5, n: 5.75, clear: [2.90, 1.52], small: true, size: '9\'-6" x 5\'-0"' },
  { name: 'BALCONY', x: -4.6, n: 3.0, clear: [3.18, 1.1], small: true },
  { name: 'BALCONY', x: -0.9, n: -0.6, clear: [4.11, 1.1], small: true },
  { name: 'BALCONY', x: 2.5, n: -0.6, clear: [2.9, 1.1], small: true },
];

export const FIRST_DOORS = [
  { x: -3.0, n: 0.5, open: -90, closed: 0 },  // Master bed door
  { x: -5.0, n: -1.8, open: 90, closed: 0 },  // Master to terrace
  { x: -1.0, n: 2.44, open: 90, closed: 0 },  // Bedroom 12 door
  { x: 3.0, n: 0.8, open: 0, closed: 90 },    // Bedroom 11 door
  { x: 3.0, n: 5.3, open: 0, closed: 90 },    // Bathroom 10 door
];

// Active floor proxy state
export let CURRENT_FLOOR = 'ground'; // 'ground' | 'first'

export function setFloor(floorKey) {
  CURRENT_FLOOR = floorKey;
}

export function getFloorData(floorKey = CURRENT_FLOOR) {
  if (floorKey === 'first') {
    return {
      rooms: FIRST_ROOMS,
      sideRooms: FIRST_SIDE_ROOMS,
      doors: FIRST_DOORS,
      project: {
        name: 'Contemporary Two-Storey Residence',
        place: 'Plot 14, Garden City',
        drawing: 'First Floor Plan',
        sheet: 'A-102',
        scale: '8 feet to an inch',
        area: '1,367 sq.ft (Total with Terrace & Balcony)',
        date: '15.10.2026',
      },
      captions: {
        lift: { no: '02 · The First Floor Rise', say: 'Watch the first floor private wing and balconies rise directly from the structural drawing.' },
        mid: { no: '03 · Family Living & Study', say: 'Upper lounge connecting to balcony, study corner, and the open-to-below stair void.' },
        walk: { no: '04 · Master Bedroom & Open Terrace', say: '10\'-5" × 14\'-0" master suite with panoramic glass doors opening out onto the private terrace.' },
      },
      rail: [
        { label: '01 Sheet', at: 0 },
        { label: '02 Lift', at: 0.06 },
        { label: '03 Lounge', at: 0.56 },
        { label: '04 Terrace', at: 0.8 },
      ]
    };
  }
  return {
    rooms: GROUND_ROOMS,
    sideRooms: GROUND_SIDE_ROOMS,
    doors: GROUND_DOORS,
    project: {
      name: 'Contemporary Two-Storey Residence',
      place: 'Plot 14, Garden City',
      drawing: 'Ground Floor Plan',
      sheet: 'A-101',
      scale: '8 feet to an inch',
      area: '1,015 sq.ft (1,000 sq.ft without Car Park)',
      date: '15.10.2026',
    },
    captions: {
      lift: { no: '02 · The Ground Floor Rise', say: 'The blueprint begins flat on paper. As you scroll, solid masonry walls rise out of the ink.' },
      mid: { no: '03 · Portico & Entrance', say: 'Car porch and covered verandah leading into the spacious 12\'-0" × 20\'-5" living area.' },
      walk: { no: '04 · Living & Staircase', say: 'Warm oak, plastered walls, and custom wood-tread stairs ascending to the upper floor.' },
    },
    rail: [
      { label: '01 Sheet', at: 0 },
      { label: '02 Lift', at: 0.06 },
      { label: '03 Entrance', at: 0.56 },
      { label: '04 Living', at: 0.8 },
    ]
  };
}

// Foliage / Garden Trees around site
export const TREES = [
  { x: -8.5, n: -4.0, base: GROUND_Y, trunk: 2.2, r: 2.4, turn: 0.3 },
  { x: -8.0, n: 8.5, base: GROUND_Y, trunk: 2.0, r: 2.2, turn: 1.1 },
  { x: 8.5, n: -2.5, base: GROUND_Y, trunk: 2.4, r: 2.6, turn: 0.8 },
  { x: 8.2, n: 8.0, base: GROUND_Y, trunk: 1.9, r: 2.0, turn: 1.8 },
];

export const SUN_ELEV = 22;
export const SUN_HEADING = [0.55, -0.835];
