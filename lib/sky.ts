import type { SkyScene } from "@/lib/types";

export type Rgb = [number, number, number];

export type CloudSpriteSpec = {
  width: number;
  height: number;
  seed: number;
  cellsX: number;
  cellsY: number;
  octaves: number;
  /** Amplitude falloff per octave. Higher values give rougher, more detailed cloud. */
  gain: number;
  /** Fraction of the noise field that resolves to cloud. */
  coverage: number;
  /** Width of the density ramp at cloud edges. */
  softness: number;
  /** Billow noise reads as cumulus; plain value noise reads as stratus. */
  billow: boolean;
  light: Rgb;
  dark: Rgb;
  /** Beer-Lambert coefficient for the self-shadowing march. */
  absorption: number;
  /**
   * Blend toward lighting the density gradient like a surface. Self-shadowing
   * alone goes flat once a sheet covers everything, because there is no sky
   * left to contrast against; relief keeps each mass reading as a lit top over
   * a shaded underside.
   */
  relief: number;
  /** Per-step offset toward the light source, in sprite pixels. */
  lightStep: [number, number];
  /**
   * Higher values squeeze the cloud into a tighter horizontal band. 0 disables
   * the mask entirely, giving a sheet that covers its whole height.
   */
  bandPower: number;
};

export type SkyLayer = {
  sprite: number;
  /** Fractions of viewport height. */
  top: number;
  height: number;
  /** Tile width as a multiple of viewport width. */
  scale: number;
  /** Drift in CSS pixels per second. */
  speed: number;
  alpha: number;
  /**
   * Strength of the projective foreshortening applied down the layer. 0 draws
   * the sheet flat; higher values shrink and slow the tiles toward the horizon
   * so the deck recedes instead of reading as a horizontal band.
   */
  perspective: number;
};

export type SceneConfig = {
  sky: Array<{ stop: number; color: Rgb }>;
  sun?: { x: number; y: number; radius: number; core: Rgb; glow: Rgb; alpha: number };
  /** Warm or cool light pooling along the horizon. */
  horizon?: { color: Rgb; alpha: number; height: number };
  /** Tileable fog and haze sheets. */
  sprites: CloudSpriteSpec[];
  layers: SkyLayer[];
  vignette: number;
  grain: number;
};

export function createRandom(seed: number) {
  return mulberry32(seed);
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fade = (t: number) => t * t * (3 - 2 * t);

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return fade(t);
}

/** Adds one octave of value noise that wraps on both axes. */
function addNoiseOctave(
  out: Float32Array,
  w: number,
  h: number,
  cellsX: number,
  cellsY: number,
  rand: () => number,
  amp: number,
  billow: boolean,
) {
  const grid = new Float32Array(cellsX * cellsY);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();

  for (let y = 0; y < h; y++) {
    const gy = (y / h) * cellsY;
    const gy0 = Math.floor(gy);
    const ty = fade(gy - gy0);
    const row0 = (gy0 % cellsY) * cellsX;
    const row1 = ((gy0 + 1) % cellsY) * cellsX;

    for (let x = 0; x < w; x++) {
      const gx = (x / w) * cellsX;
      const gx0 = Math.floor(gx);
      const tx = fade(gx - gx0);
      const c0 = gx0 % cellsX;
      const c1 = (gx0 + 1) % cellsX;

      const top = grid[row0 + c0] + (grid[row0 + c1] - grid[row0 + c0]) * tx;
      const bottom = grid[row1 + c0] + (grid[row1 + c1] - grid[row1 + c0]) * tx;
      let v = top + (bottom - top) * ty;
      if (billow) v = 1 - Math.abs(2 * v - 1);
      out[y * w + x] += v * amp;
    }
  }
}

function fbm(spec: CloudSpriteSpec) {
  const { width: w, height: h } = spec;
  const out = new Float32Array(w * h);
  let amp = 1;
  let norm = 0;

  for (let o = 0; o < spec.octaves; o++) {
    const step = 1 << o;
    addNoiseOctave(
      out,
      w,
      h,
      Math.max(2, spec.cellsX * step),
      Math.max(2, spec.cellsY * step),
      mulberry32(spec.seed + o * 7919 + 13),
      amp,
      spec.billow,
    );
    norm += amp;
    amp *= spec.gain;
  }

  const inv = 1 / norm;
  for (let i = 0; i < out.length; i++) out[i] *= inv;
  return out;
}

