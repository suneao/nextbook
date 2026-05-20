"use client";

import { useEffect, useRef } from "react";
import createGlobe from "cobe";

export function DecorativeGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let phi = 0;
    let animationId: number;

    try {
      const globe = createGlobe(canvasRef.current, {
        devicePixelRatio: 2,
        width: 300 * 2,
        height: 300 * 2,
        phi: 0,
        theta: 0.3,
        dark: 0,
        diffuse: 1.2,
        mapSamples: 16000,
        mapBrightness: 6,
        baseColor: [0.6, 0.6, 0.6],
        markerColor: [0.93, 0.27, 0.27],
        glowColor: [0.5, 0.5, 0.8],
        markers: [{ location: [39.9042, 116.4074], size: 0.08 }],
      });

      function animate() {
        phi += 0.005;
        (globe as unknown as Record<string, number>).phi = phi;
        animationId = requestAnimationFrame(animate);
      }
      animate();

      return () => {
        cancelAnimationFrame(animationId);
        globe.destroy();
      };
    } catch {
      return;
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 300, height: 300 }}
      className="pointer-events-none select-none"
    />
  );
}
