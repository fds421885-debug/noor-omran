// ========================================================
// الخلفية التفاعلية الفاقعة والمبهجة لمسابقات نور البيان التفاعلية
// رسوم الجسيمات والأمواج الاحتفالية المتوهجة (Interactive Particle Canvas)
// ========================================================

(function () {
  const canvas = document.getElementById("islamicInteractiveCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let animationFrameId = null;
  let particles = [];
  let isRunning = false;
  let currentHue = 270; // يبدأ بالبنفسجي الملكي

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  class CelebrationParticle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 5 + 2;
      this.speedX = (Math.random() - 0.5) * 1.5;
      this.speedY = (Math.random() - 0.5) * 1.5;
      this.opacity = Math.random() * 0.7 + 0.2;
      this.hue = Math.random() > 0.5 ? 270 + Math.random() * 40 : (Math.random() > 0.5 ? 25 + Math.random() * 25 : 150 + Math.random() * 30);
      this.pulseSpeed = Math.random() * 0.03 + 0.01;
      this.pulse = 0;
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.pulse += this.pulseSpeed;

      if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
      if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }

    draw() {
      const glow = Math.sin(this.pulse) * 0.3 + 0.7;
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * glow, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 90%, 65%, ${this.opacity * glow})`;
      ctx.shadowColor = `hsla(${this.hue}, 90%, 60%, 0.8)`;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();
    }
  }

  function initParticles(count = 45) {
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push(new CelebrationParticle());
    }
  }

  function animate() {
    if (!isRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }

    // رسم خطوط اتصال خفيفة بين الجسيمات القريبة
    for (let a = 0; a < particles.length; a++) {
      for (let b = a + 1; b < particles.length; b++) {
        const dx = particles[a].x - particles[b].x;
        const dy = particles[a].y - particles[b].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          ctx.save();
          ctx.strokeStyle = `rgba(168, 85, 247, ${0.15 * (1 - dist / 110)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(particles[b].x, particles[b].y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  window.startInteractiveBackground = function (theme = "purple") {
    document.body.classList.remove("interactive-theme-purple", "interactive-theme-orange", "interactive-theme-green");
    document.body.classList.add(`interactive-theme-${theme}`);

    if (!isRunning) {
      isRunning = true;
      initParticles(50);
      animate();
    }
  };

  window.stopInteractiveBackground = function () {
    document.body.classList.remove(
      "interactive-theme-purple",
      "interactive-theme-orange",
      "interactive-theme-green",
      "theme-purple",
      "theme-orange",
      "theme-green"
    );
    document.body.style.removeProperty("background");
    document.body.style.removeProperty("color");
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.style.removeProperty("background");
      mainContent.style.removeProperty("color");
    }
    const arenaSection = document.getElementById("liveArenaSection");
    if (arenaSection) {
      arenaSection.classList.remove(
        "interactive-theme-purple",
        "interactive-theme-orange",
        "interactive-theme-green",
        "theme-purple",
        "theme-orange",
        "theme-green"
      );
      arenaSection.style.removeProperty("background");
      arenaSection.style.removeProperty("color");
    }
    isRunning = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
})();
