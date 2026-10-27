// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// سياق التطبيق المركزي وإدارة الحالة اللحظية (Application Global Context)
// ========================================================

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  Participant,
  Quiz,
  LiveRoom,
  TournamentTeam,
  TournamentArchiveItem,
  UserRole
} from "../types.ts";
import {
  fetchSchoolsAndGrades,
  saveSchoolsAndGrades,
  fetchParticipants,
  saveParticipantDoc,
  deleteParticipantDoc,
  fetchQuizzes,
  saveQuizDoc,
  deleteQuizDoc,
  fetchLiveRooms,
  saveLiveRoomDoc,
  deleteLiveRoomDoc,
  subscribeToLiveRooms,
  subscribeToRoom,
  fetchTeams,
  saveTeamDoc,
  deleteTeamDoc,
  fetchTournamentArchives,
  saveTournamentArchiveDoc,
  getLocalCache,
  setLocalCache
} from "../services/db.ts";
import {
  normalizeArabic,
  isSupervisor,
  isTeacher,
  isPresenter,
  getDocumentId,
  MASTER_SUPERVISOR_NAME,
  MASTER_SUPERVISOR_DOC_ID
} from "../utils/arabic.ts";
import { DEFAULT_SCHOOLS, DEFAULT_GRADES, INITIAL_QUIZZES } from "../utils/defaults.ts";
import { ensureFirebaseAuth, testConnection, isQuotaExhausted } from "../../firebase-config.js";

interface ToastInfo {
  message: string;
  icon?: string;
  type?: "success" | "error" | "info";
}

interface AppContextType {
  currentUser: Participant | null;
  setCurrentUser: (user: Participant | null) => void;
  currentView: "hero" | "login" | "supervisor" | "student" | "arena";
  setCurrentView: (view: "hero" | "login" | "supervisor" | "student" | "arena") => void;
  
  // البيانات الأساسية
  participants: Participant[];
  quizzes: Quiz[];
  schools: string[];
  grades: string[];
  liveRooms: LiveRoom[];
  teams: TournamentTeam[];
  pastTournaments: TournamentArchiveItem[];
  
  // الغرفة الحية النشطة
  activeRoomId: string | null;
  activeRoom: LiveRoom | null;
  setActiveRoomId: (id: string | null) => void;
  setActiveRoom: (room: LiveRoom | null) => void;
  
  // حالة المزامنة
  isCloudConnected: boolean;
  isSyncing: boolean;
  triggerCloudSync: () => Promise<void>;
  
  // إدارة الحسابات
  loginUser: (fullName: string, school?: string, grade?: string) => Promise<Participant>;
  logoutUser: () => void;
  addOrUpdateParticipant: (participant: Participant) => Promise<void>;
  deleteParticipant: (id: string) => Promise<void>;
  
  // إدارة المدارس والصفوف
  updateSchoolsAndGrades: (schools: string[], grades: string[]) => Promise<void>;
  
  // إدارة الاختبارات
  addOrUpdateQuiz: (quiz: Quiz) => Promise<void>;
  deleteQuiz: (id: string) => Promise<void>;
  
  // إدارة الغرف الحية
  createLiveRoom: (room: Partial<LiveRoom>) => Promise<LiveRoom>;
  updateLiveRoom: (room: LiveRoom) => Promise<void>;
  deleteLiveRoom: (id: string) => Promise<void>;
  joinLiveRoom: (roomIdOrCode: string) => Promise<boolean>;
  exitLiveRoom: () => void;
  
  // إدارة الفرق
  addOrUpdateTeam: (team: TournamentTeam) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  
  // أرشيف البطولات
  archiveTournament: (archive: TournamentArchiveItem) => Promise<void>;
  
  // الإشعارات والتوست
  toast: ToastInfo | null;
  showToast: (message: string, icon?: string, type?: "success" | "error" | "info") => void;
  
