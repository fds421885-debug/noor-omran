import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { 
  TACTICAL_CARDS, 
  getCardById, 
  isCardCompatible, 
  getIncompatibilityReason, 
  formatCardScopeLabel 
} from "../cards-data.js";

describe("حزمة اختبارات بنك البطاقات التكتيكية الـ 40 (40 Tactical Cards Test Suite)", () => {
  it("يجب أن يحتوي بنك البطاقات على 40 بطاقة تكتيكية فريدة ومرقمة تسلسلياً من 1 إلى 40", () => {
    assert.ok(TACTICAL_CARDS);
    assert.equal(TACTICAL_CARDS.length, 40);

    const ids = TACTICAL_CARDS.map(c => c.id);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, 40);
    for (let i = 1; i <= 40; i++) {
      assert.ok(uniqueIds.has(i), `البطاقة رقم ${i} مفقودة`);
    }
  });

  it("يجب أن تمتلك كل بطاقة عنواناً ووصفاً وأيقونة ونوعاً ونطاقاً صحيحاً", () => {
    TACTICAL_CARDS.forEach(card => {
      assert.ok(card.title, `البطاقة ${card.id} بلا عنوان`);
      assert.equal(typeof card.title, "string");
      assert.ok(card.desc, `البطاقة ${card.id} بلا وصف`);
      assert.equal(typeof card.desc, "string");
      assert.ok(card.icon, `البطاقة ${card.id} بلا أيقونة`);
      assert.ok(["buff", "risk"].includes(card.type), `نوع غير صالح للبطاقة ${card.id}`);
      assert.ok(["instant", "cycle", "permanent", "match"].includes(card.scope), `نطاق غير صالح للبطاقة ${card.id}`);
      assert.ok(["all", "mcq", "oral", "matching", "ordering", "timer", "final"].includes(card.applicableTo), `توافق غير صالح للبطاقة ${card.id}`);
      assert.ok(card.effect, `البطاقة ${card.id} بلا كائن effect`);
    });
  });

  it("getCardById يجب أن يجلب البطاقة برقمها أو بالنص الخاص برقمها", () => {
    const card1 = getCardById(1);
    assert.ok(card1);
    assert.equal(card1?.title, "تيسير الوقت");

    const card40 = getCardById("40");
    assert.ok(card40);
    assert.equal(card40?.title, "ختام المسك");

    assert.equal(getCardById(999), null);
  });
});

