// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// رأس الصفحة الرئيسي والشريط العلوي (Application Header)
// ========================================================

import React from "react";
import { useApp } from "../context/AppContext.tsx";

export const Header: React.FC = () => {
  const {
    currentUser,
    setCurrentView,
    logoutUser,
    triggerCloudSync,
    isSyncing,
    isCloudConnected,
    openModal
  } = useApp();

  const handleHomeClick = () => {
    if (!currentUser) {
      setCurrentView("hero");
    } else if (currentUser.role === "student") {
      setCurrentView("student");
    } else {
      setCurrentView("supervisor");
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "supervisor": return "مشرف";
      case "teacher": return "معلم";
      case "presenter": return "عارض";
      case "student": return "طالب";
      default: return "مشارك";
    }
  };

  return (
    <header className="main-header">
      <div className="header-container">
        <div className="logo-box" onClick={handleHomeClick} role="button" title="الرئيسية" style={{ cursor: "pointer" }}>
          <div className="logo-icon" title="المصحف الشريف">
            <i className="fa-solid fa-book-quran"></i>
          </div>
          <div className="logo-text">
            <span className="logo-title">مسابقة نور البيان</span>
            <span className="logo-subtitle">1448 - 1449 هـ</span>
          </div>
        </div>

        <div className="header-tools">
          <button
            type="button"
            className="btn-cloud-sync-header"
            onClick={triggerCloudSync}
            disabled={isSyncing}
            title="مزامنة حقيقية وفورية مع قاعدة بيانات السحابة Firestore"
          >
            <span className={`cloud-status-dot ${isCloudConnected ? "online" : "offline"}`}></span>
            <i className={`fa-solid fa-cloud-arrow-down ${isSyncing ? "fa-bounce" : ""}`}></i>
            <span className="btn-sync-label">{isSyncing ? "جاري التحديث..." : "تحديث السحابة"}</span>
          </button>

          <button
            type="button"
            className="btn-honor-header"
            onClick={() => openModal("honorBoard")}
            title="عرض لوحة الشرف"
          >
            <i className="fa-solid fa-trophy"></i>
            <span>لوحة الشرف</span>
          </button>

          <button
            type="button"
            className="btn-honor-header"
            style={{ borderColor: "#10b981", color: "#065f46", background: "#ecfdf5" }}
            onClick={() => openModal("pastTournaments")}
            title="عرض أرشيف المسابقات والبطولات السابقة"
          >
            <i className="fa-solid fa-box-archive"></i>
            <span>مسابقات سابقة</span>
          </button>

          {currentUser && (
            <div className="user-quick-status">
              <span className="quick-role-badge">{getRoleLabel(currentUser.role)}</span>
              <span className="quick-user-name">{currentUser.name}</span>
              <button
                type="button"
                className="btn-logout-small"
                onClick={logoutUser}
                title="تسجيل الخروج"
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
