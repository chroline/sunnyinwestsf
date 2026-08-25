"use client";

import { useEffect, useRef } from "react";
import {
  SCENES,
  buildCloudSprite,
  buildGrainTile,
  createRandom,
  rgba,
  type SceneConfig,
} from "@/lib/sky";
import type { SkyScene } from "@/lib/types";

type Drop = { x: number; y: number; length: number; speed: number; alpha: number };

type Props = {
  scene: SkyScene;
  rain?: boolean;
};

function createLayerCanvas(width: number, height: number, dpr: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  return canvas;
}

/** Sky gradient, sun, horizon and film grain: everything that never moves. */
function buildBackdrop(
  config: SceneConfig,
  grainTile: HTMLCanvasElement,
  width: number,
  height: number,
  dpr: number,
) {
  const canvas = createLayerCanvas(width, height, dpr);
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return canvas;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  for (const stop of config.sky) sky.addColorStop(stop.stop, rgba(stop.color, 1));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  if (config.sun) {
    const { x, y, radius, core, glow, alpha } = config.sun;
    const cx = x * width;
    const cy = y * height;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * Math.max(width, height));
    gradient.addColorStop(0, rgba(core, alpha));
    gradient.addColorStop(0.1, rgba(glow, alpha * 0.55));
    gradient.addColorStop(0.42, rgba(glow, alpha * 0.16));
    gradient.addColorStop(1, rgba(glow, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  if (config.horizon) {
    const band = config.horizon.height * height;
    const gradient = ctx.createLinearGradient(0, height - band, 0, height);
    gradient.addColorStop(0, rgba(config.horizon.color, 0));
    gradient.addColorStop(1, rgba(config.horizon.color, config.horizon.alpha));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - band, width, band);
  }

  const grain = ctx.createPattern(grainTile, "repeat");
  if (grain) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = config.grain;
    ctx.fillStyle = grain;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  return canvas;
}

function buildVignette(config: SceneConfig, width: number, height: number, dpr: number) {
  const canvas = createLayerCanvas(width, height, dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const gradient = ctx.createRadialGradient(
    width * 0.5,
    height * 0.44,
    Math.min(width, height) * 0.22,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.8,
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, `rgba(0, 0, 0, ${config.vignette})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  return canvas;
}

export function SkyCanvas({ scene, rain = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const config = SCENES[scene] ?? SCENES.cloudy;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const random = createRandom(scene.length * 7919 + 101);

    const sprites: Array<HTMLCanvasElement | null> = config.sprites.map(() => null);
    const spriteReadyAt: number[] = config.sprites.map(() => 0);
    const grainTile = buildGrainTile();
    const drops: Drop[] = [];

    let backdrop: HTMLCanvasElement | null = null;
    let vignette: HTMLCanvasElement | null = null;
    let bloom: CanvasGradient | null = null;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let elapsed = 0;
    let lastFrame = 0;
    let frame = 0;
    let disposed = false;

    const seedRain = () => {
      drops.length = 0;
      if (!rain) return;
      const count = Math.round((width * height) / 5200);
      for (let i = 0; i < count; i++) {
        drops.push({
          x: random() * width * 1.2 - width * 0.1,
          y: random() * height,
          length: 12 + random() * 26,
          speed: 620 + random() * 620,
          alpha: 0.12 + random() * 0.28,
        });
      }
    };

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      backdrop = buildBackdrop(config, grainTile, width, height, dpr);
      vignette = buildVignette(config, width, height, dpr);

      bloom = null;
      if (config.sun) {
        const { x, y, radius, core, glow, alpha } = config.sun;
        const cx = x * width;
        const cy = y * height;
        bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * Math.max(width, height) * 0.5);
        bloom.addColorStop(0, rgba(core, alpha * 0.3));
        bloom.addColorStop(0.1, rgba(glow, alpha * 0.18));
        bloom.addColorStop(0.42, rgba(glow, alpha * 0.06));
        bloom.addColorStop(1, rgba(glow, 0));
      }

      seedRain();
    };

    const SLICES = 24;
    /** Snaps to whole device pixels so neighbouring rects neither gap nor overlap. */
    const snap = (value: number) => Math.round(value * dpr) / dpr;

    /**
     * Draws one fog sheet as a stack of horizontal slices whose source rows
     * are spread unevenly over the destination: rows near the horizon are
     * squeezed into less vertical space, so the deck recedes instead of reading
     * as a flat band.
     *
     * Parallax comes from the layers moving at different speeds. Slices within
     * one sheet all share the same offset on purpose: giving slices their own
     * speeds makes them desync without bound, which smears the texture into
     * nothing after a minute or two.
     *
     * Tiling is done by hand rather than with a CanvasPattern: a pattern
     * transform that changes every frame forces the tile to be re-rasterized,
     * while repeated drawImage calls stay a cheap blit.
     */
    const drawClouds = (now: number) => {
      for (const layer of config.layers) {
        const sprite = sprites[layer.sprite];
        if (!sprite) continue;

        const tile = Math.max(1, width * layer.scale);
        const layerTop = height * layer.top;
        const layerHeight = Math.max(1, height * layer.height);
        const k = layer.perspective;
        const slices = k > 0 ? SLICES : 1;
        // Normalises the warp so the slice stack still fills exactly layerHeight.
        const warpSpan = k > 0 ? 1 - 1 / (1 + k) : 1;
        const warp = (v: number) => (k > 0 ? (1 - 1 / (1 + k * v)) / warpSpan : v);

        const fadeIn = reduceMotion ? 1 : Math.min(1, (now - spriteReadyAt[layer.sprite]) / 900);

        const start = -((elapsed * layer.speed) % tile);
        const columns: Array<[number, number]> = [];
        for (let x = start; x < width; x += tile) {
          const left = snap(x);
          columns.push([left, snap(x + tile) - left]);
        }

        for (let i = 0; i < slices; i++) {
          const v0 = i / slices;
          const v1 = (i + 1) / slices;
          const w0 = warp(v0);
          const w1 = warp(v1);
          const sourceY = v0 * sprite.height;
          const sourceHeight = (v1 - v0) * sprite.height;
          const destY = snap(layerTop + w0 * layerHeight);
          const destHeight = snap(layerTop + w1 * layerHeight) - destY;
          if (destHeight <= 0) continue;

          // The warp compresses the sprite's built-in edge fade into a couple
          // of pixels at the layer's bottom, which reads as a hard grey line.
          // Fading the last quarter of the layer in *screen* space dissolves
          // the sheet before that edge can show.
          const edgeFade = Math.min(1, (1 - (w0 + w1) / 2) / 0.25);
          ctx.globalAlpha = layer.alpha * fadeIn * edgeFade;

          for (const [x, tileWidth] of columns) {
            ctx.drawImage(
              sprite,
              0,
              sourceY,
              sprite.width,
              sourceHeight,
              x,
              destY,
              tileWidth,
              destHeight,
            );
          }
        }

        ctx.globalAlpha = 1;
      }
    };

    const drawRain = (delta: number) => {
      if (!drops.length) return;
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(226, 238, 255, 1)";
      ctx.lineWidth = 1.1;
      for (const drop of drops) {
        drop.y += drop.speed * delta;
        drop.x += drop.speed * delta * 0.16;
        if (drop.y - drop.length > height) {
          drop.y = -drop.length;
          drop.x = random() * width * 1.2 - width * 0.1;
        }
        ctx.globalAlpha = drop.alpha;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - drop.length * 0.16, drop.y - drop.length);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const draw = (now: number) => {
      const delta = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
      lastFrame = now;
      if (!reduceMotion) elapsed += delta;

      if (backdrop) ctx.drawImage(backdrop, 0, 0, width, height);

      drawClouds(now);

      if (bloom) {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = bloom;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = "source-over";
      }

      drawRain(reduceMotion ? 0 : delta);

      if (vignette) ctx.drawImage(vignette, 0, 0, width, height);
    };

    const loop = (now: number) => {
      if (disposed) return;
      draw(now);
      frame = requestAnimationFrame(loop);
    };

    // Fog sprites cost tens of milliseconds each, so they are built one per
    // task and faded in as they land rather than blocking the first paint.
    const buildSprite = (index: number) => {
      if (disposed || index >= config.sprites.length) return;
      sprites[index] = buildCloudSprite(config.sprites[index]);
      spriteReadyAt[index] = performance.now();
      if (reduceMotion) draw(performance.now());
      window.setTimeout(() => buildSprite(index + 1), 0);
    };

    const onResize = () => {
      resize();
      if (reduceMotion) draw(performance.now());
    };

    resize();
    window.addEventListener("resize", onResize);
    window.setTimeout(() => buildSprite(0), 0);

    if (reduceMotion) {
      draw(performance.now());
    } else {
      frame = requestAnimationFrame(loop);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [scene, rain]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 h-full w-full"
    />
  );
}
