// ========================================================
// محرك النقاط الموحد والموثوق لمسابقة نور البيان 1448 - 1449 هـ
// المصدر المعتمد والنهائي لاحتساب وحفظ ومزامنة درجات المتسابقين
// يمنع التكرار (Idempotent)، ويمنع المضاعفة غير المقصودة، ويوحد النتائج لجميع الأدوار
// ========================================================

/**
 * مفتاح فريد لا يتكرر لكل سؤال في جلسة المسابقة
 * @param {string|number} questionIdx
 * @returns {string}
 */
export function getAnswerLogKey(questionIdx) {
  return `q_${questionIdx}`;
}

/**
 * احتساب نقاط السؤال والبطاقات التكتيكية بدقة صارمة تمنع المضاعفة غير المقصودة
 * @param {Object} options
 * @param {Object} options.question - بيانات السؤال
 * @param {boolean} options.isCorrect - هل الإجابة صحيحة
 * @param {boolean} [options.isTimeout=false] - هل انتهى الوقت
 * @param {Array} [options.activeEffects=[]] - قائمة التأثيرات الفعالة للبطاقات
 * @param {number} [options.elapsedSec=0] - الثواني المستغرقة للإجابة
 * @param {number} [options.qDuration=30] - المدة الكلية للسؤال
 * @returns {Object} { basePoints, cardBonus, penalty, netPoints, isDoubleApplied, immunityApplied }
 */
export function calculateQuestionScore({
  question,
  isCorrect,
  isTimeout = false,
  activeEffects = [],
  elapsedSec = 0,
  qDuration = 30
}) {
  // القيمة الأساسية الصريحة للسؤال (تُقرأ من السؤال أو 3 نقاط افتراضياً وفق قواعد المسابقة)
  const basePoints = (question && typeof question.points === "number" && question.points > 0)
    ? question.points
    : 3;

  let cardBonus = 0;
  let penalty = 0;
  let isDoubleApplied = false;
  let immunityApplied = false;

  const effects = Array.isArray(activeEffects) ? activeEffects : [];

  // فحص درع الأمان / الحصانة (البطاقة 4 أو 17 وغيرها)
  const hasImmunity = effects.some(e => e?.effect?.immunity);

  if (isTimeout) {
    // عند انتهاء الوقت: خصم نصف النقاط التي كان المفروض أن يحصل عليها
    if (hasImmunity) {
      immunityApplied = true;
      penalty = 0;
    } else {
      penalty = Math.max(1, Math.round(basePoints / 2));
    }
    return {
      basePoints,
      cardBonus: 0,
      penalty,
      netPoints: penalty > 0 ? -penalty : 0,
      isDoubleApplied: false,
      immunityApplied
    };
  }

  if (!isCorrect) {
    // إجابة خاطئة
    if (hasImmunity) {
      immunityApplied = true;
      penalty = 0;
    } else {
      // فحص بطاقة المخاطرة الكبرى (البطاقة 3): خصم محدد
      const riskCard = effects.find(e => e?.effect?.penaltyOnWrong);
      if (riskCard && riskCard.effect.penaltyOnWrong > 0) {
        penalty = riskCard.effect.penaltyOnWrong;
      } else {
        penalty = 0; // في الأسئلة العادية الإجابة الخاطئة لا تخصم نقاطاً إضافية (أو خصم محدد بالقاعدة)
      }
    }
    return {
      basePoints: 0,
      cardBonus: 0,
      penalty,
      netPoints: penalty > 0 ? -penalty : 0,
      isDoubleApplied: false,
      immunityApplied
    };
  }

  // إجابة صحيحة:
  // فحص مضاعفة الدرجات (البطاقة 7 - السؤال الذهبي): تطبق فقط إذا كانت بطاقة مضاعفة مفعلة صراحة
  const doubleCard = effects.find(e => e?.effect?.doublePoints || e?.cardId === 7);
  if (doubleCard) {
    isDoubleApplied = true;
    cardBonus += basePoints; // مضاعفة بإضافة قدر النقاط الأساسية مرة واحدة
  }

  // فحص مكافآت البطاقات الأخرى المشروعة
  effects.forEach(eff => {
    const e = eff?.effect || {};
    // بونص النقاط الصريح للبطاقة
    if (typeof e.pointsBonus === "number" && e.pointsBonus > 0) {
      cardBonus += e.pointsBonus;
    }
    // بطاقة توازن الحكماء (دقة وسرعة)
    if (e.balanceAccuracyAndSpeed && qDuration > 0) {
      const speedRatio = Math.max(0, Math.min(1, (qDuration - elapsedSec) / qDuration));
      const speedBonusPts = Math.round(speedRatio * 2.5 * 10) / 10;
      cardBonus += speedBonusPts;
    }
    // مكافأة السرعة الخارقة في أقل من 5 ثوانٍ
    if (e.speedBonusUnder5s && elapsedSec > 0 && elapsedSec < 5) {
      cardBonus += e.speedBonusUnder5s;
    }
  });

  const netPoints = basePoints + cardBonus;

  return {
    basePoints,
    cardBonus,
    penalty: 0,
    netPoints,
    isDoubleApplied,
    immunityApplied
  };
}

/**
 * تسجيل نتيجة السؤال في سجل إجابات الغرفة بطريقة ذرية ومحصنة ضد التكرار (Idempotent)
 * إذا وصل حدث احتساب نفس السؤال مرتين، لا يُضاف السؤال مرة ثانية ولا تتغير النتيجة!
 * @param {Object} room - كائن الغرفة الحية
 * @param {Object} answerData - تفاصيل الإجابة المحتسبة
 * @returns {Object} { room, recordAdded, contestantScore, totalScore }
 */
