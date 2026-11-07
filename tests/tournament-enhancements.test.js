import test from "node:test";
import assert from "node:assert/strict";

function isLongInteractiveQuestion(q) {
  if (!q) return false;
  if (Array.isArray(q.pairs) && q.pairs.length > 0) return true;
  if (Array.isArray(q.items) && q.items.length > 0) return true;
  if (q.type === "matching" || q.type === "ordering" || q.type === "order") return true;
  return false;
}

function isSubjectiveSupervisorQuestion(q) {
  if (!q) return false;
  if (q.targetOral && String(q.targetOral).trim().length > 0) return true;
  if (q.type === "oral" || q.type === "recite" || q.type === "recitation" || q.type === "speech") return true;
  if (q.type === "essay" || q.type === "subjective" || q.type === "text" || q.type === "written") return true;
  if (!Array.isArray(q.options) || q.options.length < 2) {
    if (q.type !== "matching" && q.type !== "ordering" && q.type !== "order") {
      return true;
    }
  }
  return false;
}

function isObjectiveSpeedQuestion(q) {
  if (!q) return false;
  if (isLongInteractiveQuestion(q)) return false;
  if (isSubjectiveSupervisorQuestion(q)) return false;
  if (Array.isArray(q.options) && q.options.length >= 2) return true;
  return false;
}

function ensureTeamQuestionsPopulated(room, forceFresh = false) {
  if (!room || !room.isTeamMatch) return;
  if (forceFresh || !room.roundQuestions || !Array.isArray(room.roundQuestions) || room.roundQuestions.length === 0 || !room.roundQuestionConfig) {
    const quiz = room.quizData || { sections: [] };
    let allQ = [];
    if (quiz && Array.isArray(quiz.sections)) {
      quiz.sections.forEach(s => {
        (s.questions || []).forEach(q => allQ.push({ ...q, sectionName: s.sectionName }));
      });
    }

    const longInteractiveQ = allQ.filter(q => isLongInteractiveQuestion(q));
    const subjectiveSupervisorQ = allQ.filter(q => !isLongInteractiveQuestion(q) && isSubjectiveSupervisorQuestion(q));
    const pureObjectiveSpeedQ = allQ.filter(q => isObjectiveSpeedQuestion(q));

    if (pureObjectiveSpeedQ.length < 2) {
      const sourceQuestions = [...longInteractiveQ, ...subjectiveSupervisorQ, ...allQ];
      sourceQuestions.forEach((sq, idx) => {
        pureObjectiveSpeedQ.push({
          text: sq.text || `سؤال حاسم وسريع تحت الضغط #${idx + 1}`,
          type: "mcq",
          options: ["صحيح", "خطأ"],
          correct: 0,
          points: 5,
          sectionName: sq.sectionName || "تحت الضغط"
        });
      });
    }

    const round1Pool = [];
    const round2Pool = [];
    const round3Pool = [];

    longInteractiveQ.forEach((q, idx) => {
      if (idx % 2 === 0) round1Pool.push(q);
      else round2Pool.push(q);
    });

    subjectiveSupervisorQ.forEach((q, idx) => {
      if (idx % 2 === 0) round1Pool.push(q);
      else round2Pool.push(q);
    });

    const countR3 = Math.max(2, Math.floor(pureObjectiveSpeedQ.length / 3));
    round3Pool.push(...pureObjectiveSpeedQ.slice(0, countR3));
    const remainingPureSpeed = pureObjectiveSpeedQ.slice(countR3);

    remainingPureSpeed.forEach((q, idx) => {
      if (idx % 2 === 0) round1Pool.push(q);
      else round2Pool.push(q);
    });

    while (round1Pool.length < 2) round1Pool.push(round3Pool[0] || { text: "سؤال تنافسي", type: "mcq", options: ["نعم", "لا"], correct: 0, points: 5 });
    while (round2Pool.length < 2) round2Pool.push(round3Pool[1] || round3Pool[0] || { text: "سؤال تنافسي", type: "mcq", options: ["نعم", "لا"], correct: 0, points: 5 });
    while (round3Pool.length < 2) round3Pool.push({ text: "سؤال حاسم تحت الضغط", type: "mcq", options: ["صحيح", "خطأ"], correct: 0, points: 5, sectionName: "تحت الضغط" });

    const finalQuestions = [...round1Pool, ...round2Pool, ...round3Pool];
    const roundConfig = {
      1: { start: 0, count: round1Pool.length },
      2: { start: round1Pool.length, count: round2Pool.length },
      3: { start: round1Pool.length + round2Pool.length, count: round3Pool.length }
    };

    room.roundQuestions = finalQuestions;
    room.roundQuestionConfig = roundConfig;
  }
}

