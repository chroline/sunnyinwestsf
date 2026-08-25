import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LOCATION } from "@/lib/site";

export const alt = `Will it be sunny in ${LOCATION}? — West SF Weather`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ImageResponse only parses ttf/otf/woff (not woff2), so the New York face is
// a ttf conversion of the woff2 next/font/local serves, and SF Pro uses the
// upstream otf files directly.
const fontDir = join(process.cwd(), "app/fonts");
const [newYorkItalic, sfProRegular, sfProBold, cloudsPng] = await Promise.all([
  readFile(join(fontDir, "NewYorkExtraLarge-RegularItalic.ttf")),
  readFile(join(fontDir, "SF-Pro-Text-Regular.otf")),
  readFile(join(fontDir, "SF-Pro-Text-Bold.otf")),
  readFile(join(process.cwd(), "app/og-clouds.png"), "base64"),
]);

// The site's cloud layers (lib/sky.ts SCENES.sunny via SkyCanvas), rendered
// once with the same fBm sprite code onto a transparent 1200x630 canvas.
const cloudsSrc = `data:image/png;base64,${cloudsPng}`;

/**
 * The sunny sky from lib/sky.ts SCENES.sunny, minus the animated cloud
 * layers: same gradient stops, sun position/tints, and warm horizon band.
 */
const SKY_GRADIENT =
  "linear-gradient(to bottom, rgb(21,78,168) 0%, rgb(56,133,211) 42%, rgb(124,186,233) 76%, rgb(189,221,240) 100%)";
// A radial-gradient defaults to an ellipse matching its element's aspect, so
// on the 1200x630 canvas the sun stretched into an oval. A square div with a
// centered gradient keeps it perfectly round; note Satori also drops the
// "circle ..." shape prefix entirely, so the stops alone size the glow.
// Two rendering quirks constrain this glow. The gradient must be a centered
// default ellipse on a square element (Satori drops the "circle" shape prefix,
// and a non-square element stretches the glow into an oval). And the element
// must be no taller than the 630px canvas: the rasterizer only paints the
// first canvas-height of an element, printing a hard seam where it stops.
// Farthest-corner on a 630px square is ~445px, so alpha reaches zero at 68%
// (~303px) to keep the fade inside the element instead of stamping its edge.
const SUN_GLOW =
  "radial-gradient(at 50% 50%, rgba(255,253,240,0.68) 0%, rgba(255,246,220,0.42) 16%, rgba(255,238,196,0.22) 34%, rgba(255,234,186,0.1) 50%, rgba(255,234,186,0) 68%)";
const HORIZON_GLOW =
  "linear-gradient(to top, rgba(255,236,206,0.22) 0%, rgba(255,236,206,0) 30%)";
const SCRIM =
  "radial-gradient(at 50% 50%, rgba(15,23,42,0.32) 0%, rgba(15,23,42,0.12) 45%, rgba(15,23,42,0) 65%)";

const overlay = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
};

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "SF Pro",
          backgroundImage: SKY_GRADIENT,
        }}
      >
        {/* Sun at 79% x, 15% y per SCENES.sunny: center 948,95 on the 1200x630 canvas. */}
        <div
          style={{
            position: "absolute",
            left: 948 - 315,
            top: 95 - 315,
            width: 630,
            height: 630,
            backgroundImage: SUN_GLOW,
          }}
        />
        {/* Clouds above the sun, below the horizon light and scrim — the same
            stacking the site's canvas uses. */}
        <img src={cloudsSrc} width={1200} height={630} style={{ ...overlay }} />
        <div style={{ ...overlay, backgroundImage: HORIZON_GLOW }} />
        <div style={{ ...overlay, backgroundImage: SCRIM }} />
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 1 }}>
          {LOCATION}
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 116,
            // Registered as its own family so Satori uses the real italic
            // face instead of synthesizing a slant from the regular.
            fontFamily: "New York Italic",
            letterSpacing: -3,
            textShadow: "0 4px 24px rgba(15,23,42,0.35)",
          }}
        >
          Will it be sunny?
        </div>
        <div style={{ marginTop: 40, fontSize: 26, opacity: 0.9 }}>
          Yes or no, every day, west of Twin Peaks
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "New York Italic", data: newYorkItalic, style: "italic", weight: 400 },
        { name: "SF Pro", data: sfProRegular, style: "normal", weight: 400 },
        { name: "SF Pro", data: sfProBold, style: "normal", weight: 700 },
      ],
    },
  );
}
