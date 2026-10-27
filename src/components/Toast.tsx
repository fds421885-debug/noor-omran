// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// عنصر التوست للإشعارات السريعة (Toast Notification)
// ========================================================

import React from "react";
import { useApp } from "../context/AppContext.tsx";

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  return (
    <div
      className="duo-toast"
      style={{
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        background: toast.type === "error" ? "#ef4444" : "#1e293b",
        color: "#ffffff",
        padding: "12px 24px",
        borderRadius: "20px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
        zIndex: 99999,
        fontSize: "14px",
        fontWeight: 800,
        pointerEvents: "none"
      }}
    >
      <i className={`fa-solid ${toast.icon || "fa-circle-check"}`} style={{ color: toast.type === "error" ? "#fecaca" : "var(--duo-green)" }}></i>
      <span>{toast.message}</span>
    </div>
  );
};
