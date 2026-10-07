"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const NODES = [
  { label: "Marks file", x: 0.14, y: 0.34 },
  { label: "AI core", x: 0.36, y: 0.52 },
  { label: "CS-301", x: 0.56, y: 0.24 },
  { label: "Assessments", x: 0.7, y: 0.48 },
  { label: "42 students", x: 0.54, y: 0.76 },
  { label: "Portal", x: 0.86, y: 0.66 },
];

const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [1, 3],
  [1, 4],
  [3, 5],
  [4, 5],
];

export function AcademicNetwork({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let running = true;

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (time: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dark = document.documentElement.classList.contains("dark");
      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = dark ? "rgba(142,180,255,0.08)" : "rgba(36,71,230,0.07)";
      ctx.lineWidth = 1;
      const gap = width < 760 ? 56 : 46;
      for (let x = 0; x <= width; x += gap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const points = NODES.map((node) => ({
        ...node,
        px: node.x * width,
        py: node.y * height,
      }));

      EDGES.forEach(([from, to], index) => {
        const start = points[from];
        const end = points[to];
        ctx.strokeStyle = dark ? "rgba(142,180,255,0.28)" : "rgba(36,71,230,0.22)";
        ctx.beginPath();
        ctx.moveTo(start.px, start.py);
        ctx.lineTo(end.px, end.py);
        ctx.stroke();

        if (reduce) return;
        const progress = ((time / 3200) + index * 0.16) % 1;
        const x = start.px + (end.px - start.px) * progress;
        const y = start.py + (end.py - start.py) * progress;
        ctx.fillStyle = dark ? "rgba(186,214,255,0.95)" : "rgba(36,71,230,0.85)";
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.font = "12px Inter, sans-serif";
      points.forEach((node) => {
        ctx.fillStyle = dark ? "rgba(142,180,255,0.95)" : "rgba(36,71,230,0.9)";
        ctx.beginPath();
        ctx.arc(node.px, node.py, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = dark ? "rgba(232,238,252,0.78)" : "rgba(16,24,44,0.72)";
        ctx.fillText(node.label, node.px + 10, node.py + 4);
      });
    };

    const loop = (time: number) => {
      if (!running) return;
      draw(time);
      if (!reduce) frame = requestAnimationFrame(loop);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    frame = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={cn("h-full w-full", className)} aria-hidden />;
}
