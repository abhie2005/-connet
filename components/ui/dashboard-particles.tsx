"use client";
/* A slow drift of dots behind the graph, so the panel is not a flat grey field while nothing is
   running. It says nothing about the data on purpose — this page's whole claim is that every
   figure on it was read from the workspace, and a decorative thing that looked like a reading
   would undo that. So: no counts, no labels, nothing that could be mistaken for a measurement.

   It stops dead for anyone who asked for less motion, and it is aria-hidden either way. */
import { useEffect, useRef } from "react";

interface Dot {
  x: number;
  y: number;
  dx: number;
  dy: number;
  r: number;
}

export function DashboardParticles({ theme }: { theme: "light" | "dark" }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const tone = useRef(theme);

  // The drift loop keeps running across a theme change; it reads the tone from here each frame.
  useEffect(() => {
    tone.current = theme;
  }, [theme]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dots: Dot[] = [];
    const still = matchMedia("(prefers-reduced-motion: reduce)");

    const seed = () => {
      // Enough to read as a field, few enough to cost nothing on a laptop.
      const many = Math.max(18, Math.min(54, Math.round((w * h) / 16000)));
      dots = Array.from({ length: many }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        dx: (Math.random() - 0.5) * 0.13,
        dy: (Math.random() - 0.5) * 0.13,
        r: 0.7 + Math.random() * 1.5,
      }));
    };

    const size = () => {
      const box = el.getBoundingClientRect();
      const dpr = Math.min(2, devicePixelRatio || 1);
      w = box.width;
      h = box.height;
      el.width = Math.max(1, Math.round(w * dpr));
      el.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const paint = () => {
      const dark = tone.current === "dark";
      const ink = dark ? "244,244,245" : "24,24,27";
      ctx.clearRect(0, 0, w, h);
      // The threads first, so the dots sit on top of them.
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const a = dots[i];
          const b = dots[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > 108) continue;
          ctx.strokeStyle = `rgba(${ink},${(1 - d / 108) * (dark ? 0.1 : 0.075)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      for (const p of dots) {
        ctx.fillStyle = `rgba(${ink},${dark ? 0.2 : 0.16})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      for (const p of dots) {
        p.x += p.dx;
        p.y += p.dy;
        // Off one edge, on at the other, so the field never thins out.
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
        if (p.y < -4) p.y = h + 4;
        if (p.y > h + 4) p.y = -4;
      }
      paint();
      raf = requestAnimationFrame(step);
    };

    let raf = 0;
    const start = () => {
      cancelAnimationFrame(raf);
      if (still.matches) {
        paint();
        return;
      }
      raf = requestAnimationFrame(step);
    };

    const ro = new ResizeObserver(() => {
      size();
      paint();
    });
    size();
    ro.observe(el);
    start();
    still.addEventListener("change", start);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      still.removeEventListener("change", start);
    };
  }, []);

  return <canvas className="gd-particles" ref={canvas} aria-hidden="true" />;
}
