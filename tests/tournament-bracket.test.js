import test from 'node:test';
import assert from 'node:assert/strict';

function getRoundNameForTeams(count) {
  if (count > 16) return "دور الـ 32";
  if (count > 8) return "دور الـ 16";
  if (count > 4) return "الدور ربع النهائي (دور الـ 8)";
  if (count > 2) return "الدور نصف النهائي (المربع الذهبي)";
  if (count === 2) return "المباراة النهائية الكبرى 🏆";
  return "المواجهة التصفوية";
}

function initTournamentBracket(teams) {
  const validTeams = teams;
  const teamIds = validTeams.map(t => t.id);

  let byeTeamId = null;
  let pendingIds = [...teamIds];
  let qualifiedIds = [];

  if (pendingIds.length % 2 !== 0 && pendingIds.length > 2) {
    const byeIdx = Math.floor(Math.random() * pendingIds.length);
    byeTeamId = pendingIds.splice(byeIdx, 1)[0];
    qualifiedIds.push(byeTeamId);
  }

  const roundName = getRoundNameForTeams(validTeams.length);

  return {
    teams: validTeams,
    currentRoundIndex: 0,
    currentRoundName: roundName,
    isFinished: false,
    championTeam: null,
    runnerUpTeam: null,
    thirdPlaceTeam: null,
    fourthPlaceTeam: null,
    semiFinalLosers: [],
    finalists: [],
    teamMatchScores: {},
    fullStandings: [],
    rounds: [
      {
        roundIndex: 0,
        roundName: roundName,
        isGrandFinal: validTeams.length === 2,
        isThirdPlaceMatch: false,
        isSemiFinal: validTeams.length === 4 || validTeams.length === 3,
        initialTeamsCount: validTeams.length,
        pendingTeamIds: pendingIds,
        qualifiedTeamIds: qualifiedIds,
        eliminatedTeamIds: [],
        byeTeamId: byeTeamId,
        matches: []
      }
    ]
  };
}

