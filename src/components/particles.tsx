"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const h = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);
  return pos;
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = Number.parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

interface Circle {
  x: number;
  y: number;
  tx: number;
  ty: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
}

export function Particles({
  className,
  children,
  quantity = 100,
  staticity = 50,
  ease = 50,
  size = 0.4,
  refresh = false,
  color = "#ffffff",
  vx = 0,
  vy = 0,
}: {
  className?: string;
  children?: React.ReactNode;
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  refresh?: boolean;
  color?: string;
  vx?: number;
  vy?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const circles = useRef<Circle[]>([]);
  const mouse = useMousePosition();
  const mouseRef = useRef({ x: 0, y: 0 });
  const sizeRef = useRef({ w: 0, h: 0 });
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  const rgb = hexToRgb(color);
  const propsRef = useRef({ staticity, ease, vx, vy, quantity, size });
  useEffect(() => {
    propsRef.current = { staticity, ease, vx, vy, quantity, size };
  }, [staticity, ease, vx, vy, quantity, size]);

  const clear = useCallback(() => {
    if (ctxRef.current)
      ctxRef.current.clearRect(0, 0, sizeRef.current.w, sizeRef.current.h);
  }, []);

  const makeCircle = useCallback((): Circle => {
    const { size: s } = propsRef.current;
    return {
      x: Math.random() * sizeRef.current.w,
      y: Math.random() * sizeRef.current.h,
      tx: 0,
      ty: 0,
      size: Math.floor(Math.random() * 2) + s,
      alpha: 0,
      targetAlpha: +(Math.random() * 0.6 + 0.1).toFixed(1),
      dx: (Math.random() - 0.5) * 0.1,
      dy: (Math.random() - 0.5) * 0.1,
      magnetism: 0.1 + Math.random() * 4,
    };
  }, []);

  const drawCircle = useCallback(
    (c: Circle, add: boolean) => {
      if (!ctxRef.current) return;
      ctxRef.current.translate(c.tx, c.ty);
      ctxRef.current.beginPath();
      ctxRef.current.arc(c.x, c.y, c.size, 0, Math.PI * 2);
      ctxRef.current.fillStyle = `rgba(${rgb.join(",")},${c.alpha})`;
      ctxRef.current.fill();
      ctxRef.current.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (add) circles.current.push(c);
    },
    [dpr, rgb],
  );

  const resize = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return;
    circles.current = [];
    sizeRef.current.w = containerRef.current.offsetWidth;
    sizeRef.current.h = containerRef.current.offsetHeight;
    canvasRef.current.width = sizeRef.current.w * dpr;
    canvasRef.current.height = sizeRef.current.h * dpr;
    canvasRef.current.style.width = `${sizeRef.current.w}px`;
    canvasRef.current.style.height = `${sizeRef.current.h}px`;
    ctxRef.current?.scale(dpr, dpr);
  }, [dpr]);

  const populate = useCallback(() => {
    clear();
    for (let i = 0; i < propsRef.current.quantity; i++)
      drawCircle(makeCircle(), true);
  }, [clear, makeCircle, drawCircle]);

  const init = useCallback(() => {
    resize();
    populate();
  }, [resize, populate]);

  // Main effect — sets up canvas, starts loop
  useEffect(() => {
    ctxRef.current = canvasRef.current?.getContext("2d") ?? null;
    init();
    let running = true;
    const loop = () => {
      if (!running || !ctxRef.current) return;
      clear();
      const {
        staticity: st,
        ease: e,
        vx: vxVal,
        vy: vyVal,
        quantity: qty,
      } = propsRef.current;
      circles.current.forEach((c, i) => {
        const edge = [
          c.x + c.tx - c.size,
          sizeRef.current.w - c.x - c.tx - c.size,
          c.y + c.ty - c.size,
          sizeRef.current.h - c.y - c.ty - c.size,
        ];
        const closest = Math.min(...edge);
        const remap = closest < 20 ? Math.max(0, closest / 20) : 1;
        c.alpha =
          remap > 1
            ? Math.min(c.alpha + 0.02, c.targetAlpha)
            : c.targetAlpha * remap;
        c.x += c.dx + vxVal;
        c.y += c.dy + vyVal;
        c.tx += (mouseRef.current.x / ((st * st) / c.magnetism + 1) - c.tx) / e;
        c.ty += (mouseRef.current.y / ((st * st) / c.magnetism + 1) - c.ty) / e;
        drawCircle(c, false);
        if (
          c.x < -c.size ||
          c.x > sizeRef.current.w + c.size ||
          c.y < -c.size ||
          c.y > sizeRef.current.h + c.size
        ) {
          circles.current.splice(i, 1);
          for (let j = circles.current.length; j < qty; j++)
            drawCircle(makeCircle(), true);
        }
      });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    window.addEventListener("resize", init);
    return () => {
      running = false;
      window.removeEventListener("resize", init);
    };
  }, [color, init, clear, drawCircle, makeCircle]);

  // Sync mouse position
  useEffect(() => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = mouse.x - rect.left - sizeRef.current.w / 2;
    const y = mouse.y - rect.top - sizeRef.current.h / 2;
    if (
      Math.abs(x) < sizeRef.current.w / 2 &&
      Math.abs(y) < sizeRef.current.h / 2
    ) {
      mouseRef.current = { x, y };
    }
  }, [mouse.x, mouse.y]);

  useEffect(() => {
    init();
  }, [refresh, init]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 overflow-hidden bg-white dark:bg-neutral-950",
        className,
      )}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      {children && (
        <div className="relative z-10 h-full w-full">{children}</div>
      )}
    </div>
  );
}
