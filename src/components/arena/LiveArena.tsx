// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// مسرح المسابقات الحية والبطولات التفاعلية المباشرة (Live Arena & Tournament System)
// مع حل مشكلة تعليق لافتة الفقرة والمزامنة اللحظية الشاملة لجميع الأجهزة
// ========================================================

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useApp } from "../../context/AppContext.tsx";
import { Question, TournamentTeam, LiveRoom } from "../../types.ts";
import { calculateQuestionScore, recordAnswerIdempotent } from "../../../scoring-engine.js";
import { isSupervisor, normalizeArabic, shuffleArray } from "../../utils/arabic.ts";
import confetti from "canvas-confetti";

export const TEAM_ROUNDS_CONFIG: Record<number, { name: string; tag: string; icon: string; rule: string }> = {
  1: {
    name: "المواجهة السريعة",
    tag: "الفقرة الأولى",
    icon: "fa-bolt",
    rule: "مواجهة سريعة في الحروف والتهجي وتطبيق الأحكام الأساسية."
  },
  2: {
    name: "تحدي الإتقان والتجويد",
    tag: "الفقرة الثانية",
    icon: "fa-star-half-stroke",
    rule: "تلاوة شفهية وتقييم دقيق من لجنة المعلمين لأحكام النون والتنوين والمدود."
  },
  3: {
    name: "سباق الذكاء والترتيب",
    tag: "الفقرة الثالثة",
    icon: "fa-arrow-down-short-wide",
    rule: "ترتيب الكلمات القرآنية وتوصيل أحكام التجويد بأمثلتها الصحيحة."
  },
  4: {
    name: "الجولة الحاسمة والتتويج",
    tag: "الفقرة الرابعة والأخيرة",
    icon: "fa-trophy",
    rule: "الأسئلة الذهبية الفاصلة لتحديد بطل البطولة ومنصة التتويج."
  }
};