export function recordAnswerIdempotent(room, answerData) {
  if (!room) return { room, recordAdded: false, contestantScore: 0, totalScore: 0 };

  const questionIdx = answerData.questionIdx ?? (room.currentQuestionIdx || 0);
  const logKey = getAnswerLogKey(questionIdx);

  if (!room.answeredQuestionsLog || typeof room.answeredQuestionsLog !== "object") {
    room.answeredQuestionsLog = {};
  }

  // فحص ما إذا كان هذا السؤال قد تم تسجيله مسبقاً
  if (room.answeredQuestionsLog[logKey]) {
    // السؤال مسجل ومعتمد مسبقاً! نُعيد النتيجة المعتمدة كما هي دون أي زيادة مكررة
    const contestantScore = calculateSessionScoreFromLog(room.answeredQuestionsLog);
    const initialBase = typeof room.contestantInitialBaseScore === "number" ? room.contestantInitialBaseScore : 0;
    const totalScore = Math.max(0, initialBase + contestantScore);
    return {
      room,
      recordAdded: false,
      contestantScore,
      totalScore,
      existingRecord: room.answeredQuestionsLog[logKey]
    };
  }

  // تسجيل الإجابة المعتمدة لأول مرة
  const newRecord = {
    answerId: `ans_${room.id || 'live'}_q${questionIdx}_${Date.now()}`,
    questionIdx,
    isCorrect: !!answerData.isCorrect,
    isTimeout: !!answerData.isTimeout,
    basePoints: Number(answerData.basePoints) || 0,
    cardBonus: Number(answerData.cardBonus) || 0,
    penalty: Number(answerData.penalty) || 0,
    scoreDelta: Number(answerData.scoreDelta ?? answerData.netPoints) || 0,
    chosenChoiceIdx: answerData.chosenChoiceIdx ?? null,
    answeredBy: answerData.answeredBy || "المتسابق",
    timestamp: Date.now()
  };

  room.answeredQuestionsLog[logKey] = newRecord;

  // إعادة احتساب نقاط الجلسة حصرياً من سجل الأسئلة كمصدر مرجعي وحيد
  const contestantScore = calculateSessionScoreFromLog(room.answeredQuestionsLog);
  room.contestantScore = contestantScore;

  // أعلى نتيجة مسجلة لصمام الأمان
  room.highestLockedScore = Math.max(room.highestLockedScore || 0, contestantScore);

  const initialBase = typeof room.contestantInitialBaseScore === "number" ? room.contestantInitialBaseScore : 0;
  const totalScore = Math.max(0, initialBase + contestantScore);

  return {
    room,
    recordAdded: true,
    contestantScore,
    totalScore,
    newRecord
  };
}

/**
 * حساب مجموع نقاط الجلسة الحالية حصرياً من سجل الإجابات المعتمد
 * @param {Object} log - كائن سجل إجابات الغرفة
 * @returns {number}
 */
export function calculateSessionScoreFromLog(log) {
  if (!log || typeof log !== "object") return 0;
  let totalDelta = 0;
  Object.values(log).forEach(entry => {
    if (entry && typeof entry.scoreDelta === "number") {
      totalDelta += entry.scoreDelta;
    }
  });
  return Math.max(0, totalDelta);
}

/**
 * حساب النتيجة التراكمية المعتمدة للمتسابق:
 * (الرصيد الأساسي الأصلي عند بدء المسابقة) + (مجموع نقاط الجلسة الحالية من السجل)
 * @param {Object} room - الغرفة الحية
 * @param {number} [fallbackInitial=0] - الرصيد الابتدائي في حال عدم وجوده بالغرفة
 * @returns {number}
 */
export function getContestantTotalScore(room, fallbackInitial = 0) {
  if (!room) return Math.max(0, fallbackInitial);
  const initialBase = (typeof room.contestantInitialBaseScore === "number")
    ? room.contestantInitialBaseScore
    : fallbackInitial;
  const sessionScore = (room.answeredQuestionsLog && typeof room.answeredQuestionsLog === "object")
    ? calculateSessionScoreFromLog(room.answeredQuestionsLog)
    : (typeof room.contestantScore === "number" ? room.contestantScore : 0);
  return Math.max(0, initialBase + sessionScore);
}

/**
 * إنهاء مسابقة المتسابق واعتماد درجته النهائية في حسابه ولوحة الشرف مرة واحدة دون جمع مكرر
 * @param {Object} room - الغرفة الحية
 * @param {Object} studentUser - بيانات الطالب من قاعدة البيانات
 * @returns {number} النتيجة النهائية المعتمدة
 */
export function finalizeContestantScore(room, studentUser) {
  const initialBase = (room && typeof room.contestantInitialBaseScore === "number")
    ? room.contestantInitialBaseScore
    : (studentUser && typeof studentUser.totalScore === "number" ? studentUser.totalScore : 0);

  const sessionScore = (room && room.answeredQuestionsLog)
    ? calculateSessionScoreFromLog(room.answeredQuestionsLog)
    : (room && typeof room.contestantScore === "number" ? room.contestantScore : 0);

  const finalTotal = Math.max(0, initialBase + sessionScore);

  if (studentUser) {
    studentUser.totalScore = finalTotal;
  }

  return finalTotal;
}
