// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// الخلفية الحية التفاعلية بأسلوب دولينجو (Animated Shapes Canvas)
// ========================================================

import React, { useEffect, useRef } from "react";

export const InteractiveCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const colors = [
      "rgba(88, 204, 2, 0.25)",   // duoGreen
      "rgba(255, 200, 0, 0.25)",  // duoYellow
      "rgba(28, 176, 246, 0.25)", // duoBlue
      "rgba(255, 75, 75, 0.2)"    // duoRed
    ];

    interface Particle {
      x: number;
      y: number;
      size: number;
      shape: "square" | "circle" | "triangle";
      color: string;
      speedX: number;
      speedY: number;
      angle: number;
      spinSpeed: number;
    }

    const particles: Particle[] = [];
    const count = Math.min(30, Math.floor((width * height) / 35000));

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 16 + 10,
        shape: ["square", "circle", "triangle"][Math.floor(Math.random() * 3)] as any,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4,
        angle: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 0.02
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${e.clientX - 100}px, ${e.clientY - 100}px, 0)`;
        glowRef.current.style.opacity = "0.7";
      }
    };

    const handleMouseLeave = () => {
      if (glowRef.current) {
        glowRef.current.style.opacity = "0";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.angle += p.spinSpeed;

        if (p.x < -30) p.x = width + 30;
        if (p.x > width + 30) p.x = -30;
        if (p.y < -30) p.y = height + 30;
        if (p.y > height + 30) p.y = -30;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "square") {
          ctx.beginPath();
          ctx.roundRect(-p.size / 2, -p.size / 2, p.size, p.size, 4);
          ctx.fill();
        } else if (p.shape === "triangle") {
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <>
      <canvas id="islamicInteractiveCanvas" ref={canvasRef} className="interactive-canvas" aria-hidden="true" />
      <div id="mouseGlow" ref={glowRef} className="mouse-glow-aura" aria-hidden="true" />
      <div className="islamic-bg-ornament" aria-hidden="true" />
      <div className="light-glow glow-top" aria-hidden="true" />
      <div className="light-glow glow-bottom" aria-hidden="true" />
    </>
  );
};