export const LiveArena: React.FC = () => {
  const {
    activeRoom,
    updateLiveRoom,
    exitLiveRoom,
    currentUser,
    quizzes,
    participants,
    openModal,
    archiveTournament,
    showToast
  } = useApp();

  const isSup = currentUser && (
    currentUser.role === "supervisor" || 
    isSupervisor(currentUser.name, participants) || 
    currentUser.name === activeRoom?.leaderName
  );

  // حالة المؤقت
  const [timerSeconds, setTimerSeconds] = useState<number>(30);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const timerIntervalRef = useRef<any>(null);

  // حالة أنيميشن النتيجة
  const [resultOverlay, setResultOverlay] = useState<{
    show: boolean;
    isCorrect: boolean;
    points: number;
    title: string;
  } | null>(null);

  // تقييم المعلمين الشفهي
  const [oralRating, setOralRating] = useState<number>(5);

  // إجابات الترتيب والتوصيل
  const [orderingItems, setOrderingItems] = useState<string[]>([]);
  const [matchingSelectedLeft, setMatchingSelectedLeft] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({});

  // --------------------------------------------------------
  // ضمان وجود قائمة أسئلة كاملة وموزعة للغرفة
  // --------------------------------------------------------
  const roomQuestions: Question[] = useMemo(() => {
    if (activeRoom?.questions && activeRoom.questions.length > 0) {
      return activeRoom.questions;
    }
    // استخدام اختبار الغرفة المحدد
    const quiz = quizzes.find(q => q.id === activeRoom?.quizId) || quizzes[0];
    const qList: Question[] = [];
    quiz?.sections?.forEach(s => {
      s.questions?.forEach(q => {
        qList.push({ ...q, sectionName: s.sectionName });
      });
    });

    if (qList.length === 0) {
      return [
        { type: "mcq", font: "quran", text: "ما حركة حرف الميم في: عَمِلَ؟", options: ["فتحة (مَ)", "كسرة (مِ)", "ضمة (مُ)", "سكون (مْ)"], correct: 1, points: 5 },
        { type: "oral", font: "quran", text: "اقرأ الكلمات الآتية مع ضبط حركة الفتح: كَتَبَ - بَلَغَ - وَجَدَ", points: 5 },
        { type: "ordering", font: "quran", text: "رتب الحروف لتكوين الكلمة: [قَ - لَ - مَ]", items: ["قَ", "لَ", "مَ"], points: 5 },
        { type: "matching", font: "amiri", text: "صل بين الكلمة ونوع المد المناسب:", pairs: [["جَاءَ", "مد متصل"], ["قَالَ", "مد طبيعي"]], points: 5 }
      ];
    }

    // تكرار الأسئلة لضمان وجود 8 أسئلة على الأقل للبطولات (سؤالان لكل فقرة على الأقل)
    let expanded = [...qList];
    while (expanded.length < 8) {
      expanded = [...expanded, ...qList];
    }
    return expanded;
  }, [activeRoom?.questions, activeRoom?.quizId, quizzes]);

  // حساب أسئلة الفقرة الحالية في بطولة الفرق
  const currentTeamRound = activeRoom?.tournamentRound || 1;
  const questionsPerRound = Math.max(2, Math.floor(roomQuestions.length / 4));
  const roundQuestions = useMemo(() => {
    const startIdx = (currentTeamRound - 1) * questionsPerRound;
    return roomQuestions.slice(startIdx, startIdx + questionsPerRound);
  }, [roomQuestions, currentTeamRound, questionsPerRound]);

  // السؤال الحالي المعروض
  const currentQuestionIdx = activeRoom?.currentQuestionIdx || 0;
  const currentQuestion: Question | undefined = useMemo(() => {
    if (activeRoom?.type === "tournament") {
      return roundQuestions[currentQuestionIdx % roundQuestions.length];
    }
    return roomQuestions[currentQuestionIdx % roomQuestions.length];
  }, [activeRoom?.type, roundQuestions, roomQuestions, currentQuestionIdx]);

  // إعادة ضبط الترتيب والتوصيل عند تغير السؤال
  useEffect(() => {
    if (currentQuestion?.type === "ordering" && currentQuestion.items) {
      setOrderingItems(shuffleArray(currentQuestion.items));
    } else {
      setOrderingItems([]);
    }
    setMatchedPairs({});
    setMatchingSelectedLeft(null);
  }, [currentQuestion]);

  // --------------------------------------------------------
  // تشغيل وإدارة المؤقت اللحظي
  // --------------------------------------------------------
  useEffect(() => {
    if (!activeRoom || activeRoom.status !== "active") return;
    if (activeRoom.isTimerPaused || isTimerPaused) {
      clearInterval(timerIntervalRef.current);
      return;
    }

    // إيقاف المؤقت إذا كانت لافتة الفقرة معروضة
    if (activeRoom.type === "tournament" && !activeRoom.teamRoundStarted) {
      clearInterval(timerIntervalRef.current);
      return;
    }

    clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [activeRoom?.status, activeRoom?.isTimerPaused, activeRoom?.teamRoundStarted, isTimerPaused]);

  // إعادة ضبط المؤقت عند تغير السؤال
  useEffect(() => {
    setTimerSeconds(activeRoom?.initialTimerSeconds || 30);
  }, [currentQuestionIdx, currentTeamRound]);

  // انتهاء الوقت
  const handleTimeOut = () => {
    if (!isSup || !currentQuestion) return;
    const scoreRes = calculateQuestionScore({
      question: currentQuestion,
      isCorrect: false,
      isTimeout: true,
      activeEffects: activeRoom?.activeEffects || []
    });

    setResultOverlay({
      show: true,
      isCorrect: false,
      points: scoreRes.netPoints,
      title: "انتهى الوقت المحدد للسؤال!"
    });

    setTimeout(() => {
      setResultOverlay(null);
      handleNextQuestion();
    }, 2500);
  };

  // --------------------------------------------------------
  // بدء المسابقة من المشرف
  // --------------------------------------------------------
  const handleStartContestFromLobby = async () => {
    if (!activeRoom) return;

    if (activeRoom.type === "tournament") {
      // بطولة فرق: التحقق من وجود فريقين
      let matchTeams = activeRoom.teams || [];
      if (matchTeams.length < 2) {
        // إنشاء فريقين افتراضيين إذا لم يتم تعيينهم
        matchTeams = [
          { id: "team_a", name: "فريق الإيمان", color: "#3b82f6", members: participants.slice(0, 3).map(p => ({ id: p.id, name: p.name })), score: 0 },
          { id: "team_b", name: "فريق النور", color: "#22c55e", members: participants.slice(3, 6).map(p => ({ id: p.id, name: p.name })), score: 0 }
        ];
      }

      const updated: LiveRoom = {
        ...activeRoom,
        status: "active",
        teams: matchTeams,
        tournamentRound: 1,
        teamRoundStarted: false, // تُعرض لافتة الفقرة الأولى للمشرف والجميع
        currentQuestionIdx: 0,
        questions: roomQuestions,
        currentTeamIdx: 0,
        currentStudentIdxInTeam: { [matchTeams[0].id]: 0, [matchTeams[1].id]: 0 }
      };
      await updateLiveRoom(updated);
      showToast("انطلقت بطولة الفرق! لافتة الفقرة الأولى معروضة الآن", "fa-play");
    } else {
      // مسابقة فردية
      const firstStudent = participants.find(p => p.role === "student") || {
        id: "std_1",
        name: "المتسابق الأول",
        school: "مدرسة نور البيان",
        grade: "صف أول",
        totalScore: 0
      };

      const updated: LiveRoom = {
        ...activeRoom,
        status: "active",
        contestantId: firstStudent.id,
        contestantName: firstStudent.name,
        contestantSchool: firstStudent.school,
        contestantGrade: firstStudent.grade,
        contestantInitialBaseScore: firstStudent.totalScore || 0,
        contestantScore: 0,
        currentQuestionIdx: 0,
        questions: roomQuestions
      };
      await updateLiveRoom(updated);
      showToast("بدأت المسابقة الحية للمتسابق بنجاح!", "fa-play");
    }
  };

  // --------------------------------------------------------
  // المشرف يضغط "ابدأ الفقرة الآن" في بطولة الفرق (حل المشكلة الجذري)
  // --------------------------------------------------------
  const handleStartTeamRoundNow = async () => {
    if (!activeRoom || !isSup) return;

    const teamA = activeRoom.teams?.[0] || { id: "team_a", name: "الفريق الأول", members: [], score: 0, color: "#3b82f6" };
    const memberName = teamA.members?.[0]?.name || "طالب الفريق";

    // تحديث الغرفة لبدء الفقرة وعرض السؤال الأول فوراً دون أي تعليق أو تكرار
    const updated: LiveRoom = {
      ...activeRoom,
      teamRoundStarted: true, // إخفاء اللافتة وتفعيل بطاقة السؤال
      currentQuestionIdx: 0,
      contestantName: memberName,
      contestantSchool: teamA.name,
      currentTeamIdx: 0,
      isTimerPaused: false
    };

    setTimerSeconds(activeRoom.initialTimerSeconds || 30);
    setIsTimerPaused(false);
    await updateLiveRoom(updated);
    showToast(`انطلقت ${TEAM_ROUNDS_CONFIG[currentTeamRound]?.name}!`, "fa-bolt");
  };

  // --------------------------------------------------------
  // معالجة إجابة السؤال (MCQ, Oral, Ordering, Matching)
  // --------------------------------------------------------
  const handleAnswerSubmit = async (isCorrect: boolean, chosenIdx: number | null = null) => {
    if (!activeRoom || !currentQuestion) return;

    const scoreRes = calculateQuestionScore({
      question: currentQuestion,
      isCorrect,
      isTimeout: false,
      activeEffects: activeRoom.activeEffects || [],
      elapsedSec: (activeRoom.initialTimerSeconds || 30) - timerSeconds,
      qDuration: activeRoom.initialTimerSeconds || 30
    });

    // تسجيل الإجابة ذرية في سجل إجابات الغرفة
    const recordResult = recordAnswerIdempotent(activeRoom, {
      questionIdx: currentQuestionIdx,
      isCorrect,
      basePoints: scoreRes.basePoints,
      cardBonus: scoreRes.cardBonus,
      penalty: scoreRes.penalty,
      netPoints: scoreRes.netPoints,
      chosenChoiceIdx: chosenIdx,
      answeredBy: activeRoom.contestantName || currentUser?.name || "المتسابق"
    });

    // تحديث نقاط الفريق إذا كانت بطولة فرق
    if (activeRoom.type === "tournament" && activeRoom.teams) {
      const curTeamIdx = activeRoom.currentTeamIdx || 0;
      const targetTeam = activeRoom.teams[curTeamIdx];
      if (targetTeam) {
        targetTeam.score = Math.max(0, targetTeam.score + scoreRes.netPoints);
      }
    }

    // إظهار أنيميشن النتيجة
    setResultOverlay({
      show: true,
      isCorrect,
      points: scoreRes.netPoints,
      title: isCorrect ? "إجابة صحيحة ومتقنة! ما شاء الله" : "إجابة غير صحيحة، حظاً أوفر في السؤال القادم"
    });

    if (isCorrect) {
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch (e) {}
    }

    await updateLiveRoom(recordResult.room);

    setTimeout(() => {
      setResultOverlay(null);
      handleNextQuestion();
    }, 2200);
  };

  // --------------------------------------------------------
  // الانتقال للسؤال التالي أو الفقرة التالية
  // --------------------------------------------------------
  const handleNextQuestion = async () => {
    if (!activeRoom) return;

    if (activeRoom.type === "tournament") {
      const nextQIdx = currentQuestionIdx + 1;
      const countInThisRound = roundQuestions.length;

      if (nextQIdx < countInThisRound) {
        // السؤال التالي في نفس الفقرة -> تبديل الفريق المستهدف بالتناوب
        const nextTeamIdx = (activeRoom.currentTeamIdx === 0) ? 1 : 0;
        const nextTeam = activeRoom.teams?.[nextTeamIdx] || activeRoom.teams?.[0];

        // اختيار الطالب التالي من الفريق بعدالة
        const studentsTurnMap = activeRoom.currentStudentIdxInTeam || {};
        const teamStudentIdx = (studentsTurnMap[nextTeam.id] || 0) % (nextTeam.members?.length || 1);
        const nextStudent = nextTeam.members?.[teamStudentIdx]?.name || "طالب الفريق";
        studentsTurnMap[nextTeam.id] = teamStudentIdx + 1;

        const updated: LiveRoom = {
          ...activeRoom,
          currentQuestionIdx: nextQIdx,
          currentTeamIdx: nextTeamIdx,
          contestantName: nextStudent,
          contestantSchool: nextTeam.name,
          currentStudentIdxInTeam: studentsTurnMap
        };
        await updateLiveRoom(updated);
      } else {
        // انتهت أسئلة هذه الفقرة!
        if (currentTeamRound < 4) {
          // الانتقال للفقرة التالية (عرض لافتة الفقرة 2 أو 3 أو 4)
          const nextRound = currentTeamRound + 1;
          const updated: LiveRoom = {
            ...activeRoom,
            tournamentRound: nextRound,
            teamRoundStarted: false, // لافتة الفقرة تظهر للمشرف للضغط على ابدأ
            currentQuestionIdx: 0,
            currentTeamIdx: 0
          };
          await updateLiveRoom(updated);
          showToast(`اكتملت الفقرة! في انتظار بدء ${TEAM_ROUNDS_CONFIG[nextRound]?.name}`, "fa-forward");
        } else {
          // انتهت البطولة بالكامل! إعلان الفائز وحفل التتويج
          const sortedTeams = [...(activeRoom.teams || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
          const winner = sortedTeams[0];
          const runnerUp = sortedTeams[1];

          const archiveItem = {
            id: `tour_${Date.now()}`,
            roomTitle: activeRoom.title,
            supervisorName: activeRoom.leaderName,
            archivedAt: new Date().toISOString(),
            winnerTeam: { name: winner?.name || "الفريق الفائز", score: winner?.score || 0, members: winner?.members ? winner.members.map(m => m.name) : [] },
            runnerUpTeam: { name: runnerUp?.name || "الوصيف", score: runnerUp?.score || 0, members: runnerUp?.members ? runnerUp.members.map(m => m.name) : [] },
            standings: sortedTeams.map((t, idx) => ({ rank: idx + 1, name: t.name, score: t.score })),
            teamsCount: sortedTeams.length,
            roundsCount: 4
          };

          await archiveTournament(archiveItem);

          const updated: LiveRoom = {
            ...activeRoom,
            status: "finished"
          };
          await updateLiveRoom(updated);

          try {
            confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
          } catch (e) {}

          openModal("grandFinale", archiveItem);
        }
      }
    } else {
      // مسابقة فردية
      const nextQIdx = currentQuestionIdx + 1;
      if (nextQIdx < roomQuestions.length) {
        const updated: LiveRoom = {
          ...activeRoom,
          currentQuestionIdx: nextQIdx
        };
        await updateLiveRoom(updated);
      } else {
        showToast("اكتملت جميع أسئلة المسابقة للمتسابق الحالي!", "fa-trophy");
      }
    }
  };

  if (!activeRoom) {
    return (
      <div style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>
        لا توجد غرفة نشطة حالياً.
        <br />
        <button className="btn-duo-green" style={{ marginTop: "15px" }} onClick={exitLiveRoom}>
          الرجوع للمنصة
        </button>
      </div>
    );
  }

  return (
    <section id="liveArenaSection" className="view-section active">
      <div className="live-arena-wrapper">
        
        {/* هيدر غرفة المسابقة */}
        <div className="arena-top-bar">
          <div className="room-info-pill">
            <span className="room-dot online"></span>
            <span className="room-name-text">{activeRoom.title}</span>
            <span className="room-code-tag">#{activeRoom.code}</span>
          </div>

          <div className="arena-role-status">
            <div className="arena-connected-counter-badge" title="المتواجدون حالياً">
              <i className="fa-solid fa-users" style={{ color: "var(--duo-blue)" }}></i>
              <span>المتواجدون: <strong>{activeRoom.connectedUsers?.length || 1}</strong></span>
            </div>

            <span className="role-pill-live">
              {isSup ? "مشرف الغرفة" : currentUser?.role === "teacher" ? "معلم تحكيم" : currentUser?.role === "presenter" ? "شاشة المسرح" : "متسابق"}
            </span>

            <button
              type="button"
              className="btn-duo-outline btn-sm"
              style={{ borderColor: "#ff4b4b", color: "#ff4b4b" }}
              onClick={exitLiveRoom}
            >
              <i className="fa-solid fa-person-walking-arrow-right"></i> مغادرة
            </button>
          </div>
        </div>

        {/* ═══ 1. وضع الانتظار (Lobby) ═══ */}
        {activeRoom.status === "lobby" && (
          <div className="arena-lobby-card">
            <div className="lobby-header">
              <div className="lobby-icon"><i className="fa-solid fa-users-line"></i></div>
              <h2>غرفة انتظار المتسابقين والمعلمين</h2>
              <p>في انتظار اكتمال انضمام المشاركين لبدء المسابقة الحية</p>
            </div>

            <div className="lobby-leadership-box">
              <div className="leader-badge">
                <i className="fa-solid fa-crown"></i> مشرف الغرفة المعتمد:
              </div>
              <strong>{activeRoom.leaderName}</strong>
              <span className="leader-rule-hint">
                (رمز الدخول المباشر للحضور: <strong style={{ color: "var(--duo-blue)" }}>{activeRoom.code}</strong>)
              </span>
            </div>

            <div className="lobby-users-header">
              <h4>
                <i className="fa-solid fa-users"></i> المتواجدون حالياً ({activeRoom.connectedUsers?.length || 1}):
              </h4>
              <span className="live-realtime-indicator">
                <span className="pulse-dot-green"></span> تحديث فوري مباشر
              </span>
            </div>

            <div className="connected-users-grid" style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", margin: "14px 0" }}>
              {(activeRoom.connectedUsers || []).map((u, i) => (
                <div key={i} style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="fa-solid fa-user"></i>
                  </div>
                  <div>
                    <strong style={{ fontSize: "13.5px", color: "#1e293b" }}>{u.name}</strong>
                    <div style={{ fontSize: "11.5px", color: "#64748b" }}>{u.role}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lobby-action-box">
              {isSup ? (
                <button
                  type="button"
                  className="btn-duo-green btn-lg"
                  onClick={handleStartContestFromLobby}
                >
                  <i className="fa-solid fa-play"></i> بدء المسابقة الآن
                </button>
              ) : (
                <div className="lobby-waiting-box">
                  <i className="fa-solid fa-hourglass-half fa-spin" style={{ color: "#ca8a04" }}></i>
                  <span>في انتظار إشارة البدء من المشرف (<strong>{activeRoom.leaderName}</strong>)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ 2. مسرح المسابقة الحي النشط ═══ */}
        {activeRoom.status === "active" && (
          <div className="arena-stage-card">

            {/* لافتة الفقرة لبطولات الفرق (التي كانت تسبب التكرار وتم حلها الآن) */}
            {activeRoom.type === "tournament" && !activeRoom.teamRoundStarted && (
              <div
                className="team-round-banner-overlay"
                style={{
                  background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
                  border: "3px solid #818cf8",
                  borderRadius: "24px",
                  padding: "36px 24px",
                  textAlign: "center",
                  color: "#ffffff",
                  boxShadow: "0 20px 40px rgba(49, 46, 129, 0.4)",
                  marginBottom: "24px"
                }}
              >
                <div style={{
                  display: "inline-block",
                  background: "#4338ca",
                  color: "#e0e7ff",
                  padding: "6px 18px",
                  borderRadius: "20px",
                  fontWeight: 900,
                  fontSize: "14px",
                  marginBottom: "14px"
                }}>
                  {TEAM_ROUNDS_CONFIG[currentTeamRound]?.tag}
                </div>

                <h2 style={{ fontSize: "28px", fontWeight: 900, margin: "0 0 10px", color: "#facc15" }}>
                  <i className={`fa-solid ${TEAM_ROUNDS_CONFIG[currentTeamRound]?.icon}`} style={{ marginLeft: "10px" }}></i>
                  {TEAM_ROUNDS_CONFIG[currentTeamRound]?.name}
                </h2>

                <p style={{ fontSize: "16px", color: "#c7d2fe", maxWidth: "600px", margin: "0 auto 24px", lineHeight: 1.6, fontWeight: 700 }}>
                  {TEAM_ROUNDS_CONFIG[currentTeamRound]?.rule}
                </p>

                {isSup ? (
                  <button
                    type="button"
                    className="btn-duo-green btn-lg"
                    onClick={handleStartTeamRoundNow}
                    style={{ fontSize: "18px", padding: "14px 36px", boxShadow: "0 6px 20px rgba(34, 197, 94, 0.4)" }}
                  >
                    <i className="fa-solid fa-play"></i> التالي: بدء {TEAM_ROUNDS_CONFIG[currentTeamRound]?.name}
                  </button>
                ) : (
                  <div style={{ background: "rgba(255, 255, 255, 0.1)", borderRadius: "14px", padding: "12px 24px", display: "inline-flex", alignItems: "center", gap: "10px", color: "#fef08a", fontWeight: 800 }}>
                    <i className="fa-solid fa-hourglass-half fa-spin"></i>
                    <span>في انتظار بدء الفقرة من مشرف الجلسة ({activeRoom.leaderName})...</span>
                  </div>
                )}
              </div>
            )}

            {/* بنر المتسابق والفريق الحالي */}
            <div className="current-contestant-banner">
              <div className="contestant-avatar">
                <i className="fa-solid fa-user-graduate"></i>
              </div>

              <div className="contestant-details">
                <span className="badge-active-contestant">
                  {activeRoom.type === "tournament" ? "دور الفريق المستهدف" : "المتسابق الحالي"}
                </span>
                <h2>{activeRoom.contestantName || "جاري تحديد المتسابق..."}</h2>
                <div className="contestant-meta">
                  <span><i className="fa-solid fa-school"></i> {activeRoom.contestantSchool || "--"}</span>
                  {activeRoom.type === "tournament" && (
                    <span style={{ color: "#ca8a04", fontWeight: 900 }}>
                      <i className="fa-solid fa-flag"></i> {TEAM_ROUNDS_CONFIG[currentTeamRound]?.name}
                    </span>
                  )}
                </div>
              </div>

              {/* بطاقات نتائج الفريقين إذا كانت بطولة */}
              {activeRoom.type === "tournament" && activeRoom.teams && (
                <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "center", flexWrap: "wrap", width: "100%" }}>
                  {activeRoom.teams.map((t, idx) => (
                    <div
                      key={t.id}
                      style={{
                        background: activeRoom.currentTeamIdx === idx ? "#fefce8" : "#ffffff",
                        border: activeRoom.currentTeamIdx === idx ? "2.5px solid #eab308" : "1.5px solid #cbd5e1",
                        borderRadius: "14px",
                        padding: "8px 16px",
                        textAlign: "center",
                        flex: "1 1 120px",
                        minWidth: "110px"
                      }}
                    >
                      <div style={{ fontSize: "12px", fontWeight: 800, color: "#64748b" }}>{t.name}</div>
                      <div style={{ fontSize: "20px", fontWeight: 900, color: "#ca8a04" }}>{t.score || 0} ن</div>
                    </div>
                  ))}
                </div>
              )}

              {/* نقاط المتسابق الفردي */}
              {activeRoom.type === "individual" && (
                <div className="contestant-banner-hud">
                  <div className="contestant-score-box">
                    <span className="score-label">مجموع النقاط</span>
                    <span className="score-number">{activeRoom.contestantScore || 0}</span>
                    <span className="score-sub">نقطة</span>
                  </div>
                </div>
              )}

              {/* زر محفظة البطاقات التكتيكية */}
              <div
                className="contestant-cards-wallet-trigger"
                onClick={() => openModal("tacticalWallet", { room: activeRoom, currentQuestion })}
                title="افتح محفظة البطاقات التكتيكية الـ 40"
              >
                <div className="wallet-badge-red">{activeRoom.activeEffects?.length || 0}</div>
                <div className="wallet-card-inner">
                  <div className="wallet-card-icon"><i className="fa-solid fa-layer-group"></i></div>
                  <div className="wallet-card-texts">
                    <div className="wallet-card-text">محفظة البطاقات</div>
                    <div className="wallet-card-hint">انقر للاستخدام</div>
                  </div>
                </div>
              </div>
            </div>

            {/* أدوات تحكم المشرف */}
            {isSup && (
              <div className="supervisor-controls-panel">
                <div className="ctrl-group">
                  <button
                    type="button"
                    className="btn-duo-green btn-sm"
                    onClick={handleNextQuestion}
                  >
                    <i className="fa-solid fa-forward-step"></i> تخطي / السؤال التالي
                  </button>
                  <button
                    type="button"
                    className="btn-duo-purple btn-sm"
                    onClick={() => openModal("tacticalWallet", { room: activeRoom, currentQuestion })}
                  >
                    <i className="fa-solid fa-bolt"></i> تفعيل بطاقة تكتيكية
                  </button>
                  <button
                    type="button"
                    className="btn-timer-ctrl"
                    onClick={() => setIsTimerPaused(!isTimerPaused)}
                    style={{ background: "#ffffff", border: "1.5px solid #cbd5e1", borderRadius: "14px", padding: "6px 12px", fontWeight: 800, cursor: "pointer" }}
                  >
                    <i className={`fa-solid ${isTimerPaused ? "fa-play" : "fa-pause"}`}></i>
                    <span style={{ marginRight: "6px" }}>{isTimerPaused ? "استئناف المؤقت" : "إيقاف المؤقت"}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-timer-ctrl"
                    onClick={() => setTimerSeconds(prev => prev + 15)}
                    style={{ background: "#ffffff", border: "1.5px solid #cbd5e1", borderRadius: "14px", padding: "6px 12px", fontWeight: 800, color: "#16a34a", cursor: "pointer" }}
                  >
                    <i className="fa-solid fa-plus"></i> 15 ثانية
                  </button>
                </div>
              </div>
            )}

            {/* بطاقة السؤال النشط (تظهر فقط بعد بدء الفقرة أو في الفردي) */}
            {(activeRoom.type !== "tournament" || activeRoom.teamRoundStarted) && currentQuestion && (
              <div className="stage-question-card">
                
                {/* شريط البطاقات النشطة */}
                {activeRoom.activeEffects && activeRoom.activeEffects.length > 0 && (
                  <div className="purple-active-cards-bar">
                    <span style={{ fontWeight: 900 }}><i className="fa-solid fa-bolt"></i> بطاقات نشطة:</span>
                    {activeRoom.activeEffects.map((eff, i) => (
                      <span key={i} className="active-card-pill">
                        #{eff.cardId} {eff.title}
                      </span>
                    ))}
                  </div>
                )}

                {/* غطاء أنيميشن النتيجة الكبير */}
                {resultOverlay && resultOverlay.show && (
                  <div className="question-result-overlay">
                    <div className="result-badge-anim-wrap">
                      <div className="result-badge-icon">
                        <i className={`fa-solid ${resultOverlay.isCorrect ? "fa-circle-check" : "fa-circle-xmark"}`} style={{ color: resultOverlay.isCorrect ? "var(--duo-green)" : "var(--duo-red)" }}></i>
                      </div>
                      <div className="result-badge-title">{resultOverlay.title}</div>
                      <div className="result-badge-points">
                        {resultOverlay.points >= 0 ? `+${resultOverlay.points} نقاط` : `${resultOverlay.points} نقاط`}
                      </div>
                    </div>
                  </div>
                )}

                {/* شريط معلومات السؤال والمؤقت */}
                <div className="question-header-bar">
                  <span className="question-index-tag">
                    {activeRoom.type === "tournament"
                      ? `السؤال ${currentQuestionIdx + 1} من ${roundQuestions.length}`
                      : `السؤال ${currentQuestionIdx + 1} من ${roomQuestions.length}`}
                  </span>
                  <span className="question-section-name">
                    {currentQuestion.sectionName || "القسم العام"}
                  </span>
                  <div className="stage-timer-pill">
                    <i className="fa-solid fa-stopwatch"></i>
                    <span>{timerSeconds}</span> ثانية
                  </div>
                </div>

                {/* نص السؤال بالخط القرآني */}
                <div className="question-body">
                  <div className={`question-text-content font-${currentQuestion.font || 'quran'}`}>
                    {currentQuestion.text}
                  </div>

                  {currentQuestion.targetOral && (
                    <div style={{ fontSize: "24px", color: "var(--duo-green)", textAlign: "center", margin: "16px 0", fontWeight: 900 }}>
                      {currentQuestion.targetOral}
                    </div>
                  )}

                  {/* منطقة التفاعل: خيارات متعددة (MCQ) */}
                  {currentQuestion.type === "mcq" && currentQuestion.options && (
                    <div className="mcq-options-grid" style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: "20px" }}>
                      {currentQuestion.options.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          type="button"
                          className="btn-choice-duo"
                          onClick={() => handleAnswerSubmit(optIdx === currentQuestion.correct, optIdx)}
                        >
                          <span className="choice-letter">{String.fromCharCode(65 + optIdx)}</span>
                          <span className="choice-text">{opt}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* منطقة التفاعل: ترتيب (Ordering) */}
                  {currentQuestion.type === "ordering" && (
                    <div style={{ marginTop: "20px", textAlign: "center" }}>
                      <p style={{ color: "#64748b", fontWeight: 700, marginBottom: "12px" }}>
                        انقر على العناصر لترتيبها بالشكل الصحيح:
                      </p>
                      <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", marginBottom: "16px" }}>
                        {orderingItems.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: "#ffffff",
                              border: "2px solid var(--duo-blue)",
                              borderRadius: "14px",
                              padding: "10px 20px",
                              fontSize: "18px",
                              fontWeight: 900,
                              cursor: "pointer"
                            }}
                            onClick={() => {
                              // تبديل مع العنصر المجاور
                              if (idx < orderingItems.length - 1) {
                                const copy = [...orderingItems];
                                [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
                                setOrderingItems(copy);
                              }
                            }}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="btn-duo-green"
                        onClick={() => {
                          const isCorrect = JSON.stringify(orderingItems) === JSON.stringify(currentQuestion.items);
                          handleAnswerSubmit(isCorrect);
                        }}
                      >
                        اعتماد الترتيب
                      </button>
                    </div>
                  )}

                  {/* منطقة التفاعل: توصيل (Matching) */}
                  {currentQuestion.type === "matching" && currentQuestion.pairs && (
                    <div style={{ marginTop: "20px" }}>
                      <p style={{ textAlign: "center", color: "#64748b", fontWeight: 700, marginBottom: "12px" }}>
                        اختر الطرف الأيمن ثم الطرف المقابل له للتوصيل:
                      </p>
                      <div className="team-matching-grid" style={{ maxWidth: "600px", margin: "0 auto" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {currentQuestion.pairs.map((p, i) => (
                            <button
                              key={i}
                              type="button"
                              className="btn-choice-duo"
                              style={{
                                background: matchingSelectedLeft === p[0] ? "#e0f2fe" : matchedPairs[p[0]] ? "#f0fdf4" : undefined,
                                borderColor: matchingSelectedLeft === p[0] ? "var(--duo-blue)" : undefined
                              }}
                              onClick={() => setMatchingSelectedLeft(p[0])}
                            >
                              {p[0]}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {currentQuestion.pairs.map((p, i) => (
                            <button
                              key={i}
                              type="button"
                              className="btn-choice-duo"
                              style={{
                                background: Object.values(matchedPairs).includes(p[1]) ? "#f0fdf4" : undefined
                              }}
                              onClick={() => {
                                if (matchingSelectedLeft) {
                                  const updated = { ...matchedPairs, [matchingSelectedLeft]: p[1] };
                                  setMatchedPairs(updated);
                                  setMatchingSelectedLeft(null);
                                  if (Object.keys(updated).length === currentQuestion.pairs?.length) {
                                    const allRight = currentQuestion.pairs.every(pair => updated[pair[0]] === pair[1]);
                                    handleAnswerSubmit(allRight);
                                  }
                                }
                              }}
                            >
                              {p[1]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* منطقة التفاعل: تقييم المعلمين الشفهي (Oral) */}
                  {currentQuestion.type === "oral" && (
                    <div className="live-eval-box" style={{ marginTop: "24px" }}>
                      <div className="eval-header-flex">
                        <span><i className="fa-solid fa-star-half-stroke"></i> تقييم لجنة المعلمين الشفهي المباشر:</span>
                        <span className="eval-current-average">{oralRating} / 5</span>
                      </div>

                      <div className="teacher-voting-row">
                        <span className="vote-prompt">درجة التلاوة والإتقان:</span>
                        <div className="rating-buttons-group">
                          {[1, 2, 3, 4, 5].map(score => (
                            <button
                              key={score}
                              type="button"
                              className={`btn-rate-score ${oralRating === score ? "active" : ""}`}
                              onClick={() => setOralRating(score)}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>

                      {isSup && (
                        <div style={{ textAlign: "center", marginTop: "14px" }}>
                          <button
                            type="button"
                            className="btn-duo-green"
                            onClick={() => handleAnswerSubmit(oralRating >= 3)}
                          >
                            اعتماد تقييم التلاوة ({oralRating} درجات)
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </section>
  );
};
