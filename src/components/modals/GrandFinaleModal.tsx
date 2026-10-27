// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// نافذة التتويج وحفل ختام البطولة (Grand Finale & Trophy Ceremony)
// ========================================================

import React from "react";
import { useApp } from "../../context/AppContext.tsx";
import { TournamentArchiveItem } from "../../types.ts";

export const GrandFinaleModal: React.FC = () => {
  const { activeModal, closeModal, modalData, exitLiveRoom } = useApp();

  if (activeModal !== "grandFinale") return null;

  const archive = modalData as TournamentArchiveItem;

  const handleClose = () => {
    closeModal();
    exitLiveRoom();
  };

  return (
    <div className="modal-overlay">
      <div
        className="duo-modal-box"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
          color: "#ffffff",
          border: "3px solid #facc15",
          borderRadius: "28px",
          textAlign: "center",
          maxWidth: "600px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.6)"
        }}
      >
        <div style={{ fontSize: "56px", color: "#facc15", marginTop: "10px" }}>
          <i className="fa-solid fa-trophy"></i>
        </div>

        <h2 style={{ fontSize: "28px", fontWeight: 900, color: "#facc15", margin: "10px 0 6px" }}>
          حفل تتويج بطل المسابقة!
        </h2>
        <p style={{ color: "#e2e8f0", fontSize: "15px", margin: "0 0 24px" }}>
          {archive?.roomTitle || "مسابقة نور البيان الكبرى"}
        </p>

        {/* بطاقة الفريق البطل */}
        <div style={{ background: "rgba(250, 204, 21, 0.15)", border: "2px solid #facc15", borderRadius: "18px", padding: "18px", marginBottom: "18px" }}>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "#fef08a", marginBottom: "4px" }}>
            🏆 المركز الأول والفريق البطل المتوج:
          </div>
          <div style={{ fontSize: "26px", fontWeight: 900, color: "#ffffff" }}>
            {archive?.winnerTeam?.name}
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#facc15", marginTop: "4px" }}>
            بمجموع درجات: {archive?.winnerTeam?.score || 0} نقطة
          </div>
        </div>

        {/* بطاقة الوصيف */}
        {archive?.runnerUpTeam && (
          <div style={{ background: "rgba(255, 255, 255, 0.08)", border: "1.5px solid #cbd5e1", borderRadius: "14px", padding: "12px", marginBottom: "20px" }}>
            <span style={{ fontSize: "13px", color: "#cbd5e1" }}>🥈 المركز الثاني (الوصيف): </span>
            <strong style={{ fontSize: "16px", color: "#ffffff" }}>{archive.runnerUpTeam.name}</strong>
            <span style={{ fontSize: "14px", color: "#facc15", marginRight: "8px" }}>
              ({archive.runnerUpTeam.score} نقطة)
            </span>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button
            type="button"
            className="btn-duo-green"
            onClick={handleClose}
            style={{ fontSize: "16px", padding: "12px 32px" }}
          >
            <i className="fa-solid fa-house"></i> خروج لمنصة المسابقة
          </button>
        </div>
      </div>
    </div>
  );
};