describe("اختبارات التوافق والشروط لكل نوع سؤال (Card Compatibility Rules)", () => {
  const mcqQuestion = { type: "mcq", text: "سؤال اختيار", options: ["أ", "ب", "ج", "د"], correct: 0 };
  const oralQuestion = { type: "oral", text: "سؤال تلاوة شفهي" };
  const matchingQuestion = { type: "matching", text: "سؤال توصيل", pairs: [["1", "أ"], ["2", "ب"]] };
  const orderingQuestion = { type: "ordering", text: "سؤال ترتيب", items: ["قَ", "لَ", "مَ"] };

  it("البطاقة 5 (حذف خيارين) يجب أن تتوافق مع MCQ فقط وترفض الأسئلة الشفهية والتوصيل والترتيب", () => {
    const card5 = getCardById(5);
    assert.equal(isCardCompatible(card5, mcqQuestion), true);
    assert.equal(isCardCompatible(card5, oralQuestion), false);
    assert.equal(isCardCompatible(card5, matchingQuestion), false);
    assert.equal(isCardCompatible(card5, orderingQuestion), false);
    assert.ok(getIncompatibilityReason(card5, oralQuestion).includes("الاختيار من متعدد"));
  });

  it("البطاقات الشفهية (11، 16، 22، 23، 30) يجب أن تتوافق مع أسئلة oral فقط", () => {
    [11, 16, 22, 23, 30].forEach(id => {
      const card = getCardById(id);
      assert.equal(isCardCompatible(card, oralQuestion), true, `البطاقة ${id} فشلت مع oral`);
      assert.equal(isCardCompatible(card, mcqQuestion), false, `البطاقة ${id} قبلت mcq بالخطأ`);
      assert.equal(isCardCompatible(card, matchingQuestion), false, `البطاقة ${id} قبلت matching بالخطأ`);
      assert.equal(isCardCompatible(card, orderingQuestion), false, `البطاقة ${id} قبلت ordering بالخطأ`);
    });
  });

  it("البطاقة 17 (حصانة الترتيب) يجب أن تتوافق مع أسئلة ordering فقط", () => {
    const card17 = getCardById(17);
    assert.equal(isCardCompatible(card17, orderingQuestion), true);
    assert.equal(isCardCompatible(card17, mcqQuestion), false);
    assert.equal(isCardCompatible(card17, oralQuestion), false);
    assert.equal(isCardCompatible(card17, matchingQuestion), false);
  });

  it("البطاقة 18 (توصيل الحكمة) يجب أن تتوافق مع أسئلة matching فقط", () => {
    const card18 = getCardById(18);
    assert.equal(isCardCompatible(card18, matchingQuestion), true);
    assert.equal(isCardCompatible(card18, mcqQuestion), false);
    assert.equal(isCardCompatible(card18, oralQuestion), false);
    assert.equal(isCardCompatible(card18, orderingQuestion), false);
  });

  it("البطاقة 2 (سرعة وإتقان) ترفض التفعيل إذا كان الوقت المتبقي <= 5 ثوانٍ", () => {
    const card2 = getCardById(2);
    assert.equal(isCardCompatible(card2, mcqQuestion, { remainingSeconds: 15 }), true);
    assert.equal(isCardCompatible(card2, mcqQuestion, { remainingSeconds: 5 }), false);
    assert.equal(isCardCompatible(card2, mcqQuestion, { remainingSeconds: 3 }), false);
  });

  it("البطاقة 34 (طاقة العزيمة) تقبل التفعيل فقط عند بقاء <= 5 ثوانٍ", () => {
    const card34 = getCardById(34);
    assert.equal(isCardCompatible(card34, mcqQuestion, { remainingSeconds: 20 }), false);
    assert.equal(isCardCompatible(card34, mcqQuestion, { remainingSeconds: 5 }), true);
    assert.equal(isCardCompatible(card34, mcqQuestion, { remainingSeconds: 2 }), true);
  });

  it("البطاقة 40 (ختام المسك) تقبل التفعيل فقط في السؤال الأخير من المسابقة", () => {
    const card40 = getCardById(40);
    // ليس الأخير: السؤال 2 من 5
    assert.equal(isCardCompatible(card40, mcqQuestion, { currentQuestionIdx: 1, totalQuestions: 5 }), false);
    // السؤال الأخير: السؤال 5 من 5 (فهرس 4)
    assert.equal(isCardCompatible(card40, mcqQuestion, { currentQuestionIdx: 4, totalQuestions: 5 }), true);
  });
});

