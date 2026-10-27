// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// نافذة إضافة وتعديل الحسابات (Account Modal - Single & Batch)
// ========================================================

import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext.tsx";
import { Participant, UserRole } from "../../types.ts";
import { getDocumentId, normalizeArabic } from "../../utils/arabic.ts";

export const AccountModal: React.FC = () => {
  const {
    activeModal,
    closeModal,
    modalData,
    addOrUpdateParticipant,
    schools,
    grades
  } = useApp();

  const isEditing = !!(modalData && modalData.id);

  const [mode, setMode] = useState<"single" | "batch">("single");
  const [name, setName] = useState<string>("");
  const [batchNames, setBatchNames] = useState<string>("");
  const [role, setRole] = useState<UserRole>("student");
  const [school, setSchool] = useState<string>("");
  const [grade, setGrade] = useState<string>("");

  useEffect(() => {
    if (modalData) {
      setName(modalData.name || "");
      setRole(modalData.role || "student");
      setSchool(modalData.school || schools[0] || "");
      setGrade(modalData.grade || grades[0] || "");
    } else {
      setName("");
      setBatchNames("");
      setRole("student");
      setSchool(schools[0] || "");
      setGrade(grades[0] || "");
    }
  }, [modalData, schools, grades]);

  if (activeModal !== "accountModal") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
      if (!name.trim()) return;
      const updated: Participant = {
        ...modalData,
        name: name.trim(),
        normalizedName: normalizeArabic(name.trim()),
        role,
        school,
        grade
      };
      await addOrUpdateParticipant(updated);
      closeModal();
      return;
    }

    if (mode === "single") {
      if (!name.trim()) return;
      const newAcc: Participant = {
        id: getDocumentId(normalizeArabic(name.trim())),
        name: name.trim(),
        normalizedName: normalizeArabic(name.trim()),
        role,
        school,
        grade,
        totalScore: 0,
        createdAt: Date.now()
      };
      await addOrUpdateParticipant(newAcc);
    } else {
      const lines = batchNames.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      for (const line of lines) {
        const newAcc: Participant = {
          id: getDocumentId(normalizeArabic(line)),
          name: line,
          normalizedName: normalizeArabic(line),
          role,
          school,
          grade,
          totalScore: 0,
          createdAt: Date.now()
        };
        await addOrUpdateParticipant(newAcc);
      }
    }

    closeModal();
  };

  return (
    <div className="modal-overlay">
      <div className="duo-modal-box">
        <div className="modal-header">
          <h3>
            <i className={`fa-solid ${isEditing ? "fa-user-pen" : "fa-user-plus"}`}></i>
            {isEditing ? "تعديل بيانات الحساب" : "إضافة حساب جديد"}
          </h3>
          <button type="button" className="btn-modal-close" onClick={closeModal}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body-form">
          {!isEditing && (
            <div className="input-group" style={{ marginBottom: "14px" }}>
              <label className="input-label" style={{ fontWeight: 800, color: "#1e293b", marginBottom: "6px" }}>
                طريقة إضافة الحسابات
              </label>
              <div style={{ display: "flex", gap: "10px" }}>
                <label style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "10px",
                  background: mode === "single" ? "#f0fdf4" : "#f8fafc",
                  border: mode === "single" ? "2px solid #22c55e" : "1.5px solid #e2e8f0",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: 800,
                  color: "#166534"
                }}>
                  <input
                    type="radio"
                    name="accountAddMode"
                    value="single"
                    checked={mode === "single"}
                    onChange={() => setMode("single")}
                  />
                  فردي
                </label>
                <label style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "10px",
                  background: mode === "batch" ? "#eff6ff" : "#f8fafc",
                  border: mode === "batch" ? "2px solid #3b82f6" : "1.5px solid #e2e8f0",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: 800,
                  color: "#1e40af"
                }}>
                  <input
                    type="radio"
                    name="accountAddMode"
                    value="batch"
                    checked={mode === "batch"}
                    onChange={() => setMode("batch")}
                  />
                  جماعي (دفعة أسماء)
                </label>
              </div>
            </div>
          )}

          {mode === "single" || isEditing ? (
            <div className="input-group">
              <label className="input-label">الاسم الكامل <span className="required-star">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="الاسم الرباعي كاملاً"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="input-group">
              <label className="input-label">الأسماء الكاملة (اسم واحد في كل سطر) <span className="required-star">*</span></label>
              <textarea
                className="form-control"
                rows={5}
                placeholder="الصق الأسماء هنا... كل اسم في سطر مستقل"
                value={batchNames}
                onChange={(e) => setBatchNames(e.target.value)}
                required
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">الصفة / الدور <span className="required-star">*</span></label>
            <select
              className="form-control form-select"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="student">طالب</option>
              <option value="teacher">معلم</option>
              <option value="supervisor">مشرف</option>
              <option value="presenter">عارض (شاشة العرض)</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">المدرسة / المركز</label>
            <select
              className="form-control form-select"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            >
              {schools.map((s, i) => (
                <option key={i} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">الفئة / الصف</label>
            <select
              className="form-control form-select"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              {grades.map((g, i) => (
                <option key={i} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="modal-actions-flex" style={{ marginTop: "20px" }}>
            <button type="submit" className="btn-duo-green">
              <i className="fa-solid fa-check"></i> حفظ الحساب
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
