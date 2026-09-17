/**
 * Programmatic Lottie animation data — a looping audio equalizer of bars.
 *
 * Generating valid Lottie JSON by hand is error-prone, so we build the
 * animation object in code. Returned objects are passed straight to
 * lottie-react's `animationData`. Reused (with different colours / sizes) for
 * the login hero, the "generating" loader, and the voice-picker soundwave.
 */

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16
  );
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function barLayer(index, x, y, w, h, rgb, scaleKeys) {
  return {
    ddd: 0,
    ind: index + 1,
    ty: 4,
    nm: `bar${index}`,
    sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [x, y, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: scaleKeys },
    },
    ao: 0,
    shapes: [
      {
        ty: "gr",
        nm: "g",
        it: [
          { ty: "rc", d: 1, s: { a: 0, k: [w, h] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 0 } },
          { ty: "fl", c: { a: 0, k: [...rgb, 1] }, o: { a: 0, k: 100 }, r: 1 },
          {
            ty: "tr",
            p: { a: 0, k: [0, 0] },
            a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
        ],
      },
    ],
    ip: 0,
    op: 60,
    st: 0,
    bm: 0,
  };
}

/** Build equalizer Lottie animation data. */
export function equalizer({ color = "#7c3aed", bars = 5, w = 220, h = 120 } = {}) {
  const rgb = hexToRgb(color);
  const gap = w / (bars + 1);
  const barW = Math.max(6, gap * 0.42);
  const baseH = h * 0.72;
  // scale-y percentages the bars cycle through
  const pattern = [34, 100, 58, 88, 44, 72];
  const times = [0, 12, 24, 36, 48, 60];

  const layers = [];
  for (let i = 0; i < bars; i++) {
    const x = gap * (i + 1);
    const scaleKeys = times.map((t, idx) => {
      // last frame mirrors the first so the loop is seamless
      const pct =
        idx === times.length - 1
          ? pattern[i % pattern.length]
          : pattern[(i + idx) % pattern.length];
      const kf = { t, s: [100, pct] };
      if (idx < times.length - 1) {
        kf.i = { x: [0.5, 0.5], y: [1, 1] };
        kf.o = { x: [0.5, 0.5], y: [0, 0] };
      }
      return kf;
    });
    layers.push(barLayer(i, x, h / 2, barW, baseH, rgb, scaleKeys));
  }

  return {
    v: "5.7.4",
    fr: 30,
    ip: 0,
    op: 60,
    w,
    h,
    nm: "equalizer",
    ddd: 0,
    assets: [],
    layers,
  };
}
