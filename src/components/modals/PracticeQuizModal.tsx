// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// نافذة التدريب الذاتي للطلاب (Student Self-Practice Modal)
// ========================================================

import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext.tsx";
import { Quiz, Question } from "../../types.ts";
import confetti from "canvas-confetti";

export const PracticeQuizModal: React.FC = () => {
  const { activeModal, closeModal, modalData } = useApp();

  const quiz = modalData as Quiz;

  const questions: Question[] = useMemo(() => {
    if (!quiz || !quiz.sections) return [];
    const list: Question[] = [];
    quiz.sections.forEach(s => {
      (s.questions || []).forEach(q => list.push({ ...q, sectionName: s.sectionName }));
    });
    return list;
  }, [quiz]);

  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState<boolean>(false);

  if (activeModal !== "practiceQuiz" || !quiz) return null;

  const currentQ = questions[currentIdx];

  const handleSelectOption = (idx: number) => {
    if (isAnswerChecked) return;
    setSelectedAnswer(idx);
    setIsAnswerChecked(true);

    if (idx === currentQ?.correct) {
      setScore(prev => prev + (currentQ?.points || 5));
      try {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      } catch (e) {}
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerChecked(false);
    } else {
      setIsFinished(true);
      try {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      } catch (e) {}
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setScore(0);
    setIsFinished(false);
    setSelectedAnswer(null);
    setIsAnswerChecked(false);
  };

  return (
    <div className="modal-overlay">
      <div className="duo-modal-box">
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-dumbbell" style={{ color: "var(--duo-blue)" }}></i>
            التدريب الذاتي: {quiz.title}
          </h3>
          <button type="button" className="btn-modal-close" onClick={closeModal}>&times;</button>
        </div>

        {!isFinished && currentQ ? (
          <div style={{ padding: "16px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", fontSize: "13px", fontWeight: 800, color: "#64748b" }}>
              <span>السؤال {currentIdx + 1} من {questions.length} • {currentQ.sectionName}</span>
              <span style={{ color: "var(--duo-green)" }}>النقاط: {score}</span>
            </div>

            <div className={`question-text-content font-${currentQ.font || 'quran'}`} style={{ marginBottom: "20px" }}>
              {currentQ.text}
            </div>

            {currentQ.targetOral && (
              <div style={{ fontSize: "22px", color: "var(--duo-green)", textAlign: "center", margin: "14px 0", fontWeight: 900 }}>
                {currentQ.targetOral}
              </div>
            )}

            {currentQ.options && (
              <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
                {currentQ.options.map((opt, optIdx) => {
                  let btnClass = "btn-choice-duo";
                  if (isAnswerChecked) {
                    if (optIdx === currentQ.correct) {
                      btnClass += " correct";
                    } else if (optIdx === selectedAnswer) {
                      btnClass += " wrong";
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      className={btnClass}
                      onClick={() => handleSelectOption(optIdx)}
                      disabled={isAnswerChecked}
                      style={{
                        background: isAnswerChecked && optIdx === currentQ.correct ? "#dcfce7" : isAnswerChecked && optIdx === selectedAnswer ? "#fee2e2" : undefined,
                        borderColor: isAnswerChecked && optIdx === currentQ.correct ? "#22c55e" : isAnswerChecked && optIdx === selectedAnswer ? "#ef4444" : undefined
                      }}
                    >
                      <span className="choice-letter">{String.fromCharCode(65 + optIdx)}</span>
                      <span className="choice-text">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {isAnswerChecked && (
              <div style={{ marginTop: "20px", textAlign: "center" }}>
                <button
                  type="button"
                  className="btn-duo-green"
                  onClick={handleNext}
                >
                  {currentIdx + 1 < questions.length ? "السؤال التالي" : "عرض نتيجتي النهائية"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "30px 10px" }}>
            <div style={{ fontSize: "56px", color: "#eab308", marginBottom: "14px" }}>
              <i className="fa-solid fa-award"></i>
            </div>
            <h3 style={{ fontSize: "22px", fontWeight: 900, color: "#0f172a", margin: "0 0 10px" }}>
              أحسنت يا بطل! اكتمل التدريب بنجاح
            </h3>
            <p style={{ fontSize: "16px", color: "#64748b", margin: "0 0 20px" }}>
              مجموع درجاتك في هذا التدريب: <strong style={{ color: "#ca8a04", fontSize: "22px" }}>{score}</strong> نقطة
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button type="button" className="btn-duo-yellow" onClick={handleRestart}>
                <i className="fa-solid fa-rotate-right"></i> إعادة التدريب
              </button>
              <button type="button" className="btn-duo-green" onClick={closeModal}>
                إتمام وإنهاء
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
