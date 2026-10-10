// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// نظام الخلفية الحية التفاعلية بأسلوب دولينجو (مربعات ومثلثات ودوائر)
// ========================================================

class DuoGeometricBackground {
  constructor() {
    this.canvas = document.getElementById("islamicInteractiveCanvas");
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext("2d");
    this.mouseGlow = document.getElementById("mouseGlow");

    this.particles = [];
    this.ripples = [];
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      radius: 120,
      isHovering: false
    };

    // باليتة ألوان دولينجو الرسمية والمبهجة
    this.colors = {
      duoGreen: ["rgba(88, 204, 2,", "rgba(97, 224, 2,"],
      duoYellow: ["rgba(255, 200, 0,", "rgba(255, 150, 0,"],
      duoBlue: ["rgba(28, 176, 246,", "rgba(73, 192, 248,"],
      duoRed: ["rgba(255, 75, 75,"],
      subtleWhite: ["rgba(255, 255, 255,"]
    };

    this.animationFrameId = null;
    this.isVisible = true;

    this.init();
  }

  init() {
    this.resize();
    this.createParticles();
    this.bindEvents();
    this.animate();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(this.dpr, this.dpr);

    // ضبط عدد الجزيئات الهندسية حسب مساحة الشاشة
    const targetCount = this.width < 768 ? 32 : this.width < 1200 ? 50 : 70;
    if (this.particles.length === 0) {
      this.createParticles(targetCount);
    } else {
      while (this.particles.length < targetCount) {
        this.particles.push(this.createSingleParticle());
      }
      if (this.particles.length > targetCount) {
        this.particles.length = targetCount;
      }
    }
  }

  createSingleParticle() {
    // الأشكال الثلاثة: مربعات، مثلثات، دوائر
    const shapes = ["square", "triangle", "circle"];
    const chosenShape = shapes[Math.floor(Math.random() * shapes.length)];

    // اختيار لون من ألوان دولينجو
    const randColor = Math.random();
    let colorList;
    if (randColor < 0.40) {
      colorList = this.colors.duoGreen;
    } else if (randColor < 0.70) {
      colorList = this.colors.duoYellow;
    } else if (randColor < 0.90) {
      colorList = this.colors.duoBlue;
    } else {
      colorList = this.colors.duoRed;
    }
    const baseColor = colorList[Math.floor(Math.random() * colorList.length)];

    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -0.3 - Math.random() * 0.45, // تطفو للأعلى بنعومة
      size: 5 + Math.random() * 8, // مقاس واضح وجميل للشكل الهندسي
      alpha: 0.16 + Math.random() * 0.35,
      targetAlpha: 0.22 + Math.random() * 0.5,
      alphaSpeed: 0.005 + Math.random() * 0.01,
      color: baseColor,
      shape: chosenShape,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      waveOffset: Math.random() * Math.PI * 2,
      pulseSpeed: 0.02 + Math.random() * 0.025
    };
  }

  createParticles(count = 55) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createSingleParticle());
    }
  }

  // رسم الدائرة
  drawCircle(cx, cy, radius, color, alpha) {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = `${color}${alpha})`;
    this.ctx.fill();
    this.ctx.restore();
  }

  // رسم المربع
  drawSquare(cx, cy, size, color, alpha, rotation) {
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(rotation);
    this.ctx.beginPath();
    const half = size / 2;
    this.ctx.rect(-half, -half, size, size);
    this.ctx.fillStyle = `${color}${alpha})`;
    this.ctx.fill();
    this.ctx.restore();
  }

  // رسم المثلث
  drawTriangle(cx, cy, size, color, alpha, rotation) {
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(rotation);
    this.ctx.beginPath();
    const h = size * (Math.sqrt(3) / 2);
    this.ctx.moveTo(0, -h * (2 / 3));
    this.ctx.lineTo(-size / 2, h / 3);
    this.ctx.lineTo(size / 2, h / 3);
    this.ctx.closePath();
    this.ctx.fillStyle = `${color}${alpha})`;
    this.ctx.fill();
    this.ctx.restore();
  }

  // إنشاء موجة ضوء تفاعلية عند النقر أو اللمس
  addRipple(x, y) {
    this.ripples.push({
      x,
      y,
      radius: 6,
      maxRadius: Math.min(this.width, this.height) * 0.32,
      alpha: 0.65,
      speed: 4.5 + Math.random() * 2
    });
  }

  bindEvents() {
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.resize(), 150);
    }, { passive: true });

    // تتبع حركة الفأرة
    window.addEventListener("mousemove", (e) => {
      this.mouse.targetX = e.clientX;
      this.mouse.targetY = e.clientY;
      this.mouse.isHovering = true;

      if (this.mouseGlow) {
        this.mouseGlow.style.opacity = "1";
        this.mouseGlow.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
    }, { passive: true });

    window.addEventListener("mouseleave", () => {
      this.mouse.isHovering = false;
      this.mouse.targetX = -1000;
      this.mouse.targetY = -1000;
      if (this.mouseGlow) {
        this.mouseGlow.style.opacity = "0";
      }
    });

    // موجة ضوئية عند النقر
    window.addEventListener("click", (e) => {
      if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
        this.addRipple(e.clientX, e.clientY);
      }
    });

    // دعم أجهزة اللمس
    window.addEventListener("touchmove", (e) => {
      if (e.touches && e.touches[0]) {
        const touch = e.touches[0];
        this.mouse.targetX = touch.clientX;
        this.mouse.targetY = touch.clientY;
        this.mouse.isHovering = true;

        if (this.mouseGlow) {
          this.mouseGlow.style.opacity = "1";
          this.mouseGlow.style.transform = `translate3d(${touch.clientX}px, ${touch.clientY}px, 0)`;
        }
      }
    }, { passive: true });

    window.addEventListener("touchstart", (e) => {
      if (e.touches && e.touches[0]) {
        const touch = e.touches[0];
        this.mouse.targetX = touch.clientX;
        this.mouse.targetY = touch.clientY;
        this.addRipple(touch.clientX, touch.clientY);
      }
    }, { passive: true });

    window.addEventListener("touchend", () => {
      setTimeout(() => {
        this.mouse.isHovering = false;
        if (this.mouseGlow) {
          this.mouseGlow.style.opacity = "0";
        }
      }, 500);
    });

    // إيقاف الحركة عند إخفاء التبويب
    document.addEventListener("visibilitychange", () => {
      this.isVisible = !document.hidden;
      if (this.isVisible) {
        this.animate();
      } else if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
    });
  }

  animate() {
    if (!this.isVisible) return;

    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.12;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.12;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. تحديث ورسم موجات النقر
    for (let r = this.ripples.length - 1; r >= 0; r--) {
      const rip = this.ripples[r];
      rip.radius += rip.speed;
      rip.alpha *= 0.94;

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(88, 204, 2, ${rip.alpha})`;
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();

      if (rip.radius > 20) {
        this.ctx.beginPath();
        this.ctx.arc(rip.x, rip.y, rip.radius * 0.65, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(255, 200, 0, ${rip.alpha * 0.6})`;
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
      }
      this.ctx.restore();

      if (rip.alpha <= 0.02 || rip.radius >= rip.maxRadius) {
        this.ripples.splice(r, 1);
      }
    }

    // 2. تحديث ورسم الأشكال الهندسية (المربعات والمثلثات والدوائر)
    const pCount = this.particles.length;
    for (let i = 0; i < pCount; i++) {
      const p = this.particles[i];

      p.waveOffset += p.pulseSpeed;
      p.x += p.vx + Math.sin(p.waveOffset) * 0.25;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      p.alpha += p.alphaSpeed;
      if (p.alpha > p.targetAlpha || p.alpha < 0.1) {
        p.alphaSpeed = -p.alphaSpeed;
      }

      // التفاعل مع الفأرة واللمس
      const dx = p.x - this.mouse.x;
      const dy = p.y - this.mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.mouse.radius && this.mouse.isHovering) {
        const force = (this.mouse.radius - dist) / this.mouse.radius;
        const angle = Math.atan2(dy, dx);
        p.x += Math.cos(angle) * force * 3;
        p.y += Math.sin(angle) * force * 3;
        p.alpha = Math.min(0.85, p.alpha + 0.2 * force);
      }

      // إعادة التدوير عند الخروج من الشاشة
      if (p.y < -30) {
        p.y = this.height + 20;
        p.x = Math.random() * this.width;
      }
      if (p.x < -30) p.x = this.width + 20;
      if (p.x > this.width + 30) p.x = -20;

      // رسم الشكل الهندسي المخصص
      if (p.shape === "circle") {
        this.drawCircle(p.x, p.y, p.size / 2, p.color, p.alpha);
      } else if (p.shape === "square") {
        this.drawSquare(p.x, p.y, p.size, p.color, p.alpha, p.rotation);
      } else if (p.shape === "triangle") {
        this.drawTriangle(p.x, p.y, p.size * 1.15, p.color, p.alpha, p.rotation);
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }
}

// تشغيل النظام فور جاهزية الصفحة
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new DuoGeometricBackground());
} else {
  new DuoGeometricBackground();
}

export { DuoGeometricBackground };
