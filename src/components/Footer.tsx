// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// تذييل الصفحة (Footer Component)
// ========================================================

import React from "react";
import { MASTER_SUPERVISOR_NAME } from "../utils/arabic.ts";

export const Footer: React.FC = () => {
  return (
    <footer className="main-footer">
      <div className="footer-container">
        <div className="footer-quote">
          «خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»
        </div>
        <p className="footer-copy">
          جميع الحقوق محفوظة &copy; مسابقة نور البيان 1448 - 1449 هـ | المشرف العام: <strong>{MASTER_SUPERVISOR_NAME}</strong>
        </p>
      </div>
    </footer>
  );
};
