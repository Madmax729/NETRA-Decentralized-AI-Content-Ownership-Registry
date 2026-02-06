// CSS Houdini Paint Worklet: Netra Antigravity Particles
// Loaded via CSS.paintWorklet.addModule('/worklets/netra-antigravity.js')

/* global registerPaint */

const TAU = Math.PI * 2;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function rand01(seed) {
  // Deterministic pseudo-random in [0, 1)
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function parseNumber(v) {
  if (!v) return NaN;
  const s = v.toString();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

registerPaint(
  'netra-antigravity',
  class {
    static get inputProperties() {
      return ['--mouse-x', '--mouse-y', '--t', '--particle-color'];
    }

    paint(ctx, size, props) {
      const w = size.width;
      const h = size.height;

      // Mouse coords are expected in element-local px.
      let mx = parseNumber(props.get('--mouse-x'));
      let my = parseNumber(props.get('--mouse-y'));
      const t = parseNumber(props.get('--t')) || 0;
      const color = (props.get('--particle-color') || '').toString().trim() || 'rgba(255,255,255,0.9)';

      if (!Number.isFinite(mx) || mx <= 0 || mx > w) mx = w * 0.5;
      if (!Number.isFinite(my) || my <= 0 || my > h) my = h * 0.5;

      // Background fade (subtle)
      ctx.clearRect(0, 0, w, h);

      const count = 56;
      const baseRing = Math.min(w, h) * 0.14;
      const ringSpan = Math.min(w, h) * 0.20;

      for (let i = 0; i < count; i++) {
        const s0 = i * 12.9898 + 78.233;
        const s1 = i * 39.3467 + 11.135;

        const r0 = baseRing + rand01(s0) * ringSpan;
        const size0 = 0.9 + rand01(s1) * 1.9;
        const speed = 0.35 + rand01(s0 + 4.2) * 0.95;
        const phase = rand01(s1 + 9.1) * TAU;

        // Antigravity float: layered oscillations + a little noise
        const floatX = Math.cos(t * 1.25 + phase) * (6 + rand01(s0 + 2.1) * 10);
        const floatY = Math.sin(t * 1.55 + phase) * (10 + rand01(s1 + 3.7) * 14);

        const wobble = Math.sin(t * 0.9 + i * 0.7) * 0.18;
        const angle = phase + t * speed + wobble;

        const x = mx + Math.cos(angle) * r0 + floatX;
        const y = my + Math.sin(angle) * r0 + floatY;

        // Soft vignette: fade with distance from cursor
        const dx = x - mx;
        const dy = y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const fade = 1 - smoothstep(baseRing + ringSpan * 0.9, baseRing + ringSpan * 2.1, dist);

        const a = clamp(0.08 + fade * 0.55, 0, 0.7);

        // Glow (white-ish) + core tint
        const g = ctx.createRadialGradient(x, y, 0, x, y, size0 * 6);
        g.addColorStop(0, `rgba(255,255,255,${a})`);
        g.addColorStop(0.55, `rgba(255,255,255,${a * 0.25})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, size0 * 6, 0, TAU);
        ctx.fill();

        // Core (tinted via --particle-color)
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, size0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  }
);