function sampleWrapped(field: Float32Array, w: number, h: number, x: number, y: number) {
  const xi = ((Math.round(x) % w) + w) % w;
  const yi = ((Math.round(y) % h) + h) % h;
  return field[yi * w + xi];
}

/**
 * Renders a horizontally tileable cloud sheet. Density comes from fBm; shading
 * comes from marching each pixel toward the light and attenuating by the
 * density it passes through, which is what gives the puffs their volume.
 */
export function buildCloudSprite(spec: CloudSpriteSpec): HTMLCanvasElement {
  const { width: w, height: h } = spec;
  const field = fbm(spec);
  const density = new Float32Array(w * h);
  // Optical depth stays continuous where density clips to 1, so a fully opaque
  // sheet still has somewhere for the light march to find contrast.
  const optical = new Float32Array(w * h);
  const floor = 1 - spec.coverage;

  for (let y = 0; y < h; y++) {
    const band =
      spec.bandPower === 0 ? 1 : Math.pow(Math.sin((Math.PI * (y + 0.5)) / h), spec.bandPower);
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const value = field[i] * band;
      optical[i] = value;
      density[i] = smoothstep(floor, floor + spec.softness, value);
    }
  }

  return paintShadedCloud(w, h, density, optical, spec);
}

type ShadingSpec = {
  light: Rgb;
  dark: Rgb;
  absorption: number;
  relief: number;
  lightStep: [number, number];
};

/**
 * Shades a density field into a canvas. Each pixel marches toward the light
 * through the continuous optical field (Beer-Lambert self-shadowing), then
 * blends in gradient-facing relief so lit tops stay distinct from undersides.
 */
function paintShadedCloud(
  w: number,
  h: number,
  density: Float32Array,
  optical: Float32Array,
  spec: ShadingSpec,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const image = ctx.createImageData(w, h);
  const px = image.data;
  const [lx, ly] = spec.lightStep;
  const lightLength = Math.hypot(lx, ly);
  const lightX = lx / lightLength;
  const lightY = ly / lightLength;
  const steps = 8;
  const reach = 7;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const alpha = density[i];
      const o = i * 4;
      if (alpha <= 0.003) continue;

      let occlusion = 0;
      for (let s = 1; s <= steps; s++) {
        occlusion += sampleWrapped(optical, w, h, x + lx * s, y + ly * s);
      }
      const transmittance = Math.exp((-spec.absorption * occlusion) / steps);

      let lit = transmittance;
      if (spec.relief > 0) {
        const gx =
          sampleWrapped(optical, w, h, x + reach, y) - sampleWrapped(optical, w, h, x - reach, y);
        const gy =
          sampleWrapped(optical, w, h, x, y + reach) - sampleWrapped(optical, w, h, x, y - reach);
        const slope = Math.hypot(gx, gy) + 1e-5;
        // The iso-surface normal points down the density gradient.
        const facing = (-gx * lightX - gy * lightY) / slope;
        const relief = smoothstep(-0.6, 0.9, facing);
        lit = transmittance * (1 - spec.relief) + relief * spec.relief;
      }

      px[o] = spec.dark[0] + (spec.light[0] - spec.dark[0]) * lit;
      px[o + 1] = spec.dark[1] + (spec.light[1] - spec.dark[1]) * lit;
      px[o + 2] = spec.dark[2] + (spec.light[2] - spec.dark[2]) * lit;
      px[o + 3] = alpha * 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvas;
}

