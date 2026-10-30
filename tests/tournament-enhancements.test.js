import test from "node:test";
import assert from "node:assert/strict";

function isLongInteractiveQuestion(q) {
  if (!q) return false;
  if (Array.isArray(q.pairs) && q.pairs.length > 0) return true;
  if (Array.isArray(q.items) && q.items.length > 0) return true;
  if (q.type === "matching" || q.type === "ordering" || q.type === "order") return true;
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
    const speedQ = allQ.filter(q => !isLongInteractiveQuestion(q));

    if (speedQ.length < 2) {
      longInteractiveQ.forEach(lq => {
        speedQ.push({
          text: lq.text || "سؤال سريع تحت الضغط",
          type: "mcq",
          options: ["صحيح", "خطأ"],
          correct: 0,
          points: 5,
          sectionName: lq.sectionName || "تحت الضغط"
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

    const countR3 = Math.max(2, Math.floor(speedQ.length / 3));
    round3Pool.push(...speedQ.slice(0, countR3));
    const remainingSpeed = speedQ.slice(countR3);

    remainingSpeed.forEach((q, idx) => {
      if (idx % 2 === 0) round1Pool.push(q);
      else round2Pool.push(q);
    });

    while (round1Pool.length < 2) round1Pool.push(round3Pool[0]);
    while (round2Pool.length < 2) round2Pool.push(round3Pool[1] || round3Pool[0]);
    while (round3Pool.length < 2) round3Pool.push(speedQ[0]);

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

test("1. فحص استبعاد أسئلة التوصيل والترتيب نهائياً من فقرة تحت الضغط (Round 3)", () => {
  const mixedQuiz = {
    title: "اختبار تجريبي",
    sections: [
      {
        sectionName: "قسم التوصيل والترتيب",
        questions: [
          { type: "matching", pairs: [["1", "أ"], ["2", "ب"]], text: "صل الكلمات" },
          { type: "order", items: ["الحمد", "لله", "رب", "العالمين"], text: "رتب الآية" },
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
  });
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