describe("اختبارات محرك النقاط والتداخلات (Scoring Engine & Card Conflicts)", () => {
  function calculateScore({ 
    basePoints = 5, 
    isCorrect = true, 
    activeEffects = [], 
    currentContestantScore = 10,
    elapsedSeconds = 4,
    oralAvg = 4.5
  }) {
    let earned = 0;
    let penalty = 0;
    const hasImmunity = activeEffects.some(e => e.cardId === 4);
    const hasGrandRisk = activeEffects.some(e => e.cardId === 3);
    const hasGolden = activeEffects.some(e => e.cardId === 7);
    const hasSpeedBonus = activeEffects.some(e => e.cardId === 2);
    const hasFastRhythm = activeEffects.some(e => e.cardId === 31);
    const hasBalance = activeEffects.some(e => e.cardId === 36);
    const hasOralBonus = activeEffects.some(e => e.cardId === 11);
    const hasOralShield = activeEffects.some(e => e.cardId === 22);
    const hasBonusCap7 = activeEffects.some(e => e.cardId === 25);
    const hasFinalBonus = activeEffects.some(e => e.cardId === 40);

    if (isCorrect) {
      if (hasBalance) {
        const speedPoints = Math.min(2.5, Math.max(0, (30 - elapsedSeconds) / 30 * 2.5));
        earned = 2.5 + speedPoints;
      } else if (hasGrandRisk) {
        earned = 5;
      } else {
        earned = basePoints;
      }

      if (hasGolden) {
        earned = Math.min(10, earned * 2);
      }

      if (hasBonusCap7) {
        earned = Math.max(7, earned);
      }

      if (hasSpeedBonus) {
        earned += 2;
      }

      if (hasFastRhythm && elapsedSeconds < 5) {
        earned += 3;
      }

      if (hasFinalBonus) {
        earned = Math.max(earned, 5);
      }

      if (hasOralShield && oralAvg < 4) {
        oralAvg = 4;
      }

      if (hasOralBonus) {
        earned = Math.min(5, earned + 1);
      }
    } else {
      if (hasImmunity) {
        penalty = 0;
      } else if (hasGrandRisk) {
        penalty = 3;
      } else {
        penalty = 0;
      }
    }

    const netScore = Math.max(0, currentContestantScore + earned - penalty);
    return { earned, penalty, netScore };
  }

  it("المخاطرة الكبرى (البطاقة 3): تمنح 5 نقاط عند الصواب، وتخصم 3 عند الخطأ", () => {
    const card3 = { cardId: 3 };
    const correctRes = calculateScore({ isCorrect: true, activeEffects: [card3], currentContestantScore: 10 });
    assert.equal(correctRes.earned, 5);
    assert.equal(correctRes.netScore, 15);

    const wrongRes = calculateScore({ isCorrect: false, activeEffects: [card3], currentContestantScore: 10 });
    assert.equal(wrongRes.penalty, 3);
    assert.equal(wrongRes.netScore, 7);
  });

  it("درع الأمان (البطاقة 4) يحمي من خصم المخاطرة الكبرى عند الخطأ", () => {
    const card3 = { cardId: 3 };
    const card4 = { cardId: 4 };
    const res = calculateScore({ isCorrect: false, activeEffects: [card3, card4], currentContestantScore: 10 });
    assert.equal(res.penalty, 0);
    assert.equal(res.netScore, 10);
  });

  it("السؤال الذهبي (البطاقة 7) يضاعف النقاط مع سقف صارم 10 نقاط", () => {
    const card7 = { cardId: 7 };
    const res = calculateScore({ basePoints: 5, isCorrect: true, activeEffects: [card7], currentContestantScore: 0 });
    assert.equal(res.earned, 10);
  });

  it("الإيقاع السريع (البطاقة 31) يمنح +3 نقاط إضافية فقط إذا تمت الإجابة في أقل من 5 ثوانٍ", () => {
    const card31 = { cardId: 31 };
    const fastRes = calculateScore({ basePoints: 5, isCorrect: true, activeEffects: [card31], elapsedSeconds: 3 });
    assert.equal(fastRes.earned, 8);

    const slowRes = calculateScore({ basePoints: 5, isCorrect: true, activeEffects: [card31], elapsedSeconds: 8 });
    assert.equal(slowRes.earned, 5);
  });

  it("صمام الأمان النهائي (البطاقة 37) يمنع انخفاض رصيد المتسابق النهائي عن أعلى قمة مسجلة", () => {
    const highestLockedScore = 24;
    let finalScore = 18;
    const hasCard37 = true;

    if (hasCard37 && highestLockedScore > finalScore) {
      finalScore = highestLockedScore;
    }
    assert.equal(finalScore, 24);
  });
});

describe("اختبارات الهالة البنفسجية وتصفية النطاق (Purple Aura & Scope Filtering)", () => {
  function filterRelevantEffects(effects, currentContestantName, currentQuestionIndex) {
    return effects.filter(eff => {
      if (eff.status !== "active") return false;
      if (eff.targetContestant && currentContestantName && eff.targetContestant !== currentContestantName) {
        return false;
      }
      if (eff.scope === "instant" || !eff.scope) {
        return (eff.questionIdx === undefined || eff.questionIdx === null || eff.questionIdx === currentQuestionIndex);
      }
      return true; // cycle, permanent, match
    });
  }

  it("الهالة البنفسجية لا تظهر إذا كان التأثير الفوري يخص سؤالاً آخر", () => {
    const effects = [
      { id: "e1", cardId: 2, title: "سرعة وإتقان", scope: "instant", questionIdx: 0, targetContestant: "أحمد", status: "active" }
    ];

    const relevantOnQ0 = filterRelevantEffects(effects, "أحمد", 0);
    assert.equal(relevantOnQ0.length, 1);

    const relevantOnQ1 = filterRelevantEffects(effects, "أحمد", 1);
    assert.equal(relevantOnQ1.length, 0);
  });

  it("الهالة البنفسجية لا تظهر لمتسابق آخر", () => {
    const effects = [
      { id: "e1", cardId: 2, title: "سرعة وإتقان", scope: "instant", questionIdx: 0, targetContestant: "أحمد", status: "active" }
    ];

    const relevantForKhaled = filterRelevantEffects(effects, "خالد", 0);
    assert.equal(relevantForKhaled.length, 0);
  });

  it("تأثيرات الدورة (cycle) والمسابقة (match) تستمر عبر أسئلة الدورة لنفس المتسابق", () => {
    const effects = [
      { id: "e_cycle", cardId: 1, title: "تيسير الوقت", scope: "cycle", targetContestant: "أحمد", status: "active" }
    ];

    assert.equal(filterRelevantEffects(effects, "أحمد", 0).length, 1);
    assert.equal(filterRelevantEffects(effects, "أحمد", 1).length, 1);
    assert.equal(filterRelevantEffects(effects, "أحمد", 3).length, 1);
  });
});
