import test from "node:test";
import assert from "node:assert/strict";

// محاكي محرك ركلات الترجيح والحسم الإشرافي
function createTiebreakerEngine(totalQuizQuestions = 16) {
  const maxPenaltyQuestions = Math.max(2, Math.floor(totalQuizQuestions * 0.25));

  const room = {
    id: "test_room_1",
    isTeamMatch: true,
    teams: [
      { id: "team_1", name: "فرسان القرآن", color: "#10b981" },
      { id: "team_2", name: "رواد التجويد", color: "#0284c7" }
    ],
    teamScores: { team_1: 20, team_2: 20 },
    roundQuestions: Array.from({ length: totalQuizQuestions }, (_, i) => ({
      id: `q_${i + 1}`,
      text: `سؤال الاختبار رقم ${i + 1}`,
      points: 5
    })),
    tiebreakerShootoutState: null,
    supervisorTiebreakerState: null,
    matchWinnerModalState: null
  };

  function checkMatchFinish(forcedWinner = null) {
    const teamA = room.teams[0];
    const teamB = room.teams[1];
    const scoreA = room.teamScores[teamA.id];
    const scoreB = room.teamScores[teamB.id];

    if (!forcedWinner && scoreA === scoreB) {
      // بدء ركلات الترجيح الفاصلة
      room.tiebreakerShootoutState = {
        active: true,
        roundNumber: 1,
        teamAId: teamA.id,
        teamBId: teamB.id,
        currentTurnTeamId: teamA.id,
        teamAResult: null,
        teamBResult: null,
        questionsAnsweredCount: 0,
        maxPenaltyQuestions: maxPenaltyQuestions,
        isWaitingSupervisor: false
      };
      return "tiebreaker_started";
    }

    let winner;
    let loser;
    if (forcedWinner) {
      winner = forcedWinner.id === teamA.id ? teamA : teamB;
      loser = forcedWinner.id === teamA.id ? teamB : teamA;
    } else {
      winner = scoreA > scoreB ? teamA : teamB;
      loser = scoreA > scoreB ? teamB : teamA;
    }

    room.matchWinnerModalState = {
      isOpen: true,
      winnerTeam: { id: winner.id, name: winner.name },
      loserTeam: { id: loser.id, name: loser.name },
      winnerScore: Math.max(scoreA, scoreB),
      loserScore: Math.min(scoreA, scoreB)
    };
    return "winner_declared";
  }

  function answerTiebreaker(isCorrect, points = 5) {
    const state = room.tiebreakerShootoutState;
    if (!state || !state.active) return "inactive";

    const teamA = room.teams[0];
    const teamB = room.teams[1];
    const activeTeam = state.currentTurnTeamId === teamA.id ? teamA : teamB;

    if (isCorrect) {
      room.teamScores[activeTeam.id] += points;
    }
    state.questionsAnsweredCount += 1;

    if (activeTeam.id === teamA.id) {
      state.teamAResult = isCorrect;
      state.currentTurnTeamId = teamB.id;
      return "team_a_done";
    } else {
      state.teamBResult = isCorrect;

      const teamAWon = (state.teamAResult === true && state.teamBResult === false);
      const teamBWon = (state.teamAResult === false && state.teamBResult === true);

      if (teamAWon) {
        state.active = false;
        checkMatchFinish(teamA);
        return "team_a_won";
      }

      if (teamBWon) {
        state.active = false;
        checkMatchFinish(teamB);
        return "team_b_won";
      }

      // استمرار التعادل بعد انتهاء الجولة
      if (state.questionsAnsweredCount >= state.maxPenaltyQuestions) {
        // استنفاد ربع أسئلة الاختبار دون حسم!
        state.active = false;
        state.isWaitingSupervisor = true;
        room.supervisorTiebreakerState = {
          isOpen: true,
          teamA: { id: teamA.id, name: teamA.name, score: room.teamScores[teamA.id] },
          teamB: { id: teamB.id, name: teamB.name, score: room.teamScores[teamB.id] },
          maxPenaltyQuestions: state.maxPenaltyQuestions
        };
        return "supervisor_intervention_required";
      }

      // الانتقال للجولة التالية
      state.roundNumber += 1;
      state.currentTurnTeamId = teamA.id;
      state.teamAResult = null;
      state.teamBResult = null;
      return "next_penalty_round";
    }
  }

  function supervisorDecideWinner(chosenTeamId) {
    const teamA = room.teams[0];
    const teamB = room.teams[1];
    const winner = chosenTeamId === teamA.id ? teamA : teamB;

    room.teamScores[winner.id] += 1;
    room.supervisorTiebreakerState.isOpen = false;
    room.tiebreakerShootoutState = null;

    checkMatchFinish(winner);
    return "supervisor_decided";
  }

  return { room, checkMatchFinish, answerTiebreaker, supervisorDecideWinner, maxPenaltyQuestions };
}

