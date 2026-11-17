// Every tuning number and colour of Stitchbound lives here, so balance is changed in one place.

/** The logical canvas: the game draws at this size and the page scales it to fit the window. */
export const VIEW = { width: 1280, height: 800 };

/** The heirloom quilt that fills the field: 16 by 10 square patches. */
export const PATCH = { size: 80, cols: 16, rows: 10 };

/** Fixed simulation step, in seconds. */
export const STEP = 1 / 60;

/** Nights on the quilt road in Classic and Daily Seam; the Wyrm waits at night 5, the Matriarch at 10. */
export const ROAD_LENGTH = 10;

/** How much of the quilt (in whole patches) may be eaten before it unravels and the run is lost. */
export const QUILT_BUDGET = 26;

/** Whole patches of cloth darned back for free each time a night is survived. */
export const DAWN_MEND = 2;

export const STORAGE_KEY = 'stitchbound.v2';

export const PLAYER_BASE = {
  radius: 15,
  hp: 5,
  speed: 300,
  accel: 14,
  fireDelay: 0.17,
  pinDamage: 10,
  pinSpeed: 760,
  pinCount: 1,
  pierce: 0,
  bounce: 0,
  threadLength: 1120,
  loopDamage: 90,
  mendAmount: 0.55,
  dashSpeed: 980,
  dashTime: 0.16,
  dashCooldown: 1.15,
  invulnTime: 1.0,
  critChance: 0,
  critMult: 3,
  barbed: 0,
  buttons: 0,
  buttonDamage: 40,
  dashDamage: 0,
  hurtPins: 0,
  draftSize: 3,
  sequinBonus: 1,
  nightShield: 0,
  mothSlow: 1,
  hoopWave: 0,
  ringEvery: 0,
  loopHeal: false,
  heirloomBonus: 1,
  restHeal: 2,
};

/** Combo: kills within this many seconds of each other raise the score multiplier. */
export const COMBO = { window: 2.2, max: 8, killsPerStep: 3 };

/** The cut-felt palette. Warm, daylight fabric colours; dark ink for outlines so creatures read on the quilt. */
export const PALETTE = {
  ink: '#2a1d1a',
  inkSoft: 'rgba(42,29,26,0.55)',
  shadow: 'rgba(42,29,26,0.28)',
  table: '#3a2619',
  tableDark: '#24160f',
  cream: '#f6ecd6',
  paper: '#efe0c0',
  thread: '#d6333f',
  threadLight: '#ff8a8a',
  gold: '#f5c542',
  goldDeep: '#c98d17',
  mustard: '#e3a83b',
  terracotta: '#cf6a43',
  rose: '#ef9a92',
  teal: '#2f8178',
  sage: '#94b283',
  navy: '#2b4166',
  sky: '#8cc2d4',
  plum: '#5e4170',
  plumLight: '#9c7bb0',
  steel: '#d9dde3',
  steelDark: '#8a919c',
  danger: '#e0473a',
  sequin: '#f08fc0',
};

/** Fabric colours the patches are cut from. */
export const PATCH_COLORS = ['#e9c46a', '#e07a5f', '#f2cc8f', '#81b29a', '#6f8fb3', '#98c1d9', '#f4a7a1', '#c9ada7', '#a7c4a0', '#f1e3c8', '#d9a5b3', '#b5c99a'];

export const FONT = {
  display: 'Georgia, "Times New Roman", serif',
  ui: '"Trebuchet MS", "Segoe UI", Verdana, sans-serif',
  plain: 'Verdana, "Segoe UI", Arial, sans-serif',
};
