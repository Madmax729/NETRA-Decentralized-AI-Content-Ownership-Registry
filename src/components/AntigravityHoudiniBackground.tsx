import { useEffect, useRef, useState } from "react";
import HoudiniParticles from "@/components/HoudiniParticles";

const WORKLET_URL = "/worklets/netra-antigravity.js";

const canUsePaintWorklet = () => {
  const anyCSS = (globalThis as any).CSS as
    | { paintWorklet?: { addModule: (url: string) => Promise<void> } }
    | undefined;
  return typeof anyCSS?.paintWorklet?.addModule === "function";
};

const prefersReducedMotion = () => {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
};

export default function AntigravityHoudiniBackground() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  // Register paint worklet once
  useEffect(() => {
    if (!canUsePaintWorklet()) return;

    let cancelled = false;
    const anyCSS = (globalThis as any).CSS as { paintWorklet: { addModule: (url: string) => Promise<void> } };

    anyCSS.paintWorklet
      .addModule(WORKLET_URL)
      .then(() => {
        if (!cancelled) setEnabled(true);
      })
      .catch((e) => {
        // Fallback to the existing canvas particle system
        console.warn("Failed to load Houdini Paint Worklet:", e);
        if (!cancelled) setEnabled(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Feed --mouse-x/--mouse-y/--t into the painted element
  useEffect(() => {
    if (!enabled) return;
    const el = hostRef.current;
    if (!el) return;

    const reduce = prefersReducedMotion();

    let raf = 0;
    let t = 0;
    let last = performance.now();

    let pendingMouse: { x: number; y: number } | null = null;

    const onMove = (e: MouseEvent) => {
      pendingMouse = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("mousemove", onMove, { passive: true });

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (!reduce) t += dt;
      el.style.setProperty("--t", String(t));

      if (pendingMouse) {
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--mouse-x", String(pendingMouse.x - rect.left));
        el.style.setProperty("--mouse-y", String(pendingMouse.y - rect.top));
        pendingMouse = null;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return <HoudiniParticles />;

  return <div ref={hostRef} className="netra-antigravity-bg" aria-hidden="true" />;
}
