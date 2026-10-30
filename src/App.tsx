// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// المكون الرئيسي للتطبيق (Root App Component)
// ========================================================

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const sectionVariants = {
  initial: { opacity: 0, y: 16, scale: 0.99 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.38,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -14,
    scale: 0.99,
    transition: {
      duration: 0.22,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

export const AppContent: React.FC = () => {
  const { currentView } = useApp();

  return (
    <div className="duo-theme">
      {/* قماش الخلفية التفاعلية الحية */}
      <InteractiveCanvas />

      {/* الهيدر العلوي */}
      <Header />

      {/* الحاوية الرئيسية للواجهات مع Framer Motion لانتقال سلس ومبهج بين الأقسام */}
      <main className="main-content">
        <AnimatePresence mode="wait">
          {currentView === "hero" && (
            <motion.div
              key="hero"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="view-wrapper w-full"
            >
              <HeroSection />
            </motion.div>
          )}
          {currentView === "login" && (
            <motion.div
              key="login"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="view-wrapper w-full"
            >
              <LoginSection />
            </motion.div>
          )}
          {currentView === "supervisor" && (
            <motion.div
              key="supervisor"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="view-wrapper w-full"
            >
              <SupervisorDashboard />
            </motion.div>
          )}
          {currentView === "student" && (
            <motion.div
              key="student"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="view-wrapper w-full"
            >
              <StudentPortal />
            </motion.div>
          )}
          {currentView === "arena" && (
            <motion.div
              key="arena"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="view-wrapper w-full"
            >
              <LiveArena />
            </motion.div>
          )}
        </AnimatePresence>
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
