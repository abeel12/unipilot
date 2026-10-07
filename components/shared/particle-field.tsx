"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface Particle {
  x: number;
  lane: number;
  speed: number;
  size: number;
  phase: number;
  tw: number;
}

export function ParticleField({
  className,
  intensity = 1,
}: {
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let running = true;
    const particles: Particle[] = [];

    const spawn = () => {
      const width = canvas.clientWidth || 1;
      const height = canvas.clientHeight || 1;
      const mobile = width < 760;
      const count = mobile ? 1400 : Math.min(4200, Math.floor((width * height) / 520));
      particles.length = 0;
      for (let i = 0; i < count; i += 1) {
        particles.push({
          x: Math.random(),
          lane: Math.random(),
          speed: 0.15 + Math.random() * 0.55,
          size: Math.random() < 0.08 ? 1.7 + Math.random() : 0.35 + Math.random() * 1.1,
          phase: Math.random() * Math.PI * 2,
          tw: Math.random() * Math.PI * 2,
        });
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.max(1, canvas.clientWidth * dpr);
      canvas.height = Math.max(1, canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      spawn();
    };

    const draw = (time: number) => {
      if (!running) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width < 2 || height < 2) {
        frame = requestAnimationFrame(draw);
        return;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      const ribbon = ctx.createLinearGradient(0, height * 0.22, 0, height * 0.8);
      ribbon.addColorStop(0, "rgba(40, 70, 180, 0)");
      ribbon.addColorStop(0.34, `rgba(70, 120, 255, ${0.55 * intensity})`);
      ribbon.addColorStop(0.48, `rgba(180, 235, 255, ${0.9 * intensity})`);
      ribbon.addColorStop(0.5, `rgba(245, 252, 255, ${1 * intensity})`);
      ribbon.addColorStop(0.58, `rgba(200, 120, 255, ${0.72 * intensity})`);
      ribbon.addColorStop(1, "rgba(40, 0, 90, 0)");
      ctx.fillStyle = ribbon;
      ctx.fillRect(0, height * 0.22, width, height * 0.58);

      for (let i = 0; i < 7; i += 1) {
        const gx = ((i + 0.5) / 7) * width;
        const gy = height * (0.48 + Math.sin(time * 0.00025 + i) * 0.03);
        const orb = ctx.createRadialGradient(gx, gy, 0, gx, gy, width * 0.16);
        orb.addColorStop(0, `rgba(230, 248, 255, ${0.55 * intensity})`);
        orb.addColorStop(0.45, `rgba(90, 150, 255, ${0.18 * intensity})`);
        orb.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = orb;
        ctx.fillRect(gx - width * 0.16, gy - width * 0.16, width * 0.32, width * 0.32);
      }

      for (const particle of particles) {
        const drift = reduce ? 0 : time * 0.000012 * particle.speed;
        const xNorm = (particle.x + drift) % 1;
        const x = xNorm * width;
        const wave =
          Math.sin(xNorm * 7.5 + time * 0.00032 + particle.phase) * 0.045 +
          Math.sin(xNorm * 2.4 + time * 0.00018) * 0.02;
        const y = (0.5 + (particle.lane - 0.5) * 0.42 + wave) * height;
        const core = Math.exp(-(((particle.lane - 0.5) * 3.1) ** 2));
        const horizon = 0.45 + 0.55 * Math.exp(-(((xNorm - 0.5) * 1.35) ** 2));
        const twinkle = 0.7 + 0.3 * Math.sin(time * 0.0016 + particle.tw);
        const alpha = Math.min(0.95, core * horizon * twinkle * intensity);
        let r = 110;
        let g = 160;
        let b = 255;
        if (particle.lane > 0.66) {
          r = 220;
          g = 120;
          b = 255;
        } else if (particle.lane > 0.38 && particle.lane < 0.62) {
          r = 220;
          g = 248;
          b = 255;
        }
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, particle.size * (particle.lane > 0.4 && particle.lane < 0.6 ? 1.8 : 1), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      if (!reduce) frame = requestAnimationFrame(draw);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    frame = requestAnimationFrame(draw);
    if (reduce) draw(1200);

    const onHide = () => {
      running = document.visibilityState === "visible";
      if (running) frame = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [intensity]);

  return <canvas ref={ref} className={cn("h-full w-full", className)} aria-hidden />;
}
