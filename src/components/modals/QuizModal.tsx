// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// نوافذ إنشاء وتعديل الاختبارات يدوياً وبالذكاء الاصطناعي (Quiz Modals)
// ========================================================

import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext.tsx";
import { Quiz, QuizSection, Question } from "../../types.ts";
import { generateTestWithAI } from "../../../ai-service.js";

export const ManualQuizModal: React.FC = () => {
  const { activeModal, closeModal, modalData, addOrUpdateQuiz, grades } = useApp();

  const isEditing = !!(modalData && modalData.id);

  const [title, setTitle] = useState<string>("");
  const [targetGrade, setTargetGrade] = useState<string>("");
  const [allowPractice, setAllowPractice] = useState<boolean>(true);
  const [sections, setSections] = useState<QuizSection[]>([]);

  useEffect(() => {
    if (modalData) {
      setTitle(modalData.title || "");
      setTargetGrade(modalData.targetGrade || grades[0] || "صف أول");
      setAllowPractice(modalData.allowPractice !== false);
      setSections(modalData.sections || []);
    } else {
      setTitle("");
      setTargetGrade(grades[0] || "صف أول");
      setAllowPractice(true);
      setSections([
        {
          sectionName: "القسم الأول: الحروف والتهجي",
          questions: [
            { type: "oral", font: "quran", text: "اقرأ الكلمات الآتية مع ضبط حركة الفتح:", targetOral: "كَتَبَ - بَلَغَ - وَجَدَ", points: 5 },
            { type: "mcq", font: "quran", text: "ما حركة حرف الميم في كلمة: عَمِلَ؟", options: ["فتحة (مَ)", "كسرة (مِ)", "ضمة (مُ)", "سكون (مْ)"], correct: 1, points: 5 }
          ]
        }
      ]);
    }
  }, [modalData, grades]);

  if (activeModal !== "manualQuizModal") return null;

  const handleAddSection = () => {
    setSections(prev => [
      ...prev,
      {
        sectionName: `القسم ${prev.length + 1}`,
        questions: [
          { type: "mcq", font: "quran", text: "نص السؤال الجديد...", options: ["خيار 1", "خيار 2", "خيار 3", "خيار 4"], correct: 0, points: 5 }
        ]
      }
    ]);
  };

  const handleAddQuestionToSection = (sIdx: number) => {
    setSections(prev => {
      const copy = [...prev];
      copy[sIdx].questions.push({
        type: "mcq",
        font: "quran",
        text: "نص السؤال الجديد...",
        options: ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
        correct: 0,
        points: 5
      });
      return copy;
    });
  };

  const handleDeleteQuestion = (sIdx: number, qIdx: number) => {
    setSections(prev => {
      const copy = [...prev];
      copy[sIdx].questions = copy[sIdx].questions.filter((_, idx) => idx !== qIdx);
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const quizToSave: Quiz = {
      id: isEditing ? modalData.id : `quiz_${Date.now()}`,
      title: title.trim(),
      targetGrade,
      allowPractice,
      updatedAt: Date.now(),
      sections
    };

    await addOrUpdateQuiz(quizToSave);
    closeModal();
  };

  return (
    <div className="modal-overlay">
      <div className="duo-modal-box modal-wide" style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-book-quran"></i>
            {isEditing ? "تعديل الاختبار" : "إنشاء اختبار جديد يدوياً"}
          </h3>
          <button type="button" className="btn-modal-close" onClick={closeModal}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ overflowY: "auto", padding: "10px", flex: 1 }}>
          <div className="input-group">
            <label className="input-label">عنوان الاختبار <span className="required-star">*</span></label>
            <input
              type="text"
              className="form-control"
              placeholder="مثال: اختبار نور البيان - مستوى الحروف والمدود"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="input-group">
              <label className="input-label">الفئة / الصف المستهدف</label>
              <select
                className="form-control form-select"
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
              >
                {grades.map((g, i) => (
                  <option key={i} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="input-group" style={{ display: "flex", alignItems: "center", paddingTop: "25px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, color: "#166534", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={allowPractice}
                  onChange={(e) => setAllowPractice(e.target.checked)}
                />
                السماح بالتدريب الذاتي للطلاب
              </label>
            </div>
          </div>

          {/* الأقسام والأسئلة */}
          <div style={{ marginTop: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h4 style={{ margin: 0, fontWeight: 900, color: "#1e293b" }}>أقسام الاختبار والأسئلة</h4>
              <button type="button" className="btn-duo-blue btn-sm" onClick={handleAddSection}>
                <i className="fa-solid fa-plus"></i> إضافة قسم جديد
              </button>
            </div>

            {sections.map((sec, sIdx) => (
              <div key={sIdx} style={{ background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "16px", padding: "16px", marginBottom: "16px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="اسم القسم..."
                    value={sec.sectionName}
                    onChange={(e) => {
                      const copy = [...sections];
                      copy[sIdx].sectionName = e.target.value;
                      setSections(copy);
                    }}
                    style={{ fontWeight: 800 }}
                  />
                  <button
                    type="button"
                    className="btn-duo-outline btn-sm"
                    onClick={() => handleAddQuestionToSection(sIdx)}
                  >
                    <i className="fa-solid fa-plus"></i> سؤال
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {sec.questions.map((q, qIdx) => (
                    <div key={qIdx} style={{ background: "#ffffff", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--duo-blue)" }}>
                          السؤال {qIdx + 1} ({q.type})
                        </span>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <select
                            className="form-control form-select"
                            style={{ height: "32px", fontSize: "12px", width: "120px" }}
                            value={q.type}
                            onChange={(e) => {
                              const copy = [...sections];
                              copy[sIdx].questions[qIdx].type = e.target.value as any;
                              setSections(copy);
                            }}
                          >
                            <option value="mcq">اختيار من متعدد</option>
                            <option value="oral">تلاوة شفهية</option>
                            <option value="ordering">ترتيب</option>
                            <option value="matching">توصيل</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(sIdx, qIdx)}
                            style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        className="form-control"
                        placeholder="نص السؤال بالتشكيل القرآني..."
                        value={q.text}
                        onChange={(e) => {
                          const copy = [...sections];
                          copy[sIdx].questions[qIdx].text = e.target.value;
                          setSections(copy);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="modal-actions-flex" style={{ marginTop: "20px" }}>
            <button type="submit" className="btn-duo-green">
              <i className="fa-solid fa-check"></i> حفظ الاختبار
            </button>
            <button type="button" className="btn-duo-outline" onClick={closeModal}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const AIQuizModal: React.FC = () => {
  const { activeModal, closeModal, addOrUpdateQuiz, grades, showToast } = useApp();

  const [promptText, setPromptText] = useState<string>("");
  const [targetGrade, setTargetGrade] = useState<string>("");
  const [numQuestions, setNumQuestions] = useState<number>(6);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  useEffect(() => {
    setTargetGrade(grades[0] || "صف أول");
  }, [grades]);

  if (activeModal !== "aiQuizModal") return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;

    setIsGenerating(true);
    showToast("جاري توليد الاختبار بالذكاء الاصطناعي والمحرك المدمج...", "fa-wand-magic-sparkles fa-bounce");

    try {
      const generated = await generateTestWithAI({
        promptText: promptText.trim(),
        targetGrade,
        numQuestions
      });

      if (generated && generated.sections && generated.sections.length > 0) {
        const newQuiz: Quiz = {
          id: `quiz_ai_${Date.now()}`,
          title: generated.testTitle || `اختبار ذكي: ${promptText.slice(0, 30)}`,
          targetGrade,
          allowPractice: true,
          updatedAt: Date.now(),
          sections: generated.sections
        };
        await addOrUpdateQuiz(newQuiz);
        closeModal();
        showToast("تم توليد وحفظ الاختبار بنجاح!", "fa-wand-magic-sparkles");
      } else {
        showToast("تعذر توليد الاختبار، يرجى المحاولة بصياغة أخرى", "fa-circle-xmark", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ في التوليد", "fa-circle-xmark", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="duo-modal-box">
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-wand-magic-sparkles" style={{ color: "var(--duo-purple)" }}></i>
            توليد اختبار ذكي لنور البيان
          </h3>
          <button type="button" className="btn-modal-close" onClick={closeModal}>&times;</button>
        </div>

        <form onSubmit={handleGenerate} className="modal-body-form">
          <div className="input-group">
            <label className="input-label">ما هو موضوع الاختبار أو الآيات المقررة؟ <span className="required-star">*</span></label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="مثال: اختبار في أحكام النون الساكنة والتنوين مع أسئلة على الإقلاب والإخفاء وسورة الفلق..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div className="input-group">
              <label className="input-label">الصف / الفئة</label>
              <select
                className="form-control form-select"
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
              >
                {grades.map((g, i) => (
                  <option key={i} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">عدد الأسئلة</label>
              <select
                className="form-control form-select"
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
              >
                <option value={4}>4 أسئلة (سريعة)</option>
                <option value={6}>6 أسئلة (متوسطة)</option>
                <option value={8}>8 أسئلة (شاملة وموزعة)</option>
                <option value={10}>10 أسئلة (بطولة كاملة)</option>
              </select>
            </div>
          </div>

          <div className="modal-actions-flex" style={{ marginTop: "20px" }}>
            <button
              type="submit"
              className="btn-duo-purple"
              disabled={isGenerating}
            >
              <i className={`fa-solid ${isGenerating ? "fa-spinner fa-spin" : "fa-wand-magic-sparkles"}`}></i>
              {isGenerating ? "جاري التوليد الذكي..." : "توليد الاختبار فورياً"}
            </button>
            <button type="button" className="btn-duo-outline" onClick={closeModal}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
