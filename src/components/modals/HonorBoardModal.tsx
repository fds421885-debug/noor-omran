// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// نافذة لوحة الشرف الرسمية (Honor Board Modal)
// ========================================================

import React, { useState } from "react";
import { useApp } from "../../context/AppContext.tsx";

export const HonorBoardModal: React.FC = () => {
  const { activeModal, closeModal, participants, grades } = useApp();

  const [filterGrade, setFilterGrade] = useState<string>("");

  if (activeModal !== "honorBoard") return null;

  const sorted = [...participants]
    .filter(p => p.role === "student")
    .filter(p => !filterGrade || p.grade === filterGrade)
    .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

  return (
    <div className="modal-overlay">
      <div className="duo-modal-box modal-wide">
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#fef9c3", color: "#ca8a04", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
              <i className="fa-solid fa-trophy"></i>
            </div>
            <div>
              <h3 style={{ margin: 0 }}>لوحة الشرف — ترتيب فرسان نور البيان</h3>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700 }}>
                ترتيب الطلاب المعتمد والمحفوظ في قاعدة البيانات السحابية
              </span>
            </div>
          </div>
          <button type="button" className="btn-modal-close" onClick={closeModal}>&times;</button>
        </div>

        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <select
            className="form-control form-select"
            style={{ width: "200px" }}
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
          >
            <option value="">جميع الصفوف والفئات</option>
            {grades.map((g, i) => (
              <option key={i} value={g}>{g}</option>
            ))}
          </select>
          <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 800 }}>
            إجمالي المتسابقين: {sorted.length} طالب
          </span>
        </div>

        <div style={{ maxHeight: "60vh", overflowY: "auto", padding: "14px 16px" }}>
          <table className="duo-table">
            <thead>
              <tr>
                <th>الترتيب</th>
                <th>اسم المتسابق</th>
                <th>المدرسة / المركز</th>
                <th>الصف</th>
                <th>النقاط الرسمية</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                    لا توجد درجات مسجلة حتى الآن
                  </td>
                </tr>
              ) : (
                sorted.map((st, idx) => (
                  <tr key={st.id} style={{ background: idx === 0 ? "#fefce8" : undefined }}>
                    <td style={{ fontWeight: 900 }}>
                      {idx === 0 ? "🥇 الأول" : idx === 1 ? "🥈 الثاني" : idx === 2 ? "🥉 الثالث" : `${idx + 1}`}
                    </td>
                    <td><strong>{st.name}</strong></td>
                    <td>{st.school}</td>
                    <td>{st.grade}</td>
                    <td style={{ fontWeight: 900, color: "#ca8a04", fontSize: "16px" }}>
                      {st.totalScore || 0} نقطة
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="modal-footer-box" style={{ padding: "12px 20px", display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn-duo-outline btn-sm" onClick={closeModal}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
