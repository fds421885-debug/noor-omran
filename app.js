// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// النظام الشامل المتكامل: الأدوار الأربعة، إدارة الحسابات،
// بنك الأسئلة والاختبارات، التوليد بالذكاء الاصطناعي،
// العروض والمسابقات الحية، البطاقات التكتيكية (40 بطاقة)، ولوحة الشرف
// ========================================================

import { 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  arrayUnion,
  arrayRemove
} from "./firebase-config.js";

import { soundFX } from "./audio-fx.js";
import { TACTICAL_CARDS, getRandomTacticalCards } from "./cards-data.js";
import { generateTestWithAI } from "./ai-service.js";

// --------------------------------------------------------
// ثوابت النظام
// --------------------------------------------------------
const MASTER_SUPERVISOR_NAME = "محمد منتصر محمد يونس";

const DEFAULT_SCHOOLS = [
  "مدرسة نور البيان النموذجية",
  "مدرسة دار الأرقم القرآنية",
  "مجمع الفرقان لتعليم القرآن",
  "مركز الإتقان القرآني"
];

const DEFAULT_GRADES = [
  "صف أول",
  "صف ثاني",
  "صف ثالث"
];

// نماذج اختبارات أولية معتمدة
const INITIAL_QUIZZES = [
  {
    id: "quiz_default_1",
    title: "اختبار نور البيان - مستوى الحروف والمدود",
    targetGrade: "صف أول",
    allowPractice: true,
    updatedAt: 1,
    sections: [
      {
        sectionName: "القسم الأول: الحروف وحركاتها",
        questions: [
          {
            type: "oral",
            font: "quran",
            text: "اقرأ الكلمات الآتية مع ضبط حركة الفتح:",
            targetOral: "كَتَبَ - بَلَغَ - وَجَدَ",
            points: 5
          },
          {
            type: "mcq",
            font: "quran",
            text: "ما هي الحركة الصحيحة لحرف الميم في كلمة: عَمِلَ؟",
            options: ["فتحة (مَ)", "كسرة (مِ)", "ضمة (مُ)", "سكون (مْ)"],
            correct: 1,
            points: 5
          },
          {
            type: "ordering",
            font: "quran",
            text: "رتب الحروف لتكوين الكلمة القرآنية: [قَ - لَ - مَ]",
            items: ["قَ", "لَ", "مَ"],
            points: 5
          }
        ]
      },
      {
        sectionName: "القسم الثاني: المدود والتنوين",
        questions: [
          {
            type: "oral",
            font: "quran",
            text: "تهجَّ وانطق كلمات المد بالواو بالرسم العثماني:",
            targetOral: "يَقُولُ - نُوحِيهَا",
            points: 5
          },
          {
            type: "matching",
            font: "amiri",
            text: "صل بين الكلمة ونوع المد المناسب:",
            pairs: [["جَاءَ", "مد متصل"], ["فِي أَنفُسِكُمْ", "مد منفصل"], ["قَالَ", "مد طبيعي"], ["الضَّالِّينَ", "مد لازم"]],
            points: 5
          }
        ]
      }
    ]
  },
  {
    id: "quiz_default_2",
    title: "اختبار أحكام النون الساكنة والتجويد",
    targetGrade: "صف ثاني",
    allowPractice: true,
    updatedAt: 1,
    sections: [
      {
        sectionName: "القسم الأول: أحكام النون والتنوين",
        questions: [
          {
            type: "oral",
            font: "quran",
            text: "اقرأ الآية الكريمة مع تطبيق حكم الإقلاب وتسكين الدال عند الوقف:",
            targetOral: "﴿مِن بَعْدِ﴾",
            points: 5
          },
          {
            type: "mcq",
            font: "amiri",
            text: "ما حكم النون الساكنة في قوله تعالى: ﴿مِنْ خَوْفٍ﴾؟",
            options: ["إدغام بغنة", "إظهار حلقي", "إخفاء حقيقي", "إقلاب"],
            correct: 1,
            points: 5
          }
        ]
      }
    ]
  }
];

// --------------------------------------------------------
// عناصر واجهة المستخدم (DOM Elements)
// --------------------------------------------------------
const views = {
  hero: document.getElementById("heroSection"),
  login: document.getElementById("loginSection"),
  supervisor: document.getElementById("supervisorSection"),
  student: document.getElementById("studentSection"),
  liveArena: document.getElementById("liveArenaSection")
};

// عناصر الدخول والتسجيل
const btnStart = document.getElementById("btnStart");
const btnBackToHero = document.getElementById("btnBackToHero");
const loginForm = document.getElementById("loginForm");
const fullNameInput = document.getElementById("fullNameInput");
const nameCountBadge = document.getElementById("nameCountBadge");
const nameProgressBar = document.getElementById("nameProgressBar");
const validationAlert = document.getElementById("validationAlert");
const btnSubmitLogin = document.getElementById("btnSubmitLogin");
const loginInstructionText = document.getElementById("loginInstructionText");

// مراحل تسجيل الدخول التفاعلية (Onboarding Steps)
const loginStepName = document.getElementById("loginStepName");
const loginStepSchool = document.getElementById("loginStepSchool");
const loginStepGrade = document.getElementById("loginStepGrade");
const stepStudentNamePrompt = document.getElementById("stepStudentNamePrompt");
const schoolsCardsGrid = document.getElementById("schoolsCardsGrid");
const btnBackToNameStep = document.getElementById("btnBackToNameStep");
const stepChosenSchoolName = document.getElementById("stepChosenSchoolName");
const gradesCardsGrid = document.getElementById("gradesCardsGrid");
const btnBackToSchoolStep = document.getElementById("btnBackToSchoolStep");

let pendingNewStudent = {
  rawName: "",
  norm: "",
  docId: "",
  school: "",
  grade: ""
};

// الهيدر
const headerHomeLogo = document.getElementById("headerHomeLogo");
const userQuickStatus = document.getElementById("userQuickStatus");
const quickRoleBadge = document.getElementById("quickRoleBadge");
const quickUserName = document.getElementById("quickUserName");
const quickLogoutBtn = document.getElementById("quickLogoutBtn");

// لوحة الإدارة والتبويبات
const supervisorGreetingTitle = document.getElementById("supervisorGreetingTitle");
const supervisorNameDisplay = document.getElementById("supervisorNameDisplay");
const bannerRolePill = document.getElementById("bannerRolePill");
const roleBannerIcon = document.getElementById("roleBannerIcon");
const statTotalStudents = document.getElementById("statTotalStudents");
const statNewStudents = document.getElementById("statNewStudents");
const statTodayLogins = document.getElementById("statTodayLogins");
const statActiveQuizzes = document.getElementById("statActiveQuizzes");

// الحسابات
const accountsTableBody = document.getElementById("accountsTableBody");
const accountsSearchInput = document.getElementById("accountsSearchInput");
const roleFilterSelect = document.getElementById("roleFilterSelect");
const gradeFilterSelect = document.getElementById("gradeFilterSelect");
const btnRefreshAccounts = document.getElementById("btnRefreshAccounts");
const btnOpenAddAccountModal = document.getElementById("btnOpenAddAccountModal");
const btnManageSchoolsGrades = document.getElementById("btnManageSchoolsGrades");

// بنك الاختبارات
const quizzesListGrid = document.getElementById("quizzesListGrid");
const btnOpenManualQuizModal = document.getElementById("btnOpenManualQuizModal");
const btnOpenAIQuizModal = document.getElementById("btnOpenAIQuizModal");

// غرف المسابقات الحية
const roomsListContainer = document.getElementById("roomsListContainer");
const btnOpenCreateRoomModal = document.getElementById("btnOpenCreateRoomModal");

// مسرح المسابقة الحي
const arenaRoomTitle = document.getElementById("arenaRoomTitle");
const arenaRoomCode = document.getElementById("arenaRoomCode");
const arenaUserRolePill = document.getElementById("arenaUserRolePill");
const btnExitArena = document.getElementById("btnExitArena");
const arenaLobby = document.getElementById("arenaLobby");
const arenaStage = document.getElementById("arenaStage");
const arenaCurrentLeaderName = document.getElementById("arenaCurrentLeaderName");
const arenaConnectedUsersList = document.getElementById("arenaConnectedUsersList");
const btnStartLiveContest = document.getElementById("btnStartLiveContest");
const arenaConnectedCount = document.getElementById("arenaConnectedCount");
const arenaLobbyUsersCount = document.getElementById("arenaLobbyUsersCount");
const arenaLobbyWaitingForLeader = document.getElementById("arenaLobbyWaitingForLeader");
const arenaWaitingLeaderName = document.getElementById("arenaWaitingLeaderName");

// أدوات المسرح
const stageStudentName = document.getElementById("stageStudentName");
const stageStudentSchool = document.getElementById("stageStudentSchool");
const stageStudentGrade = document.getElementById("stageStudentGrade");
const stageStudentScore = document.getElementById("stageStudentScore");
const stageQuestionNumber = document.getElementById("stageQuestionNumber");
const stageSectionName = document.getElementById("stageSectionName");
const stageTimerSeconds = document.getElementById("stageTimerSeconds");
const stageQuestionText = document.getElementById("stageQuestionText");
const stageInteractiveArea = document.getElementById("stageInteractiveArea");
const rouletteOverlay = document.getElementById("rouletteOverlay");
const rouletteSlotNumber = document.getElementById("rouletteSlotNumber");
const evalCurrentScoreDisplay = document.getElementById("evalCurrentScoreDisplay");
const evalProgressFill = document.getElementById("evalProgressFill");
const teacherVotingRow = document.getElementById("teacherVotingRow");
const supervisorControlBar = document.getElementById("supervisorControlBar");

// أزرار التحكم بالمسابقة
const btnPickStudentModal = document.getElementById("btnPickStudentModal");
const btnRandomQuestionRoulette = document.getElementById("btnRandomQuestionRoulette");
const btnTriggerTacticalCards = document.getElementById("btnTriggerTacticalCards");
const btnShowHonorBoard = document.getElementById("btnShowHonorBoard");
const btnNextStudentCycle = document.getElementById("btnNextStudentCycle");

// بوابة الطالب
const studentGreetingTitle = document.getElementById("studentGreetingTitle");
const studentNameDisplay = document.getElementById("studentNameDisplay");
const studentSchoolDisplay = document.getElementById("studentSchoolDisplay");
const studentGradeDisplay = document.getElementById("studentGradeDisplay");
const studentRegDate = document.getElementById("studentRegDate");
const studentLastActive = document.getElementById("studentLastActive");
const studentPracticeQuizzesList = document.getElementById("studentPracticeQuizzesList");

// التوست
const toastNotification = document.getElementById("toastNotification");
const toastMessage = document.getElementById("toastMessage");

// --------------------------------------------------------
// المتغيرات والبيانات المحلية
// --------------------------------------------------------
let currentUser = null;
let participantsCache = [];
let schoolsCache = [];
let gradesCache = [];
let quizzesCache = [];
const recentLocalQuizUpdates = new Map(); // قفل زمني وتتبع محلي للاختبارات التي تم تعديلها أو إنشاؤها لمنع استبدالها بنسخ قديمة
let activeRooms = [];
let currentLiveRoom = null;
let currentRoomUnsubscribe = null;
let lastKnownUsersList = [];
let liveTimerInterval = null;
let liveTimeRemaining = 30;
let roomTeachersRatings = {};
let activeCardEffect = null; // البطاقة التكتيكية المختارة من قِبَل المتسابق
let lastSeenTeacherHelpTimestamp = 0; // لضمان عدم تكرار ظهور تنبيه مساعدة المعلم

// --------------------------------------------------------
// دوال المساعدة للتوحيد والتنسيق
// --------------------------------------------------------
function normalizeArabic(text) {
  if (!text) return "";
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // إزالة التشكيل
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

function isSupervisor(name) {
  const norm = normalizeArabic(name);
  return norm === normalizeArabic(MASTER_SUPERVISOR_NAME) || 
         norm === normalizeArabic("منتصر ممد راغب يونس") || 
         norm === normalizeArabic("منتصر محمد راغب يونس");
}

function validateQuadrupleName(fullName) {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { isValid: false, count: 0, message: "يرجى كتابة الاسم الرباعي كاملاً." };
  }
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  const count = words.length;
  if (count < 4) {
    const wordLabel = count === 1 ? "اسم واحد فقط" : count === 2 ? "اسمين فقط" : "3 أسماء فقط";
    return {
      isValid: false,
      count,
      message: `الاسم الرباعي إلزامي للدخول! لقد كتبت (${wordLabel}). يجب كتابة 4 أسماء على الأقل.`
    };
  }
  return { isValid: true, count, message: "" };
}

function getDocumentId(normalizedName) {
  return "user_" + encodeURIComponent(normalizedName).replace(/%/g, "_");
}

// خوارزمية Fisher-Yates لخلط وتشتيت العناصر عشوائياً (مبهدلة للتفكير والذكاء)
function shuffleArray(arr) {
  if (!Array.isArray(arr) || arr.length <= 1) return [...(arr || [])];
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// الشارة العائمة المبهجة للبطاقات التكتيكية (تظهر وتطفو وتتلاشى بثيم دولينجو)
function showFloatingCardPill(text, icon = "fa-star", type = "green") {
  try {
    const pill = document.createElement("div");
    pill.className = `floating-card-pill pill-${type}`;
    pill.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${escapeHtml(text)}</span>
    `;
    document.body.appendChild(pill);
    try { soundFX?.celebrate(); } catch (e) {}
    setTimeout(() => {
      if (pill && pill.parentNode) pill.remove();
    }, 1850);
  } catch (e) {
    console.warn("Floating card pill notice:", e);
  }
}

function formatArabicDate(dateValue) {
  if (!dateValue) return "اليوم";
  let dateObj = null;
  try {
    if (typeof dateValue?.toDate === "function") {
      dateObj = dateValue.toDate();
    } else if (typeof dateValue === "object" && dateValue !== null && typeof dateValue.seconds === "number") {
      dateObj = new Date(dateValue.seconds * 1000);
    } else if (typeof dateValue === "number") {
      dateObj = new Date(dateValue);
    } else {
      dateObj = new Date(dateValue);
    }
  } catch (e) {
    return "اليوم";
  }
  if (!dateObj || isNaN(dateObj.getTime())) return "اليوم";
  return dateObj.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function showToast(msg, icon = "fa-circle-check") {
  if (!toastNotification) return;
  toastMessage.textContent = msg;
  const iconEl = toastNotification.querySelector("i");
  if (iconEl) iconEl.className = `fa-solid ${icon}`;
  toastNotification.classList.remove("hidden");
  toastNotification.classList.add("show");
  setTimeout(() => {
    toastNotification.classList.remove("show");
    setTimeout(() => toastNotification.classList.add("hidden"), 300);
  }, 3500);
}

// --------------------------------------------------------
// شاشة التحميل الاحترافية الذكية (App Global Loader) مع صمام أمان تلقائي
// --------------------------------------------------------
let globalLoaderTimer = null;

function showGlobalLoader(title = "جاري التحقق والمزامنة...", subtitle = "يرجى الانتظار لحظات، يتم جلب البيانات السحابية فورياً") {
  const loader = document.getElementById("appGlobalLoader");
  const titleEl = document.getElementById("appLoaderTitle");
  const subEl = document.getElementById("appLoaderSubtitle");
  if (!loader) return;
  if (titleEl) titleEl.textContent = title;
  if (subEl) subEl.textContent = subtitle;

  if (globalLoaderTimer) {
    clearTimeout(globalLoaderTimer);
    globalLoaderTimer = null;
  }

  loader.classList.remove("hidden");
  // إجبار إعادة الرسم لتفعيل التلاشي السلس
  void loader.offsetWidth;
  loader.classList.add("show");

  // مؤقت أمان تلقائي ذكي لمنع أي تعليق لشاشة التحميل تحت أي ظرف
  globalLoaderTimer = setTimeout(() => {
    hideGlobalLoader();
  }, 7500);
}

function hideGlobalLoader() {
  if (globalLoaderTimer) {
    clearTimeout(globalLoaderTimer);
    globalLoaderTimer = null;
  }
  const loader = document.getElementById("appGlobalLoader");
  if (!loader) return;
  loader.classList.remove("show");
  setTimeout(() => {
    loader.classList.add("hidden");
  }, 220);
}

// --------------------------------------------------------
// نافذة التأكيد التفاعلية المحمية (بدون تراكم أي مستمعين وبدون أي خروج مفاجئ)
// --------------------------------------------------------
let activeConfirmResolve = null;

function showInAppConfirm(options, legacyCallback = null) {
  let title = "تأكيد الإجراء";
  let message = "هل أنت متأكد من إتمام هذا الإجراء؟";
  let confirmText = "نعم، تأكيد";
  let cancelText = "إلغاء وتراجع";
  let type = "danger";
  let icon = "fa-triangle-exclamation";

  if (typeof options === "string") {
    message = options;
  } else if (typeof options === "object" && options !== null) {
    if (options.title) title = options.title;
    if (options.message) message = options.message;
    if (options.confirmText) confirmText = options.confirmText;
    if (options.cancelText) cancelText = options.cancelText;
    if (options.type) type = options.type;
    if (options.icon) icon = options.icon;
  }

  const modal = document.getElementById("confirmDialogModal");
  const titleEl = document.getElementById("confirmDialogTitle");
  const msgEl = document.getElementById("confirmDialogMessage");
  const yesBtn = document.getElementById("btnConfirmDialogYes");
  const noBtn = document.getElementById("btnConfirmDialogNo");
  const yesText = document.getElementById("confirmDialogYesText");
  const noText = document.getElementById("confirmDialogNoText");
  const iconEl = document.getElementById("confirmDialogIcon");

  if (!modal || !yesBtn || !noBtn) {
    if (typeof legacyCallback === "function") legacyCallback();
    return Promise.resolve(true);
  }

  // إذا كان هناك تأكيد قديم معلق، نقوم بإلغائه بأمان فوري
  if (activeConfirmResolve) {
    activeConfirmResolve(false);
    activeConfirmResolve = null;
  }

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;
  if (yesText) yesText.textContent = confirmText;
  if (noText) noText.textContent = cancelText;

  if (iconEl) {
    iconEl.className = `confirm-dialog-icon ${type}`;
    iconEl.innerHTML = `<i class="fa-solid ${icon}"></i>`;
  }

  if (yesBtn) {
    yesBtn.className = type === "danger" ? "btn-duo-red" : "btn-duo-green";
  }

  return new Promise((resolve) => {
    activeConfirmResolve = resolve;

    const closeAndResolve = (result) => {
      yesBtn.onclick = null;
      noBtn.onclick = null;
      modal.classList.add("hidden");
      if (activeConfirmResolve === resolve) {
        activeConfirmResolve = null;
      }
      if (result && typeof legacyCallback === "function") {
        legacyCallback();
      }
      resolve(result);
    };

    // نستخدم onclick المباشر لمنع أي تراكم نهائياً لمستمعي الأحداث
    yesBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeAndResolve(true);
    };

    noBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeAndResolve(false);
    };

    modal.classList.remove("hidden");
  });
}

// --------------------------------------------------------
// إدارة التنقل بين الشاشات والتبويبات
// --------------------------------------------------------
function showView(viewName) {
  Object.keys(views).forEach(key => {
    if (key === viewName) {
      views[key]?.classList.remove("hidden");
      views[key]?.classList.add("active");
    } else {
      views[key]?.classList.add("hidden");
      views[key]?.classList.remove("active");
    }
  });

  if (currentUser && viewName !== "hero" && viewName !== "login") {
    userQuickStatus?.classList.remove("hidden");
    if (quickUserName) quickUserName.textContent = currentUser.name;
    if (quickRoleBadge) {
      const roleMap = { supervisor: "مشرف", teacher: "معلم", presenter: "عارض", student: "طالب" };
      quickRoleBadge.textContent = roleMap[currentUser.role] || "مشارك";
    }
    // حفظ الشاشة الحالية فوراً لضمان البقاء في نفس الشاشة عند تحديث الصفحة
    localStorage.setItem("nour_saved_view", viewName);
  } else {
    userQuickStatus?.classList.add("hidden");
    if (viewName === "hero" || viewName === "login") {
      localStorage.removeItem("nour_saved_view");
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (viewName === "student") {
    try { renderStudentPracticeQuizzes(); } catch (e) {}
    try { renderLiveRoomsList(); } catch (e) {}
  }

  // تحديث مباشر من السحابة عند التبديل بين الشاشات
  if (viewName !== "hero" && viewName !== "login") {
    loadCloudData();
  }
}

// تبديل تبويبات لوحة التحكم مع التحديث الفوري المباشر من Firestore وحفظ التبويب
document.querySelectorAll(".nav-tab").forEach(tabBtn => {
  tabBtn.addEventListener("click", async () => {
    const targetTabId = tabBtn.getAttribute("data-tab");
    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content-panel").forEach(p => p.classList.remove("active"));
    tabBtn.classList.add("active");
    document.getElementById(targetTabId)?.classList.add("active");

    // حفظ التبويب النشط حالياً للبقاء عليه عند تحديث الصفحة
    localStorage.setItem("nour_saved_tab", targetTabId);

    // تحديث فوري مباشر من السحابة فور الضغط على أي تبويب
    await loadCloudData();
  });
});

// --------------------------------------------------------
// تحميل وتهيئة البيانات المحلية والسحابية (خالية من أي بيانات وهمية)
// --------------------------------------------------------
function loadInitialStorage() {
  // المدارس المعتمدة
  try {
    const savedSchools = localStorage.getItem("nour_schools");
    schoolsCache = savedSchools ? JSON.parse(savedSchools) : [...DEFAULT_SCHOOLS];
  } catch (e) {
    schoolsCache = [...DEFAULT_SCHOOLS];
  }
  if (!schoolsCache || !Array.isArray(schoolsCache) || schoolsCache.length === 0) {
    schoolsCache = [...DEFAULT_SCHOOLS];
    localStorage.setItem("nour_schools", JSON.stringify(schoolsCache));
  }
  
  // الفئات المعتمدة
  try {
    const savedGrades = localStorage.getItem("nour_grades");
    gradesCache = savedGrades ? JSON.parse(savedGrades) : [...DEFAULT_GRADES];
  } catch (e) {
    gradesCache = [...DEFAULT_GRADES];
  }
  if (!gradesCache || !Array.isArray(gradesCache) || gradesCache.length === 0) {
    gradesCache = [...DEFAULT_GRADES];
    localStorage.setItem("nour_grades", JSON.stringify(gradesCache));
  }

  // الحسابات (المشرف العام هو المعتمد)
  try {
    const savedUsers = localStorage.getItem("nour_participants");
    participantsCache = savedUsers ? JSON.parse(savedUsers) : [];
  } catch (e) {
    participantsCache = [];
  }

  // التأكد من وجود المشرف العام محمد منتصر محمد يونس دائماً
  const supNorm = normalizeArabic(MASTER_SUPERVISOR_NAME);
  const supExists = participantsCache.find(p => p.normalizedName === supNorm);
  if (!supExists) {
    participantsCache.unshift({
      id: getDocumentId(supNorm),
      name: MASTER_SUPERVISOR_NAME,
      normalizedName: supNorm,
      role: "supervisor",
      school: "مدرسة نور البيان المركزية",
      grade: "جميع الفئات",
      firstLoginAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      loginCount: 1
    });
    saveParticipants();
  }

  // الاختبارات: تبدأ من كاش الذاكرة المحلية كعرض فوري ريثما يكتمل الاتصال السحابي مباشرة
  try {
    localStorage.removeItem("nour_deleted_quizzes");
    const savedQuizzes = localStorage.getItem("nour_quizzes");
    if (savedQuizzes) {
      const parsed = JSON.parse(savedQuizzes);
      quizzesCache = Array.isArray(parsed) ? parsed.map(normalizeQuizFromCloud) : [];
    } else {
      quizzesCache = INITIAL_QUIZZES.map(normalizeQuizFromCloud);
    }
  } catch (e) {
    quizzesCache = INITIAL_QUIZZES.map(normalizeQuizFromCloud);
  }

  // الغرف الحية: تبدأ من الذاكرة المؤقتة وتُقرأ مباشرة ولحظياً من Firestore
  try {
    const savedRooms = localStorage.getItem("nour_rooms");
    activeRooms = savedRooms ? JSON.parse(savedRooms) : [];
  } catch (e) {
    activeRooms = [];
  }

  // لوحة الشرف: تبدأ من الذاكرة المؤقتة وتُقرأ مباشرة من Firestore
  try {
    const savedHonor = localStorage.getItem("nour_honor_board");
    honorLeaderboardCache = savedHonor ? JSON.parse(savedHonor) : [];
  } catch (e) {
    honorLeaderboardCache = [];
  }

  updateDropdowns();
}

// دالة توحيد وتطبيع بيانات الاختبار الواردة من السحابة أو الكاش
function normalizeQuizFromCloud(q) {
  if (!q) return q;
  const normalized = { ...q };
  if (Array.isArray(normalized.sections)) {
    normalized.sections = normalized.sections.map(sec => {
      if (!sec) return sec;
      const cleanSec = { ...sec };
      if (Array.isArray(cleanSec.questions)) {
        cleanSec.questions = cleanSec.questions.map(question => {
          if (!question) return question;
          const cleanQ = { ...question };
          if (Array.isArray(cleanQ.pairs)) {
            cleanQ.pairs = cleanQ.pairs.map(p => {
              if (Array.isArray(p)) return p;
              if (p && typeof p === "object") {
                return [p.left !== undefined ? String(p.left) : "", p.right !== undefined ? String(p.right) : ""];
              }
              return ["", ""];
            });
          }
          return cleanQ;
        });
      }
      return cleanSec;
    });
  }
  return normalized;
}

// دالة تطهير الكائنات قبل إرسالها لـ Firestore لحذف أي undefined ومعالجة المصفوفات المتداخلة منعاً لرفض السحابة
function sanitizeForFirestore(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => {
      // فايربيس تمنع المصفوفات المتداخلة (Nested Arrays مثل pairs: [["a","b"]]).
      // نحول كل زوج متداخل لكائن خفيف {left, right} يقبله فايربيس فوراً دون أي خطأ
      if (Array.isArray(item)) {
        return {
          left: item[0] !== undefined ? String(item[0]) : "",
          right: item[1] !== undefined ? String(item[1]) : ""
        };
      }
      return sanitizeForFirestore(item);
    });
  }
  if (typeof obj === "object" && obj.constructor === Object) {
    const clean = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        clean[key] = sanitizeForFirestore(val);
      }
    }
    return clean;
  }
  return obj;
}

function saveParticipants(userToSync = null) {
  localStorage.setItem("nour_participants", JSON.stringify(participantsCache));
  if (userToSync && userToSync.id) {
    syncParticipantToCloud(userToSync);
  }
}

function saveSchools() {
  localStorage.setItem("nour_schools", JSON.stringify(schoolsCache));
  syncSchoolsAndGradesToCloud();
}

function saveGrades() {
  localStorage.setItem("nour_grades", JSON.stringify(gradesCache));
  syncSchoolsAndGradesToCloud();
}

async function saveQuizzes(quizToSync = null) {
  try {
    localStorage.setItem("nour_quizzes", JSON.stringify(quizzesCache));
    localStorage.setItem("nour_quizzes_init_done", "true");
  } catch (e) {
    console.warn("Local storage saveQuizzes error:", e);
  }

  if (quizToSync && quizToSync.id) {
    const syncId = String(quizToSync.id);
    const now = Date.now();
    recentLocalQuizUpdates.set(syncId, now);
    await syncQuizToCloud(quizToSync);
  }
}

async function saveRooms(roomToSync = null) {
  cleanGhostRooms();
  if (roomToSync && roomToSync.id) {
    // تحديث محلي سريع
    const idx = activeRooms.findIndex(r => r.id === roomToSync.id);
    if (idx >= 0) {
      activeRooms[idx] = { ...activeRooms[idx], ...roomToSync };
    } else {
      activeRooms.unshift(roomToSync);
    }
    await syncRoomToCloud(roomToSync);
  }
}

// --------------------------------------------------------
// وظائف المزامنة السحابية الشاملة مع فايربيس (Firestore Cloud Sync)
// --------------------------------------------------------
async function syncParticipantToCloud(user) {
  try {
    const userRef = doc(db, "participants", user.id);
    const cleanUser = sanitizeForFirestore(user);
    await setDoc(userRef, {
      ...cleanUser,
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.warn("Firestore participant sync notice:", e);
  }
}

async function syncSchoolsAndGradesToCloud() {
  try {
    const settingsRef = doc(db, "system_settings", "schools_and_grades");
    await setDoc(settingsRef, {
      schools: sanitizeForFirestore(schoolsCache),
      grades: sanitizeForFirestore(gradesCache),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.warn("Firestore schools/grades sync notice:", e);
  }
}

async function syncQuizToCloud(quizObj, isDelete = false) {
  const quizRef = doc(db, "quizzes", String(quizObj.id));
  if (isDelete) {
    await deleteDoc(quizRef);
  } else {
    const cleanQuiz = sanitizeForFirestore(quizObj);
    const now = Date.now();
    await setDoc(quizRef, {
      ...cleanQuiz,
      id: String(quizObj.id),
      updatedAt: cleanQuiz.updatedAt || now,
      lastUpdated: serverTimestamp()
    });
  }
}

async function syncRoomToCloud(roomObj, isDelete = false) {
  try {
    const roomRef = doc(db, "live_rooms", roomObj.id);
    if (isDelete) {
      await deleteDoc(roomRef);
    } else {
      const cleanRoom = sanitizeForFirestore(roomObj);
      await setDoc(roomRef, {
        ...cleanRoom,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    }
  } catch (e) {
    console.warn("Firestore room sync notice:", e);
  }
}

async function syncHonorBoardToCloud() {
  try {
    const honorRef = doc(db, "system_settings", "honor_board");
    await setDoc(honorRef, {
      entries: sanitizeForFirestore(honorLeaderboardCache),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.warn("Firestore honor board sync notice:", e);
  }
}

// التحقق من صحة بيانات الغرف دون حذف الغرف الحقيقية المنشأة من المعلمين أو المشرفين
function cleanGhostRooms() {
  activeRooms.forEach(r => {
    if (r && !Array.isArray(r.users)) {
      r.users = r.leaderName ? [r.leaderName] : (r.creatorName ? [r.creatorName] : []);
    }
  });
}

// --------------------------------------------------------
// مستمعو البيانات السحابية الحية الفورية (Firestore Realtime onSnapshot)
// --------------------------------------------------------
let realtimeListenersInitialized = false;
let previousRoomsMap = new Map();
let isFirstRoomsSnapshot = true;
let previousQuizzesMap = new Map();
let isFirstQuizzesSnapshot = true;
let syncPillTimer = null;

function showRealtimeSyncPill(text = "تم استلام تحديث جديد من السحابة وتحديث البيانات فورياً ✓") {
  const pill = document.getElementById("realtimeSyncPill");
  const textEl = document.getElementById("realtimeSyncText");
  if (!pill) return;
  if (textEl) textEl.textContent = text;
  pill.classList.remove("hidden");
  if (syncPillTimer) clearTimeout(syncPillTimer);
  syncPillTimer = setTimeout(() => {
    pill.classList.add("hidden");
    syncPillTimer = null;
  }, 3500);
}

function showLiveBroadcastBanner(room) {
  if (!room) return;
  if (currentLiveRoom && currentLiveRoom.id === room.id && views.liveArena && !views.liveArena.classList.contains("hidden")) {
    return;
  }
  const banner = document.getElementById("liveRoomBroadcastBanner");
  const titleEl = document.getElementById("broadcastRoomTitle");
  const metaEl = document.getElementById("broadcastRoomMeta");
  const joinBtn = document.getElementById("btnJoinBroadcastRoom");
  const closeBtn = document.getElementById("btnCloseBroadcastBanner");
  if (!banner) return;

  if (titleEl) titleEl.textContent = `🔴 بدأت مسابقة حية جديدة الآن: «${room.name}»`;
  if (metaEl) metaEl.textContent = `بإشراف: ${room.leaderName || room.creatorName || 'المشرف'} | ${(room.users || []).length} متواجد حالياً`;
  
  if (joinBtn) {
    joinBtn.onclick = () => {
      banner.classList.add("hidden");
      joinLiveRoom(room);
    };
  }
  if (closeBtn) {
    closeBtn.onclick = () => {
      banner.classList.add("hidden");
    };
  }

  banner.classList.remove("hidden");
}

function hideLiveBroadcastBanner() {
  const banner = document.getElementById("liveRoomBroadcastBanner");
  if (banner) banner.classList.add("hidden");
}

function setupRealtimeCloudListeners() {
  if (realtimeListenersInitialized) return;
  realtimeListenersInitialized = true;

  try {
    // 1. مراقبة المدارس والصفوف لحظياً وبشكل فوري
    const sgRef = doc(db, "system_settings", "schools_and_grades");
    onSnapshot(sgRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        let changed = false;
        if (Array.isArray(data.schools) && data.schools.length > 0) {
          schoolsCache = [...data.schools];
          localStorage.setItem("nour_schools", JSON.stringify(schoolsCache));
          changed = true;
        }
        if (Array.isArray(data.grades) && data.grades.length > 0) {
          gradesCache = [...data.grades];
          localStorage.setItem("nour_grades", JSON.stringify(gradesCache));
          changed = true;
        }
        if (changed) {
          updateDropdowns();
          renderSchoolsAndGradesTags();
          if (loginStepSchool && !loginStepSchool.classList.contains("hidden")) {
            showOnboardingSchoolStep();
          }
          if (loginStepGrade && !loginStepGrade.classList.contains("hidden")) {
            showOnboardingGradeStep();
          }
          showRealtimeSyncPill("⚡ تم تحديث قائمة المدارس والصفوف من السحابة");
        }
      }
    }, (err) => {
      console.warn("Realtime schools/grades notice:", err);
    });

    // 2. مراقبة الحسابات وقائمة المشاركين لحظياً وبشكل فوري
    const partCol = collection(db, "participants");
    onSnapshot(partCol, (snapshot) => {
      const cloudUsers = [];
      snapshot.forEach(docSnap => {
        const uData = docSnap.data();
        cloudUsers.push({
          id: docSnap.id,
          ...uData,
          normalizedName: uData.normalizedName || normalizeArabic(uData.name || "")
        });
      });
      const supNorm = normalizeArabic(MASTER_SUPERVISOR_NAME);
      if (!cloudUsers.some(p => p.normalizedName === supNorm)) {
        cloudUsers.unshift({
          id: getDocumentId(supNorm),
          name: MASTER_SUPERVISOR_NAME,
          normalizedName: supNorm,
          role: "supervisor",
          school: "مدرسة نور البيان المركزية",
          grade: "جميع الفئات",
          firstLoginAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          loginCount: 1
        });
      }
      participantsCache = cloudUsers;
      localStorage.setItem("nour_participants", JSON.stringify(participantsCache));

      // الحفاظ على جلسة المستخدم الحالي وتحديث بياناته وترقيته فورياً دون الحاجة لتحديث الصفحة
      if (currentUser) {
        const matchingCurrent = cloudUsers.find(p => 
          p.id === currentUser.id || 
          p.normalizedName === currentUser.normalizedName || 
          p.name === currentUser.name
        );
        if (matchingCurrent) {
          const oldRole = currentUser.role;
          const newRole = matchingCurrent.role;
          currentUser = { ...currentUser, ...matchingCurrent };
          localStorage.setItem("active_quran_user", JSON.stringify(currentUser));
          localStorage.setItem("nour_saved_user", JSON.stringify(currentUser));

          if (newRole && oldRole && newRole !== oldRole) {
            const roleArabicNames = {
              teacher: "معلم معتمد",
              supervisor: "مشرف مسابقة",
              presenter: "عارض المسرح الحي",
              student: "طالب مشارك"
            };
            const newRoleName = roleArabicNames[newRole] || newRole;
            showGlobalLoader("تهانينا! تم تحديث رتبتك...", `تمت ترقيتك سحابياً إلى (${newRoleName})! جاري فتح واجهتك الجديدة فورياً...`);
            try { soundFX.celebrate(); } catch (e) {}

            setTimeout(() => {
              hideGlobalLoader();
              finalizeUserSession(currentUser, true);
              showToast(`🌟 مبارك! أصبحت الآن (${newRoleName}) وتم فتح الواجهة الخاصة بك فورياً دون الحاجة لتحديث الصفحة!`, "fa-award", 4500);
            }, 900);
          }
        }
      }

      renderAccountsTable();
      if (currentUser && (currentUser.role === "supervisor" || currentUser.role === "teacher" || currentUser.role === "presenter")) {
        renderSupervisorDashboard();
      }
    }, (err) => {
      console.warn("Realtime participants notice:", err);
    });

    // 3. مراقبة بنك الأسئلة والاختبارات لحظياً وبشكل فوري لجميع المستخدمين
    const quizCol = collection(db, "quizzes");
    onSnapshot(quizCol, (snapshot) => {
      const cloudQuizzes = [];

      snapshot.forEach(docSnap => {
        const docId = String(docSnap.id);
        const qData = normalizeQuizFromCloud({ ...docSnap.data(), id: docId });
        cloudQuizzes.push(qData);
      });

      // رصد التحديثات اللحظية والتغييرات الصادرة من أي مشرف أو معلم
      if (!isFirstQuizzesSnapshot) {
        snapshot.docChanges().forEach(change => {
          const changedDoc = change.doc.data();
          const changedId = String(change.doc.id);
          const changedTitle = changedDoc?.title || "اختبار";
          const modifier = changedDoc?.lastModifiedBy || "المشرف";

          if (change.type === "added" && !previousQuizzesMap.has(changedId)) {
            showToast(`📚 اختبار جديد: «${changedTitle}» (بواسطة ${modifier})`, "fa-book-quran", 3500);
            showRealtimeSyncPill(`⚡ أضاف ${modifier} اختباراً جديداً: «${changedTitle}»`);
          } else if (change.type === "modified") {
            showToast(`✏️ تم تحديث الاختبار: «${changedTitle}» فورياً للجميع!`, "fa-pen-to-square", 3500);
            showRealtimeSyncPill(`⚡ تم تحديث الاختبار «${changedTitle}» في الوقت الفعلي ✓`);
          } else if (change.type === "removed") {
            showToast(`🗑️ تم حذف الاختبار: «${changedTitle}» من السحابة`, "fa-trash", 3000);
          }
        });
      }

      previousQuizzesMap = new Map(cloudQuizzes.map(q => [String(q.id), q]));
      isFirstQuizzesSnapshot = false;

      quizzesCache = cloudQuizzes;
      localStorage.setItem("nour_quizzes", JSON.stringify(quizzesCache));
      renderQuizzesList();
      renderStudentPracticeQuizzes();
      updateDropdowns();
      if (statActiveQuizzes) statActiveQuizzes.textContent = quizzesCache.length;
    }, (err) => {
      console.warn("Realtime quizzes notice:", err);
    });

    // 4. مراقبة غرف المسابقات الحية لحظياً — Firestore هو المصدر الوحيد للحقيقة
    const roomsCol = collection(db, "live_rooms");
    onSnapshot(roomsCol, (snapshot) => {
      const cloudRooms = [];
      snapshot.forEach(docSnap => {
        const rData = docSnap.data();
        cloudRooms.push({ id: docSnap.id, ...rData });
      });

      // رصد فوري للغرف التي بدأت الآن دون الحاجة لأي تحديث يدوي للصفحة
      if (!isFirstRoomsSnapshot) {
        const newlyAdded = cloudRooms.filter(r => !previousRoomsMap.has(r.id));
        if (newlyAdded.length > 0) {
          const roomStarted = newlyAdded[0];
          // إشعار المستخدمين الآخرين فقط حتى لا يتكرر التنبيه لمنشئ الغرفة
          if (!currentUser || (currentUser.name !== roomStarted.creatorName && currentUser.name !== roomStarted.leaderName)) {
            showLiveBroadcastBanner(roomStarted);
            showToast(`🔴 بدأت غرفة مسابقة جديدة الآن: «${roomStarted.name}»`, "fa-tower-broadcast");
            showRealtimeSyncPill("⚡ تم رصد غرفة مسابقة جديدة وبدء الفعالية في السحابة فوراً!");
          }
        }

        // فحص تغير مراحل الغرف
        cloudRooms.forEach(cr => {
          const prev = previousRoomsMap.get(cr.id);
          if (prev) {
            if (prev.phase !== cr.phase) {
              if (currentLiveRoom && currentLiveRoom.id === cr.id) {
                const phaseLabels = {
                  lobby: "غرفة الانتظار",
                  select: "اختيار المتسابق",
                  draw: "سحب الأسئلة والقرعة",
                  competing: "المسرح الحي وعرض الأسئلة"
                };
                showToast(`🔔 انتقلت المسابقة لمرحلة: ${phaseLabels[cr.phase] || cr.phase}`, "fa-bolt");
              }
              showRealtimeSyncPill(`⚡ تحديث مباشر: المسابقة «${cr.name}» قيد التشغيل`);
            }
            if (!prev.contestantName && cr.contestantName) {
              if (currentLiveRoom && currentLiveRoom.id === cr.id) {
                showToast(`👤 المتسابق المختار الآن: ${cr.contestantName}`, "fa-user-check");
              }
            }
          }
        });
      }

      previousRoomsMap = new Map(cloudRooms.map(r => [r.id, r]));
      isFirstRoomsSnapshot = false;

      activeRooms = cloudRooms;
      renderLiveRoomsList();

      // إذا كان المستخدم الحالي متواجداً داخل غرفة مسابقة
      if (currentLiveRoom) {
        const updatedRoom = activeRooms.find(r => r.id === currentLiveRoom.id);
        if (!updatedRoom) {
          const wasInArena = views.liveArena && !views.liveArena.classList.contains("hidden");
          currentLiveRoom = null;
          currentContestant = null;
          localStorage.removeItem("nour_saved_room_id");
          clearInterval(liveTimerInterval);
          clearInterval(cardsTimerInterval);
          stopOfflineCountdown();

          if (wasInArena) {
            showView(currentUser ? (currentUser.role === 'student' ? "student" : "supervisor") : "hero");
            showToast("قام المشرف بإغلاق الغرفة أو إنهاء المسابقة", "fa-door-closed");
          }
        } else {
          currentLiveRoom = updatedRoom;
          if (views.liveArena && !views.liveArena.classList.contains("hidden")) {
            updateArenaUIRealtime(updatedRoom);
          }
        }
      }
    }, (err) => {
      console.warn("Realtime rooms notice:", err);
    });

    // 5. مراقبة لوحة الشرف لحظياً
    const honorRef = doc(db, "system_settings", "honor_board");
    onSnapshot(honorRef, (snap) => {
      if (snap.exists()) {
        const hData = snap.data();
        if (Array.isArray(hData.entries)) {
          honorLeaderboardCache = hData.entries;
          renderHonorLeaderboard();
          renderHonorLeaderboardTab();
        }
      }
    }, (err) => {
      console.warn("Realtime honor board notice:", err);
    });

  } catch (e) {
    console.warn("Setup realtime cloud listeners notice:", e);
  }
}

// --------------------------------------------------------
// مستمع غرفة المسابقة الحية اللحظي المباشر (Dedicated Room Document Listener)
// --------------------------------------------------------
function listenToActiveRoom(roomId) {
  if (currentRoomUnsubscribe) {
    currentRoomUnsubscribe();
    currentRoomUnsubscribe = null;
  }

  const roomRef = doc(db, "live_rooms", roomId);
  currentRoomUnsubscribe = onSnapshot(roomRef, (docSnap) => {
    if (!docSnap.exists()) {
      const wasInArena = views.liveArena && !views.liveArena.classList.contains("hidden");
      currentLiveRoom = null;
      currentContestant = null;
      localStorage.removeItem("nour_saved_room_id");
      clearInterval(liveTimerInterval);
      clearInterval(cardsTimerInterval);
      stopOfflineCountdown();

      if (currentRoomUnsubscribe) {
        currentRoomUnsubscribe();
        currentRoomUnsubscribe = null;
      }

      if (wasInArena) {
        showView(currentUser ? (currentUser.role === 'student' ? "student" : "supervisor") : "hero");
        showToast("قام المشرف بإغلاق الغرفة أو إنهاء المسابقة نهائياً", "fa-door-closed");
      }
      return;
    }

    const roomData = { id: docSnap.id, ...docSnap.data() };
    const prevUsers = Array.isArray(lastKnownUsersList) ? [...lastKnownUsersList] : [];
    const newUsers = Array.isArray(roomData.users) ? roomData.users : [];
    lastKnownUsersList = [...newUsers];

    // رصد وتنبيه فوري عند انضمام أي متسابق أو معلم جديد على الهواء مباشرة
    if (prevUsers.length > 0 && newUsers.length > prevUsers.length) {
      const joinedUsers = newUsers.filter(u => !prevUsers.includes(u));
      joinedUsers.forEach(u => {
        if (!currentUser || u !== currentUser.name) {
          showToast(`🟢 انضم «${u}» إلى الغرفة الآن!`, "fa-user-plus");
          showRealtimeSyncPill(`⚡ انضم متسابق جديد للغرفة: ${u}`);
        }
      });
    }

    // رصد مغادرة أي عضو
    if (prevUsers.length > newUsers.length) {
      const leftUsers = prevUsers.filter(u => !newUsers.includes(u));
      leftUsers.forEach(u => {
        if (!currentUser || u !== currentUser.name) {
          showToast(`🚪 غادر «${u}» الغرفة`, "fa-user-minus");
        }
      });
    }

    currentLiveRoom = roomData;
    updateArenaUIRealtime(roomData);
  }, (err) => {
    console.warn("Active room snapshot notice:", err);
  });
}

// متغيرات مزامنة الأنيميشن السحابي اللحظي للغرف الحية بين المشرف والمعلمين والعارض
let lastSeenDrawAnimTimestamp = 0;
let isSectionDrawAnimating = false;
let currentDrawInterval = null;
let currentDrawTimeout = null;
let lastSeenAnswerTimestamp = 0;
let lastSeenMatchingVerifyTimestamp = 0;
let lastSeenOrderingTimestamp = 0;
let lastSeenCardsTurnTimestamp = 0;
let lastSeenCardUsedTimestamp = 0;
let lastSeenWalletSyncTimestamp = 0;
let lastSeenCardChosenTimestamp = 0;
let isQuestionTransitionRunning = false;
let lastKnownSolverRole = null;
let currentUserProfileUnsubscribe = null;

// الاستماع اللحظي لتغييرات وترقيات حساب المستخدم الحالي في السحابة
function listenToCurrentUserProfile(userId) {
  if (currentUserProfileUnsubscribe) {
    currentUserProfileUnsubscribe();
    currentUserProfileUnsubscribe = null;
  }
  if (!userId || !db) return;
  try {
    currentUserProfileUnsubscribe = onSnapshot(doc(db, "participants", userId), (snap) => {
      if (snap.exists() && currentUser) {
        const liveUser = { id: snap.id, ...snap.data() };
        if (liveUser.role && liveUser.role !== currentUser.role) {
          const oldRole = currentUser.role;
          const newRole = liveUser.role;
          currentUser = { ...currentUser, ...liveUser };
          localStorage.setItem("active_quran_user", JSON.stringify(currentUser));
          localStorage.setItem("nour_saved_user", JSON.stringify(currentUser));

          const roleArabicNames = {
            teacher: "معلم معتمد",
            supervisor: "مشرف مسابقة",
            presenter: "عارض المسرح الحي",
            student: "طالب مشارك"
          };
          const newRoleName = roleArabicNames[newRole] || newRole;

          showGlobalLoader("تهانينا! تم تحديث رتبتك...", `تمت ترقيتك سحابياً إلى (${newRoleName})! جاري فتح واجهتك فورياً...`);
          try { soundFX.celebrate(); } catch (e) {}

          setTimeout(() => {
            hideGlobalLoader();
            finalizeUserSession(currentUser, true);
            showToast(`🌟 مبارك! أصبحت الآن (${newRoleName}) وتم فتح الواجهة الخاصة بك فورياً دون الحاجة لتحديث الصفحة!`, "fa-award", 4500);
          }, 1000);
        }
      }
    }, (err) => {
      console.warn("User profile live listener notice:", err);
    });
  } catch (e) {
    console.warn("Could not setup profile listener:", e);
  }
}

// فحص دقيق لمن يمكنه الحل والإجابة في المسرح الحي
function canCurrentUserSolveQuestion() {
  return checkIsSolverAllowed(currentLiveRoom);
}

// تحديث واجهة المسرح الحي عند وصول تحديث سحابي من Firestore
function updateArenaUIRealtime(room) {
  if (!room) return;
  // حفظ وتحديث بيانات الغرفة الحالية فورياً لجميع الأدوار لمنع فقدان المزامنة
  currentLiveRoom = { ...(currentLiveRoom || {}), ...room };
  if (room.quizData && room.quizData.sections) {
    currentQuizData = room.quizData;
  }
  if (room.sectionCounts && typeof room.sectionCounts === 'object') {
    currentLiveRoom.sectionCounts = { ...room.sectionCounts };
  }

  if (arenaRoomTitle) arenaRoomTitle.textContent = room.name;
  if (arenaRoomCode) arenaRoomCode.textContent = `#${room.id}`;
  if (arenaCurrentLeaderName) arenaCurrentLeaderName.textContent = room.leaderName || MASTER_SUPERVISOR_NAME;

  const usersList = Array.isArray(room.users) ? room.users : [];
  if (arenaConnectedCount) arenaConnectedCount.textContent = usersList.length;
  if (arenaLobbyUsersCount) arenaLobbyUsersCount.textContent = usersList.length;

  // تحديد صفة المستخدم ودوره الحالي بدقة
  const isMasterSupervisorUser = currentUser && isSupervisor(currentUser.name);
  const isRoomCreator = currentUser && (currentUser.name === room.creatorName || currentUser.name === room.leaderName);
  const isTeacherLeading = currentUser && currentUser.role === "teacher" && (
    isRoomCreator || room.leaderName === currentUser.name || !usersList.some(u => isSupervisor(u))
  );
  const isLead = isMasterSupervisorUser || isRoomCreator || isTeacherLeading || (currentUser && currentUser.role === "supervisor");

  if (arenaUserRolePill) {
    if (isMasterSupervisorUser) {
      arenaUserRolePill.textContent = "المشرف العام المعتمد";
      arenaUserRolePill.className = "role-pill-live";
    } else if (isLead && currentUser?.role === 'teacher') {
      arenaUserRolePill.textContent = "المعلم قائد المسابقة";
      arenaUserRolePill.className = "role-pill-live";
    } else if (isLead) {
      arenaUserRolePill.textContent = "مشرف الغرفة المعتمد";
      arenaUserRolePill.className = "role-pill-live";
    } else if (currentUser?.role === 'presenter') {
      arenaUserRolePill.textContent = "العارض (شاشة العرض)";
      arenaUserRolePill.className = "role-pill-live";
    } else if (currentUser?.role === 'student') {
      arenaUserRolePill.textContent = "طالب متسابق";
      arenaUserRolePill.className = "role-pill-live";
    } else {
      arenaUserRolePill.textContent = "لجنة المعلمين والتحكيم";
      arenaUserRolePill.className = "role-pill-live";
    }
  }

  // التحكم في ظهور زر بدء المسابقة للقائد فقط مقابل رسالة الانتظار للآخرين
  if (btnStartLiveContest && arenaLobbyWaitingForLeader) {
    if (isLead) {
      btnStartLiveContest.classList.remove("hidden");
      arenaLobbyWaitingForLeader.classList.add("hidden");
    } else {
      btnStartLiveContest.classList.add("hidden");
      arenaLobbyWaitingForLeader.classList.remove("hidden");
      if (arenaWaitingLeaderName) {
        arenaWaitingLeaderName.textContent = room.leaderName || MASTER_SUPERVISOR_NAME;
      }
    }
  }

  // ملء قائمة المتواجدين في اللوبي مع الشارات والأسماء
  if (arenaConnectedUsersList) {
    arenaConnectedUsersList.innerHTML = usersList.map(u => {
      const isCurrent = currentUser && currentUser.name === u;
      const isRoomLead = u === room.leaderName || isSupervisor(u);
      const participant = participantsCache.find(p => p.name === u || p.normalizedName === normalizeArabic(u));
      let roleLabel = "عضو";
      let roleClass = "teacher";
      if (isRoomLead) {
        roleLabel = "مشرف";
        roleClass = "supervisor";
      } else if (participant?.role === "student") {
        roleLabel = "طالب";
        roleClass = "student";
      } else if (participant?.role === "presenter") {
        roleLabel = "عارض";
        roleClass = "presenter";
      } else if (participant?.role === "teacher") {
        roleLabel = "معلم";
        roleClass = "teacher";
      }

      return `
        <div class="user-tag-lobby ${isCurrent ? 'is-me' : ''}">
          <i class="fa-solid fa-circle-user" style="color: ${isCurrent ? '#16a34a' : 'var(--duo-blue)'};"></i>
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${u} ${isCurrent ? '<small style="color: #16a34a; font-weight: 800;">(أنت)</small>' : ''}</span>
          ${isRoomLead ? '<i class="fa-solid fa-crown" style="color: #ca8a04; margin-right: 4px;" title="مشرف الغرفة"></i>' : ''}
          <span class="user-role-badge-small ${roleClass}">${roleLabel}</span>
        </div>
      `;
    }).join("");
  }

  // ── تهيئة نمط العارض (Presenter Mode) ──
  if (currentUser?.role === 'presenter') {
    document.body.classList.add("role-presenter");
  } else {
    document.body.classList.remove("role-presenter");
  }

  // ── تغيير المرحلة بناءً على بيانات Firestore لجميع المشاركين ──
  const isInArena = views.liveArena && !views.liveArena.classList.contains("hidden");
  if (!isInArena) return;

  const phase = room.phase;
  if (!phase || phase === "lobby") {
    showArenaPhase("lobby");
    return;
  }

  if (phase === "select") {
    showArenaPhase("select");
    if (isLead) {
      supervisorStudentSelectView?.classList.remove("hidden");
      teacherStudentWaitView?.classList.add("hidden");
    } else {
      supervisorStudentSelectView?.classList.add("hidden");
      teacherStudentWaitView?.classList.remove("hidden");
      if (room.contestantName) {
        selectedStudentReveal?.classList.remove("hidden");
        if (revealStudentName) revealStudentName.textContent = room.contestantName;
        if (revealStudentMeta) revealStudentMeta.textContent = `${room.contestantSchool || ''} | ${room.contestantGrade || ''}`;
      } else {
        selectedStudentReveal?.classList.add("hidden");
      }
    }
  } else if (phase === "draw") {
    showArenaPhase("draw");
    if (drawPhaseStudentLabel) {
      drawPhaseStudentLabel.textContent = `المتسابق: ${room.contestantName || '--'}`;
    }

    // عرض أقسام الاختبار وسحب الأسئلة لجميع الأدوار (المعلم والعارض والمشرف)
    const quiz = (room.quizData && room.quizData.sections) ? room.quizData : (quizzesCache.find(q => q.id === room.quizId) || quizzesCache[0]);
    if (quiz) {
      currentQuizData = quiz;
      const secList = Array.isArray(quiz.sections) ? quiz.sections : [];
      const totalInQuiz = secList.reduce((a, s) => a + (Array.isArray(s?.questions) ? s.questions.length : 0), 0);
      const perStudent = room.questionsPerStudent || (totalInQuiz || 5);
      const drawn = Array.isArray(room.drawnQuestions) ? room.drawnQuestions : [];

      // مزامنة أعداد الأسئلة المختارة للأقسام سحابياً للجميع
      if (room.sectionCounts && typeof room.sectionCounts === 'object') {
        currentLiveRoom.sectionCounts = room.sectionCounts;
      }

      // مزامنة لحظية لأنيميشن سحب الأسئلة قسم بقسم مع المشرف لجميع المشاركين
      if (room.drawAnimation && room.drawAnimation.timestamp > lastSeenDrawAnimTimestamp) {
        lastSeenDrawAnimTimestamp = room.drawAnimation.timestamp;
        if (!isLead) {
          playSynchronizedSectionDraw(quiz, room.drawAnimation.drawnQuestions || drawn, false);
          return;
        }
      }

      // إذا كان أنيميشن السحب قيد التشغيل حالياً، لا نقاطع العرض
      if (isSectionDrawAnimating) return;

      // تحديث واجهة الأقسام مع إمكانية التحديد والتحكم للمشرف والتزامن للجميع
      if (typeof renderDrawSectionsList === "function") {
        renderDrawSectionsList();
      }

      const drawObserverStatusRow = document.getElementById("drawObserverStatusRow");
      const drawObserverStatusText = document.getElementById("drawObserverStatusText");

      if (isLead) {
        drawObserverStatusRow?.classList.add("hidden");
        if (room.drawnQuestions && room.drawnQuestions.length > 0) {
          drawActionsRow?.classList.add("hidden");
          drawResultActions?.classList.remove("hidden");
        } else {
          drawActionsRow?.classList.remove("hidden");
          drawResultActions?.classList.add("hidden");
        }
      } else {
        drawActionsRow?.classList.add("hidden");
        drawResultActions?.classList.add("hidden");
        drawObserverStatusRow?.classList.remove("hidden");
        if (room.drawnQuestions && room.drawnQuestions.length > 0) {
          if (drawObserverStatusText) {
            drawObserverStatusText.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #16a34a;"></i> تم سحب (${room.drawnQuestions.length}) سؤالاً بنجاح للمتسابق! في انتظار انطلاق المسابقة للمسرح...`;
          }
        } else {
          if (drawObserverStatusText) {
            drawObserverStatusText.innerHTML = `<i class="fa-solid fa-hourglass-half fa-spin" style="color: #ca8a04;"></i> في انتظار اختيار الأقسام وسحب الأسئلة من مشرف الجولة...`;
          }
        }
      }
    }

  } else if (phase === "competing") {
    showArenaPhase("stage");
    currentLiveRoom = room;

    // مزامنة صلاحية الحل الحالية في قائمة التحكم السريعة
    const stageSolverQuick = document.getElementById("stageSolverRoleQuickSelect");
    if (stageSolverQuick && room.solverRole) {
      stageSolverQuick.value = room.solverRole;
    }

    // مزامنة المؤقت اللحظي الموحد لجميع المشاركين (عارض، مشرف، طلاب، معلمون)
    if (room.timerState && typeof syncAndRunLiveTimer === "function") {
      syncAndRunLiveTimer(room.timerState);
    }

    // مزامنة حالة التوصيل اللحظية للجميع (Real-time Matching Sync)
    if (room.matchingState && room.matchingState.questionIdx === (room.currentQuestionIdx || 0)) {
      const conns = Array.isArray(room.matchingState.connections)
        ? room.matchingState.connections
        : (Array.isArray(room.matchingState.pairs) ? room.matchingState.pairs : []);

      if (room.matchingState.verifying && room.matchingState.startedAt > lastSeenMatchingVerifyTimestamp) {
        lastSeenMatchingVerifyTimestamp = room.matchingState.startedAt;
        if (!currentUser || room.matchingState.updatedBy !== currentUser.name) {
          if (typeof window.runExternalMatchingVerification === "function") {
            window.runExternalMatchingVerification(conns);
          }
        }
      } else if (!room.matchingState.verifying) {
        if (typeof window.syncExternalMatchingPairsUI === "function") {
          window.syncExternalMatchingPairsUI(conns);
        }
      }
    }

    // مزامنة ترتيب الجمل والكلمات اللحظية للجميع (Real-time Sentence/Words Ordering Sync)
    if (room.orderingState && room.orderingState.questionIdx === (room.currentQuestionIdx || 0)) {
      if (room.orderingState.timestamp > lastSeenOrderingTimestamp) {
        lastSeenOrderingTimestamp = room.orderingState.timestamp;
        if (!currentUser || room.orderingState.updatedBy !== currentUser.name) {
          if (room.orderingState.verifying) {
            if (typeof window.runExternalOrderingVerification === "function") {
              window.runExternalOrderingVerification(room.orderingState.placedWords);
            }
          } else {
            if (typeof window.syncExternalOrderingUI === "function") {
              window.syncExternalOrderingUI(room.orderingState.placedWords, room.orderingState.bankWords);
            }
          }
        }
      }
    }

    // مزامنة البطاقات التكتيكية الموحدة للجميع (Real-time Tactical Cards Sync)
    if (room.activeCardsTurn && room.activeCardsTurn.timestamp > lastSeenCardsTurnTimestamp) {
      lastSeenCardsTurnTimestamp = room.activeCardsTurn.timestamp;
      if (room.activeCardsTurn.isOpen && Array.isArray(room.activeCardsTurn.cards)) {
        showSynchronizedTacticalCardsModal(room.activeCardsTurn.cards, room.activeCardsTurn.nextIdx);
      } else if (!room.activeCardsTurn.isOpen) {
        if (room.activeCardsTurn.chosenCard) {
          applySynchronizedChosenCard(room.activeCardsTurn.chosenCard, room.activeCardsTurn.chosenBy, room.activeCardsTurn.nextIdx);
        } else if (room.activeCardsTurn.skipped) {
          clearInterval(cardsTimerInterval);
          tacticalCardsModal?.classList.add("hidden");
          showToast(`⏭️ تم تخطي البطاقات وإضافة +15 ثانية للوقت من قبل (${room.activeCardsTurn.chosenBy || 'المتسابق'})!`, "fa-hourglass-start", 3000);
          loadStageQuestion(room.activeCardsTurn.nextIdx ?? (room.currentQuestionIdx || 0));
        }
      }
    }

    // مزامنة محفظة البطاقات التكتيكية للمتسابق (Contestant Cards Wallet Sync)
    if (Array.isArray(room.contestantWallet)) {
      if (currentLiveRoom) currentLiveRoom.contestantWallet = room.contestantWallet;
      if (typeof updateContestantWalletUI === "function") {
        updateContestantWalletUI(room.contestantWallet);
      }
    }

    // مزامنة فتح وإغلاق محفظة البطاقات التكتيكية لحظياً لجميع الحضور (Wallet Open/Close Sync)
    if (room.walletSync && room.walletSync.timestamp > lastSeenWalletSyncTimestamp) {
      lastSeenWalletSyncTimestamp = room.walletSync.timestamp;
      const ws = room.walletSync;
      if (ws.isOpen) {
        if (!currentUser || ws.openedBy !== currentUser.name) {
          showToast(`🎴 قام (${ws.openedBy}) بفتح محفظة البطاقات التكتيكية للمتسابق!`, "fa-layer-group", 3500);
          if (typeof openSynchronizedWallet === "function") {
            openSynchronizedWallet(false, ws.openedBy);
          }
        }
      } else {
        if (!currentUser || ws.closedBy !== currentUser.name) {
          if (typeof closeSynchronizedWallet === "function") {
            closeSynchronizedWallet(false, ws.closedBy);
          }
        }
      }
    }

    // مزامنة اختيار بطاقة مع أنيميشن جميل لمدة ثانيتين للجميع ثم تفعيلها (2s Card Selection Sync)
    if (room.activeCardSelection && room.activeCardSelection.timestamp > lastSeenCardChosenTimestamp) {
      lastSeenCardChosenTimestamp = room.activeCardSelection.timestamp;
      const sel = room.activeCardSelection;
      const card = (typeof TACTICAL_CARDS !== "undefined" ? TACTICAL_CARDS.find(c => String(c.id) === String(sel.cardId)) : null) || {
        id: sel.cardId,
        title: sel.cardTitle,
        icon: sel.cardIcon || "fa-bolt",
        desc: sel.cardDesc,
        type: sel.cardType || "buff"
      };
      if (!currentUser || sel.chosenBy !== currentUser.name) {
        if (typeof trigger2SecondCardSelectionShowcase === "function") {
          trigger2SecondCardSelectionShowcase(card, sel.chosenBy, false);
        }
      }
    }

    // مزامنة تفعيل بطاقة من محفظة المتسابق (Real-time Card Used Sync)
    if (room.activeCardUsed && room.activeCardUsed.timestamp > lastSeenCardUsedTimestamp) {
      lastSeenCardUsedTimestamp = room.activeCardUsed.timestamp;
      if (typeof handleSynchronizedCardUsed === "function") {
        handleSynchronizedCardUsed(room.activeCardUsed.cardId, room.activeCardUsed.usedBy, room.activeCardUsed.contestantName);
      }
    }

    // فحص ما إذا كان هناك حدث إجابة جديد تم بثه من أي مصرح له بالحل (المتسابق، المعلم، العارض، المشرف)
    if (room.lastAnswerEvent && room.lastAnswerEvent.timestamp > lastSeenAnswerTimestamp) {
      lastSeenAnswerTimestamp = room.lastAnswerEvent.timestamp;
      const ev = room.lastAnswerEvent;
      // إذا كان الحدث صادراً من مستخدم آخر، يتم تنفيذه فوراً بالتزامن
      if (!currentUser || ev.answeredBy !== currentUser.name) {
        if (ev.contestantScore !== undefined) {
          contestantScore = ev.contestantScore;
          if (stageStudentScore) stageStudentScore.textContent = String(contestantScore);
        }

        if (ev.chosenChoiceIdx !== null && ev.chosenChoiceIdx !== undefined) {
          const clickedBtn = stageInteractiveArea.querySelector(`[data-choice="${ev.chosenChoiceIdx}"]`);
          if (clickedBtn) clickedBtn.classList.add(ev.isCorrect ? "correct" : "wrong");
          if (!ev.isCorrect) {
            const allQ = currentLiveRoom?.drawnQuestions || [];
            const curQ = allQ[ev.questionIdx];
            if (curQ && curQ.correct !== undefined) {
              const corBtn = stageInteractiveArea.querySelector(`[data-choice="${curQ.correct}"]`);
              if (corBtn) corBtn.classList.add("correct");
            }
          }
        } else if (ev.isTimeout && !ev.isCorrect) {
          const allQ = currentLiveRoom?.drawnQuestions || [];
          const curQ = allQ[ev.questionIdx];
          if (curQ && curQ.type === "mcq") {
            const btns = stageInteractiveArea.querySelectorAll(".btn-choice-duo");
            btns.forEach(b => {
              b.disabled = true;
              b.style.pointerEvents = "none";
            });
            if (curQ.correct !== undefined) {
              const corBtn = stageInteractiveArea.querySelector(`[data-choice="${curQ.correct}"]`);
              if (corBtn) corBtn.classList.add("correct");
            }
          }
        }

        const allQuestions = (currentLiveRoom?.drawnQuestions && currentLiveRoom.drawnQuestions.length > 0)
          ? currentLiveRoom.drawnQuestions
          : (currentQuizData?.sections?.flatMap(s => s.questions || []) || []);

        playQuestionTransitionSequence({
          isCorrect: ev.isCorrect,
          scoreDelta: ev.scoreDelta,
          isPenalty: ev.isPenalty,
          nextIdx: ev.questionIdx + 1,
          isFinished: (ev.questionIdx + 1) >= allQuestions.length,
          allQuestions: allQuestions,
          currentIdx: ev.questionIdx,
          isLeaderUser: false,
          isTimeout: !!ev.isTimeout
        });
        return;
      }
    }

    // إذا كانت هناك حركة انتقال جارية لدى المعلم أو العارض، نتركها تكمل بسلاسة
    if (isQuestionTransitionRunning) return;

    const newIdx = room.currentQuestionIdx || 0;
    const stageActive = arenaStage && !arenaStage.classList.contains("hidden");
    const solverRoleChanged = lastKnownSolverRole !== null && lastKnownSolverRole !== (room.solverRole || "contestant_and_lead");
    lastKnownSolverRole = room.solverRole || "contestant_and_lead";
    const needReload = !currentQuizData || !stageActive || (currentQuestionIndex !== newIdx) || (currentContestant?.name !== room.contestantName) || solverRoleChanged;

    if (needReload) {
      enterPhaseStage();
    } else {
      if (stageStudentScore) stageStudentScore.textContent = String(room.contestantScore || 0);
      contestantScore = room.contestantScore || 0;
    }

    // مزامنة تقييمات المعلمين السحابية لحظياً
    if (room.oralRatings) {
      roomTeachersRatings = { ...room.oralRatings };
      updateOralAverageUI();
    }

    // مزامنة تنبيه استشارة المعلم إن تم تفعيله
    if (room.activeTeacherHelp && room.activeTeacherHelp.timestamp) {
      if (lastSeenTeacherHelpTimestamp !== room.activeTeacherHelp.timestamp) {
        lastSeenTeacherHelpTimestamp = room.activeTeacherHelp.timestamp;
        showTeacherHelpModal(room.activeTeacherHelp.helperName, room.activeTeacherHelp.contestantName, room.activeTeacherHelp.cardTitle);
      }
    }
  }
}

// تحميل ومزامنة البيانات السحابية من فايربيس (اعتماد السحابة مع حماية كاملة ضد بطء الشبكة والانقطاع)
async function loadCloudData(forceServer = false) {
  const syncBtn = document.getElementById("btnHeaderCloudSync");
  const dot = syncBtn?.querySelector(".cloud-status-dot");
  if (syncBtn) syncBtn.classList.add("syncing");
  if (dot) { dot.classList.remove("online"); dot.classList.add("syncing"); }

  let counts = { 
    users: participantsCache.length, 
    quizzes: quizzesCache.length, 
    rooms: activeRooms.length, 
    schools: schoolsCache.length, 
    grades: gradesCache.length, 
    honor: honorLeaderboardCache.length,
    isOffline: false
  };

  try {
    // مهلة زمنية ذكية لمنع أي تجميد للواجهة عند بطء الإنترنت
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Cloud timeout")), 8500)
    );

    // جلب كافة المجموعات السحابية بالتوازي
    const fetchPromises = Promise.allSettled([
      getDoc(doc(db, "system_settings", "schools_and_grades")),
      getDocs(collection(db, "quizzes")),
      getDocs(collection(db, "participants")),
      getDocs(collection(db, "live_rooms")),
      getDoc(doc(db, "system_settings", "honor_board")),
      getDoc(doc(db, "system_settings", "quizzes_config"))
    ]);

    const results = await Promise.race([fetchPromises, timeoutPromise]);
    const [sgRes, quizRes, partRes, roomRes, honorRes, quizCfgRes] = results;

    const anyFulfilled = results.some(r => r.status === "fulfilled");
    if (!anyFulfilled) {
      counts.isOffline = true;
    }

    // 1. المدارس والصفوف من السحابة
    if (sgRes.status === "fulfilled" && sgRes.value.exists()) {
      const data = sgRes.value.data();
      if (Array.isArray(data.schools) && data.schools.length > 0) {
        schoolsCache = [...data.schools];
        localStorage.setItem("nour_schools", JSON.stringify(schoolsCache));
      } else {
        schoolsCache = [...DEFAULT_SCHOOLS];
        setDoc(doc(db, "system_settings", "schools_and_grades"), { schools: schoolsCache }, { merge: true }).catch(() => {});
      }

      if (Array.isArray(data.grades) && data.grades.length > 0) {
        gradesCache = [...data.grades];
        localStorage.setItem("nour_grades", JSON.stringify(gradesCache));
      } else {
        gradesCache = [...DEFAULT_GRADES];
        setDoc(doc(db, "system_settings", "schools_and_grades"), { grades: gradesCache }, { merge: true }).catch(() => {});
      }
      counts.schools = schoolsCache.length;
      counts.grades = gradesCache.length;
    } else if (sgRes.status === "fulfilled" && !sgRes.value.exists()) {
      schoolsCache = [...DEFAULT_SCHOOLS];
      gradesCache = [...DEFAULT_GRADES];
      setDoc(doc(db, "system_settings", "schools_and_grades"), {
        schools: schoolsCache,
        grades: gradesCache,
        lastUpdated: serverTimestamp()
      }, { merge: true }).catch(() => {});
      localStorage.setItem("nour_schools", JSON.stringify(schoolsCache));
      localStorage.setItem("nour_grades", JSON.stringify(gradesCache));
      counts.schools = schoolsCache.length;
      counts.grades = gradesCache.length;
    }

    // 2. الاختبارات (استيراد كافة الاختبارات المتوفرة سحابياً كمرجع وحيد معتمد)
    let isCloudInitDone = false;
    if (quizCfgRes && quizCfgRes.status === "fulfilled" && quizCfgRes.value.exists()) {
      const cfgData = quizCfgRes.value.data();
      isCloudInitDone = !!cfgData.initialized;
    }

    if (quizRes.status === "fulfilled") {
      const cloudQuizzes = [];
      quizRes.value.forEach(d => {
        cloudQuizzes.push(normalizeQuizFromCloud({ ...d.data(), id: String(d.id) }));
      });

      const hasInitDone = isCloudInitDone || (localStorage.getItem("nour_quizzes_init_done") === "true");
      if (cloudQuizzes.length === 0 && !hasInitDone) {
        for (const q of INITIAL_QUIZZES) {
          syncQuizToCloud(q).catch(() => {});
          cloudQuizzes.push(normalizeQuizFromCloud(q));
        }
        localStorage.setItem("nour_quizzes_init_done", "true");
        setDoc(doc(db, "system_settings", "quizzes_config"), {
          initialized: true,
          lastUpdated: serverTimestamp()
        }, { merge: true }).catch(() => {});
      } else {
        localStorage.setItem("nour_quizzes_init_done", "true");
      }

      quizzesCache = cloudQuizzes;
      localStorage.setItem("nour_quizzes", JSON.stringify(quizzesCache));
      counts.quizzes = quizzesCache.length;
    }

    // 3. الحسابات والمشاركون (استيراد كل الحسابات السحابية بدقة تامة)
    if (partRes.status === "fulfilled") {
      const cloudUsers = [];
      partRes.value.forEach(d => {
        const uData = d.data();
        cloudUsers.push({
          id: d.id,
          ...uData,
          normalizedName: uData.normalizedName || normalizeArabic(uData.name || "")
        });
      });

      // التأكد من وجود حساب المشرف العام دائماً
      const supNorm = normalizeArabic(MASTER_SUPERVISOR_NAME);
      const supDocId = getDocumentId(supNorm);
      let masterSup = cloudUsers.find(p => p.normalizedName === supNorm || p.id === supDocId || p.name === MASTER_SUPERVISOR_NAME);
      if (!masterSup) {
        masterSup = {
          id: supDocId,
          name: MASTER_SUPERVISOR_NAME,
          normalizedName: supNorm,
          role: "supervisor",
          school: "مدرسة نور البيان المركزية",
          grade: "جميع الفئات",
          firstLoginAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          loginCount: 1
        };
        cloudUsers.unshift(masterSup);
        syncParticipantToCloud(masterSup).catch(() => {});
      }
      participantsCache = cloudUsers;
      localStorage.setItem("nour_participants", JSON.stringify(participantsCache));
      counts.users = cloudUsers.length;

      // مزامنة وتحديث بيانات الجلسة الحالية
      if (currentUser) {
        const refreshedUser = participantsCache.find(p => 
          p.id === currentUser.id || 
          p.normalizedName === currentUser.normalizedName || 
          p.name === currentUser.name
        );
        if (refreshedUser) {
          currentUser = { ...currentUser, ...refreshedUser };
          localStorage.setItem("active_quran_user", JSON.stringify(currentUser));
          localStorage.setItem("nour_saved_user", JSON.stringify(currentUser));
        }
      }
    }

    // 4. الغرف الحية المفتوحة من Firestore مباشرة
    if (roomRes.status === "fulfilled") {
      const cloudRooms = [];
      roomRes.value.forEach(d => {
        cloudRooms.push({ id: d.id, ...d.data() });
      });
      activeRooms = cloudRooms;
      localStorage.setItem("nour_rooms", JSON.stringify(activeRooms));
      counts.rooms = cloudRooms.length;
    }

    // 5. لوحة الشرف من السحابة مباشرة
    if (honorRes.status === "fulfilled" && honorRes.value.exists()) {
      const hData = honorRes.value.data();
      honorLeaderboardCache = Array.isArray(hData.entries) ? hData.entries : [];
      localStorage.setItem("nour_honor_board", JSON.stringify(honorLeaderboardCache));
      counts.honor = honorLeaderboardCache.length;
    }

    // 6. تحديث كافة الواجهات بأمان تام دون أي انهيار
    try { updateDropdowns(); } catch (e) { console.warn("updateDropdowns notice:", e); }
    try { renderSchoolsAndGradesTags(); } catch (e) { console.warn("renderSchoolsAndGradesTags notice:", e); }
    try { renderAccountsTable(); } catch (e) { console.warn("renderAccountsTable notice:", e); }
    try { renderQuizzesList(); } catch (e) { console.warn("renderQuizzesList notice:", e); }
    try { renderStudentPracticeQuizzes(); } catch (e) { console.warn("renderStudentPracticeQuizzes notice:", e); }
    try { renderLiveRoomsList(); } catch (e) { console.warn("renderLiveRoomsList notice:", e); }
    try { renderHonorLeaderboardTab(); } catch (e) { console.warn("renderHonorLeaderboardTab notice:", e); }

    if (currentUser && (currentUser.role === "supervisor" || currentUser.role === "teacher" || currentUser.role === "presenter")) {
      try { renderSupervisorDashboard(); } catch (e) { console.warn("renderSupervisorDashboard notice:", e); }
    }

    return counts;
  } catch (err) {
    console.warn("Cloud load notice:", err);
    counts.isOffline = true;
    return counts;
  } finally {
    if (syncBtn) syncBtn.classList.remove("syncing");
  }
}

function updateDropdowns() {
  if (schoolSelect) {
    schoolSelect.innerHTML = schoolsCache.map(s => `<option value="${s}">${s}</option>`).join("");
  }
  if (gradeSelect) {
    gradeSelect.innerHTML = gradesCache.map(g => `<option value="${g}">${g}</option>`).join("");
  }

  // تحديث قوائم المودالات
  const modalAccountSchool = document.getElementById("modalAccountSchool");
  const modalAccountGrade = document.getElementById("modalAccountGrade");
  if (modalAccountSchool) modalAccountSchool.innerHTML = schoolsCache.map(s => `<option value="${s}">${s}</option>`).join("");
  if (modalAccountGrade) modalAccountGrade.innerHTML = gradesCache.map(g => `<option value="${g}">${g}</option>`).join("");

  const quizTargetGrade = document.getElementById("quizTargetGrade");
  if (quizTargetGrade) {
    quizTargetGrade.innerHTML = `<option value="جميع الفئات">جميع الفئات</option>` + 
      gradesCache.map(g => `<option value="${g}">${g}</option>`).join("");
  }

  const aiGradeSelect = document.getElementById("aiGradeSelect");
  if (aiGradeSelect) {
    aiGradeSelect.innerHTML = gradesCache.map(g => `<option value="${g}">${g}</option>`).join("");
  }

  const roomQuizSelect = document.getElementById("roomQuizSelect");
  if (roomQuizSelect) {
    roomQuizSelect.innerHTML = quizzesCache.map(q => `<option value="${q.id}">${q.title} (${q.targetGrade})</option>`).join("");
  }

  renderSchoolsAndGradesTags();
}

// --------------------------------------------------------
// معالجة الدخول المباشر عبر الرابط ونسخ الروابط بأمان
// --------------------------------------------------------
async function copyTextToClipboard(text) {
  if (!text) return false;
  let copied = false;
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (e) {}
  }
  if (!copied) {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      copied = document.execCommand("copy");
      document.body.removeChild(textarea);
    } catch (e) {}
  }
  return copied;
}

function showDirectUrlDialog(url) {
  const existing = document.getElementById("directUrlFallbackModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "directUrlFallbackModal";
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-card" style="max-width: 520px; text-align: right;" dir="rtl">
      <div class="modal-header">
        <h3 class="modal-title"><i class="fa-solid fa-link" style="color: var(--duo-blue);"></i> رابط الدخول المباشر للحساب</h3>
        <button class="btn-close-modal" id="btnCloseDirectUrlModal"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body" style="padding: 16px 20px;">
        <p style="font-size: 13.5px; color: #475569; margin-bottom: 12px; line-height: 1.6;">
          يمكنك نسخ هذا الرابط وإرساله للمستخدم، وبمجرد الضغط عليه سيتم فتح حسابه مباشرة دون الحاجة لأي تسجيل:
        </p>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="directUrlModalInput" value="${url}" readonly class="form-control" style="font-size: 12px; direction: ltr; text-align: left; background: #f8fafc; font-family: monospace;" />
          <button id="btnCopyInDirectUrlModal" class="btn-duo-green btn-sm" style="white-space: nowrap;"><i class="fa-solid fa-copy"></i> نسخ الرابط</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const input = modal.querySelector("#directUrlModalInput");
  input?.select();
  modal.querySelector("#btnCloseDirectUrlModal")?.addEventListener("click", () => modal.remove());
  modal.querySelector("#btnCopyInDirectUrlModal")?.addEventListener("click", async () => {
    input?.select();
    document.execCommand("copy");
    showToast("تم نسخ الرابط بنجاح! 📋", "fa-check");
    modal.remove();
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}

function updateImpersonationBanner() {
  let banner = document.getElementById("impersonationNoticeBar");
  const prevSupJson = localStorage.getItem("nour_previous_supervisor");

  if (prevSupJson && currentUser && currentUser.role !== "supervisor") {
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "impersonationNoticeBar";
      banner.style.cssText = "background: linear-gradient(90deg, #4f46e5, #7c3aed); color: #fff; padding: 7px 16px; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 9999; box-shadow: 0 2px 8px rgba(0,0,0,0.15);";
      document.body.prepend(banner);
    }
    const roleLabels = { teacher: "معلم", presenter: "عارض", student: "طالب" };
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <i class="fa-solid fa-user-gear"></i>
        <span>أنت تتصفح المنصة حالياً بحساب: <strong>${currentUser.name}</strong> (${roleLabels[currentUser.role] || "مشارك"})</span>
      </div>
      <button id="btnReturnToSupervisor" style="background: #ffffff; color: #4f46e5; border: none; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <i class="fa-solid fa-crown"></i> العودة لحساب المشرف العام
      </button>
    `;
    banner.querySelector("#btnReturnToSupervisor")?.addEventListener("click", () => {
      try {
        const supObj = JSON.parse(prevSupJson);
        localStorage.removeItem("nour_previous_supervisor");
        finalizeUserSession(supObj, true);
        showToast("تمت العودة لحساب المشرف العام بنجاح 👑", "fa-crown");
      } catch (e) {}
    });
  } else {
    if (banner) banner.remove();
  }
}

function extractAuthTokenFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    let token = params.get("auth") || params.get("token") || params.get("user") || params.get("id");
    if (!token && window.location.hash) {
      const hashStr = window.location.hash.replace(/^#\/?/, "");
      const hashParams = new URLSearchParams(hashStr.includes("?") ? hashStr.split("?")[1] : hashStr);
      token = hashParams.get("auth") || hashParams.get("token") || hashParams.get("user") || hashParams.get("id");
    }
    if (token) {
      try {
        return decodeURIComponent(token).trim();
      } catch (e) {
        return token.trim();
      }
    }
  } catch (e) {
    console.warn("URL token extraction error:", e);
  }
  return null;
}

async function checkDirectUrlAuthentication(overrideToken = null) {
  const rawToken = overrideToken || extractAuthTokenFromUrl();
  if (!rawToken) return false;

  const directToken = rawToken.trim();
  const tokenNorm = normalizeArabic(directToken);
  const derivedDocId = getDocumentId(tokenNorm);

  // استخراج النص العربي إذا كان المعرف مرمّزاً بصيغة user__...
  let decodedFromToken = "";
  if (directToken.startsWith("user__")) {
    try {
      const percentStr = directToken.replace(/^user_/, "").replace(/_/g, "%");
      decodedFromToken = decodeURIComponent(percentStr);
    } catch (e) {}
  }
  const decodedNorm = decodedFromToken ? normalizeArabic(decodedFromToken) : "";

  // 1. البحث في الكاش أولاً بكل الاحتمالات
  let user = participantsCache.find(u => 
    u.id === directToken || 
    u.id === derivedDocId ||
    u.id === rawToken || 
    (u.normalizedName && (u.normalizedName === tokenNorm || (decodedNorm && u.normalizedName === decodedNorm))) || 
    (u.name && (u.name.trim() === directToken || normalizeArabic(u.name) === tokenNorm || (decodedNorm && normalizeArabic(u.name) === decodedNorm)))
  );

  // 2. إذا لم يوجد في الكاش، نجلبه مباشرة من Cloud Firestore
  if (!user) {
    try {
      let snap = null;
      try {
        snap = await getDoc(doc(db, "participants", directToken));
      } catch (e) {}

      if ((!snap || !snap.exists()) && derivedDocId !== directToken) {
        try {
          snap = await getDoc(doc(db, "participants", derivedDocId));
        } catch (e) {}
      }
      
      if (snap && snap.exists()) {
        const snapData = snap.data();
        user = { ...snapData, id: snap.id, normalizedName: snapData.normalizedName || normalizeArabic(snapData.name || "") };
      } else {
        const allSnap = await getDocs(collection(db, "participants"));
        allSnap.forEach(d => {
          const dData = d.data();
          const dNorm = dData.normalizedName || normalizeArabic(dData.name || "");
          if (
            d.id === directToken || 
            d.id === derivedDocId || 
            d.id === rawToken || 
            dNorm === tokenNorm || 
            (decodedNorm && dNorm === decodedNorm) || 
            (dData.name && (dData.name.trim() === directToken || (decodedFromToken && dData.name.trim() === decodedFromToken)))
          ) {
            user = { ...dData, id: d.id, normalizedName: dNorm };
          }
        });
      }

      if (user) {
        const existingIdx = participantsCache.findIndex(p => p.id === user.id);
        if (existingIdx >= 0) {
          participantsCache[existingIdx] = user;
        } else {
          participantsCache.push(user);
        }
        saveParticipants();
      }
    } catch (e) {
      console.warn("Firestore token login notice:", e);
    }
  }

  if (user) {
    // إذا كان هناك جلسة نشطة للمشرف العام والمستخدم الجديد ليس مشرفاً، نحفظ جلسة المشرف للعودة السريعة
    const activeSaved = localStorage.getItem("active_quran_user");
    if (activeSaved) {
      try {
        const activeObj = JSON.parse(activeSaved);
        if (activeObj && activeObj.role === "supervisor" && user.role !== "supervisor") {
          localStorage.setItem("nour_previous_supervisor", JSON.stringify(activeObj));
        }
      } catch (e) {}
    }

    user.lastLoginAt = new Date().toISOString();
    user.loginCount = (user.loginCount || 1) + 1;
    saveParticipants();
    syncParticipantToCloud(user).catch(() => {});
    finalizeUserSession(user, true);

    // تنظيف الرابط من معلمات الاستعلام بدون إعادة تحميل الصفحة
    try {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch (e) {}

    showToast(`مرحباً بعودتك! تم الدخول المباشر لحساب: ${user.name}`, "fa-circle-check");
    return true;
  } else {
    showToast("تعذر العثور على الحساب المرتبط بالرابط!", "fa-triangle-exclamation");
  }
  return false;
}


// --------------------------------------------------------
// تفاعل حقل الاسم ومؤشر التقدم في صفحة التسجيل
// --------------------------------------------------------
if (fullNameInput) {
  fullNameInput.addEventListener("input", () => {
    const val = fullNameInput.value.trim();
    const words = val.length > 0 ? val.split(/\s+/).filter(w => w.length > 0) : [];
    const count = words.length;

    const progressPercent = Math.min(100, Math.round((count / 4) * 100));
    if (nameProgressBar) nameProgressBar.style.width = `${progressPercent}%`;

    if (count === 0) {
      nameCountBadge.textContent = "0 / 4 أسماء";
      nameCountBadge.classList.remove("valid");
      if (loginInstructionText) {
        loginInstructionText.innerHTML = `يرجى كتابة الاسم الرباعي كاملاً (4 أسماء على الأقل) واختيار المدرسة والصف للمتابعة.`;
      }
    } else if (count < 4) {
      nameCountBadge.textContent = `${count} / 4 أسماء`;
      nameCountBadge.classList.remove("valid");
      const remaining = 4 - count;
      const remText = remaining === 1 ? "اسم واحد" : remaining === 2 ? "اسمين" : "3 أسماء";
      if (loginInstructionText) {
        loginInstructionText.innerHTML = `كتبت الآن (${count}) أسماء.. متبقي (${remText}) لاكتمال الاسم الرباعي المطلوب.`;
      }
    } else {
      nameCountBadge.textContent = `${count} أسماء ✓`;
      nameCountBadge.classList.add("valid");
      validationAlert.classList.add("hidden");
      if (loginInstructionText) {
        loginInstructionText.innerHTML = `الاسم الرباعي مكتمل وجاهز تماماً! اختر مدرستك وصفك ثم اضغط <strong>«تسجيل ودخول»</strong>.`;
      }
    }
  });
}

// أزرار الانتقال المباشر
window.handleStartApp = function() {
  resetLoginSteps();
  showView("login");
  const lastUsername = localStorage.getItem("nour_last_username");
  if (lastUsername && fullNameInput) {
    fullNameInput.value = lastUsername;
    fullNameInput.dispatchEvent(new Event("input"));
  }
  fullNameInput?.focus();
};

btnStart?.addEventListener("click", window.handleStartApp);

btnBackToHero?.addEventListener("click", () => {
  showView("hero");
  validationAlert?.classList.add("hidden");
});

headerHomeLogo?.addEventListener("click", () => {
  if (!currentUser) showView("hero");
});

async function handleLogout() {
  const confirmed = await showInAppConfirm({
    title: "تأكيد تسجيل الخروج",
    message: "هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟",
    confirmText: "نعم، تسجيل الخروج",
    cancelText: "البقاء في الحساب",
    type: "warning",
    icon: "fa-arrow-right-from-bracket"
  });

  if (!confirmed) return;

  const lastSavedName = currentUser?.name || localStorage.getItem("nour_last_username");
  currentUser = null;
  localStorage.removeItem("active_quran_user");
  localStorage.removeItem("nour_saved_user");
  localStorage.removeItem("nour_saved_view");
  localStorage.removeItem("nour_saved_tab");
  localStorage.removeItem("nour_saved_room_id");
  if (lastSavedName) {
    localStorage.setItem("nour_last_username", lastSavedName);
    if (fullNameInput) {
      fullNameInput.value = lastSavedName;
      fullNameInput.dispatchEvent(new Event("input"));
    }
  }
  resetLoginSteps();
  showView("hero");
  showToast("تم تسجيل الخروج بنجاح", "fa-arrow-right-from-bracket");
}

document.querySelectorAll("[data-action='logout']").forEach(btn => {
  btn.addEventListener("click", handleLogout);
});
quickLogoutBtn?.addEventListener("click", handleLogout);

// إعادة تعيين خطوات تسجيل الدخول إلى الخطوة الأولى
function resetLoginSteps() {
  loginStepName?.classList.remove("hidden");
  loginStepName?.classList.add("active");
  loginStepSchool?.classList.add("hidden");
  loginStepSchool?.classList.remove("active");
  loginStepGrade?.classList.add("hidden");
  loginStepGrade?.classList.remove("active");
}

// --------------------------------------------------------
// معالجة تسجيل الدخول الذكية:
// 1. المشرف، المعلمون، العارض، والطلاب السابقون -> يفتح حسابهم مباشرة
// 2. الطالب الجديد -> يدخل اسمه فتظهر أمامه خيارات المدارس بشكل جميل، ثم الصفوف
// --------------------------------------------------------
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const rawName = fullNameInput.value.trim();
  if (!rawName) {
    validationAlert.textContent = "يرجى كتابة الاسم للمتابعة.";
    validationAlert.classList.remove("hidden");
    fullNameInput.focus();
    return;
  }

  validationAlert.classList.add("hidden");
  btnSubmitLogin.disabled = true;
  btnSubmitLogin.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق...`;
  showGlobalLoader("جاري التحقق من الحساب...", "يتم البحث في قاعدة البيانات السحابية لحظياً");

  try {
    const norm = normalizeArabic(rawName);
    const isSup = isSupervisor(rawName);
    const docId = getDocumentId(norm);

    // تحديث فوري مباشر من Firestore لضمان استيراد أي حساب تم إنشاؤه
    try {
      await loadCloudData();
    } catch (err) {
      console.warn("Direct cloud load notice:", err);
    }

    // البحث في المشاركين بجميع أشكال التسمية والمعرفات
    let foundUser = participantsCache.find(p => 
      p.normalizedName === norm || 
      normalizeArabic(p.name || "") === norm ||
      (p.name && p.name.trim().toLowerCase() === rawName.toLowerCase()) ||
      p.id === docId
    );

    // إذا لم يتم العثور عليه، نبحث بالمعرف المباشر في فايربيس
    if (!foundUser) {
      try {
        const userDocRef = doc(db, "participants", docId);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          foundUser = { id: docSnap.id, ...docSnap.data() };
          participantsCache.push(foundUser);
          saveParticipants();
        }
      } catch (err) {
        console.warn("Firestore search notice:", err);
      }
    }

    // 1. المشرف العام محمد منتصر محمد يونس -> دخول مباشر فوري
    if (isSup) {
      let supUser = foundUser;
      if (!supUser) {
        supUser = {
          id: docId,
          name: MASTER_SUPERVISOR_NAME,
          normalizedName: norm,
          role: "supervisor",
          school: "مدرسة نور البيان المركزية",
          grade: "جميع الفئات",
          firstLoginAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          loginCount: 1
        };
        participantsCache.push(supUser);
        saveParticipants();
        await syncParticipantToCloud(supUser);
      } else {
        supUser.role = "supervisor";
        supUser.lastLoginAt = new Date().toISOString();
        supUser.loginCount = (supUser.loginCount || 1) + 1;
        saveParticipants();
        await syncParticipantToCloud(supUser);
      }
      hideGlobalLoader();
      finalizeUserSession(supUser, supUser.loginCount > 1);
      showToast(`مرحباً بك يا مشرف البرنامج! تم الدخول بنجاح`, "fa-crown");
      return;
    }

    // 2. إذا كان المستخدم لديه حساب سابق في قاعدة البيانات (معلم، عارض، أو طالب مسجل) -> يفتح مباشرة
    if (foundUser) {
      foundUser.lastLoginAt = new Date().toISOString();
      foundUser.loginCount = (foundUser.loginCount || 1) + 1;
      saveParticipants();

      // تحديث فايربيس بهدوء
      try {
        const uRef = doc(db, "participants", foundUser.id || docId);
        await updateDoc(uRef, {
          lastLoginAt: serverTimestamp(),
          loginCount: foundUser.loginCount
        });
      } catch (e) {}

      hideGlobalLoader();
      finalizeUserSession(foundUser, true);
      showToast(`مرحباً بعودتك يا ${foundUser.name}! تم تسجيل الدخول بنجاح`, "fa-circle-check");
      return;
    }

    // 3. مستخدم جديد غير مسجل في قاعدة البيانات: التحقق من كتابة الاسم الرباعي
    const validation = validateQuadrupleName(rawName);
    if (!validation.isValid) {
      validationAlert.textContent = validation.message;
      validationAlert.classList.remove("hidden");
      fullNameInput.focus();
      hideGlobalLoader();
      return;
    }

    // طالب جديد -> الانتقال لخطوة اختيار المدرسة والصف
    hideGlobalLoader();
    pendingNewStudent = {
      rawName: rawName,
      norm: norm,
      docId: docId,
      school: "",
      grade: ""
    };

    showOnboardingSchoolStep();
  } catch (err) {
    console.error("Login submit error:", err);
    showToast("حدث خطأ أثناء فحص البيانات، يرجى المحاولة مرة أخرى", "fa-triangle-exclamation");
  } finally {
    btnSubmitLogin.disabled = false;
    btnSubmitLogin.innerHTML = `<span class="btn-text">متابعة والدخول</span><span class="btn-icon"><i class="fa-solid fa-arrow-left"></i></span>`;
    hideGlobalLoader();
  }
});

// إظهار خطوة اختيار المدرسة للطلاب الجدد
function showOnboardingSchoolStep() {
  loginStepName?.classList.remove("active");
  loginStepName?.classList.add("hidden");
  loginStepGrade?.classList.remove("active");
  loginStepGrade?.classList.add("hidden");

  loginStepSchool?.classList.remove("hidden");
  loginStepSchool?.classList.add("active");

  if (stepStudentNamePrompt) {
    stepStudentNamePrompt.textContent = pendingNewStudent.rawName;
  }

  // التأكد الحاسم من وجود المدارس وعدم خلو القائمة
  if (!schoolsCache || !Array.isArray(schoolsCache) || schoolsCache.length === 0) {
    schoolsCache = [...DEFAULT_SCHOOLS];
    localStorage.setItem("nour_schools", JSON.stringify(schoolsCache));
  }

  if (schoolsCardsGrid) {
    const icons = ["fa-school", "fa-mosque", "fa-book-quran", "fa-building-columns"];
    schoolsCardsGrid.innerHTML = schoolsCache.map((schoolName, idx) => {
      const icon = icons[idx % icons.length];
      return `
        <div class="choice-card-duo" data-school="${schoolName}">
          <div class="choice-card-icon"><i class="fa-solid ${icon}"></i></div>
          <div class="choice-card-info">
            <div class="choice-card-title">${schoolName}</div>
            <div class="choice-card-subtitle">مدرسة / مركز معتمد</div>
          </div>
          <i class="fa-solid fa-chevron-left" style="color: #94a3b8; font-size: 15px;"></i>
        </div>
      `;
    }).join("");

    schoolsCardsGrid.querySelectorAll(".choice-card-duo").forEach(card => {
      card.addEventListener("click", () => {
        const selected = card.getAttribute("data-school");
        pendingNewStudent.school = selected;
        showOnboardingGradeStep();
      });
    });
  }
}

// إظهار خطوة اختيار الصف / الفئة للطلاب الجدد
function showOnboardingGradeStep() {
  loginStepSchool?.classList.remove("active");
  loginStepSchool?.classList.add("hidden");

  loginStepGrade?.classList.remove("hidden");
  loginStepGrade?.classList.add("active");

  if (stepChosenSchoolName) {
    stepChosenSchoolName.textContent = pendingNewStudent.school;
  }

  // التأكد الحاسم من وجود الصفوف وعدم خلو القائمة
  if (!gradesCache || !Array.isArray(gradesCache) || gradesCache.length === 0) {
    gradesCache = [...DEFAULT_GRADES];
    localStorage.setItem("nour_grades", JSON.stringify(gradesCache));
  }

  if (gradesCardsGrid) {
    const icons = ["fa-seedling", "fa-star", "fa-crown", "fa-award", "fa-gem"];
    gradesCardsGrid.innerHTML = gradesCache.map((gradeName, idx) => {
      const icon = icons[idx % icons.length];
      return `
        <div class="choice-card-duo grade-choice" data-grade="${gradeName}">
          <div class="choice-card-icon"><i class="fa-solid ${icon}"></i></div>
          <div class="choice-card-info">
            <div class="choice-card-title">${gradeName}</div>
            <div class="choice-card-subtitle">الفئة المقررة بالمسابقة</div>
          </div>
          <i class="fa-solid fa-arrow-left" style="color: var(--duo-blue); font-size: 16px;"></i>
        </div>
      `;
    }).join("");

    gradesCardsGrid.querySelectorAll(".choice-card-duo").forEach(card => {
      card.addEventListener("click", async () => {
        const selected = card.getAttribute("data-grade");
        pendingNewStudent.grade = selected;
        await completeNewStudentRegistration();
      });
    });
  }
}

// حفظ الطالب الجديد وإتمام الدخول
async function completeNewStudentRegistration() {
  showGlobalLoader("جاري إنشاء الحساب...", "يتم حفظ بيانات الطالب في السحابة فورياً");
  try {
    const nowIso = new Date().toISOString();
    const newStudentUser = {
      id: pendingNewStudent.docId,
      name: pendingNewStudent.rawName,
      normalizedName: pendingNewStudent.norm,
      role: "student",
      school: pendingNewStudent.school,
      grade: pendingNewStudent.grade,
      firstLoginAt: nowIso,
      lastLoginAt: nowIso,
      loginCount: 1
    };

    // حفظ في فايربيس مباشرة
    try {
      const userDocRef = doc(db, "participants", pendingNewStudent.docId);
      await setDoc(userDocRef, {
        ...newStudentUser,
        firstLoginAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      });
    } catch (err) {
      console.warn("Firebase save error for new student:", err);
    }

    // إضافة في السجل والذاكرة
    participantsCache.push(newStudentUser);
    saveParticipants();

    // إعادة ضبط شاشات الدخول
    resetLoginSteps();

    // إتمام الجلسة وتوجيه الطالب
    finalizeUserSession(newStudentUser, false);
    showToast(`أهلاً بك يا ${newStudentUser.name} في مسابقة نور البيان!`, "fa-graduation-cap");
  } catch (e) {
    console.error("completeNewStudentRegistration error:", e);
  } finally {
    hideGlobalLoader();
  }
}

// أزرار الرجوع بين خطوات التسجيل
btnBackToNameStep?.addEventListener("click", () => {
  loginStepSchool?.classList.remove("active");
  loginStepSchool?.classList.add("hidden");
  loginStepName?.classList.remove("hidden");
  loginStepName?.classList.add("active");
});

btnBackToSchoolStep?.addEventListener("click", () => {
  loginStepGrade?.classList.remove("active");
  loginStepGrade?.classList.add("hidden");
  loginStepSchool?.classList.remove("hidden");
  loginStepSchool?.classList.add("active");
});

// --------------------------------------------------------
// إنهاء الجلسة وتوجيه المستخدم لواجهته المخصصة حسب دوره
// --------------------------------------------------------
function finalizeUserSession(user, isReturning) {
  currentUser = user;
  localStorage.setItem("active_quran_user", JSON.stringify(user));
  localStorage.setItem("nour_saved_user", JSON.stringify(user));
  if (user && user.name) {
    localStorage.setItem("nour_last_username", user.name);
  }
  if (user && user.id) {
    listenToCurrentUserProfile(user.id);
  }

  if (user.role === "supervisor") {
    // واجهة المشرف العام
    if (supervisorGreetingTitle) {
      supervisorGreetingTitle.textContent = isReturning 
        ? "مرحباً بعودتك أيها المشرف" 
        : "أهلاً بك أيها المشرف";
    }
    if (supervisorNameDisplay) supervisorNameDisplay.textContent = user.name;
    if (bannerRolePill) bannerRolePill.innerHTML = `<i class="fa-solid fa-crown"></i> مشرف البرنامج`;
    if (roleBannerIcon) roleBannerIcon.className = "fa-solid fa-crown";

    renderSupervisorDashboard();
    showView("supervisor");

  } else if (user.role === "teacher") {
    // واجهة المعلم
    if (supervisorGreetingTitle) {
      supervisorGreetingTitle.textContent = isReturning 
        ? "مرحباً بعودتك أيها المعلم الفاضل" 
        : "أهلاً بك أيها المعلم الفاضل";
    }
    if (supervisorNameDisplay) supervisorNameDisplay.textContent = user.name;
    if (bannerRolePill) bannerRolePill.innerHTML = `<i class="fa-solid fa-chalkboard-user"></i> معلم معتمد`;
    if (roleBannerIcon) roleBannerIcon.className = "fa-solid fa-chalkboard-user";

    renderSupervisorDashboard();
    showView("supervisor");

    // تنشيط تبويب بنك الاختبارات والتأكد من إزالة أي تبويب غير متاح للمعلم
    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content-panel").forEach(p => p.classList.remove("active"));
    const quizTab = document.querySelector(".nav-tab[data-tab='tabQuizzes']");
    if (quizTab) quizTab.classList.add("active");
    document.getElementById("tabQuizzes")?.classList.add("active");
    localStorage.setItem("nour_saved_tab", "tabQuizzes");

  } else if (user.role === "presenter") {
    // واجهة العارض (المسابقات الحية)
    if (supervisorGreetingTitle) {
      supervisorGreetingTitle.textContent = isReturning 
        ? "مرحباً بعودتك أيها العارض" 
        : "أهلاً بك أيها العارض";
    }
    if (supervisorNameDisplay) supervisorNameDisplay.textContent = user.name;
    if (bannerRolePill) bannerRolePill.innerHTML = `<i class="fa-solid fa-display"></i> شاشة العرض`;
    if (roleBannerIcon) roleBannerIcon.className = "fa-solid fa-display";

    renderSupervisorDashboard();
    showView("supervisor");

    // تنشيط تبويب العروض مباشرة
    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content-panel").forEach(p => p.classList.remove("active"));
    const liveTab = document.querySelector(".nav-tab[data-tab='tabLive']");
    if (liveTab) liveTab.classList.add("active");
    document.getElementById("tabLive")?.classList.add("active");
    localStorage.setItem("nour_saved_tab", "tabLive");

  } else {
    // واجهة الطالب
    if (studentGreetingTitle) {
      studentGreetingTitle.textContent = isReturning 
        ? "مرحباً بعودتك" 
        : "أهلاً بك أيها الطالب";
    }
    if (studentNameDisplay) studentNameDisplay.textContent = user.name;
    if (studentSchoolDisplay) studentSchoolDisplay.textContent = user.school || "مدرسة نور البيان";
    if (studentGradeDisplay) studentGradeDisplay.textContent = user.grade || "صف أول";
    if (studentRegDate) studentRegDate.textContent = formatArabicDate(user.firstLoginAt);
    if (studentLastActive) studentLastActive.textContent = formatArabicDate(user.lastLoginAt);

    // عرض نقاط الطالب المحفوظة في حسابه أو من لوحة الشرف
    const scoreEl = document.getElementById("studentTotalScoreDisplay");
    if (scoreEl) {
      const honorEntry = honorLeaderboardCache.find(x => x.name === user.name);
      const pts = user.totalScore !== undefined ? user.totalScore : (honorEntry ? honorEntry.score : 0);
      scoreEl.textContent = `${pts} نقطة`;
    }

    renderStudentPracticeQuizzes();
    renderHonorLeaderboardTab();
    showView("student");
  }

  updateImpersonationBanner();
}

// --------------------------------------------------------
// بناء وتحديث لوحة تحكم المشرف والمعلم
// --------------------------------------------------------
function renderSupervisorDashboard() {
  const isSupervisorRole = currentUser && currentUser.role === "supervisor";
  const isPresenterRole = currentUser && currentUser.role === "presenter";

  // 1. التحكم في ظهور التبويبات بحسب الدور:
  // الحسابات والإحصائيات محصورة حصراً عند المشرف العام، ومخفية تماماً عن العارض والمعلم
  const tabAccountsBtn = document.querySelector(".nav-tab[data-tab='tabAccounts']");
  const tabOverviewBtn = document.querySelector(".nav-tab[data-tab='tabOverview']");
  const tabQuizzesBtn = document.querySelector(".nav-tab[data-tab='tabQuizzes']");
  const tabLiveBtn = document.querySelector(".nav-tab[data-tab='tabLive']");
  const tabHonorBoardBtn = document.querySelector(".nav-tab[data-tab='tabHonorBoard']");
  const tabTacticalCardsBtn = document.querySelector(".nav-tab[data-tab='tabTacticalCards']");
  const quickActionsBar = document.querySelector(".quick-actions-bar");

  // تبويب لوحة الشرف وقسم البطاقات التكتيكية متاح دائماً ومرئي للجميع
  if (tabHonorBoardBtn) tabHonorBoardBtn.style.display = "inline-flex";
  if (tabTacticalCardsBtn) tabTacticalCardsBtn.style.display = "inline-flex";

  if (isPresenterRole) {
    // العارض: يرى فقط شاشات العرض والمسابقات الحية ولوحة الشرف
    if (tabAccountsBtn) tabAccountsBtn.style.display = "none";
    if (tabOverviewBtn) tabOverviewBtn.style.display = "none";
    if (quickActionsBar) quickActionsBar.style.display = "none";
    if (tabQuizzesBtn) tabQuizzesBtn.style.display = "none";
    if (tabLiveBtn) tabLiveBtn.style.display = "inline-flex";

    const activePanel = document.querySelector(".tab-content-panel.active");
    if (!activePanel || (activePanel.id !== "tabLive" && activePanel.id !== "tabHonorBoard")) {
      document.querySelectorAll(".tab-content-panel").forEach(p => p.classList.remove("active"));
      document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
      document.getElementById("tabLive")?.classList.add("active");
      tabLiveBtn?.classList.add("active");
    }
  } else if (!isSupervisorRole) {
    // المعلم: يرى بنك الاختبارات والمسابقات الحية ولوحة الشرف
    if (tabAccountsBtn) tabAccountsBtn.style.display = "none";
    if (tabOverviewBtn) tabOverviewBtn.style.display = "none";
    if (quickActionsBar) quickActionsBar.style.display = "none";
    if (tabLiveBtn) tabLiveBtn.style.display = "inline-flex";
    if (tabQuizzesBtn) tabQuizzesBtn.style.display = "inline-flex";

    const activePanel = document.querySelector(".tab-content-panel.active");
    if (!activePanel || activePanel.id === "tabAccounts" || activePanel.id === "tabOverview") {
      document.querySelectorAll(".tab-content-panel").forEach(p => p.classList.remove("active"));
      document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
      document.getElementById("tabQuizzes")?.classList.add("active");
      tabQuizzesBtn?.classList.add("active");
    }
  } else {
    // المشرف العام: يرى كافة الأقسام (الإحصائيات، الحسابات، الاختبارات، العروض، لوحة الشرف)
    if (tabAccountsBtn) tabAccountsBtn.style.display = "inline-flex";
    if (tabOverviewBtn) tabOverviewBtn.style.display = "inline-flex";
    if (tabQuizzesBtn) tabQuizzesBtn.style.display = "inline-flex";
    if (tabLiveBtn) tabLiveBtn.style.display = "inline-flex";
    if (quickActionsBar) quickActionsBar.style.display = "block";
  }

  // 2. تحديث الإحصائيات
  const totalStudents = participantsCache.filter(p => p.role === "student" || !p.role).length;
  const newStudents = participantsCache.filter(p => p.loginCount === 1).length;
  
  // حساب دخول اليوم
  const today = new Date().toDateString();
  const todayLogins = participantsCache.filter(p => {
    if (!p.lastLoginAt) return false;
    let d = null;
    try {
      if (typeof p.lastLoginAt?.toDate === "function") d = p.lastLoginAt.toDate();
      else if (typeof p.lastLoginAt === "object" && p.lastLoginAt !== null && typeof p.lastLoginAt.seconds === "number") d = new Date(p.lastLoginAt.seconds * 1000);
      else d = new Date(p.lastLoginAt);
    } catch (e) {
      return false;
    }
    return d && !isNaN(d.getTime()) && d.toDateString() === today;
  }).length;

  if (statTotalStudents) statTotalStudents.textContent = totalStudents;
  if (statNewStudents) statNewStudents.textContent = newStudents;
  if (statTodayLogins) statTodayLogins.textContent = todayLogins;
  if (statActiveQuizzes) statActiveQuizzes.textContent = quizzesCache.length;

  // 3. إدارة المدارس والصفوف للمشرف العام فقط
  if (btnManageSchoolsGrades) {
    btnManageSchoolsGrades.style.display = isSupervisorRole ? "inline-flex" : "none";
  }

  // 4. جدول الحسابات للمشرف العام
  if (isSupervisorRole) {
    renderAccountsTable();
  }

  // 5. بنك الاختبارات
  renderQuizzesList();

  // 6. الغرف الحية
  renderLiveRoomsList();

  // 7. لوحة الشرف
  renderHonorLeaderboardTab();

  // 8. قسم البطاقات التكتيكية الكامل
  try { renderSupervisorCardsCatalog(); } catch (e) {}
}

// --------------------------------------------------------
// جدول الحسابات ونسخ الرابط المباشر والترقية
// --------------------------------------------------------
function renderAccountsTable() {
  if (!accountsTableBody) return;

  const searchTerm = accountsSearchInput ? normalizeArabic(accountsSearchInput.value) : "";
  const roleFilter = roleFilterSelect ? roleFilterSelect.value : "all";
  const gradeFilter = gradeFilterSelect ? gradeFilterSelect.value : "all";

  const filtered = participantsCache.filter(user => {
    const matchesSearch = !searchTerm || 
      normalizeArabic(user.name).includes(searchTerm) || 
      normalizeArabic(user.school || "").includes(searchTerm);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesGrade = gradeFilter === "all" || user.grade === gradeFilter;
    return matchesSearch && matchesRole && matchesGrade;
  });

  if (filtered.length === 0) {
    accountsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <i class="fa-solid fa-circle-exclamation"></i> لا توجد حسابات مطابقة للبحث أو الفلتر
        </td>
      </tr>
    `;
    return;
  }

  const roleLabels = {
    supervisor: `<span class="pill-role role-supervisor"><i class="fa-solid fa-crown"></i> مشرف</span>`,
    teacher: `<span class="pill-role role-teacher"><i class="fa-solid fa-chalkboard-user"></i> معلم</span>`,
    presenter: `<span class="pill-role role-presenter"><i class="fa-solid fa-display"></i> عارض</span>`,
    student: `<span class="pill-role role-student"><i class="fa-solid fa-user-graduate"></i> طالب</span>`
  };

  accountsTableBody.innerHTML = filtered.map((u, idx) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const safeUserDocId = u.id || getDocumentId(u.normalizedName || normalizeArabic(u.name));
    const directUrl = `${baseUrl}?auth=${encodeURIComponent(safeUserDocId)}`;
    return `
      <tr>
        <td><strong>${idx + 1}</strong></td>
        <td><strong>${u.name}</strong></td>
        <td>${roleLabels[u.role] || roleLabels.student}</td>
        <td>${u.school || "غير محدد"}</td>
        <td>${u.grade || "صف أول"}</td>
        <td><small style="color: #64748b;">${formatArabicDate(u.lastLoginAt)}</small></td>
        <td>
          <div class="direct-link-cell-group">
            <button type="button" class="btn-open-direct-link" data-id="${safeUserDocId}" title="فتح هذا الحساب فوراً والدخول به مباشرة">
              <i class="fa-solid fa-right-to-bracket"></i> فتح الحساب
            </button>
            <button type="button" class="btn-copy-direct-link" data-url="${directUrl}" title="نسخ رابط الدخول المباشر">
              <i class="fa-solid fa-copy"></i> نسخ
            </button>
            <a href="${directUrl}" target="_blank" class="btn-icon-action" title="فتح الرابط في علامة تبويب جديدة" style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; font-size: 11px; text-decoration: none; color: #475569;">
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          </div>
        </td>
        <td>
          <div class="actions-cell-flex">
            <select class="form-control form-select select-change-role" data-id="${u.id}" style="padding: 4px 8px; font-size: 12px; width: auto;">
              <option value="student" ${u.role === 'student' ? 'selected' : ''}>طالب</option>
              <option value="teacher" ${u.role === 'teacher' ? 'selected' : ''}>معلم</option>
              <option value="supervisor" ${u.role === 'supervisor' ? 'selected' : ''}>مشرف</option>
              <option value="presenter" ${u.role === 'presenter' ? 'selected' : ''}>عارض</option>
            </select>
            <button class="btn-icon-action btn-edit-account" data-id="${u.id}" title="تعديل الحساب">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-icon-action delete btn-delete-account" data-id="${u.id}" title="حذف الحساب">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // مستمعات فتح الحساب مباشرة والدخول به
  accountsTableBody.querySelectorAll(".btn-open-direct-link").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.getAttribute("data-id");
      const targetUser = participantsCache.find(p => p.id === userId) ||
                         participantsCache.find(p => getDocumentId(p.normalizedName || normalizeArabic(p.name)) === userId);
      if (targetUser) {
        showGlobalLoader("جاري الانتقال للحساب...", `يتم فتح حساب (${targetUser.name}) مباشرة`);
        try {
          if (currentUser && currentUser.role === "supervisor" && targetUser.role !== "supervisor") {
            localStorage.setItem("nour_previous_supervisor", JSON.stringify(currentUser));
          }
          targetUser.lastLoginAt = new Date().toISOString();
          targetUser.loginCount = (targetUser.loginCount || 1) + 1;
          saveParticipants();
          syncParticipantToCloud(targetUser).catch(() => {});
          finalizeUserSession(targetUser, true);
          showToast(`تم فتح حساب (${targetUser.name}) بنجاح!`, "fa-circle-check");
        } finally {
          hideGlobalLoader();
        }
      }
    });
  });

  // مستمعات الأحداث لنسخ الرابط المباشر داخل الجدول مع الدعم التام لبيئة الآي فريم
  accountsTableBody.querySelectorAll(".btn-copy-direct-link").forEach(btn => {
    btn.addEventListener("click", async () => {
      const url = btn.getAttribute("data-url");
      const success = await copyTextToClipboard(url);
      if (success) {
        btn.classList.add("copied");
        btn.innerHTML = `<i class="fa-solid fa-check"></i> تم النسخ!`;
        showToast("تم نسخ رابط الدخول المباشر للحساب بنجاح! 📋", "fa-copy");
        setTimeout(() => {
          btn.classList.remove("copied");
          btn.innerHTML = `<i class="fa-solid fa-copy"></i> نسخ`;
        }, 2500);
      } else {
        showDirectUrlDialog(url);
      }
    });
  });

  // ترقية وتغيير الدور
  accountsTableBody.querySelectorAll(".select-change-role").forEach(sel => {
    sel.addEventListener("change", async (e) => {
      const userId = sel.getAttribute("data-id");
      const newRole = e.target.value;
      const targetUser = participantsCache.find(p => p.id === userId);
      if (targetUser) {
        targetUser.role = newRole;
        saveParticipants();
        await syncParticipantToCloud(targetUser);
        renderAccountsTable();
        showToast(`تم تغيير دور (${targetUser.name}) إلى (${sel.options[sel.selectedIndex].text}) بنجاح`);
      }
    });
  });

  // تعديل الحساب
  accountsTableBody.querySelectorAll(".btn-edit-account").forEach(btn => {
    btn.addEventListener("click", () => {
      const userId = btn.getAttribute("data-id");
      const targetUser = participantsCache.find(p => p.id === userId);
      if (targetUser) openAccountModal(targetUser);
    });
  });

  // حذف الحساب مع التأكيد داخل المنصة حصراً
  accountsTableBody.querySelectorAll(".btn-delete-account").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.getAttribute("data-id");
      const targetUser = participantsCache.find(p => p.id === userId);
      if (!targetUser) return;

      if (isSupervisor(targetUser.name)) {
        showToast("لا يمكن حذف حساب المشرف العام الرئيسي للمنصة!", "fa-shield-halved");
        return;
      }

      if (currentUser && (targetUser.id === currentUser.id || targetUser.name === currentUser.name)) {
        showToast("لا يمكن حذف حسابك الحالي وأنت مسجل الدخول به!", "fa-shield-halved");
        return;
      }

      const confirmed = await showInAppConfirm({
        title: "تأكيد حذف الحساب",
        message: `هل أنت متأكد من رغبتك في حذف حساب (${targetUser.name}) نهائياً من المنصة؟`,
        confirmText: "نعم، حذف الحساب",
        cancelText: "إلغاء وتراجع",
        type: "danger",
        icon: "fa-user-xmark"
      });

      if (confirmed) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        showGlobalLoader("جاري حذف الحساب سحابياً...", "يتم الحذف من قاعدة البيانات السحابية فوراً لجميع المستخدمين");
        try {
          await deleteDoc(doc(db, "participants", userId));
          participantsCache = participantsCache.filter(p => p.id !== userId);
          saveParticipants();
          renderAccountsTable();
          renderSupervisorDashboard();
          showToast(`تم حذف حساب (${targetUser.name}) سحابياً بنجاح!`, "fa-trash");
        } catch (err) {
          console.warn("Delete participant from cloud notice:", err);
          showToast("حدث خطأ أثناء حذف الحساب من السحابة: " + (err.message || ""), "fa-triangle-exclamation");
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        } finally {
          hideGlobalLoader();
        }
      }
    });
  });
}

// فلاتر وبحث الحسابات
accountsSearchInput?.addEventListener("input", renderAccountsTable);
roleFilterSelect?.addEventListener("change", renderAccountsTable);
gradeFilterSelect?.addEventListener("change", renderAccountsTable);
btnRefreshAccounts?.addEventListener("click", () => {
  renderAccountsTable();
  showToast("تم تحديث السجل بنجاح", "fa-arrows-rotate");
});

// --------------------------------------------------------
// مودال إضافة / تعديل الحساب
// --------------------------------------------------------
const accountModal = document.getElementById("accountModal");
const accountModalForm = document.getElementById("accountModalForm");
const accountModalTitle = document.getElementById("accountModalTitle");
const editAccountId = document.getElementById("editAccountId");
const modalAccountName = document.getElementById("modalAccountName");
const modalAccountRole = document.getElementById("modalAccountRole");
const modalAccountSchool = document.getElementById("modalAccountSchool");
const modalAccountGrade = document.getElementById("modalAccountGrade");

function openAccountModal(user = null) {
  if (!schoolsCache || schoolsCache.length === 0) schoolsCache = [...DEFAULT_SCHOOLS];
  if (!gradesCache || gradesCache.length === 0) gradesCache = [...DEFAULT_GRADES];

  if (modalAccountSchool) {
    modalAccountSchool.innerHTML = schoolsCache.map(s => `<option value="${s}">${s}</option>`).join("");
  }
  if (modalAccountGrade) {
    modalAccountGrade.innerHTML = gradesCache.map(g => `<option value="${g}">${g}</option>`).join("");
  }

  if (user) {
    accountModalTitle.innerHTML = `<i class="fa-solid fa-user-pen"></i> تعديل بيانات الحساب`;
    editAccountId.value = user.id;
    modalAccountName.value = user.name;
    modalAccountRole.value = user.role || "student";
    if (modalAccountSchool) modalAccountSchool.value = user.school || schoolsCache[0] || "";
    if (modalAccountGrade) modalAccountGrade.value = user.grade || gradesCache[0] || "";
  } else {
    accountModalTitle.innerHTML = `<i class="fa-solid fa-user-plus"></i> إضافة حساب جديد`;
    editAccountId.value = "";
    modalAccountName.value = "";
    modalAccountRole.value = "student";
    if (modalAccountSchool) modalAccountSchool.value = schoolsCache[0] || "";
    if (modalAccountGrade) modalAccountGrade.value = gradesCache[0] || "";
  }
  accountModal.classList.remove("hidden");
}

btnOpenAddAccountModal?.addEventListener("click", async () => {
  await loadCloudData();
  openAccountModal(null);
});

accountModalForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (accountModalForm.dataset.submitting === "true") return;

  const btnSubmit = accountModalForm.querySelector("button[type='submit']");
  const origBtnHtml = btnSubmit ? btnSubmit.innerHTML : "";

  const name = modalAccountName.value.trim();
  const role = modalAccountRole.value;
  const school = modalAccountSchool.value;
  const grade = modalAccountGrade.value;
  const targetId = editAccountId.value;

  const valid = validateQuadrupleName(name);
  if (!valid.isValid) {
    showToast(valid.message, "fa-triangle-exclamation");
    return;
  }

  const norm = normalizeArabic(name);

  accountModalForm.dataset.submitting = "true";
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ سحابياً...';
  }

  try {
    if (targetId) {
      // تعديل حساب موجود
      const user = participantsCache.find(p => p.id === targetId);
      if (user) {
        user.name = name;
        user.normalizedName = norm;
        user.role = role;
        user.school = school;
        user.grade = grade;
        await syncParticipantToCloud(user);
      }
      showToast("تم تحديث بيانات الحساب في السحابة بنجاح! ✓", "fa-circle-check");
    } else {
      // إضافة حساب جديد
      const newId = getDocumentId(norm);
      const nowIso = new Date().toISOString();
      const newUser = {
        id: newId,
        name,
        normalizedName: norm,
        role,
        school,
        grade,
        firstLoginAt: nowIso,
        lastLoginAt: nowIso,
        loginCount: 1
      };
      participantsCache.push(newUser);
      await syncParticipantToCloud(newUser);
      showToast("تم إنشاء الحساب وحفظه في السحابة بنجاح! ✓", "fa-circle-check");
    }

    saveParticipants();
    accountModal.classList.add("hidden");
    renderAccountsTable();
    renderSupervisorDashboard();
  } catch (err) {
    console.error("Account save error:", err);
    showToast("تعذر حفظ الحساب في السحابة: " + (err.message || ""), "fa-triangle-exclamation");
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = origBtnHtml;
    }
    delete accountModalForm.dataset.submitting;
  }
});

// --------------------------------------------------------
// إدارة المدارس والفئات (خاص بالمشرف العام حصراً)
// --------------------------------------------------------
const schoolsGradesModal = document.getElementById("schoolsGradesModal");
const schoolsTagsList = document.getElementById("schoolsTagsList");
const gradesTagsList = document.getElementById("gradesTagsList");
const formAddNewSchool = document.getElementById("formAddNewSchool");
const formAddNewGrade = document.getElementById("formAddNewGrade");
const newSchoolInput = document.getElementById("newSchoolInput");
const newGradeInput = document.getElementById("newGradeInput");
const schoolsCountBadge = document.getElementById("schoolsCountBadge");
const gradesCountBadge = document.getElementById("gradesCountBadge");

async function openSchoolsGradesModal() {
  if (!currentUser || currentUser.role !== "supervisor") {
    showToast("هذه الصلاحية خاصة بالمشرف العام فقط", "fa-shield-halved");
    return;
  }
  await loadCloudData();
  renderSchoolsAndGradesTags();
  schoolsGradesModal?.classList.remove("hidden");
}

btnManageSchoolsGrades?.addEventListener("click", openSchoolsGradesModal);

// إضافة مدرسة جديدة
formAddNewSchool?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!currentUser || currentUser.role !== "supervisor") {
    showToast("هذه الصلاحية خاصة بالمشرف العام فقط", "fa-shield-halved");
    return;
  }
  const val = newSchoolInput.value.trim();
  if (!val) return;

  if (schoolsCache.includes(val)) {
    showToast("المدرسة مسجلة بالفعل في القائمة!", "fa-circle-info");
    return;
  }

  schoolsCache.push(val);
  saveSchools();
  renderSchoolsAndGradesTags();
  updateDropdowns();
  newSchoolInput.value = "";
  showToast(`تمت إضافة مدرسة (${val}) بنجاح`, "fa-circle-check");
});

// إضافة صف / فئة جديدة
formAddNewGrade?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!currentUser || currentUser.role !== "supervisor") {
    showToast("هذه الصلاحية خاصة بالمشرف العام فقط", "fa-shield-halved");
    return;
  }
  const val = newGradeInput.value.trim();
  if (!val) return;

  if (gradesCache.includes(val)) {
    showToast("الصف أو الفئة مسجلة بالفعل في القائمة!", "fa-circle-info");
    return;
  }

  gradesCache.push(val);
  saveGrades();
  renderSchoolsAndGradesTags();
  updateDropdowns();
  newGradeInput.value = "";
  showToast(`تمت إضافة صف (${val}) بنجاح`, "fa-circle-check");
});

function renderSchoolsAndGradesTags() {
  if (schoolsCountBadge) {
    schoolsCountBadge.textContent = `${schoolsCache.length} مدارس`;
  }
  if (gradesCountBadge) {
    gradesCountBadge.textContent = `${gradesCache.length} صفوف`;
  }

  // عرض بطاقات المدارس
  if (schoolsTagsList) {
    if (schoolsCache.length === 0) {
      schoolsTagsList.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 15px; font-weight: 700;">لا توجد مدارس مسجلة بعد. أضف مدرسة من الأعلى.</div>`;
    } else {
      schoolsTagsList.innerHTML = schoolsCache.map(s => `
        <div class="sg-item-card">
          <div class="sg-item-info">
            <i class="fa-solid fa-school"></i>
            <span>${s}</span>
          </div>
          <button class="btn-delete-tag" data-del-school="${s}" title="حذف المدرسة">
            <i class="fa-solid fa-trash"></i> حذف
          </button>
        </div>
      `).join("");

      schoolsTagsList.querySelectorAll("[data-del-school]").forEach(b => {
        b.addEventListener("click", async () => {
          if (!currentUser || currentUser.role !== "supervisor") {
            showToast("هذه الصلاحية خاصة بالمشرف العام فقط", "fa-shield-halved");
            return;
          }
          const item = b.getAttribute("data-del-school");
          const confirmed = await showInAppConfirm({
            title: "تأكيد حذف المدرسة",
            message: `هل أنت متأكد من رغبتك في حذف مدرسة (${item}) نهائياً من قائمة المدارس المعتمدة بالمسابقة؟`,
            confirmText: "نعم، حذف المدرسة",
            cancelText: "إلغاء وتراجع",
            type: "danger",
            icon: "fa-trash"
          });

          if (confirmed) {
            schoolsCache = schoolsCache.filter(x => x !== item);
            saveSchools();
            renderSchoolsAndGradesTags();
            updateDropdowns();
            showToast(`تم حذف مدرسة (${item}) بنجاح`, "fa-trash");
          }
        });
      });
    }
  }

  // عرض بطاقات الصفوف
  if (gradesTagsList) {
    if (gradesCache.length === 0) {
      gradesTagsList.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 15px; font-weight: 700;">لا توجد صفوف مسجلة بعد. أضف صفاً من الأعلى.</div>`;
    } else {
      gradesTagsList.innerHTML = gradesCache.map(g => `
        <div class="sg-item-card">
          <div class="sg-item-info">
            <i class="fa-solid fa-layer-group"></i>
            <span>${g}</span>
          </div>
          <button class="btn-delete-tag" data-del-grade="${g}" title="حذف الصف">
            <i class="fa-solid fa-trash"></i> حذف
          </button>
        </div>
      `).join("");

      gradesTagsList.querySelectorAll("[data-del-grade]").forEach(b => {
        b.addEventListener("click", async () => {
          if (!currentUser || currentUser.role !== "supervisor") {
            showToast("هذه الصلاحية خاصة بالمشرف العام فقط", "fa-shield-halved");
            return;
          }
          const item = b.getAttribute("data-del-grade");
          const confirmed = await showInAppConfirm({
            title: "تأكيد حذف الصف أو الفئة",
            message: `هل أنت متأكد من رغبتك في حذف (${item}) نهائياً من قائمة الفئات المقررة بالمسابقة؟`,
            confirmText: "نعم، حذف الصف",
            cancelText: "إلغاء وتراجع",
            type: "danger",
            icon: "fa-trash"
          });

          if (confirmed) {
            gradesCache = gradesCache.filter(x => x !== item);
            saveGrades();
            renderSchoolsAndGradesTags();
            updateDropdowns();
            showToast(`تم حذف (${item}) بنجاح`, "fa-trash");
          }
        });
      });
    }
  }
}

// استعادة المدارس والصفوف الافتراضية بنقرة واحدة
document.getElementById("btnRestoreDefaultSchools")?.addEventListener("click", async () => {
  if (!currentUser || currentUser.role !== "supervisor") {
    showToast("هذه الصلاحية خاصة بالمشرف العام فقط", "fa-shield-halved");
    return;
  }
  const confirmed = await showInAppConfirm({
    title: "استعادة المدارس الافتراضية",
    message: "هل ترغب في استعادة قائمة المدارس والمراكز القرآنية النموذجية الافتراضية؟",
    confirmText: "نعم، استعادة",
    cancelText: "إلغاء",
    type: "info",
    icon: "fa-rotate-left"
  });
  if (confirmed) {
    schoolsCache = [...DEFAULT_SCHOOLS];
    saveSchools();
    renderSchoolsAndGradesTags();
    updateDropdowns();
    showToast("تمت استعادة المدارس النموذجية الافتراضية بنجاح", "fa-circle-check");
  }
});

document.getElementById("btnRestoreDefaultGrades")?.addEventListener("click", async () => {
  if (!currentUser || currentUser.role !== "supervisor") {
    showToast("هذه الصلاحية خاصة بالمشرف العام فقط", "fa-shield-halved");
    return;
  }
  const confirmed = await showInAppConfirm({
    title: "استعادة الصفوف الافتراضية",
    message: "هل ترغب في استعادة قائمة الصفوف المقررة الافتراضية؟",
    confirmText: "نعم، استعادة",
    cancelText: "إلغاء",
    type: "info",
    icon: "fa-rotate-left"
  });
  if (confirmed) {
    gradesCache = [...DEFAULT_GRADES];
    saveGrades();
    renderSchoolsAndGradesTags();
    updateDropdowns();
    showToast("تمت استعادة الصفوف المقررة الافتراضية بنجاح", "fa-circle-check");
  }
});

// --------------------------------------------------------
// بنك الاختبارات ومحرر الأسئلة اليدوي
// --------------------------------------------------------
const quizEditorModal = document.getElementById("quizEditorModal");
const quizEditorForm = document.getElementById("quizEditorForm");
const editQuizId = document.getElementById("editQuizId");
const quizTitleInput = document.getElementById("quizTitleInput");
const quizTargetGrade = document.getElementById("quizTargetGrade");
const quizAllowPracticeToggle = document.getElementById("quizAllowPracticeToggle");
const quizEnableHonorPointsToggle = document.getElementById("quizEnableHonorPointsToggle");
const quizHonorPointsSettings = document.getElementById("quizHonorPointsSettings");
const quizPointsModeActual = document.getElementById("quizPointsModeActual");
const quizPointsModeFixed = document.getElementById("quizPointsModeFixed");
const quizFixedPointsContainer = document.getElementById("quizFixedPointsContainer");
const quizHonorBonusPointsInput = document.getElementById("quizHonorBonusPointsInput");
const quizSectionsContainer = document.getElementById("quizSectionsContainer");
const btnAddSectionBtn = document.getElementById("btnAddSectionBtn");

// تفاعل حقول نقاط لوحة الشرف في محرر الاختبارات
quizEnableHonorPointsToggle?.addEventListener("change", () => {
  if (quizHonorPointsSettings) {
    quizHonorPointsSettings.style.display = quizEnableHonorPointsToggle.checked ? "block" : "none";
  }
});

document.querySelectorAll('input[name="quizPointsModeRadio"]').forEach(r => {
  r.addEventListener("change", () => {
    if (quizFixedPointsContainer) {
      if (quizPointsModeFixed?.checked) {
        quizFixedPointsContainer.classList.remove("hidden");
        quizFixedPointsContainer.style.display = "flex";
      } else {
        quizFixedPointsContainer.classList.add("hidden");
        quizFixedPointsContainer.style.display = "none";
      }
    }
  });
});

function renderQuizzesList() {
  if (!quizzesListGrid) return;

  if (quizzesCache.length === 0) {
    quizzesListGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px; color: #64748b; background: #ffffff; border: 2px dashed #cbd5e1; border-radius: var(--radius-lg);">
        <i class="fa-solid fa-clipboard-question" style="font-size: 42px; margin-bottom: 12px; color: #94a3b8; display: block;"></i>
        <h4 style="font-weight: 800; font-size: 16px; color: #334155; margin-bottom: 6px;">بنك الاختبارات فارغ حالياً</h4>
        <p style="font-size: 13.5px; margin-bottom: 16px; color: #64748b;">لا توجد اختبارات محفوظة في قاعدة البيانات السحابية. يمكنك إنشاء اختبار جديد يدوياً أو عبر الذكاء الاصطناعي، أو استيراد النماذج المعتمدة.</p>
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          <button id="btnEmptyCreateManual" class="btn-duo-green btn-sm"><i class="fa-solid fa-pen-to-square"></i> إنشاء اختبار يدوي</button>
          <button id="btnEmptyCreateAI" class="btn-duo-blue btn-sm"><i class="fa-solid fa-wand-magic-sparkles"></i> توليد بالذكاء الاصطناعي</button>
          <button id="btnImportInitialTemplates" class="btn-duo-outline btn-sm" style="border-color: #6366f1; color: #6366f1;"><i class="fa-solid fa-cloud-arrow-up"></i> استيراد نماذج نور البيان المقررة</button>
        </div>
      </div>
    `;

    document.getElementById("btnEmptyCreateManual")?.addEventListener("click", () => openQuizEditor(null));
    document.getElementById("btnEmptyCreateAI")?.addEventListener("click", () => btnOpenAIQuizModal?.click());
    document.getElementById("btnImportInitialTemplates")?.addEventListener("click", async () => {
      const ok = await showInAppConfirm({
        title: "استيراد نماذج نور البيان المعتمدة",
        message: "هل ترغب في رفع نماذج اختبارات نور البيان المعتمدة تلقائياً إلى قاعدة البيانات السحابية؟",
        confirmText: "نعم، استيراد وحفظ بالسحابة",
        cancelText: "إلغاء",
        type: "info",
        icon: "fa-cloud-arrow-up"
      });
      if (ok) {
        showGlobalLoader("جاري استيراد النماذج...", "يتم حفظ النماذج المعتمدة في السحابة ومزامنتها");
        try {
          for (const q of INITIAL_QUIZZES) {
            await syncQuizToCloud(q);
          }
          await setDoc(doc(db, "system_settings", "quizzes_config"), {
            initialized: true,
            lastUpdated: serverTimestamp()
          }, { merge: true });
          await loadCloudData();
          renderQuizzesList();
          renderStudentPracticeQuizzes();
          updateDropdowns();
          showToast("تم استيراد وحفظ نماذج الاختبارات في السحابة بنجاح!", "fa-circle-check");
        } finally {
          hideGlobalLoader();
        }
      }
    });
    return;
  }

  quizzesListGrid.innerHTML = quizzesCache.map(q => {
    const secList = Array.isArray(q.sections) ? q.sections : [];
    const questionsCount = secList.reduce((acc, s) => acc + (Array.isArray(s?.questions) ? s.questions.length : 0), 0);
    return `
      <div class="quiz-card-duo">
        <div class="quiz-card-top">
          <span class="quiz-grade-badge"><i class="fa-solid fa-layer-group"></i> ${q.targetGrade || 'عام'}</span>
          <h4 class="quiz-card-title">${q.title || 'اختبار نور البيان'}</h4>
          <div class="quiz-card-info">
            <span><i class="fa-solid fa-list-check"></i> ${secList.length} أقسام</span>
            <span><i class="fa-solid fa-circle-question"></i> ${questionsCount} أسئلة</span>
            <span><i class="fa-solid fa-dumbbell"></i> ${q.allowPractice ? 'تدريب متاح' : 'رسمي فقط'}</span>
          </div>
        </div>
        <div class="quiz-card-actions">
          <button class="btn-duo-outline btn-sm btn-edit-quiz" data-id="${q.id}">
            <i class="fa-solid fa-pen"></i> تعديل
          </button>
          <button class="btn-duo-yellow btn-sm btn-launch-room" data-id="${q.id}">
            <i class="fa-solid fa-display"></i> فتح في عرض حي
          </button>
          <button class="btn-duo-outline btn-sm btn-delete-quiz" data-id="${q.id}" style="border-color: #fca5a5; color: #dc2626;">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");

  quizzesListGrid.querySelectorAll(".btn-edit-quiz").forEach(b => {
    b.addEventListener("click", () => {
      const q = quizzesCache.find(x => x.id === b.getAttribute("data-id"));
      if (q) openQuizEditor(q);
    });
  });

  quizzesListGrid.querySelectorAll(".btn-delete-quiz").forEach(b => {
    b.addEventListener("click", async () => {
      const qId = b.getAttribute("data-id");
      const targetQuiz = quizzesCache.find(x => x.id === qId) || quizzesCache.find(x => String(x.id) === String(qId));
      const safeId = qId || (targetQuiz ? targetQuiz.id : null);
      const title = targetQuiz ? targetQuiz.title : "هذا الاختبار";

      const confirmed = await showInAppConfirm({
        title: "تأكيد حذف الاختبار نهائياً للجميع",
        message: `هل أنت متأكد من رغبتك في حذف (${title}) نهائياً من قاعدة البيانات السحابية وبنك الأسئلة لجميع المستخدمين؟`,
        confirmText: "نعم، حذف الاختبار للجميع",
        cancelText: "إلغاء وتراجع",
        type: "danger",
        icon: "fa-trash"
      });

      if (confirmed) {
        b.disabled = true;
        b.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        showGlobalLoader("جاري حذف الاختبار سحابياً...", "يتم الحذف من قاعدة البيانات السحابية Firestore لجميع المستخدمين");
        try {
          if (safeId) {
            await deleteDoc(doc(db, "quizzes", String(safeId)));
          }

          quizzesCache = quizzesCache.filter(x => String(x.id) !== String(safeId) && String(x.id) !== String(qId));
          localStorage.setItem("nour_quizzes", JSON.stringify(quizzesCache));
          if (editQuizId) editQuizId.value = "";

          renderQuizzesList();
          renderStudentPracticeQuizzes();
          updateDropdowns();
          if (statActiveQuizzes) statActiveQuizzes.textContent = quizzesCache.length;

          showToast(`تم حذف الاختبار (${title}) نهائياً من السحابة بنجاح!`, "fa-trash");
        } catch (err) {
          console.error("Quiz delete error:", err);
          showToast("تعذر حذف الاختبار من السحابة: " + (err.message || ""), "fa-triangle-exclamation");
          b.disabled = false;
          b.innerHTML = '<i class="fa-solid fa-trash"></i>';
        } finally {
          hideGlobalLoader();
        }
      }
    });
  });

  quizzesListGrid.querySelectorAll(".btn-launch-room").forEach(b => {
    b.addEventListener("click", () => {
      const qId = b.getAttribute("data-id");
      openCreateRoomModal(qId);
    });
  });
}

function openQuizEditor(quiz = null) {
  const editorTitle = document.getElementById("quizEditorTitle");
  if (quiz) {
    editQuizId.value = quiz.id;
    quizTitleInput.value = quiz.title;
    quizTargetGrade.value = quiz.targetGrade;
    quizAllowPracticeToggle.checked = quiz.allowPractice !== false;
    
    // ضبط إعدادات نقاط لوحة الشرف
    const enableHonor = quiz.enableHonorPoints !== false;
    if (quizEnableHonorPointsToggle) quizEnableHonorPointsToggle.checked = enableHonor;
    if (quizHonorPointsSettings) quizHonorPointsSettings.style.display = enableHonor ? "block" : "none";
    
    const mode = quiz.honorPointsMode || "actual";
    if (quizPointsModeActual) quizPointsModeActual.checked = (mode === "actual");
    if (quizPointsModeFixed) quizPointsModeFixed.checked = (mode === "fixed");
    if (quizFixedPointsContainer) {
      quizFixedPointsContainer.style.display = (mode === "fixed") ? "flex" : "none";
      if (mode === "fixed") quizFixedPointsContainer.classList.remove("hidden");
      else quizFixedPointsContainer.classList.add("hidden");
    }
    if (quizHonorBonusPointsInput) quizHonorBonusPointsInput.value = quiz.honorBonusPoints || 20;

    if (editorTitle) editorTitle.textContent = `تعديل الاختبار: ${quiz.title}`;
    renderSectionsInEditor(quiz.sections);
  } else {
    editQuizId.value = "";
    quizTitleInput.value = "";
    quizTargetGrade.value = gradesCache[0] || "صف أول";
    quizAllowPracticeToggle.checked = true;
    
    // قيم افتراضية للاختبار الجديد
    if (quizEnableHonorPointsToggle) quizEnableHonorPointsToggle.checked = true;
    if (quizHonorPointsSettings) quizHonorPointsSettings.style.display = "block";
    if (quizPointsModeActual) quizPointsModeActual.checked = true;
    if (quizPointsModeFixed) quizPointsModeFixed.checked = false;
    if (quizFixedPointsContainer) {
      quizFixedPointsContainer.style.display = "none";
      quizFixedPointsContainer.classList.add("hidden");
    }
    if (quizHonorBonusPointsInput) quizHonorBonusPointsInput.value = 20;

    if (editorTitle) editorTitle.textContent = "إنشاء اختبار قرآني جديد";
    renderSectionsInEditor([
      {
        sectionName: "القسم 1: الحروف والتلاوة",
        questions: [
          { type: "oral", font: "quran", text: "اقرأ الكلمات الآتية بضبط الحركات:", points: 5, targetOral: "كَتَبَ - بَلَغَ - وَجَدَ" }
        ]
      }
    ]);
  }
  quizEditorModal.classList.remove("hidden");
}

btnOpenManualQuizModal?.addEventListener("click", () => openQuizEditor(null));

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderSectionsInEditor(sections) {
  if (!quizSectionsContainer) return;
  quizSectionsContainer.innerHTML = sections.map((sec, secIdx) => `
    <div class="section-item-box" data-section-idx="${secIdx}">
      <div class="section-item-header">
        <input type="text" class="form-control section-name-input" value="${escapeHtml(sec.sectionName)}" placeholder="اسم القسم...">
        <button type="button" class="btn-duo-outline btn-sm btn-add-q-to-sec" data-sec="${secIdx}">
          <i class="fa-solid fa-plus"></i> إضافة سؤال
        </button>
        <button type="button" class="btn-icon-action delete btn-remove-sec" data-sec="${secIdx}" title="حذف القسم">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>

      <div class="questions-list-sec">
        ${(sec.questions || []).map((q, qIdx) => renderQuestionCardHtml(secIdx, qIdx, q)).join("")}
      </div>
    </div>
  `).join("");

  bindQuestionEditorEvents();
}

function renderQuestionCardHtml(secIdx, qIdx, q) {
  const qUid = 'quid_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const qType = q.type || "mcq";
  const qFont = q.font || "quran";
  const qPoints = q.points || 5;
  const qText = q.text || "";
  const options = Array.isArray(q.options) && q.options.length > 0 ? q.options : ["خيار 1", "خيار 2", "خيار 3", "خيار 4"];
  const correctIdx = q.correct !== undefined ? q.correct : 0;
  const pairs = Array.isArray(q.pairs) && q.pairs.length > 0
    ? q.pairs.map(p => Array.isArray(p) ? p : [p.left || "", p.right || ""])
    : [["", ""]];
  const items = Array.isArray(q.items) && q.items.length > 0 ? q.items : ["كلمة 1", "كلمة 2"];
  const targetSentence = q.targetSentence || (items.length > 0 ? items.join(" ") : "");

  return `
    <div class="question-edit-card" data-sec-idx="${secIdx}" data-q-idx="${qIdx}" data-card-uid="${qUid}">
      <div class="question-meta-row">
        <select class="form-control form-select q-type-select" style="flex: 1; min-width: 140px; font-size: 13px;">
          <option value="mcq" ${qType === 'mcq' ? 'selected' : ''}>خيارات متعددة (MCQ)</option>
          <option value="matching" ${qType === 'matching' ? 'selected' : ''}>توصيل (Matching)</option>
          <option value="ordering" ${qType === 'ordering' ? 'selected' : ''}>ترتيب (Ordering)</option>
          <option value="oral" ${qType === 'oral' ? 'selected' : ''}>شفهي (تلاوة وتهجي)</option>
        </select>

        <select class="form-control form-select q-font-select font-select-duo" style="flex: 1; min-width: 130px; font-size: 13px;">
          <option value="quran" ${qFont === 'quran' ? 'selected' : ''}>خط المصحف (الرسم العثماني)</option>
          <option value="amiri" ${qFont === 'amiri' ? 'selected' : ''}>خط الأميري</option>
          <option value="normal" ${qFont === 'normal' ? 'selected' : ''}>الخط العادي</option>
        </select>

        <label class="q-points-label" title="درجات السؤال">
          <i class="fa-solid fa-star" style="color: #f59e0b; font-size: 12px;"></i>
          <input type="number" class="q-points-input" value="${qPoints}" min="1" max="20" title="درجات السؤال">
          <span style="font-size: 11px; color: #64748b;">درجة</span>
        </label>

        <button type="button" class="btn-icon-action delete btn-remove-q" title="حذف السؤال">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>

      <div class="input-group" style="margin-bottom: 8px;">
        <label style="font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 4px; display: block;">
          نص أو عنوان السؤال مع الضبط بالشكل:
        </label>
        <textarea class="form-control q-text-input font-${qFont}" rows="2" placeholder="اكتب نص السؤال بدقة مع التشكيل...">${escapeHtml(qText)}</textarea>
      </div>

      <!-- 1. محرر خيارات MCQ -->
      <div class="mcq-builder-box ${qType === 'mcq' ? '' : 'hidden'}">
        <div class="builder-subheading">
          <i class="fa-solid fa-list-ol"></i> الخيارات (حدد الإجابة الصحيحة بالضغط على الدائرة الخضراء):
        </div>
        <div class="mcq-options-list">
          ${options.map((opt, oIdx) => `
            <div class="mcq-option-row ${oIdx === correctIdx ? 'is-correct' : ''}">
              <input type="radio" name="correct_radio_${qUid}" class="mcq-radio-custom" value="${oIdx}" ${oIdx === correctIdx ? 'checked' : ''} title="تعيين كإجابة صحيحة">
              <span style="font-size: 13px; font-weight: 800; color: #64748b; min-width: 45px;">خيار ${oIdx + 1}</span>
              <input type="text" class="mcq-opt-input font-${qFont}" value="${escapeHtml(opt)}" placeholder="اكتب نص الخيار هنا...">
              <button type="button" class="btn-icon-action delete btn-remove-mcq-opt" title="حذف هذا الخيار">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          `).join("")}
        </div>
        <button type="button" class="btn-duo-outline btn-sm btn-add-mcq-opt">
          <i class="fa-solid fa-plus"></i> إضافة خيار إضافي
        </button>
      </div>

      <!-- 2. محرر التوصيل (Matching) -->
      <div class="matching-builder-box ${qType === 'matching' ? '' : 'hidden'}">
        <div class="builder-subheading">
          <i class="fa-solid fa-arrows-split-up-and-left"></i> أزواج التوصيل (اكتب الموصل والموصل إليه قبال بعض):
        </div>
        <div class="matching-pairs-list">
          ${pairs.map(pair => `
            <div class="matching-pair-row">
              <input type="text" class="form-control match-left-input font-${qFont}" value="${escapeHtml(pair[0] || '')}" placeholder="الطرف الأول (الموصل)...">
              <span class="match-arrow-badge"><i class="fa-solid fa-arrow-left-long"></i></span>
              <input type="text" class="form-control match-right-input" value="${escapeHtml(pair[1] || '')}" placeholder="الطرف المقابل (الموصل إليه)...">
              <button type="button" class="btn-icon-action delete btn-remove-match-pair" title="حذف هذا الزوج">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          `).join("")}
        </div>
        <button type="button" class="btn-duo-outline btn-sm btn-add-match-pair">
          <i class="fa-solid fa-plus"></i> إضافة زوج توصيل جديد
        </button>
      </div>

      <!-- 3. محرر الترتيب (Ordering) -->
      <div class="ordering-builder-box ${qType === 'ordering' ? '' : 'hidden'}">
        <div class="builder-subheading">
          <i class="fa-solid fa-arrow-down-1-9"></i> ترتيب الجمل والكلمات:
        </div>
        <div class="ordering-sentence-row">
          <input type="text" class="form-control ordering-sentence-input font-${qFont}" value="${escapeHtml(targetSentence)}" placeholder="اكتب الجملة كاملة هنا ثم اضغط تفريق الكلمات...">
          <button type="button" class="btn-duo-blue btn-sm btn-split-sentence" style="white-space: nowrap;">
            <i class="fa-solid fa-wand-magic-sparkles"></i> تفريق الكلمات
          </button>
        </div>
        <div class="ordering-items-list">
          ${items.map((itm, iIdx) => `
            <div class="ordering-item-row">
              <span class="ordering-num-badge">${iIdx + 1}</span>
              <input type="text" class="form-control ordering-item-input font-${fontHelper(qFont)}" value="${escapeHtml(itm)}" placeholder="الكلمة / العنصر...">
              <button type="button" class="btn-icon-action delete btn-remove-order-item" title="حذف هذا العنصر">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          `).join("")}
        </div>
        <button type="button" class="btn-duo-outline btn-sm btn-add-order-item">
          <i class="fa-solid fa-plus"></i> إضافة كلمة / عنصر للترتيب
        </button>
      </div>

      <!-- 4. محرر السؤال الشفهي (عنوان + الكلمة/الآية) -->
      <div class="oral-builder-box ${qType === 'oral' ? '' : 'hidden'}">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
          <i class="fa-solid fa-microphone-lines" style="font-size: 18px; color: #ca8a04;"></i>
          <span style="font-size: 13px; font-weight: 800; color: #854d0e;">سؤال شفهي (قراءة وتلاوة)</span>
        </div>

        <div class="oral-target-wrapper">
          <label style="font-size: 12.5px; font-weight: 800; color: #854d0e; margin-bottom: 5px; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-pen-to-square"></i> الكلمة / الآية / النص المطلوب قراءته:
          </label>
          <textarea class="oral-target-input font-${qFont} q-oral-target-input" rows="2" placeholder="اكتب هنا الكلمات أو الآيات المطلوب قراءتها بالرسم العثماني مع التشكيل التام...">${escapeHtml(q.targetOral || '')}</textarea>
          <p class="oral-builder-hint">
            <i class="fa-solid fa-circle-info"></i>
            هذا النص يظهر بخط كبير واضح أمام المتسابق والمعلمين أثناء التقييم الشفهي.
          </p>
        </div>
      </div>

    </div>
  `;
}

function fontHelper(f) {
  return f || "quran";
}

let isQuestionEditorDelegated = false;
function bindQuestionEditorEvents() {
  if (!quizSectionsContainer || isQuestionEditorDelegated) return;
  isQuestionEditorDelegated = true;

  // 1. تفويض أحداث النقر داخل الحاوية لمنع تكرار المستمعات نهائياً
  quizSectionsContainer.addEventListener("click", (e) => {
    // إضافة سؤال جديد لقسم
    const addQBtn = e.target.closest(".btn-add-q-to-sec");
    if (addQBtn) {
      const secBox = addQBtn.closest(".section-item-box");
      const list = secBox?.querySelector(".questions-list-sec");
      const secIdx = secBox?.getAttribute("data-section-idx") || 0;
      const qIdx = list?.querySelectorAll(".question-edit-card").length || 0;
      const newCardHtml = renderQuestionCardHtml(secIdx, qIdx, {
        type: "mcq",
        font: "quran",
        text: "",
        points: 5,
        options: ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
        correct: 0
      });
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = newCardHtml;
      const newCard = tempDiv.firstElementChild;
      if (list && newCard) {
        list.appendChild(newCard);
        newCard.scrollIntoView({ behavior: "smooth", block: "center" });
        newCard.classList.add("highlight-new-section");
        setTimeout(() => newCard.classList.remove("highlight-new-section"), 2200);
        const textInp = newCard.querySelector(".q-text-input");
        if (textInp) textInp.focus();
      }
      return;
    }

    // حذف قسم
    const removeSecBtn = e.target.closest(".btn-remove-sec");
    if (removeSecBtn) {
      const secBox = removeSecBtn.closest(".section-item-box");
      if (quizSectionsContainer.querySelectorAll(".section-item-box").length > 1) {
        secBox?.remove();
      } else {
        showToast("يجب أن يحتوي الاختبار على قسم واحد على الأقل", "fa-triangle-exclamation");
      }
      return;
    }

    // حذف سؤال
    const removeQBtn = e.target.closest(".btn-remove-q");
    if (removeQBtn) {
      const card = removeQBtn.closest(".question-edit-card");
      card?.remove();
      return;
    }

    // إضافة خيار MCQ
    const addMcqOptBtn = e.target.closest(".btn-add-mcq-opt");
    if (addMcqOptBtn) {
      const card = addMcqOptBtn.closest(".question-edit-card");
      const list = card?.querySelector(".mcq-options-list");
      const cardUid = card?.getAttribute("data-card-uid") || ('quid_' + Math.random().toString(36).slice(2, 9));
      const font = card?.querySelector(".q-font-select")?.value || "quran";
      const count = list ? list.querySelectorAll(".mcq-option-row").length : 0;

      const newRow = document.createElement("div");
      newRow.className = "mcq-option-row";
      newRow.innerHTML = `
        <input type="radio" name="correct_radio_${cardUid}" class="mcq-radio-custom" value="${count}" title="تعيين كإجابة صحيحة">
        <span style="font-size: 13px; font-weight: 800; color: #64748b; min-width: 45px;">خيار ${count + 1}</span>
        <input type="text" class="mcq-opt-input font-${font}" value="" placeholder="اكتب نص الخيار هنا...">
        <button type="button" class="btn-icon-action delete btn-remove-mcq-opt" title="حذف هذا الخيار">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;
      list?.appendChild(newRow);
      return;
    }

    // حذف خيار MCQ
    const removeMcqOptBtn = e.target.closest(".btn-remove-mcq-opt");
    if (removeMcqOptBtn) {
      const row = removeMcqOptBtn.closest(".mcq-option-row");
      const list = removeMcqOptBtn.closest(".mcq-options-list");
      if (list && list.querySelectorAll(".mcq-option-row").length > 2) {
        row?.remove();
      } else {
        showToast("يجب أن يحتوي السؤال على خيارين على الأقل", "fa-circle-info");
      }
      return;
    }

    // إضافة زوج توصيل
    const addMatchBtn = e.target.closest(".btn-add-match-pair");
    if (addMatchBtn) {
      const card = addMatchBtn.closest(".question-edit-card");
      const list = card?.querySelector(".matching-pairs-list");
      const font = card?.querySelector(".q-font-select")?.value || "quran";

      const newRow = document.createElement("div");
      newRow.className = "matching-pair-row";
      newRow.innerHTML = `
        <input type="text" class="form-control match-left-input font-${font}" value="" placeholder="الطرف الأول (الموصل)...">
        <span class="match-arrow-badge"><i class="fa-solid fa-arrow-left-long"></i></span>
        <input type="text" class="form-control match-right-input" value="" placeholder="الطرف المقابل (الموصل إليه)...">
        <button type="button" class="btn-icon-action delete btn-remove-match-pair" title="حذف هذا الزوج">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;
      list?.appendChild(newRow);
      return;
    }

    // حذف زوج توصيل
    const removeMatchBtn = e.target.closest(".btn-remove-match-pair");
    if (removeMatchBtn) {
      removeMatchBtn.closest(".matching-pair-row")?.remove();
      return;
    }

    // تفريق جملة الترتيب
    const splitSentBtn = e.target.closest(".btn-split-sentence");
    if (splitSentBtn) {
      const card = splitSentBtn.closest(".question-edit-card");
      const sentInput = card?.querySelector(".ordering-sentence-input");
      const list = card?.querySelector(".ordering-items-list");
      const font = card?.querySelector(".q-font-select")?.value || "quran";
      const text = sentInput ? sentInput.value.trim() : "";
      if (!text) {
        showToast("يرجى كتابة الجملة المطلوب ترتيبها أولاً!", "fa-circle-info");
        return;
      }
      const words = text.split(/\s+/).filter(Boolean);
      if (list) {
        list.innerHTML = words.map((w, idx) => `
          <div class="ordering-item-row">
            <span class="ordering-num-badge">${idx + 1}</span>
            <input type="text" class="form-control ordering-item-input font-${font}" value="${escapeHtml(w)}" placeholder="الكلمة / العنصر...">
            <button type="button" class="btn-icon-action delete btn-remove-order-item" title="حذف هذا العنصر">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        `).join("");
      }
      showToast(`تم تفريق الجملة إلى ${words.length} كلمات بنجاح!`, "fa-wand-magic-sparkles");
      return;
    }

    // إضافة عنصر ترتيب
    const addOrderBtn = e.target.closest(".btn-add-order-item");
    if (addOrderBtn) {
      const card = addOrderBtn.closest(".question-edit-card");
      const list = card?.querySelector(".ordering-items-list");
      const font = card?.querySelector(".q-font-select")?.value || "quran";
      const count = list ? list.querySelectorAll(".ordering-item-row").length : 0;

      const newRow = document.createElement("div");
      newRow.className = "ordering-item-row";
      newRow.innerHTML = `
        <span class="ordering-num-badge">${count + 1}</span>
        <input type="text" class="form-control ordering-item-input font-${font}" value="" placeholder="الكلمة / العنصر...">
        <button type="button" class="btn-icon-action delete btn-remove-order-item" title="حذف هذا العنصر">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;
      list?.appendChild(newRow);
      return;
    }

    // حذف عنصر ترتيب
    const removeOrderBtn = e.target.closest(".btn-remove-order-item");
    if (removeOrderBtn) {
      const list = removeOrderBtn.closest(".ordering-items-list");
      removeOrderBtn.closest(".ordering-item-row")?.remove();
      if (list) updateOrderingBadges(list);
      return;
    }
  });

  // 2. تفويض أحداث التغيير داخل الحاوية
  quizSectionsContainer.addEventListener("change", (e) => {
    // تغيير نوع السؤال
    if (e.target.classList.contains("q-type-select")) {
      const card = e.target.closest(".question-edit-card");
      const val = e.target.value;
      const mcqBox = card?.querySelector(".mcq-builder-box");
      const matchBox = card?.querySelector(".matching-builder-box");
      const orderBox = card?.querySelector(".ordering-builder-box");
      const oralBox = card?.querySelector(".oral-builder-box");

      mcqBox?.classList.toggle("hidden", val !== "mcq");
      matchBox?.classList.toggle("hidden", val !== "matching");
      orderBox?.classList.toggle("hidden", val !== "ordering");
      oralBox?.classList.toggle("hidden", val !== "oral");
      return;
    }

    // تغيير نوع الخط
    if (e.target.classList.contains("q-font-select")) {
      const card = e.target.closest(".question-edit-card");
      const font = e.target.value;
      const ta = card?.querySelector(".q-text-input");
      if (ta) ta.className = `form-control q-text-input font-${font}`;
      card?.querySelectorAll(".mcq-opt-input, .match-left-input, .ordering-sentence-input, .ordering-item-input, .q-oral-target-input").forEach(inp => {
        inp.classList.remove("font-quran", "font-amiri", "font-normal");
        inp.classList.add(`font-${font}`);
      });
      return;
    }

    // اختيار الراديو للخيارات الصحيحة في MCQ
    if (e.target.classList.contains("mcq-radio-custom")) {
      const list = e.target.closest(".mcq-options-list");
      if (list) {
        list.querySelectorAll(".mcq-option-row").forEach(row => row.classList.remove("is-correct"));
        const parentRow = e.target.closest(".mcq-option-row");
        if (parentRow) parentRow.classList.add("is-correct");
      }
      return;
    }
  });
}

function updateOrderingBadges(list) {
  list.querySelectorAll(".ordering-item-row").forEach((row, idx) => {
    const badge = row.querySelector(".ordering-num-badge");
    if (badge) badge.textContent = idx + 1;
  });
}

btnAddSectionBtn?.addEventListener("click", () => {
  const currentSections = extractSectionsFromEditor();
  currentSections.push({
    sectionName: `القسم ${currentSections.length + 1}: جديد`,
    questions: [
      {
        type: "mcq",
        font: "quran",
        text: "نص السؤال الجديد",
        points: 5,
        options: ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
        correct: 0
      }
    ]
  });
  renderSectionsInEditor(currentSections);

  // التمرير التلقائي السلس إلى مكان القسم الجديد وإبرازه فوراً للمشرف
  setTimeout(() => {
    const allSecs = quizSectionsContainer.querySelectorAll(".section-item-box");
    const newSec = allSecs[allSecs.length - 1];
    if (newSec) {
      newSec.scrollIntoView({ behavior: "smooth", block: "center" });
      newSec.classList.add("highlight-new-section");
      setTimeout(() => newSec.classList.remove("highlight-new-section"), 2200);
      const nameInp = newSec.querySelector(".section-name-input");
      if (nameInp) nameInp.focus();
    }
  }, 100);
});

function extractSectionsFromEditor() {
  const secBoxes = quizSectionsContainer.querySelectorAll(".section-item-box");
  const sections = [];
  secBoxes.forEach(secBox => {
    const nameInput = secBox.querySelector(".section-name-input");
    const sectionName = nameInput ? nameInput.value.trim() : "قسم";
    const qCards = secBox.querySelectorAll(".question-edit-card");
    const questions = [];

    qCards.forEach(card => {
      const type = card.querySelector(".q-type-select").value;
      const font = card.querySelector(".q-font-select").value;
      const points = parseInt(card.querySelector(".q-points-input").value) || 5;
      const text = card.querySelector(".q-text-input").value.trim();

      const qObj = { type, font, points, text };

      if (type === "mcq") {
        const optionInputs = card.querySelectorAll(".mcq-opt-input");
        const options = [];
        let correctIdx = 0;
        optionInputs.forEach((inp, idx) => {
          const val = inp.value.trim();
          if (val) options.push(val);
          const radio = inp.closest(".mcq-option-row")?.querySelector(".mcq-radio-custom");
          if (radio && radio.checked) {
            correctIdx = options.length - 1;
          }
        });
        qObj.options = options.length >= 2 ? options : (options.length === 1 ? [options[0], "خيار آخر"] : ["خيار 1", "خيار 2"]);
        qObj.correct = Math.max(0, Math.min(qObj.options.length - 1, correctIdx));

      } else if (type === "matching") {
        const pairs = [];
        card.querySelectorAll(".matching-pair-row").forEach(pRow => {
          const left = pRow.querySelector(".match-left-input")?.value.trim() || "";
          const right = pRow.querySelector(".match-right-input")?.value.trim() || "";
          if (left || right) {
            pairs.push([left, right]);
          }
        });
        qObj.pairs = pairs.length > 0 ? pairs : [["طرف 1", "مقابل 1"], ["طرف 2", "مقابل 2"]];

      } else if (type === "ordering") {
        const items = [];
        card.querySelectorAll(".ordering-item-input").forEach(inp => {
          const val = inp.value.trim();
          if (val) items.push(val);
        });
        const sentenceVal = card.querySelector(".ordering-sentence-input")?.value.trim() || "";
        qObj.items = items.length > 0 ? items : (sentenceVal ? sentenceVal.split(/\s+/).filter(Boolean) : ["كلمة 1", "كلمة 2"]);
        qObj.targetSentence = sentenceVal || qObj.items.join(" ");
      } else if (type === "oral") {
        const targetOralVal = card.querySelector(".q-oral-target-input")?.value.trim() || "";
        qObj.targetOral = targetOralVal;
      }

      questions.push(qObj);
    });

    sections.push({ sectionName, questions });
  });
  return sections;
}

quizEditorForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (quizEditorForm.dataset.submitting === "true") return;

  const btnSave = document.getElementById("btnSaveQuiz") || quizEditorForm.querySelector("button[type='submit']");
  const origBtnHtml = btnSave ? btnSave.innerHTML : "";

  const title = quizTitleInput.value.trim();
  const targetGrade = quizTargetGrade.value;
  const allowPractice = quizAllowPracticeToggle ? quizAllowPracticeToggle.checked : true;
  const enableHonorPoints = quizEnableHonorPointsToggle ? quizEnableHonorPointsToggle.checked : true;
  const honorPointsMode = quizPointsModeFixed?.checked ? "fixed" : "actual";
  const honorBonusPoints = parseInt(quizHonorBonusPointsInput?.value || "20") || 20;
  const sections = extractSectionsFromEditor();

  if (!title) {
    showToast("يرجى كتابة عنوان للاختبار للمتابعة.", "fa-triangle-exclamation");
    quizTitleInput.focus();
    return;
  }

  if (sections.length === 0 || sections[0].questions.length === 0) {
    showToast("يرجى إضافة سؤال واحد على الأقل للاختبار.", "fa-triangle-exclamation");
    return;
  }

  quizEditorForm.dataset.submitting = "true";
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ في السحابة للجميع...';
  }

  const now = Date.now();
  const rawEditId = editQuizId.value ? editQuizId.value.trim() : "";
  const qId = rawEditId || ("quiz_" + now + "_" + Math.random().toString(36).slice(2, 8));

  const existingIdx = quizzesCache.findIndex(q => String(q.id) === String(qId));
  const isEdit = existingIdx >= 0 || !!rawEditId;

  const quizObj = {
    id: qId,
    title,
    targetGrade,
    allowPractice,
    enableHonorPoints,
    honorPointsMode,
    honorBonusPoints,
    sections,
    updatedAt: now,
    lastModifiedBy: currentUser ? currentUser.name : "مشرف"
  };

  try {
    // 1. الحفظ السحابي الحقيقي والمباشر في Firestore لجميع المستخدمين
    const cleanQuiz = sanitizeForFirestore(quizObj);
    const quizRef = doc(db, "quizzes", String(quizObj.id));
    await setDoc(quizRef, {
      ...cleanQuiz,
      id: String(quizObj.id),
      updatedAt: now,
      lastUpdated: serverTimestamp()
    });

    // 2. تحديث الذاكرة المحلية والكاش مباشرة بعد إتمام الحفظ السحابي
    const normalized = normalizeQuizFromCloud(quizObj);
    if (existingIdx >= 0) {
      quizzesCache[existingIdx] = normalized;
    } else {
      quizzesCache.unshift(normalized);
    }
    localStorage.setItem("nour_quizzes", JSON.stringify(quizzesCache));
    localStorage.setItem("nour_quizzes_init_done", "true");

    // 3. إغلاق النافذة وتصفير المحرر وتحديث الواجهات فورياً
    editQuizId.value = "";
    quizEditorModal.classList.add("hidden");
    renderQuizzesList();
    renderStudentPracticeQuizzes();
    updateDropdowns();
    if (statActiveQuizzes) statActiveQuizzes.textContent = quizzesCache.length;

    showToast(isEdit ? `تم حفظ تعديل الاختبار «${title}» في السحابة وتحديثه للجميع بنجاح! ✓` : `تم إنشاء الاختبار «${title}» وحفظه سحابياً للجميع بنجاح! ✓`, "fa-circle-check");
  } catch (err) {
    console.error("Firestore saveQuiz error:", err);
    showToast("تعذر حفظ الاختبار في السحابة: " + (err.message || "يرجى التحقق من اتصالك بالإنترنت"), "fa-triangle-exclamation");
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.innerHTML = origBtnHtml;
    }
    delete quizEditorForm.dataset.submitting;
  }
});

// تصفير معرف الاختبار عند إغلاق النافذة المنبثقة لضمان عدم الخلط بين الإنشاء والتعديل
document.querySelectorAll("[data-close-modal='quizEditorModal']").forEach(b => {
  b.addEventListener("click", () => {
    editQuizId.value = "";
  });
});

// --------------------------------------------------------
// مساعد الذكاء الاصطناعي: مهندس البرومبت واستيراد JSON
// --------------------------------------------------------
const aiQuizModal = document.getElementById("aiQuizModal");
const aiGradeSelect = document.getElementById("aiGradeSelect");
const aiPromptScriptInput = document.getElementById("aiPromptScriptInput");
const btnCopyAIEngineeredPrompt = document.getElementById("btnCopyAIEngineeredPrompt");
const promptCopyFeedback = document.getElementById("promptCopyFeedback");
const aiJsonPasteInput = document.getElementById("aiJsonPasteInput");
const btnImportPastedJsonQuiz = document.getElementById("btnImportPastedJsonQuiz");

btnOpenAIQuizModal?.addEventListener("click", async () => {
  await loadCloudData();
  if (aiPromptScriptInput) aiPromptScriptInput.value = "";
  if (aiJsonPasteInput) aiJsonPasteInput.value = "";
  if (promptCopyFeedback) promptCopyFeedback.style.display = "none";
  aiQuizModal?.classList.remove("hidden");
});

// إنشاء ونسخ البرومبت الهندسي للذكاء الاصطناعي
btnCopyAIEngineeredPrompt?.addEventListener("click", () => {
  const userScript = (aiPromptScriptInput ? aiPromptScriptInput.value.trim() : "");
  const selectedGrade = (aiGradeSelect ? aiGradeSelect.value : "صف أول");

  if (!userScript) {
    showToast("يرجى كتابة سيكريبت ومواصفات الاختبار المطلوب أولاً!", "fa-triangle-exclamation");
    aiPromptScriptInput?.focus();
    return;
  }

  // بناء البرومبت الهندسي الشامل المتكامل
  const engineeredPrompt = `أنت خبير تربوي ومحكم معتمد في مسابقة وتدريس "نور البيان" لتعليم القراءة وترتيل القرآن الكريم.
المطلوب منك: إنشاء اختبار قرآني نموذجي متكامل للفئة المقررة: [${selectedGrade}] وفق متطلبات السيكريبت الآتية بالضبط وبالحرف:
"""
${userScript}
"""

القواعد الصارمة والواجب الالتزام بها:
1. يجب كتابة جميع الكلمات والآيات القرآنية بالرسم العثماني المضبوط بالتشكيل القرآني التام (الفتحات، الكسرات، الضمات، السكون، الشدات، التنوين).
2. [تنبيه صارم وحاسم]: احرص تماماً على توزيع الإجابات الصحيحة بشكل عشوائي تماماً (Randomized Correct Options) بين الخيارات (لا تضع الإجابة الصحيحة دائماً في الخيار الأول أو في أي نمط متكرر، بل نوع بين الخيار 1 و 2 و 3 و 4 بنسب متقاربة وعشوائية ذكية).
3. نوع في صياغة الأسئلة ولا تجعل كل الأسئلة متشابهة أو بنمط رتيب، ونوع بين الأسئلة الشفهية (oral)، الخيارات المتعددة (mcq)، الترتيب (ordering)، والتوصيل (matching).
4. الإخراج المطلوب: ملف JSON نقي وصالح فقط (Valid JSON Only) بدون أي شروحات أو مقدمات أو خاتمات خارج كود الـ JSON، وفق الهيكل الآتي تماماً:

{
  "title": "عنوان الاختبار المقترح هنا",
  "targetGrade": "${selectedGrade}",
  "allowPractice": true,
  "sections": [
    {
      "sectionName": "القسم الأول: الحروف والمدود",
      "questions": [
        {
          "type": "oral",
          "font": "quran",
          "text": "اقرأ الكلمات الآتية مع ضبط حركة الفتح:",
          "targetOral": "كَتَبَ - بَلَغَ - وَجَدَ",
          "points": 5
        },
        {
          "type": "mcq",
          "font": "quran",
          "text": "ما هي الحركة الصحيحة لحرف الميم في كلمة: عَمِلَ؟",
          "options": ["فتحة (مَ)", "كسرة (مِ)", "ضمة (مُ)", "سكون (مْ)"],
          "correct": 1,
          "points": 5
        }
      ]
    }
  ]
}

ملاحظات هامة:
- قيمة "correct" في أسئلة mcq هي رقم الفهرس الذي يبدأ من 0 (الخيار الأول = 0، الثاني = 1، الثالث = 2، الرابع = 3).
- في أسئلة "oral": حقل "text" هو عنوان السؤال/التعليمات فقط، وحقل "targetOral" هو الكلمات أو الآيات التي يجب على المتسابق قراءتها بالرسم العثماني مع التشكيل الكامل. لا تدمجهما في حقل واحد.
أعطني الآن كود الـ JSON فقط:`;

  navigator.clipboard.writeText(engineeredPrompt).then(() => {
    if (promptCopyFeedback) promptCopyFeedback.style.display = "inline-flex";
    showToast("تم نسخ البرومبت الهندسي بنجاح! الصقه في ChatGPT أو Gemini أو Claude 📋", "fa-clipboard-check");
  }).catch(() => {
    showToast("تعذر النسخ التلقائي، يرجى نسخ النص يدوياً", "fa-triangle-exclamation");
  });
});

// استيراد وقراءة كود الـ JSON الناتج وفتحه في المحرر
btnImportPastedJsonQuiz?.addEventListener("click", () => {
  const rawPasted = (aiJsonPasteInput ? aiJsonPasteInput.value.trim() : "");
  if (!rawPasted) {
    showToast("يرجى لصق كود الـ JSON الناتج من الذكاء الاصطناعي أولاً!", "fa-triangle-exclamation");
    aiJsonPasteInput?.focus();
    return;
  }

  try {
    // تنظيف كود الـ JSON إذا كان محاطاً بعلامات ماركداون ```json ... ```
    let cleanJsonStr = rawPasted;
    const jsonMatch = rawPasted.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanJsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(cleanJsonStr);

    if (!parsed.sections || !Array.isArray(parsed.sections) || parsed.sections.length === 0) {
      showToast("كود الـ JSON غير مكتمل: لا يحتوي على أقسام وأسئلة صالحة!", "fa-triangle-exclamation");
      return;
    }

    // إعداد كائن الاختبار المعياري
    const importedQuiz = {
      id: "quiz_" + Date.now(),
      title: parsed.title || `اختبار نور البيان - ${parsed.targetGrade || 'عام'}`,
      targetGrade: parsed.targetGrade || (aiGradeSelect?.value || "صف أول"),
      allowPractice: parsed.allowPractice !== undefined ? !!parsed.allowPractice : true,
      sections: parsed.sections.map((sec, sIdx) => ({
        sectionName: sec.sectionName || `القسم ${sIdx + 1}`,
        questions: (sec.questions || []).map(q => {
          const qObj = {
            type: q.type || "mcq",
            font: q.font || "quran",
            text: q.text || "نص السؤال",
            points: parseInt(q.points) || 5
          };
          if (qObj.type === "mcq") {
            qObj.options = Array.isArray(q.options) && q.options.length > 0 ? q.options : ["خيار 1", "خيار 2", "خيار 3", "خيار 4"];
            qObj.correct = q.correct !== undefined ? parseInt(q.correct) : 0;
          } else if (qObj.type === "matching") {
            qObj.pairs = Array.isArray(q.pairs) && q.pairs.length > 0 ? q.pairs : [["طرف 1", "مقابل 1"], ["طرف 2", "مقابل 2"]];
          } else if (qObj.type === "ordering") {
            qObj.items = Array.isArray(q.items) && q.items.length > 0 ? q.items : ["كلمة 1", "كلمة 2"];
            qObj.targetSentence = q.targetSentence || qObj.items.join(" ");
          } else if (qObj.type === "oral") {
            qObj.targetOral = q.targetOral || "";
          }
          return qObj;
        })
      }))
    };

    // إغلاق نافذة الذكاء الاصطناعي
    aiQuizModal?.classList.add("hidden");

    // فتح الاختبار مباشرة في محرر الاختبارات المنبثق ليتسنى للمشرف مراجعته وتعديل أي تفاصيل!
    openQuizEditor(importedQuiz);
    showToast("تم استيراد الاختبار بنجاح! راجع الأسئلة وعدلها ثم اضغط حفظ الاختبار 🚀", "fa-circle-check");

  } catch (err) {
    console.error("JSON parsing error:", err);
    showToast("صيغة كود الـ JSON غير صالحة! تأكد من نسخ الكود كاملاً من الذكاء الاصطناعي", "fa-triangle-exclamation");
  }
});

// --------------------------------------------------------
// اختصارات الإجراءات السريعة في الواجهة الرئيسية للمشرف
// --------------------------------------------------------
document.getElementById("btnQuickCreateQuiz")?.addEventListener("click", () => openQuizEditor(null));
document.getElementById("btnQuickCreateQuizAI")?.addEventListener("click", () => btnOpenAIQuizModal?.click());
document.getElementById("btnQuickAddAccount")?.addEventListener("click", () => openAccountModal(null));
document.getElementById("btnQuickManageSchools")?.addEventListener("click", () => openSchoolsGradesModal());
document.getElementById("btnQuickNewRoom")?.addEventListener("click", () => openCreateRoomModal());

// --------------------------------------------------------
// غرف المسابقات الحية وشاشات العرض (Live Arena & Rooms)
// --------------------------------------------------------
const createRoomModal = document.getElementById("createRoomModal");
const createRoomForm = document.getElementById("createRoomForm");
const newRoomNameInput = document.getElementById("newRoomNameInput");
const roomQuizSelect = document.getElementById("roomQuizSelect");
const roomTacticalCardsToggle = document.getElementById("roomTacticalCardsToggle");

function openCreateRoomModal(prefilledQuizId = null) {
  if (roomQuizSelect) {
    if (quizzesCache.length === 0) {
      roomQuizSelect.innerHTML = `<option value="">-- لا توجد اختبارات محفوظة حالياً (يرجى إنشاء اختبار أولاً) --</option>`;
    } else {
      roomQuizSelect.innerHTML = quizzesCache.map(q => `
        <option value="${q.id}" ${prefilledQuizId === q.id ? 'selected' : ''}>
          ${q.title} (${q.targetGrade})
        </option>
      `).join("");
      if (prefilledQuizId) roomQuizSelect.value = prefilledQuizId;
    }
  }

  if (newRoomNameInput) {
    newRoomNameInput.value = `مسابقة نور البيان الكبرى - ${new Date().toLocaleDateString('ar-EG')}`;
  }

  // تفعيل النقر على شرائح أسماء الغرف المقترحة
  document.querySelectorAll("#roomPresetChipsContainer .preset-chip").forEach(chip => {
    chip.onclick = () => {
      const p = chip.getAttribute("data-preset");
      if (newRoomNameInput && p) {
        newRoomNameInput.value = p;
        newRoomNameInput.focus();
      }
    };
  });

  createRoomModal?.classList.remove("hidden");

  // عند فتح النافذة أو تغيير الاختبار: أظهر عدد أسئلته الكلي وحقول الإعدادات
  function updateQuizInfoBox() {
    const qId = roomQuizSelect?.value || quizzesCache[0]?.id;
    const quiz = quizzesCache.find(q => q.id === qId);
    const infoBox = document.getElementById("quizInfoBox");
    const countEl = document.getElementById("quizTotalQCount");
    const perInput = document.getElementById("questionsPerStudentInput");
    if (!quiz || !infoBox) return;
    const secList = Array.isArray(quiz.sections) ? quiz.sections : [];
    const total = secList.reduce((a, s) => a + (Array.isArray(s?.questions) ? s.questions.length : 0), 0);
    if (countEl) countEl.textContent = total;
    if (perInput) { perInput.max = total; perInput.placeholder = `أقصى ${total} سؤال`; }
    infoBox.classList.remove("hidden");
  }

  roomQuizSelect?.addEventListener("change", updateQuizInfoBox);
  updateQuizInfoBox();
}

btnOpenCreateRoomModal?.addEventListener("click", () => openCreateRoomModal());

createRoomForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (createRoomForm.dataset.submitting === "true") return;

  const submitBtn = document.getElementById("btnSubmitCreateRoom") || createRoomForm.querySelector("button[type='submit']");
  const origBtnHtml = submitBtn ? submitBtn.innerHTML : "";

  const roomName = newRoomNameInput.value.trim() || `مسابقة نور البيان الكبرى - ${new Date().toLocaleDateString('ar-EG')}`;
  const quizId = roomQuizSelect.value || (quizzesCache[0]?.id || "quiz_default_1");
  const cardFreqSelect = document.getElementById("roomCardFrequencySelect");
  const cardFreq = cardFreqSelect ? cardFreqSelect.value : "4";
  const cardsEnabled = (cardFreq !== "off") && (roomTacticalCardsToggle ? roomTacticalCardsToggle.checked : true);
  const roomId = "ROOM-" + Math.floor(1000 + Math.random() * 9000);

  const perStudentInput = document.getElementById("questionsPerStudentInput");
  const questionsPerStudent = perStudentInput && perStudentInput.value
    ? parseInt(perStudentInput.value) : null;

  const timerInput = document.getElementById("questionTimerInput");
  const questionTimer = timerInput && timerInput.value
    ? Math.max(5, parseInt(timerInput.value)) : 30;

  const creatorName = currentUser ? currentUser.name : MASTER_SUPERVISOR_NAME;
  const creatorRole = currentUser ? currentUser.role : "supervisor";

  // استخراج بيانات الاختبار وأقسامه المعتمدة لتضمينها في مستند الغرفة
  const chosenQuiz = quizzesCache.find(q => q.id === quizId) || quizzesCache[0];
  const initialSectionCounts = {};
  if (chosenQuiz && Array.isArray(chosenQuiz.sections)) {
    const totalQInQuiz = chosenQuiz.sections.reduce((a, s) => a + (Array.isArray(s.questions) ? s.questions.length : 0), 0);
    const targetPerStudent = questionsPerStudent || (totalQInQuiz || 5);
    chosenQuiz.sections.forEach(s => {
      const sLen = Array.isArray(s.questions) ? s.questions.length : 0;
      initialSectionCounts[s.sectionName] = Math.min(sLen, Math.max(1, Math.round((sLen / (totalQInQuiz || 1)) * targetPerStudent)));
    });
  }

  const newRoom = {
    id: roomId,
    name: roomName,
    quizId: quizId,
    quizData: chosenQuiz,
    sectionCounts: initialSectionCounts,
    tacticalCardsEnabled: cardsEnabled,
    cardFrequency: cardFreq,
    questionsPerStudent: questionsPerStudent,
    questionTimer: questionTimer,
    presenterName: creatorRole === 'presenter' ? creatorName : "شاشة العرض",
    leaderName: creatorName,
    creatorName: creatorName,
    creatorRole: creatorRole,
    users: [creatorName],
    phase: "lobby",
    contestantId: null,
    contestantName: null,
    contestantSchool: null,
    contestantGrade: null,
    drawnQuestions: [],
    currentQuestionIdx: 0,
    createdAt: new Date().toISOString()
  };

  createRoomForm.dataset.submitting = "true";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري إنشاء الغرفة سحابياً...';
  }
  showGlobalLoader("جاري إنشاء الغرفة سحابياً...", "يتم حفظ وتجهيز غرفة المسابقة في السحابة فورياً لجميع المشاركين");

  try {
    const cleanRoom = sanitizeForFirestore(newRoom);
    const roomRef = doc(db, "live_rooms", newRoom.id);
    await setDoc(roomRef, {
      ...cleanRoom,
      lastUpdated: serverTimestamp()
    });

    activeRooms = activeRooms.filter(r => r.id !== newRoom.id);
    activeRooms.unshift(newRoom);
    localStorage.setItem("nour_rooms", JSON.stringify(activeRooms));

    renderLiveRoomsList();
    createRoomModal?.classList.add("hidden");
    joinLiveRoom(newRoom);
    showToast("تم فتح غرفة المسابقة بنجاح ومزامنتها سحابياً لجميع الأجهزة!", "fa-tv");
  } catch (err) {
    console.error("Firestore create room error:", err);
    showToast("تعذر إنشاء الغرفة في السحابة: " + (err.message || "يرجى التحقق من الاتصال بالإنترنت"), "fa-triangle-exclamation");
  } finally {
    hideGlobalLoader();
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnHtml;
    }
    delete createRoomForm.dataset.submitting;
  }
});

function renderLiveRoomsList() {
  cleanGhostRooms();

  const count = activeRooms.length;
  const isMasterSup = currentUser && (currentUser.role === 'supervisor' || isSupervisor(currentUser.name));

  // 1. تحديث إحصائية الغرف الحية في لوحة التحكم
  const statActiveRooms = document.getElementById("statActiveRooms");
  if (statActiveRooms) statActiveRooms.textContent = count;

  // 2. تحديث شارة التنبيه على زر تبويب العروض الحية
  const tabLiveBadge = document.getElementById("tabLiveBadge");
  if (tabLiveBadge) {
    if (count > 0) {
      tabLiveBadge.textContent = count;
      tabLiveBadge.classList.remove("hidden");
    } else {
      tabLiveBadge.classList.add("hidden");
    }
  }

  // 3. تحديث تنبيه الصفحة الرئيسية للمشرف (Overview Live Rooms Alert)
  const overviewLiveRoomsAlert = document.getElementById("overviewLiveRoomsAlert");
  const overviewLiveRoomsContent = document.getElementById("overviewLiveRoomsContent");
  if (overviewLiveRoomsAlert && overviewLiveRoomsContent) {
    if (count > 0) {
      overviewLiveRoomsAlert.classList.remove("hidden");
      overviewLiveRoomsContent.innerHTML = activeRooms.map(r => {
        const qObj = quizzesCache.find(q => q.id === r.quizId);
        const quizTitle = qObj ? qObj.title : "اختبار نور البيان";
        return `
          <div class="overview-room-pill">
            <div class="overview-room-pill-meta">
              <span class="room-pulse-dot" title="نشطة"></span>
              <span class="overview-room-pill-title">${r.name}</span>
              <span class="overview-room-pill-creator"><i class="fa-solid fa-chalkboard-user"></i> المنشئ: ${r.creatorName || r.leaderName}</span>
              <span style="font-size: 13px; color: #475569;"><i class="fa-solid fa-clipboard-question" style="color: var(--duo-blue);"></i> ${quizTitle}</span>
              <span style="font-size: 13px; color: #64748b;"><i class="fa-solid fa-users"></i> ${(r.users || []).length} متواجد</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button class="btn-duo-yellow btn-sm btn-join-room" data-id="${r.id}">
                <i class="fa-solid fa-right-to-bracket"></i> دخول المسرح الحي
              </button>
              ${isMasterSup ? `
                <button class="btn-icon-action delete btn-close-room" data-id="${r.id}" title="إنهاء وإغلاق الغرفة">
                  <i class="fa-solid fa-door-closed"></i>
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join("");

      overviewLiveRoomsContent.querySelectorAll(".btn-join-room").forEach(b => {
        b.addEventListener("click", () => {
          const room = activeRooms.find(x => x.id === b.getAttribute("data-id"));
          if (room) joinLiveRoom(room);
        });
      });

      overviewLiveRoomsContent.querySelectorAll(".btn-close-room").forEach(b => {
        b.addEventListener("click", async () => {
          const rId = b.getAttribute("data-id");
          const targetRoom = activeRooms.find(x => x.id === rId);
          const ok = await showInAppConfirm({
            title: "إنهاء وإغلاق غرفة المسابقة",
            message: `هل أنت متأكد من رغبتك في إغلاق وإنهاء (${targetRoom ? targetRoom.name : 'الغرفة'}) نهائياً؟`,
            confirmText: "نعم، إنهاء وإغلاق الغرفة",
            cancelText: "إلغاء",
            type: "danger",
            icon: "fa-door-closed"
          });
          if (ok) await executeRoomTermination(rId);
        });
      });
    } else {
      overviewLiveRoomsAlert.classList.add("hidden");
    }
  }

  // 4. تحديث تنبيه الطالب في واجهة الطالب
  const studentLiveRoomsSection = document.getElementById("studentLiveRoomsSection");
  const studentLiveRoomsList = document.getElementById("studentLiveRoomsList");
  if (studentLiveRoomsSection && studentLiveRoomsList) {
    studentLiveRoomsSection.classList.remove("hidden");
    if (count > 0) {
      studentLiveRoomsList.innerHTML = activeRooms.map(r => `
        <div class="overview-room-pill" style="border-color: #fde047;">
          <div class="overview-room-pill-meta">
            <span class="room-pulse-dot" title="مباشر"></span>
            <span class="overview-room-pill-title">${r.name}</span>
            <span class="overview-room-pill-creator"><i class="fa-solid fa-crown" style="color: #ca8a04;"></i> المشرف: ${r.leaderName}</span>
            <span class="room-code-tag" style="font-size: 11px;">#${r.id}</span>
          </div>
          <button class="btn-duo-yellow btn-sm btn-join-room" data-id="${r.id}">
            <i class="fa-solid fa-arrow-right-to-bracket"></i> حضور المسابقة الآن
          </button>
        </div>
      `).join("");

      studentLiveRoomsList.querySelectorAll(".btn-join-room").forEach(b => {
        b.addEventListener("click", () => {
          const room = activeRooms.find(x => x.id === b.getAttribute("data-id"));
          if (room) joinLiveRoom(room);
        });
      });
    } else {
      studentLiveRoomsList.innerHTML = `
        <div style="font-size: 13.5px; color: #854d0e; padding: 12px 16px; background: rgba(254, 240, 138, 0.4); border-radius: 10px; border: 1px dashed #eab308; display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-tower-broadcast" style="font-size: 18px; color: #ca8a04;"></i>
          <span>لا توجد مسابقات معلنة عامة حالياً. يمكنك إدخال رمز الغرفة الذي زوّدك به المعلم في الخانة أدناه والانضمام فوراً.</span>
        </div>
      `;
    }
  }

  // 5. تحديث قائمة الغرف في تبويب العروض الحية الرئيسي (tabLive)
  if (!roomsListContainer) return;

  if (activeRooms.length === 0) {
    roomsListContainer.innerHTML = `
      <div style="text-align: center; padding: 35px 20px; color: #64748b; background: #ffffff; border: 2px dashed #cbd5e1; border-radius: var(--radius-lg);">
        <i class="fa-solid fa-tv" style="font-size: 42px; margin-bottom: 12px; color: #94a3b8; display: block;"></i>
        <h4 style="font-weight: 800; font-size: 16px; color: #334155;">لا توجد غرف مسابقات مفتوحة حالياً</h4>
        <p style="font-size: 13.5px; margin-top: 5px;">يمكن للمشرف أو المعلم أو العارض فتح غرفة جديدة بالضغط على زر «إنشاء غرفة مسابقة جديدة» بالأعلى، وتظهر لجميع المستخدمين فورياً.</p>
      </div>
    `;
    return;
  }

  roomsListContainer.innerHTML = activeRooms.map(r => {
    const qObj = quizzesCache.find(q => q.id === r.quizId);
    const quizTitle = qObj ? qObj.title : "اختبار نور البيان";
    return `
      <div class="room-card-duo">
        <div class="room-card-details">
          <div class="room-card-title-row">
            <span class="room-pulse-dot" title="غرفة نشطة الآن"></span>
            <strong>${r.name}</strong>
            <span class="room-code-tag">#${r.id}</span>
          </div>
          <div class="room-card-meta">
            <span><i class="fa-solid fa-crown" style="color: #ca8a04;"></i> المشرف: <strong>${r.leaderName}</strong></span>
            <span><i class="fa-solid fa-chalkboard-user" style="color: var(--duo-green);"></i> المنشئ: <strong>${r.creatorName || r.leaderName}</strong></span>
            <span><i class="fa-solid fa-clipboard-question" style="color: var(--duo-blue);"></i> الاختبار: <strong>${quizTitle}</strong></span>
            <span><i class="fa-solid fa-layer-group" style="color: var(--duo-purple);"></i> البطاقات: <strong>${r.tacticalCardsEnabled ? 'مفعلة' : 'معطلة'}</strong></span>
            <span><i class="fa-solid fa-users" style="color: #64748b;"></i> المتواجدون: <strong>${(r.users || []).length}</strong></span>
          </div>
        </div>
        <div class="room-card-actions">
          <button class="btn-duo-yellow btn-sm btn-join-room" data-id="${r.id}">
            <i class="fa-solid fa-right-to-bracket"></i> دخول الغرفة
          </button>
          ${isMasterSup ? `
            <button class="btn-icon-action delete btn-close-room" data-id="${r.id}" title="إنهاء وإغلاق الغرفة (خاص بالمشرف العام فقط)">
              <i class="fa-solid fa-door-closed"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join("");

  roomsListContainer.querySelectorAll(".btn-join-room").forEach(b => {
    b.addEventListener("click", () => {
      const room = activeRooms.find(x => x.id === b.getAttribute("data-id"));
      if (room) joinLiveRoom(room);
    });
  });

  // إنهاء وإغلاق المسابقة متاح للمشرف العام
  roomsListContainer.querySelectorAll(".btn-close-room").forEach(b => {
    b.addEventListener("click", async () => {
      if (!isMasterSup) {
        showToast("حذف وإغلاق المسابقات خاص بالمشرف العام فقط", "fa-shield-halved");
        return;
      }

      const rId = b.getAttribute("data-id");
      const targetRoom = activeRooms.find(x => x.id === rId);
      const roomTitle = targetRoom ? targetRoom.name : "الغرفة";

      const ok = await showInAppConfirm({
        title: "إنهاء وإغلاق غرفة المسابقة",
        message: `هل أنت متأكد من رغبتك في إغلاق وإنهاء (${roomTitle}) نهائياً؟ سيتم إنهاء المسابقة وإخراج جميع المتواجدين فوراً.`,
        confirmText: "نعم، إنهاء وإغلاق الغرفة",
        cancelText: "إلغاء وتراجع",
        type: "danger",
        icon: "fa-door-closed"
      });

      if (ok) {
        await executeRoomTermination(rId);
      }
    });
  });
}

// معالج انضمام الطالب المباشر برمز الغرفة
const btnStudentJoinByCode = document.getElementById("btnStudentJoinByCode");
const inputStudentRoomCode = document.getElementById("inputStudentRoomCode");

btnStudentJoinByCode?.addEventListener("click", async () => {
  const rawCode = (inputStudentRoomCode ? inputStudentRoomCode.value.trim() : "");
  if (!rawCode) {
    showToast("يرجى كتابة رمز الغرفة أولاً (مثال: 1234 أو ROOM-1234)", "fa-triangle-exclamation");
    inputStudentRoomCode?.focus();
    return;
  }
  const cleanCode = rawCode.replace(/^#/, "").trim();

  // 1. البحث في الغرف النشطة محلياً أولاً
  let targetRoom = activeRooms.find(r => 
    r.id.toLowerCase() === cleanCode.toLowerCase() || 
    r.id.toLowerCase() === ("room-" + cleanCode.toLowerCase()) ||
    r.id.toLowerCase().replace("room-", "") === cleanCode.toLowerCase()
  );

  // 2. إذا لم تكن في الكاش المحلي، البحث المباشر في Firestore
  if (!targetRoom) {
    showGlobalLoader("جاري البحث عن الغرفة...", "يتم التحقق من رمز الغرفة في قاعدة البيانات السحابية");
    try {
      const candidates = [cleanCode, "ROOM-" + cleanCode, cleanCode.toUpperCase(), "ROOM-" + cleanCode.toUpperCase()];
      for (const cid of candidates) {
        const snap = await getDoc(doc(db, "live_rooms", cid));
        if (snap.exists() && snap.data().status !== "closed") {
          targetRoom = { id: snap.id, ...snap.data() };
          break;
        }
      }
    } catch (e) {
      console.warn("Direct code join notice:", e);
    } finally {
      hideGlobalLoader();
    }
  }

  if (targetRoom) {
    showToast(`جاري الانضمام إلى مسابقة (${targetRoom.name})...`, "fa-right-to-bracket");
    joinLiveRoom(targetRoom);
  } else {
    showToast("تعذر العثور على غرفة مسابقة نشطة بهذا الرمز! تأكد من الرمز من المعلم.", "fa-circle-xmark");
  }
});

inputStudentRoomCode?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    btnStudentJoinByCode?.click();
  }
});

async function joinLiveRoom(room) {
  if (!room || !room.id) return;
  const roomId = room.id;

  // إيقاف أي مستمع سابق للغرفة السابقة لتفادي تكرار الاستماع
  if (currentRoomUnsubscribe) {
    currentRoomUnsubscribe();
    currentRoomUnsubscribe = null;
  }

  // 1. جلب أحدث نسخة فورية للغرفة من سحابة Firestore لتجنب استبدال أي بيانات قديمة
  let freshRoom = { ...room };
  try {
    const roomRef = doc(db, "live_rooms", roomId);
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      freshRoom = { id: snap.id, ...snap.data() };
    }
  } catch (err) {
    console.warn("Direct room fetch notice:", err);
  }

  currentLiveRoom = freshRoom;
  if (!Array.isArray(freshRoom.users)) freshRoom.users = [];

  // 2. تحديث قائمة المستخدمين وقائد الغرفة سحابياً بشكل ذري وآمن
  if (currentUser) {
    const userName = currentUser.name;
    const isMasterSup = isSupervisor(userName);
    const needLeaderTransfer = isMasterSup && freshRoom.leaderName !== userName;

    try {
      const roomRef = doc(db, "live_rooms", roomId);
      const updatePayload = {
        users: arrayUnion(userName),
        lastUpdated: serverTimestamp()
      };
      if (needLeaderTransfer) {
        updatePayload.leaderName = userName;
        freshRoom.leaderName = userName;
      } else if (!freshRoom.leaderName) {
        updatePayload.leaderName = userName;
        freshRoom.leaderName = userName;
      }

      await updateDoc(roomRef, updatePayload);

      if (!freshRoom.users.includes(userName)) {
        freshRoom.users.push(userName);
      }
    } catch (e) {
      console.warn("Realtime room join update notice:", e);
      if (!freshRoom.users.includes(userName)) {
        freshRoom.users.push(userName);
      }
      if (needLeaderTransfer || !freshRoom.leaderName) {
        freshRoom.leaderName = userName;
      }
      await syncRoomToCloud(freshRoom);
    }
  }

  // 3. تحديث الكاش المحلي
  const roomIdx = activeRooms.findIndex(r => r.id === roomId);
  if (roomIdx >= 0) {
    activeRooms[roomIdx] = { ...activeRooms[roomIdx], ...freshRoom };
  } else {
    activeRooms.unshift(freshRoom);
  }

  // 4. حفظ الجلسة محلياً لضمان البقاء في الغرفة عند تحديث الصفحة
  localStorage.setItem("nour_saved_room_id", roomId);
  localStorage.setItem("nour_saved_view", "liveArena");
  hideLiveBroadcastBanner();

  // 5. إظهار واجهة المسرح الحي وتحديثها فورياً
  showView("liveArena");
  updateArenaUIRealtime(freshRoom);

  // 6. تشغيل مستمع الغرفة المباشر الحصري
  listenToActiveRoom(roomId);
}

// --------------------------------------------------------
// إدارة إعدادات الغرفة وصلاحيات الحل في المسرح الحي
// --------------------------------------------------------
const roomSettingsModal = document.getElementById("roomSettingsModal");
const btnOpenRoomSettingsModal = document.getElementById("btnOpenRoomSettingsModal");
const btnSaveRoomSettings = document.getElementById("btnSaveRoomSettings");
const stageSolverRoleQuickSelect = document.getElementById("stageSolverRoleQuickSelect");
const settingsTacticalCardsToggle = document.getElementById("settingsTacticalCardsToggle");
const settingsQuestionTimerInput = document.getElementById("settingsQuestionTimerInput");

function openRoomSettingsModal() {
  if (!currentLiveRoom || !roomSettingsModal) return;
  const currentPerm = currentLiveRoom.solverRole || "contestant_and_lead";
  const radios = document.querySelectorAll("input[name='roomAnsweringPermission']");
  radios.forEach(r => {
    r.checked = (r.value === currentPerm);
  });
  if (settingsTacticalCardsToggle) {
    settingsTacticalCardsToggle.checked = currentLiveRoom.tacticalCardsEnabled !== false;
  }
  if (settingsQuestionTimerInput) {
    settingsQuestionTimerInput.value = currentLiveRoom.questionTimer || 30;
  }
  const freqSelect = document.getElementById("settingsCardFrequencySelect");
  if (freqSelect) {
    freqSelect.value = currentLiveRoom.cardFrequency || "4";
  }
  roomSettingsModal.classList.remove("hidden");
}

btnOpenRoomSettingsModal?.addEventListener("click", openRoomSettingsModal);

btnSaveRoomSettings?.addEventListener("click", async () => {
  if (!currentLiveRoom) return;
  const selectedRadio = document.querySelector("input[name='roomAnsweringPermission']:checked");
  const newPerm = selectedRadio ? selectedRadio.value : "contestant_and_lead";
  const freqSelect = document.getElementById("settingsCardFrequencySelect");
  const newFreq = freqSelect ? freqSelect.value : (currentLiveRoom.cardFrequency || "4");
  const newCardsToggle = (newFreq !== "off") && (settingsTacticalCardsToggle ? settingsTacticalCardsToggle.checked : true);
  const newTimer = settingsQuestionTimerInput ? Math.max(5, parseInt(settingsQuestionTimerInput.value) || 30) : 30;

  currentLiveRoom.solverRole = newPerm;
  currentLiveRoom.cardFrequency = newFreq;
  currentLiveRoom.tacticalCardsEnabled = newCardsToggle;
  currentLiveRoom.questionTimer = newTimer;

  if (stageSolverRoleQuickSelect) {
    stageSolverRoleQuickSelect.value = newPerm;
  }

  if (currentLiveRoom.id) {
    try {
      const roomRef = doc(db, "live_rooms", currentLiveRoom.id);
      await updateDoc(roomRef, {
        solverRole: newPerm,
        cardFrequency: newFreq,
        tacticalCardsEnabled: newCardsToggle,
        questionTimer: newTimer,
        lastUpdated: serverTimestamp()
      });
      showToast("✅ تم حفظ إعدادات الغرفة وصلاحيات الإجابة وتطبيقها عند الجميع فوراً!", "fa-circle-check", 3500);
    } catch (e) {
      console.warn("Save room settings error:", e);
      await saveRooms(currentLiveRoom);
    }
  }

  roomSettingsModal.classList.add("hidden");
  updateArenaUIRealtime(currentLiveRoom);
});

// تغيير سريع لصلاحية الحل من شريط المسرح المباشر
stageSolverRoleQuickSelect?.addEventListener("change", async () => {
  if (!currentLiveRoom) return;
  const val = stageSolverRoleQuickSelect.value;
  currentLiveRoom.solverRole = val;
  if (currentLiveRoom.id) {
    try {
      const roomRef = doc(db, "live_rooms", currentLiveRoom.id);
      await updateDoc(roomRef, {
        solverRole: val,
        lastUpdated: serverTimestamp()
      });
      showToast(`تم تعيين صلاحية الإجابة: «${stageSolverRoleQuickSelect.options[stageSolverRoleQuickSelect.selectedIndex]?.text}» وتحديثها للجميع فوراً`, "fa-sliders");
    } catch (e) {
      console.warn("Update quick solver role notice:", e);
    }
  }
  updateArenaUIRealtime(currentLiveRoom);
});

// --------------------------------------------------------
// مودال إدارة مغادرة قائد الغرفة (تسليم الإشراف أو إنهاء المسابقة)
// --------------------------------------------------------
const leaderExitModal = document.getElementById("leaderExitModal");
const selectNewLeaderCandidate = document.getElementById("selectNewLeaderCandidate");
const btnHandoverAndExit = document.getElementById("btnHandoverAndExit");
const btnTerminateContestForAll = document.getElementById("btnTerminateContestForAll");

btnExitArena?.addEventListener("click", async () => {
  if (!currentLiveRoom) {
    localStorage.removeItem("nour_saved_room_id");
    showView(currentUser ? (currentUser.role === 'student' ? "student" : "supervisor") : "hero");
    return;
  }

  const isRoomLeader = currentUser && (
    currentUser.name === currentLiveRoom.leaderName || 
    isSupervisor(currentUser.name) || 
    currentUser.role === "supervisor"
  );

  if (isRoomLeader) {
    // قائد الغرفة (المشرف أو المعلم الذي يقود الغرفة)
    const otherMembers = (currentLiveRoom.users || []).filter(u => u !== currentUser.name);

    if (otherMembers.length > 0) {
      // يوجد أشخاص آخرون في الغرفة: إظهار نافذة تسليم الإشراف أو إنهاء المسابقة
      if (selectNewLeaderCandidate) {
        selectNewLeaderCandidate.innerHTML = otherMembers.map(m => `
          <option value="${m}">${m}</option>
        `).join("");
      }
      leaderExitModal?.classList.remove("hidden");
    } else {
      // لا يوجد غيره في الغرفة حالياً: إتاحة خيار إبقاء الغرفة مفتوحة ونشطة في السحابة أو إنهاؤها
      const keepRoomActive = await showInAppConfirm({
        title: "مغادرة مسرح المسابقة",
        message: "أنت المتواجد الوحيد حالياً. هل ترغب في إبقاء الغرفة مفتوحة ونشطة في السحابة حتى يتمكن المشرف والطلاب من الدخول إليها، أم إنهاء وإغلاق الغرفة نهائياً؟",
        confirmText: "إبقاء الغرفة مفتوحة والعودة للوحة التحكم",
        cancelText: "إنهاء وإغلاق الغرفة نهائياً للجميع",
        type: "info",
        icon: "fa-tower-broadcast"
      });

      if (keepRoomActive) {
        // إبقاء الغرفة مفتوحة في Firestore والعودة للوحة التحكم
        if (currentRoomUnsubscribe) {
          currentRoomUnsubscribe();
          currentRoomUnsubscribe = null;
        }
        clearInterval(liveTimerInterval);
        clearInterval(cardsTimerInterval);
        stopOfflineCountdown();
        const keptRoomId = currentLiveRoom.id;
        currentLiveRoom = null;
        currentContestant = null;
        localStorage.removeItem("nour_saved_room_id");
        localStorage.setItem("nour_saved_view", currentUser ? (currentUser.role === 'student' ? "student" : "supervisor") : "hero");
        showView(currentUser ? (currentUser.role === 'student' ? "student" : "supervisor") : "hero");
        renderLiveRoomsList();
        showToast(`الغرفة (#${keptRoomId}) ما زالت مفتوحة ونشطة في السحابة ويمكن للجميع الدخول إليها!`, "fa-tower-broadcast");
      } else {
        // إنهاء وإغلاق الغرفة نهائياً من Firestore
        await executeRoomTermination(currentLiveRoom.id);
      }
    }
  } else {
    // معلم أو عارض أو طالب عادي ليس قائداً للغرفة
    const confirmed = await showInAppConfirm({
      title: "مغادرة الغرفة",
      message: "هل ترغب في مغادرة غرفة المسابقة والعودة للوحة التحكم؟",
      confirmText: "نعم، مغادرة",
      cancelText: "البقاء في الغرفة",
      type: "danger",
      icon: "fa-arrow-right-from-bracket"
    });

    if (confirmed) {
      if (currentLiveRoom && currentUser) {
        try {
          const roomRef = doc(db, "live_rooms", currentLiveRoom.id);
          await updateDoc(roomRef, {
            users: arrayRemove(currentUser.name),
            lastUpdated: serverTimestamp()
          });
        } catch (e) {
          currentLiveRoom.users = (currentLiveRoom.users || []).filter(u => u !== currentUser.name);
          await saveRooms(currentLiveRoom);
        }
      }
      if (currentRoomUnsubscribe) {
        currentRoomUnsubscribe();
        currentRoomUnsubscribe = null;
      }
      clearInterval(liveTimerInterval);
      clearInterval(cardsTimerInterval);
      stopOfflineCountdown();
      currentLiveRoom = null;
      currentContestant = null;
      localStorage.removeItem("nour_saved_room_id");
      localStorage.setItem("nour_saved_view", currentUser ? (currentUser.role === 'student' ? "student" : "supervisor") : "hero");
      showView(currentUser ? (currentUser.role === 'student' ? "student" : "supervisor") : "hero");
    }
  }
});

// تنفيذ خيار 1: تسليم الإشراف لشخص آخر والخروج
btnHandoverAndExit?.addEventListener("click", async () => {
  if (!currentLiveRoom || !selectNewLeaderCandidate) return;
  const newLeader = selectNewLeaderCandidate.value;
  if (!newLeader) {
    showToast("يرجى اختيار عضو لتسليمه الإشراف!", "fa-triangle-exclamation");
    return;
  }

  // تسليم القيادة
  currentLiveRoom.leaderName = newLeader;
  if (currentUser) {
    try {
      const roomRef = doc(db, "live_rooms", currentLiveRoom.id);
      await updateDoc(roomRef, {
        leaderName: newLeader,
        users: arrayRemove(currentUser.name),
        lastUpdated: serverTimestamp()
      });
    } catch (e) {
      currentLiveRoom.users = (currentLiveRoom.users || []).filter(u => u !== currentUser.name);
      await saveRooms(currentLiveRoom);
    }
  }

  if (currentRoomUnsubscribe) {
    currentRoomUnsubscribe();
    currentRoomUnsubscribe = null;
  }

  leaderExitModal?.classList.add("hidden");
  clearInterval(liveTimerInterval);
  clearInterval(cardsTimerInterval);
  stopOfflineCountdown();
  currentLiveRoom = null;
  currentContestant = null;
  localStorage.removeItem("nour_saved_room_id");
  localStorage.setItem("nour_saved_view", currentUser ? (currentUser.role === 'student' ? "student" : "supervisor") : "hero");

  showToast(`تم تسليم قيادة المسابقة إلى (${newLeader}) بنجاح والمغادرة`, "fa-handshake");
  showView(currentUser ? (currentUser.role === 'student' ? "student" : "supervisor") : "hero");
  renderLiveRoomsList();
});

// تنفيذ خيار 2: إنهاء وإغلاق المسابقة للجميع
btnTerminateContestForAll?.addEventListener("click", async () => {
  leaderExitModal?.classList.add("hidden");
  if (!currentLiveRoom) return;

  const confirmed = await showInAppConfirm({
    title: "تأكيد إنهاء المسابقة للجميع",
    message: "هل أنت متأكد من إنهاء المسابقة وإغلاق الغرفة فوراً لجميع المشاركين؟",
    confirmText: "نعم، إنهاء وإغلاق الغرفة",
    cancelText: "تراجع",
    type: "danger",
    icon: "fa-power-off"
  });

  if (confirmed) {
    await executeRoomTermination(currentLiveRoom.id);
  }
});

async function executeRoomTermination(roomId) {
  if (currentRoomUnsubscribe) {
    currentRoomUnsubscribe();
    currentRoomUnsubscribe = null;
  }
  showGlobalLoader("جاري إغلاق الغرفة سحابياً...", "يتم إنهاء الغرفة وحذفها من قاعدة البيانات السحابية لجميع المشاركين");

  try {
    // حذف الغرفة من Firestore نهائياً وبشكل قطعي للجميع
    await deleteDoc(doc(db, "live_rooms", roomId));
  } catch (err) {
    console.error("Firestore delete room error:", err);
  } finally {
    hideGlobalLoader();
  }

  activeRooms = activeRooms.filter(r => r.id !== roomId);
  localStorage.setItem("nour_rooms", JSON.stringify(activeRooms));
  localStorage.removeItem("nour_live_rooms");
  localStorage.removeItem("nour_saved_room_id");

  localStorage.setItem("nour_last_closed_room", JSON.stringify({
    roomId: roomId,
    closedAt: Date.now(),
    closedBy: currentUser ? currentUser.name : "قائد الغرفة"
  }));

  clearInterval(liveTimerInterval);
  clearInterval(cardsTimerInterval);
  stopOfflineCountdown();
  currentLiveRoom = null;
  currentContestant = null;
  localStorage.setItem("nour_saved_view", currentUser ? (currentUser.role === 'student' ? "student" : "supervisor") : "hero");

  showToast("تم إنهاء وإغلاق غرفة المسابقة لجميع المشاركين بنجاح", "fa-door-closed");
  renderLiveRoomsList();
  if (views.liveArena && !views.liveArena.classList.contains("hidden")) {
    showView(currentUser ? (currentUser.role === 'student' ? "student" : "supervisor") : "hero");
  }
}

// --------------------------------------------------------
// مراقبة انقطاع الإنترنت في المسرح الحي (مؤقت 10 ثوانٍ)
// --------------------------------------------------------
const arenaOfflineWarningBanner = document.getElementById("arenaOfflineWarningBanner");
const offlineSecondsCountdown = document.getElementById("offlineSecondsCountdown");
const offlineCounterNum = document.getElementById("offlineCounterNum");

let offlineTimerInterval = null;
let offlineSecondsRemaining = 10;

function handleNetworkOffline() {
  if (currentLiveRoom && views.liveArena.classList.contains("active")) {
    arenaOfflineWarningBanner?.classList.remove("hidden");
    offlineSecondsRemaining = 10;
    if (offlineSecondsCountdown) offlineSecondsCountdown.textContent = offlineSecondsRemaining;
    if (offlineCounterNum) offlineCounterNum.textContent = offlineSecondsRemaining;

    clearInterval(offlineTimerInterval);
    offlineTimerInterval = setInterval(() => {
      offlineSecondsRemaining--;
      if (offlineSecondsCountdown) offlineSecondsCountdown.textContent = offlineSecondsRemaining;
      if (offlineCounterNum) offlineCounterNum.textContent = offlineSecondsRemaining;

      if (offlineSecondsRemaining <= 0) {
        clearInterval(offlineTimerInterval);
        arenaOfflineWarningBanner?.classList.add("hidden");
        // انتهت مهلة الـ 10 ثوانٍ دون عودة الاتصال: إغلاق الغرفة
        if (currentLiveRoom) {
          executeRoomTermination(currentLiveRoom.id);
          showToast("انتهت مهلة إعادة الاتصال (10 ثوانٍ)، تم إغلاق الغرفة تلقائياً", "fa-triangle-exclamation");
        }
      }
    }, 1000);
  }
}

function handleNetworkOnline() {
  if (offlineTimerInterval) {
    clearInterval(offlineTimerInterval);
    offlineTimerInterval = null;
  }
  arenaOfflineWarningBanner?.classList.add("hidden");
  if (currentLiveRoom) {
    showToast("عادت شبكة الإنترنت! يمكنك متابعة المسابقة الآن", "fa-wifi");
  }
}

function stopOfflineCountdown() {
  if (offlineTimerInterval) {
    clearInterval(offlineTimerInterval);
    offlineTimerInterval = null;
  }
  arenaOfflineWarningBanner?.classList.add("hidden");
}

window.addEventListener("offline", handleNetworkOffline);
window.addEventListener("online", handleNetworkOnline);

// مراقبة إغلاق الغرفة مدارة لحظياً عبر Firestore onSnapshot (لا حاجة لـ storage event)

// ------ مراجع عناصر المراحل الجديدة ------
const arenaPhaseStudentSelect = document.getElementById("arenaPhaseStudentSelect");
const arenaPhaseQuestionDraw = document.getElementById("arenaPhaseQuestionDraw");
const supervisorStudentSelectView = document.getElementById("supervisorStudentSelectView");
const teacherStudentWaitView = document.getElementById("teacherStudentWaitView");
const phaseStudentSearch = document.getElementById("phaseStudentSearch");
const phaseStudentList = document.getElementById("phaseStudentList");
const quickAddStudentForm = document.getElementById("quickAddStudentForm");
const qasNameInput = document.getElementById("qasNameInput");
const qasSchoolSelect = document.getElementById("qasSchoolSelect");
const qasGradeSelect = document.getElementById("qasGradeSelect");
const drawSectionsList = document.getElementById("drawSectionsList");
const drawPhaseStudentLabel = document.getElementById("drawPhaseStudentLabel");
const drawActionsRow = document.getElementById("drawActionsRow");
const drawResultActions = document.getElementById("drawResultActions");
const selectedStudentReveal = document.getElementById("selectedStudentReveal");
const revealStudentName = document.getElementById("revealStudentName");
const revealStudentMeta = document.getElementById("revealStudentMeta");

// ------ helper: إظهار مرحلة معينة وإخفاء الأخريات ------
function showArenaPhase(phase) {
  const lobby = document.getElementById("arenaLobby");
  [lobby, arenaPhaseStudentSelect, arenaPhaseQuestionDraw, arenaStage].forEach(el => {
    if (el) el.classList.add("hidden");
  });
  if (phase === "lobby")   lobby?.classList.remove("hidden");
  if (phase === "select")  arenaPhaseStudentSelect?.classList.remove("hidden");
  if (phase === "draw")    arenaPhaseQuestionDraw?.classList.remove("hidden");
  if (phase === "stage")   arenaStage?.classList.remove("hidden");
}

// ------ بدء المسابقة: الانتقال لمرحلة اختيار الطالب ------
btnStartLiveContest?.addEventListener("click", async () => {
  if (!currentLiveRoom) return;
  currentLiveRoom.phase = "select";
  currentLiveRoom.contestantId = null;
  currentLiveRoom.contestantName = null;
  currentLiveRoom.drawnQuestions = null;
  await saveRooms(currentLiveRoom);
  enterPhaseStudentSelect();
});

// =========================================================
// المرحلة أ: اختيار المتسابق
// =========================================================
function enterPhaseStudentSelect() {
  showArenaPhase("select");
  const canControl = currentUser && (
    currentUser.role === "supervisor" || 
    isSupervisor(currentUser.name) ||
    (currentLiveRoom && (
      currentLiveRoom.leaderName === currentUser.name || 
      currentLiveRoom.creatorName === currentUser.name || 
      (Array.isArray(currentLiveRoom.users) && currentLiveRoom.users[0] === currentUser.name)
    ))
  );

  if (canControl) {
    supervisorStudentSelectView?.classList.remove("hidden");
    teacherStudentWaitView?.classList.add("hidden");
    renderPhaseStudentList();
    // تعبئة قوائم المدارس والصفوف في نموذج الإضافة
    if (qasSchoolSelect) {
      qasSchoolSelect.innerHTML = `<option value="">اختر المدرسة...</option>` +
        schoolsCache.map(s => `<option value="${s}">${s}</option>`).join("");
    }
    if (qasGradeSelect) {
      qasGradeSelect.innerHTML = `<option value="">اختر الصف...</option>` +
        gradesCache.map(g => `<option value="${g}">${g}</option>`).join("");
    }
  } else {
    supervisorStudentSelectView?.classList.add("hidden");
    teacherStudentWaitView?.classList.remove("hidden");
    selectedStudentReveal?.classList.add("hidden");
  }
}

function renderPhaseStudentList() {
  if (!phaseStudentList) return;
  const term = normalizeArabic(phaseStudentSearch?.value || "");
  const students = participantsCache.filter(p => (!p.role || p.role === "student") &&
    (!term || normalizeArabic(p.name).includes(term)));

  if (students.length === 0) {
    phaseStudentList.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:14px;">
      <i class="fa-solid fa-user-slash" style="font-size:28px;margin-bottom:8px;display:block;"></i>
      لا يوجد طلاب مسجلون. أضف طالباً جديداً بالزر أعلاه.</div>`;
    return;
  }

  phaseStudentList.innerHTML = students.map(s => `
    <div class="student-select-item" data-id="${s.id}">
      <div>
        <div class="sti-name">${s.name}</div>
        <div class="sti-meta"><i class="fa-solid fa-school"></i> ${s.school || '--'} | <i class="fa-solid fa-layer-group"></i> ${s.grade || '--'}</div>
      </div>
      <button class="btn-duo-green btn-sm"><i class="fa-solid fa-check"></i> اختيار</button>
    </div>
  `).join("");

  phaseStudentList.querySelectorAll(".student-select-item").forEach(item => {
    item.addEventListener("click", () => {
      const sid = item.getAttribute("data-id");
      const found = participantsCache.find(p => p.id === sid);
      if (found) selectContestant(found);
    });
  });
}

phaseStudentSearch?.addEventListener("input", renderPhaseStudentList);

// إظهار/إخفاء نموذج الإضافة
document.getElementById("btnShowAddStudentForm")?.addEventListener("click", () => {
  quickAddStudentForm?.classList.toggle("hidden");
  if (!quickAddStudentForm?.classList.contains("hidden")) {
    qasNameInput?.focus();
  }
});
document.getElementById("btnCancelAddStudent")?.addEventListener("click", () => {
  quickAddStudentForm?.classList.add("hidden");
});

// إضافة طالب جديد فورياً
document.getElementById("btnQuickAddStudent")?.addEventListener("click", async () => {
  const name = qasNameInput?.value.trim();
  const school = qasSchoolSelect?.value;
  const grade = qasGradeSelect?.value;
  if (!name || !school || !grade) {
    showToast("يرجى ملء جميع حقول الطالب (الاسم والمدرسة والصف)", "fa-triangle-exclamation");
    return;
  }

  const btn = document.getElementById("btnQuickAddStudent");
  if (btn) { btn.classList.add("btn-loading"); btn.innerHTML = `<i class="fa-solid fa-spinner"></i> جاري الإضافة...`; }

  const newStudent = {
    id: "std_" + Date.now(),
    name,
    school,
    grade,
    role: "student",
    addedAt: new Date().toISOString()
  };

  participantsCache.unshift(newStudent);
  saveParticipants();
  await syncParticipantToCloud(newStudent);

  if (btn) { btn.classList.remove("btn-loading"); btn.innerHTML = `<i class="fa-solid fa-user-plus"></i> إضافة واختيار`; }
  quickAddStudentForm?.classList.add("hidden");
  renderAccountsTable();
  selectContestant(newStudent);
  showToast(`تم إضافة الطالب (${name}) واختياره للمسابقة`, "fa-user-check");
});

// اختيار المتسابق وإبلاغ الجميع عبر Firestore
async function selectContestant(student) {
  currentContestant = student;
  const p = participantsCache.find(x => x.name === student.name || x.id === student.id);
  contestantBaseScore = (p && typeof p.totalScore === "number") ? p.totalScore : (student.totalScore || 0);
  currentLiveRoom.contestantId = student.id;
  currentLiveRoom.contestantName = student.name;
  currentLiveRoom.contestantSchool = student.school || "--";
  currentLiveRoom.contestantGrade = student.grade || "--";
  currentLiveRoom.phase = "draw";
  await saveRooms(currentLiveRoom);
  enterPhaseQuestionDraw();
}

// =========================================================
// المرحلة ب: سحب الأسئلة
// =========================================================
function enterPhaseQuestionDraw() {
  showArenaPhase("draw");
  const quiz = (currentLiveRoom?.quizData && currentLiveRoom.quizData.sections) ? currentLiveRoom.quizData : (quizzesCache.find(q => q.id === currentLiveRoom?.quizId) || quizzesCache[0]);
  currentQuizData = quiz || quizzesCache[0];

  if (drawPhaseStudentLabel)
    drawPhaseStudentLabel.textContent = `المتسابق: ${currentLiveRoom?.contestantName || '--'}`;

  if (!currentQuizData) return;

  renderDrawSectionsList();
}

function renderDrawSectionsList() {
  if (!currentQuizData || !drawSectionsList) return;
  const secList = Array.isArray(currentQuizData.sections) ? currentQuizData.sections : [];
  if (secList.length === 0) return;

  const totalInQuiz = secList.reduce((a, s) => a + (Array.isArray(s?.questions) ? s.questions.length : 0), 0);
  const perStudent = currentLiveRoom?.questionsPerStudent || (totalInQuiz || 5);

  const canControl = currentUser && (
    currentUser.role === "supervisor" || 
    isSupervisor(currentUser.name) ||
    (currentLiveRoom && (
      currentLiveRoom.leaderName === currentUser.name || 
      currentLiveRoom.creatorName === currentUser.name || 
      (Array.isArray(currentLiveRoom.users) && currentLiveRoom.users[0] === currentUser.name)
    ))
  );

  if (!currentLiveRoom.sectionCounts || typeof currentLiveRoom.sectionCounts !== "object") {
    currentLiveRoom.sectionCounts = {};
  }

  const drawn = Array.isArray(currentLiveRoom?.drawnQuestions) ? currentLiveRoom.drawnQuestions : [];

  // بناء عرض الأقسام مع أدوات اختيار كم سؤال في كل قسم للمشرف والتزامن للجميع
  drawSectionsList.innerHTML = secList.map((sec, idx) => {
    const secTotal = Array.isArray(sec.questions) ? sec.questions.length : 0;
    const defaultPortion = Math.max(1, Math.round((secTotal / (totalInQuiz || 1)) * perStudent));
    if (currentLiveRoom.sectionCounts[sec.sectionName] === undefined) {
      currentLiveRoom.sectionCounts[sec.sectionName] = defaultPortion;
    }
    const currentVal = Math.min(secTotal, Math.max(0, currentLiveRoom.sectionCounts[sec.sectionName]));
    const drawnCount = drawn.filter(dq => dq.sectionName === sec.sectionName).length;
    const isDrawn = drawn.length > 0 && drawnCount > 0;

    return `
      <div class="draw-section-row ${isDrawn ? 'drawn' : ''}" id="drawSecRow_${idx}">
        <div>
          <div class="draw-section-name">${sec.sectionName}</div>
          <div style="font-size:12px;color:#94a3b8;">${secTotal} سؤال متاح بالقسم</div>
        </div>
        <div class="draw-section-controls-group">
          ${canControl ? `
            <div class="draw-section-stepper">
              <button type="button" class="draw-step-btn" data-sec-step="dec" data-sec-idx="${idx}" ${currentVal <= 0 ? 'disabled' : ''}>-</button>
              <span class="draw-step-val" id="drawSecVal_${idx}">${currentVal}</span>
              <button type="button" class="draw-step-btn" data-sec-step="inc" data-sec-idx="${idx}" ${currentVal >= secTotal ? 'disabled' : ''}>+</button>
            </div>
          ` : `
            <div class="draw-section-stepper" style="background:#f1f5f9;border-color:#cbd5e1;">
              <span style="font-size:11.5px;color:#64748b;font-weight:700;">المحدد:</span>
              <span class="draw-step-val" id="drawSecVal_${idx}">${currentVal}</span>
            </div>
          `}
          <div class="draw-counter-group">
            <span class="draw-counter-badge ${isDrawn ? 'done' : ''}" id="drawBadge_${idx}">
              ${isDrawn ? `${drawnCount} / ${currentVal} ✓` : `0 / ${currentVal}`}
            </span>
            <i class="fa-solid fa-circle-check draw-done-badge" id="drawDone_${idx}" style="${isDrawn ? 'opacity:1;' : 'opacity:0;'}"></i>
          </div>
        </div>
      </div>`;
  }).join("");

  if (canControl) {
    drawSectionsList.querySelectorAll("[data-sec-step]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-sec-idx"));
        const step = btn.getAttribute("data-sec-step");
        const sec = secList[idx];
        if (!sec) return;
        const secTotal = Array.isArray(sec.questions) ? sec.questions.length : 0;
        let val = currentLiveRoom.sectionCounts[sec.sectionName] ?? 1;
        if (step === "inc") val = Math.min(secTotal, val + 1);
        if (step === "dec") val = Math.max(0, val - 1);
        currentLiveRoom.sectionCounts[sec.sectionName] = val;

        renderDrawSectionsList();

        // بث فوري سحابي لعدد الأسئلة المختارة لكل قسم ليتزامن عند الجميع
        if (currentLiveRoom.id) {
          updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
            sectionCounts: currentLiveRoom.sectionCounts,
            lastUpdated: serverTimestamp()
          }).catch(e => console.warn("Sync sectionCounts err:", e));
        }
      });
    });
  }

  const drawActionsRow = document.getElementById("drawActionsRow");
  const drawResultActions = document.getElementById("drawResultActions");
  const drawObserverStatusRow = document.getElementById("drawObserverStatusRow");

  if (canControl) {
    if (drawn.length > 0) {
      drawActionsRow?.classList.add("hidden");
      drawResultActions?.classList.remove("hidden");
    } else {
      drawActionsRow?.classList.remove("hidden");
      drawResultActions?.classList.add("hidden");
    }
    drawObserverStatusRow?.classList.add("hidden");
  } else {
    drawActionsRow?.classList.add("hidden");
    drawResultActions?.classList.add("hidden");
    drawObserverStatusRow?.classList.remove("hidden");
  }
}

// =========================================================
// السحب العشوائي المتزامن للأسئلة قسم بقسم لجميع الأدوار (مشرف، معلمين، عارض، طلاب)
// مع أنيميشن الأعداد التفاعلي السلس للجميع بالتزامن
// =========================================================
function playSynchronizedSectionDraw(quizData, drawnQuestions, isLeadUser = false, onFinish = null) {
  if (!quizData || !drawSectionsList) return;
  const secList = Array.isArray(quizData.sections) ? quizData.sections : [];
  if (secList.length === 0) return;

  const totalInQuiz = secList.reduce((a, s) => a + (Array.isArray(s?.questions) ? s.questions.length : 0), 0);
  const perStudent = currentLiveRoom?.questionsPerStudent || (totalInQuiz || 5);

  // إيقاف أي دورة سابقة لتفادي التداخل
  if (currentDrawInterval) clearInterval(currentDrawInterval);
  if (currentDrawTimeout) clearTimeout(currentDrawTimeout);
  isSectionDrawAnimating = true;

  // إعادة بناء واجهة الأقسام مع تصفير العدادات تمهيداً للأنيميشن
  drawSectionsList.innerHTML = secList.map((sec, idx) => {
    const secTotal = Array.isArray(sec.questions) ? sec.questions.length : 0;
    const defaultPortion = Math.max(1, Math.round((secTotal / (totalInQuiz || 1)) * perStudent));
    const portion = (currentLiveRoom?.sectionCounts && currentLiveRoom.sectionCounts[sec.sectionName] !== undefined)
      ? currentLiveRoom.sectionCounts[sec.sectionName]
      : defaultPortion;

    return `
      <div class="draw-section-row" id="drawSecRow_${idx}">
        <div>
          <div class="draw-section-name">${sec.sectionName}</div>
          <div style="font-size:12px;color:#94a3b8;">${secTotal} سؤال متاح بالقسم</div>
        </div>
        <div class="draw-section-controls-group">
          <div class="draw-section-stepper" style="background:#f1f5f9;border-color:#cbd5e1;">
            <span style="font-size:11.5px;color:#64748b;font-weight:700;">المطلوب:</span>
            <span class="draw-step-val">${portion}</span>
          </div>
          <div class="draw-counter-group">
            <span class="draw-counter-badge" id="drawBadge_${idx}">0 / ${portion}</span>
            <i class="fa-solid fa-circle-check draw-done-badge" id="drawDone_${idx}" style="opacity: 0;"></i>
          </div>
        </div>
      </div>`;
  }).join("");

  const drawActionsRow = document.getElementById("drawActionsRow");
  const drawResultActions = document.getElementById("drawResultActions");
  const drawObserverStatusRow = document.getElementById("drawObserverStatusRow");
  const drawObserverStatusText = document.getElementById("drawObserverStatusText");

  if (isLeadUser) {
    drawActionsRow?.classList.add("hidden");
    drawResultActions?.classList.add("hidden");
    drawObserverStatusRow?.classList.add("hidden");
  } else {
    drawActionsRow?.classList.add("hidden");
    drawResultActions?.classList.add("hidden");
    drawObserverStatusRow?.classList.remove("hidden");
    if (drawObserverStatusText) {
      drawObserverStatusText.innerHTML = `<i class="fa-solid fa-dice fa-bounce" style="color: #eab308;"></i> جاري سحب الأسئلة لحظياً لكل قسم بالتزامن مع المشرف...`;
    }
  }

  let secIdx = 0;
  function processSection() {
    if (secIdx >= secList.length) {
      // اكتمال سحب جميع الأقسام بنجاح!
      isSectionDrawAnimating = false;
      try { soundFX.celebrate(); } catch (e) {}

      if (isLeadUser) {
        drawResultActions?.classList.remove("hidden");
        showToast(`🎲 اكتمل سحب جميع الأقسام (${drawnQuestions.length} سؤالاً) بالتزامن للجميع!`, "fa-dice", 3500);
      } else {
        if (drawObserverStatusText) {
          drawObserverStatusText.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #16a34a;"></i> تم سحب (${drawnQuestions.length}) سؤالاً بنجاح بالتزامن مع المشرف! في انتظار انطلاق المسابقة للمسرح...`;
        }
      }
      if (typeof onFinish === "function") onFinish();
      return;
    }

    const sec = secList[secIdx];
    const secTotal = Array.isArray(sec.questions) ? sec.questions.length : 0;
    const defaultPortion = Math.max(1, Math.round((secTotal / (totalInQuiz || 1)) * perStudent));
    const portion = (currentLiveRoom?.sectionCounts && currentLiveRoom.sectionCounts[sec.sectionName] !== undefined)
      ? currentLiveRoom.sectionCounts[sec.sectionName]
      : defaultPortion;
    const secDrawn = drawnQuestions.filter(q => q.sectionName === sec.sectionName);
    const targetCount = secDrawn.length;

    const row = document.getElementById(`drawSecRow_${secIdx}`);
    const badge = document.getElementById(`drawBadge_${secIdx}`);
    const doneIcon = document.getElementById(`drawDone_${secIdx}`);

    if (row) row.classList.add("active-drawing");
    if (badge) badge.className = "draw-counter-badge active";

    let tick = 0;
    currentDrawInterval = setInterval(() => {
      tick++;
      if (badge) badge.textContent = `${Math.min(tick, targetCount)} / ${portion}`;
      try { soundFX.btnClick(); } catch (e) {}

      if (tick >= targetCount) {
        clearInterval(currentDrawInterval);
        if (badge) {
          badge.textContent = `${targetCount} / ${portion} ✓`;
          badge.className = "draw-counter-badge done";
        }
        if (row) {
          row.classList.remove("active-drawing");
          row.classList.add("drawn");
        }
        if (doneIcon) doneIcon.style.opacity = "1";
        try { soundFX.correct(); } catch (e) {}

        secIdx++;
        currentDrawTimeout = setTimeout(processSection, 420);
      }
    }, 180);
  }

  processSection();
}

function runQuestionDraw(silent = false) {
  if (!currentQuizData) return;
  const secList = Array.isArray(currentQuizData.sections) ? currentQuizData.sections : [];
  const totalInQuiz = secList.reduce((a, s) => a + (Array.isArray(s?.questions) ? s.questions.length : 0), 0);
  const perStudent = currentLiveRoom?.questionsPerStudent || (totalInQuiz || 5);
  const drawnQuestions = [];

  secList.forEach(sec => {
    const secTotal = Array.isArray(sec.questions) ? sec.questions.length : 0;
    const defaultPortion = Math.max(1, Math.round((secTotal / (totalInQuiz || 1)) * perStudent));
    const chosenCount = (currentLiveRoom?.sectionCounts && currentLiveRoom.sectionCounts[sec.sectionName] !== undefined)
      ? currentLiveRoom.sectionCounts[sec.sectionName]
      : defaultPortion;
    const finalCount = Math.min(secTotal, Math.max(0, chosenCount));
    const shuffled = [...(sec.questions || [])].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, finalCount);
    picked.forEach(q => drawnQuestions.push({ ...q, sectionName: sec.sectionName }));
  });

  const animPayload = {
    isDrawing: true,
    timestamp: Date.now(),
    drawnQuestions: drawnQuestions
  };

  currentLiveRoom.drawnQuestions = drawnQuestions;
  currentLiveRoom.drawAnimation = animPayload;

  // حفظ سحابي فوري في فايربيس لبث الأنيميشن المتزامن لجميع المعلمين والعارض والطلاب
  if (currentLiveRoom.id) {
    try {
      const roomRef = doc(db, "live_rooms", currentLiveRoom.id);
      updateDoc(roomRef, {
        drawnQuestions: drawnQuestions,
        drawAnimation: animPayload,
        sectionCounts: currentLiveRoom.sectionCounts || {},
        lastUpdated: serverTimestamp()
      }).catch(err => console.warn("Sync drawAnimation error:", err));
    } catch (e) {}
  }

  // تشغيل الأنيميشن لدى المشرف
  playSynchronizedSectionDraw(currentQuizData, drawnQuestions, true);
}

document.getElementById("btnDrawQuestions")?.addEventListener("click", () => runQuestionDraw(false));
document.getElementById("btnRedrawQuestions")?.addEventListener("click", () => runQuestionDraw(false));

// بدء المسابقة بعد السحب
document.getElementById("btnStartAfterDraw")?.addEventListener("click", async () => {
  if (!currentLiveRoom.drawnQuestions || currentLiveRoom.drawnQuestions.length === 0) {
    showToast("يرجى سحب الأسئلة أولاً", "fa-triangle-exclamation");
    return;
  }
  const qDuration = currentLiveRoom.questionTimer || 30;
  const now = Date.now();
  currentLiveRoom.phase = "competing";
  currentLiveRoom.currentQuestionIdx = 0;
  currentLiveRoom.timerState = {
    questionIdx: 0,
    duration: qDuration,
    startedAt: now,
    endsAt: now + (qDuration * 1000),
    isFrozen: false,
    noTimeLimit: false,
    updatedAt: now
  };
  await saveRooms(currentLiveRoom);
  enterPhaseStage();
});

// =========================================================
// التمرير التلقائي الذكي والتكبير/التصغير المتناسق لظهور السؤال بوسط الشاشة (المشرف، العارض، الطالب، المعلم)
// بدون الحاجة للنزول بالإصبع، ومطابقة أي نوع سؤال (خيارات، ترتيب، توصيل، شفهي) في وسط الشاشة تماماً
// =========================================================
function bringQuestionCardIntoView(cardEl) {
  if (!cardEl) cardEl = document.querySelector(".stage-question-card");
  if (!cardEl) return;

  const arenaEl = document.getElementById("arenaStage");
  if (arenaEl) arenaEl.classList.add("is-question-active");

  const fitAndCenter = () => {
    try {
      // 1. إعادة ضبط مؤقت للتأكد من القياس الحقيقي
      cardEl.style.transform = '';
      cardEl.style.marginBottom = '';
      cardEl.style.transformOrigin = 'top center';
      cardEl.classList.remove("auto-scale-fit");

      const headerEl = document.querySelector(".main-header");
      const headerH = headerEl ? headerEl.offsetHeight : 64;
      const viewportH = window.innerHeight;
      const viewportW = window.innerWidth;

      // الارتفاع الحقيقي لبطاقة السؤال مع كافة خياراتها وتفاصيلها
      const naturalH = cardEl.offsetHeight || cardEl.scrollHeight;

      // حساب المساحة الرأسية المتاحة لبطاقة السؤال بالكامل داخل الشاشة
      const safePadding = 20;
      const availableH = viewportH - headerH - safePadding;

      let scale = 1;

      // إذا كان السؤال مع خياراته (خصوصاً التوصيل، الترتيب، الشفهي) أكبر من المساحة المعروضة
      // نصغره بنسبة ذكية متوازنة ليتسع كاملاً بدون اقتطاع أي خيار أو زر بالأسفل
      if (naturalH > (availableH - 16) && naturalH > 0) {
        scale = Math.max(0.60, Math.min(1, (availableH - 24) / naturalH));
        cardEl.classList.add("auto-scale-fit");
        cardEl.style.transform = `scale(${scale.toFixed(3)})`;
        cardEl.style.transformOrigin = "top center";
        const diffH = Math.round(naturalH * (1 - scale));
        cardEl.style.marginBottom = `-${diffH}px`;
      } else if (naturalH < (availableH * 0.52) && viewportW > 768) {
        // إذا كان السؤال قصيراً على شاشة واسعة، نكبره قليلاً لمظهر جذاب
        scale = 1.04;
        cardEl.style.transform = `scale(${scale.toFixed(3)})`;
        cardEl.style.transformOrigin = "top center";
        const extraH = Math.round(naturalH * (scale - 1));
        cardEl.style.marginBottom = `${extraH}px`;
      }

      // 2. التمرير التلقائي السلس إلى وسط الشاشة تماماً لظهور السؤال وجميع الإجابات بوسط العين
      const rect = cardEl.getBoundingClientRect();
      const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
      const cardAbsoluteTop = currentScrollY + rect.top;
      const scaledH = rect.height;

      const idealCenterScrollY = cardAbsoluteTop - headerH - Math.max(8, (availableH - scaledH) / 2);

      window.scrollTo({
        top: Math.max(0, Math.round(idealCenterScrollY)),
        behavior: "smooth"
      });
    } catch (e) {
      try {
        cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (err) {}
    }
  };

  requestAnimationFrame(() => {
    fitAndCenter();
    setTimeout(fitAndCenter, 100);
    setTimeout(fitAndCenter, 280);
    setTimeout(fitAndCenter, 550);
  });
}

// =========================================================
// المؤقت اللحظي السحابي الموحد والمزامن عبر Firestore لجميع المتسابقين والعارض والمشرف
// سريع واستجابة فائقة الدقة لكل 100 ملي ثانية لمنع البطء والتقطيع
// =========================================================
let lastTimerConfigKey = "";

function syncAndRunLiveTimer(timerState, onTimeout = null) {
  const timerDisplay = stageTimerSeconds;
  const timerPill = document.getElementById("stageTimerPill");
  if (!timerDisplay) return;

  if (!timerState) {
    const defaultSecs = currentLiveRoom?.questionTimer || 30;
    liveTimeRemaining = defaultSecs;
    timerDisplay.textContent = String(defaultSecs);
    return;
  }

  // 1. فحص ميزة "بلا حد زمني" (بطاقة تكتيكية)
  if (timerState.noTimeLimit) {
    if (liveTimerInterval) { clearInterval(liveTimerInterval); liveTimerInterval = null; }
    lastTimerConfigKey = "";
    timerDisplay.textContent = "∞";
    liveTimeRemaining = 9999;
    if (timerPill) {
      timerPill.classList.remove("timer-urgent", "timer-frozen");
      timerPill.classList.add("timer-infinite");
    }
    return;
  }

  // 2. فحص حالة التجميد (بطاقة تجميد الوقت)
  if (timerState.isFrozen) {
    if (liveTimerInterval) { clearInterval(liveTimerInterval); liveTimerInterval = null; }
    lastTimerConfigKey = "";
    const frozenSecs = Math.max(0, Math.ceil(timerState.freezeRemaining || 0));
    timerDisplay.textContent = `${frozenSecs} ❄️`;
    liveTimeRemaining = frozenSecs;
    if (timerPill) {
      timerPill.classList.remove("timer-urgent", "timer-infinite");
      timerPill.classList.add("timer-frozen");
    }
    return;
  }

  const qIdx = timerState.questionIdx ?? 0;
  const endsAt = timerState.endsAt || (Date.now() + 30000);
  const configKey = `${qIdx}_${endsAt}`;

  // منع إعادة إنشاء العداد بشكل مستمر عند وصول تحديثات متكررة من السحابة إذا كان يعمل بالفعل على نفس السؤال
  if (liveTimerInterval && lastTimerConfigKey === configKey) {
    return;
  }

  if (liveTimerInterval) {
    clearInterval(liveTimerInterval);
    liveTimerInterval = null;
  }
  lastTimerConfigKey = configKey;

  // 3. العد التنازلي الحقيقي المزامن سحابياً بالملي ثانية بدقة 100ms
  if (timerPill) {
    timerPill.classList.remove("timer-infinite", "timer-frozen");
  }

  const updateTick = () => {
    const now = Date.now();
    const remainingMs = Math.max(0, endsAt - now);
    const remainingSecs = Math.ceil(remainingMs / 1000);
    liveTimeRemaining = remainingSecs;

    timerDisplay.textContent = String(remainingSecs);

    if (timerPill) {
      if (remainingSecs <= 5 && remainingSecs > 0) {
        timerPill.classList.add("timer-urgent");
      } else {
        timerPill.classList.remove("timer-urgent");
      }
    }

    if (remainingMs <= 0) {
      clearInterval(liveTimerInterval);
      liveTimerInterval = null;
      lastTimerConfigKey = "";
      timerDisplay.textContent = "0";

      // فحص المخول بالحل أو قائد/مشرف الغرفة
      const isLeader = currentUser && (
        currentUser.name === currentLiveRoom?.leaderName ||
        currentUser.name === currentLiveRoom?.creatorName ||
        currentUser.role === "supervisor" ||
        isSupervisor(currentUser.name)
      );
      const isAllowedSolver = checkIsSolverAllowed(currentLiveRoom);

      // تشغيل انتهاء الوقت فوراً عند نفاد الوقت دون توقف أو قيود
      if (!isQuestionTransitionRunning) {
        if (typeof onTimeout === "function") {
          onTimeout();
        } else {
          handleLiveQuestionTimeout();
        }
      }
    }
  };

  updateTick();
  liveTimerInterval = setInterval(updateTick, 100);
}

// --------------------------------------------------------
// معالجة انتهاء وقت السؤال تلقائياً كإجابة خاطئة مع إظهار X والخصم
// --------------------------------------------------------
let currentStageAdvanceToNext = null;

function handleLiveQuestionTimeout() {
  if (isQuestionTransitionRunning) return;

  const allQ = (currentLiveRoom?.drawnQuestions && currentLiveRoom.drawnQuestions.length > 0)
    ? currentLiveRoom.drawnQuestions
    : (currentQuizData?.sections?.flatMap(s => s.questions || []) || []);
  const curQ = allQ[currentLiveRoom?.currentQuestionIdx || 0] || {};
  
  // فحص بطاقة الحصانة (درع الأمان)
  const hasImmunity = !!(activeCardEffect?.effect?.immunity);
  let penalty = 0;
  if (hasImmunity) {
    showToast("🛡️ درع الأمان (الحصانة): انتهى الوقت ولكن تم إلغاء أي خصم درجات!", "fa-shield-halved", 3500);
    activeCardEffect = null;
  } else {
    penalty = 3;
    showToast("⏰ انتهى الوقت المحدد للسؤال! ❌ خصم 3 درجات والانتقال للسؤال التالي", "fa-clock", 3500);
  }

  // إذا كان نوع السؤال اختيار من متعدد، نعطل الخيارات ونظهر الإجابة الصحيحة
  if (curQ.type === "mcq" && curQ.correct !== undefined) {
    const btns = stageInteractiveArea.querySelectorAll(".btn-choice-duo");
    btns.forEach(b => {
      b.disabled = true;
      b.style.pointerEvents = "none";
    });
    const correctBtn = stageInteractiveArea.querySelector(`[data-choice="${curQ.correct}"]`);
    if (correctBtn) correctBtn.classList.add("correct");
  }

  // إيقاف العداد كلياً وتمرير انتهاء الوقت كإجابة خاطئة تماماً مع ظهور X أحمر
  if (typeof currentStageAdvanceToNext === "function") {
    currentStageAdvanceToNext(-penalty, penalty > 0, false, null, true);
  } else if (typeof advanceToNext === "function") {
    advanceToNext(-penalty, penalty > 0, false, null, true);
  }
}

// =========================================================
// غطاء النتيجة الكبير يغطي السؤال بالكامل ويطلع من تحت بأنيميشن صعود مبهج ويتلاشى
// صح أخضر كبير عند الإجابة الصحيحة أو X أحمر كبير وضخم عند الخطأ أو انتهاء الوقت
// =========================================================
function showBigQuestionResultOverlay({ isCorrect, isTimeout = false, scoreDelta = 0 }) {
  const overlay = document.getElementById("stageQuestionResultOverlay");
  const iconEl = document.getElementById("resultOverlayIcon");
  const titleEl = document.getElementById("resultOverlayTitle");
  const pointsEl = document.getElementById("resultOverlayPoints");
  if (!overlay || !iconEl || !titleEl || !pointsEl) return;

  overlay.classList.remove("hidden", "correct", "wrong", "timeout");
  void overlay.offsetWidth; // إعادة تشغيل الأنيميشن من البداية

  const questionCardEl = document.querySelector(".stage-question-card");
  if (questionCardEl) {
    questionCardEl.classList.remove("question-wrong-shake");
    void questionCardEl.offsetWidth;
  }

  if (isCorrect) {
    overlay.classList.add("correct");
    iconEl.innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
    titleEl.textContent = "إجابة صحيحة ومتقنة! 🌟";
    pointsEl.textContent = `+${scoreDelta} درجات`;
    try { soundFX.correct(); } catch (e) {}
  } else if (isTimeout) {
    // بالضبط زي الإجابة الخطأ مع X أحمر ضخم واهتزاز وصوت الخطأ
    overlay.classList.add("wrong", "timeout");
    iconEl.innerHTML = `<i class="fa-solid fa-circle-xmark"></i>`;
    titleEl.textContent = "انتهى الوقت! ❌";
    pointsEl.textContent = scoreDelta !== 0 ? `${scoreDelta} درجات (خصم)` : "انتهى الوقت المحدد للسؤال ⏰";
    if (questionCardEl) questionCardEl.classList.add("question-wrong-shake");
    try { soundFX.wrong(); } catch (e) {}
  } else {
    overlay.classList.add("wrong");
    iconEl.innerHTML = `<i class="fa-solid fa-circle-xmark"></i>`;
    titleEl.textContent = "إجابة غير صحيحة! ❌";
    pointsEl.textContent = scoreDelta !== 0 ? `${scoreDelta} درجات (خصم)` : "ركّز في السؤال القادم 💪";
    if (questionCardEl) questionCardEl.classList.add("question-wrong-shake");
    try { soundFX.wrong(); } catch (e) {}
  }

  overlay.classList.remove("hidden");

  // يتلاشى ويختفي بعد انتهاء الأنيميشن الجميل
  setTimeout(() => {
    overlay.classList.add("hidden");
    if (questionCardEl) questionCardEl.classList.remove("question-wrong-shake");
  }, 1600);
}

// =========================================================
// دورة الانتقال السينمائية بين الأسئلة: تقييم الإجابة -> تلاشي السؤال -> ظهور لوحة الشرف -> البطاقات التكتيكية -> ظهور السؤال التالي
// فحص هل هذا دور ظهور البطاقات التكتيكية بناءً على اختيار المشرف (كل سؤال أو كل X أسئلة)
function shouldTriggerTacticalCards(room, currentIdx, nextIdx, totalQ) {
  if (!room || room.tacticalCardsEnabled === false) return false;
  if (nextIdx >= totalQ) return false;
  const freq = String(room.cardFrequency || "4");
  if (freq === "off") return false;
  if (freq === "1" || freq === "every_1") return true; // كل سؤال
  if (freq === "2" || freq === "every_2") return ((currentIdx + 1) % 2 === 0);
  if (freq === "3" || freq === "every_3") return ((currentIdx + 1) % 3 === 0);
  if (freq === "4" || freq === "every_4") return ((currentIdx + 1) % 4 === 0); // الافتراضي الموصى به: كل 4 أسئلة
  if (freq === "5" || freq === "every_5") return ((currentIdx + 1) % 5 === 0);
  if (freq === "quarter") return ((currentIdx + 1) % Math.max(1, Math.round(totalQ / 4)) === 0);
  return ((currentIdx + 1) % 4 === 0);
}

// =========================================================
function playQuestionTransitionSequence({ isCorrect, scoreDelta, isPenalty, nextIdx, isFinished, allQuestions, currentIdx, isLeaderUser = true, isTimeout = false }) {
  isQuestionTransitionRunning = true;

  // 1. إظهار غطاء النتيجة الكبير الذي يغطي السؤال بالكامل ويطلع من تحت بأنيميشن صعود مبهج
  showBigQuestionResultOverlay({ isCorrect, isTimeout, scoreDelta });

  // 2. إظهار شريط نتيجة الإجابة الفورية أسفل الخيارات أيضاً
  const existingFeedback = stageInteractiveArea.querySelector(".answer-feedback-banner");
  if (!existingFeedback) {
    const fb = document.createElement("div");
    fb.className = `answer-feedback-banner ${isCorrect ? "correct" : "wrong"}`;
    if (isCorrect) {
      fb.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
          <i class="fa-solid fa-circle-check" style="font-size:30px;color:#16a34a;"></i>
          <div>
            <div style="font-weight:900;font-size:16.5px;color:#14532d;">أحسنت! إجابة صحيحة ومتقنة 🌟</div>
            <div style="font-size:13px;color:#15803d;font-weight:700;">+${scoreDelta} درجات تم احتسابها لرصيدك سحابياً</div>
          </div>
        </div>
        <div class="score-increase-badge" style="font-size:16px;">+${scoreDelta}</div>
      `;
    } else {
      fb.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
          <i class="fa-solid fa-circle-xmark" style="font-size:30px;color:#dc2626;"></i>
          <div>
            <div style="font-weight:900;font-size:16.5px;color:#7f1d1d;">${isTimeout ? "انتهى الوقت المحدد للسؤال! ⏰" : "إجابة غير صحيحة! ❌"}</div>
            <div style="font-size:13px;color:#991b1b;font-weight:700;">${scoreDelta < 0 ? `تم خصم ${Math.abs(scoreDelta)} درجات من الرصيد ❌` : "المثابرة والمراجعة هما سر التفوق والتميّز"}</div>
          </div>
        </div>
        ${isPenalty ? `<div class="score-penalty-badge" style="font-size:16px;">${scoreDelta}</div>` : ''}
      `;
    }
    stageInteractiveArea.appendChild(fb);
  }

  // 2. الانتظار 1.6 ثانية لمشاهدة التقييم وشارة الصح/الخطأ بوضوح
  setTimeout(() => {
    // 3. تلاشي السؤال الحركي الجذاب بسلاسة
    const questionCardEl = document.querySelector(".stage-question-card");
    if (questionCardEl) {
      questionCardEl.classList.remove("question-enter-anim");
      questionCardEl.classList.add("question-exit-anim");
    }

    // 4. بعد انتهاء تلاشي السؤال (420ms)، ظهور لوحة الشرف بأنيميشن جميل
    setTimeout(() => {
      showHonorBoardModal(false, () => {
        // 5. بعد تلاشي لوحة الشرف بنجاح، الانتقال للبطاقات التكتيكية أو السؤال التالي أو إنهاء المسابقة
        isQuestionTransitionRunning = false;

        if (isFinished) {
          finishContestant();
        } else {
          // المشرف أو المنفذ يحدث رقم السؤال السحابي لضمان تماشي جميع الشاشات بالتزامن
          if (isLeaderUser && currentLiveRoom) {
            currentLiveRoom.currentQuestionIdx = nextIdx;
            currentLiveRoom.contestantScore = contestantScore;
            saveRooms(currentLiveRoom);
          }

          // نظام البطاقات التكتيكية التفاعلي المتزامن للجميع
          const totalQ = allQuestions.length || 20;
          const isCardTurn = shouldTriggerTacticalCards(currentLiveRoom, currentIdx, nextIdx, totalQ);

          if (isCardTurn) {
            const canGenerate = isLeaderUser || checkIsSolverAllowed(currentLiveRoom);
            if (canGenerate) {
              triggerTacticalCardsModal(() => loadStageQuestion(nextIdx), nextIdx);
            }
            // في حال كان المستخدم متفرجاً أو شاشة عرض، ينتظر بث البطاقات عبر activeCardsTurn
          } else {
            loadStageQuestion(nextIdx);
          }
        }
      }, currentContestant?.name, scoreDelta, isPenalty);
    }, 420);
  }, 1600);
}

async function broadcastTimerModification(options = {}) {
  if (!currentLiveRoom) return;
  const now = Date.now();
  const qDuration = currentLiveRoom.questionTimer || 30;
  let currentTimer = currentLiveRoom.timerState || {
    questionIdx: currentLiveRoom.currentQuestionIdx || 0,
    duration: qDuration,
    startedAt: now,
    endsAt: now + (qDuration * 1000),
    isFrozen: false,
    noTimeLimit: false,
    updatedAt: now
  };

  let updatedTimer = { ...currentTimer, updatedAt: now };

  if (options.noTimeLimit !== undefined) {
    updatedTimer.noTimeLimit = options.noTimeLimit;
  }

  if (options.deltaSeconds !== undefined && options.deltaSeconds !== 0) {
    const curEndsAt = Math.max(now, updatedTimer.endsAt || (now + 30000));
    updatedTimer.endsAt = Math.max(now + 3000, curEndsAt + (options.deltaSeconds * 1000));
    liveTimeRemaining = Math.max(3, Math.ceil((updatedTimer.endsAt - now) / 1000));
  }

  if (options.reset) {
    updatedTimer.duration = qDuration;
    updatedTimer.endsAt = now + (qDuration * 1000);
    updatedTimer.isFrozen = false;
    liveTimeRemaining = qDuration;
  }

  if (options.freezeSeconds) {
    const remainingSecs = Math.max(1, Math.ceil((updatedTimer.endsAt - now) / 1000));
    updatedTimer.isFrozen = true;
    updatedTimer.freezeRemaining = remainingSecs;
    liveTimeRemaining = remainingSecs;

    setTimeout(async () => {
      if (currentLiveRoom?.id) {
        const resumeNow = Date.now();
        const unfreezeTimer = {
          ...(currentLiveRoom.timerState || updatedTimer),
          isFrozen: false,
          endsAt: resumeNow + (remainingSecs * 1000),
          updatedAt: resumeNow
        };
        currentLiveRoom.timerState = unfreezeTimer;
        syncAndRunLiveTimer(unfreezeTimer);
        try {
          await updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
            timerState: unfreezeTimer,
            lastUpdated: serverTimestamp()
          });
        } catch (e) {}
      }
    }, options.freezeSeconds * 1000);
  }

  currentLiveRoom.timerState = updatedTimer;
  syncAndRunLiveTimer(updatedTimer);

  if (currentLiveRoom.id) {
    try {
      const roomRef = doc(db, "live_rooms", currentLiveRoom.id);
      await updateDoc(roomRef, {
        timerState: updatedTimer,
        lastUpdated: serverTimestamp()
      });
    } catch (err) {
      console.warn("broadcastTimerModification error:", err);
    }
  }
}

// =========================================================
// المرحلة ج: مسرح المسابقة (مع تسجيل تلقائي للإجابات)
// =========================================================
function enterPhaseStage() {
  showArenaPhase("stage");
  const room = currentLiveRoom;
  if (!room) return;
  currentContestant = participantsCache.find(p => p.id === room.contestantId) || { 
    name: room.contestantName || "المتسابق", 
    school: room.contestantSchool || "--", 
    grade: room.contestantGrade || "--" 
  };

  let questionsToUse = (Array.isArray(room.drawnQuestions) && room.drawnQuestions.length > 0) ? [...room.drawnQuestions] : [];
  if (questionsToUse.length === 0) {
    const quiz = quizzesCache.find(q => q.id === room.quizId) || quizzesCache[0];
    if (quiz && Array.isArray(quiz.sections)) {
      quiz.sections.forEach(s => {
        (s.questions || []).forEach(q => questionsToUse.push({ ...q, sectionName: s.sectionName }));
      });
    }
  }

  currentQuizData = { sections: [{ sectionName: "أسئلة المسابقة", questions: questionsToUse }] };
  currentQuestionIndex = room.currentQuestionIdx || 0;
  // استعادة النقاط من بيانات الغرفة السحابية (لمنع فقدان النقاط عند التحديث أو إعادة الدخول)
  contestantScore = room.contestantScore || 0;
  const pFound = participantsCache.find(x => x.name === currentContestant.name || x.id === currentContestant.id);
  contestantBaseScore = (pFound && typeof pFound.totalScore === "number") ? pFound.totalScore : (currentContestant.totalScore || 0);

  if (stageStudentName) stageStudentName.textContent = currentContestant.name;
  if (stageStudentSchool) stageStudentSchool.innerHTML = `<i class="fa-solid fa-school"></i> ${currentContestant.school || '--'}`;
  if (stageStudentGrade) stageStudentGrade.innerHTML = `<i class="fa-solid fa-layer-group"></i> ${currentContestant.grade || '--'}`;
  if (stageStudentScore) stageStudentScore.textContent = String(contestantScore);

  // تحديث محفظة البطاقات للمتسابق الحالي فور دخول المسرح
  updateContestantWalletUI(room.contestantWallet || []);

  loadStageQuestion(currentQuestionIndex);
}

// =========================================================
// تشغيل مسرح المسابقة الحي (Active Contest Controls)
// =========================================================
let currentContestant = null;
let currentQuizData = null;
let currentQuestionIndex = 0;
let contestantScore = 0;
let contestantBaseScore = 0;

function initLiveStage() {
  if (!currentLiveRoom) return;
  // الآن initLiveStage تُستدعى فقط إذا كانت phase=competing مسبقاً (عند إعادة الدخول)
  enterPhaseStage();
}

// --------------------------------------------------------
// فحص صلاحية الإجابة والحل في المسرح الحي
// --------------------------------------------------------
function checkIsSolverAllowed(room = currentLiveRoom) {
  if (!currentUser) return false;
  if (!room) return false;
  const isSup = currentUser.role === "supervisor" || isSupervisor(currentUser.name);
  const isTeacher = currentUser.role === "teacher";
  const isPresenter = currentUser.role === "presenter";
  const isLeader = room.leaderName === currentUser.name || room.creatorName === currentUser.name || isSup;

  const isContestant = !!(room.contestantName && (
    currentUser.name === room.contestantName || 
    (currentUser.normalizedName && room.contestantName && currentUser.normalizedName === normalizeArabic(room.contestantName))
  ));

  // الطالب الذي يدخل ولم يتم اختياره من مشرف المسابقة: لا يمكنه فعل أي شيء بتاتاً، مشاهد فقط
  if (currentUser.role === "student" || (!isSup && !isTeacher && !isPresenter)) {
    if (!isContestant) return false;
    const perm = room.solverRole || "contestant_and_lead";
    return (perm === "contestant_only" || perm === "contestant_and_lead" || perm === "all" || perm === "all_participants");
  }

  const perm = room.solverRole || "contestant_and_lead";

  if (perm === "contestant_only") {
    return isContestant;
  }
  if (perm === "contestant_and_lead") {
    return isContestant || isLeader;
  }
  if (perm === "supervisor_only") {
    return isLeader;
  }
  if (perm === "teacher_and_supervisor") {
    return isTeacher || isLeader;
  }
  if (perm === "presenter") {
    return isPresenter || isLeader;
  }
  if (perm === "all" || perm === "all_participants") {
    return true;
  }
  return isContestant || isLeader;
}

// --------------------------------------------------------
// نافذة اختيار السؤال المسبق للتخطي الذكي (مع الحصول على 3 نقاط بدلاً منه)
// --------------------------------------------------------
const modalPreSkipQuestion = document.getElementById("modalPreSkipQuestion");
const preSkipQuestionsList = document.getElementById("preSkipQuestionsList");

function openPreSkipQuestionModal() {
  if (!modalPreSkipQuestion || !preSkipQuestionsList) return;
  const allQ = (currentLiveRoom?.drawnQuestions && currentLiveRoom.drawnQuestions.length > 0)
    ? currentLiveRoom.drawnQuestions
    : (currentQuizData?.sections?.flatMap(s => s.questions || []) || []);

  const upcoming = [];
  allQ.forEach((q, idx) => {
    if (idx > currentQuestionIndex && !(currentLiveRoom?.skippedQuestionIndices || []).includes(idx)) {
      upcoming.push({ q, idx });
    }
  });

  if (upcoming.length === 0) {
    showToast("لا توجد أسئلة قادمة باقية في هذه الجولة للتخطي!", "fa-info-circle");
    return;
  }

  preSkipQuestionsList.innerHTML = upcoming.map(({ q, idx }) => `
    <div class="pre-skip-q-card">
      <div class="pre-skip-q-info">
        <div class="pre-skip-q-meta"><i class="fa-solid fa-list-ol"></i> السؤال رقم (${idx + 1}) | ${escapeHtml(q.sectionName || 'المسابقة')}</div>
        <div class="pre-skip-q-text font-${q.font || 'quran'}">${escapeHtml(q.text || 'سؤال')}</div>
      </div>
      <button type="button" class="btn-duo-yellow btn-sm btn-select-pre-skip" data-idx="${idx}">
        <i class="fa-solid fa-forward-fast"></i> تخطي السؤال (+3 نقاط)
      </button>
    </div>
  `).join("");

  modalPreSkipQuestion.classList.remove("hidden");

  preSkipQuestionsList.querySelectorAll(".btn-select-pre-skip").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetIdx = parseInt(btn.getAttribute("data-idx"));
      if (isNaN(targetIdx)) return;

      const currentSkipped = Array.isArray(currentLiveRoom?.skippedQuestionIndices) 
        ? [...currentLiveRoom.skippedQuestionIndices] 
        : [];
      if (!currentSkipped.includes(targetIdx)) {
        currentSkipped.push(targetIdx);
      }
      if (currentLiveRoom) {
        currentLiveRoom.skippedQuestionIndices = currentSkipped;
      }

      // إضافة 3 درجات فورية للمتسابق بدلاً من نقاط السؤال
      addContestantScore(3);
      showFloatingCardPill("+3 نقاط تخطي ذكي 💎", "fa-forward-fast", "gold");

      if (currentLiveRoom?.id) {
        updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
          skippedQuestionIndices: currentSkipped,
          contestantScore: contestantScore,
          lastUpdated: serverTimestamp()
        }).catch(err => console.warn("Sync skipped question notice:", err));
      }

      modalPreSkipQuestion.classList.add("hidden");
      showToast(`✨ تم اعتماد تخطي السؤال (${targetIdx + 1}) مسبقاً! واحتساب 3 نقاط ذهبية للمتسابق`, "fa-circle-check", 4000);
    });
  });
}

function loadStageQuestion(idx) {
  if (!currentQuizData) return;
  const allQuestions = [];
  currentQuizData.sections.forEach(s => {
    (s.questions || []).forEach(q => {
      allQuestions.push({ ...q, sectionName: s.sectionName });
    });
  });

  if (allQuestions.length === 0) {
    const isRoomLeader = currentUser && (
      currentUser.name === currentLiveRoom?.leaderName || 
      currentUser.name === currentLiveRoom?.creatorName ||
      currentUser.role === "supervisor" ||
      isSupervisor(currentUser.name)
    );
    if (isRoomLeader) {
      finishContestant();
    }
    return;
  }

  // انتهت أسئلة هذا الطالب → إنهاء واختيار طالب جديد
  if (idx >= allQuestions.length) {
    const isRoomLeader = currentUser && (
      currentUser.name === currentLiveRoom?.leaderName || 
      currentUser.name === currentLiveRoom?.creatorName ||
      currentUser.role === "supervisor" ||
      isSupervisor(currentUser.name)
    );
    if (isRoomLeader) {
      finishContestant();
    }
    return;
  }

  currentQuestionIndex = idx;
  const q = allQuestions[idx];
  stageQuestionNumber.textContent = `السؤال ${idx + 1} من ${allQuestions.length}`;
  stageSectionName.textContent = q.sectionName;
  stageQuestionText.className = `question-text-content font-${q.font || 'quran'}`;
  stageQuestionText.textContent = q.text;

  // تأثير حركة ظهور السؤال (Animation) - تنظيف كلاسات الخروج وتفعيل كلاس النزول بوسط الشاشة
  const questionCardEl = document.querySelector(".stage-question-card");
  if (questionCardEl) {
    questionCardEl.classList.remove("question-exit-anim");
    questionCardEl.classList.remove("question-enter-anim");
    void questionCardEl.offsetWidth; // إعادة تشغيل الأنيميشن
    questionCardEl.classList.add("question-enter-anim");
    bringQuestionCardIntoView(questionCardEl);
  }

  // إزالة أي شريط تقييم إجابة سابق
  stageInteractiveArea.querySelectorAll(".answer-feedback-banner").forEach(fb => fb.remove());

  // الانتقال للسؤال التالي مع عرض كرت نتيجة الإجابة أولاً ثم خروج السؤال ثم لوحة الشرف
  function advanceToNext(scoreDelta = 0, isPenalty = false, isCorrect = true, chosenChoiceIdx = null, isTimeout = false) {
    clearInterval(liveTimerInterval);
    liveTimerInterval = null;
    lastTimerConfigKey = "";
    addContestantScore(scoreDelta);

    const nextIdx = idx + 1;
    const isFinished = nextIdx >= allQuestions.length;

    // بث نتيجة الإجابة سحابياً للغرفة الحية وتحديث رقم السؤال والنقاط فوراً للجميع
    // ملاحظة حاسمة: لا نبدأ مؤقت السؤال القادم هنا إطلاقاً حتى لا يُحسب وقت لوحة الشرف أو اختيار البطاقات من وقت السؤال!
    if (currentLiveRoom) {
      const answerPayload = {
        questionIdx: idx,
        chosenChoiceIdx: chosenChoiceIdx,
        isCorrect: isCorrect,
        isTimeout: isTimeout,
        scoreDelta: scoreDelta,
        isPenalty: isPenalty,
        contestantScore: contestantScore,
        answeredBy: currentUser?.name || "المتسابق",
        timestamp: Date.now()
      };
      currentLiveRoom.lastAnswerEvent = answerPayload;
      currentLiveRoom.contestantScore = contestantScore;
      currentLiveRoom.currentQuestionIdx = nextIdx;
      currentLiveRoom.timerState = null; // إيقاف العداد كلياً أثناء الانتقال والبطاقات

      if (currentLiveRoom.id) {
        try {
          const roomRef = doc(db, "live_rooms", currentLiveRoom.id);
          const updatePayload = {
            lastAnswerEvent: answerPayload,
            contestantScore: contestantScore,
            currentQuestionIdx: nextIdx,
            timerState: null,
            lastUpdated: serverTimestamp()
          };
          updateDoc(roomRef, updatePayload).catch(err => console.warn("Sync lastAnswerEvent notice:", err));
        } catch (e) {}
      }
    }

    // تشغيل دورة الانتقال السينمائية الكاملة
    playQuestionTransitionSequence({
      isCorrect,
      scoreDelta,
      isPenalty,
      nextIdx,
      isFinished,
      allQuestions,
      currentIdx: idx,
      isLeaderUser: true,
      isTimeout
    });
  }

  currentStageAdvanceToNext = advanceToNext;

  // معالجة انتهاء وقت السؤال الحالي كإجابة خاطئة مع ظهور X أحمر
  function handleStageQuestionTimeout() {
    if (isQuestionTransitionRunning) return;

    // فحص بطاقة الحصانة (درع الأمان)
    const hasImmunity = !!(activeCardEffect?.effect?.immunity);
    let penalty = 0;
    if (hasImmunity) {
      showToast("🛡️ درع الأمان (الحصانة): انتهى الوقت ولكن تم إلغاء أي خصم درجات!", "fa-shield-halved", 3500);
      activeCardEffect = null;
    } else {
      penalty = 3;
      showToast("⏰ انتهى الوقت المحدد للسؤال! ❌ خصم 3 درجات والانتقال للسؤال التالي", "fa-clock", 3500);
    }

    // إذا كان نوع السؤال اختيار من متعدد (MCQ)، نظهر الإجابة الصحيحة باللون الأخضر ونعطل الخيارات
    if (q.type === "mcq") {
      const btns = stageInteractiveArea.querySelectorAll(".btn-choice-duo");
      btns.forEach(b => {
        b.disabled = true;
        b.style.pointerEvents = "none";
      });
      if (q.correct !== undefined) {
        const correctBtn = stageInteractiveArea.querySelector(`[data-choice="${q.correct}"]`);
        if (correctBtn) correctBtn.classList.add("correct");
      }
    }

    // الانتقال مع ظهور علامة X الحمراء الكبيرة تماماً كالإجابة الخاطئة
    advanceToNext(-penalty, penalty > 0, false, null, true);
  }

  // فحص ما إذا كان هذا السؤال قد تم تخطيه مسبقاً ببطاقة التخطي التكتيكية
  if (Array.isArray(currentLiveRoom?.skippedQuestionIndices) && currentLiveRoom.skippedQuestionIndices.includes(idx)) {
    stageInteractiveArea.innerHTML = `
      <div class="skip-question-banner">
        <div class="skip-icon"><i class="fa-solid fa-forward-fast"></i></div>
        <h3>لقد تم تخطي هذا السؤال مسبقاً ببطاقة تخطي الأسئلة!</h3>
        <p>تم تخطي السؤال والحصول على 3 نقاط بدلاً منه مسبقاً بنجاح.</p>
        <div class="skip-points-badge"><i class="fa-solid fa-check"></i> +3 نقاط مكتسبة مسبقاً</div>
        <div style="margin-top: 16px;">
          <button type="button" id="btnContinueSkippedQ" class="btn-duo-green btn-md">
            <i class="fa-solid fa-forward"></i> متابعة والانتقال للسؤال التالي
          </button>
        </div>
      </div>
    `;
    if (checkIsSolverAllowed(currentLiveRoom)) {
      const skipTimer = setTimeout(() => {
        advanceToNext(0, false, true);
      }, 2800);

      document.getElementById("btnContinueSkippedQ")?.addEventListener("click", () => {
        clearTimeout(skipTimer);
        advanceToNext(0, false, true);
      }, { once: true });
    } else {
      const btn = document.getElementById("btnContinueSkippedQ");
      if (btn) btn.style.display = "none";
    }
    return;
  }

  // تطبيق ميزة البطاقة التكتيكية إن وجدت
  let cardBonusPoints = 0;
  let hasImmunity = false;
  let doublePointsActive = false;
  let eliminateActive = 0;
  let penaltyOnWrong = 0;       // خصم إضافي عند الخطأ (بطاقة المخاطرة الكبرى)
  let speedBonusExtra = 0;      // نقاط إضافية إن أجاب في أقل من 5 ثوان
  let cardBannerHtml = "";
  const questionStartTime = Date.now(); // لحساب سرعة الإجابة

  if (activeCardEffect) {
    if (activeCardEffect.title) {
      cardBannerHtml = `
        <div class="active-card-banner">
          <div class="active-card-info">
            <i class="fa-solid ${activeCardEffect.icon || 'fa-bolt'}"></i>
            <span>ميزة بطاقة نشطة: ${activeCardEffect.title}</span>
          </div>
          <span class="active-card-desc">${activeCardEffect.desc}</span>
        </div>
      `;

      const helperName = activeCardEffect.helperName || currentLiveRoom?.activeTeacherHelp?.helperName;
      if (helperName) {
        cardBannerHtml += `
          <div class="teacher-help-active-banner">
            <i class="fa-solid fa-chalkboard-user"></i>
            <div>
              <strong>مساعدة موجهة من المعلم:</strong> ${escapeHtml(helperName)}
              <span style="display:block;font-size:12px;opacity:0.9;margin-top:2px;">يشارك المعلم المساعد المتسابق بالتوجيه والنصيحة مع تمديد الوقت!</span>
            </div>
          </div>
        `;
      }

      if (activeCardEffect.effect?.showRuleHint || activeCardEffect.effect?.hint) {
        cardBannerHtml += `
          <div style="background:#fefce8;border:2px dashed #facc15;border-radius:12px;padding:10px 16px;margin-bottom:12px;color:#854d0e;font-size:13.5px;font-weight:700;display:flex;align-items:center;gap:10px;">
            <i class="fa-solid fa-lightbulb" style="color:#eab308;font-size:18px;"></i>
            <span>تلميح تجويدي مضيء: ركّز في الحركات ومخرج الحرف والحكم المتصل به قبل الإجابة.</span>
          </div>
        `;
      }
    }

    if (activeCardEffect.effect) {
      const eff = activeCardEffect.effect;
      if (eff.pointsBonus) cardBonusPoints = eff.pointsBonus;
      if (eff.immunity) hasImmunity = true;
      if (eff.doublePoints) doublePointsActive = true;
      if (eff.eliminateOptions) eliminateActive = eff.eliminateOptions;
      if (eff.penaltyOnWrong) penaltyOnWrong = eff.penaltyOnWrong;
      if (eff.speedBonusUnder5s) speedBonusExtra = eff.speedBonusUnder5s;
      if (eff.zoomScript) {
        stageQuestionText.style.fontSize = "28px";
      }
    }
  }

  // ── MCQ: قفل بعد الضغط + انتقال تلقائي ──
  if (q.type === "mcq" && q.options) {
    const isAllowedToSolve = checkIsSolverAllowed(currentLiveRoom);
    // إذا كانت بطاقة "حذف خيارين" نشطة
    let optionsToRender = q.options.map((opt, oIdx) => ({ text: opt, idx: oIdx, hidden: false }));
    if (eliminateActive > 0 && optionsToRender.length > 2) {
      let eliminatedCount = 0;
      for (let i = optionsToRender.length - 1; i >= 0; i--) {
        if (optionsToRender[i].idx !== q.correct && eliminatedCount < eliminateActive) {
          optionsToRender[i].hidden = true;
          eliminatedCount++;
        }
      }
    }

    stageInteractiveArea.innerHTML = `
      ${cardBannerHtml}
      ${!isAllowedToSolve ? `
        <div class="spectator-mode-banner">
          <i class="fa-solid fa-eye"></i>
          <span>أنت تشاهد المسابقة كجمهور — المتسابق الحالي: <strong>${escapeHtml(currentLiveRoom?.contestantName || 'المتسابق')}</strong> (المشاهدة فقط متاحة لك)</span>
        </div>
      ` : ''}
      <div class="mcq-options-grid ${!isAllowedToSolve ? 'stage-viewer-locked' : ''}">
        ${optionsToRender.map(optObj => optObj.hidden ? `
          <button class="btn-choice-duo font-${q.font || 'quran'}" style="opacity:0.25;text-decoration:line-through;pointer-events:none;" disabled>
            <i class="fa-solid fa-ban" style="color:#ef4444;margin-left:6px;"></i> ${optObj.text}
          </button>
        ` : `
          <button class="btn-choice-duo font-${q.font || 'quran'}" data-choice="${optObj.idx}" ${!isAllowedToSolve ? 'disabled style="pointer-events:none;cursor:default;"' : ''}>${optObj.text}</button>
        `).join("")}
      </div>`;

    bringQuestionCardIntoView();

    if (isAllowedToSolve) {
      const btns = stageInteractiveArea.querySelectorAll(".btn-choice-duo:not([disabled])");
      btns.forEach(btn => {
        btn.addEventListener("click", () => {
          // قفل جميع الخيارات فوراً
          btns.forEach(b => { b.disabled = true; b.style.pointerEvents = "none"; });
          const choiceIdx = parseInt(btn.getAttribute("data-choice"));
          const elapsedSec = (Date.now() - questionStartTime) / 1000;

          let earnedPoints = q.points || 5;
          if (doublePointsActive) earnedPoints *= 2;
          earnedPoints += cardBonusPoints;
          // مكافأة السرعة: إن أجاب في أقل من 5 ثوانٍ
          if (speedBonusExtra > 0 && elapsedSec < 5) {
            earnedPoints += speedBonusExtra;
            showToast(`⚡ سرعة البرق! +${speedBonusExtra} نقاط إضافية (${elapsedSec.toFixed(1)}ث)`, "fa-forward-fast", 2500);
          }

          if (choiceIdx === q.correct) {
            btn.classList.add("correct");
            showToast(`✅ إجابة صحيحة! (+${earnedPoints} درجات)`, "fa-circle-check");
            activeCardEffect = null; // استهلاك البطاقة
            advanceToNext(earnedPoints, false, true, choiceIdx);
          } else {
            // فحص بطاقة "فرصة ثانية"
            if (activeCardEffect?.effect?.secondChance) {
              btn.classList.add("wrong");
              btn.disabled = true;
              btn.style.opacity = "0.35";
              btns.forEach(b => {
                if (b !== btn) {
                  b.disabled = false;
                  b.style.pointerEvents = "auto";
                }
              });
              showToast("🔄 فرصة ثانية: إجابتك غير دقيقة، ولديك فرصة أخرى!", "fa-arrow-rotate-left", 3500);
              activeCardEffect = null;
              return;
            }

            btn.classList.add("wrong");
            const correctBtn = stageInteractiveArea.querySelector(`[data-choice="${q.correct}"]`);
            if (correctBtn) correctBtn.classList.add("correct");

            if (hasImmunity) {
              showToast("🛡️ درع الأمان: تم إحباط أي خصم للدرجات!", "fa-shield-halved");
              activeCardEffect = null;
              advanceToNext(0, false, false, choiceIdx);
            } else if (penaltyOnWrong > 0) {
              showToast(`❌ إجابة خاطئة — المخاطرة الكبرى: خصم ${penaltyOnWrong} درجات!`, "fa-fire-flame-curved", 3000);
              activeCardEffect = null;
              advanceToNext(-penaltyOnWrong, true, false, choiceIdx);
            } else {
              const wrongPenalty = 3;
              showToast("❌ إجابة خاطئة (خصم 3 درجات ❌)", "fa-circle-xmark", 3000);
              activeCardEffect = null;
              advanceToNext(-wrongPenalty, true, false, choiceIdx);
            }
          }
        }, { once: true });
      });
    }

  // ── Matching: توصيل تفاعلي متزامن بالكامل مع ترقيم واضح وتصحيح تسلسلي عند الاعتماد ──
  } else if (q.type === "matching" && q.pairs && q.pairs.length > 0) {
    const isAllowedToSolve = checkIsSolverAllowed(currentLiveRoom);
    const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name));
    let earnedPoints = q.points || 5;
    if (doublePointsActive) earnedPoints *= 2;
    earnedPoints += cardBonusPoints;

    const autoMatchOneActive = !!(activeCardEffect?.effect?.autoMatchOne);

    // تطهير الأزواج ودعم كلا الشكلين [a,b] أو {left, right}
    const cleanPairs = q.pairs.map(p => {
      if (Array.isArray(p)) return [p[0] || "", p[1] || ""];
      if (p && typeof p === "object") return [p.left || p.first || "", p.right || p.second || ""];
      return ["", ""];
    }).filter(p => p[0] || p[1]);

    const ARABIC_LETTERS = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"];

    const leftItems = cleanPairs.map((p, idx) => ({ 
      id: `left_${idx}`, 
      text: p[0], 
      pairIdx: idx, 
      num: idx + 1 
    }));

    // خلط مبعثر وثابت وموحد للطرف (ب) للجميع
    let seedShuffle = cleanPairs.map((p, origIdx) => ({ 
      id: `right_${origIdx}`, 
      text: p[1], 
      pairIdx: origIdx, 
      letter: ARABIC_LETTERS[origIdx] || String(origIdx + 1) 
    }));
    
    if (currentLiveRoom?.matchingOrder && currentLiveRoom.matchingOrder.questionIdx === idx && Array.isArray(currentLiveRoom.matchingOrder.order)) {
      const order = currentLiveRoom.matchingOrder.order;
      seedShuffle.sort((a, b) => order.indexOf(a.pairIdx) - order.indexOf(b.pairIdx));
    } else {
      seedShuffle = shuffleArray(seedShuffle);
      if (seedShuffle.length > 1 && seedShuffle[0].pairIdx === 0) {
        const first = seedShuffle.shift();
        seedShuffle.push(first);
      }
      if (isAllowedToSolve && currentLiveRoom?.id) {
        const orderArr = seedShuffle.map(s => s.pairIdx);
        currentLiveRoom.matchingOrder = { questionIdx: idx, order: orderArr };
        updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
          matchingOrder: { questionIdx: idx, order: orderArr }
        }).catch(() => {});
      }
    }
    const rightItems = seedShuffle;

    // مصفوفة الوصلات الحالية: [{ leftId, rightId, leftPairIdx, rightPairIdx, leftNum, rightLetter }]
    let activeConnections = [];
    if (currentLiveRoom?.matchingState?.questionIdx === idx && Array.isArray(currentLiveRoom.matchingState.connections)) {
      activeConnections = [...currentLiveRoom.matchingState.connections];
    }

    // إذا كانت بطاقة "توصيل الحكمة" نشطة: توصيل أول زوج تلقائياً
    if (autoMatchOneActive && leftItems.length > 0 && activeConnections.length === 0) {
      const matchR = rightItems.find(r => r.pairIdx === leftItems[0].pairIdx);
      if (matchR) {
        activeConnections.push({
          leftId: leftItems[0].id,
          rightId: matchR.id,
          leftPairIdx: leftItems[0].pairIdx,
          rightPairIdx: matchR.pairIdx,
          leftNum: leftItems[0].num,
          rightLetter: matchR.letter
        });
        showToast("✨ توصيل الحكمة: تم ربط أول زوج تلقائياً!", "fa-link", 3000);
      }
    }

    let selectedLeftId = null;
    let isVerifyingSequenceRunning = false;

    // دوال المزامنة الخارجية عند استقبال أحداث السحابة
    window.syncExternalMatchingPairsUI = function(syncedConnections) {
      if (isVerifyingSequenceRunning) return;
      activeConnections = Array.isArray(syncedConnections) ? [...syncedConnections] : [];
      renderMatchingBoard();
    };

    window.runExternalMatchingVerification = function(syncedConnections) {
      if (Array.isArray(syncedConnections)) activeConnections = [...syncedConnections];
      startSequentialVerification(false);
    };

    function renderMatchingBoard() {
      const isSpectator = !isAllowedToSolve;

      stageInteractiveArea.innerHTML = `
        ${cardBannerHtml}
        ${isSpectator ? `
          <div class="spectator-mode-banner">
            <i class="fa-solid fa-eye"></i>
            <span>أنت تشاهد المسابقة كجمهور — المتسابق الحالي: <strong>${escapeHtml(currentLiveRoom?.contestantName || 'المتسابق')}</strong> (المشاهدة والتشجيع فقط متاحة لك)</span>
          </div>
        ` : ''}

        <div style="text-align:center;font-size:14px;color:#334155;font-weight:800;margin-top:6px;display:flex;align-items:center;justify-content:center;gap:8px;">
          <i class="fa-solid fa-arrows-split-up-and-left" style="color:var(--duo-blue);"></i>
          <span>اضغط على عنصر من الطرف (أ) ثم على ما يطابقه من الطرف (ب) [يتزامن لحظياً]:</span>
        </div>

        <div class="matching-play-grid ${isSpectator ? 'stage-viewer-locked' : ''}">
          <!-- الطرف أ -->
          <div class="matching-items-column">
            <div class="matching-col-header"><i class="fa-solid fa-align-right"></i> الطرف (أ) [الأصول]:</div>
            ${leftItems.map(item => {
              const conn = activeConnections.find(c => c.leftId === item.id);
              const isSelected = selectedLeftId === item.id;
              return `
                <div class="matching-tile font-${q.font || 'quran'} ${conn ? 'connected' : ''} ${isSelected ? 'selected' : ''}" 
                     data-left-id="${item.id}" data-pair="${item.pairIdx}">
                  <span class="matching-item-badge" style="font-family:'Cairo', sans-serif !important;">${item.num}</span>
                  <span class="matching-tile-text">${escapeHtml(item.text)}</span>
                  ${conn ? `
                    <span class="matching-connect-pill" style="font-family:'Cairo', sans-serif !important;">
                      <i class="fa-solid fa-link"></i> متصل بـ (${conn.rightLetter})
                    </span>
                  ` : ''}
                </div>
              `;
            }).join("")}
          </div>

          <!-- الطرف ب -->
          <div class="matching-items-column">
            <div class="matching-col-header"><i class="fa-solid fa-align-left"></i> الطرف (ب) [مبعثر]:</div>
            ${rightItems.map(item => {
              const conn = activeConnections.find(c => c.rightId === item.id);
              return `
                <div class="matching-tile font-${q.font || 'quran'} ${conn ? 'connected' : ''}" 
                     data-right-id="${item.id}" data-pair="${item.pairIdx}">
                  <span class="matching-item-badge badge-right-letter" style="font-family:'Cairo', sans-serif !important;">${item.letter}</span>
                  <span class="matching-tile-text">${escapeHtml(item.text)}</span>
                  ${conn ? `
                    <span class="matching-connect-pill" style="font-family:'Cairo', sans-serif !important;">
                      <i class="fa-solid fa-link"></i> وصلة (${conn.leftNum})
                    </span>
                  ` : ''}
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- شريط تأكيد الإجابة والمشرف -->
        <div class="matching-submit-row" style="margin-top:18px;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;">
          ${isAllowedToSolve ? `
            <button type="button" id="btnSubmitMatching" class="btn-duo-green btn-md" ${activeConnections.length === 0 ? 'disabled' : ''}>
              <i class="fa-solid fa-circle-check"></i> تأكيد واعتماد الإجابة وبدء التصحيح المتزامن (${activeConnections.length}/${cleanPairs.length})
            </button>
            <button type="button" id="btnResetMatchingConnections" class="btn-duo-outline btn-sm" ${activeConnections.length === 0 ? 'disabled' : ''}>
              <i class="fa-solid fa-rotate-left"></i> مسح الوصلات
            </button>
          ` : `
            <div style="font-size:13.5px;color:#64748b;font-weight:700;">
              <i class="fa-solid fa-lock"></i> المتسابق يوصل الأزواج حالياً... سيظهر التصحيح لحظياً فور الاعتماد
            </div>
          `}

          ${isSup ? `
            <div style="display:inline-flex;align-items:center;gap:8px;background:#f8fafc;padding:4px 12px;border-radius:10px;border:1.5px solid var(--border-duo);">
              <label style="font-weight:800;font-size:13px;color:#334155;">درجة المشرف:</label>
              <input type="number" id="matchingScoreInput" value="${earnedPoints}" min="0" max="${earnedPoints * 2}" class="form-control" style="width:80px;padding:6px 8px;text-align:center;font-weight:900;color:#0f172a;background:#fff;">
              <button id="btnMatchingAccept" class="btn-duo-yellow btn-sm"><i class="fa-solid fa-crown"></i> قبول مباشر</button>
            </div>
          ` : ''}
        </div>
      `;

      if (isSpectator) return;

      // أحداث النقر للطرف (أ)
      stageInteractiveArea.querySelectorAll("[data-left-id]").forEach(el => {
        el.addEventListener("click", () => {
          if (isVerifyingSequenceRunning) return;
          const lId = el.getAttribute("data-left-id");
          selectedLeftId = (selectedLeftId === lId) ? null : lId;
          try { soundFX.btnClick(); } catch (e) {}
          renderMatchingBoard();
        });
      });

      // أحداث النقر للطرف (ب)
      stageInteractiveArea.querySelectorAll("[data-right-id]").forEach(el => {
        el.addEventListener("click", () => {
          if (isVerifyingSequenceRunning) return;
          const rId = el.getAttribute("data-right-id");
          if (!selectedLeftId) {
            showToast("اضغط على عنصر من الطرف (أ) أولاً", "fa-hand-pointer");
            return;
          }

          const lItem = leftItems.find(x => x.id === selectedLeftId);
          const rItem = rightItems.find(x => x.id === rId);
          if (!lItem || !rItem) return;

          // حذف أي توصيل سابق لأي من العنصرين
          activeConnections = activeConnections.filter(c => c.leftId !== lItem.id && c.rightId !== rItem.id);

          // إضافة التوصيل الجديد (دون فحص صحة أو خطأ في هذه المرحلة)
          activeConnections.push({
            leftId: lItem.id,
            rightId: rItem.id,
            leftPairIdx: lItem.pairIdx,
            rightPairIdx: rItem.pairIdx,
            leftNum: lItem.num,
            rightLetter: rItem.letter
          });

          selectedLeftId = null;
          try { soundFX.btnClick(); } catch (e) {}

          // بث التوصيل الجديد فوراً لجميع المشاركين عبر Firestore
          broadcastMatchingConnectionState(false);
          renderMatchingBoard();
        });
      });

      // زر مسح الوصلات
      document.getElementById("btnResetMatchingConnections")?.addEventListener("click", () => {
        if (isVerifyingSequenceRunning) return;
        activeConnections = [];
        selectedLeftId = null;
        broadcastMatchingConnectionState(false);
        renderMatchingBoard();
      });

      // زر اعتماد الإجابة وبدء التصحيح
      document.getElementById("btnSubmitMatching")?.addEventListener("click", () => {
        if (isVerifyingSequenceRunning || activeConnections.length === 0) return;
        broadcastMatchingConnectionState(true);
        startSequentialVerification(true);
      });

      // قبول المشرف المباشر
      document.getElementById("btnMatchingAccept")?.addEventListener("click", () => {
        let sc = parseInt(document.getElementById("matchingScoreInput")?.value || String(earnedPoints));
        activeCardEffect = null;
        advanceToNext(sc, false, true);
      }, { once: true });
    }

    function broadcastMatchingConnectionState(isVerifying) {
      if (!currentLiveRoom?.id) return;
      const payload = {
        questionIdx: idx,
        connections: activeConnections,
        pairs: activeConnections,
        verifying: !!isVerifying,
        startedAt: Date.now(),
        updatedBy: currentUser?.name || "المتسابق"
      };
      updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
        matchingState: payload,
        lastUpdated: serverTimestamp()
      }).catch(err => console.warn("Broadcast matching state notice:", err));
    }

    // تشغيل أنيميشن التصحيح المتسلسل خطوة بخطوة للأزواج واحداً تلو الآخر
    function startSequentialVerification(isInitiator = true) {
      if (isVerifyingSequenceRunning) return;
      isVerifyingSequenceRunning = true;

      // قفل الأزرار وإظهار رسالة الفحص
      const submitBtn = document.getElementById("btnSubmitMatching");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق من الأزواج بالتزامن...`;
      }

      let pairCheckIdx = 0;
      let correctMatchesCount = 0;

      function checkNextPair() {
        if (pairCheckIdx >= activeConnections.length) {
          // انتهى فحص جميع الأزواج
          const allCorrect = (correctMatchesCount === cleanPairs.length) && (activeConnections.length === cleanPairs.length);
          const finalEarnedScore = Math.round((correctMatchesCount / cleanPairs.length) * earnedPoints);

          setTimeout(() => {
            if (allCorrect) {
              showToast(`🌟 ما شاء الله! جميع الأزواج صحيحة بالكامل (+${earnedPoints} درجات)`, "fa-circle-check", 3500);
              try { soundFX.celebrate(); } catch (e) {}
            } else {
              showToast(`تم التحقق: (${correctMatchesCount} من ${cleanPairs.length}) أزواج صحيحة (+${finalEarnedScore} درجات)`, "fa-check-double", 3500);
            }
            activeCardEffect = null;
            if (isInitiator) {
              advanceToNext(finalEarnedScore, false, allCorrect);
            }
          }, 1200);
          return;
        }

        const conn = activeConnections[pairCheckIdx];
        const leftEl = stageInteractiveArea.querySelector(`[data-left-id="${conn.leftId}"]`);
        const rightEl = stageInteractiveArea.querySelector(`[data-right-id="${conn.rightId}"]`);

        // تمييز الزوج الخاضع للفحص بنبض ذهبي
        if (leftEl) leftEl.classList.add("verifying-current");
        if (rightEl) rightEl.classList.add("verifying-current");

        setTimeout(() => {
          if (leftEl) leftEl.classList.remove("verifying-current");
          if (rightEl) rightEl.classList.remove("verifying-current");

          const isPairCorrect = (conn.leftPairIdx === conn.rightPairIdx);
          if (isPairCorrect) {
            correctMatchesCount++;
            if (leftEl) leftEl.classList.add("match-correct-reveal");
            if (rightEl) rightEl.classList.add("match-correct-reveal");
            try { soundFX.correct(); } catch (e) {}
          } else {
            if (leftEl) leftEl.classList.add("match-wrong-reveal");
            if (rightEl) rightEl.classList.add("match-wrong-reveal");
            try { soundFX.wrong(); } catch (e) {}
          }

          pairCheckIdx++;
          setTimeout(checkNextPair, 850);
        }, 650);
      }

      checkNextPair();
    }

    renderMatchingBoard();
    bringQuestionCardIntoView();

  // ── Ordering: ترتيب تفاعلي للجمل والكلمات ──
  } else if (q.type === "ordering") {
    const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name));
    let earnedPoints = q.points || 5;
    if (doublePointsActive) earnedPoints *= 2;
    earnedPoints += cardBonusPoints;

    const originalItems = Array.isArray(q.items) && q.items.length > 0 
      ? [...q.items] 
      : (q.targetSentence ? q.targetSentence.split(/\s+/).filter(Boolean) : ["كلمة 1", "كلمة 2"]);
    
    const lockTwoActive = !!(activeCardEffect?.effect?.lockTwoItems);

    let placedWords = [];
    let bankWords = shuffleArray(originalItems.map((word, idx) => ({ id: `word_${idx}_${Math.random().toString(36).slice(2, 6)}`, text: word, origIdx: idx, locked: false })));
    // التأكد من أن الكلمات مبعثرة ومبهدلة بالكامل للتفكير
    if (bankWords.length > 1 && bankWords.every((w, i) => w.origIdx === i)) {
      bankWords.reverse();
    }

    // إذا كانت بطاقة "حصانة الترتيب" نشطة: تثبيت أول عنصرين تلقائياً في موقعهما الصحيح
    if (lockTwoActive && originalItems.length >= 2) {
      for (let i = 0; i < 2; i++) {
        const targetWord = originalItems[i];
        const bIdx = bankWords.findIndex(w => w.text === targetWord && w.origIdx === i);
        if (bIdx >= 0) {
          const lockedWord = { ...bankWords[bIdx], locked: true };
          bankWords.splice(bIdx, 1);
          placedWords.push(lockedWord);
        }
      }
      showToast("🛡️ حصانة الترتيب: تم تثبيت أول عنصرين في موقعهما الصحيح!", "fa-lock", 3000);
    }

    function broadcastOrderingState() {
      if (!currentLiveRoom || !currentLiveRoom.id) return;
      const placedPayload = placedWords.map(w => ({ id: w.id, text: w.text, locked: !!w.locked, origIdx: w.origIdx }));
      const bankPayload = bankWords.map(w => ({ id: w.id, text: w.text, locked: !!w.locked, origIdx: w.origIdx }));
      updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
        orderingState: {
          questionIdx: idx,
          placedWords: placedPayload,
          bankWords: bankPayload,
          updatedBy: currentUser?.name || "المتسابق",
          timestamp: Date.now()
        },
        lastUpdated: serverTimestamp()
      }).catch(err => console.warn("Broadcast orderingState err:", err));
    }

    window.syncExternalOrderingUI = function(extPlaced, extBank) {
      if (currentQuestionIndex !== idx) return;
      if (Array.isArray(extPlaced) && Array.isArray(extBank)) {
        placedWords = extPlaced;
        bankWords = extBank;
        renderOrderingBoard();
      }
    };

    function renderOrderingBoard() {
      const isAllowedToSolve = checkIsSolverAllowed(currentLiveRoom);
      stageInteractiveArea.innerHTML = `
        ${cardBannerHtml}
        ${!isAllowedToSolve ? `
          <div class="spectator-mode-banner">
            <i class="fa-solid fa-eye"></i>
            <span>أنت تشاهد المسابقة كجمهور — المتسابق الحالي: <strong>${escapeHtml(currentLiveRoom?.contestantName || 'المتسابق')}</strong> (المشاهدة فقط متاحة لك)</span>
          </div>
        ` : ''}
        <div class="ordering-play-area ${!isAllowedToSolve ? 'stage-viewer-locked' : ''}">
          <div style="text-align:center;font-size:14px;color:#475569;font-weight:800;">
            <i class="fa-solid fa-arrow-down-short-wide"></i> اضغط على الكلمات المبعثرة بالترتيب الصحيح لتكوين الجملة:
          </div>

          <!-- حاوية الترتيب -->
          <div class="ordering-slots-container ${placedWords.length === 0 ? '' : 'active-target'}" id="stageOrderingSlots">
            ${placedWords.length === 0 ? `
              <div class="ordering-empty-hint"><i class="fa-solid fa-hand-pointer"></i> اضغط على الكلمات بالأسفل لإضافتها هنا بالترتيب...</div>
            ` : placedWords.map((w, pIdx) => `
              <div class="ordering-chip font-${q.font || 'quran'} placed ${w.locked ? 'locked' : ''}" data-placed-id="${w.id}">
                <span class="chip-num">${pIdx + 1}</span>
                <span>${w.text}</span>
                ${w.locked ? '<i class="fa-solid fa-lock" style="font-size:12px;color:#ca8a04;"></i>' : '<i class="fa-solid fa-xmark" style="font-size:12px;opacity:0.6;"></i>'}
              </div>
            `).join("")}
          </div>

          <!-- بنك الكلمات المبعثرة -->
          <div class="ordering-bank-title"><i class="fa-solid fa-layer-group"></i> الكلمات المتاحة (اضغط للترتيب):</div>
          <div class="ordering-bank-container" id="stageOrderingBank">
            ${bankWords.length === 0 ? `
              <div style="font-size:13px;color:#16a34a;font-weight:700;"><i class="fa-solid fa-check"></i> تم وضع جميع الكلمات! اضغط «اعتماد وتحقق» بالأسفل</div>
            ` : bankWords.map(w => `
              <div class="ordering-chip font-${q.font || 'quran'}" data-bank-id="${w.id}">
                ${w.text}
              </div>
            `).join("")}
          </div>

          <!-- أزرار الإجراءات -->
          <div class="ordering-actions-bar">
            ${isAllowedToSolve ? `
              <button type="button" class="btn-duo-outline btn-sm" id="btnResetOrdering">
                <i class="fa-solid fa-rotate-left"></i> إعادة الترتيب
              </button>
              <button type="button" class="btn-duo-green" id="btnSubmitOrdering">
                <i class="fa-solid fa-circle-check"></i> اعتماد وتحقق من الترتيب
              </button>
            ` : `
              <div style="font-size:13px;color:#64748b;font-weight:700;">
                <i class="fa-solid fa-lock"></i> المتسابق يرتب الكلمات حالياً...
              </div>
            `}
            ${isSup ? `
              <button type="button" class="btn-duo-yellow btn-sm" id="btnManualAcceptOrdering" title="قبول فوري من المشرف">
                <i class="fa-solid fa-crown"></i> قبول مباشر (${earnedPoints} درجات)
              </button>
            ` : ''}
          </div>
        </div>
      `;

      if (!isAllowedToSolve) {
        if (isSup) {
          document.getElementById("btnManualAcceptOrdering")?.addEventListener("click", () => {
            activeCardEffect = null;
            advanceToNext(earnedPoints, false, true);
          }, { once: true });
        }
        return;
      }

      // إضافة كلمة من البنك إلى خانات الترتيب
      stageInteractiveArea.querySelectorAll("[data-bank-id]").forEach(el => {
        el.addEventListener("click", () => {
          const bId = el.getAttribute("data-bank-id");
          const idx = bankWords.findIndex(w => w.id === bId);
          if (idx >= 0) {
            placedWords.push(bankWords[idx]);
            bankWords.splice(idx, 1);
            try { soundFX.btnClick(); } catch (e) {}
            renderOrderingBoard();
            broadcastOrderingState();
          }
        });
      });

      // إزالة كلمة من خانات الترتيب وإرجاعها للبنك
      stageInteractiveArea.querySelectorAll("[data-placed-id]").forEach(el => {
        el.addEventListener("click", () => {
          const pId = el.getAttribute("data-placed-id");
          const idx = placedWords.findIndex(w => w.id === pId);
          if (idx >= 0 && !placedWords[idx].locked) {
            bankWords.push(placedWords[idx]);
            placedWords.splice(idx, 1);
            try { soundFX.btnClick(); } catch (e) {}
            renderOrderingBoard();
            broadcastOrderingState();
          }
        });
      });

      // إعادة ضبط
      document.getElementById("btnResetOrdering")?.addEventListener("click", () => {
        const unlockeds = placedWords.filter(w => !w.locked);
        placedWords = placedWords.filter(w => w.locked);
        bankWords.push(...unlockeds);
        renderOrderingBoard();
        broadcastOrderingState();
      });

      let isOrderingVerifyingRunning = false;

      function broadcastOrderingVerificationState() {
        if (!currentLiveRoom || !currentLiveRoom.id) return;
        const placedPayload = placedWords.map(w => ({ id: w.id, text: w.text, locked: !!w.locked, origIdx: w.origIdx }));
        const bankPayload = bankWords.map(w => ({ id: w.id, text: w.text, locked: !!w.locked, origIdx: w.origIdx }));
        updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
          orderingState: {
            questionIdx: idx,
            placedWords: placedPayload,
            bankWords: bankPayload,
            verifying: true,
            startedAt: Date.now(),
            updatedBy: currentUser?.name || "المتسابق",
            timestamp: Date.now()
          },
          lastUpdated: serverTimestamp()
        }).catch(err => console.warn("Broadcast ordering verification state err:", err));
      }

      // تشغيل أنيميشن التصحيح المتسلسل خطوة بخطوة للكلمات واحدة تلو الأخرى زي سؤال التوصيل
      function startSequentialOrderingVerification(isInitiator = true) {
        if (isOrderingVerifyingRunning) return;
        isOrderingVerifyingRunning = true;

        // قفل الأزرار وإظهار رسالة الفحص
        const submitBtn = document.getElementById("btnSubmitOrdering");
        const resetBtn = document.getElementById("btnResetOrdering");
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري فحص الكلمات بالتزامن...`;
        }
        if (resetBtn) resetBtn.disabled = true;

        // تعطيل التفاعل مع الرقائق أثناء التحقق
        const chips = stageInteractiveArea.querySelectorAll(".ordering-chip");
        chips.forEach(c => { c.style.pointerEvents = "none"; });

        let wordCheckIdx = 0;
        let correctWordsCount = 0;

        function checkNextWord() {
          if (wordCheckIdx >= placedWords.length) {
            // انتهى فحص جميع الكلمات
            const allCorrect = (correctWordsCount === originalItems.length);

            setTimeout(() => {
              if (allCorrect) {
                try { soundFX.celebrate(); } catch (e) {}
                showToast(`🌟 ما شاء الله! جميع الكلمات مرتبة بإتقان تام (+${earnedPoints} درجات)`, "fa-circle-check", 3500);
                activeCardEffect = null;
                if (isInitiator) {
                  advanceToNext(earnedPoints, false, true);
                }
              } else {
                try { soundFX.wrong(); } catch (e) {}
                if (activeCardEffect?.effect?.secondChance) {
                  showToast("🔄 فرصة ثانية: الترتيب غير صحيح، أعد ترتيب الكلمات!", "fa-arrow-rotate-left", 3500);
                  activeCardEffect = null;
                  isOrderingVerifyingRunning = false;
                  renderOrderingBoard();
                  return;
                }

                if (hasImmunity) {
                  showToast("🛡️ درع الأمان: الترتيب غير دقيق ولكن تم إحباط أي خصم!", "fa-shield-halved", 3000);
                  activeCardEffect = null;
                  if (isInitiator) {
                    advanceToNext(0, false, false);
                  }
                } else if (penaltyOnWrong > 0) {
                  showToast(`❌ ترتيب غير دقيق — المخاطرة الكبرى: خصم ${penaltyOnWrong} درجات!`, "fa-fire-flame-curved", 3000);
                  activeCardEffect = null;
                  if (isInitiator) {
                    advanceToNext(-penaltyOnWrong, true, false);
                  }
                } else {
                  const wrongPenalty = 3;
                  showToast(`❌ الترتيب غير دقيق (${correctWordsCount} من ${originalItems.length} صحيحة) — خصم 3 درجات ❌`, "fa-circle-xmark", 3000);
                  activeCardEffect = null;
                  if (isInitiator) {
                    advanceToNext(-wrongPenalty, true, false);
                  }
                }
              }
            }, 1200);
            return;
          }

          const currentWordObj = placedWords[wordCheckIdx];
          const chipEl = stageInteractiveArea.querySelector(`[data-placed-id="${currentWordObj.id}"]`);

          // تمييز الكلمة الخاضعة للفحص بنبض ذهبي
          if (chipEl) chipEl.classList.add("order-verifying-current");

          setTimeout(() => {
            if (chipEl) chipEl.classList.remove("order-verifying-current");

            const isWordCorrect = (currentWordObj.text === originalItems[wordCheckIdx]);
            if (isWordCorrect) {
              correctWordsCount++;
              if (chipEl) {
                chipEl.classList.add("order-correct-reveal");
                const xIcon = chipEl.querySelector(".fa-xmark, .fa-lock");
                if (xIcon) xIcon.className = "fa-solid fa-check";
              }
              try { soundFX.correct(); } catch (e) {}
            } else {
              if (chipEl) {
                chipEl.classList.add("order-wrong-reveal");
                const xIcon = chipEl.querySelector(".fa-xmark, .fa-lock");
                if (xIcon) xIcon.className = "fa-solid fa-xmark";
              }
              try { soundFX.wrong(); } catch (e) {}
            }

            wordCheckIdx++;
            setTimeout(checkNextWord, 650);
          }, 500);
        }

        checkNextWord();
      }

      window.runExternalOrderingVerification = function(extPlaced) {
        if (currentQuestionIndex !== idx) return;
        if (Array.isArray(extPlaced) && extPlaced.length > 0) {
          placedWords = extPlaced;
          renderOrderingBoard();
          startSequentialOrderingVerification(false);
        }
      };

      // اعتماد وتحقق
      document.getElementById("btnSubmitOrdering")?.addEventListener("click", () => {
        if (placedWords.length !== originalItems.length) {
          showToast("⚠️ يرجى ترتيب جميع الكلمات أولاً!", "fa-triangle-exclamation");
          return;
        }

        broadcastOrderingVerificationState();
        startSequentialOrderingVerification(true);
      });

      // قبول فوري للمشرف
      document.getElementById("btnManualAcceptOrdering")?.addEventListener("click", () => {
        activeCardEffect = null;
        advanceToNext(earnedPoints, false, true);
      }, { once: true });
    }

    renderOrderingBoard();
    bringQuestionCardIntoView();

  // ── Oral: تقييم المعلمين + زر قبول للمشرف ──
  } else if (q.type === "oral") {
    const hasTarget = q.targetOral && q.targetOral.trim();
    const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name));
    // قراءة minRating من البطاقة إن وجدت
    const minRatingVal = (activeCardEffect?.effect?.minRating) || 0;

    stageInteractiveArea.innerHTML = `
      ${cardBannerHtml}
      <div class="oral-stage-showcase">
        <div class="oral-showcase-label"><i class="fa-solid fa-microphone-lines"></i> اقرأ وتلُ بدقة:</div>
        ${hasTarget ? `
          <div class="oral-showcase-content font-${q.font||'quran'}">${q.targetOral}</div>
        ` : `
          <div class="oral-showcase-content" style="color:#94a3b8;font-size:18px;">
            <i class="fa-regular fa-keyboard"></i> انظر إلى بطاقة السؤال
          </div>
        `}
        <div class="oral-showcase-footer">
          <span class="oral-eval-badge"><i class="fa-solid fa-star"></i> ${q.points||5} درجات</span>
          <span class="oral-hint-text"><i class="fa-solid fa-users-between-lines"></i> تقييم لجنة المعلمين المباشر</span>
        </div>
      </div>
      ${isSup ? `
        <div style="margin-top:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;">
          <label style="font-weight:700;font-size:13.5px;color:#475569;">الدرجة الشفهية (متوسط اللجنة):</label>
          <span style="font-size:16px;font-weight:900;color:var(--duo-blue);" id="oralAvgDisplay">5.00 / 5</span>
          <button id="btnOralAccept" class="btn-duo-green btn-sm"><i class="fa-solid fa-check"></i> قبول التقييم والانتقال</button>
        </div>
      ` : ''}`;

    // ربط متوسط التقييم بزر القبول
    const avgDisplay = document.getElementById("oralAvgDisplay");
    if (avgDisplay) {
      const observer = new MutationObserver(() => {
        if (avgDisplay && evalCurrentScoreDisplay)
          avgDisplay.textContent = evalCurrentScoreDisplay.textContent;
      });
      if (evalCurrentScoreDisplay) observer.observe(evalCurrentScoreDisplay, { childList: true });
    }

    document.getElementById("btnOralAccept")?.addEventListener("click", () => {
      const ratings = Object.values(roomTeachersRatings);
      let avg = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 5;
      // تطبيق الحد الأدنى من بطاقة "درع المعلمين" إن وجدت
      if (minRatingVal > 0) avg = Math.max(avg, minRatingVal);
      const rounded = Math.round(avg * 4) / 4;
      let pts = Math.round((rounded / 5) * (q.points || 5));
      if (doublePointsActive) pts *= 2;
      pts += cardBonusPoints;
      const btn = document.getElementById("btnOralAccept");
      if (btn) btn.disabled = true;
      showToast(`✅ تم تسجيل التقييم الشفهي: ${rounded.toFixed(2)} من 5 (+${pts} درجات)`, "fa-microphone");
      activeCardEffect = null;
      advanceToNext(pts, false);
    }, { once: true });

  } else {
    stageInteractiveArea.innerHTML = "";
  }

  // إظهار أو إخفاء شريط تقييم المعلمين الشفهي حسب نوع السؤال
  const oralEvalBar = document.getElementById("liveOralEvaluationBar");
  if (oralEvalBar) {
    if (q.type === "oral") {
      oralEvalBar.classList.remove("hidden");
    } else {
      oralEvalBar.classList.add("hidden");
    }
  }

  // وقت السؤال محدد من الغرفة إن وجد أو 30 ثانية
  const timeLimit = currentLiveRoom?.questionTimer || 30;
  const now = Date.now();
  let qTimerState = currentLiveRoom?.timerState;

  if (!qTimerState || qTimerState.questionIdx !== idx) {
    qTimerState = {
      questionIdx: idx,
      duration: timeLimit,
      startedAt: now,
      endsAt: now + (timeLimit * 1000),
      isFrozen: false,
      noTimeLimit: !!(activeCardEffect?.effect?.noTimeLimit),
      updatedAt: now
    };
    if (currentLiveRoom) {
      currentLiveRoom.timerState = qTimerState;
      if (currentLiveRoom.id && canCurrentUserSolveQuestion()) {
        updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
          timerState: qTimerState,
          lastUpdated: serverTimestamp()
        }).catch(e => console.warn("Init timer sync notice:", e));
      }
    }
  }

  // بطاقة "بلا حد زمني" — إيقاف التايمر كلياً للسؤال
  if (activeCardEffect?.effect?.noTimeLimit) {
    qTimerState.noTimeLimit = true;
    showToast("⏾ بلا حد زمني: لا يوجد عداد للسؤال الحالي!", "fa-microphone");
  }

  syncAndRunLiveTimer(qTimerState, () => {
    // عند انتهاء الوقت: يتم تشغيل انتهاء الوقت كإجابة خاطئة مع إظهار X والخصم والانتقال
    handleStageQuestionTimeout();
  });

  resetOralEvaluation();

  // تمرير تلقائي ذكي لظهور السؤال بوسط الشاشة مباشرة للجميع دون تحريك الأصبع
  bringQuestionCardIntoView(document.querySelector(".stage-question-card"));
}

// انتهاء مسابقة الطالب بالكامل
function finishContestant() {
  clearInterval(liveTimerInterval);
  const finalScore = contestantScore; // حفظ النتيجة النهائية قبل التصفير
  if (currentContestant) {
    recordHonorScore(currentContestant.name, finalScore);
    showToast(`🏆 اكتملت مسابقة المتسابق (${currentContestant.name})! المجموع النهائي: ${finalScore} نقطة`, "fa-trophy", 4000);
  }

  // تصفير نقاط الجلسة بعد الحفظ وقبل عرض لوحة الشرف
  // لمنع الحساب المزدوج: لوحة الشرف كانت تحسب (المحفوظ + الجلسة) + الجلسة = ضعف!
  contestantScore = 0;
  if (stageStudentScore) stageStudentScore.textContent = "0";

  // بعد آخر سؤال لا تظهر البطاقات إطلاقاً — ننتقل للوحة الشرف ثم اختيار طالب جديد
  showHonorBoardModal(true, () => backToStudentSelect(), currentContestant?.name, 0, false);
}

// العودة لاختيار طالب جديد
async function backToStudentSelect() {
  currentContestant = null;
  contestantScore = 0;
  currentQuestionIndex = 0;
  if (currentLiveRoom) {
    currentLiveRoom.phase = "select";
    currentLiveRoom.contestantId = null;
    currentLiveRoom.contestantName = null;
    currentLiveRoom.drawnQuestions = null;
    currentLiveRoom.currentQuestionIdx = 0;
    currentLiveRoom.contestantScore = 0;
    await saveRooms(currentLiveRoom);
  }
  enterPhaseStudentSelect();
}

function addContestantScore(pts) {
  contestantScore = contestantScore + pts;
  if (stageStudentScore) stageStudentScore.textContent = String(contestantScore);
  // مزامنة النقاط مع بيانات الغرفة السحابية لضمان التطابق
  if (currentLiveRoom) currentLiveRoom.contestantScore = contestantScore;

  // تحديث رصيد الطالب التراكمي فورياً في الذاكرة والسحابة ولوحة الشرف لمنع ضياع أي خسارة أو نقاط عند الخروج
  if (currentContestant) {
    const studentUser = participantsCache.find(p => p.name === currentContestant.name || p.id === currentContestant.id);
    const newTotal = Math.max(0, contestantBaseScore + contestantScore);

    if (studentUser) {
      studentUser.totalScore = newTotal;
      saveParticipants();
      syncParticipantToCloud(studentUser);
    }

    // تحديث قائمة لوحة الشرف فورياً
    const exIdx = honorLeaderboardCache.findIndex(x => x.name === currentContestant.name);
    if (exIdx >= 0) {
      honorLeaderboardCache[exIdx].score = newTotal;
      honorLeaderboardCache[exIdx].timestamp = new Date().toISOString();
    } else {
      honorLeaderboardCache.push({ name: currentContestant.name, score: newTotal, timestamp: new Date().toISOString() });
    }
    honorLeaderboardCache.sort((a, b) => b.score - a.score);
    localStorage.setItem("nour_honor_board", JSON.stringify(honorLeaderboardCache));
    syncHonorBoardToCloud();

    if (currentUser && currentUser.name === currentContestant.name) {
      currentUser.totalScore = newTotal;
      localStorage.setItem("active_quran_user", JSON.stringify(currentUser));
      localStorage.setItem("nour_saved_user", JSON.stringify(currentUser));
      const scoreEl = document.getElementById("studentTotalScoreDisplay");
      if (scoreEl) scoreEl.textContent = `${newTotal} نقطة`;
    }

    try { renderAccountsTable(); } catch (e) {}
    try { renderHonorLeaderboardTab(); } catch (e) {}
  }
}

function startQuestionTimer(seconds, onTimeout = null) {
  const now = Date.now();
  const qState = {
    questionIdx: currentQuestionIndex,
    duration: seconds,
    startedAt: now,
    endsAt: now + (seconds * 1000),
    isFrozen: false,
    noTimeLimit: false,
    updatedAt: now
  };
  if (currentLiveRoom) {
    currentLiveRoom.timerState = qState;
  }
  syncAndRunLiveTimer(qState, onTimeout);
}

// --------------------------------------------------------
// التقييم الشفهي للمعلمين مع التقريب لأقرب ربع درجة
// --------------------------------------------------------
function resetOralEvaluation() {
  roomTeachersRatings = {}; // فارغة تماماً حتى يقيم المعلمون
  updateOralAverageUI();
}

function updateOralAverageUI() {
  const ratings = Object.values(roomTeachersRatings);
  const avg = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 5;
  const roundedQuarter = Math.round(avg * 4) / 4;

  if (evalCurrentScoreDisplay) {
    evalCurrentScoreDisplay.textContent = `${roundedQuarter.toFixed(2)} / 5`;
  }
  const avgDisplay = document.getElementById("oralAvgDisplay");
  if (avgDisplay) {
    avgDisplay.textContent = `${roundedQuarter.toFixed(2)} / 5`;
  }
  if (evalProgressFill) {
    const pct = (roundedQuarter / 5) * 100;
    evalProgressFill.style.width = `${pct}%`;
  }
}

document.querySelectorAll(".btn-rate-score").forEach(btn => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll(".btn-rate-score").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const score = parseFloat(btn.getAttribute("data-score"));
    const teacherKey = currentUser ? currentUser.name : "معلم_1";
    roomTeachersRatings[teacherKey] = score;
    updateOralAverageUI();
    showToast(`⭐ تم تسجيل تقييمك: ${score} من 5`, "fa-star");

    if (currentLiveRoom) {
      try {
        const roomRef = doc(db, "live_rooms", currentLiveRoom.id);
        await updateDoc(roomRef, {
          [`oralRatings.${teacherKey}`]: score,
          lastUpdated: serverTimestamp()
        });
      } catch (e) {
        console.warn("Rating cloud sync notice:", e);
      }
    }
  });
});

// نافذة تنبيه استشارة المعلم والمشرف
function showTeacherHelpModal(helperName, contestantName, cardTitle = "استشارة المعلم") {
  const modal = document.getElementById("teacherHelpModal");
  const nameEl = document.getElementById("teacherHelpChosenName");
  const descEl = document.getElementById("teacherHelpDescription");
  const targetEl = document.getElementById("teacherHelpContestantTarget");
  if (!modal) return;

  const isMe = currentUser && (currentUser.name === helperName);
  const isSupervisorUser = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name));
  const isPresenter = currentUser && currentUser.role === "presenter";

  if (nameEl) nameEl.textContent = helperName;
  if (targetEl) targetEl.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> المتسابق المستفيد: <strong>${escapeHtml(contestantName || "المتسابق")}</strong>`;

  if (descEl) {
    if (isMe) {
      descEl.innerHTML = `<span style="color:#16a34a;font-weight:900;font-size:16px;">🌟 أنت المعلم المختار!</span><br>وقع الاختيار عليك لمساعدة الطالب <strong>«${escapeHtml(contestantName)}»</strong> وتوجيهه بالإشارة أو النصيحة المفيدة.`;
    } else if (isPresenter) {
      descEl.innerHTML = `تنبيه على شاشة العارض: المعلم <strong>«${escapeHtml(helperName)}»</strong> يتدخل الآن لتقديم الدعم والتوجيه للمتسابق <strong>«${escapeHtml(contestantName)}»</strong>.`;
    } else if (isSupervisorUser) {
      descEl.innerHTML = `تنبيه المشرف: تم تفعيل مساعدة المعلم <strong>«${escapeHtml(helperName)}»</strong> للمتسابق <strong>«${escapeHtml(contestantName)}»</strong> مع تمديد الوقت بـ +15 ثانية.`;
    } else {
      descEl.innerHTML = `تم اختيار الأستاذ <strong>«${escapeHtml(helperName)}»</strong> عشوائياً لمساعدة المتسابق <strong>«${escapeHtml(contestantName)}»</strong> وتقديم نصيحة توضيحية له.`;
    }
  }

  showFloatingCardPill(`👨‍🏫 مساعدة المعلم: ${helperName}`, "fa-chalkboard-user", "gold");
  try { soundFX.celebrate(); } catch (e) {}
  modal.classList.remove("hidden");
  showToast(`📢 تنبيه بطاقة: تم اختيار الأستاذ (${helperName}) لمساعدة المتسابق (${contestantName})!`, "fa-chalkboard-user", 5000);
}
document.getElementById("btnCloseTeacherHelpModal")?.addEventListener("click", () => {
  document.getElementById("teacherHelpModal")?.classList.add("hidden");
});

// --------------------------------------------------------
// روليت الاختيار العشوائي للأسئلة (3 ثواني)
// --------------------------------------------------------
btnRandomQuestionRoulette?.addEventListener("click", () => {
  if (!rouletteOverlay || !rouletteSlotNumber) return;
  rouletteOverlay.classList.remove("hidden");

  let spinTicks = 0;
  const allQCount = currentQuizData ? currentQuizData.sections.reduce((a, s) => a + (s.questions ? s.questions.length : 0), 0) : 5;

  const spinInterval = setInterval(() => {
    spinTicks++;
    const randomSlot = Math.floor(Math.random() * allQCount) + 1;
    rouletteSlotNumber.textContent = randomSlot;

    if (spinTicks >= 25) { // يستغرق تقريباً 3 ثواني
      clearInterval(spinInterval);
      setTimeout(() => {
        rouletteOverlay.classList.add("hidden");
        loadStageQuestion(randomSlot - 1);
        showToast(`وقع الاختيار العشوائي على السؤال رقم (${randomSlot})!`, "fa-dice");
      }, 600);
    }
  }, 110);
});

// --------------------------------------------------------
// مودال اختيار المتسابق
// --------------------------------------------------------
const pickStudentModal = document.getElementById("pickStudentModal");
const studentPickerSearch = document.getElementById("studentPickerSearch");
const studentsPickListContainer = document.getElementById("studentsPickListContainer");

function openPickStudentModal() {
  renderStudentPickerList();
  pickStudentModal.classList.remove("hidden");
}

btnPickStudentModal?.addEventListener("click", openPickStudentModal);

function renderStudentPickerList() {
  if (!studentsPickListContainer) return;
  const qTerm = studentPickerSearch ? normalizeArabic(studentPickerSearch.value) : "";
  const students = participantsCache.filter(p => p.role === "student" || !p.role);
  const filtered = students.filter(s => !qTerm || normalizeArabic(s.name).includes(qTerm));

  studentsPickListContainer.innerHTML = filtered.map(s => `
    <div class="student-pick-item" data-id="${s.id}" style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1.5px solid var(--border-duo); padding: 10px 14px; border-radius: var(--radius-md); margin-bottom: 8px; cursor: pointer;">
      <div>
        <strong>${s.name}</strong>
        <div style="font-size: 12px; color: #64748b;">${s.school || 'مدرسة نور البيان'} | ${s.grade || 'صف أول'}</div>
      </div>
      <button class="btn-duo-green btn-sm">اختيار</button>
    </div>
  `).join("");

  studentsPickListContainer.querySelectorAll(".student-pick-item").forEach(item => {
    item.addEventListener("click", () => {
      const sId = item.getAttribute("data-id");
      const found = participantsCache.find(p => p.id === sId);
      if (found) {
        currentContestant = found;
        contestantBaseScore = typeof found.totalScore === "number" ? found.totalScore : 0;
        stageStudentName.textContent = found.name;
        stageStudentSchool.innerHTML = `<i class="fa-solid fa-school"></i> ${found.school || '--'}`;
        stageStudentGrade.innerHTML = `<i class="fa-solid fa-layer-group"></i> ${found.grade || '--'}`;
        contestantScore = 0;
        stageStudentScore.textContent = "0";
        if (currentLiveRoom) {
          currentLiveRoom.contestantWallet = [];
          if (currentLiveRoom.id) {
            updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
              contestantWallet: [],
              lastUpdated: serverTimestamp()
            }).catch(() => {});
          }
        }
        updateContestantWalletUI([]);
        pickStudentModal.classList.add("hidden");
        loadStageQuestion(0);
        showToast(`تم تعيين المتسابق: ${found.name}`);
      }
    });
  });
}

studentPickerSearch?.addEventListener("input", renderStudentPickerList);

// زر متسابق آخر — يُنهي الجلسة الحالية ويعود لاختيار طالب جديد
btnNextStudentCycle?.addEventListener("click", () => {
  showInAppConfirm(
    "إنهاء جلسة المتسابق الحالي والانتقال لاختيار متسابق جديد؟",
    async () => {
      clearInterval(liveTimerInterval);
      if (currentContestant) {
        recordHonorScore(currentContestant.name, contestantScore);
        showToast(`✅ تم حفظ نقاط ${currentContestant.name}: ${contestantScore} نقطة`, "fa-check", 2500);
      }
      await backToStudentSelect();
    }
  );
});

// --------------------------------------------------------
// نظام البطاقات التكتيكية الثلاثي الأبعاد الموحد والمتزامن لجميع المشاركين
// + محفظة البطاقات للمتسابق + قسم البطاقات عند المشرف
// --------------------------------------------------------
const tacticalCardsModal = document.getElementById("tacticalCardsModal");
const cards3DRow = document.getElementById("cards3DRow");
const cardsCountdownTimer = document.getElementById("cardsCountdownTimer");
const btnSkipCards = document.getElementById("btnSkipCards");
let cardsTimerInterval = null;

let tacticalCardsCallback = null;

// محفظة البطاقات التكتيكية للمتسابق
const walletTriggerBtn = document.getElementById("contestantCardsWalletTrigger");
const walletModal = document.getElementById("contestantCardsWalletModal");
const btnCloseWalletModal = document.getElementById("btnCloseWalletModal");
const btnDismissWalletModal = document.getElementById("btnDismissWalletModal");

function addCardToContestantWallet(cardId) {
  if (!currentLiveRoom) return;
  if (!Array.isArray(currentLiveRoom.contestantWallet)) {
    currentLiveRoom.contestantWallet = [];
  }
  currentLiveRoom.contestantWallet.push(cardId);
  updateContestantWalletUI();
}

function updateContestantWalletUI(wallet = null) {
  const list = wallet !== null ? wallet : (currentLiveRoom?.contestantWallet || []);
  const badgeEl = document.getElementById("walletBadgeCount");
  const barCountEl = document.getElementById("walletBarCount");
  const triggerEl = document.getElementById("contestantCardsWalletTrigger");

  const count = Array.isArray(list) ? list.length : 0;
  if (badgeEl) badgeEl.textContent = String(count);
  if (barCountEl) barCountEl.textContent = String(count);

  if (triggerEl) {
    const inArena = views.liveArena && !views.liveArena.classList.contains("hidden");
    const inStage = document.getElementById("arenaStage") && !document.getElementById("arenaStage").classList.contains("hidden");
    if (inArena && inStage) {
      triggerEl.classList.remove("hidden");
      if (count > 0) {
        triggerEl.classList.add("has-cards");
      } else {
        triggerEl.classList.remove("has-cards");
      }
    } else {
      triggerEl.classList.add("hidden");
    }
  }

  // إذا كان مودال المحفظة معروضاً، إعادة بنائه
  if (walletModal && !walletModal.classList.contains("hidden")) {
    renderContestantWalletCards();
  }
}

function renderContestantWalletCards() {
  const container = document.getElementById("walletCardsList");
  if (!container) return;
  const walletIds = Array.isArray(currentLiveRoom?.contestantWallet) ? currentLiveRoom.contestantWallet : [];
  const cards = walletIds.map(id => TACTICAL_CARDS.find(c => String(c.id) === String(id))).filter(Boolean);

  const subtitleEl = document.getElementById("walletModalSubtitle");
  if (subtitleEl) {
    const studentName = currentContestant?.name || currentLiveRoom?.contestantName || "المتسابق";
    subtitleEl.textContent = `المتسابق: ${studentName} — لديك (${cards.length}) بطاقة تكتيكية جاهزة للاستخدام في أي سؤال!`;
  }

  if (cards.length === 0) {
    container.innerHTML = `
      <div class="wallet-empty-state">
        <i class="fa-solid fa-wallet"></i>
        <h4>محفظة البطاقات فارغة حالياً</h4>
        <p>تحصل على بطاقات تكتيكية كل 4 أسئلة (أو عند تفعيل المشرف للبطاقات)، وتُحفظ هنا لتستخدمها في أي سؤال تريده بالضغط عليها!</p>
      </div>
    `;
    return;
  }

  const isAllowedToUse = checkIsSolverAllowed(currentLiveRoom);

  container.innerHTML = cards.map(c => `
    <div class="wallet-card-item ${c.type}" data-card-id="${c.id}">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="wallet-card-icon-bubble">
          <i class="fa-solid ${c.icon}"></i>
        </div>
        <span class="wallet-card-tag">${c.type === 'buff' ? 'ميزة إيجابية 🌟' : 'مخاطرة ذكية ⚡'}</span>
      </div>
      <h4 class="wallet-card-title">${c.title}</h4>
      <p class="wallet-card-desc">${c.desc}</p>
      <button class="btn-use-card" data-card-id="${c.id}" ${!isAllowedToUse ? 'disabled style="opacity:0.6;cursor:not-allowed;"' : ''}>
        <i class="fa-solid fa-bolt"></i> ${isAllowedToUse ? 'استخدم هذه البطاقة الآن ⚡' : 'المتسابق/المشرف مخوّل بالاستخدام'}
      </button>
    </div>
  `).join("");

  container.querySelectorAll(".btn-use-card").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const cardId = parseInt(btn.getAttribute("data-card-id"));
      selectCardFromWallet(cardId);
    });
  });
}

// فتح محفظة البطاقات متزامنة للجميع
function openSynchronizedWallet(broadcast = true, openedBy = null) {
  const openerName = openedBy || currentUser?.name || currentContestant?.name || "المشرف";
  renderContestantWalletCards();

  const syncBanner = document.getElementById("walletSyncLiveBanner");
  const syncText = document.getElementById("walletSyncLiveText");
  if (syncBanner && syncText) {
    syncBanner.classList.remove("hidden");
    syncText.innerHTML = `مزامنة حية: قام <strong>${openerName}</strong> بفتح محفظة البطاقات التكتيكية 🎴`;
  }

  walletModal?.classList.remove("hidden");
  try { soundFX.btnClick(); } catch (e) {}

  if (broadcast && currentLiveRoom?.id) {
    updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
      walletSync: {
        isOpen: true,
        openedBy: openerName,
        timestamp: Date.now()
      },
      lastUpdated: serverTimestamp()
    }).catch(err => console.warn("Broadcast wallet open notice:", err));
  }
}

// إغلاق محفظة البطاقات متزامنة للجميع
function closeSynchronizedWallet(broadcast = true, closedBy = null) {
  walletModal?.classList.add("hidden");

  if (broadcast && currentLiveRoom?.id) {
    updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
      walletSync: {
        isOpen: false,
        closedBy: closedBy || currentUser?.name || "المتسابق",
        timestamp: Date.now()
      },
      lastUpdated: serverTimestamp()
    }).catch(err => console.warn("Broadcast wallet close notice:", err));
  }
}

// اختيار بطاقة من المحفظة مع بث فوري وأنيميشن جميل لمدة ثانيتين للجميع
function selectCardFromWallet(cardId) {
  if (!currentLiveRoom || !currentLiveRoom.id) {
    showToast("لا توجد غرفة مسابقة حية نشطة حالياً", "fa-circle-exclamation");
    return;
  }
  if (!checkIsSolverAllowed(currentLiveRoom)) {
    showToast("المتسابق أو المشرف هو المخوّل باستخدام البطاقة", "fa-lock");
    return;
  }
  const card = TACTICAL_CARDS.find(c => String(c.id) === String(cardId));
  if (!card) return;

  const contestantName = currentContestant?.name || currentLiveRoom.contestantName || "المتسابق";
  const chosenByName = currentUser?.name || contestantName;
  const nowTs = Date.now();
  lastSeenCardChosenTimestamp = nowTs;

  // بث اختيار البطاقة فوراً لجميع المشاركين في الغرفة
  updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
    activeCardSelection: {
      cardId: card.id,
      cardTitle: card.title,
      cardIcon: card.icon,
      cardDesc: card.desc,
      cardType: card.type,
      chosenBy: chosenByName,
      contestantName: contestantName,
      timestamp: nowTs
    },
    lastUpdated: serverTimestamp()
  }).catch(err => console.warn("Broadcast card selection:", err));

  // تشغيل أنيميشن الاختيار الجميل لمدة ثانيتين محلياً ثم تفعيل البطاقة
  trigger2SecondCardSelectionShowcase(card, chosenByName, true);
}

// أنيميشن تسليط الضوء والـ 2 ثانية على البطاقة المختارة ثم تفعيلها
function trigger2SecondCardSelectionShowcase(card, chosenBy, isInitiator) {
  // 1. تسليط الضوء على البطاقة المختارة داخل مودال المحفظة إن كان مفتوحاً
  const walletList = document.getElementById("walletCardsList");
  if (walletList) {
    walletList.classList.add("has-selection");
    const cardEl = walletList.querySelector(`.wallet-card-item[data-card-id="${card.id}"]`);
    if (cardEl) {
      cardEl.classList.add("is-selected-highlight");
      const btn = cardEl.querySelector(".btn-use-card");
      if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري التفعيل... (2 ثانية)`;
        btn.disabled = true;
      }
      if (!cardEl.querySelector(".card-selected-ribbon")) {
        const ribbon = document.createElement("div");
        ribbon.className = "card-selected-ribbon";
        ribbon.innerHTML = `<i class="fa-solid fa-sparkles fa-spin"></i> تم اختيار هذه البطاقة بواسطة ${chosenBy || 'المتسابق'}! ✨`;
        cardEl.prepend(ribbon);
      }
    }
  }

  // 2. إظهار غطاء الأنميشن السينمائي الموحد لمدة ثانيتين للجميع
  playCardSelection2SecOverlay(card, chosenBy);

  try { soundFX.btnClick(); } catch(e){}
  try { soundFX.fanfare(); } catch(e){ try { soundFX.correct(); } catch(err){} }

  // 3. الانتظار لمدة ثانيتين بالضبط (2000 مللي ثانية) ثم تفعيل البطاقة وتأثيراتها
  setTimeout(() => {
    // إخفاء غطاء الأنميشن وإغلاق مودال المحفظة
    const overlay = document.getElementById("activeCardAnnouncementOverlay");
    overlay?.classList.add("hidden");
    walletModal?.classList.add("hidden");
    if (walletList) {
      walletList.classList.remove("has-selection");
    }

    // حذف البطاقة من المحفظة محلياً وسحابياً
    const wallet = Array.isArray(currentLiveRoom?.contestantWallet) ? [...currentLiveRoom.contestantWallet] : [];
    const idx = wallet.indexOf(card.id);
    if (idx > -1) wallet.splice(idx, 1);
    if (currentLiveRoom) currentLiveRoom.contestantWallet = wallet;
    updateContestantWalletUI(wallet);

    if (isInitiator && currentLiveRoom?.id) {
      updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
        contestantWallet: wallet,
        walletSync: {
          isOpen: false,
          closedBy: chosenBy,
          timestamp: Date.now()
        },
        activeCardUsed: {
          cardId: card.id,
          usedBy: chosenBy,
          timestamp: Date.now()
        },
        lastUpdated: serverTimestamp()
      }).catch(err => console.warn(err));
    }

    // تفعيل التأثيرات الحقيقية للبطاقة الآن
    executeCardEffect(card, null);
  }, 2000);
}

function playCardSelection2SecOverlay(card, chosenByName) {
  const overlay = document.getElementById("activeCardAnnouncementOverlay");
  const iconEl = document.getElementById("announcementCardIcon");
  const titleEl = document.getElementById("announcementCardTitle");
  const userEl = document.getElementById("announcementUserName");
  const descEl = document.getElementById("announcementCardDesc");
  const fillEl = document.getElementById("cardActivatingTimerFill");
  if (!overlay) return;

  if (iconEl) iconEl.innerHTML = `<i class="fa-solid ${card.icon || 'fa-bolt'}"></i>`;
  if (titleEl) titleEl.textContent = card.title;
  if (userEl) userEl.textContent = chosenByName || "المتسابق";
  if (descEl) descEl.textContent = card.desc;

  if (fillEl) {
    fillEl.style.animation = "none";
    fillEl.offsetHeight; // إعادة تهيئة الأنميشن
    fillEl.style.animation = "shrink2Seconds 2s linear forwards";
  }

  overlay.classList.remove("hidden");
}

function handleSynchronizedCardUsed(cardId, usedBy, contestantName) {
  const card = TACTICAL_CARDS.find(c => String(c.id) === String(cardId));
  if (!card) return;

  if (currentLiveRoom && Array.isArray(currentLiveRoom.contestantWallet)) {
    const idx = currentLiveRoom.contestantWallet.indexOf(cardId);
    if (idx > -1) currentLiveRoom.contestantWallet.splice(idx, 1);
    updateContestantWalletUI(currentLiveRoom.contestantWallet);
  }

  executeCardEffect(card, null);
}

function triggerTacticalCardsModal(onComplete = null, nextQuestionIdx = null) {
  if (!tacticalCardsModal || !cards3DRow) {
    if (typeof onComplete === 'function') onComplete();
    return;
  }
  tacticalCardsCallback = typeof onComplete === 'function' ? onComplete : null;

  // إيقاف مؤقت السؤال تماماً أثناء طور البطاقات
  if (liveTimerInterval) {
    clearInterval(liveTimerInterval);
    liveTimerInterval = null;
    lastTimerConfigKey = "";
  }

  // اختيار 3 بطاقات عشوائية فريدة من بنك الـ 40 بطاقة في cards-data.js
  const selected3 = getRandomTacticalCards(3);
  const targetNextIdx = nextQuestionIdx !== null ? nextQuestionIdx : ((currentLiveRoom?.currentQuestionIdx || 0) + 1);

  // بث الكروت الثلاثة لجميع المشاركين في الغرفة لضمان ظهور نفس البطاقات للجميع
  if (currentLiveRoom?.id) {
    updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
      activeCardsTurn: {
        isOpen: true,
        cards: selected3.map(c => c.id),
        triggeredBy: currentUser?.name || "المتسابق",
        timestamp: Date.now(),
        nextIdx: targetNextIdx
      },
      lastUpdated: serverTimestamp()
    }).catch(err => console.warn("Broadcast tactical cards notice:", err));
  }

  showSynchronizedTacticalCardsModal(selected3.map(c => c.id), targetNextIdx);
}

function showSynchronizedTacticalCardsModal(cardIds, nextIdx = null) {
  if (!tacticalCardsModal || !cards3DRow) return;

  // إيقاف مؤقت السؤال تماماً عند ظهور البطاقات ليكون وقت البطاقات مستقلاً تماماً
  if (liveTimerInterval) {
    clearInterval(liveTimerInterval);
    liveTimerInterval = null;
    lastTimerConfigKey = "";
  }

  const ids = Array.isArray(cardIds) ? cardIds : [];
  let selected3 = ids
    .map(id => TACTICAL_CARDS.find(c => String(c.id) === String(id)))
    .filter(Boolean);

  if (selected3.length === 0) {
    selected3 = getRandomTacticalCards(3);
  }

  const targetNextIdx = nextIdx !== null ? nextIdx : (currentLiveRoom?.activeCardsTurn?.nextIdx ?? ((currentLiveRoom?.currentQuestionIdx || 0) + 1));

  cards3DRow.innerHTML = selected3.map((card, idx) => `
    <div class="card-3d-wrapper" data-card-idx="${idx}" style="animation-delay: ${idx * 0.18}s;">
      <div class="card-3d-inner">
        <!-- الظهر (قبل القلب) -->
        <div class="card-3d-back">
          <div class="card-back-pattern">
            <i class="fa-solid fa-book-quran"></i>
            <span>بطاقة ${idx + 1}</span>
          </div>
        </div>
        <!-- الوجه (بعد القلب) -->
        <div class="card-3d-front">
          <div>
            <div class="card-front-icon"><i class="fa-solid ${card.icon}"></i></div>
            <h4 class="card-front-title">${card.title}</h4>
            <span class="card-front-badge">${card.type === 'buff' ? 'ميزة إيجابية' : 'مخاطرة ذكية'}</span>
          </div>
          <p class="card-front-desc">${card.desc}</p>
        </div>
      </div>
    </div>
  `).join("");

  tacticalCardsModal.classList.remove("hidden");
  try { soundFX.btnClick(); } catch (e) {}

  // قلب البطاقات تباعاً بتأثير ثلاثي الأبعاد جميل
  const wrappers = cards3DRow.querySelectorAll(".card-3d-wrapper");
  wrappers.forEach((w, i) => {
    setTimeout(() => {
      w.classList.add("flipped");
      try { soundFX.btnClick(); } catch (e) {}
    }, 600 + (i * 300));

    w.addEventListener("click", () => {
      // فقط المصرح له بالاختيار يمكنه اختيار البطاقة وتطبيقها للجميع
      if (!currentLiveRoom || checkIsSolverAllowed(currentLiveRoom)) {
        w.style.transform = "scale(1.08)";
        w.style.boxShadow = "0 0 35px #facc15";
        chooseCard(selected3[i], true, targetNextIdx);
      } else {
        showToast("المتسابق أو المشرف هو المخوّل باختيار البطاقة للجميع", "fa-lock");
      }
    });
  });

  // مؤقت الـ 15 ثانية الخاص بالبطاقات فقط (مستقل تماماً عن وقت الأسئلة)
  let cardsTimeLeft = 15;
  if (cardsCountdownTimer) cardsCountdownTimer.textContent = cardsTimeLeft;
  clearInterval(cardsTimerInterval);

  cardsTimerInterval = setInterval(() => {
    cardsTimeLeft--;
    if (cardsCountdownTimer) cardsCountdownTimer.textContent = cardsTimeLeft;
    if (cardsTimeLeft <= 0) {
      clearInterval(cardsTimerInterval);
      if (!currentLiveRoom || checkIsSolverAllowed(currentLiveRoom)) {
        skipTacticalCards(true, targetNextIdx);
      } else {
        tacticalCardsModal.classList.add("hidden");
      }
    }
  }, 1000);
}

function applySynchronizedChosenCard(cardIdOrObj, chosenBy, nextIdx = null) {
  const card = typeof cardIdOrObj === "object" ? cardIdOrObj : TACTICAL_CARDS.find(c => String(c.id) === String(cardIdOrObj));
  if (!card) return;
  clearInterval(cardsTimerInterval);
  tacticalCardsModal?.classList.add("hidden");

  // إضافة البطاقة لمحفظة المتسابق
  addCardToContestantWallet(card.id);
  showToast(`🎉 حصل المتسابق (${chosenBy || 'المتسابق'}) على بطاقة «${card.title}» وأُضيفت للمحفظة! 🃏`, card.icon || "fa-bolt", 4000);

  const targetNextIdx = nextIdx !== null ? nextIdx : (currentLiveRoom?.currentQuestionIdx || 0);
  loadStageQuestion(targetNextIdx);
}

btnTriggerTacticalCards?.addEventListener("click", () => {
  triggerTacticalCardsModal(null, currentLiveRoom?.currentQuestionIdx || 0);
});

function chooseCard(card, broadcast = true, nextIdx = null) {
  clearInterval(cardsTimerInterval);
  tacticalCardsModal.classList.add("hidden");

  const targetNextIdx = nextIdx !== null ? nextIdx : (currentLiveRoom?.activeCardsTurn?.nextIdx ?? (currentLiveRoom?.currentQuestionIdx || 0));

  // إضافة البطاقة لمحفظة المتسابق بدلاً من تفعيلها فوراً
  addCardToContestantWallet(card.id);

  if (broadcast && currentLiveRoom?.id) {
    updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
      activeCardsTurn: {
        isOpen: false,
        chosenCard: card.id,
        chosenBy: currentUser?.name || "المتسابق",
        timestamp: Date.now(),
        nextIdx: targetNextIdx
      },
      contestantWallet: arrayUnion(card.id),
      currentQuestionIdx: targetNextIdx,
      lastUpdated: serverTimestamp()
    }).catch(err => console.warn("Broadcast chosen card notice:", err));
  }

  showToast(`🎉 تم الحصول على بطاقة «${card.title}» وحفظها في محفظة بطاقاتك! 🃏 (يمكنك استخدامها في أي سؤال من زر المحفظة على اليمين)`, card.icon || "fa-bolt", 4500);
  try { soundFX.correct(); } catch (e) {}

  if (tacticalCardsCallback) {
    const cb = tacticalCardsCallback;
    tacticalCardsCallback = null;
    cb();
  } else {
    loadStageQuestion(targetNextIdx);
  }
}

function eliminateMCQWrongOptionsImmediately(count = 2) {
  const allQ = (currentLiveRoom?.drawnQuestions && currentLiveRoom.drawnQuestions.length > 0)
    ? currentLiveRoom.drawnQuestions
    : (currentQuizData?.sections?.flatMap(s => s.questions || []) || []);
  const curQ = allQ[currentQuestionIndex] || {};
  if (curQ.type === "mcq" && curQ.options) {
    const correctIdx = curQ.correct;
    const choiceBtns = stageInteractiveArea.querySelectorAll(".btn-choice-duo:not([disabled])");
    let eliminated = 0;
    for (let i = choiceBtns.length - 1; i >= 0; i--) {
      const btn = choiceBtns[i];
      const cIdx = parseInt(btn.getAttribute("data-choice"));
      if (cIdx !== correctIdx && eliminated < count) {
        btn.disabled = true;
        btn.style.opacity = "0.25";
        btn.style.textDecoration = "line-through";
        btn.style.pointerEvents = "none";
        btn.innerHTML = `<i class="fa-solid fa-ban" style="color:#ef4444;margin-left:6px;"></i> ${btn.textContent}`;
        eliminated++;
      }
    }
  }
}

function executeCardEffect(card, targetNextIdx = null) {
  const eff = card.effect || {};

  // ── تأثيرات فورية وتوليد الشارة العائمة المبهجة ──

  // بطاقة اختيار وتخطي السؤال
  if (eff.skipRemainingQuestion || card.id === 21 || card.id === 29) {
    showFloatingCardPill("تخطي سؤال قادم +3 نقاط ⏭️", "fa-forward-fast", "gold");
    openPreSkipQuestionModal();
    activeCardEffect = null;
    if (tacticalCardsCallback) { const cb = tacticalCardsCallback; tacticalCardsCallback = null; cb(); }
    return;
  }

  // 1. تجميد الوقت
  if (eff.freezeTime) {
    showFloatingCardPill(`تجميد المؤقت ${eff.freezeTime}ث ❄️`, "fa-snowflake", "blue");
    showToast(`❄️ تجميد الوقت: العداد متوقف لـ ${eff.freezeTime} ثانية!`, "fa-snowflake", 3000);
    broadcastTimerModification({ freezeSeconds: eff.freezeTime });
    activeCardEffect = card;
  }

  // 2. إضافة/إنقاص وقت
  else if (eff.timeDelta && eff.timeDelta !== 0) {
    const sign = eff.timeDelta > 0 ? "+" : "";
    showFloatingCardPill(`${sign}${eff.timeDelta} ثانية ⏱️`, eff.timeDelta > 0 ? "fa-hourglass-start" : "fa-bolt", eff.timeDelta > 0 ? "green" : "red");
    showToast(`⏱️ ${sign}${eff.timeDelta} ثانية على الوقت!`, eff.timeDelta > 0 ? "fa-hourglass-start" : "fa-bolt", 2500);
    broadcastTimerModification({ deltaSeconds: eff.timeDelta });
    activeCardEffect = card;
  }

  // 3. تخطي السؤال بأمان
  else if (eff.passQuestion) {
    showFloatingCardPill("تخطي السؤال بأمان ⏭️", "fa-forward", "blue");
    showToast("⏭️ تخطي السؤال: انتقال بدون درجات!", "fa-forward", 2500);
    activeCardEffect = null;
    if (typeof tacticalCardsCallback === "function") {
      tacticalCardsCallback = null;
    }
    const allQ = currentLiveRoom?.drawnQuestions || [];
    const nextIdx = (currentLiveRoom?.currentQuestionIdx || 0) + 1;
    if (nextIdx >= allQ.length) {
      finishContestant();
    } else {
      if (currentLiveRoom) currentLiveRoom.currentQuestionIdx = nextIdx;
      showHonorBoardModal(false, () => loadStageQuestion(nextIdx), currentContestant?.name, 0, false);
    }
    return;
  }

  // 4. نقاط ذهبية فورية: +7 نقاط
  else if (eff.bonus7Points) {
    addContestantScore(7);
    showFloatingCardPill("+7 نقاط ذهبية 💎", "fa-gem", "gold");
    showToast("💎 قلب الموازين: +7 نقاط ذهبية فورية!", "fa-gem", 3000);
    activeCardEffect = null;
    if (tacticalCardsCallback) { const cb = tacticalCardsCallback; tacticalCardsCallback = null; cb(); }
    return;
  }

  // 5. وسام الشرف: +1 نقطة شرف
  else if (eff.honorBadge) {
    addContestantScore(1);
    showFloatingCardPill("+1 نقطة شرف 🏅", "fa-award", "gold");
    showToast("🏅 وسام الشرف: +1 نقطة شرف فورية!", "fa-award", 3000);
    activeCardEffect = null;
    if (tacticalCardsCallback) { const cb = tacticalCardsCallback; tacticalCardsCallback = null; cb(); }
    return;
  }

  // 6. إعادة وقت السؤال: يُعيد ضبط العداد من البداية
  else if (eff.resetQuestionTimer) {
    showFloatingCardPill(`إعادة شحن المؤقت 🔋`, "fa-battery-full", "green");
    showToast("🔋 طاقة العزيمة: تمت إعادة ضبط وقت السؤال!", "fa-battery-full", 3000);
    activeCardEffect = null;
    broadcastTimerModification({ reset: true });
    if (tacticalCardsCallback) { const cb = tacticalCardsCallback; tacticalCardsCallback = null; cb(); }
    return;
  }

  // 7. نصف الوقت + نقاط مكافأة (مخاطرة ذكية)
  else if (eff.halfTime) {
    const currentRem = Math.max(6, liveTimeRemaining);
    const delta = -Math.floor(currentRem / 2);
    broadcastTimerModification({ deltaSeconds: delta });
    showFloatingCardPill(`نصف الوقت مضاعف النقاط ⚡`, "fa-medal", "gold");
    showToast(`⚡ تحدي الفارس: الوقت نُصِّف! لكن الإجابة الصحيحة +${eff.pointsBonus||3} نقاط إضافية`, "fa-medal", 3500);
    activeCardEffect = card;
  }

  // 8. استشارة المعلم أو مساعدة الزميل
  else if (eff.teacherHelp || eff.peerHelp || eff.adaptiveQuestion) {
    broadcastTimerModification({ deltaSeconds: 15 });

    const roomUsers = Array.isArray(currentLiveRoom?.users) ? currentLiveRoom.users : [];
    const teacherCandidates = roomUsers.filter(u => {
      const p = participantsCache.find(x => x.name === u);
      return p && (p.role === "teacher" || p.role === "supervisor" || isSupervisor(u));
    });
    const fallbackTeachers = participantsCache.filter(p => p.role === "teacher" || p.role === "supervisor" || isSupervisor(p.name)).map(t => t.name);
    const pool = teacherCandidates.length > 0 ? teacherCandidates : (fallbackTeachers.length > 0 ? fallbackTeachers : [MASTER_SUPERVISOR_NAME]);
    const chosenHelper = pool[Math.floor(Math.random() * pool.length)];
    const studentName = currentContestant ? currentContestant.name : (currentUser ? currentUser.name : "المتسابق");

    showTeacherHelpModal(chosenHelper, studentName, card.title);

    if (currentLiveRoom) {
      updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
        activeTeacherHelp: {
          helperName: chosenHelper,
          contestantName: studentName,
          cardTitle: card.title,
          timestamp: Date.now()
        },
        lastUpdated: serverTimestamp()
      }).catch(() => {});
    }
    card.helperName = chosenHelper;
    activeCardEffect = card;
  }

  // 9. استبدال السؤال الحالي (Swap Question)
  else if (eff.swapQuestion) {
    showFloatingCardPill("استبدال السؤال بسؤال بديل 🔄", "fa-arrows-rotate", "blue");
    const allQuizQuestions = [];
    (currentQuizData?.sections || []).forEach(s => {
      (s.questions || []).forEach(q => allQuizQuestions.push({ ...q, sectionName: s.sectionName }));
    });
    if (allQuizQuestions.length > 1) {
      const otherQuestions = allQuizQuestions.filter(q => q.text !== stageQuestionText?.textContent);
      if (otherQuestions.length > 0) {
        const replacement = otherQuestions[Math.floor(Math.random() * otherQuestions.length)];
        const drawn = currentLiveRoom?.drawnQuestions || [];
        if (drawn[currentQuestionIndex]) {
          drawn[currentQuestionIndex] = replacement;
          currentLiveRoom.drawnQuestions = drawn;
          saveRooms(currentLiveRoom);
        }
        showToast("🔄 تم استبدال السؤال الحالي بسؤال بديل من بنك الأسئلة!", "fa-arrows-rotate", 3000);
      }
    }
  }

  // 10. رصيد وقت بنكي إضافي (+15 ثانية)
  else if (eff.totalBankTime) {
    broadcastTimerModification({ deltaSeconds: eff.totalBankTime });
    showFloatingCardPill(`+${eff.totalBankTime} ثانية بنكية ⏳`, "fa-clock-rotate-left", "green");
    showToast(`⏱️ التأني والسلامة: +${eff.totalBankTime} ثانية إضافية للوقت!`, "fa-clock-rotate-left", 3000);
  }

  // 11. تعزيز مركز الشرف
  else if (eff.rankBoost) {
    if (currentContestant) {
      recordHonorScore(currentContestant.name, 5);
      showFloatingCardPill("+5 نقاط شرف فورية 🚀", "fa-arrow-up-right-dots", "gold");
      showToast("🚀 مضاعف الشرف: +5 نقاط شرف فورية للمتسابق!", "fa-arrow-up-right-dots", 3000);
    }
  }

  // 12. حذف خيارات MCQ فورياً
  else if (eff.eliminateOptions) {
    showFloatingCardPill(`حذف خيارات خاطئة 🎯`, "fa-filter", "blue");
    activeCardEffect = card;
    eliminateMCQWrongOptionsImmediately(eff.eliminateOptions);
  }

  // 13. باقي التأثيرات
  else {
    activeCardEffect = card;
    if (eff.doublePoints) {
      showFloatingCardPill(`مضاعفة النقاط x2 ⭐`, "fa-angles-up", "gold");
    } else if (eff.immunity) {
      showFloatingCardPill(`درع الحماية مفعّل 🛡️`, "fa-shield-halved", "blue");
    } else if (eff.secondChance) {
      showFloatingCardPill(`فرصة ثانية عند الخطأ 🔁`, "fa-rotate-right", "green");
    } else if (eff.coloredHarakat) {
      showFloatingCardPill(`ألوان الترتيل والتجويد 🎨`, "fa-palette", "gold");
    } else if (eff.showRuleHint || eff.hint) {
      showFloatingCardPill(`تلميح مضيء للقاعدة 💡`, "fa-lightbulb", "gold");
    } else if (eff.forgivingTajweed) {
      showFloatingCardPill(`رخصة التيسير والتجاوز ✨`, "fa-heart", "green");
    } else if (eff.zoomScript) {
      showFloatingCardPill(`تكبير الخط القرآني 🔍`, "fa-magnifying-glass-plus", "blue");
      if (stageQuestionText) stageQuestionText.style.fontSize = "34px";
    } else if (eff.lockTwoItems) {
      showFloatingCardPill(`حصانة تثبيت عنصرين 🔒`, "fa-lock", "gold");
    } else if (eff.autoMatchOne) {
      showFloatingCardPill(`توصيل الحكمة التلقائي ⚡`, "fa-link", "green");
    } else if (eff.speedBonusUnder5s) {
      showFloatingCardPill(`مكافأة السرعة الخارقة ⚡`, "fa-forward-fast", "gold");
    } else {
      showFloatingCardPill(`تفعيل «${card.title}» ✨`, card.icon || "fa-bolt", card.type === 'buff' ? "green" : "gold");
    }
  }

  showToast(`✨ تم تفعيل بطاقة: «${card.title}»!`, card.icon, 3000);

  if (tacticalCardsCallback) {
    const cb = tacticalCardsCallback;
    tacticalCardsCallback = null;
    cb();
  } else if (targetNextIdx !== null && targetNextIdx !== undefined) {
    loadStageQuestion(targetNextIdx);
  }
}

function skipTacticalCards(broadcast = true, nextIdx = null) {
  clearInterval(cardsTimerInterval);
  tacticalCardsModal.classList.add("hidden");
  broadcastTimerModification({ deltaSeconds: 15 });
  showToast("تم تخطي البطاقات وإضافة +15 ثانية لوقت السؤال!", "fa-hourglass-start");

  const targetNextIdx = nextIdx !== null ? nextIdx : (currentLiveRoom?.activeCardsTurn?.nextIdx ?? (currentLiveRoom?.currentQuestionIdx || 0));

  if (broadcast && currentLiveRoom?.id) {
    updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
      activeCardsTurn: {
        isOpen: false,
        skipped: true,
        chosenBy: currentUser?.name || "المتسابق",
        timestamp: Date.now(),
        nextIdx: targetNextIdx
      },
      currentQuestionIdx: targetNextIdx,
      lastUpdated: serverTimestamp()
    }).catch(err => console.warn("Broadcast skip cards notice:", err));
  }

  if (tacticalCardsCallback) {
    const cb = tacticalCardsCallback;
    tacticalCardsCallback = null;
    cb();
  } else {
    loadStageQuestion(targetNextIdx);
  }
}

btnSkipCards?.addEventListener("click", () => {
  if (!currentLiveRoom || checkIsSolverAllowed(currentLiveRoom)) {
    skipTacticalCards(true);
  } else {
    showToast("المتسابق أو المشرف هو المخوّل بتخطي البطاقات", "fa-lock");
  }
});

// أحداث محفظة البطاقات التكتيكية المتزامنة
walletTriggerBtn?.addEventListener("click", () => {
  openSynchronizedWallet(true);
});

const btnOpenWalletFromBar = document.getElementById("btnOpenWalletFromBar");
btnOpenWalletFromBar?.addEventListener("click", () => {
  openSynchronizedWallet(true);
});

btnCloseWalletModal?.addEventListener("click", () => {
  closeSynchronizedWallet(true);
});

btnDismissWalletModal?.addEventListener("click", () => {
  closeSynchronizedWallet(true);
});

// ========================================================
// قسم البطاقات التكتيكية الكامل عند المشرف (دليل الـ 40 بطاقة)
// ========================================================
function getCardMechanicsExplanation(card) {
  const eff = card.effect || {};
  if (eff.eliminateOptions) {
    return "حذف خيارين خاطئين: عند استخدامها في سؤال اختيار من متعدد، يقوم النظام فوراً بحذف خيارين غير صحيحين وشطبهما، ليتبقى للمتسابق خياران فقط أحدهما هو الإجابة الصحيحة بنسبة صواب 50%!";
  }
  if (eff.freezeTime) {
    return "تجميد الوقت: يوقف عداد السؤال تماماً لمدة 10 ثوانٍ، مانحاً المتسابق فرصة ذهبية للتفكير والقراءة بتركيز دون أن ينقص الوقت ثانية واحدة!";
  }
  if (eff.timeDelta && eff.timeDelta > 0) {
    return `زيادة الوقت (+${eff.timeDelta}ث): يضيف ثوانٍ إضافية فورية لعداد السؤال الحالي، مما يتيح التروي والتأكد من مخرج الحرف أو الحكم.`;
  }
  if (eff.timeDelta && eff.timeDelta < 0) {
    return `مخاطرة السرعة: ينقص ${Math.abs(eff.timeDelta)} ثوانٍ من المؤقت ولكنه يمنح بونص +${eff.pointsBonus||2} درجات إضافية عند الصواب!`;
  }
  if (eff.penaltyOnWrong) {
    return "المخاطرة الكبرى: إجابة صحيحة تمنح الدرجة كاملة، لكن أي خطأ يخصم 3 درجات من رصيد المتسابق.";
  }
  if (eff.immunity) {
    return "درع الأمان (الحصانة): يحمي المتسابق حماية كاملة من أي خصم درجات في حال أخطأ أو انتهى الوقت في السؤال الحالي.";
  }
  if (eff.teacherHelp || eff.peerHelp) {
    return "استشارة المعلم: يفتح نافذة توجيه لمعلم أو مشرف حاضر في الغرفة لإعطاء نصيحة وتوجيه توضيحي، مع تمديد العداد بـ +15 ثانية إضافية.";
  }
  if (eff.doublePoints) {
    return "السؤال الذهبي: يضاعف درجات السؤال الحالي مرتين (10 درجات بدلاً من 5) فور الإجابة الصحيحة والمتقنة!";
  }
  if (eff.swapQuestion) {
    return "استبدال السؤال: يسحب سؤالاً بديلاً من بنك الأسئلة فوراً ويستبدل به السؤال الحالي المعروض على المسرح.";
  }
  if (eff.oralBonus) {
    return "نجمة التلاوة: تضيف +1 درجة فورية إضافية فوق تقييم المعلمين الشفهي للسؤال الحالي.";
  }
  if (eff.hint || eff.showRuleHint) {
    return "عين الصواب ونور البيان: يظهر شريطاً إرشادياً ذكياً يوضح حكم التجويد أو مخرج الحرف المتصل بالسؤال قبل الإجابة.";
  }
  if (eff.halfTime) {
    return "تحدي الأبطال: ينصف وقت السؤال لكن الإجابة الصحيحة تمنح +3 نقاط إضافية على الفور.";
  }
  if (eff.secondChance) {
    return "فرصة ثانية: إذا أخطأ الطالب في الإجابة، يُعطى فرصة ثانية فورية دون تسجيل خطأ أو خصم!";
  }
  if (eff.lockTwoItems) {
    return "حصانة الترتيب: في أسئلة الترتيب، يثبت أول عنصرين في موقعهما الصحيح تلقائياً.";
  }
  if (eff.autoMatchOne) {
    return "توصيل الحكمة: في أسئلة التوصيل والمطابقة، يربط زوجين متطابقين صحيحين تلقائياً.";
  }
  if (eff.passQuestion) {
    return "تخطي السؤال بأمان: يسمح بتجاوز السؤال الصعب دون أي خسارة درجات والانتقال للسؤال التالي.";
  }
  if (eff.noTimeLimit) {
    return "صوت الواثق: يلغي المؤقت تماماً للسؤال الحالي، فيقرأ الطالب بارتياح تام دون ضغط زمني.";
  }
  if (eff.bonus7Points) {
    return "قلب الموازين: يمنح +7 درجات ذهبية فورية تضاف مباشرة لمجموع نقاط المتسابق.";
  }
  if (eff.totalBankTime) {
    return `رصيد بنكي إضافي: يمنح +${eff.totalBankTime} ثانية إضافية للوقت فوراً.`;
  }
  if (eff.rankBoost) {
    return "مضاعف الشرف: يضيف +5 نقاط فورية في لوحة الشرف التراكمية للمتسابق.";
  }
  if (eff.forgivingTajweed) {
    return "حزام الأمان التجويدي: يتسامح مع خطأ تجويدي واحد ولا يحتسب خصماً عليه.";
  }
  if (eff.speedBonusUnder5s) {
    return "مكافأة السرعة: يمنح +3 نقاط فورية إذا أجاب المتسابق في أقل من 5 ثوانٍ.";
  }
  if (eff.zoomScript) {
    return "تكبير الخط القرآني: يكبّر حجم الآية والكلمة بنسبة 150% لإتاحة رؤية واضحة ومريحة.";
  }
  if (eff.resetQuestionTimer) {
    return "إعادة شحن المؤقت: يعيد ضبط عداد السؤال من بدايته (30 ثانية) إذا كاد الوقت ينفد.";
  }
  if (eff.honorBadge) {
    return "وسام الشرف: يضيف +1 نقطة شرف فورية لرصيد المتسابق النهائي.";
  }
  return "ميزة تكتيكية تفاعلية تؤثر بشكل إيجابي ومباشر على مجريات المسابقة ونقاط المتسابق.";
}

function renderSupervisorCardsCatalog(activeFilter = "all", searchQuery = "") {
  const grid = document.getElementById("cardsCatalogGrid");
  if (!grid) return;

  const query = (searchQuery || "").trim().toLowerCase();

  const filtered = TACTICAL_CARDS.filter(card => {
    // فلتر الفئة
    if (activeFilter === "buff" && card.type !== "buff") return false;
    if (activeFilter === "risk" && card.type !== "risk") return false;
    if (activeFilter === "timer" && !(card.effect?.timeDelta || card.effect?.freezeTime || card.effect?.resetQuestionTimer || card.effect?.noTimeLimit || card.effect?.totalBankTime || card.effect?.halfTime)) return false;
    if (activeFilter === "score" && !(card.effect?.pointsBonus || card.effect?.doublePoints || card.effect?.bonus7Points || card.effect?.rankBoost || card.effect?.honorBadge || card.effect?.oralBonus)) return false;
    if (activeFilter === "help" && !(card.effect?.teacherHelp || card.effect?.peerHelp || card.effect?.hint || card.effect?.showRuleHint || card.effect?.secondChance || card.effect?.eliminateOptions)) return false;

    // بحث النص
    if (query) {
      const matchTitle = (card.title || "").toLowerCase().includes(query);
      const matchDesc = (card.desc || "").toLowerCase().includes(query);
      const matchId = String(card.id) === query;
      return matchTitle || matchDesc || matchId;
    }
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #64748b;">
        <i class="fa-solid fa-search" style="font-size: 38px; color: #cbd5e1; margin-bottom: 12px;"></i>
        <h4>لا توجد بطاقات تطابق البحث أو الفلتر المحدد</h4>
        <p>جرب كتابة اسم مختلف أو اختر فلتر «الكل (40)» لعرض كافة البطاقات.</p>
      </div>
    `;
    return;
  }

  const hasLiveRoom = !!(currentLiveRoom && currentLiveRoom.id && (currentContestant || currentLiveRoom.contestantName));

  grid.innerHTML = filtered.map(card => {
    const mechanicsText = getCardMechanicsExplanation(card);
    return `
      <div class="catalog-card-item ${card.type}">
        <div>
          <div class="catalog-card-top-row">
            <span class="catalog-card-id-pill">#${card.id}</span>
            <div class="catalog-card-icon-box">
              <i class="fa-solid ${card.icon}"></i>
            </div>
            <span class="wallet-card-tag">${card.type === 'buff' ? 'ميزة إيجابية 🌟' : 'مخاطرة ذكية ⚡'}</span>
          </div>

          <h3 class="catalog-card-title">${card.title}</h3>
          <p class="catalog-card-desc">${card.desc}</p>

          <div class="catalog-card-mechanics-box">
            <div class="catalog-card-mechanics-title">
              <i class="fa-solid fa-circle-info" style="color:#6d28d9;"></i>
              <span>ماذا تفعل هذه البطاقة بالتفصيل؟</span>
            </div>
            <p class="catalog-card-mechanics-text">${mechanicsText}</p>
          </div>
        </div>

        <button class="catalog-card-grant-btn" data-card-id="${card.id}" ${!hasLiveRoom ? 'disabled title="يتطلب وجود غرفة حية مع متسابق نشط لمنح البطاقة"' : ''}>
          <i class="fa-solid fa-gift"></i> ${hasLiveRoom ? 'منح البطاقة لمحفظة المتسابق الحالي 🎁' : 'منح للمتسابق (يلزم غرفة نشطة)'}
        </button>
      </div>
    `;
  }).join("");

  // أحداث زر المنح السريع للمشرف
  grid.querySelectorAll(".catalog-card-grant-btn:not([disabled])").forEach(btn => {
    btn.addEventListener("click", () => {
      const cId = parseInt(btn.getAttribute("data-card-id"));
      const targetCard = TACTICAL_CARDS.find(c => c.id === cId);
      if (!targetCard) return;

      if (!currentLiveRoom || !currentLiveRoom.id) {
        showToast("يرجى فتح غرفة مسابقة حية أولاً لمنح البطاقة للمتسابق", "fa-info-circle");
        return;
      }

      addCardToContestantWallet(targetCard.id);
      updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
        contestantWallet: arrayUnion(targetCard.id),
        lastUpdated: serverTimestamp()
      }).catch(err => console.warn("Grant card error:", err));

      showToast(`🎁 قام المشرف بمنح بطاقة «${targetCard.title}» لمحفظة المتسابق!`, targetCard.icon, 3500);
    });
  });
}

// أحداث فلاتر وبحث قسم البطاقات عند المشرف
let currentCatalogFilter = "all";
document.querySelectorAll(".catalog-filters-row .filter-pill-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".catalog-filters-row .filter-pill-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentCatalogFilter = btn.getAttribute("data-filter") || "all";
    const searchVal = document.getElementById("catalogCardSearchInput")?.value || "";
    renderSupervisorCardsCatalog(currentCatalogFilter, searchVal);
  });
});

document.getElementById("catalogCardSearchInput")?.addEventListener("input", (e) => {
  renderSupervisorCardsCatalog(currentCatalogFilter, e.target.value);
});

// --------------------------------------------------------
// لوحة الشرف (Honor Board - 3 ثواني)
// --------------------------------------------------------
const honorBoardModal = document.getElementById("honorBoardModal");
const honorPodiumList = document.getElementById("honorPodiumList");
const honorCountdownSec = document.getElementById("honorCountdownSec");
let honorLeaderboardCache = [];

function recordHonorScore(studentName, sessionFinalScore) {
  if (!studentName || sessionFinalScore === undefined) return;

  // إضافة نقاط الجلسة (sessionFinalScore) إلى رصيد الطالب المحفوظ
  const studentUser = participantsCache.find(p => p.name === studentName);
  const currentSaved = (studentUser && typeof studentUser.totalScore === "number")
    ? studentUser.totalScore
    : (() => {
        const entry = honorLeaderboardCache.find(x => x.name === studentName);
        return entry ? entry.score : 0;
      })();

  const base = (typeof contestantBaseScore === "number" && contestantBaseScore > 0) ? contestantBaseScore : currentSaved;
  const newTotal = Math.max(0, base + sessionFinalScore);

  // 1. تحديث قائمة لوحة الشرف
  const existingIdx = honorLeaderboardCache.findIndex(x => x.name === studentName);
  if (existingIdx >= 0) {
    honorLeaderboardCache[existingIdx].score = newTotal;
    honorLeaderboardCache[existingIdx].timestamp = new Date().toISOString();
  } else {
    honorLeaderboardCache.push({ name: studentName, score: newTotal, timestamp: new Date().toISOString() });
  }

  // ترتيب تنازلي
  honorLeaderboardCache.sort((a, b) => b.score - a.score);
  localStorage.setItem("nour_honor_board", JSON.stringify(honorLeaderboardCache));
  syncHonorBoardToCloud();

  // 2. تحديث وحفظ نقاط الطالب في حسابه الدائم سحابياً
  if (studentUser) {
    studentUser.totalScore = newTotal;
    saveParticipants();
    syncParticipantToCloud(studentUser);
  }

  if (currentUser && currentUser.name === studentName) {
    currentUser.totalScore = newTotal;
    localStorage.setItem("active_quran_user", JSON.stringify(currentUser));
    localStorage.setItem("nour_saved_user", JSON.stringify(currentUser));
    const scoreEl = document.getElementById("studentTotalScoreDisplay");
    if (scoreEl) scoreEl.textContent = `${newTotal} نقطة`;
  }

  // 3. تحديث لوحة الشرف التفاعلية للجميع
  renderHonorLeaderboardTab();
}

function showHonorBoardModal(openNextStudentAfter = false, onDone = null, highlightStudentName = null, scoreDelta = 0, isPenalty = false) {
  if (!honorBoardModal || !honorPodiumList) {
    if (typeof onDone === 'function') onDone();
    return;
  }

  // حساب النقاط السابقة والنهائية للمتسابق الحالي بدقة
  let currentTargetScore = 0;
  let previousTargetScore = 0;
  if (highlightStudentName) {
    const existingEntry = honorLeaderboardCache.find(x => x.name === highlightStudentName);
    const studentUser = participantsCache.find(p => p.name === highlightStudentName);
    const base = (studentUser && typeof studentUser.totalScore === "number") ? studentUser.totalScore : (existingEntry ? existingEntry.score : 0);
    currentTargetScore = (typeof contestantScore === "number") ? (base + contestantScore) : (existingEntry ? existingEntry.score : 0);
    previousTargetScore = Math.max(0, currentTargetScore - scoreDelta);
  }

  // 1. قائمة الترتيب الأولية (قبل احتساب نقاط هذا السؤال لتنفيذ أنيميشن الصعود والتجاوز)
  let initialList = honorLeaderboardCache.map(x => ({ ...x }));
  if (highlightStudentName) {
    const exIdx = initialList.findIndex(x => x.name === highlightStudentName);
    if (exIdx >= 0) {
      initialList[exIdx].score = previousTargetScore;
    } else {
      initialList.push({ name: highlightStudentName, score: previousTargetScore });
    }
  }
  initialList.sort((a, b) => b.score - a.score);

  // 2. قائمة الترتيب النهائية (بعد إضافة/خصم النقاط)
  let finalList = honorLeaderboardCache.map(x => ({ ...x }));
  if (highlightStudentName) {
    const exIdx = finalList.findIndex(x => x.name === highlightStudentName);
    if (exIdx >= 0) {
      finalList[exIdx].score = currentTargetScore;
    } else {
      finalList.push({ name: highlightStudentName, score: currentTargetScore });
    }
  }
  finalList.sort((a, b) => b.score - a.score);

  const initialRank = highlightStudentName ? (initialList.findIndex(x => x.name === highlightStudentName) + 1) : 0;
  const finalRank = highlightStudentName ? (finalList.findIndex(x => x.name === highlightStudentName) + 1) : 0;
  const didClimb = (scoreDelta > 0 && finalRank > 0 && initialRank > 0 && finalRank < initialRank);
  const overtakenCount = didClimb ? (initialRank - finalRank) : 0;

  // رسم صفوف لوحة الشرف
  function renderPodiumRows(listToRender, scoreToShowTarget, isRolling = false, showBadge = true) {
    if (listToRender.length === 0) {
      honorPodiumList.innerHTML = `
        <div style="text-align: center; padding: 25px 15px; color: #64748b;">
          <i class="fa-solid fa-trophy" style="font-size: 38px; color: #facc15; margin-bottom: 10px; display: block;"></i>
          <p style="font-weight: 700; font-size: 15px;">لا توجد نتائج مسجلة في لوحة الشرف بعد.</p>
        </div>
      `;
      return;
    }

    honorPodiumList.innerHTML = listToRender.slice(0, 8).map((item, idx) => {
      const isTarget = highlightStudentName && item.name === highlightStudentName;
      const scoreVal = isTarget ? scoreToShowTarget : item.score;
      let badgeHtml = "";
      if (isTarget && showBadge && scoreDelta !== 0) {
        badgeHtml = isPenalty
          ? `<span class="score-delta-popup penalty">${scoreDelta}</span>`
          : `<span class="score-delta-popup bonus">+${scoreDelta}</span>`;
      }
      return `
        <div class="honor-rank-card ${idx === 0 ? 'rank-1' : ''} ${isTarget ? 'highlight-student' : ''}" 
             data-student-name="${escapeHtml(item.name)}" 
             id="honorCard_${idx}">
          <span class="honor-rank-num">#${idx + 1}</span>
          <span class="honor-student-name">
            ${escapeHtml(item.name)}
            ${isTarget ? ' <i class="fa-solid fa-star" style="color:#eab308;font-size:14px;"></i>' : ''}
          </span>
          <div style="display:flex;align-items:center;">
            ${badgeHtml}
            <span class="honor-score-val ${isTarget && isRolling ? 'honor-score-rolling' : ''}" id="${isTarget ? 'activeStudentHonorScore' : ''}">
              ${scoreVal} نقطة
            </span>
          </div>
        </div>
      `;
    }).join("");
  }

  // عرض القائمة المبدئية
  renderPodiumRows(initialList, previousTargetScore, false, true);

  const honorBoxEl = honorBoardModal.querySelector(".honor-box") || honorBoardModal.querySelector(".duo-modal-box");
  if (honorBoxEl) {
    honorBoxEl.classList.remove("honor-board-exit");
    honorBoxEl.classList.add("honor-board-entrance");
  }

  honorBoardModal.classList.remove("hidden");
  try { soundFX.btnClick(); } catch (e) {}

  // ── 1. أنيميشن عداد الأرقام السريع مثل آلات السلوت ──
  if (highlightStudentName && scoreDelta !== 0) {
    const scoreValEl = document.getElementById("activeStudentHonorScore");
    if (scoreValEl) {
      scoreValEl.classList.add("honor-score-rolling");
      const duration = 750;
      const startTime = performance.now();
      const startNum = previousTargetScore;
      const endNum = currentTargetScore;

      function updateCounter(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const easeVal = 1 - (1 - progress) * (1 - progress);
        const currentNum = Math.round(startNum + (endNum - startNum) * easeVal);
        if (scoreValEl) {
          scoreValEl.textContent = `${currentNum} نقطة`;
        }
        if (progress < 1) {
          try { soundFX.btnClick(); } catch (e) {}
          requestAnimationFrame(updateCounter);
        } else {
          scoreValEl.classList.remove("honor-score-rolling");
          scoreValEl.textContent = `${endNum} نقطة`;
          if (scoreDelta > 0) {
            try { soundFX.celebrate(); } catch (e) {}
          }

          // ── 2. أنيميشن الصعود والتجاوز السلس فوق المنافسين (FLIP Animation) ──
          if (didClimb) {
            setTimeout(() => {
              executeOvertakeAnimation(overtakenCount, finalRank);
            }, 260);
          }
        }
      }

      setTimeout(() => {
        requestAnimationFrame(updateCounter);
      }, 200);
    }
  }

  function executeOvertakeAnimation(climbCount, newRank) {
    const cardsBefore = Array.from(honorPodiumList.querySelectorAll(".honor-rank-card"));
    const rectsBefore = new Map();
    cardsBefore.forEach(card => {
      const name = card.getAttribute("data-student-name");
      if (name) rectsBefore.set(name, card.getBoundingClientRect());
    });

    renderPodiumRows(finalList, currentTargetScore, false, false);

    const cardsAfter = Array.from(honorPodiumList.querySelectorAll(".honor-rank-card"));
    cardsAfter.forEach(card => {
      const name = card.getAttribute("data-student-name");
      if (!name || !rectsBefore.has(name)) return;
      const beforeRect = rectsBefore.get(name);
      const afterRect = card.getBoundingClientRect();
      const deltaY = beforeRect.top - afterRect.top;

      if (deltaY !== 0) {
        card.style.transform = `translateY(${deltaY}px)`;
        card.style.transition = 'none';

        requestAnimationFrame(() => {
          card.style.transition = 'transform 0.75s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease';
          card.style.transform = 'translateY(0)';

          if (name === highlightStudentName) {
            card.classList.add("is-climbing-up");
            try { soundFX.celebrate(); } catch (e) {}
          } else {
            card.classList.add("is-falling-down");
          }
        });
      }
    });

    showToast(`🚀 تقدم مذهل! المتسابق (${highlightStudentName}) تجاوز ${climbCount} ${climbCount === 1 ? 'منافس' : 'منافسين'} وصعد للمركز #${newRank}!`, "fa-rocket", 3500);
  }

  if (honorCountdownInterval) {
    clearInterval(honorCountdownInterval);
    honorCountdownInterval = null;
  }
  let isHonorDismissing = false;

  function dismissHonorModal() {
    if (isHonorDismissing) return;
    isHonorDismissing = true;
    if (honorCountdownInterval) {
      clearInterval(honorCountdownInterval);
      honorCountdownInterval = null;
    }
    if (honorBoxEl) {
      honorBoxEl.classList.remove("honor-board-entrance");
      honorBoxEl.classList.add("honor-board-exit");
    }
    setTimeout(() => {
      honorBoardModal.classList.add("hidden");
      if (honorBoxEl) honorBoxEl.classList.remove("honor-board-exit");
      isHonorDismissing = false;
      if (typeof onDone === 'function') {
        onDone();
      } else if (openNextStudentAfter) {
        openPickStudentModal();
      }
    }, 380);
  }

  const closeBtn = honorBoardModal.querySelector("[data-close-modal='honorBoardModal']");
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      dismissHonorModal();
    };
  }

  let secLeft = (didClimb || (scoreDelta !== 0)) ? 5 : 3;
  if (honorCountdownSec) honorCountdownSec.textContent = secLeft;

  honorCountdownInterval = setInterval(() => {
    secLeft--;
    if (honorCountdownSec) honorCountdownSec.textContent = secLeft;
    if (secLeft <= 0) {
      dismissHonorModal();
    }
  }, 1000);
}

let honorCountdownInterval = null;

btnShowHonorBoard?.addEventListener("click", async () => {
  await loadCloudData();
  showHonorBoardModal(false);
});

document.getElementById("btnHeaderHonorBoard")?.addEventListener("click", async () => {
  await loadCloudData();
  showHonorBoardModal(false);
});

// زر استيراد نماذج نور البيان المعتمدة من الهيدر
document.getElementById("btnHeaderImportTemplates")?.addEventListener("click", async () => {
  const ok = await showInAppConfirm({
    title: "استيراد نماذج نور البيان المعتمدة",
    message: "هل ترغب في رفع نماذج اختبارات نور البيان المعتمدة تلقائياً إلى قاعدة البيانات السحابية؟",
    confirmText: "نعم، استيراد وحفظ بالسحابة",
    cancelText: "إلغاء وتراجع",
    type: "info",
    icon: "fa-cloud-arrow-up"
  });
  if (ok) {
    showGlobalLoader("جاري استيراد النماذج...", "يتم حفظ نماذج نور البيان في قاعدة البيانات السحابية");
    try {
      for (const q of INITIAL_QUIZZES) {
        await syncQuizToCloud(q);
      }
      await loadCloudData();
      showToast("تم استيراد وحفظ نماذج الاختبارات في السحابة بنجاح!", "fa-circle-check");
    } catch (err) {
      showToast("تعذر استيراد النماذج للسحابة حالياً", "fa-triangle-exclamation");
    } finally {
      hideGlobalLoader();
    }
  }
});

// زر التحديث السحابي المباشر في الهيدر (تحديث حقيقي مع عداد البيانات ودعم العمل دون انقطاع)
document.getElementById("btnHeaderCloudSync")?.addEventListener("click", async () => {
  const btn = document.getElementById("btnHeaderCloudSync");
  const icon = btn?.querySelector("i");
  const dot = btn?.querySelector(".cloud-status-dot");
  if (icon) {
    icon.className = "fa-solid fa-arrows-rotate fa-spin";
  }
  if (dot) {
    dot.className = "cloud-status-dot syncing";
  }
  btn?.classList.add("syncing");

  showGlobalLoader("جاري مزامنة السحابة المباشرة...", "يتم فحص أحدث الحسابات، الاختبارات، الغرف، ولوحة الشرف من Firestore");

  try {
    const stats = await loadCloudData(true);
    soundFX?.click();
    if (stats.isOffline) {
      showToast(`☁️ تم الحفظ والمزامنة محلياً (${stats.users} حساب، ${stats.quizzes} اختبار، ${stats.rooms} غرفة)`, "fa-cloud");
      showRealtimeSyncPill(`⚡ وضع الاستعداد: تم تحديث الواجهات بالبيانات المحفوظة بنجاح`);
    } else {
      showToast(`✅ تم تحديث السحابة بنجاح! (${stats.users} حساب، ${stats.quizzes} اختبار، ${stats.rooms} غرفة نشطة)`, "fa-cloud-arrow-down");
      showRealtimeSyncPill(`☁️ اكتمل التحديث السحابي: ${stats.users} حساب · ${stats.quizzes} اختبار · ${stats.rooms} غرفة نشطة`);
    }
  } catch (err) {
    console.error("Cloud sync button notice:", err);
    showToast("تم تحديث الواجهات بالبيانات المحفوظة محلياً بنجاح", "fa-circle-check");
  } finally {
    if (icon) {
      icon.className = "fa-solid fa-cloud-arrow-down";
    }
    if (dot) {
      dot.className = "cloud-status-dot online";
    }
    btn?.classList.remove("syncing");
    hideGlobalLoader();
  }
});

// زر التحديث السحابي في لوحة المشرف
document.getElementById("btnSupervisorRefreshCloud")?.addEventListener("click", async () => {
  const btn = document.getElementById("btnSupervisorRefreshCloud");
  const icon = btn?.querySelector("i");
  if (icon) icon.className = "fa-solid fa-arrows-rotate fa-spin";
  showGlobalLoader("جاري تحديث السحابة...", "يتم مزامنة جميع الحسابات والاختبارات ولوحة الشرف");
  try {
    const stats = await loadCloudData(true);
    soundFX?.click();
    if (stats.isOffline) {
      showToast(`☁️ تم تحديث اللوحة بالبيانات المحفوظة (${stats.users} حساب، ${stats.quizzes} اختبار)`, "fa-cloud");
    } else {
      showToast(`✅ تم تحديث جميع البيانات من السحابة (${stats.users} حساب، ${stats.quizzes} اختبار، ${stats.rooms} غرفة)`, "fa-circle-check");
    }
  } catch (err) {
    console.error("Supervisor cloud refresh notice:", err);
    showToast("تم تحديث لوحة التحكم بنجاح", "fa-circle-check");
  } finally {
    if (icon) icon.className = "fa-solid fa-arrows-rotate";
    hideGlobalLoader();
  }
});

// زر إعادة تعيين لوحة الشرف (للمشرف العام)
document.getElementById("btnResetHonorBoard")?.addEventListener("click", () => {
  const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name));
  if (!isSup) {
    showToast("صلاحية إعادة تعيين لوحة الشرف خاصة بالمشرف العام فقط", "fa-triangle-exclamation");
    return;
  }
  showInAppConfirm("هل أنت متأكد من رغبتك في تصفير لوحة الشرف لجميع المتسابقين؟", () => {
    honorLeaderboardCache = [];
    localStorage.setItem("nour_honor_board", JSON.stringify([]));
    syncHonorBoardToCloud();
    renderHonorLeaderboardTab();
    showToast("تمت إعادة تعيين لوحة الشرف بنجاح", "fa-circle-check");
  });
});

// دالة عرض وتحديث لوحة الشرف التفاعلية في التبويب وواجهة الطالب
function renderHonorLeaderboardTab() {
  const tabList = document.getElementById("honorBoardTabList");
  const studentList = document.getElementById("studentHonorBoardList");

  const buildHtml = (container) => {
    if (!container) return;
    if (!honorLeaderboardCache || honorLeaderboardCache.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 15px; color: #64748b; background: #f8fafc; border-radius: var(--radius-md); border: 2px dashed #cbd5e1;">
          <i class="fa-solid fa-trophy" style="font-size: 45px; color: #facc15; margin-bottom: 12px; display: block;"></i>
          <h4 style="font-weight: 800; font-size: 17px; color: #334155; margin-bottom: 6px;">لا توجد نتائج مسجلة حتى الآن</h4>
          <p style="font-size: 13.5px; color: #94a3b8; margin: 0;">ستظهر أسماء المتسابقين ونقاطهم المحفوظة هنا فور تقييمهم في المسابقات الحية.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = honorLeaderboardCache.map((item, idx) => {
      const isMe = currentUser && currentUser.name === item.name;
      let rankClass = "";
      if (idx === 0) rankClass = "rank-1";
      else if (idx === 1) rankClass = "rank-2";
      else if (idx === 2) rankClass = "rank-3";

      const studentData = participantsCache.find(p => p.name === item.name);
      const schoolInfo = studentData ? `${studentData.school || 'مدرسة نور البيان'} | ${studentData.grade || 'طالب'}` : 'متسابق معتمد';

      return `
        <div class="honor-board-tab-item ${rankClass} ${isMe ? 'current-user-item' : ''}">
          <div class="honor-item-left">
            <div class="honor-item-rank">
              ${idx === 0 ? '<i class="fa-solid fa-crown" style="color: #ca8a04;"></i>' : `#${idx + 1}`}
            </div>
            <div class="honor-item-meta">
              <span class="honor-item-name">
                ${item.name}
                ${isMe ? '<span style="font-size:11px; background:#22c55e; color:#fff; padding:2px 8px; border-radius:10px; margin-right:6px;">أنت</span>' : ''}
              </span>
              <span class="honor-item-school"><i class="fa-solid fa-school" style="font-size:11px; margin-left:4px;"></i>${schoolInfo}</span>
            </div>
          </div>
          <div class="honor-item-score">
            <i class="fa-solid fa-trophy" style="color:#eab308; font-size:16px;"></i>
            <span>${item.score}</span>
            <span style="font-size:13px; font-weight:700; color:#64748b;">نقطة</span>
          </div>
        </div>
      `;
    }).join("");
  };

  buildHtml(tabList);
  buildHtml(studentList);
}

// الاسم البديل لدعم الاستدعاءات القادمة من مستمعي Firestore
function renderHonorLeaderboard() {
  renderHonorLeaderboardTab();
}


// --------------------------------------------------------
// التدريب الذاتي للطلاب (Student Self-Practice Mode)
// --------------------------------------------------------
function renderStudentPracticeQuizzes() {
  if (!studentPracticeQuizzesList || !currentUser) return;

  const studentGrade = currentUser.grade || "صف أول";
  const practiceQuizzes = quizzesCache.filter(q => 
    q.allowPractice && (q.targetGrade === studentGrade || q.targetGrade === "جميع الفئات")
  );

  if (practiceQuizzes.length === 0) {
    studentPracticeQuizzesList.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #64748b;">
        <i class="fa-solid fa-clipboard-check" style="font-size: 32px; margin-bottom: 8px;"></i>
        <p>لا توجد اختبارات تدريبية متاحة حالياً لفئتك (${studentGrade}).</p>
      </div>
    `;
    return;
  }

  studentPracticeQuizzesList.innerHTML = practiceQuizzes.map(q => {
    const secList = Array.isArray(q.sections) ? q.sections : [];
    const qCount = secList.reduce((a, s) => a + (Array.isArray(s?.questions) ? s.questions.length : 0), 0);
    return `
      <div class="quiz-card-duo">
        <div class="quiz-card-top">
          <span class="quiz-grade-badge"><i class="fa-solid fa-graduation-cap"></i> ${q.targetGrade}</span>
          <h4 class="quiz-card-title">${q.title}</h4>
          <div class="quiz-card-info">
            <span><i class="fa-solid fa-circle-question"></i> ${qCount} أسئلة</span>
          </div>
        </div>
        <div class="quiz-card-actions">
          <button class="btn-duo-green btn-sm btn-start-practice" data-id="${q.id}" style="width: 100%;">
            <i class="fa-solid fa-play"></i> ابدأ التدريب الذاتي
          </button>
        </div>
      </div>
    `;
  }).join("");

  studentPracticeQuizzesList.querySelectorAll(".btn-start-practice").forEach(b => {
    b.addEventListener("click", () => {
      const q = quizzesCache.find(x => x.id === b.getAttribute("data-id"));
      if (q) startStudentPractice(q);
    });
  });
}

function startStudentPractice(quiz) {
  const runnerModal = document.getElementById("practiceRunnerModal");
  const runnerTitle = document.getElementById("practiceQuizTitle");
  const runnerContent = document.getElementById("practiceRunnerContent");

  if (!runnerModal || !runnerContent) return;
  runnerTitle.innerHTML = `<i class="fa-solid fa-dumbbell"></i> تدريب: ${quiz.title}`;

  let currentSecIdx = 0;
  let earnedScore = 0;
  const answeredQuestions = new Set();

  function renderPracticeSection(secIdx) {
    if (secIdx >= quiz.sections.length) {
      const shouldCountHonor = quiz.enableHonorPoints !== false;
      let pointsToAward = 0;
      let honorMessage = "";

      if (shouldCountHonor) {
        if (quiz.honorPointsMode === "fixed") {
          pointsToAward = quiz.honorBonusPoints || 20;
          honorMessage = `تم منح مكافأة إكمال الاختبار: <strong>${pointsToAward} نقطة</strong> في لوحة الشرف والرصيد السحابي!`;
        } else {
          pointsToAward = earnedScore;
          honorMessage = `تم احتساب وحفظ <strong>${pointsToAward} نقطة</strong> (الدرجات الفعلية) في رصيدك السحابي وفي لوحة الشرف بنجاح!`;
        }
      } else {
        honorMessage = `هذا الاختبار مخصص للتدريب الذاتي فقط دون احتساب نقاط في لوحة الشرف بناءً على إعدادات المشرف.`;
      }

      if (currentUser && pointsToAward > 0) {
        recordHonorScore(currentUser.name, pointsToAward);
        if (!Array.isArray(currentUser.completedQuizzes)) {
          currentUser.completedQuizzes = [];
        }
        if (!currentUser.completedQuizzes.includes(quiz.id)) {
          currentUser.completedQuizzes.push(quiz.id);
        }
        saveParticipants(currentUser);
        syncParticipantToCloud(currentUser);
      }

      runnerContent.innerHTML = `
        <div style="text-align: center; padding: 30px;">
          <i class="fa-solid fa-circle-check" style="font-size: 60px; color: var(--duo-green); margin-bottom: 15px;"></i>
          <h2>أحسنت صنعاً وبوركت جهودك!</h2>
          <p style="color: #64748b; margin-top: 8px;">أتممت هذا الاختبار التدريبي بنجاح تام.</p>
          <div style="margin: 20px 0; padding: 15px; background: ${shouldCountHonor ? '#f0fdf4' : '#f8fafc'}; border: 1.5px solid ${shouldCountHonor ? '#86efac' : '#cbd5e1'}; border-radius: 12px; color: ${shouldCountHonor ? '#166534' : '#475569'}; font-weight: 700; font-size: 15.5px;">
            <i class="fa-solid fa-trophy" style="color: #eab308; margin-left: 6px;"></i>
            ${honorMessage}
          </div>
          <button class="btn-duo-green" style="margin-top: 10px;" onclick="document.getElementById('practiceRunnerModal').classList.add('hidden')">
            إنهاء ومتابعة
          </button>
        </div>
      `;
      return;
    }

    const sec = quiz.sections[secIdx];
    runnerContent.innerHTML = `
      <div class="practice-sec-box question-enter-anim">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;flex-wrap:wrap;gap:10px;">
          <h3 style="font-size: 18px; margin: 0; color: var(--duo-green-dark);">
            <i class="fa-solid fa-bookmark"></i> ${sec.sectionName}
          </h3>
          <button type="button" class="btn-duo-outline btn-sm btn-practice-trigger-card">
            <i class="fa-solid fa-bolt" style="color:#eab308;"></i> سحب بطاقة تكتيكية ذكية
          </button>
        </div>
        ${sec.questions.map((q, idx) => {
          const rawPairs = (q.pairs || []).map(p => {
            if (Array.isArray(p)) return [p[0] || "", p[1] || ""];
            if (p && typeof p === "object") return [p.left || p.first || "", p.right || p.second || ""];
            return ["", ""];
          }).filter(p => p[0] || p[1]);

          return `
          <div class="practice-question-card question-enter-anim" style="background: #f8fafc; border: 1.5px solid var(--border-duo); border-radius: var(--radius-md); padding: 18px; margin-bottom: 15px; scroll-margin-top: 30px;">
            <p class="font-${q.font || 'quran'}" style="margin-bottom: 12px; font-weight: 700;">${idx + 1}. ${q.text}</p>
            ${q.type === 'mcq' && q.options && q.options.length > 0 ? `
              <div class="mcq-options-grid">
                ${q.options.map((opt, oIdx) => `
                  <button class="btn-choice-duo btn-practice-mcq font-${q.font || 'quran'}" data-q="${idx}" data-choice="${oIdx}">${opt}</button>
                `).join("")}
              </div>
            ` : q.type === 'matching' && rawPairs.length > 0 ? `
              <div class="practice-matching-area" id="pracMatchArea_${secIdx}_${idx}">
                <p style="font-size: 13px; color: #475569; font-weight: 800; margin-bottom: 10px;">
                  <i class="fa-solid fa-arrows-split-up-and-left"></i> اضغط على عنصر من الطرف (أ) ثم على ما يطابقه من الطرف (ب):
                </p>
                <div class="matching-play-grid">
                  <div class="matching-items-column">
                    <div class="matching-col-header"><i class="fa-solid fa-align-right"></i> الطرف (أ):</div>
                    ${rawPairs.map((p, pIdx) => `
                      <div class="matching-tile font-${q.font || 'quran'} prac-tile-a" data-sec="${secIdx}" data-q="${idx}" data-pair="${pIdx}">
                        ${p[0]}
                      </div>
                    `).join("")}
                  </div>
                  <div class="matching-items-column">
                    <div class="matching-col-header"><i class="fa-solid fa-align-left"></i> الطرف (ب) [مبعثر]:</div>
                    ${shuffleArray(rawPairs.map((p, origIdx) => ({ text: p[1], origIdx }))).map(pObj => `
                      <div class="matching-tile font-${q.font || 'quran'} prac-tile-b" data-sec="${secIdx}" data-q="${idx}" data-pair="${pObj.origIdx}">
                        ${pObj.text}
                      </div>
                    `).join("")}
                  </div>
                </div>
              </div>
            ` : q.type === 'ordering' ? (() => {
                const targetItems = Array.isArray(q.items) && q.items.length > 0 
                  ? [...q.items] 
                  : (q.targetSentence ? q.targetSentence.split(/\s+/).filter(Boolean) : ["كلمة 1", "كلمة 2"]);
                const scrambled = shuffleArray(targetItems.map((w, wIdx) => ({ text: w, origIdx: wIdx, id: `pw_${secIdx}_${idx}_${wIdx}` })));
                if (scrambled.length > 1 && scrambled.every((w, i) => w.origIdx === i)) {
                  scrambled.reverse();
                }
                return `
                  <div class="practice-ordering-area ordering-play-area" id="pracOrderArea_${secIdx}_${idx}">
                    <p style="font-size: 13px; color: #475569; font-weight: 800; margin-bottom: 8px;">
                      <i class="fa-solid fa-arrow-down-short-wide"></i> اضغط على الكلمات بالترتيب الصحيح لتكوين الجملة:
                    </p>
                    <div class="ordering-slots-container" id="pracSlots_${secIdx}_${idx}">
                      <div class="ordering-empty-hint"><i class="fa-solid fa-hand-pointer"></i> اضغط على الكلمات بالأسفل لإضافتها هنا بالترتيب...</div>
                    </div>
                    <div class="ordering-bank-title"><i class="fa-solid fa-layer-group"></i> الكلمات المتاحة (اضغط للترتيب):</div>
                    <div class="ordering-bank-container" id="pracBank_${secIdx}_${idx}">
                      ${scrambled.map(w => `
                        <div class="ordering-chip font-${q.font || 'quran'} prac-bank-chip" data-sec="${secIdx}" data-q="${idx}" data-id="${w.id}" data-text="${escapeHtml(w.text)}">
                          ${w.text}
                        </div>
                      `).join("")}
                    </div>
                    <div class="ordering-actions-bar" style="margin-top:10px;">
                      <button type="button" class="btn-duo-outline btn-sm btn-prac-reset-order" data-sec="${secIdx}" data-q="${idx}">
                        <i class="fa-solid fa-rotate-left"></i> إعادة الترتيب
                      </button>
                      <button type="button" class="btn-duo-green btn-sm btn-prac-check-order" data-sec="${secIdx}" data-q="${idx}">
                        <i class="fa-solid fa-circle-check"></i> اعتماد وتحقق من الترتيب
                      </button>
                    </div>
                  </div>
                `;
              })() : q.type === 'oral' ? `
              <div class="oral-practice-showcase">
                <div class="oral-practice-label">
                  <i class="fa-solid fa-microphone-lines"></i> اقرأ وتلُ بدقة:
                </div>
                ${q.targetOral && q.targetOral.trim() ? `
                  <div class="oral-practice-content font-${q.font || 'quran'}">${q.targetOral}</div>
                ` : `
                  <div class="oral-practice-content" style="color:#94a3b8; font-size:16px;">انطق الكلمات المذكورة في عنوان السؤال أعلاه</div>
                `}
                <p class="oral-practice-hint"><i class="fa-solid fa-circle-info"></i> تدرّب على القراءة ثم انتقل للقسم التالي</p>
              </div>
            ` : ``}
          </div>
        `}).join("")}

        <button id="btnNextPracticeSection" class="btn-duo-green" style="margin-top: 15px;">
          ${secIdx + 1 === quiz.sections.length ? 'إكمال الاختبار' : 'الانتقال للقسم التالي'}
        </button>
      </div>
    `;

    // تفعيل زر البطاقات التكتيكية في التدريب
    runnerContent.querySelector(".btn-practice-trigger-card")?.addEventListener("click", () => {
      triggerTacticalCardsModal(() => {
        showToast("✨ تم تطبيق ميزة البطاقة في تدريبك الحالي بنجاح!", "fa-bolt");
      });
    });

    // 1. تفعيل خيارات MCQ في التدريب
    runnerContent.querySelectorAll(".btn-practice-mcq").forEach(b => {
      b.addEventListener("click", () => {
        const qIdx = parseInt(b.getAttribute("data-q"));
        const cIdx = parseInt(b.getAttribute("data-choice"));
        const q = sec.questions[qIdx];
        const qKey = `${secIdx}_${qIdx}`;
        if (!answeredQuestions.has(qKey)) {
          answeredQuestions.add(qKey);
          if (cIdx === q.correct) {
            b.classList.add("correct");
            earnedScore += (q.points || 5);
            try { soundFX.correct(); } catch (e) {}
            showToast(`+${q.points || 5} نقاط إجابة صحيحة!`, "fa-star");
          } else {
            b.classList.add("wrong");
            try { soundFX.wrong(); } catch (e) {}
            showToast("إجابة غير صحيحة", "fa-xmark");
          }
        }
      });
    });

    // 2. تفعيل التوصيل التفاعلي (Matching) في التدريب
    sec.questions.forEach((q, qIdx) => {
      if (q.type === 'matching' && Array.isArray(q.pairs)) {
        let selectedA = null;
        let matchedCount = 0;
        const totalPairs = q.pairs.length;
        const qKey = `${secIdx}_${qIdx}`;

        const area = document.getElementById(`pracMatchArea_${secIdx}_${qIdx}`);
        if (!area) return;

        area.querySelectorAll(".prac-tile-a").forEach(tileA => {
          tileA.addEventListener("click", () => {
            if (tileA.classList.contains("matched")) return;
            area.querySelectorAll(".prac-tile-a").forEach(t => t.classList.remove("selected"));
            selectedA = tileA.getAttribute("data-pair");
            tileA.classList.add("selected");
          });
        });

        area.querySelectorAll(".prac-tile-b").forEach(tileB => {
          tileB.addEventListener("click", () => {
            if (tileB.classList.contains("matched")) return;
            if (selectedA === null) {
              showToast("اضغط على عنصر من الطرف (أ) أولاً", "fa-hand-pointer");
              return;
            }
            const pairB = tileB.getAttribute("data-pair");
            const activeTileA = area.querySelector(`.prac-tile-a[data-pair="${selectedA}"]`);

            if (selectedA === pairB) {
              // مطابقة صحيحة
              tileB.classList.add("matched");
              if (activeTileA) {
                activeTileA.classList.remove("selected");
                activeTileA.classList.add("matched");
              }
              selectedA = null;
              matchedCount++;
              try { soundFX.btnClick(); } catch (e) {}

              if (matchedCount >= totalPairs && !answeredQuestions.has(qKey)) {
                answeredQuestions.add(qKey);
                earnedScore += (q.points || 5);
                try { soundFX.correct(); } catch (e) {}
                showToast(`✅ تم توصيل جميع الأزواج بنجاح! (+${q.points || 5} درجات)`, "fa-circle-check");
              }
            } else {
              // خطأ
              try { soundFX.wrong(); } catch (e) {}
              tileB.classList.add("shake-wrong");
              if (activeTileA) activeTileA.classList.add("shake-wrong");
              setTimeout(() => {
                tileB.classList.remove("shake-wrong");
                if (activeTileA) {
                  activeTileA.classList.remove("shake-wrong");
                  activeTileA.classList.remove("selected");
                }
                selectedA = null;
              }, 450);
            }
          });
        });
      }
    });

    // 3. تفعيل الترتيب التفاعلي (Ordering) في التدريب
    sec.questions.forEach((q, qIdx) => {
      if (q.type === 'ordering') {
        const targetItems = Array.isArray(q.items) && q.items.length > 0 
          ? [...q.items] 
          : (q.targetSentence ? q.targetSentence.split(/\s+/).filter(Boolean) : ["كلمة 1", "كلمة 2"]);
        const qKey = `${secIdx}_${qIdx}`;
        const slotsEl = document.getElementById(`pracSlots_${secIdx}_${qIdx}`);
        const bankEl = document.getElementById(`pracBank_${secIdx}_${qIdx}`);

        if (!slotsEl || !bankEl) return;

        function refreshOrderingChips() {
          const placedCount = slotsEl.querySelectorAll(".ordering-chip").length;
          const emptyHint = slotsEl.querySelector(".ordering-empty-hint");
          if (placedCount === 0 && !emptyHint) {
            slotsEl.innerHTML = `<div class="ordering-empty-hint"><i class="fa-solid fa-hand-pointer"></i> اضغط على الكلمات بالأسفل لإضافتها هنا بالترتيب...</div>`;
          } else if (placedCount > 0 && emptyHint) {
            emptyHint.remove();
          }
        }

        bankEl.addEventListener("click", (e) => {
          const chip = e.target.closest(".prac-bank-chip");
          if (!chip) return;
          const clone = document.createElement("div");
          clone.className = `ordering-chip font-${q.font || 'quran'} placed`;
          clone.setAttribute("data-id", chip.getAttribute("data-id"));
          clone.setAttribute("data-text", chip.getAttribute("data-text"));
          clone.innerHTML = `<span>${chip.getAttribute("data-text")}</span> <i class="fa-solid fa-xmark" style="font-size:12px;opacity:0.6;"></i>`;

          clone.addEventListener("click", () => {
            chip.style.display = "";
            clone.remove();
            refreshOrderingChips();
            try { soundFX.btnClick(); } catch (err) {}
          });

          const emptyHint = slotsEl.querySelector(".ordering-empty-hint");
          if (emptyHint) emptyHint.remove();
          slotsEl.appendChild(clone);
          chip.style.display = "none";
          try { soundFX.btnClick(); } catch (err) {}
        });

        // زر إعادة الترتيب
        document.querySelector(`.btn-prac-reset-order[data-sec="${secIdx}"][data-q="${qIdx}"]`)?.addEventListener("click", () => {
          slotsEl.querySelectorAll(".ordering-chip").forEach(c => c.remove());
          bankEl.querySelectorAll(".prac-bank-chip").forEach(c => c.style.display = "");
          refreshOrderingChips();
        });

        // زر اعتماد وتحقق من الترتيب
        document.querySelector(`.btn-prac-check-order[data-sec="${secIdx}"][data-q="${qIdx}"]`)?.addEventListener("click", () => {
          const placedChips = Array.from(slotsEl.querySelectorAll(".ordering-chip")).map(c => c.getAttribute("data-text"));
          if (placedChips.length !== targetItems.length) {
            showToast("⚠️ يرجى ترتيب جميع الكلمات أولاً!", "fa-triangle-exclamation");
            return;
          }
          const isCorrect = placedChips.every((w, i) => w === targetItems[i]);
          if (isCorrect) {
            try { soundFX.correct(); } catch (err) {}
            slotsEl.style.borderColor = "#86efac";
            slotsEl.style.backgroundColor = "#f0fdf4";
            if (!answeredQuestions.has(qKey)) {
              answeredQuestions.add(qKey);
              earnedScore += (q.points || 5);
            }
            showToast(`✅ أحسنت! الترتيب متقن وصحيح (+${q.points || 5} درجات)`, "fa-circle-check");
          } else {
            try { soundFX.wrong(); } catch (err) {}
            slotsEl.classList.add("shake-wrong");
            setTimeout(() => slotsEl.classList.remove("shake-wrong"), 500);
            showToast("❌ الترتيب غير دقيق، حاول مرة أخرى", "fa-xmark");
          }
        });
      }
    });

    document.getElementById("btnNextPracticeSection")?.addEventListener("click", () => {
      // منح درجات تفاعلية للأسئلة الشفهية أو التطبيقية المكتملة في هذا القسم
      sec.questions.forEach((q, idx) => {
        const qKey = `${secIdx}_${idx}`;
        if (!answeredQuestions.has(qKey) && q.type !== 'mcq') {
          answeredQuestions.add(qKey);
          earnedScore += (q.points || 5);
        }
      });

      triggerSectionTransition(() => {
        currentSecIdx++;
        renderPracticeSection(currentSecIdx);
        requestAnimationFrame(() => {
          runnerContent.scrollTop = 0;
          const firstQ = runnerContent.querySelector(".practice-question-card");
          if (firstQ) {
            setTimeout(() => {
              try { firstQ.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
            }, 350);
          }
        });
      });
    });
  }

  renderPracticeSection(0);
  runnerModal.classList.remove("hidden");
  requestAnimationFrame(() => {
    runnerContent.scrollTop = 0;
    const firstQ = runnerContent.querySelector(".practice-question-card");
    if (firstQ) {
      setTimeout(() => {
        try { firstQ.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
      }, 350);
    }
  });
}

function triggerSectionTransition(onComplete) {
  const transModal = document.getElementById("sectionTransitionModal");
  const countText = document.getElementById("transitionCountText");
  if (!transModal) {
    if (onComplete) onComplete();
    return;
  }

  transModal.classList.remove("hidden");
  let sec = 3;
  if (countText) countText.textContent = sec;

  const tInt = setInterval(() => {
    sec--;
    if (countText) countText.textContent = sec;
    if (sec <= 0) {
      clearInterval(tInt);
      transModal.classList.add("hidden");
      if (onComplete) onComplete();
    }
  }, 1000);
}

// --------------------------------------------------------
// إغلاق المودالات بالنقر على زر الإغلاق أو الخلفية
// --------------------------------------------------------
document.querySelectorAll("[data-close-modal]").forEach(btn => {
  btn.addEventListener("click", () => {
    const targetModalId = btn.getAttribute("data-close-modal");
    document.getElementById(targetModalId)?.classList.add("hidden");
  });
});

window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    if (e.target.id === "confirmDialogModal" && activeConfirmResolve) {
      const r = activeConfirmResolve;
      activeConfirmResolve = null;
      const yesBtn = document.getElementById("btnConfirmDialogYes");
      const noBtn = document.getElementById("btnConfirmDialogNo");
      if (yesBtn) yesBtn.onclick = null;
      if (noBtn) noBtn.onclick = null;
      r(false);
    }
    e.target.classList.add("hidden");
  }
});

// --------------------------------------------------------
// نقطة البداية (Initialization) مع الاستعادة الفورية للجلسة السابقة
// --------------------------------------------------------
async function initApp() {
  loadInitialStorage();

  // فحص مباشر وفوري لرابط الدخول المباشر (?auth=...) قبل أي استعادة للجلسة السابقة
  const directAuthToken = extractAuthTokenFromUrl();
  let directLoginSucceeded = false;

  if (directAuthToken) {
    showGlobalLoader("مسابقة نور البيان", "جاري التحقق من رابط الحساب وتسجيل الدخول المباشر...");
    try {
      await loadCloudData();
      directLoginSucceeded = await checkDirectUrlAuthentication(directAuthToken);
    } catch (e) {
      console.warn("Direct auth on start notice:", e);
    } finally {
      hideGlobalLoader();
    }
  }

  if (directLoginSucceeded) {
    try {
      setupRealtimeCloudListeners();
    } finally {
      hideGlobalLoader();
    }
    return;
  }

  // 1. استعادة الجلسة السابقة ومطابقتها فورياً وبشكل متزامن قبل أي استدعاءات شبكية
  let restoredSession = false;
  const savedUserJson = localStorage.getItem("active_quran_user") || localStorage.getItem("nour_saved_user");
  const savedView = localStorage.getItem("nour_saved_view");
  const savedTab = localStorage.getItem("nour_saved_tab");
  const savedRoomId = localStorage.getItem("nour_saved_room_id");

  if (savedUserJson) {
    try {
      const parsed = JSON.parse(savedUserJson);
      if (parsed && parsed.name) {
        currentUser = parsed;
        restoredSession = true;

        // تفعيل جلسة المستخدم وإظهار واجهته الخاصة فوراً بدون أي تأخير وبدون إظهار واجهة البداية
        finalizeUserSession(currentUser, true);

        // إذا كان هناك تبويب محفوظ في لوحة المشرف
        if (savedTab && currentUser.role !== "student") {
          const tabBtn = document.querySelector(`.nav-tab[data-tab='${savedTab}']`);
          if (tabBtn) {
            document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".tab-content-panel").forEach(p => p.classList.remove("active"));
            tabBtn.classList.add("active");
            document.getElementById(savedTab)?.classList.add("active");
          }
        }

        // إذا كانت هناك شاشة محفوظة صالحة وليست hero أو login
        if (savedView && views[savedView] && savedView !== "hero" && savedView !== "login") {
          showView(savedView);
        }
      }
    } catch (e) {
      console.warn("Session restore parse notice:", e);
    }
  }

  // إذا لم يكن المستخدم مسجلاً، نظهر واجهة البداية hero وشاشة التحميل
  if (!restoredSession && !currentUser) {
    showGlobalLoader("مسابقة نور البيان", "جاري الاتصال بقاعدة البيانات السحابية وجلب البيانات المحدثة...");
    showView("hero");
  } else {
    // إشعار خفيف غير معطل للشاشة بالمزامنة السحابية اللحظية
    showRealtimeSyncPill("⚡ جاري مزامنة أحدث البيانات من السحابة...");
  }

  try {
    // 2. تفعيل مستمعي البيانات السحابية الحية ومزامنة السحابة
    setupRealtimeCloudListeners();
    await loadCloudData();

    // 3. فحص رابط الدخول المباشر (?auth=...)
    const urlParams = new URLSearchParams(window.location.search);
    const hasDirectAuth = urlParams.has("auth") || urlParams.has("token");
    if (hasDirectAuth) {
      const isDirectLoggedIn = await checkDirectUrlAuthentication();
      if (isDirectLoggedIn) {
        return;
      }
    }

    // 4. بعد اكتمال جلب الغرف، إذا كان المستخدم متواجداً بغرفة نشطة مسبقاً، نعيده إليها تلقائياً
    if (savedRoomId && currentUser) {
      const targetRoom = activeRooms.find(r => r.id === savedRoomId);
      if (targetRoom) {
        joinLiveRoom(targetRoom);
      }
    }

    // 5. تحديث بيانات المستخدم الحالي من أحدث نسخة في السحابة بهدوء
    if (currentUser) {
      const liveUser = participantsCache.find(p => 
        p.id === currentUser.id || 
        p.normalizedName === currentUser.normalizedName || 
        p.name === currentUser.name
      );
      if (liveUser) {
        currentUser = { ...currentUser, ...liveUser };
        localStorage.setItem("active_quran_user", JSON.stringify(currentUser));
        localStorage.setItem("nour_saved_user", JSON.stringify(currentUser));
        if (currentUser.role === "student") {
          const scoreEl = document.getElementById("studentTotalScoreDisplay");
          if (scoreEl) {
            const honorEntry = honorLeaderboardCache.find(x => x.name === currentUser.name);
            const pts = currentUser.totalScore !== undefined ? currentUser.totalScore : (honorEntry ? honorEntry.score : 0);
            scoreEl.textContent = `${pts} نقطة`;
          }
        }
      }
    }

    // 6. استرجاع وتعبئة آخر اسم مستخدم تلقائياً في خانة تسجيل الدخول مع تحديث العداد
    const lastUsername = localStorage.getItem("nour_last_username");
    if (lastUsername && fullNameInput) {
      fullNameInput.value = lastUsername;
      fullNameInput.dispatchEvent(new Event("input"));
    }

    // إذا لم يكن هناك جلسة نشطة ولم يكن مسجلاً مسبقاً
    if (!restoredSession && !currentUser) {
      showView("hero");
    }
  } catch (err) {
    console.warn("Init cloud load notice:", err);
    // صمام أمان: إذا كان هناك جلسة محفوظة لا نطرده للواجهة الرئيسية إطلاقاً!
    if (!currentUser && !restoredSession) {
      showView("hero");
    }
  } finally {
    hideGlobalLoader();
  }
}

// مزامنة صامتة عند عودة المستخدم للتبويب لمنع أي حاجة لتحديث الصفحة يدوياً
window.addEventListener("focus", () => {
  if (currentUser) {
    loadCloudData().catch(() => {});
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && currentUser) {
    loadCloudData().catch(() => {});
  }
});

// فحص دوري خفيف كل 20 ثانية لضمان بقاء البيانات طازجة دائماً
setInterval(() => {
  if (currentUser && document.visibilityState === "visible") {
    loadCloudData().catch(() => {});
  }
}, 20000);

// إعادة التمركز والتحجيم التلقائي فوراً عند تغيير حجم الشاشة أو تدوير الهاتف
window.addEventListener("resize", () => {
  if (currentLiveRoom && currentLiveRoom.phase === "competing") {
    bringQuestionCardIntoView();
  }
});

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
