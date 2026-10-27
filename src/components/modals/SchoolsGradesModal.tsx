// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// نافذة إدارة المدارس والصفوف (Schools & Grades Modal)
// ========================================================

import React, { useState } from "react";
import { useApp } from "../../context/AppContext.tsx";
import { DEFAULT_SCHOOLS, DEFAULT_GRADES } from "../../utils/defaults.ts";

export const SchoolsGradesModal: React.FC = () => {
  const {
    activeModal,
    closeModal,
    schools,
    grades,
    updateSchoolsAndGrades
  } = useApp();

  const [newSchool, setNewSchool] = useState<string>("");
  const [newGrade, setNewGrade] = useState<string>("");
  const [batchSchools, setBatchSchools] = useState<string>("");

  if (activeModal !== "schoolsGradesModal") return null;

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchool.trim()) return;
    if (schools.includes(newSchool.trim())) return;
    const updated = [...schools, newSchool.trim()];
    await updateSchoolsAndGrades(updated, grades);
    setNewSchool("");
  };

  const handleBatchSchools = async () => {
    const lines = batchSchools.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;
    const updated = Array.from(new Set([...schools, ...lines]));
    await updateSchoolsAndGrades(updated, grades);
    setBatchSchools("");
  };

  const handleDeleteSchool = async (sch: string) => {
    if (schools.length <= 1) {
      alert("يجب الإبقاء على مدرسة واحدة على الأقل في النظام.");
      return;
    }
    const updated = schools.filter(s => s !== sch);
    await updateSchoolsAndGrades(updated, grades);
  };

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGrade.trim()) return;
    if (grades.includes(newGrade.trim())) return;
    const updated = [...grades, newGrade.trim()];
    await updateSchoolsAndGrades(schools, updated);
    setNewGrade("");
  };

  const handleDeleteGrade = async (gr: string) => {
    if (grades.length <= 1) {
      alert("يجب الإبقاء على صف واحد على الأقل في النظام.");
      return;
    }
    const updated = grades.filter(g => g !== gr);
    await updateSchoolsAndGrades(schools, updated);
  };

  const handleRestoreDefaults = async () => {
    if (window.confirm("هل تريد استعادة المدارس والصفوف الافتراضية؟")) {
      await updateSchoolsAndGrades(DEFAULT_SCHOOLS, DEFAULT_GRADES);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="duo-modal-box modal-wide">
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <div className="modal-icon-bubble purple">
              <i className="fa-solid fa-school-flag"></i>
            </div>
            <div>
              <h3>إدارة المدارس والصفوف المعتمدة</h3>
              <span className="modal-subtitle">تخصيص الصروح التعليمية والفئات المعتمدة مع الحفظ المباشر</span>
            </div>
          </div>
          <button type="button" className="btn-modal-close" onClick={closeModal}>&times;</button>
        </div>

        <div className="sg-modal-grid" style={{ display: "grid", gap: "20px", gridTemplateColumns: "1fr 1fr", marginTop: "16px" }}>
          
          {/* قسم المدارس */}
          <div className="sg-panel-card schools-theme" style={{ background: "#ffffff", border: "2px solid #bbf7d0", borderRadius: "18px", padding: "18px" }}>
            <div className="sg-panel-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <h4 style={{ margin: 0, fontWeight: 900, color: "#166534" }}>المدارس والمراكز القرآنية</h4>
              <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "8px", fontSize: "12px", fontWeight: 800 }}>
                {schools.length} مدارس
              </span>
            </div>

            <form onSubmit={handleAddSchool} style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <input
                type="text"
                className="form-control"
                placeholder="اسم المدرسة الواحدة..."
                value={newSchool}
                onChange={(e) => setNewSchool(e.target.value)}
              />
              <button type="submit" className="btn-duo-green" style={{ whiteSpace: "nowrap" }}>إضافة</button>
            </form>

            <div style={{ marginBottom: "14px" }}>
              <textarea
                className="form-control"
                rows={2}
                placeholder="أو أضف عدة مدارس دفعة واحدة (كل مدرسة في سطر)..."
                value={batchSchools}
                onChange={(e) => setBatchSchools(e.target.value)}
                style={{ fontSize: "12px" }}
              />
              <button
                type="button"
                className="btn-duo-blue btn-sm"
                onClick={handleBatchSchools}
                style={{ width: "100%", marginTop: "6px" }}
              >
                إضافة المدارس دفعة واحدة
              </button>
            </div>

            <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
              {schools.map((sch, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: 700 }}>
                  <span>{sch}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSchool(sch)}
                    style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}
                    title="حذف"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* قسم الصفوف */}
          <div className="sg-panel-card grades-theme" style={{ background: "#ffffff", border: "2px solid #bfdbfe", borderRadius: "18px", padding: "18px" }}>
            <div className="sg-panel-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <h4 style={{ margin: 0, fontWeight: 900, color: "#1e40af" }}>الصفوف والفئات المقررة</h4>
              <span style={{ background: "#dbeafe", color: "#1d4ed8", padding: "2px 8px", borderRadius: "8px", fontSize: "12px", fontWeight: 800 }}>
                {grades.length} صفوف
              </span>
            </div>

            <form onSubmit={handleAddGrade} style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
              <input
                type="text"
                className="form-control"
                placeholder="اسم الصف أو الفئة الدراسية..."
                value={newGrade}
                onChange={(e) => setNewGrade(e.target.value)}
              />
              <button type="submit" className="btn-duo-blue" style={{ whiteSpace: "nowrap" }}>إضافة</button>
            </form>

            <div style={{ maxHeight: "250px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
              {grades.map((gr, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#eff6ff", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: 700 }}>
                  <span>{gr}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteGrade(gr)}
                    style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}
                    title="حذف"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="modal-footer-box" style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" className="btn-duo-outline btn-sm" onClick={handleRestoreDefaults}>
            <i className="fa-solid fa-rotate-left"></i> استعادة الافتراضيات
          </button>
          <button type="button" className="btn-duo-green btn-sm" onClick={closeModal}>
            إتمام وإغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
