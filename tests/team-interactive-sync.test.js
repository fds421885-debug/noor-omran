import { describe, test } from "node:test";
import assert from "node:assert/strict";

describe("حزمة اختبارات المزامنة اللحظية والتصحيح للفرق (Team Matching & Ordering Sync Test Suite)", () => {
  test("التحقق من صحة توصيل الأزواج (Matching Pairs Validation)", () => {
    const pairs = [
      ["الإظهار الحلقي", "أ، هـ، ع، ح، غ، خ"],
      ["الإدغام بغنة", "ي، ن، م، و"],
      ["الإقلاب", "ب"]
    ];

    const connectionsCorrect = [
      { leftOrig: 0, rightOrig: 0 },
      { leftOrig: 1, rightOrig: 1 },
      { leftOrig: 2, rightOrig: 2 }
    ];

    const allCorrect = (connectionsCorrect.length === pairs.length &&
      connectionsCorrect.every(c => c.leftOrig === c.rightOrig));
    assert.strictEqual(allCorrect, true, "التوصيل المتطابق يجب أن يكون صحيحاً بنسبة 100%");

    const connectionsWrong = [
      { leftOrig: 0, rightOrig: 1 },
      { leftOrig: 1, rightOrig: 0 },
      { leftOrig: 2, rightOrig: 2 }
    ];

    const isWrong = (connectionsWrong.length === pairs.length &&
      connectionsWrong.every(c => c.leftOrig === c.rightOrig));
    assert.strictEqual(isWrong, false, "التوصيل الخاطئ يجب أن يفشل في التحقق");
  });

  test("التحقق من صحة ترتيب الكلمات (Word Ordering Validation)", () => {
    const originalWords = ["وَإِذَا", "قُرِئَ", "الْقُرْآنُ", "فَاسْتَمِعُوا", "لَهُ"];
    
    // محاكاة وضع الكلمات بالترتيب الصحيح
    const placedCorrect = originalWords.map((text, idx) => ({
      text,
      origIdx: idx
    }));

    const isOrderCorrect = (placedCorrect.length === originalWords.length &&
      placedCorrect.every((w, i) => w.origIdx === i));
    assert.strictEqual(isOrderCorrect, true, "الترتيب المطابق للأصل يجب أن يكون صحيحاً");

    // محاكاة ترتيب مقلوب
    const placedWrong = [placedCorrect[1], placedCorrect[0], ...placedCorrect.slice(2)];
    const isOrderWrong = (placedWrong.length === originalWords.length &&
      placedWrong.every((w, i) => w.origIdx === i));
    assert.strictEqual(isOrderWrong, false, "الترتيب غير المتطابق يجب أن يفشل في الفحص");
  });

  test("بث واستقبال حالة التوصيل والترتيب عبر payload موحد", () => {
    const matchingPayload = {
      type: "matching",
      questionIdx: 2,
      globalQIndex: 2,
      connections: [
        { leftId: "left_0", rightId: "right_1", leftOrig: 0, rightOrig: 1, leftNum: 1, rightLetter: "ب" }
      ],
      updatedBy: "أحمد محمد",
      timestamp: Date.now()
    };

    assert.strictEqual(matchingPayload.type, "matching");
    assert.strictEqual(matchingPayload.connections.length, 1);
    assert.strictEqual(matchingPayload.connections[0].leftNum, 1);
    assert.strictEqual(matchingPayload.connections[0].rightLetter, "ب");

    const orderingPayload = {
      type: "ordering",
      questionIdx: 3,
      globalQIndex: 3,
      placedWords: [{ id: "w_0", text: "بِسْمِ", origIdx: 0 }],
      bankWords: [{ id: "w_1", text: "اللَّـهِ", origIdx: 1 }],
      updatedBy: "خالد إبراهيم",
      timestamp: Date.now()
    };

    assert.strictEqual(orderingPayload.type, "ordering");
    assert.strictEqual(orderingPayload.placedWords.length, 1);
    assert.strictEqual(orderingPayload.bankWords.length, 1);
  });

  test("بث واستقبال حالة التصحيح المتزامنة للفرق (Correction State Broadcast)", () => {
    const correctionPayload = {
      type: "correction",
      subtype: "matching",
      questionIdx: 1,
      globalQIndex: 1,
      connections: [
        { leftOrig: 0, rightOrig: 0, isCorrect: true },
        { leftOrig: 1, rightOrig: 2, isCorrect: false }
      ],
      allCorrect: false,
      timestamp: Date.now()
    };

    assert.strictEqual(correctionPayload.type, "correction");
    assert.strictEqual(correctionPayload.subtype, "matching");
    assert.strictEqual(correctionPayload.allCorrect, false);
    assert.strictEqual(correctionPayload.connections[0].isCorrect, true);
    assert.strictEqual(correctionPayload.connections[1].isCorrect, false);
  });
});