function simulateTournamentMatchFinished(tState, teamA, teamB, scoreA, scoreB) {
  const winner = scoreA >= scoreB ? teamA : teamB;
  const loser = scoreA >= scoreB ? teamB : teamA;

  tState.teamMatchScores = tState.teamMatchScores || {};
  tState.teamMatchScores[winner.id] = Math.max(scoreA, scoreB);
  tState.teamMatchScores[loser.id] = Math.min(scoreA, scoreB);

  const currentRound = tState.rounds[tState.currentRoundIndex];

  currentRound.matches = currentRound.matches || [];
  currentRound.matches.push({
    teamA: { id: teamA.id, name: teamA.name },
    teamB: { id: teamB.id, name: teamB.name },
    scoreA,
    scoreB,
    winnerId: winner.id,
    loserId: loser.id
  });

  if (!currentRound.qualifiedTeamIds.includes(winner.id)) {
    currentRound.qualifiedTeamIds.push(winner.id);
  }
  if (!currentRound.eliminatedTeamIds.includes(loser.id)) {
    currentRound.eliminatedTeamIds.push(loser.id);
  }
  currentRound.pendingTeamIds = (currentRound.pendingTeamIds || []).filter(id => id !== teamA.id && id !== teamB.id);

  if (currentRound.pendingTeamIds.length >= 2) {
    return { status: "round_ongoing", currentRound };
  }

  const allTeams = tState.teams || [];

  const isGrandFinalMatch = Boolean(
    currentRound.isGrandFinal || 
    currentRound.roundName === "المباراة النهائية الكبرى" || 
    currentRound.roundName.includes("النهائية الكبرى") ||
    (tState.rounds.length === 1 && currentRound.initialTeamsCount <= 2)
  );

  if (isGrandFinalMatch) {
    tState.isFinished = true;
    tState.championTeam = winner;
    tState.runnerUpTeam = loser;

    const standings = [];
    standings.push({
      rank: 1,
      team: winner,
      stageLabel: "البطل المتوج بالمركز الأول 🏆 🥇",
      points: tState.teamMatchScores[winner.id]
    });
    standings.push({
      rank: 2,
      team: loser,
      stageLabel: "وصيف البطولة - المركز الثاني 🥈",
      points: tState.teamMatchScores[loser.id]
    });

    if (tState.thirdPlaceTeam) {
      standings.push({
        rank: 3,
        team: tState.thirdPlaceTeam,
        stageLabel: "صاحب المركز الثالث - الميدالية البرونزية 🥉",
        points: tState.teamMatchScores[tState.thirdPlaceTeam.id] || 0
      });
    }

    if (tState.fourthPlaceTeam) {
      standings.push({
        rank: 4,
        team: tState.fourthPlaceTeam,
        stageLabel: "المركز الرابع - المربع الذهبي 🎖️",
        points: tState.teamMatchScores[tState.fourthPlaceTeam.id] || 0
      });
    }

    tState.fullStandings = standings;
    return { status: "tournament_finished", tState, standings };
  }

  const isThirdPlaceMatch = Boolean(
    currentRound.isThirdPlaceMatch || 
    currentRound.roundName.includes("المركز الثالث")
  );

  if (isThirdPlaceMatch) {
    tState.thirdPlaceTeam = winner;
    tState.fourthPlaceTeam = loser;

    const finalRoundIndex = tState.currentRoundIndex + 1;
    const finalPendingTeams = (Array.isArray(tState.finalists) && tState.finalists.length >= 2)
      ? [...tState.finalists]
      : [...currentRound.qualifiedTeamIds];

    const finalRound = {
      roundIndex: finalRoundIndex,
      roundName: "المباراة النهائية الكبرى 🏆",
      isGrandFinal: true,
      isThirdPlaceMatch: false,
      isSemiFinal: false,
      initialTeamsCount: finalPendingTeams.length,
      pendingTeamIds: finalPendingTeams,
      qualifiedTeamIds: [],
      eliminatedTeamIds: [],
      byeTeamId: null,
      matches: []
    };

    tState.rounds.push(finalRound);
    tState.currentRoundIndex = finalRoundIndex;
    tState.currentRoundName = finalRound.roundName;

    return { status: "third_place_completed", nextRound: finalRound };
  }

  const isSemiFinalRound = Boolean(
    currentRound.isSemiFinal || 
    currentRound.roundName.includes("نصف النهائي") || 
    currentRound.roundName.includes("المربع الذهبي") ||
    (currentRound.qualifiedTeamIds.length === 2 && currentRound.eliminatedTeamIds.length >= 1)
  );

  if (isSemiFinalRound) {
    if (currentRound.eliminatedTeamIds.length >= 2) {
      tState.finalists = [...currentRound.qualifiedTeamIds];
      tState.semiFinalLosers = [...currentRound.eliminatedTeamIds];

      const thirdRoundIndex = tState.currentRoundIndex + 1;
      const thirdRound = {
        roundIndex: thirdRoundIndex,
        roundName: "مباراة تحديد المركز الثالث (الميدالية البرونزية) 🥉",
        isThirdPlaceMatch: true,
        isGrandFinal: false,
        isSemiFinal: false,
        initialTeamsCount: 2,
        pendingTeamIds: [...currentRound.eliminatedTeamIds],
        qualifiedTeamIds: [],
        eliminatedTeamIds: [],
        byeTeamId: null,
        matches: []
      };

      tState.rounds.push(thirdRound);
      tState.currentRoundIndex = thirdRoundIndex;
      tState.currentRoundName = thirdRound.roundName;

      return { status: "semi_finals_completed_schedule_third_place", nextRound: thirdRound };
    }
  }

  return { status: "next_round" };
}

