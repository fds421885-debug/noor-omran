// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// الشاشة الترحيبية الأولى (Hero Section)
// ========================================================

import React from "react";
import { useApp } from "../context/AppContext.tsx";

export const HeroSection: React.FC = () => {
  const { setCurrentView, isCloudConnected } = useApp();

  return (
    <section id="heroSection" className="view-section active">
      <div className="duo-card hero-card">
        <div className="bismillah-wrapper">
          <span className="bismillah">بِسْمِ اللَّـهِ الرَّحْمَـٰنِ الرَّحِيمِ</span>
        </div>

        <div className="hero-quran-badge">
          <div className="badge-icon-circle">
            <i className="fa-solid fa-book-quran"></i>
          </div>
        </div>

        <h1 className="hero-main-title">مسابقة نور البيان</h1>
        <div className="hero-years-badge">
          <span>1448 - 1449</span>
        </div>

        <p className="hero-desc">
          مرحبا بكم في مسابقة نور البيان نسخة 1448 - 1449
        </p>

        <div className="features-grid">
          <div className="feature-item">
            <i className="fa-solid fa-award"></i>
            <span>إتقان أحكام نور البيان</span>
          </div>
          <div className="feature-item">
            <i className="fa-solid fa-tv"></i>
            <span>شاشات عرض ومسابقات حية</span>
          </div>
          <div className="feature-item">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            <span>توليد ذكي للاختبارات</span>
          </div>
        </div>

        <div className="hero-action">
          <button
            className="btn-duo-green"
            type="button"
            onClick={() => setCurrentView("login")}
          >
            <span className="btn-text">أبدأ</span>
            <span className="btn-icon"><i className="fa-solid fa-arrow-left"></i></span>
          </button>
        </div>

        <div className="system-status">
          <span className={`status-indicator ${isCloudConnected ? "online" : "offline"}`}></span>
          <span className="status-text">
            {isCloudConnected ? "متصل مباشرة بقاعدة البيانات السحابية (Firebase)" : "وضع الحفظ المحلي الفوري (مفعل)"}
          </span>
        </div>
      </div>
    </section>
  );
};