  // المودالات
  activeModal: string | null;
  openModal: (modalName: string, modalData?: any) => void;
  closeModal: () => void;
  modalData: any;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Participant | null>(() => {
    return getLocalCache<Participant | null>("nour_current_user_session", null);
  });
  const [currentView, setCurrentView] = useState<"hero" | "login" | "supervisor" | "student" | "arena">(() => {
    const saved = getLocalCache<Participant | null>("nour_current_user_session", null);
    if (!saved) return "hero";
    if (saved.role === "supervisor" || saved.role === "teacher" || saved.role === "presenter") return "supervisor";
    return "student";
  });

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>(INITIAL_QUIZZES);
  const [schools, setSchools] = useState<string[]>(DEFAULT_SCHOOLS);
  const [grades, setGrades] = useState<string[]>(DEFAULT_GRADES);
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [pastTournaments, setPastTournaments] = useState<TournamentArchiveItem[]>([]);

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<LiveRoom | null>(null);

  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastInfo | null>(null);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);

  const showToast = useCallback((message: string, icon: string = "fa-circle-check", type: "success" | "error" | "info" = "success") => {
    setToast({ message, icon, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  const openModal = useCallback((name: string, data: any = null) => {
    setActiveModal(name);
    setModalData(data);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalData(null);
  }, []);

  // تحميل البيانات الأولية
  const loadInitialData = useCallback(async () => {
    setIsSyncing(true);
    try {
      await ensureFirebaseAuth("تطبيق نور البيان");
      const connected = await testConnection();
      setIsCloudConnected(connected || !isQuotaExhausted());

      const [sg, partList, qzList, rmList, tmList, archList] = await Promise.all([
        fetchSchoolsAndGrades(),
        fetchParticipants(),
        fetchQuizzes(),
        fetchLiveRooms(),
        fetchTeams(),
        fetchTournamentArchives()
      ]);

      setSchools(sg.schools);
      setGrades(sg.grades);
      setParticipants(partList);
      setQuizzes(qzList.length > 0 ? qzList : INITIAL_QUIZZES);
      setLiveRooms(rmList);
      setTeams(tmList);
      setPastTournaments(archList);
    } catch (e) {
      console.warn("loadInitialData notice:", e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // اشتراك لحظي في الغرف الحية
  useEffect(() => {
    const unsub = subscribeToLiveRooms((rooms) => {
      setLiveRooms(rooms);
      if (activeRoomId) {
        const found = rooms.find(r => r.id === activeRoomId);
        if (found) {
          setActiveRoom(found);
        }
      }
    });
    return () => unsub();
  }, [activeRoomId]);

  // اشتراك مباشر في الغرفة النشطة
  useEffect(() => {
    if (!activeRoomId) return;
    const unsub = subscribeToRoom(activeRoomId, (room) => {
      if (room) {
        setActiveRoom(room);
      }
    });
    return () => unsub();
  }, [activeRoomId]);

  // مزامنة السحابة اليدوية
  const triggerCloudSync = async () => {
    setIsSyncing(true);
    showToast("جاري التحديث والمزامنة مع قاعدة البيانات السحابية...", "fa-arrows-rotate fa-spin");
    await loadInitialData();
    showToast("تمت المزامنة بنجاح مع السحابة!", "fa-cloud-arrow-down");
  };

  // تسجيل الدخول
  const loginUser = async (fullName: string, school: string = DEFAULT_SCHOOLS[0], grade: string = DEFAULT_GRADES[0]): Promise<Participant> => {
    const norm = normalizeArabic(fullName).trim();
    
    // فحص ما إذا كان مشرفاً عاماً
    if (isSupervisor(fullName, participants)) {
      const supUser: Participant = {
        id: MASTER_SUPERVISOR_DOC_ID,
        name: MASTER_SUPERVISOR_NAME,
        normalizedName: normalizeArabic(MASTER_SUPERVISOR_NAME),
        role: "supervisor",
        school: "الإدارة العامة للمسابقات",
        grade: "المشرف العام",
        totalScore: 0,
        lastLoginAt: new Date().toISOString()
      };
      await saveParticipantDoc(supUser);
      setLocalCache("nour_current_user_session", supUser);
      setCurrentUser(supUser);
      setCurrentView("supervisor");
      showToast(`أهلاً بك فضيلة المشرف العام: ${MASTER_SUPERVISOR_NAME}`, "fa-crown");
      return supUser;
    }

    // فحص ما إذا كان معلماً
    if (isTeacher(fullName)) {
      const teacherUser: Participant = {
        id: getDocumentId(norm),
        name: fullName.trim(),
        normalizedName: norm,
        role: "teacher",
        school: school || DEFAULT_SCHOOLS[0],
        grade: "لجنة التحكيم والمعلمين",
        totalScore: 0,
        lastLoginAt: new Date().toISOString()
      };
      await saveParticipantDoc(teacherUser);
      setLocalCache("nour_current_user_session", teacherUser);
      setCurrentUser(teacherUser);
      setCurrentView("supervisor");
      showToast(`مرحباً بك فضيلة المعلم: ${fullName}`, "fa-chalkboard-user");
      return teacherUser;
    }

    // فحص ما إذا كان عارضاً
    if (isPresenter(fullName)) {
      const presUser: Participant = {
        id: getDocumentId(norm),
        name: fullName.trim(),
        normalizedName: norm,
        role: "presenter",
        school: "شاشة المسرح الحي",
        grade: "شاشة العرض المباشر",
        totalScore: 0,
        lastLoginAt: new Date().toISOString()
      };
      await saveParticipantDoc(presUser);
      setLocalCache("nour_current_user_session", presUser);
      setCurrentUser(presUser);
      setCurrentView("supervisor");
      showToast("مرحباً بك في وضع شاشة العرض والمسرح الحي", "fa-tv");
      return presUser;
    }

    // فحص هل هو طالب مسجل مسبقاً
    const existing = participants.find(p => p.normalizedName === norm || normalizeArabic(p.name) === norm);
    if (existing) {
      const updated: Participant = {
        ...existing,
        lastLoginAt: new Date().toISOString(),
        loginCount: (existing.loginCount || 1) + 1
      };
      await saveParticipantDoc(updated);
      setLocalCache("nour_current_user_session", updated);
      setCurrentUser(updated);
      if (updated.role === "supervisor" || updated.role === "teacher" || updated.role === "presenter") {
        setCurrentView("supervisor");
      } else {
        setCurrentView("student");
      }
      showToast(`مرحباً بعودتك: ${updated.name}`, "fa-user-check");
      return updated;
    }

    // طالب جديد
    const newStudent: Participant = {
      id: getDocumentId(norm),
      name: fullName.trim(),
      normalizedName: norm,
      role: "student",
      school: school,
      grade: grade,
      totalScore: 0,
      createdAt: Date.now(),
      firstLoginAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      loginCount: 1
    };
    await saveParticipantDoc(newStudent);
    setParticipants(prev => [...prev.filter(p => p.id !== newStudent.id), newStudent]);
    setLocalCache("nour_current_user_session", newStudent);
    setCurrentUser(newStudent);
    setCurrentView("student");
    showToast(`تم تسجيلك بنجاح في مسابقة نور البيان: ${newStudent.name}`, "fa-graduation-cap");
    return newStudent;
  };

  const logoutUser = () => {
    localStorage.removeItem("nour_current_user_session");
    setCurrentUser(null);
    setCurrentView("hero");
    setActiveRoomId(null);
    setActiveRoom(null);
    showToast("تم تسجيل الخروج بنجاح", "fa-arrow-right-from-bracket");
  };

  const addOrUpdateParticipant = async (participant: Participant) => {
    await saveParticipantDoc(participant);
    setParticipants(prev => {
      const idx = prev.findIndex(p => p.id === participant.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = participant;
        return copy;
      }
      return [...prev, participant];
    });
    showToast("تم حفظ بيانات الحساب بنجاح", "fa-circle-check");
  };

  const deleteParticipant = async (id: string) => {
    await deleteParticipantDoc(id);
    setParticipants(prev => prev.filter(p => p.id !== id));
    showToast("تم حذف الحساب بنجاح", "fa-trash-can");
  };

  const updateSchoolsAndGrades = async (newSchools: string[], newGrades: string[]) => {
    await saveSchoolsAndGrades(newSchools, newGrades);
    setSchools(newSchools);
    setGrades(newGrades);
    showToast("تم تحديث المدارس والصفوف بنجاح", "fa-circle-check");
  };

  const addOrUpdateQuiz = async (quiz: Quiz) => {
    await saveQuizDoc(quiz);
    setQuizzes(prev => {
      const idx = prev.findIndex(q => q.id === quiz.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = quiz;
        return copy;
      }
      return [...prev, quiz];
    });
    showToast("تم حفظ الاختبار بنجاح في بنك الأسئلة", "fa-book-quran");
  };

  const deleteQuiz = async (id: string) => {
    await deleteQuizDoc(id);
    setQuizzes(prev => prev.filter(q => q.id !== id));
    showToast("تم حذف الاختبار", "fa-trash-can");
  };

  const createLiveRoom = async (roomData: Partial<LiveRoom>): Promise<LiveRoom> => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const newRoom: LiveRoom = {
      id: `room_${Date.now()}_${code}`,
      code: code,
      title: roomData.title || "غرفة مسابقة نور البيان",
      type: roomData.type || "individual",
      status: "lobby",
      quizId: roomData.quizId || quizzes[0]?.id || "quiz_default_1",
      hostName: currentUser?.name || MASTER_SUPERVISOR_NAME,
      leaderName: currentUser?.name || MASTER_SUPERVISOR_NAME,
      connectedUsers: [
        {
          name: currentUser?.name || MASTER_SUPERVISOR_NAME,
          role: currentUser?.role || "supervisor",
          lastSeen: Date.now()
        }
      ],
      currentQuestionIdx: 0,
      contestantScore: 0,
      answeredQuestionsLog: {},
      activeEffects: [],
      timerSeconds: 30,
      initialTimerSeconds: 30,
      isTimerPaused: false,
      teams: roomData.teams || [],
      ...roomData
    };

    await saveLiveRoomDoc(newRoom);
    setLiveRooms(prev => [...prev.filter(r => r.id !== newRoom.id), newRoom]);
    setActiveRoomId(newRoom.id);
    setActiveRoom(newRoom);
    setCurrentView("arena");
    showToast(`تم إنشاء الغرفة بنجاح (رمز الدخول: ${code})`, "fa-play");
    return newRoom;
  };

  const updateLiveRoom = async (room: LiveRoom) => {
    await saveLiveRoomDoc(room);
    setActiveRoom(room);
    setLiveRooms(prev => {
      const idx = prev.findIndex(r => r.id === room.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = room;
        return copy;
      }
      return [...prev, room];
    });
  };

  const deleteLiveRoom = async (id: string) => {
    await deleteLiveRoomDoc(id);
    setLiveRooms(prev => prev.filter(r => r.id !== id));
    if (activeRoomId === id) {
      setActiveRoomId(null);
      setActiveRoom(null);
      setCurrentView(currentUser?.role === "student" ? "student" : "supervisor");
    }
    showToast("تم إغلاق الغرفة وحذفها", "fa-circle-check");
  };

  const joinLiveRoom = async (roomIdOrCode: string): Promise<boolean> => {
    const clean = roomIdOrCode.trim();
    let target = liveRooms.find(r => r.id === clean || r.code === clean);
    if (!target) {
      // إعادة جلب من السحابة للتأكد
      const freshRooms = await fetchLiveRooms();
      setLiveRooms(freshRooms);
      target = freshRooms.find(r => r.id === clean || r.code === clean);
    }

    if (!target) {
      showToast("عذراً، لم يتم العثور على غرفة مسابقة بهذا الرمز أو المعرف!", "fa-circle-xmark", "error");
      return false;
    }

    // إضافة المستخدم لقائمة المتصلين
    const userItem = {
      name: currentUser?.name || "مشارك",
      role: currentUser?.role || "student",
      lastSeen: Date.now()
    };
    const connected = target.connectedUsers || [];
    if (!connected.some(u => u.name === userItem.name)) {
      connected.push(userItem);
      target.connectedUsers = connected;
      await saveLiveRoomDoc(target);
    }

    setActiveRoomId(target.id);
    setActiveRoom(target);
    setCurrentView("arena");
    showToast(`تم الانضمام إلى: ${target.title}`, "fa-door-open");
    return true;
  };

  const exitLiveRoom = () => {
    setActiveRoomId(null);
    setActiveRoom(null);
    setCurrentView(currentUser?.role === "student" ? "student" : "supervisor");
    showToast("تمت مغادرة الغرفة", "fa-person-walking-arrow-right");
  };

  const addOrUpdateTeam = async (team: TournamentTeam) => {
    await saveTeamDoc(team);
    setTeams(prev => {
      const idx = prev.findIndex(t => t.id === team.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = team;
        return copy;
      }
      return [...prev, team];
    });
    showToast("تم حفظ بيانات الفريق", "fa-users-line");
  };

  const deleteTeam = async (id: string) => {
    await deleteTeamDoc(id);
    setTeams(prev => prev.filter(t => t.id !== id));
    showToast("تم حذف الفريق", "fa-trash-can");
  };

  const archiveTournament = async (archive: TournamentArchiveItem) => {
    await saveTournamentArchiveDoc(archive);
    setPastTournaments(prev => [archive, ...prev.filter(a => a.id !== archive.id)]);
    showToast("تم توثيق وأرشفة نتائج البطولة بنجاح", "fa-trophy");
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        currentView,
        setCurrentView,
        participants,
        quizzes,
        schools,
        grades,
        liveRooms,
        teams,
        pastTournaments,
        activeRoomId,
        activeRoom,
        setActiveRoomId,
        setActiveRoom,
        isCloudConnected,
        isSyncing,
        triggerCloudSync,
        loginUser,
        logoutUser,
        addOrUpdateParticipant,
        deleteParticipant,
        updateSchoolsAndGrades,
        addOrUpdateQuiz,
        deleteQuiz,
        createLiveRoom,
        updateLiveRoom,
        deleteLiveRoom,
        joinLiveRoom,
        exitLiveRoom,
        addOrUpdateTeam,
        deleteTeam,
        archiveTournament,
        toast,
        showToast,
        activeModal,
        openModal,
        closeModal,
        modalData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
