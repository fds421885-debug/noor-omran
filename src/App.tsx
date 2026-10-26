// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// المكون الرئيسي للتطبيق (Root App Component)
// ========================================================

import React from "react";
import { useApp } from "./context/AppContext.tsx";
import { Header } from "./components/Header.tsx";
import { HeroSection } from "./components/HeroSection.tsx";
import { LoginSection } from "./components/LoginSection.tsx";
import { SupervisorDashboard } from "./components/supervisor/SupervisorDashboard.tsx";
import { StudentPortal } from "./components/student/StudentPortal.tsx";
import { LiveArena } from "./components/arena/LiveArena.tsx";
import { InteractiveCanvas } from "./components/InteractiveCanvas.tsx";
import { GlobalModals } from "./components/modals/GlobalModals.tsx";
import { Toast } from "./components/Toast.tsx";
import { Footer } from "./components/Footer.tsx";

export const AppContent: React.FC = () => {
  const { currentView } = useApp();

  return (
    <div className="duo-theme">
      {/* قماش الخلفية التفاعلية الحية */}
      <InteractiveCanvas />

      {/* الهيدر العلوي */}
      <Header />

      {/* الحاوية الرئيسية للواجهات */}
      <main className="main-content">
        {currentView === "hero" && <HeroSection />}
        {currentView === "login" && <LoginSection />}
        {currentView === "supervisor" && <SupervisorDashboard />}
        {currentView === "student" && <StudentPortal />}
        {currentView === "arena" && <LiveArena />}
      </main>

      {/* الفوتر */}
      <Footer />

      {/* المودالات والإشعارات العامة */}
      <GlobalModals />
      <Toast />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