export function buildGrainTile(size = 128, seed = 991): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const image = ctx.createImageData(size, size);
  const px = image.data;
  const rand = mulberry32(seed);
  for (let i = 0; i < size * size; i++) {
    const v = 118 + rand() * 20;
    const o = i * 4;
    px[o] = v;
    px[o + 1] = v;
    px[o + 2] = v;
    px[o + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

const CUMULUS: Omit<CloudSpriteSpec, "seed"> = {
  width: 1024,
  height: 384,
  cellsX: 4,
  cellsY: 3,
  octaves: 7,
  gain: 0.56,
  coverage: 0.55,
  softness: 0.2,
  billow: true,
  light: [255, 254, 252],
  dark: [186, 202, 220],
  absorption: 4.0,
  relief: 0.2,
  lightStep: [1.4, -2.2],
  bandPower: 2.1,
};

const CIRRUS: Omit<CloudSpriteSpec, "seed"> = {
  width: 1024,
  height: 320,
  cellsX: 3,
  cellsY: 2,
  octaves: 6,
  gain: 0.54,
  coverage: 0.46,
  softness: 0.34,
  billow: false,
  light: [255, 255, 255],
  dark: [226, 236, 247],
  absorption: 1.6,
  relief: 0.1,
  lightStep: [0.8, -1.8],
  bandPower: 1.3,
};

export const SCENES: Record<SkyScene, SceneConfig> = {
  sunny: {
    sky: [
      { stop: 0, color: [21, 78, 168] },
      { stop: 0.42, color: [56, 133, 211] },
      { stop: 0.76, color: [124, 186, 233] },
      { stop: 1, color: [189, 221, 240] },
    ],
    sun: {
      x: 0.79,
      y: 0.15,
      radius: 0.62,
      core: [255, 253, 240],
      glow: [255, 234, 186],
      alpha: 0.6,
    },
    horizon: { color: [255, 236, 206], alpha: 0.22, height: 0.3 },
    sprites: [
      // cellsY 3-4 gives each sheet several distinct streaks stacked
      // vertically instead of a single band; low bandPower keeps the streaks
      // from being masked down to the sheet's midline.
      { ...CIRRUS, seed: 1201, cellsY: 3, coverage: 0.6, softness: 0.34, bandPower: 0.7 },
      // Gentle shading on the low deck: a near-white dark tone, light
      // absorption and a wide alpha ramp keep the grey undersides melting into
      // the surrounding haze instead of sitting on it as flat cutouts.
      {
        ...CUMULUS,
        seed: 4409,
        cellsY: 4,
        coverage: 0.62,
        softness: 0.42,
        bandPower: 0.8,
        dark: [216, 228, 241],
        absorption: 2.0,
        relief: 0.1,
      },
      { ...CIRRUS, seed: 7723, cellsY: 3, coverage: 0.62, softness: 0.44, bandPower: 0.6 },
    ],
    layers: [
      // Three tall overlapping bands so clouds fill the sky top to bottom;
      // gentle perspective keeps each band from squashing into a thin strip.
      { sprite: 0, top: 0.0, height: 0.42, scale: 1.7, speed: 16, alpha: 0.8, perspective: 1.3 },
      { sprite: 2, top: 0.32, height: 0.4, scale: 1.4, speed: 30, alpha: 0.72, perspective: 1.5 },
      { sprite: 1, top: 0.52, height: 0.44, scale: 1.2, speed: 42, alpha: 0.66, perspective: 1.7 },
    ],
    vignette: 0.16,
    grain: 0.035,
  },

  // A cloudy West SF sky: layered grey fog sheets drifting sideways at
  // different speeds for parallax, with the sun reduced to a diffuse patch.
  cloudy: {
    sky: [
      { stop: 0, color: [92, 102, 116] },
      { stop: 0.42, color: [134, 143, 155] },
      { stop: 0.76, color: [175, 181, 188] },
      { stop: 1, color: [203, 207, 211] },
    ],
    sun: {
      x: 0.66,
      y: 0.22,
      radius: 0.72,
      core: [247, 245, 238],
      glow: [226, 226, 224],
      alpha: 0.3,
    },
    horizon: { color: [222, 225, 227], alpha: 0.24, height: 0.38 },
    sprites: [
      // Distant haze band and low fog bank; both sit far behind the clouds.
      {
        ...CUMULUS,
        seed: 3313,
        cellsX: 3,
        cellsY: 2,
        gain: 0.52,
        coverage: 0.74,
        softness: 0.36,
        billow: false,
        light: [244, 246, 249],
        dark: [150, 159, 172],
        absorption: 2.4,
        relief: 0.1,
        bandPower: 0.8,
      },
      {
        ...CIRRUS,
        seed: 5501,
        cellsX: 2,
        cellsY: 2,
        coverage: 0.78,
        softness: 0.48,
        light: [251, 252, 253],
        dark: [208, 213, 217],
        absorption: 1.6,
        relief: 0.1,
        bandPower: 0.7,
      },
    ],
    layers: [
      // Speeds are near-edge values spread far apart, so the three banks
      // visibly slide relative to one another as well as within themselves.
      { sprite: 0, top: -0.3, height: 0.8, scale: 1.6, speed: 14, alpha: 0.55, perspective: 1.8 },
      { sprite: 0, top: 0.25, height: 0.6, scale: 1.1, speed: 48, alpha: 0.4, perspective: 2.4 },
      { sprite: 1, top: 0.55, height: 0.55, scale: 1.9, speed: 28, alpha: 0.35, perspective: 1.2 },
    ],
    vignette: 0.18,
    grain: 0.04,
  },
};

export function rgba(color: Rgb, alpha: number) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}