test("Knockout Tournament Architecture with 4 teams and 3rd place match", async (t) => {
  const teams = [
    { id: "team_1", name: "فريق الإتقان" },
    { id: "team_2", name: "فريق البيان" },
    { id: "team_3", name: "فريق التبيان" },
    { id: "team_4", name: "فريق الهدى" }
  ];

  const bracket = initTournamentBracket(teams);

  await t.test("تهيئة دور المربع الذهبي (نصف النهائي) لـ 4 فرق", () => {
    assert.equal(bracket.rounds.length, 1);
    assert.equal(bracket.rounds[0].isSemiFinal, true);
    assert.equal(bracket.rounds[0].isGrandFinal, false);
    assert.equal(bracket.rounds[0].pendingTeamIds.length, 4);
    assert.equal(bracket.isFinished, false);
  });

  await t.test("المباراة 1 بنصف النهائي: فوز فريق 1 وخسارة فريق 2", () => {
    const res = simulateTournamentMatchFinished(bracket, teams[0], teams[1], 15, 10);
    assert.equal(res.status, "round_ongoing");
    assert.equal(bracket.isFinished, false);
    assert.equal(bracket.rounds[0].pendingTeamIds.length, 2);
    assert.deepEqual(bracket.rounds[0].pendingTeamIds, ["team_3", "team_4"]);
  });

  await t.test("المباراة 2 بنصف النهائي: فوز فريق 3 وخسارة فريق 4 — يجب ألا يعتبر النهائي بل ينتقل لمباراة المركز الثالث", () => {
    const res = simulateTournamentMatchFinished(bracket, teams[2], teams[3], 20, 12);
    assert.equal(res.status, "semi_finals_completed_schedule_third_place");
    assert.equal(bracket.isFinished, false, "يجب ألا تنتهي البطولة عند انتهاء نصف النهائي");
    assert.equal(bracket.championTeam, null, "يجب ألا يتم تتويج بطل بعد مباراة نصف النهائي");
    
    // التحقق من أن الدور التالي هو مباراة تحديد المركز الثالث
    assert.equal(bracket.currentRoundName, "مباراة تحديد المركز الثالث (الميدالية البرونزية) 🥉");
    const round3rd = bracket.rounds[bracket.currentRoundIndex];
    assert.equal(round3rd.isThirdPlaceMatch, true);
    assert.equal(round3rd.isGrandFinal, false);
    // الفرق المتنافسة على المركز الثالث هي الخاسران (team_2 و team_4)
    assert.deepEqual(round3rd.pendingTeamIds, ["team_2", "team_4"]);
    // الفرق المتأهلة للنهائي هي (team_1 و team_3)
    assert.deepEqual(bracket.finalists, ["team_1", "team_3"]);
  });

  await t.test("مباراة تحديد المركز الثالث قبل النهائي: فوز فريق 2 وخسارة فريق 4", () => {
    const res = simulateTournamentMatchFinished(bracket, teams[1], teams[3], 18, 14);
    assert.equal(res.status, "third_place_completed");
    assert.equal(bracket.thirdPlaceTeam.id, "team_2");
    assert.equal(bracket.fourthPlaceTeam.id, "team_4");
    assert.equal(bracket.isFinished, false, "البطولة لم تنتهِ بعد، بقي النهائي الكبير");

    // التحقق من انتقال الشجرة تلقائياً للمباراة النهائية الكبرى
    assert.equal(bracket.currentRoundName, "المباراة النهائية الكبرى 🏆");
    const finalRound = bracket.rounds[bracket.currentRoundIndex];
    assert.equal(finalRound.isGrandFinal, true);
    assert.deepEqual(finalRound.pendingTeamIds, ["team_1", "team_3"]);
  });

  await t.test("المباراة النهائية الكبرى: فوز فريق 1 وتتويج الأبطال على منصة المراكز الأربعة", () => {
    const res = simulateTournamentMatchFinished(bracket, teams[0], teams[2], 25, 20);
    assert.equal(res.status, "tournament_finished");
    assert.equal(bracket.isFinished, true);
    assert.equal(bracket.championTeam.id, "team_1");
    assert.equal(bracket.runnerUpTeam.id, "team_2" !== "team_3" ? "team_3" : "team_2");

    // فحص ترتيب المنصة الكامل (الذهبية، الفضية، البرونزية، المركز الرابع)
    const standings = res.standings;
    assert.equal(standings.length, 4);
    assert.equal(standings[0].rank, 1);
    assert.equal(standings[0].team.id, "team_1");
    assert.equal(standings[1].rank, 2);
    assert.equal(standings[1].team.id, "team_3");
    assert.equal(standings[2].rank, 3);
    assert.equal(standings[2].team.id, "team_2");
    assert.equal(standings[3].rank, 4);
    assert.equal(standings[3].team.id, "team_4");
  });
});
