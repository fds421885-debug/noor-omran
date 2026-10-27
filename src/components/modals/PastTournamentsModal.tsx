// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// نافذة أرشيف المسابقات والبطولات السابقة (Past Tournaments Modal)
// ========================================================

import React, { useState } from "react";
import { useApp } from "../../context/AppContext.tsx";

export const PastTournamentsModal: React.FC = () => {
  const { activeModal, closeModal, pastTournaments } = useApp();

  const [search, setSearch] = useState<string>("");

  if (activeModal !== "pastTournaments") return null;

  const filtered = pastTournaments.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return a.roomTitle.toLowerCase().includes(s) || a.winnerTeam?.name.toLowerCase().includes(s) || a.supervisorName?.toLowerCase().includes(s);
  });

  return (
    <div className="modal-overlay">
      <div className="duo-modal-box modal-wide">
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#d1fae5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
              <i className="fa-solid fa-box-archive"></i>
            </div>
            <div>
              <h3 style={{ margin: 0 }}>أرشيف المسابقات والبطولات السابقة</h3>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700 }}>
                سجل البطولات المكتملة ونتائج الفرق المتوجة
              </span>
            </div>
          </div>
          <button type="button" className="btn-modal-close" onClick={closeModal}>&times;</button>
        </div>

        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
          <input
            type="text"
            className="form-control"
            placeholder="ابحث باسم المسابقة أو الفريق البطل أو المشرف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ maxHeight: "60vh", overflowY: "auto", padding: "16px", display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {filtered.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "36px", color: "#64748b", fontWeight: 700 }}>
              لا توجد بطولات سابقة محفوظة في الأرشيف
            </div>
          ) : (
            filtered.map(tour => (
              <div key={tour.id} style={{ background: "#ffffff", border: "1.5px solid #cbd5e1", borderRadius: "16px", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <strong style={{ fontSize: "16px", color: "#0f172a" }}>{tour.roomTitle}</strong>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>{tour.archivedAt?.slice(0, 10)}</span>
                </div>

                <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "8px 12px", borderRadius: "10px", margin: "10px 0" }}>
                  <div style={{ fontSize: "13.5px", fontWeight: 900, color: "#065f46" }}>
                    🏆 الفريق البطل: {tour.winnerTeam?.name} ({tour.winnerTeam?.score} نقطة)
                  </div>
                  {tour.runnerUpTeam && (
                    <div style={{ fontSize: "12px", color: "#047857", marginTop: "3px" }}>
                      🥈 الوصيف: {tour.runnerUpTeam.name} ({tour.runnerUpTeam.score} نقطة)
                    </div>
                  )}
                </div>

                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  المشرف المعتمد: <strong>{tour.supervisorName}</strong>
                </div>
              </div>
            ))
          )}
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