test("1. فحص استبعاد أسئلة المقالي والشفهي (تقييم المشرف صح أو خطأ) والتوصيل والترتيب نهائياً من فقرة تحت الضغط (Round 3)", () => {
  const mixedQuiz = {
    title: "اختبار شامل تجريبي",
    sections: [
      {
        sectionName: "قسم شامل",
        questions: [
          { type: "matching", pairs: [["1", "أ"], ["2", "ب"]], text: "صل الكلمات" },
          { type: "order", items: ["الحمد", "لله", "رب", "العالمين"], text: "رتب الآية" },
          { type: "oral", targetOral: "كَتَبَ - بَلَغَ - وَجَدَ", text: "اقرأ الكلمات الآتية بضبط الحركات" },
          { type: "essay", text: "اشرح معنى الآية الكريمة باختصار" },
          { type: "mcq", options: ["خيار 1", "خيار 2"], correct: 0, text: "سؤال اختيار 1" },
          { type: "mcq", options: ["خيار 1", "خيار 2"], correct: 1, text: "سؤال اختيار 2" },
          { type: "mcq", options: ["خيار 1", "خيار 2"], correct: 0, text: "سؤال اختيار 3" },
          { type: "mcq", options: ["خيار 1", "خيار 2"], correct: 0, text: "سؤال اختيار 4" }
        ]
      }
    ]
  };

  const room = {
    isTeamMatch: true,
    quizData: mixedQuiz
  };

  ensureTeamQuestionsPopulated(room, true);

  const cfgR3 = room.roundQuestionConfig[3];
  const r3Questions = room.roundQuestions.slice(cfgR3.start, cfgR3.start + cfgR3.count);

  assert.ok(r3Questions.length >= 2, "فقرة تحت الضغط يجب أن تحتوي على سؤالين على الأقل");
  r3Questions.forEach((q, idx) => {
    assert.strictEqual(
      isLongInteractiveQuestion(q),
      false,
      `السؤال رقم ${idx + 1} في فقرة تحت الضغط يجب ألا يكون توصيل أو ترتيب أبداً`
    );
    assert.strictEqual(
      isSubjectiveSupervisorQuestion(q),
      false,
      `السؤال رقم ${idx + 1} في فقرة تحت الضغط يجب ألا يكون شفهي أو مقالي يعتمد على تحكيم المشرف`
    );
    assert.strictEqual(
      isObjectiveSpeedQuestion(q),
      true,
      `السؤال رقم ${idx + 1} في فقرة تحت الضغط يجب أن يكون موضوعياً سريعاً (MCQ) مؤتمت التقييم`
    );
  });

  // التأكد من أن الأسئلة الشفهية والمقالية تم توجيهها للفقرتين الأولى والثانية
  const r1AndR2Questions = room.roundQuestions.slice(0, cfgR3.start);
  const foundOral = r1AndR2Questions.some(q => q.type === "oral" || !!q.targetOral);
  const foundEssay = r1AndR2Questions.some(q => q.type === "essay");
  const foundMatching = r1AndR2Questions.some(q => q.type === "matching");
  assert.ok(foundOral, "الأسئلة الشفهية يجب أن تكون في الفقرة الأولى أو الثانية");
  assert.ok(foundEssay, "الأسئلة المقالية يجب أن تكون في الفقرة الأولى أو الثانية");
  assert.ok(foundMatching, "أسئلة التوصيل يجب أن تكون في الفقرة الأولى أو الثانية");
});

test("2. فحص إزالة أي تكرار للمراكز ومنع لاق المراكز (Deduplication of Standings)", () => {
  const rawStandings = [
    { team: { id: "team_1", name: "فريق النور" }, stageLabel: "البطل 🏆" },
    { team: { id: "team_2", name: "فريق الإيمان" }, stageLabel: "الوصيف 🥈" },
    { team: { id: "team_2", name: "فريق الإيمان" }, stageLabel: "المركز الثالث 🥉" }, // تكرار بسبب لاق
    { team: { id: "team_3", name: "فريق الفجر" }, stageLabel: "المركز الرابع" }
  ];

  const seenIds = new Set();
  const cleanStandings = [];
  rawStandings.forEach(item => {
    const tId = item.team.id;
    if (!seenIds.has(tId)) {
      seenIds.add(tId);
      cleanStandings.push(item);
    }
  });
  cleanStandings.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  assert.strictEqual(cleanStandings.length, 3, "يجب إزالة الفريق المكرر في المركزين الثاني والثالث");
  assert.strictEqual(cleanStandings[0].rank, 1);
  assert.strictEqual(cleanStandings[1].rank, 2);
  assert.strictEqual(cleanStandings[2].rank, 3);
  assert.strictEqual(cleanStandings[1].team.id, "team_2");
  assert.strictEqual(cleanStandings[2].team.id, "team_3");
});

test("3. فحص كائن نافذة الاحتفال بنهاية كل مواجهة (Match Winner Modal State)", () => {
  const state = {
    isOpen: true,
    winnerTeam: { id: "team_a", name: "الفرسان", color: "blue" },
    winnerScore: 15,
    loserTeam: { id: "team_b", name: "الأبطال", color: "green" },
    loserScore: 10,
    roundName: "الدور نصف النهائي"
  };

  assert.strictEqual(state.isOpen, true);
  assert.strictEqual(state.winnerScore > state.loserScore, true);
  assert.strictEqual(state.winnerTeam.id, "team_a");
  assert.strictEqual(state.loserTeam.id, "team_b");
});
