// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// نظام الصوت معطّل بالكامل بناءً على طلب المستخدم
// جميع الدوال No-Op خالية من أي مؤثرات صوتية
// ========================================================

class DuoSoundFX {
  constructor() {
    this.isMuted = true;
  }

  init() {}
  playPop() {}
  playSuccess() {}
  playError() {}
  playFanfare() {}
  playTada() {}
  playCardFlip() {}
  playRouletteTick() {}
  playTimerTick() {}
  celebrate() {}
  winner() {}
  buzzer() {}
  tick() {}
  cardDraw() {}
  applause() {}
  toggleMute() {
    return true;
  }
}

export const soundFX = new DuoSoundFX();
if (typeof window !== "undefined") {
  window.soundFX = soundFX;
}
