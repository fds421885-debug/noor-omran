// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// مجمع النوافذ والمودالات الشامل (Global Modals Host)
// ========================================================

import React from "react";
import { AccountModal } from "./AccountModal.tsx";
import { SchoolsGradesModal } from "./SchoolsGradesModal.tsx";
import { ManualQuizModal, AIQuizModal } from "./QuizModal.tsx";
import { CreateRoomModal } from "./CreateRoomModal.tsx";
import { TeamModal } from "./TeamModal.tsx";
import { TacticalWalletModal } from "./TacticalWalletModal.tsx";
import { PracticeQuizModal } from "./PracticeQuizModal.tsx";
import { GrandFinaleModal } from "./GrandFinaleModal.tsx";
import { HonorBoardModal } from "./HonorBoardModal.tsx";
import { PastTournamentsModal } from "./PastTournamentsModal.tsx";

export const GlobalModals: React.FC = () => {
  return (
    <>
      <AccountModal />
      <SchoolsGradesModal />
      <ManualQuizModal />
      <AIQuizModal />
      <CreateRoomModal />
      <TeamModal />
      <TacticalWalletModal />
      <PracticeQuizModal />
      <GrandFinaleModal />
      <HonorBoardModal />
      <PastTournamentsModal />
    </>
  );
};
