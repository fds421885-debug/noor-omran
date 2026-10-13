import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateQuestionScore,
  recordAnswerIdempotent,
  calculateSessionScoreFromLog,
  getContestantTotalScore,
  finalizeContestantScore
} from "../scoring-engine.js";

describe("حزمة الاختبارات الإلزامية لنظام النقاط الموحد والموثوق (12 اختباراً إلزامياً)", () => {

  test("الحالة 1 و 2 و 3: يبدأ المتسابق من 300 نقطة، ويجيب إجابة صحيحة لسؤال بـ 3 نقاط دون مضاعفة -> تصبح درجته 303 تماماً (وليس 306 أو 340)", () => {
    const studentUser = { id: "std_1", name: "أحمد محمد", totalScore: 300 };
    const room = {
      id: "room_1",
      contestantId: studentUser.id,
      contestantName: studentUser.name,
      contestantInitialBaseScore: studentUser.totalScore,
      contestantScore: 0,
      answeredQuestionsLog: {}
    };

    const question = { id: "q1", text: "ما حكم النون الساكنة؟", points: 3 };
    const scoreResult = calculateQuestionScore({
      question,
      isCorrect: true,
      isTimeout: false,
      activeEffects: []
    });

    assert.equal(scoreResult.basePoints, 3, "قيمة السؤال الأساسية يجب أن تكون 3 نقاط");
    assert.equal(scoreResult.cardBonus, 0, "لا توجد بطاقة بونص مفعلة");
    assert.equal(scoreResult.netPoints, 3, "صافي النقاط المستحقة للسؤال يجب أن تكون 3");

    const recordRes = recordAnswerIdempotent(room, {
      questionIdx: 0,
      isCorrect: true,
      basePoints: scoreResult.basePoints,
      cardBonus: scoreResult.cardBonus,
      netPoints: scoreResult.netPoints
    });

    assert.equal(recordRes.recordAdded, true, "يجب تسجيل إجابة السؤال لأول مرة بنجاح");
    assert.equal(recordRes.contestantScore, 3, "رصيد الجلسة الحالي يجب أن يكون 3 نقاط");
    assert.equal(recordRes.totalScore, 303, "الدرجة الإجمالية المعتمدة يجب أن تصبح 303 تماماً وليس 306 أو 340");
  });

  test("الحالة 4: وصول حدث احتساب السؤال مرتين لا يرفع الدرجة أكثر من مرة (Idempotency)", () => {
    const room = {
      id: "room_1",
      contestantInitialBaseScore: 300,
      contestantScore: 0,
      answeredQuestionsLog: {}
    };

    const answerData = {
      questionIdx: 0,
      isCorrect: true,
      basePoints: 3,
      cardBonus: 0,
      netPoints: 3
    };

    // وصول الحدث للمرة الأولى
    const firstArrival = recordAnswerIdempotent(room, answerData);
    assert.equal(firstArrival.recordAdded, true);
    assert.equal(firstArrival.totalScore, 303);

    // وصول نفس الحدث مرة ثانية (تكرار شبكي أو وصول إشعار ثانٍ)
    const secondArrival = recordAnswerIdempotent(room, answerData);
    assert.equal(secondArrival.recordAdded, false, "يجب رفض إضافة السؤال المكرر");
    assert.equal(secondArrival.totalScore, 303, "الدرجة لا يجب أن تقفز إلى 306 بل تظل 303 ثابتة");
    assert.equal(room.contestantScore, 3, "نقاط الجلسة تظل 3");
  });

  test("الحالة 5: تحديث الصفحة (Page Refresh) لا يغيّر النتيجة المعتمدة", () => {
    // محاكاة حالة الغرفة بعد إجابة السؤال الأول
    const savedRoomState = {
      id: "room_1",
      contestantInitialBaseScore: 300,
      contestantScore: 3,
      answeredQuestionsLog: {
        "q_0": { questionIdx: 0, isCorrect: true, basePoints: 3, cardBonus: 0, scoreDelta: 3 }
      }
    };

    // عند تحديث الصفحة وقراءة الحالة من جديد
    const refreshedRoom = JSON.parse(JSON.stringify(savedRoomState));
    const totalScoreOnRefresh = getContestantTotalScore(refreshedRoom);

    assert.equal(totalScoreOnRefresh, 303, "النتيجة بعد التحديث يجب أن تطابق النتيجة المعتمدة 303");
  });

  test("الحالة 6: إعادة الاتصال بـ Firestore لا تضيف النقاط مرة أخرى", () => {
    const localRoom = {
      id: "room_1",
      contestantInitialBaseScore: 300,
      contestantScore: 3,
      answeredQuestionsLog: {
        "q_0": { questionIdx: 0, isCorrect: true, scoreDelta: 3 }
      }
    };

    // وصول لقطة Firestore عند إعادة الاتصال
    const firestoreSnapshot = {
      id: "room_1",
      contestantInitialBaseScore: 300,
      contestantScore: 3,
      answeredQuestionsLog: {
        "q_0": { questionIdx: 0, isCorrect: true, scoreDelta: 3 }
      },
      lastAnswerEvent: {
        questionIdx: 0,
        scoreDelta: 3,
        contestantScore: 3,
        timestamp: Date.now()
      }
    };

    // التحقق عند استلام اللقطة
    const recordResult = recordAnswerIdempotent(localRoom, firestoreSnapshot.lastAnswerEvent);
    assert.equal(recordResult.recordAdded, false, "لا يعاد تسجيل السؤال المحفوظ مسبقاً");
    assert.equal(getContestantTotalScore(localRoom), 303, "النتيجة تظل 303 دون زيادة");
  });

  test("الحالة 7: ظهور تحديث لدى المشرف لا يؤدي إلى إعادة احتساب النتيجة لدى العارض", () => {
    const supervisorRoom = {
      id: "room_live",
      contestantInitialBaseScore: 300,
      contestantScore: 0,
      answeredQuestionsLog: {}
    };

    // المشرف يحتسب السؤال الأول (+3)
    recordAnswerIdempotent(supervisorRoom, {
      questionIdx: 0,
      isCorrect: true,
      scoreDelta: 3
    });
    assert.equal(supervisorRoom.contestantScore, 3);

    // جهاز العارض يستقبل حالة الغرفة المحدثة
    const viewerRoom = JSON.parse(JSON.stringify(supervisorRoom));
    assert.equal(viewerRoom.contestantScore, 3);
    assert.equal(getContestantTotalScore(viewerRoom), 303);

    // وصول تحديث ثانوي لدى المشرف (مثل تعديل اسم أو ملاحظة)
    supervisorRoom.lastLeaderNote = "ملاحظة";
    viewerRoom.lastLeaderNote = "ملاحظة";

    // العارض لا يعيد احتساب أي نقاط
    assert.equal(viewerRoom.contestantScore, 3);
    assert.equal(getContestantTotalScore(viewerRoom), 303);
  });

  test("الحالة 8: إجابة خاطئة لا تمنح نقاط الإجابة الصحيحة", () => {
    const question = { id: "q1", points: 3 };
    const scoreResult = calculateQuestionScore({
      question,
      isCorrect: false,
      isTimeout: false,
      activeEffects: []
    });

    assert.equal(scoreResult.basePoints, 0, "لا نقاط أساسية للإجابة الخاطئة");
    assert.equal(scoreResult.cardBonus, 0);
    assert.equal(scoreResult.netPoints, 0, "صافي النقاط 0");

    const room = {
      contestantInitialBaseScore: 300,
      contestantScore: 0,
      answeredQuestionsLog: {}
    };

    const res = recordAnswerIdempotent(room, {
      questionIdx: 0,
      isCorrect: false,
      scoreDelta: 0
    });

    assert.equal(res.totalScore, 300, "المجموع يظل 300 دون أي زيادة");
  });

  test("الحالة 9: تفعيل بطاقة مضاعفة (السؤال الذهبي) يغيّر النتيجة وفق قواعد البطاقة فقط (+3 أساسي + 3 بونص = 6)", () => {
    const question = { id: "q2", points: 3 };
    const activeEffects = [
      { cardId: 7, title: "السؤال الذهبي", effect: { doublePoints: true } }
    ];

    const scoreResult = calculateQuestionScore({
      question,
      isCorrect: true,
      isTimeout: false,
      activeEffects
    });

    assert.equal(scoreResult.basePoints, 3, "النقاط الأساسية 3");
    assert.equal(scoreResult.cardBonus, 3, "بونص المضاعفة 3 نقاط فقط");
    assert.equal(scoreResult.netPoints, 6, "الناتج الكلي المعتمد 6 نقاط");
    assert.equal(scoreResult.isDoubleApplied, true);

    const room = {
      contestantInitialBaseScore: 300,
      contestantScore: 0,
      answeredQuestionsLog: {}
    };

    const res = recordAnswerIdempotent(room, {
      questionIdx: 1,
      isCorrect: true,
      basePoints: scoreResult.basePoints,
      cardBonus: scoreResult.cardBonus,
      scoreDelta: scoreResult.netPoints
    });

    assert.equal(res.totalScore, 306, "الرصيد يصبح 306 بموجب بطاقة المضاعفة الصريحة");
  });

  test("الحالة 10: عرض الدرجة في جميع الأدوار (مشرف، عارض، معلم، طالب) يعطي النتيجة المعتمدة نفسها", () => {
    const authoritativeRoom = {
      contestantInitialBaseScore: 300,
      contestantScore: 6,
      answeredQuestionsLog: {
        "q_0": { questionIdx: 0, scoreDelta: 3 },
        "q_1": { questionIdx: 1, scoreDelta: 3 }
      }
    };

    // قراءة النتيجة من واجهة المشرف
    const supervisorScore = getContestantTotalScore(authoritativeRoom);
    // قراءة النتيجة من واجهة العارض
    const presenterScore = getContestantTotalScore(authoritativeRoom);
    // قراءة النتيجة من واجهة المعلم
    const teacherScore = getContestantTotalScore(authoritativeRoom);
    // قراءة النتيجة من واجهة الطالب
    const studentScore = getContestantTotalScore(authoritativeRoom);

    assert.equal(supervisorScore, 306);
    assert.equal(presenterScore, 306);
    assert.equal(teacherScore, 306);
    assert.equal(studentScore, 306);
  });

  test("الحالة 11: اعتماد إجابتين متزامنتين (سؤالين مختلفين 0 و 1) لا يؤدي إلى فقدان نقاط أو مضاعفتها", () => {
    const room = {
      contestantInitialBaseScore: 300,
      contestantScore: 0,
      answeredQuestionsLog: {}
    };

    // السؤال الأول تم اعتماده (+3)
    recordAnswerIdempotent(room, {
      questionIdx: 0,
      scoreDelta: 3
    });

    // السؤال الثاني تم اعتماده بالتزامن (+3)
    recordAnswerIdempotent(room, {
      questionIdx: 1,
      scoreDelta: 3
    });

    assert.equal(room.contestantScore, 6, "مجموع الجلسة لسؤالين يجب أن يكون 6");
    assert.equal(getContestantTotalScore(room), 306, "الرصيد الإجمالي 306 تماماً دون فقدان أو تكرار");
  });

  test("الحالة 12: لا تعيد معالجة سؤال قديم بعد الانتقال إلى السؤال التالي", () => {
    const room = {
      currentQuestionIdx: 2,
      contestantInitialBaseScore: 300,
      contestantScore: 6,
      answeredQuestionsLog: {
        "q_0": { questionIdx: 0, scoreDelta: 3 },
        "q_1": { questionIdx: 1, scoreDelta: 3 }
      }
    };

    // محاولة بث قديم للسؤال رقم 0
    const staleEvent = {
      questionIdx: 0,
      scoreDelta: 3
    };

    const staleRes = recordAnswerIdempotent(room, staleEvent);
    assert.equal(staleRes.recordAdded, false, "السؤال القديم لا يعاد تسجيله");
    assert.equal(room.contestantScore, 6, "النقاط تظل 6 كما هي");
    assert.equal(getContestantTotalScore(room), 306, "الرصيد يظل 306 دون أي زيادة");
  });

  test("اختبار إضافي لانتهاء الوقت (Timeout): يخصم نصف نقاط السؤال (1.5 تُقرب إلى 2) عند غياب الحصانة", () => {
    const question = { id: "q1", points: 3 };
    const timeoutResult = calculateQuestionScore({
      question,
      isCorrect: false,
      isTimeout: true,
      activeEffects: []
    });

    assert.equal(timeoutResult.penalty, 2, "نصف الـ 3 نقاط هو 1.5 ويقرب إلى 2");
    assert.equal(timeoutResult.netPoints, -2, "الخصم هو -2 نقاط");
  });

  test("اختبار إضافي لانتهاء الوقت مع درع الأمان (Immunity): يلغي الخصم بالكامل", () => {
    const question = { id: "q1", points: 3 };
    const timeoutResult = calculateQuestionScore({
      question,
      isCorrect: false,
      isTimeout: true,
      activeEffects: [
        { cardId: 4, effect: { immunity: true } }
      ]
    });

    assert.equal(timeoutResult.immunityApplied, true);
    assert.equal(timeoutResult.penalty, 0, "الخصم ملغي بسبب درع الحصانة");
    assert.equal(timeoutResult.netPoints, 0);
  });

  test("اختبار إنهاء المسابقة (Finalize): لا يعيد جمع الدرجة مرتين", () => {
    const studentUser = { id: "std_1", totalScore: 300 };
    const room = {
      contestantInitialBaseScore: 300,
      contestantScore: 6,
      answeredQuestionsLog: {
        "q_0": { questionIdx: 0, scoreDelta: 3 },
        "q_1": { questionIdx: 1, scoreDelta: 3 }
      }
    };

    const finalScore = finalizeContestantScore(room, studentUser);
    assert.equal(finalScore, 306, "النتيجة النهائية المعتمدة هي 306");
    assert.equal(studentUser.totalScore, 306, "حساب الطالب تم تحديثه إلى 306 وليس 606 أو 612");

    // استدعاء الإنهاء مرة ثانية لنفس الطالب
    const secondFinal = finalizeContestantScore(room, studentUser);
    assert.equal(secondFinal, 306, "الإنهاء المتكرر يظل 306 دون زيادة");
    assert.equal(studentUser.totalScore, 306);
  });
});