test("1. فحص تفعيل ركلات الترجيح تلقائياً عند التعادل في نهاية المباراة واحتساب سقف ربع الاختبار", () => {
  const engine = createTiebreakerEngine(20); // 20 سؤال
  assert.equal(engine.maxPenaltyQuestions, 5, "ربع 20 سؤال هو 5 أسئلة كحد أقصى");

  const result = engine.checkMatchFinish();
  assert.equal(result, "tiebreaker_started");
  assert.equal(engine.room.tiebreakerShootoutState.active, true);
  assert.equal(engine.room.tiebreakerShootoutState.roundNumber, 1);
  assert.equal(engine.room.tiebreakerShootoutState.currentTurnTeamId, "team_1");
  assert.equal(engine.room.tiebreakerShootoutState.maxPenaltyQuestions, 5);
});

test("2. فحص فوز الفريق الأول فورياً عندما يسجل ويخفق الفريق الثاني (زي البلنتيات)", () => {
  const engine = createTiebreakerEngine(12);
  engine.checkMatchFinish();

  // الفريق الأول يجيب صح
  const step1 = engine.answerTiebreaker(true, 5);
  assert.equal(step1, "team_a_done");
  assert.equal(engine.room.tiebreakerShootoutState.currentTurnTeamId, "team_2");
  assert.equal(engine.room.teamScores.team_1, 25);

  // الفريق الثاني يجيب خطأ (يضيع سؤاله)
  const step2 = engine.answerTiebreaker(false, 0);
  assert.equal(step2, "team_a_won");
  assert.equal(engine.room.tiebreakerShootoutState.active, false);
  assert.equal(engine.room.matchWinnerModalState.isOpen, true);
  assert.equal(engine.room.matchWinnerModalState.winnerTeam.id, "team_1");
});

test("3. فحص فوز الفريق الثاني فورياً عندما يخفق الفريق الأول ويسجل الثاني", () => {
  const engine = createTiebreakerEngine(12);
  engine.checkMatchFinish();

  // الفريق الأول يجيب خطأ
  const step1 = engine.answerTiebreaker(false, 0);
  assert.equal(step1, "team_a_done");

  // الفريق الثاني يجيب صح
  const step2 = engine.answerTiebreaker(true, 5);
  assert.equal(step2, "team_b_won");
  assert.equal(engine.room.tiebreakerShootoutState.active, false);
  assert.equal(engine.room.matchWinnerModalState.isOpen, true);
  assert.equal(engine.room.matchWinnerModalState.winnerTeam.id, "team_2");
});

test("4. فحص استمرار ركلات الترجيح لجولة ثانية إذا أجاب كلاهما بشكل صحيح أو كلاهما أخطأ", () => {
  const engine = createTiebreakerEngine(16); // ربع = 4 أسئلة
  engine.checkMatchFinish();

  // كلاهما أجاب صح في الركلة 1
  engine.answerTiebreaker(true, 5);
  const step2 = engine.answerTiebreaker(true, 5);
  assert.equal(step2, "next_penalty_round");
  assert.equal(engine.room.tiebreakerShootoutState.roundNumber, 2);
  assert.equal(engine.room.tiebreakerShootoutState.currentTurnTeamId, "team_1");
  assert.equal(engine.room.tiebreakerShootoutState.questionsAnsweredCount, 2);
});

test("5. فحص ظهور شاشة الحسم الإشرافي بثيم دولينجو عند استنفاد ربع أسئلة الاختبار دون فائز", () => {
  const engine = createTiebreakerEngine(16); // ربع = 4 أسئلة (أي جولتين كاملتين)
  engine.checkMatchFinish();

  // الجولة 1: كلاهما أخطأ (2 أسئلة)
  engine.answerTiebreaker(false, 0);
  engine.answerTiebreaker(false, 0);

  // الجولة 2: كلاهما أجاب صح (2 أسئلة -> المجموع 4 أسئلة = ربع الاختبار)
  engine.answerTiebreaker(true, 5);
  const step4 = engine.answerTiebreaker(true, 5);

  assert.equal(step4, "supervisor_intervention_required");
  assert.equal(engine.room.tiebreakerShootoutState.active, false);
  assert.equal(engine.room.tiebreakerShootoutState.isWaitingSupervisor, true);
  assert.equal(engine.room.supervisorTiebreakerState.isOpen, true);
  assert.equal(engine.room.supervisorTiebreakerState.teamA.name, "فرسان القرآن");
  assert.equal(engine.room.supervisorTiebreakerState.teamB.name, "رواد التجويد");
});

test("6. فحص حسم المشرف للتعادل واختيار الفريق الفائز وانتقال الغرفة لشاشة التتويج", () => {
  const engine = createTiebreakerEngine(16);
  engine.checkMatchFinish();

  // استنفاد ربع الاختبار
  engine.answerTiebreaker(false, 0);
  engine.answerTiebreaker(false, 0);
  engine.answerTiebreaker(true, 5);
  engine.answerTiebreaker(true, 5);

  assert.equal(engine.room.supervisorTiebreakerState.isOpen, true);

  // المشرف يختار الفريق الثاني
  const resolve = engine.supervisorDecideWinner("team_2");
  assert.equal(resolve, "supervisor_decided");
  assert.equal(engine.room.supervisorTiebreakerState.isOpen, false);
  assert.equal(engine.room.matchWinnerModalState.isOpen, true);
  assert.equal(engine.room.matchWinnerModalState.winnerTeam.id, "team_2");
  assert.equal(engine.room.matchWinnerModalState.loserTeam.id, "team_1");
});
