// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// محفظة البطاقات التكتيكية الـ 40 الذكية (Tactical Cards Wallet Modal)
// ========================================================

import React, { useState } from "react";
import { useApp } from "../../context/AppContext.tsx";
import { TACTICAL_CARDS, isCardCompatible, getIncompatibilityReason } from "../../../cards-data.js";
import { TacticalCard, ActiveCardEffect } from "../../types.ts";

export const TacticalWalletModal: React.FC = () => {
  const {
    activeModal,
    closeModal,
    modalData,
    updateLiveRoom,
    currentUser,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<"wallet" | "catalog">("wallet");
  const [filterType, setFilterType] = useState<string>("all");

  if (activeModal !== "tacticalWallet") return null;

  const currentRoom = modalData?.room;
  const currentQuestion = modalData?.currentQuestion;
  const activeEffects: ActiveCardEffect[] = currentRoom?.activeEffects || [];

  const handleActivateCard = async (card: TacticalCard) => {
    if (!currentRoom) return;

    // فحص التوافق مع السؤال الحالي
    if (currentQuestion && !isCardCompatible(card, currentQuestion)) {
      const reason = getIncompatibilityReason(card, currentQuestion);
      showToast(`تعذر التفعيل: ${reason}`, "fa-circle-xmark", "error");
      return;
    }

    const newEffect: ActiveCardEffect = {
      cardId: card.id,
      title: card.title,
      effect: card.effect,
      activatedAtQuestionIdx: currentRoom.currentQuestionIdx || 0,
      activatedBy: currentUser?.name || "المشرف",
      scope: card.scope
    };

    const updatedEffects = [...activeEffects, newEffect];
    const updatedRoom = {
      ...currentRoom,
      activeEffects: updatedEffects
    };

    await updateLiveRoom(updatedRoom);
    showToast(`تم تفعيل بطاقة #${card.id} (${card.title}) بنجاح!`, "fa-bolt");
    closeModal();
  };

  const handleDeactivateEffect = async (cardId: number) => {
    if (!currentRoom) return;
    const updatedEffects = activeEffects.filter(e => e.cardId !== cardId);
    const updatedRoom = {
      ...currentRoom,
      activeEffects: updatedEffects
    };
    await updateLiveRoom(updatedRoom);
    showToast("تم إلغاء تأثير البطاقة", "fa-rotate-left");
  };

  const allCards = TACTICAL_CARDS as TacticalCard[];
  const displayedCards = allCards.filter(c => {
    if (filterType === "all") return true;
    if (filterType === "buff" || filterType === "risk") return c.type === filterType;
    if (filterType === "compatible" && currentQuestion) return isCardCompatible(c, currentQuestion);
    return true;
  });

  return (
    <div className="modal-overlay">
      <div className="duo-modal-box modal-wide" style={{ maxHeight: "88vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#f3e8ff", color: "#9333ea", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
              <i className="fa-solid fa-bolt"></i>
            </div>
            <div>
              <h3 style={{ margin: 0 }}>محفظة البطاقات التكتيكية الـ 40</h3>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700 }}>
                اختر البطاقة المناسبة لتعزيز المتسابق أو مضاعفة التحدي
              </span>
            </div>
          </div>
          <button type="button" className="btn-modal-close" onClick={closeModal}>&times;</button>
        </div>

        {/* التبويبات الداخلية والتصفية */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1.5px solid #e2e8f0", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className={`btn-duo-outline btn-sm ${filterType === "all" ? "active" : ""}`}
              onClick={() => setFilterType("all")}
            >
              جميع البطاقات (40)
            </button>
            <button
              type="button"
              className={`btn-duo-outline btn-sm ${filterType === "compatible" ? "active" : ""}`}
              onClick={() => setFilterType("compatible")}
              style={{ borderColor: "#22c55e", color: "#16a34a" }}
            >
              <i className="fa-solid fa-check"></i> المتوافقة مع السؤال الحالي
            </button>
            <button
              type="button"
              className={`btn-duo-outline btn-sm ${filterType === "buff" ? "active" : ""}`}
              onClick={() => setFilterType("buff")}
            >
              ميزات إيجابية (Buff)
            </button>
            <button
              type="button"
              className={`btn-duo-outline btn-sm ${filterType === "risk" ? "active" : ""}`}
              onClick={() => setFilterType("risk")}
            >
              مخاطرة ذكية (Risk)
            </button>
          </div>

          <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#7e22ce" }}>
            البطاقات النشطة الآن: {activeEffects.length}
          </span>
        </div>

        {/* شريط البطاقات النشطة حالياً */}
        {activeEffects.length > 0 && (
          <div style={{ background: "#faf5ff", borderBottom: "2px solid #e9d5ff", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 900, color: "#6b21a8" }}>
              <i className="fa-solid fa-wand-magic-sparkles"></i> فعالة حالياً:
            </span>
            {activeEffects.map((eff, i) => (
              <span
                key={i}
                style={{
                  background: "#7e22ce",
                  color: "#ffffff",
                  padding: "4px 10px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                #{eff.cardId} {eff.title}
                <button
                  type="button"
                  onClick={() => handleDeactivateEffect(eff.cardId)}
                  style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", padding: "0 2px" }}
                  title="إلغاء التفعيل"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* شبكة عرض البطاقات */}
        <div style={{ overflowY: "auto", padding: "16px", display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {displayedCards.map(c => {
            const isComp = currentQuestion ? isCardCompatible(c, currentQuestion) : true;
            const isAlreadyActive = activeEffects.some(e => e.cardId === c.id);

            return (
              <div
                key={c.id}
                style={{
                  background: isAlreadyActive ? "#f5f3ff" : "#ffffff",
                  border: isAlreadyActive ? "2.5px solid #9333ea" : c.type === "buff" ? "2px solid #d8b4fe" : "2px solid #fed7aa",
                  borderRadius: "16px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  opacity: !isComp ? 0.6 : 1
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{
                      background: c.type === "buff" ? "#f3e8ff" : "#ffedd5",
                      color: c.type === "buff" ? "#7e22ce" : "#c2410c",
                      padding: "3px 8px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: 900
                    }}>
                      #{c.id} • {c.type === "buff" ? "ميزة" : "مخاطرة"}
                    </span>
                    <i className={`fa-solid ${c.icon}`} style={{ fontSize: "16px", color: c.type === "buff" ? "#9333ea" : "#ea580c" }}></i>
                  </div>

                  <h4 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 900, color: "#0f172a" }}>
                    {c.title}
                  </h4>
                  <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#64748b", fontWeight: 700, lineHeight: 1.5 }}>
                    {c.desc}
                  </p>
                </div>

                <div>
                  {isAlreadyActive ? (
                    <button
                      type="button"
                      className="btn-duo-outline btn-sm"
                      style={{ width: "100%", borderColor: "#ef4444", color: "#dc2626" }}
                      onClick={() => handleDeactivateEffect(c.id)}
                    >
                      <i className="fa-solid fa-xmark"></i> إلغاء تفعيل البطاقة
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={c.type === "buff" ? "btn-duo-purple btn-sm" : "btn-duo-yellow btn-sm"}
                      style={{ width: "100%" }}
                      onClick={() => handleActivateCard(c)}
                      disabled={!isComp}
                    >
                      <i className="fa-solid fa-bolt"></i> {isComp ? "تفعيل الآن" : "غير متوافقة"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-footer-box" style={{ padding: "12px 20px", display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn-duo-outline btn-sm" onClick={closeModal}>
            إغلاق المحفظة
          </button>
        </div>
      </div>
    </div>
  );
};
