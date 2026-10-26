// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// شاشة الدخول والتسجيل التفاعلية متعددة المراحل (Login & Onboarding Section)
// ========================================================

import React, { useState } from "react";
import { useApp } from "../context/AppContext.tsx";
import {
  countArabicNameParts,
  validateQuadrupleName,
  isSupervisor,
  isTeacher,
  isPresenter,
  normalizeArabic
} from "../utils/arabic.ts";

export const LoginSection: React.FC = () => {
  const {
    loginUser,
    schools,
    grades,
    participants,
    setCurrentView,
    showToast
  } = useApp();

  const [step, setStep] = useState<"name" | "school" | "grade">("name");
  const [fullName, setFullName] = useState<string>("");
  const [chosenSchool, setChosenSchool] = useState<string>("");
  const [chosenGrade, setChosenGrade] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const namePartsCount = countArabicNameParts(fullName);
  const progressPercent = Math.min(100, Math.round((namePartsCount / 4) * 100));

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const trimmed = fullName.trim();
    if (!trimmed) {
      setErrorMsg("يرجى كتابة الاسم للمتابعة.");
      return;
    }

    // فحص أدوار الإدارة أو المعلمين أو العارض
    if (isSupervisor(trimmed, participants) || isTeacher(trimmed) || isPresenter(trimmed)) {
      setIsSubmitting(true);
      try {
        await loginUser(trimmed);
      } catch (err: any) {
        setErrorMsg("حدث خطأ أثناء تسجيل الدخول: " + (err?.message || err));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // فحص ما إذا كان طالباً مسجلاً مسبقاً
    const norm = normalizeArabic(trimmed);
    const existing = participants.find(p => p.normalizedName === norm || normalizeArabic(p.name) === norm);
    if (existing) {
      setIsSubmitting(true);
      try {
        await loginUser(trimmed);
      } catch (err: any) {
        setErrorMsg("حدث خطأ أثناء تسجيل الدخول: " + (err?.message || err));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // طالب جديد يحتاج لاختيار المدرسة والصف
    const validation = validateQuadrupleName(trimmed);
    if (!validation.isQuadruple) {
      // تنبيه لطيف مع السماح بالمرور إذا كان الاسم ثلاثياً
      if (namePartsCount < 3) {
        setErrorMsg(validation.message);
        return;
      }
    }

    setStep("school");
  };

  const handleSelectSchool = (school: string) => {
    setChosenSchool(school);
    setStep("grade");
  };

  const handleSelectGrade = async (grade: string) => {
    setChosenGrade(grade);
    setIsSubmitting(true);
    try {
      await loginUser(fullName, chosenSchool, grade);
    } catch (err: any) {
      setErrorMsg("حدث خطأ أثناء تسجيل الحساب: " + (err?.message || err));
      showToast("تعذر إنشاء الحساب، يرجى المحاولة ثانية", "fa-circle-xmark", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="loginSection" className="view-section active">
      <div className="duo-card login-card">

        {/* الخطوة 1: كتابة الاسم */}
        {step === "name" && (
          <div className="login-step-panel active">
            <div className="card-header">
              <div className="header-icon">
                <i className="fa-solid fa-id-card"></i>
              </div>
              <h2 className="section-title">تسجيل الدخول للمسابقة</h2>
              <p className="section-subtitle">
                مسابقة نور البيان 1448 - 1449 هـ
              </p>
            </div>

            <div className="duo-instruction-box">
              <div className="instruction-icon">
                <i className="fa-solid fa-signature"></i>
              </div>
              <div className="instruction-text">
                يرجى كتابة الاسم الرباعي كاملاً (4 أسماء على الأقل) للمتابعة.
              </div>
            </div>

            <form onSubmit={handleNameSubmit} className="login-form">
              <div className="input-group">
                <label htmlFor="fullNameInput" className="input-label">
                  <i className="fa-solid fa-user-pen"></i> الاسم الكامل للمشارك <span className="required-star">* (إلزامي)</span>
                </label>

                <div className="name-progress-bar-container">
                  <div
                    className="name-progress-bar"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>

                <div className="input-wrapper">
                  <input
                    type="text"
                    id="fullNameInput"
                    className="form-control"
                    placeholder="اكتب اسمك هنا (مثال: أحمد محمد عبدالله إبراهيم)"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    autoFocus
                    required
                  />
                  <span className="input-badge" id="nameCountBadge">
                    {namePartsCount === 0
                      ? "اكتب اسمك"
                      : `${namePartsCount} / 4 أسماء`}
                  </span>
                </div>
                <p className="input-hint">
                  <i className="fa-solid fa-circle-info"></i> اكتب اسمك للدخول والمشاركة مباشرة في المسابقة (يُفضل الاسم الثلاثي أو الرباعي).
                </p>
              </div>

              {errorMsg && (
                <div className="duo-alert alert-error" style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "15px" }}>
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-duo-green"
                  disabled={isSubmitting}
                >
                  <span className="btn-text">
                    {isSubmitting ? "جاري التحقق والربط..." : "متابعة"}
                  </span>
                  <span className="btn-icon">
                    <i className="fa-solid fa-arrow-left"></i>
                  </span>
                </button>
                <button
                  type="button"
                  className="btn-duo-outline"
                  onClick={() => setCurrentView("hero")}
                >
                  رجوع للرئيسية
                </button>
              </div>
            </form>
          </div>
        )}

        {/* الخطوة 2: اختيار المدرسة للطلاب الجدد */}
        {step === "school" && (
          <div className="login-step-panel active">
            <div className="card-header">
              <div className="header-icon green">
                <i className="fa-solid fa-mosque"></i>
              </div>
              <h2 className="section-title">اختر صرحك التعليمي</h2>
              <p className="section-subtitle">
                المتسابق: <strong style={{ color: "var(--duo-green)" }}>{fullName}</strong>
              </p>
            </div>

            <p style={{ textAlign: "center", fontWeight: 700, color: "#64748b", margin: "10px 0 20px" }}>
              اختر المدرسة أو المركز القرآني التابع له من القائمة:
            </p>

            <div className="schools-cards-grid">
              {schools.map((schoolName, idx) => (
                <div
                  key={idx}
                  className="school-select-card"
                  onClick={() => handleSelectSchool(schoolName)}
                  role="button"
                >
                  <div className="school-card-icon">
                    <i className="fa-solid fa-school-flag"></i>
                  </div>
                  <div className="school-card-title">{schoolName}</div>
                  <div className="school-card-select-btn">
                    <span>اختيار</span>
                    <i className="fa-solid fa-check"></i>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-actions" style={{ marginTop: "20px" }}>
              <button
                type="button"
                className="btn-duo-outline"
                onClick={() => setStep("name")}
              >
                <i className="fa-solid fa-arrow-right"></i> رجوع لتعديل الاسم
              </button>
            </div>
          </div>
        )}

        {/* الخطوة 3: اختيار الصف للطلاب الجدد */}
        {step === "grade" && (
          <div className="login-step-panel active">
            <div className="card-header">
              <div className="header-icon blue">
                <i className="fa-solid fa-graduation-cap"></i>
              </div>
              <h2 className="section-title">اختر فئتك أو صفك الدراسي</h2>
              <p className="section-subtitle">
                المدرسة: <strong style={{ color: "var(--duo-blue)" }}>{chosenSchool}</strong>
              </p>
            </div>

            <div className="grades-cards-grid">
              {grades.map((gradeName, idx) => (
                <div
                  key={idx}
                  className="grade-select-card"
                  onClick={() => handleSelectGrade(gradeName)}
                  role="button"
                >
                  <div className="grade-card-icon">
                    <i className="fa-solid fa-layer-group"></i>
                  </div>
                  <div className="grade-card-title">{gradeName}</div>
                  <div className="grade-card-select-btn">
                    <span>تأكيد التسجيل والدخول</span>
                    <i className="fa-solid fa-arrow-left"></i>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-actions" style={{ marginTop: "20px" }}>
              <button
                type="button"
                className="btn-duo-outline"
                onClick={() => setStep("school")}
                disabled={isSubmitting}
              >
                <i className="fa-solid fa-arrow-right"></i> رجوع لتغيير المدرسة
              </button>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
