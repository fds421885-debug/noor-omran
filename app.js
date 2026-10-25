
// ========================================================
// تفاعل ملصقات منصة نور البيان (تم إزالتها لضمان تركيز المسابقة ووقار الأجواء القرآنية)
// ========================================================
function setupPlatformThemedStickers() {
  // تفاعلات الملصقات ملغاة لضمان بيئة مسابقات قرانية هادئة ونقية
}

function triggerFloatingThemedSticker(title, iconHtml) {
  const el = document.createElement("div");
  el.className = "floating-themed-sticker";
  const randomX = Math.floor(Math.random() * 50) + 25;
  el.style.left = randomX + "%";
  el.innerHTML = `
    <div class="floating-themed-sticker-bubble">
      ${iconHtml}
      <span>${title}</span>
    </div>
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// النظام الشامل المتكامل: الأدوار الأربعة، إدارة الحسابات،
// بنك الأسئلة والاختبارات، التوليد بالذكاء الاصطناعي،
// العروض والمسابقات الحية، البطاقات التكتيكية (40 بطاقة)، ولوحة الشرف
// ========================================================

import { 
  db, 
  auth,
  ensureFirebaseAuth,
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
  arrayRemove,
  isQuotaExhausted,
  markQuotaExhausted
} from "./firebase-config.js";

import { soundFX } from "./audio-fx.js";
import { 
  TACTICAL_CARDS, 
  getRandomTacticalCards, 
  getCardById, 
  isCardCompatible, 
  getIncompatibilityReason, 
  formatCardScopeLabel, 
  getCardMechanicsExplanation 
} from "./cards-data.js";
import { generateTestWithAI } from "./ai-service.js";
import { 
  getAnswerLogKey, 
  calculateQuestionScore, 
  recordAnswerIdempotent, 
  calculateSessionScoreFromLog, 
  getContestantTotalScore, 
  finalizeContestantScore 
} from "./scoring-engine.js";

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
const stageQuestionCard = document.getElementById("stageQuestionCardMain");
const stageQuestionCardMain = document.getElementById("stageQuestionCardMain");
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
let pastTournamentsCache = [];
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
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "") // إزالة التشكيل والتطويل الكشيدة
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // إزالة المحارف الصفرية الخفية
    .replace(/\s+/g, " ");
}

function isSupervisor(name) {
  if (!name || typeof name !== "string") return false;
  const norm = normalizeArabic(name).trim();
  const rawClean = name.trim().toLowerCase();

  const directKeywords = [
    "مشرف", "المشرف", "المشرف العام", "مشرف البرنامج", "مشرف المسابقة",
    "admin", "administrator", "super", "supervisor", "ادمن", "الادمن",
    "رئيس المسابقة", "ادارة المسابقة", "الادارة", "ادارة"
  ];
  if (directKeywords.includes(norm) || directKeywords.includes(rawClean)) {
    return true;
  }

  const masterNorm = normalizeArabic(MASTER_SUPERVISOR_NAME); // "محمد منتصر محمد يونس"
  if (norm === masterNorm || norm.startsWith(masterNorm)) return true;

  if (norm === "محمد منتصر" || norm === "منتصر" || norm === "منتصر يونس" || norm === "محمد منتصر يونس" || norm === "محمد منتصر راغب يونس") {
    return true;
  }
  if (norm.includes("محمد منتصر") || (norm.includes("منتصر") && (norm.includes("راغب") || norm.includes("يونس")))) {
    return true;
  }

  return false;
}

function isTeacher(name) {
  if (!name || typeof name !== "string") return false;
  const norm = normalizeArabic(name).trim();
  const rawClean = name.trim().toLowerCase();
  const teacherKeywords = ["معلم", "المعلم", "معلم معتمد", "استاذ", "الاستاذ", "مدرس", "المدرس", "teacher"];
  return teacherKeywords.includes(norm) || teacherKeywords.includes(rawClean) || norm.includes("معلم معتمد");
}

function isPresenter(name) {
  if (!name || typeof name !== "string") return false;
  const norm = normalizeArabic(name).trim();
  const rawClean = name.trim().toLowerCase();
  const presenterKeywords = ["عارض", "العارض", "شاشة العرض", "شاشة", "عرض", "presenter", "screen", "عارض المسرح"];
  return presenterKeywords.includes(norm) || presenterKeywords.includes(rawClean);
}

// احتساب عدد أجزاء الاسم العربي بدقة فائقة مع دعم الأسماء المركبة (عبد الله، سيف الدين، أبو بكر، آل، بن...)
function countArabicNameParts(name) {
  if (!name || typeof name !== "string") return 0;
  let clean = name.trim();
  if (!clean) return 0;

  // إزالة التشكيل والتطويل والمحارف الخفية وعلامات الترقيم وتوحيد الألف
  clean = clean
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[,\.،؛\-_\/]/g, " ")
    .replace(/\s+/g, " ");

  // 1. عبد + (أي اسم معرف بأل أو الله) مثل: عبد الله، عبد الرحمن، عبد العزيز...
  clean = clean.replace(/(^|\s)عبد\s+(ال[\u0621-\u064A]+|الله)(?=\s|$)/gu, "$1عبد_$2");
  // 2. أبو / أبا / أبي / ابن / بن / آل / أم + الاسم
  clean = clean.replace(/(^|\s)(ابو|ابا|ابي|ابن|بن|ال|ام)\s+([\u0621-\u064A]+)(?=\s|$)/gu, "$1$2_$3");
  // 3. المركب الإضافي مع (الدين / الإسلام / الله) مثل: نور الدين، سيف الدين، علاء الدين، فتح الله، سيف الإسلام
  clean = clean.replace(/(^|\s)([\u0621-\u064A]+)\s+(الدين|الاسلام|الله)(?=\s|$)/gu, "$1$2_$3");

  const tokens = clean.split(/\s+/).filter(w => w.length > 0);
  return tokens.length;
}

function validateQuadrupleName(fullName) {
  const trimmed = (fullName || "").trim();
  if (!trimmed) {
    return { isValid: false, count: 0, isQuadruple: false, message: "يرجى كتابة الاسم الرباعي كاملاً (4 أسماء على الأقل)." };
  }
  const count = countArabicNameParts(trimmed);
  const isQuadruple = count >= 4;
  if (!isQuadruple) {
    const labels = {
      1: "اسماً مفرداً (1/4)",
      2: "اسماً ثنائياً (2/4)",
      3: "اسماً ثلاثياً (3/4، متبقي اسم رابع)"
    };
    const wordLabel = labels[count] || `${count} أسماء`;
    return {
      isValid: false,
      count,
      isQuadruple: false,
      message: `يرجى إكمال الاسم الرباعي كاملاً (لقد كتبت ${wordLabel}). يشترط إدخال 4 أسماء على الأقل للمتابعة.`
    };
  }
  return { 
    isValid: true, 
    count, 
    isQuadruple: true, 
    message: "✔ اسم رباعي مكتمل" 
  };
}

function getDocumentId(normalizedName) {
  if (!normalizedName) return "user_guest";
  const encoded = encodeURIComponent(normalizedName).replace(/%/g, "_");
  // للأمان التام وتوافق فايربيس الصارم (أقل من 90 حرفاً لضمان عدم رفض وثائق الأسماء الرباعية الطويلة)
  if (encoded.length <= 80) {
    return "user_" + encoded;
  }
  let hash = 0;
  for (let i = 0; i < normalizedName.length; i++) {
    hash = ((hash << 5) - hash) + normalizedName.charCodeAt(i);
    hash |= 0;
  }
  const hashStr = Math.abs(hash).toString(36);
  return "user_" + encoded.slice(0, 40) + "_" + hashStr;
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

function showGlobalLoader(title = "جاري التحقق والمزامنة...", subtitle = "يرجى الانتظار لحظات، يتم جلب البيانات السحابية فورياً", safetyTimeoutMs = 3500) {
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

  // مؤقت أمان تلقائي احتياطي كحد أقصى لمنع أي تعليق دائم في حال انقطاع الشبكة
  if (safetyTimeoutMs > 0) {
    globalLoaderTimer = setTimeout(() => {
      hideGlobalLoader();
    }, safetyTimeoutMs);
  }
}

function hideGlobalLoader() {
  if (globalLoaderTimer) {
    clearTimeout(globalLoaderTimer);
    globalLoaderTimer = null;
  }
  const loader = document.getElementById("appGlobalLoader");
  if (!loader) return;
  loader.classList.remove("show");
  loader.classList.add("hidden");
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
  let target = viewName;
  if (!target || !views[target]) {
    if (currentUser) {
      target = (currentUser.role === "student") ? "student" : "supervisor";
    } else {
      target = "hero";
    }
  }

  let activated = false;
  Object.keys(views).forEach(key => {
    const el = views[key];
    if (!el) return;
    if (key === target) {
      el.classList.remove("hidden");
      el.classList.add("active");
      activated = true;
    } else {
      el.classList.add("hidden");
      el.classList.remove("active");
    }
  });

  // صمام أمان حاسم: في حال لم تفعل أي شاشة لأي سبب، نظهر hero كخيار آمن
  if (!activated && views.hero) {
    views.hero.classList.remove("hidden");
    views.hero.classList.add("active");
    target = "hero";
  }

  if (currentUser && target !== "hero" && target !== "login") {
    userQuickStatus?.classList.remove("hidden");
    if (quickUserName) quickUserName.textContent = currentUser.name || "";
    if (quickRoleBadge) {
      const roleMap = { supervisor: "مشرف", teacher: "معلم", presenter: "عارض", student: "طالب" };
      quickRoleBadge.textContent = roleMap[currentUser.role] || "مشارك";
    }
    // حفظ الشاشة الحالية فوراً لضمان البقاء في نفس الشاشة عند تحديث الصفحة
    localStorage.setItem("nour_saved_view", target);
  } else {
    userQuickStatus?.classList.add("hidden");
    if (target === "hero" || target === "login") {
      localStorage.removeItem("nour_saved_view");
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (target === "student") {
    try { renderStudentPracticeQuizzes(); } catch (e) { console.warn(e); }
    try { renderLiveRoomsList(); } catch (e) { console.warn(e); }
  }

  // تحديث مباشر من السحابة عند التبديل بين الشاشات
  if (target !== "hero" && target !== "login") {
    loadCloudData().catch(() => {});
  }
}

// تبديل تبويبات لوحة التحكم مع العرض الفوري والتحديث المباشر من Firestore
document.querySelectorAll(".nav-tab").forEach(tabBtn => {
  tabBtn.addEventListener("click", () => {
    const targetTabId = tabBtn.getAttribute("data-tab");

    // حصر التبويبات بحسب الدور ومنع أي وصول لغير المشرف
    const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name));
    const isTeacher = currentUser && currentUser.role === "teacher";
    const isPresenter = currentUser && currentUser.role === "presenter";

    if (isTeacher && targetTabId !== "tabQuizzes" && targetTabId !== "tabHonorBoard" && targetTabId !== "tabPastTournaments") {
      showToast("هذا التبويب خاص بالمشرف العام فقط", "fa-lock");
      return;
    }
    if (isPresenter && targetTabId !== "tabLive" && targetTabId !== "tabHonorBoard" && targetTabId !== "tabPastTournaments") {
      showToast("هذا التبويب خاص بالمشرف العام فقط", "fa-lock");
      return;
    }

    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content-panel").forEach(p => p.classList.remove("active"));
    tabBtn.classList.add("active");
    document.getElementById(targetTabId)?.classList.add("active");

    // حفظ التبويب النشط حالياً للبقاء عليه عند تحديث الصفحة
    localStorage.setItem("nour_saved_tab", targetTabId);

    // إذا تم الضغط على تبويب الحسابات، نقوم بعرض الجدول فوراً وضمان جلب الحسابات السحابية
    if (targetTabId === "tabAccounts") {
      if (participantsCache.length === 0) {
        if (accountsTableBody) {
          accountsTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:26px;color:var(--duo-green);"></i><div style="margin-top:10px;font-weight:800;color:#475569;">جاري جلب أحدث الحسابات من قاعدة البيانات السحابية...</div></td></tr>';
        }
      } else {
        renderAccountsTable();
      }
      fetchParticipantsFromCloud(true).then(() => renderAccountsTable()).catch(() => {});
    }

    if (targetTabId === "tabTeams") {
      renderTeamsManagementTab();
    }
    if (targetTabId === "tabTacticalCards") {
      renderSupervisorCardsCatalog();
    }
    if (targetTabId === "tabPastTournaments") {
      renderPastTournamentsTab();
    }

    // تحديث البيانات السحابية في الخلفية بهدوء دون تجميد الواجهة
    loadCloudData().catch(() => {});
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

  // التأكد من وجود المشرف العام والمعلم والعارض دائماً
  const supNorm = normalizeArabic(MASTER_SUPERVISOR_NAME);
  const supExists = participantsCache.find(p => p.normalizedName === supNorm || p.role === "supervisor");
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
  }

  const teacherNorm = normalizeArabic("المعلم المعتمد");
  if (!participantsCache.some(p => p.role === "teacher" || p.normalizedName === teacherNorm)) {
    participantsCache.push({
      id: "user_teacher_default",
      name: "المعلم المعتمد",
      normalizedName: teacherNorm,
      role: "teacher",
      school: "مدرسة نور البيان النموذجية",
      grade: "جميع الفئات",
      firstLoginAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      loginCount: 1
    });
  }

  const presenterNorm = normalizeArabic("عارض المسرح الحي");
  if (!participantsCache.some(p => p.role === "presenter" || p.normalizedName === presenterNorm)) {
    participantsCache.push({
      id: "user_presenter_default",
      name: "عارض المسرح الحي",
      normalizedName: presenterNorm,
      role: "presenter",
      school: "مدرسة نور البيان المركزية",
      grade: "جميع الفئات",
      firstLoginAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      loginCount: 1
    });
  }
  saveParticipants();

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

  // أرشيف المسابقات والبطولات السابقة
  try {
    const savedPast = localStorage.getItem("nour_past_tournaments");
    pastTournamentsCache = savedPast ? JSON.parse(savedPast) : [];
  } catch (e) {
    pastTournamentsCache = [];
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

// أداة مساعدة لتنفيذ الطلبات مع مهلة حماية فردية لمنع تعليق التطبيق
function withTimeout(promise, ms, fallbackValue = null) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallbackValue);
      }
    }, ms);
    promise
      .then((val) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(val);
        }
      })
      .catch((err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          console.warn("Operation notice:", err?.message || err);
          resolve(fallbackValue);
        }
      });
  });
}

// جلب وتحديث قائمة المشاركين والحسابات سحابياً بشكل مباشر وفوري
async function fetchParticipantsFromCloud(forceFresh = false) {
  try {
    const snap = await withTimeout(getDocs(collection(db, "participants")), 8000, null);
    if (!snap || !snap.forEach) {
      return participantsCache;
    }

    const cloudUsers = [];
    snap.forEach(d => {
      const uData = d.data();
      if (uData) {
        cloudUsers.push({
          id: d.id,
          ...uData,
          name: uData.name || "",
          normalizedName: uData.normalizedName || normalizeArabic(uData.name || "")
        });
      }
    });

    // ضمان وجود حساب المشرف العام دائماً
    const supNorm = normalizeArabic(MASTER_SUPERVISOR_NAME);
    if (!cloudUsers.some(p => p.normalizedName === supNorm || p.name === MASTER_SUPERVISOR_NAME)) {
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

    if (cloudUsers.length > 0) {
      participantsCache = cloudUsers;
      saveParticipants();
      renderAccountsTable();
      if (currentUser && (currentUser.role === "supervisor" || currentUser.role === "teacher" || currentUser.role === "presenter")) {
        renderSupervisorDashboard();
      }
    }
    return participantsCache;
  } catch (err) {
    console.warn("fetchParticipantsFromCloud error:", err);
    return participantsCache;
  }
}

async function syncParticipantToCloud(user) {
  if (isQuotaExhausted() || !user || !user.id) return;
  try {
    const userRef = doc(db, "participants", user.id);
    const cleanUser = sanitizeForFirestore(user);
    await setDoc(userRef, {
      ...cleanUser,
      authUid: auth?.currentUser?.uid || null,
      lastUpdated: serverTimestamp()
    }, { merge: true });
    console.log("[FIRESTORE SYNC] Successfully synced participant:", user.id);
  } catch (e) {
    console.error("[FIRESTORE SYNC] Firestore participant sync error:", e?.message || e, "for user:", user.id);
  }
}

async function syncSchoolsAndGradesToCloud() {
  if (isQuotaExhausted()) return;
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
  if (isQuotaExhausted() || !quizObj || !quizObj.id) return;
  try {
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
  } catch (e) {
    console.warn("Firestore quiz sync notice:", e);
  }
}

async function syncRoomToCloud(roomObj, isDelete = false) {
  if (isQuotaExhausted() || !roomObj || !roomObj.id) return;
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
  if (isQuotaExhausted()) return;
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

function showRealtimeSyncPill(text = "تم استلام تحديث جديد من السحابة وتحديث البيانات فورياً") {
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

  if (titleEl) titleEl.textContent = `بدأت مسابقة حية جديدة الآن: «${room.name}»`;
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
          showRealtimeSyncPill("تم تحديث قائمة المدارس والصفوف من السحابة");
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
      if (currentUser && !cloudUsers.some(p => p.id === currentUser.id || p.normalizedName === currentUser.normalizedName || p.name === currentUser.name)) {
        cloudUsers.push(currentUser);
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
              showToast(`مبارك! أصبحت الآن (${newRoleName}) وتم فتح الواجهة الخاصة بك فورياً دون الحاجة لتحديث الصفحة!`, "fa-award", 4500);
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
            showToast(`اختبار جديد: «${changedTitle}» (بواسطة ${modifier})`, "fa-book-quran", 3500);
            showRealtimeSyncPill(`أضاف ${modifier} اختباراً جديداً: «${changedTitle}»`);
          } else if (change.type === "modified") {
            showToast(`تم تحديث الاختبار: «${changedTitle}» فورياً للجميع!`, "fa-pen-to-square", 3500);
            showRealtimeSyncPill(`تم تحديث الاختبار «${changedTitle}» في الوقت الفعلي`);
          } else if (change.type === "removed") {
            showToast(`تم حذف الاختبار: «${changedTitle}» من السحابة`, "fa-trash", 3000);
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
            showToast(`بدأت غرفة مسابقة جديدة الآن: «${roomStarted.name}»`, "fa-tower-broadcast");
            showRealtimeSyncPill("تم رصد غرفة مسابقة جديدة وبدء الفعالية في السحابة فوراً");
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
                showToast(`انتقلت المسابقة لمرحلة: ${phaseLabels[cr.phase] || cr.phase}`, "fa-bolt");
              }
              showRealtimeSyncPill(`تحديث مباشر: المسابقة «${cr.name}» قيد التشغيل`);
            }
            if (!prev.contestantName && cr.contestantName) {
              if (currentLiveRoom && currentLiveRoom.id === cr.id) {
                showToast(`المتسابق المختار الآن: ${cr.contestantName}`, "fa-user-check");
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
          showToast(`انضم «${u}» إلى الغرفة الآن!`, "fa-user-plus");
          showRealtimeSyncPill(`انضم متسابق جديد للغرفة: ${u}`);
        }
      });
    }

    // رصد مغادرة أي عضو
    if (prevUsers.length > newUsers.length) {
      const leftUsers = prevUsers.filter(u => !newUsers.includes(u));
      leftUsers.forEach(u => {
        if (!currentUser || u !== currentUser.name) {
          showToast(`غادر «${u}» الغرفة`, "fa-user-minus");
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
let lastSeenSectionCountUpdateTimestamp = 0;
let isSectionDrawAnimating = false;
let currentDrawInterval = null;
let currentDrawTimeout = null;
let lastSeenAnswerTimestamp = 0;
let lastSeenMatchingVerifyTimestamp = 0;
let lastSeenOrderingTimestamp = 0;
let lastSeenOrderingVerifyTimestamp = 0;
let lastSeenCardsTurnTimestamp = 0;
let lastSeenCardUsedTimestamp = 0;
let lastSeenWalletSyncTimestamp = 0;
let lastSeenCardChosenTimestamp = 0;
let lastSeenQuestionSkipTimestamp = 0;
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
            showToast(`مبارك! أصبحت الآن (${newRoleName}) وتم فتح الواجهة الخاصة بك فورياً دون الحاجة لتحديث الصفحة!`, "fa-award", 4500);
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

  // توجيه مراحل مسابقة الفرق التنافسية (Teams Mode Flow)
  if (room.isTeamMatch) {
    if (room.teamSelectionState === "selecting" || !room.teamA || !room.teamB) {
      renderArenaTeamPickerUI(room);
      return;
    }
    document.getElementById("arenaTeamSelectionOverlay")?.classList.add("hidden");

    if (!phase || phase === "lobby") {
      showArenaPhase("lobby");
      renderTeamLobbyInfo(room);
      return;
    }
    if (phase === "team_intro") {
      if (room.teamLaunchTimestamp && window.lastHandledTeamLaunch !== room.teamLaunchTimestamp) {
        window.lastHandledTeamLaunch = room.teamLaunchTimestamp;
        executeTeamContestLaunch();
      } else {
        runTeamEntranceCinematicShowcase();
      }
      return;
    }
    if (phase === "team_stage") {
      syncTeamStageRealtime(room);
      return;
    }
    if (phase === "team_finale") {
      showTeamGrandFinaleModal(room);
      return;
    }
  }

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

      // رصد وتنبيه أنيميشن تغيير أعداد الأسئلة للأقسام بالتزامن لجميع الحضور
      if (room.sectionCountUpdate && room.sectionCountUpdate.timestamp > lastSeenSectionCountUpdateTimestamp) {
        lastSeenSectionCountUpdateTimestamp = room.sectionCountUpdate.timestamp;
        if (!isLead) {
          try { soundFX.btnClick(); } catch (e) {}
          const targetSecIdx = room.sectionCountUpdate.secIdx;
          setTimeout(() => {
            const valEl = document.getElementById(`drawSecVal_${targetSecIdx}`);
            if (valEl) {
              valEl.classList.remove("draw-count-bump");
              void valEl.offsetWidth;
              valEl.classList.add("draw-count-bump");
            }
          }, 40);
        }
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

    // إظهار أو إخفاء أدوات تحكم المشرف في المؤقت اللحظي (رئيس المؤقت)
    const isSupervisorUser = currentUser && (
      currentUser.role === "supervisor" ||
      isSupervisor(currentUser.name) ||
      currentUser.name === room.leaderName ||
      currentUser.name === room.creatorName
    );
    const supTimerCtrls = document.getElementById("stageSupervisorTimerControls");
    if (supTimerCtrls) {
      if (isSupervisorUser) {
        supTimerCtrls.classList.remove("hidden");
        updateSupervisorTimerButtonUI(room.timerState?.isFrozen || room.timerState?.isCorrectionPaused);
      } else {
        supTimerCtrls.classList.add("hidden");
      }
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

    // مزامنة ترتيب الجمل والكلمات اللحظية وتصحيحها للجميع (Real-time Sentence/Words Ordering & Verification Sync)
    if (room.orderingState && room.orderingState.questionIdx === (room.currentQuestionIdx || 0)) {
      const ordPlaced = Array.isArray(room.orderingState.placedWords) ? room.orderingState.placedWords : [];
      const ordBank = Array.isArray(room.orderingState.bankWords) ? room.orderingState.bankWords : [];

      if (room.orderingState.verifying && (room.orderingState.startedAt || room.orderingState.timestamp) > lastSeenOrderingVerifyTimestamp) {
        lastSeenOrderingVerifyTimestamp = room.orderingState.startedAt || room.orderingState.timestamp;
        if (!currentUser || room.orderingState.updatedBy !== currentUser.name) {
          if (typeof window.runExternalOrderingVerification === "function") {
            window.runExternalOrderingVerification(ordPlaced);
          }
        }
      } else if (!room.orderingState.verifying) {
        if (room.orderingState.timestamp > lastSeenOrderingTimestamp) {
          lastSeenOrderingTimestamp = room.orderingState.timestamp;
          if (!currentUser || room.orderingState.updatedBy !== currentUser.name) {
            if (typeof window.syncExternalOrderingUI === "function") {
              window.syncExternalOrderingUI(ordPlaced, ordBank);
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
      const myName = currentUser?.name || currentContestant?.name;
      if (ws.isOpen) {
        if (!myName || ws.openedBy !== myName) {
          showToast(`قام (${ws.openedBy}) بفتح محفظة البطاقات التكتيكية للمتسابق!`, "fa-layer-group", 3500);
          if (typeof openSynchronizedWallet === "function") {
            openSynchronizedWallet(false, ws.openedBy);
          }
        }
      } else {
        if (!myName || ws.closedBy !== myName) {
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
          trigger2SecondCardSelectionShowcase(card, sel.chosenBy, false, sel.remainingSecs);
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

    // مزامنة تخطي السؤال الحالي لحظياً لجميع الأجهزة والحضور (Real-time Question Skip Sync)
    if (room.activeQuestionSkip && room.activeQuestionSkip.timestamp > lastSeenQuestionSkipTimestamp) {
      lastSeenQuestionSkipTimestamp = room.activeQuestionSkip.timestamp;
      const skipEv = room.activeQuestionSkip;

      // تحديث نقاط المتسابق لجميع الحضور بالتزامن
      if (skipEv.contestantScore !== undefined) {
        contestantScore = skipEv.contestantScore;
        if (stageStudentScore) stageStudentScore.textContent = String(contestantScore);
      }

      // إيقاف أي مؤقت نشط وتصفية التأثيرات الفورية
      clearInterval(liveTimerInterval);
      liveTimerInterval = null;
      expireInstantCardEffects();

      // إشعار موحد بالصوت والرسالة لجميع المتصلين
      showFloatingCardPill("تخطي السؤال الحالي +3 نقاط ⏭️", "fa-forward-fast", "gold");
      showToast(`⏭️ تم تخطي السؤال الحالي بواسطة (${skipEv.skippedBy || 'المتسابق'}) واحتساب +3 نقاط!`, "fa-forward-fast", 3500);
      try { soundFX.correct(); } catch(e) {}

      currentQuestionIndex = skipEv.nextIdx;
      if (currentLiveRoom) {
        currentLiveRoom.currentQuestionIdx = skipEv.nextIdx;
        currentLiveRoom.contestantScore = contestantScore;
      }

      if (skipEv.isFinished) {
        finishContestant();
      } else {
        showHonorBoardModal(
          false,
          () => loadStageQuestion(skipEv.nextIdx),
          room.contestantName || currentContestant?.name,
          skipEv.grantedPoints || 3,
          false,
          skipEv.grantedPoints || 3,
          0
        );
      }
      return;
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
          cardBonus: ev.cardBonus || 0,
          basePoints: ev.basePoints || (ev.scoreDelta - (ev.cardBonus || 0)),
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

    // إذا كانت هناك حركة انتقال جارية أو مودال لوحة الشرف معروض، نتركها تكمل بسلاسة حتى تختفي لوحة الشرف تماماً
    if (isQuestionTransitionRunning) {
      if (Date.now() - transitionStartTime > 12000) {
        isQuestionTransitionRunning = false;
        isAdvancingQuestion = false;
      } else {
        return;
      }
    }

    if (honorBoardModal && !honorBoardModal.classList.contains("hidden")) {
      return;
    }

    // مزامنة حالة التأثيرات والبطاقات النشطة فورياً للجميع (بما فيها تكبير الخط القرآني 150%)
    if (typeof renderActiveCardEffectsUI === "function") {
      renderActiveCardEffectsUI(room);
    }

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
        showTeacherHelpModal(room.activeTeacherHelp.helperName, room.activeTeacherHelp.contestantName, room.activeTeacherHelp.cardTitle, room.activeTeacherHelp.cardId || 6);
      }
    } else {
      const teacherModal = document.getElementById("teacherHelpModal");
      if (teacherModal && !teacherModal.classList.contains("hidden")) {
        teacherModal.classList.add("hidden");
        activeTeacherConsultationInProgress = false;
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
    // جلب كافة المجموعات السحابية بالتوازي مع مهل مستقلة لحماية كل مجموعة من التعطيل
    const [sgDoc, quizDocs, partDocs, roomDocs, honorDoc, quizCfgDoc, teamDocs, archiveDocs] = await Promise.all([
      withTimeout(getDoc(doc(db, "system_settings", "schools_and_grades")), 8000, null),
      withTimeout(getDocs(collection(db, "quizzes")), 12000, null),
      withTimeout(getDocs(collection(db, "participants")), 9000, null),
      withTimeout(getDocs(collection(db, "live_rooms")), 8000, null),
      withTimeout(getDoc(doc(db, "system_settings", "honor_board")), 8000, null),
      withTimeout(getDoc(doc(db, "system_settings", "quizzes_config")), 8000, null),
      withTimeout(getDocs(collection(db, "teams")), 8000, null),
      withTimeout(getDocs(collection(db, "tournament_archives")), 8000, null)
    ]);

    const sgRes = { status: sgDoc ? "fulfilled" : "rejected", value: sgDoc };
    const quizRes = { status: quizDocs ? "fulfilled" : "rejected", value: quizDocs };
    const partRes = { status: partDocs ? "fulfilled" : "rejected", value: partDocs };
    const roomRes = { status: roomDocs ? "fulfilled" : "rejected", value: roomDocs };
    const honorRes = { status: honorDoc ? "fulfilled" : "rejected", value: honorDoc };
    const quizCfgRes = { status: quizCfgDoc ? "fulfilled" : "rejected", value: quizCfgDoc };
    const teamRes = { status: teamDocs ? "fulfilled" : "rejected", value: teamDocs };
    const archiveRes = { status: archiveDocs ? "fulfilled" : "rejected", value: archiveDocs };

    const anyFulfilled = [sgDoc, quizDocs, partDocs, roomDocs, honorDoc, quizCfgDoc, teamDocs, archiveDocs].some(Boolean);
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
          if (!isQuotaExhausted()) syncQuizToCloud(q).catch(() => {});
          cloudQuizzes.push(normalizeQuizFromCloud(q));
        }
        localStorage.setItem("nour_quizzes_init_done", "true");
        if (!isQuotaExhausted()) {
          setDoc(doc(db, "system_settings", "quizzes_config"), {
            initialized: true,
            lastUpdated: serverTimestamp()
          }, { merge: true }).catch(() => {});
        }
      } else {
        localStorage.setItem("nour_quizzes_init_done", "true");
      }

      if (cloudQuizzes.length > 0) {
        quizzesCache = cloudQuizzes;
        localStorage.setItem("nour_quizzes", JSON.stringify(quizzesCache));
      } else if (quizzesCache.length === 0) {
        quizzesCache = INITIAL_QUIZZES.map(q => normalizeQuizFromCloud(q));
        localStorage.setItem("nour_quizzes", JSON.stringify(quizzesCache));
      }
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
      const listToCheck = cloudUsers.length > 0 ? cloudUsers : participantsCache;
      let masterSup = listToCheck.find(p => p.normalizedName === supNorm || p.id === supDocId || p.name === MASTER_SUPERVISOR_NAME);
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
        if (cloudUsers.length > 0) {
          cloudUsers.unshift(masterSup);
        } else {
          participantsCache.unshift(masterSup);
        }
        if (!isQuotaExhausted()) {
          syncParticipantToCloud(masterSup).catch(() => {});
        }
      }
      if (cloudUsers.length > 0) {
        if (currentUser && !cloudUsers.some(p => p.id === currentUser.id || p.normalizedName === currentUser.normalizedName || p.name === currentUser.name)) {
          cloudUsers.push(currentUser);
        }
        participantsCache = cloudUsers;
        localStorage.setItem("nour_participants", JSON.stringify(participantsCache));
      }
      counts.users = participantsCache.length;

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
      if (cloudRooms.length > 0 || isFirstRoomsSnapshot) {
        activeRooms = cloudRooms;
        localStorage.setItem("nour_rooms", JSON.stringify(activeRooms));
      }
      counts.rooms = activeRooms.length;
    }

    // 5. لوحة الشرف من السحابة مباشرة
    if (honorRes.status === "fulfilled" && honorRes.value.exists()) {
      const hData = honorRes.value.data();
      honorLeaderboardCache = Array.isArray(hData.entries) ? hData.entries : [];
      localStorage.setItem("nour_honor_board", JSON.stringify(honorLeaderboardCache));
      counts.honor = honorLeaderboardCache.length;
    }

    // 6. الفرق التنافسية المحفوظة سحابياً (Teams Collection)
    if (teamRes.status === "fulfilled" && teamRes.value) {
      const cloudTeams = [];
      teamRes.value.forEach(d => {
        cloudTeams.push({ id: d.id, ...d.data() });
      });
      if (cloudTeams.length > 0) {
        teamsCache = cloudTeams;
        localStorage.setItem("nour_teams", JSON.stringify(teamsCache));
      }
    }
    ensureDefaultTeams();

    // 7. أرشيف المسابقات والبطولات السابقة المحفوظة سحابياً (tournament_archives)
    if (archiveRes && archiveRes.status === "fulfilled" && archiveRes.value) {
      const cloudPast = [];
      archiveRes.value.forEach(d => {
        cloudPast.push({ id: d.id, ...d.data() });
      });
      if (cloudPast.length > 0) {
        pastTournamentsCache = cloudPast;
        localStorage.setItem("nour_past_tournaments", JSON.stringify(pastTournamentsCache));
      }
    }

    // 8. تحديث كافة الواجهات بأمان تام دون أي انهيار
    try { updateDropdowns(); } catch (e) { console.warn("updateDropdowns notice:", e); }
    try { renderSchoolsAndGradesTags(); } catch (e) { console.warn("renderSchoolsAndGradesTags notice:", e); }
    try { renderAccountsTable(); } catch (e) { console.warn("renderAccountsTable notice:", e); }
    try { renderQuizzesList(); } catch (e) { console.warn("renderQuizzesList notice:", e); }
    try { renderStudentPracticeQuizzes(); } catch (e) { console.warn("renderStudentPracticeQuizzes notice:", e); }
    try { renderLiveRoomsList(); } catch (e) { console.warn("renderLiveRoomsList notice:", e); }
    try { renderHonorLeaderboardTab(); } catch (e) { console.warn("renderHonorLeaderboardTab notice:", e); }
    try { renderTeamsManagementTab(); } catch (e) { console.warn("renderTeamsManagementTab notice:", e); }
    try { renderPastTournamentsTab(); } catch (e) { console.warn("renderPastTournamentsTab notice:", e); }

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
  const schoolSelect = document.getElementById("schoolSelect");
  if (schoolSelect) {
    schoolSelect.innerHTML = schoolsCache.map(s => `<option value="${s}">${s}</option>`).join("");
  }
  const gradeSelect = document.getElementById("gradeSelect");
  if (gradeSelect) {
    gradeSelect.innerHTML = gradesCache.map(g => `<option value="${g}">${g}</option>`).join("");
  }

  const qasSchool = document.getElementById("qasSchoolSelect");
  if (qasSchool) {
    qasSchool.innerHTML = `<option value="">اختر المدرسة...</option>` + 
      schoolsCache.map(s => `<option value="${s}">${s}</option>`).join("");
  }
  const qasGrade = document.getElementById("qasGradeSelect");
  if (qasGrade) {
    qasGrade.innerHTML = `<option value="">اختر الصف...</option>` + 
      gradesCache.map(g => `<option value="${g}">${g}</option>`).join("");
  }
  const gradeFilter = document.getElementById("gradeFilterSelect");
  if (gradeFilter) {
    const curGradeVal = gradeFilter.value;
    gradeFilter.innerHTML = `<option value="all">جميع الصفوف والفئات</option>` + 
      gradesCache.map(g => `<option value="${g}">${g}</option>`).join("");
    if (curGradeVal && curGradeVal.toLowerCase() !== "all") {
      gradeFilter.value = curGradeVal;
    }
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
    showToast("تم نسخ الرابط بنجاح!", "fa-check");
    modal.remove();
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}

function updateImpersonationBanner() {
  let banner = document.getElementById("impersonationNoticeBar");
  // لا يظهر الشريط إطلاقاً إلا إذا قام المشرف العام نفسه بالضغط محلياً على زر "فتح الحساب" من لوحة التحكم في نفس الجلسة
  const prevSupJson = sessionStorage.getItem("nour_supervisor_impersonation");

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
        sessionStorage.removeItem("nour_supervisor_impersonation");
        localStorage.removeItem("nour_previous_supervisor");
        banner.remove();
        finalizeUserSession(supObj, true);
        showToast("تمت العودة لحساب المشرف العام بنجاح", "fa-crown");
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
    // إزالة وحذف أي جلسة إشراف سابقة تماماً عند فتح الرابط المباشر
    // لحماية حساب المشرف ومنع ظهور شريط "العودة لحساب المشرف العام" لأولياء الأمور والطلاب نهائياً
    sessionStorage.removeItem("nour_supervisor_impersonation");
    localStorage.removeItem("nour_previous_supervisor");
    const existingBanner = document.getElementById("impersonationNoticeBar");
    if (existingBanner) existingBanner.remove();

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
    const rawVal = fullNameInput.value;
    const val = rawVal.trim();

    if (!val) {
      if (nameProgressBar) nameProgressBar.style.width = "0%";
      if (nameCountBadge) {
        nameCountBadge.textContent = "اكتب اسمك";
        nameCountBadge.classList.remove("valid");
      }
      if (loginInstructionText) {
        loginInstructionText.innerHTML = `أهلاً بك! اكتب اسمك للمتابعة والدخول فورياً للمسابقة.`;
      }
      validationAlert?.classList.add("hidden");
      return;
    }

    // 1. فحص فوري: هل المدخل هو المشرف العام؟
    if (isSupervisor(val)) {
      if (nameProgressBar) nameProgressBar.style.width = "100%";
      if (nameCountBadge) {
        nameCountBadge.textContent = "👑 المشرف العام";
        nameCountBadge.classList.add("valid");
      }
      if (loginInstructionText) {
        loginInstructionText.innerHTML = `أهلاً بك يا مشرف البرنامج! اضغط <strong>«متابعة والدخول»</strong> لفتح لوحة التحكم فورياً.`;
      }
      validationAlert?.classList.add("hidden");
      return;
    }

    // 2. فحص فوري: هل المدخل هو المعلم؟
    if (isTeacher(val)) {
      if (nameProgressBar) nameProgressBar.style.width = "100%";
      if (nameCountBadge) {
        nameCountBadge.textContent = "👨‍🏫 المعلم المعتمد";
        nameCountBadge.classList.add("valid");
      }
      if (loginInstructionText) {
        loginInstructionText.innerHTML = `أهلاً بك أيها المعلم الفاضل! اضغط <strong>«متابعة والدخول»</strong> لفتح بنك الاختبارات فورياً.`;
      }
      validationAlert?.classList.add("hidden");
      return;
    }

    // 3. فحص فوري: هل المدخل هو العارض؟
    if (isPresenter(val)) {
      if (nameProgressBar) nameProgressBar.style.width = "100%";
      if (nameCountBadge) {
        nameCountBadge.textContent = "📺 عارض المسرح الحي";
        nameCountBadge.classList.add("valid");
      }
      if (loginInstructionText) {
        loginInstructionText.innerHTML = `أهلاً بك أيها العارض! اضغط <strong>«متابعة والدخول»</strong> لفتح مسرح المسابقات الحية فورياً.`;
      }
      validationAlert?.classList.add("hidden");
      return;
    }

    // 4. فحص فوري: هل الحساب مسجل مسبقاً (معلم، عارض، طالب سابق)؟
    const norm = normalizeArabic(val);
    const normNoSpaces = norm.replace(/\s+/g, "");
    const existing = participantsCache.find(p => {
      if (!p) return false;
      const pNorm = p.normalizedName || normalizeArabic(p.name || "");
      const pNormNoSpaces = pNorm.replace(/\s+/g, "");
      return pNorm === norm || 
             pNormNoSpaces === normNoSpaces ||
             (p.name && p.name.trim().toLowerCase() === val.toLowerCase());
    });

    if (existing) {
      if (nameProgressBar) nameProgressBar.style.width = "100%";
      if (nameCountBadge) {
        const roleLabels = { supervisor: "مشرف", teacher: "معلم", presenter: "عارض", student: "طالب" };
        nameCountBadge.textContent = `✔ ${roleLabels[existing.role] || "حساب مسجل"}`;
        nameCountBadge.classList.add("valid");
      }
      if (loginInstructionText) {
        loginInstructionText.innerHTML = `أهلاً بعودتك يا <strong>${escapeHtml(existing.name)}</strong>! حسابك جاهز، اضغط <strong>«متابعة والدخول»</strong>.`;
      }
      validationAlert?.classList.add("hidden");
      return;
    }

    // 5. متسابق جديد: احتساب عدد أجزاء الاسم بشكل مشجع وإيجابي
    const validation = validateQuadrupleName(val);
    const count = validation.count;
    const progressPercent = Math.min(100, Math.max(30, Math.round((count / 4) * 100)));
    if (nameProgressBar) nameProgressBar.style.width = `${progressPercent}%`;

    validationAlert?.classList.add("hidden");

    if (nameCountBadge) {
      nameCountBadge.classList.add("valid");
    }

    if (count >= 4) {
      if (nameCountBadge) nameCountBadge.textContent = `✔ اسم رباعي مكتمل`;
      if (loginInstructionText) {
        loginInstructionText.innerHTML = `✔ الاسم الرباعي مكتمل وجاهز تماماً! اضغط <strong>«متابعة والدخول»</strong> للانطلاق في المسابقة.`;
      }
    } else if (count === 3) {
      if (nameCountBadge) nameCountBadge.textContent = `✔ اسم ثلاثي (جاهز)`;
      if (loginInstructionText) {
        loginInstructionText.innerHTML = `أهلاً بك! الاسم جاهز، اضغط <strong>«متابعة والدخول»</strong> أو أضف الاسم الرابع إن رغبت.`;
      }
    } else if (count === 2) {
      if (nameCountBadge) nameCountBadge.textContent = `✔ اسم ثنائي (جاهز)`;
      if (loginInstructionText) {
        loginInstructionText.innerHTML = `أهلاً بك! الاسم جاهز، اضغط <strong>«متابعة والدخول»</strong> أو أكمل الاسم إن رغبت.`;
      }
    } else {
      if (nameCountBadge) nameCountBadge.textContent = `✔ جاهز للدخول`;
      if (loginInstructionText) {
        loginInstructionText.innerHTML = `أهلاً بك! اضغط <strong>«متابعة والدخول»</strong> للانطلاق في المسابقة مباشرة.`;
      }
    }
  });
}

// أزرار الانتقال المباشر
window.handleStartApp = function() {
  hideGlobalLoader();
  resetLoginSteps();
  showView("login");
  const lastUsername = localStorage.getItem("nour_last_username");
  if (lastUsername && fullNameInput && !fullNameInput.value.trim()) {
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
  sessionStorage.removeItem("nour_supervisor_impersonation");
  localStorage.removeItem("nour_previous_supervisor");
  document.getElementById("impersonationNoticeBar")?.remove();
  localStorage.removeItem("active_quran_user");
  localStorage.removeItem("nour_saved_user");
  localStorage.removeItem("nour_saved_view");
  localStorage.removeItem("nour_saved_tab");
  localStorage.removeItem("nour_saved_room_id");
  localStorage.removeItem("nour_user_role");
  localStorage.removeItem("nour_user_name");
  localStorage.removeItem("nour_user_id");
  if (lastSavedName) {
    localStorage.setItem("nour_last_username", lastSavedName);
    if (fullNameInput) {
      fullNameInput.value = lastSavedName;
      fullNameInput.dispatchEvent(new Event("input"));
    }
  }
  resetLoginSteps();
  showView("hero");
  hideGlobalLoader();
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

let isSubmittingLogin = false;

// --------------------------------------------------------
// معالجة تسجيل الدخول الذكية واللحظية الشاملة لكافة الأدوار
// --------------------------------------------------------
async function handleLoginSubmit(event) {
  if (event) {
    try { event.preventDefault(); } catch (e) {}
    try { event.stopPropagation(); } catch (e) {}
  }
  // إيقاف أي إعادة تحميل محتملة للصفحة بضمان تامة
  if (typeof window !== 'undefined' && window.event) {
    try { window.event.returnValue = false; } catch (e) {}
  }

  // قفل منع النقرات المتكررة أو الإرسال المتزامن
  if (isSubmittingLogin) {
    return false;
  }
  isSubmittingLogin = true;

  try {
    const rawName = fullNameInput ? fullNameInput.value.trim() : "";
    console.log("[LOGIN FLOW] handleLoginSubmit invoked with rawName:", rawName);

    if (!rawName || rawName.length < 2) {
      console.warn("[LOGIN FLOW] Name is empty or too short");
      if (validationAlert) {
        validationAlert.textContent = "يرجى كتابة الاسم للمتابعة والدخول للمسابقة.";
        validationAlert.classList.remove("hidden");
      }
      fullNameInput?.focus();
      return false;
    }

    validationAlert?.classList.add("hidden");
    sessionStorage.removeItem("nour_supervisor_impersonation");
    localStorage.removeItem("nour_previous_supervisor");
    document.getElementById("impersonationNoticeBar")?.remove();

    const norm = normalizeArabic(rawName);
    const normNoSpaces = norm.replace(/\s+/g, "");
    const docId = getDocumentId(norm);

    // تهيئة جلسة فايربيس للمستخدم إذا أمكن (Firebase Auth)
    try {
      await ensureFirebaseAuth(rawName);
    } catch (authErr) {
      console.info("[LOGIN FLOW] Auth setup notice:", authErr?.message || authErr);
    }

    // 1. الدخول الفوري السريع للمشرف العام
    if (isSupervisor(rawName)) {
      let supUser = participantsCache.find(p => p.role === "supervisor" || isSupervisor(p.name));
      if (!supUser) {
        supUser = {
          id: docId,
          name: MASTER_SUPERVISOR_NAME,
          normalizedName: normalizeArabic(MASTER_SUPERVISOR_NAME),
          role: "supervisor",
          school: "مدرسة نور البيان المركزية",
          grade: "جميع الفئات",
          firstLoginAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          loginCount: 1,
          authUid: auth?.currentUser?.uid || null
        };
        participantsCache.unshift(supUser);
        saveParticipants();
        syncParticipantToCloud(supUser).catch(err => console.error("[LOGIN FLOW] Supervisor cloud sync error:", err));
      } else {
        supUser.lastLoginAt = new Date().toISOString();
        supUser.loginCount = (supUser.loginCount || 1) + 1;
        supUser.authUid = auth?.currentUser?.uid || supUser.authUid || null;
        saveParticipants();
        syncParticipantToCloud(supUser).catch(err => console.error("[LOGIN FLOW] Supervisor cloud sync error:", err));
      }

      try { renderSupervisorDashboard(); } catch (e) { console.warn(e); }
      try { renderAccountsTable(); } catch (e) { console.warn(e); }
      finalizeUserSession(supUser, true);
      showToast("مرحباً بك يا مشرف البرنامج! تم الدخول بنجاح", "fa-crown");
      loadCloudData().catch(() => {});
      return;
    }

    // 2. الدخول الفوري للمعلم
    if (isTeacher(rawName)) {
      let teacherUser = participantsCache.find(p => p.role === "teacher" || isTeacher(p.name));
      if (!teacherUser) {
        teacherUser = {
          id: "user_teacher_default",
          name: "المعلم المعتمد",
          normalizedName: normalizeArabic("المعلم المعتمد"),
          role: "teacher",
          school: "مدرسة نور البيان النموذجية",
          grade: "جميع الفئات",
          firstLoginAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          loginCount: 1,
          authUid: auth?.currentUser?.uid || null
        };
        participantsCache.push(teacherUser);
        saveParticipants();
        syncParticipantToCloud(teacherUser).catch(err => console.error("[LOGIN FLOW] Teacher cloud sync error:", err));
      } else {
        teacherUser.lastLoginAt = new Date().toISOString();
        teacherUser.loginCount = (teacherUser.loginCount || 1) + 1;
        teacherUser.authUid = auth?.currentUser?.uid || teacherUser.authUid || null;
        saveParticipants();
        syncParticipantToCloud(teacherUser).catch(err => console.error("[LOGIN FLOW] Teacher cloud sync error:", err));
      }
      finalizeUserSession(teacherUser, true);
      showToast("مرحباً بعودتك أيها المعلم الفاضل! تم الدخول بنجاح", "fa-chalkboard-user");
      loadCloudData().catch(() => {});
      return;
    }

    // 3. الدخول الفوري للعارض (شاشة المسابقات الحية)
    if (isPresenter(rawName)) {
      let presUser = participantsCache.find(p => p.role === "presenter" || isPresenter(p.name));
      if (!presUser) {
        presUser = {
          id: "user_presenter_default",
          name: "عارض المسرح الحي",
          normalizedName: normalizeArabic("عارض المسرح الحي"),
          role: "presenter",
          school: "مدرسة نور البيان المركزية",
          grade: "جميع الفئات",
          firstLoginAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          loginCount: 1,
          authUid: auth?.currentUser?.uid || null
        };
        participantsCache.push(presUser);
        saveParticipants();
        syncParticipantToCloud(presUser).catch(err => console.error("[LOGIN FLOW] Presenter cloud sync error:", err));
      } else {
        presUser.lastLoginAt = new Date().toISOString();
        presUser.loginCount = (presUser.loginCount || 1) + 1;
        presUser.authUid = auth?.currentUser?.uid || presUser.authUid || null;
        saveParticipants();
        syncParticipantToCloud(presUser).catch(err => console.error("[LOGIN FLOW] Presenter cloud sync error:", err));
      }
      finalizeUserSession(presUser, true);
      showToast("مرحباً بك أيها العارض! تم الدخول بنجاح", "fa-display");
      loadCloudData().catch(() => {});
      return;
    }

    // 4. فحص الحساب المسجل محلياً في الذاكرة والكاش
    let foundUser = participantsCache.find(p => {
      if (!p) return false;
      const pNorm = p.normalizedName || normalizeArabic(p.name || "");
      const pNormNoSpaces = pNorm.replace(/\s+/g, "");
      return pNorm === norm || 
             pNormNoSpaces === normNoSpaces ||
             (p.name && p.name.trim().toLowerCase() === rawName.toLowerCase()) ||
             p.id === docId ||
             (p.name && normalizeArabic(p.name).replace(/\s+/g, "") === normNoSpaces);
    });

    if (foundUser) {
      foundUser.lastLoginAt = new Date().toISOString();
      foundUser.loginCount = (foundUser.loginCount || 1) + 1;
      foundUser.authUid = auth?.currentUser?.uid || foundUser.authUid || null;
      saveParticipants();
      finalizeUserSession(foundUser, true);
      showToast("مرحباً بعودتك يا " + foundUser.name + "! تم تسجيل الدخول بنجاح", "fa-circle-check");
      try {
        const userRef = doc(db, "participants", foundUser.id || docId);
        await updateDoc(userRef, {
          lastLoginAt: serverTimestamp(),
          loginCount: foundUser.loginCount,
          authUid: auth?.currentUser?.uid || null
        });
        console.log("[LOGIN FLOW] Successfully updated returning user in Firestore:", foundUser.id || docId);
      } catch (e) {
        console.error("[LOGIN FLOW] Firestore update returning user error:", e?.message || e);
      }
      loadCloudData().catch(() => {});
      return;
    }

    // 5. تسجيل ودخول فوري للطالب الجديد
    if (btnSubmitLogin) {
      btnSubmitLogin.disabled = true;
      btnSubmitLogin.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري الدخول...`;
    }

    try {
      if (db) {
        try {
          const directSnap = await withTimeout(getDoc(doc(db, "participants", docId)), 3000, null);
          if (directSnap && directSnap.exists && directSnap.exists()) {
            foundUser = { id: directSnap.id, ...directSnap.data() };
          }
        } catch (e) {
          console.warn("[LOGIN FLOW] Firestore participant lookup notice:", e?.message || e);
        }
      }

      if (foundUser) {
        foundUser.lastLoginAt = new Date().toISOString();
        foundUser.loginCount = (foundUser.loginCount || 1) + 1;
        foundUser.authUid = auth?.currentUser?.uid || foundUser.authUid || null;
        const existIdx = participantsCache.findIndex(p => p.id === foundUser.id);
        if (existIdx >= 0) {
          participantsCache[existIdx] = foundUser;
        } else {
          participantsCache.push(foundUser);
        }
        saveParticipants();
        finalizeUserSession(foundUser, true);
        showToast("مرحباً بعودتك يا " + foundUser.name + "! تم تسجيل الدخول بنجاح", "fa-circle-check");
        try {
          await updateDoc(doc(db, "participants", foundUser.id), {
            lastLoginAt: serverTimestamp(),
            loginCount: foundUser.loginCount,
            authUid: auth?.currentUser?.uid || null
          });
          console.log("[LOGIN FLOW] Successfully updated returning user in Firestore:", foundUser.id);
        } catch (upErr) {
          console.error("[LOGIN FLOW] Firestore update returning user error:", upErr?.message || upErr);
        }
        return;
      }

      const defaultSchool = (schoolsCache && schoolsCache.length > 0) ? schoolsCache[0] : DEFAULT_SCHOOLS[0];
      const defaultGrade = (gradesCache && gradesCache.length > 0) ? gradesCache[0] : DEFAULT_GRADES[0];
      const nowIso = new Date().toISOString();
      const newStudentUser = {
        id: docId,
        name: rawName,
        normalizedName: norm,
        role: "student",
        school: defaultSchool,
        grade: defaultGrade,
        firstLoginAt: nowIso,
        lastLoginAt: nowIso,
        loginCount: 1,
        authUid: auth?.currentUser?.uid || null
      };

      participantsCache.push(newStudentUser);
      saveParticipants();

      if (db) {
        try {
          const userDocRef = doc(db, "participants", docId);
          await setDoc(userDocRef, {
            ...newStudentUser,
            firstLoginAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
          });
          console.log("[LOGIN FLOW] Successfully created student document in Firestore:", docId);
        } catch (fsErr) {
          console.error("[LOGIN FLOW] Firestore create student document error:", fsErr?.message || fsErr);
          showToast(`تم تسجيل الحساب محلياً (${rawName}) وجاري المزامنة السحابية`, "fa-cloud-arrow-up", 4000);
        }
      }

      resetLoginSteps();
      finalizeUserSession(newStudentUser, false);

      const valParts = validateQuadrupleName(rawName);
      if (valParts.isValid) {
        showToast(`أهلاً بك يا ${newStudentUser.name} في مسابقة نور البيان! تم تسجيل اسمك الرباعي بنجاح`, "fa-graduation-cap");
      } else {
        showToast(`أهلاً بك يا ${newStudentUser.name}! تم تسجيل دخولك بنجاح`, "fa-graduation-cap");
      }

    } catch (err) {
      console.error("[LOGIN FLOW] Login submit error:", err?.message || err);
      const defaultSchool = (schoolsCache && schoolsCache.length > 0) ? schoolsCache[0] : DEFAULT_SCHOOLS[0];
      const defaultGrade = (gradesCache && gradesCache.length > 0) ? gradesCache[0] : DEFAULT_GRADES[0];
      const nowIso = new Date().toISOString();
      const fallbackUser = {
        id: docId,
        name: rawName,
        normalizedName: norm,
        role: "student",
        school: defaultSchool,
        grade: defaultGrade,
        firstLoginAt: nowIso,
        lastLoginAt: nowIso,
        loginCount: 1,
        authUid: auth?.currentUser?.uid || null
      };
      participantsCache.push(fallbackUser);
      saveParticipants();
      resetLoginSteps();
      finalizeUserSession(fallbackUser, false);
      showToast(`أهلاً بك يا ${rawName}! تم تسجيل الدخول بنجاح`, "fa-circle-check");
    }
  } finally {
    isSubmittingLogin = false;
    if (btnSubmitLogin) {
      btnSubmitLogin.disabled = false;
      btnSubmitLogin.innerHTML = `<span class="btn-text">متابعة والدخول</span><span class="btn-icon"><i class="fa-solid fa-arrow-left"></i></span>`;
    }
  }
}

// ربط معالج تسجيل الدخول بالنموذج والزر والمفتاح Enter ومتاح في window
window.handleManualLoginSubmit = handleLoginSubmit;
loginForm?.addEventListener("submit", handleLoginSubmit);
btnSubmitLogin?.addEventListener("click", (e) => {
  handleLoginSubmit(e);
});
fullNameInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleLoginSubmit(e);
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
function finalizeUserSession(user, isReturning = true) {
  if (!user || typeof user !== "object") {
    console.warn("finalizeUserSession called without valid user object");
    currentUser = null;
    showView("hero");
    hideGlobalLoader();
    return;
  }

  const rawName = (user.name || "").trim();
  if (!rawName) {
    console.warn("finalizeUserSession called without valid user name");
    currentUser = null;
    showView("hero");
    hideGlobalLoader();
    return;
  }

  const cleanRole = (user.role || (isSupervisor(rawName) ? "supervisor" : "student")).toLowerCase().trim();
  const cleanNorm = user.normalizedName || normalizeArabic(rawName);
  const cleanId = user.id || getDocumentId(cleanNorm);

  user.name = rawName;
  user.role = cleanRole;
  user.normalizedName = cleanNorm;
  user.id = cleanId;
  currentUser = user;

  // 1. الحفظ السليم والأكيد في localStorage بمفاتيح متعددة لضمان استرجاعها حتى مع تلف JSON
  try {
    const serialized = JSON.stringify(user);
    localStorage.setItem("active_quran_user", serialized);
    localStorage.setItem("nour_saved_user", serialized);
    localStorage.setItem("nour_last_username", rawName);
    localStorage.setItem("nour_user_role", cleanRole);
    localStorage.setItem("nour_user_name", rawName);
    localStorage.setItem("nour_user_id", cleanId);
    if (cleanRole === "student") {
      localStorage.setItem("nour_saved_view", "student");
    } else {
      localStorage.setItem("nour_saved_view", "supervisor");
    }
    console.log("[FINALIZE SESSION] Successfully persisted user to localStorage:", { name: rawName, role: cleanRole, id: cleanId });
  } catch (storageErr) {
    console.warn("Storage save notice in finalizeUserSession:", storageErr);
  }

  // 2. تفعيل الاستماع السحابي لملف المستخدم
  if (user.id) {
    try {
      listenToCurrentUserProfile(user.id);
    } catch (e) {
      console.warn("Profile listener notice:", e);
    }
  }

  // 3. تحديث شارة المستخدم السريعة في الهيدر
  if (userQuickStatus) userQuickStatus.classList.remove("hidden");
  if (quickUserName) quickUserName.textContent = user.name;
  if (quickRoleBadge) {
    const roleMap = { supervisor: "مشرف", teacher: "معلم", presenter: "عارض", student: "طالب" };
    quickRoleBadge.textContent = roleMap[user.role] || "مشارك";
  }

  // 4. توجيه المستخدم لواجهته المخصصة بحسب دوره مع معالجة استثنائية كاملة لضمان عدم التعليق
  try {
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

      try { renderSupervisorDashboard(); } catch (e) { console.warn(e); }
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

      try { renderSupervisorDashboard(); } catch (e) { console.warn(e); }
      showView("supervisor");

      // تنشيط تبويب بنك الاختبارات والتأكد من إزالة أي تبويب غير متاح للمعلم
      try {
        document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-content-panel").forEach(p => p.classList.remove("active"));
        const quizTab = document.querySelector(".nav-tab[data-tab='tabQuizzes']");
        if (quizTab) quizTab.classList.add("active");
        document.getElementById("tabQuizzes")?.classList.add("active");
        localStorage.setItem("nour_saved_tab", "tabQuizzes");
      } catch (e) { console.warn(e); }

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

      try { renderSupervisorDashboard(); } catch (e) { console.warn(e); }
      showView("supervisor");

      // تنشيط تبويب العروض مباشرة
      try {
        document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-content-panel").forEach(p => p.classList.remove("active"));
        const liveTab = document.querySelector(".nav-tab[data-tab='tabLive']");
        if (liveTab) liveTab.classList.add("active");
        document.getElementById("tabLive")?.classList.add("active");
        localStorage.setItem("nour_saved_tab", "tabLive");
      } catch (e) { console.warn(e); }

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

      try { renderStudentPracticeQuizzes(); } catch (e) { console.warn(e); }
      try { renderHonorLeaderboardTab(); } catch (e) { console.warn(e); }
      showView("student");
    }
  } catch (err) {
    console.error("Error setting up view in finalizeUserSession:", err);
    showView(cleanRole === "student" ? "student" : "supervisor");
  } finally {
    hideGlobalLoader();
  }

  try {
    updateImpersonationBanner();
  } catch (e) {
    console.warn(e);
  }
}

// --------------------------------------------------------
// بناء وتحديث لوحة تحكم المشرف والمعلم
// --------------------------------------------------------
function renderSupervisorDashboard() {
  const isSupervisorRole = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name));
  const isPresenterRole = currentUser && currentUser.role === "presenter";
  const isTeacherRole = currentUser && currentUser.role === "teacher";

  // 1. التحكم في ظهور التبويبات بحسب الدور:
  // حصر كافة التبويبات الإدارية (الحسابات، الإحصائيات، إدارة الفرق، البطاقات التكتيكية، الإجراءات السريعة) للمشرف فقط
  const tabAccountsBtn = document.querySelector(".nav-tab[data-tab='tabAccounts']");
  const tabOverviewBtn = document.querySelector(".nav-tab[data-tab='tabOverview']");
  const tabQuizzesBtn = document.querySelector(".nav-tab[data-tab='tabQuizzes']");
  const tabLiveBtn = document.querySelector(".nav-tab[data-tab='tabLive']");
  const tabHonorBoardBtn = document.querySelector(".nav-tab[data-tab='tabHonorBoard']");
  const tabTeamsBtn = document.querySelector(".nav-tab[data-tab='tabTeams']");
  const tabTacticalCardsBtn = document.querySelector(".nav-tab[data-tab='tabTacticalCards']");
  const quickActionsBar = document.querySelector(".quick-actions-bar");

  const tabPastTournamentsBtn = document.querySelector(".nav-tab[data-tab='tabPastTournaments']");
  if (tabPastTournamentsBtn) tabPastTournamentsBtn.style.display = "inline-flex";

  if (isPresenterRole) {
    // العارض: يرى فقط شاشات العرض والمسابقات الحية ولوحة الشرف وأرشيف المسابقات السابقة
    if (tabAccountsBtn) tabAccountsBtn.style.display = "none";
    if (tabOverviewBtn) tabOverviewBtn.style.display = "none";
    if (quickActionsBar) quickActionsBar.style.display = "none";
    if (tabQuizzesBtn) tabQuizzesBtn.style.display = "none";
    if (tabTeamsBtn) tabTeamsBtn.style.display = "none";
    if (tabTacticalCardsBtn) tabTacticalCardsBtn.style.display = "none";
    if (tabLiveBtn) tabLiveBtn.style.display = "inline-flex";
    if (tabHonorBoardBtn) tabHonorBoardBtn.style.display = "inline-flex";

    const activePanel = document.querySelector(".tab-content-panel.active");
    if (!activePanel || (activePanel.id !== "tabLive" && activePanel.id !== "tabHonorBoard" && activePanel.id !== "tabPastTournaments")) {
      document.querySelectorAll(".tab-content-panel").forEach(p => p.classList.remove("active"));
      document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
      document.getElementById("tabLive")?.classList.add("active");
      tabLiveBtn?.classList.add("active");
    }
  } else if (isTeacherRole) {
    // المعلم: يرى فقط بنك الاختبارات ولوحة الشرف والمسابقات السابقة، ومخفي عنه تماماً تبويبات المشرف (الفرق، البطاقات، الحسابات، الإحصائيات)
    if (tabAccountsBtn) tabAccountsBtn.style.display = "none";
    if (tabOverviewBtn) tabOverviewBtn.style.display = "none";
    if (quickActionsBar) quickActionsBar.style.display = "none";
    if (tabTeamsBtn) tabTeamsBtn.style.display = "none";
    if (tabTacticalCardsBtn) tabTacticalCardsBtn.style.display = "none";
    if (tabLiveBtn) tabLiveBtn.style.display = "none";
    if (tabQuizzesBtn) tabQuizzesBtn.style.display = "inline-flex";
    if (tabHonorBoardBtn) tabHonorBoardBtn.style.display = "inline-flex";

    const activePanel = document.querySelector(".tab-content-panel.active");
    if (!activePanel || (activePanel.id !== "tabQuizzes" && activePanel.id !== "tabHonorBoard" && activePanel.id !== "tabPastTournaments")) {
      document.querySelectorAll(".tab-content-panel").forEach(p => p.classList.remove("active"));
      document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
      document.getElementById("tabQuizzes")?.classList.add("active");
      tabQuizzesBtn?.classList.add("active");
    }
  } else {
    // المشرف العام: يرى كافة الأقسام (الإحصائيات، الحسابات، الاختبارات، العروض، إدارة الفرق، البطاقات، لوحة الشرف، أرشيف المسابقات)
    if (tabAccountsBtn) tabAccountsBtn.style.display = "inline-flex";
    if (tabOverviewBtn) tabOverviewBtn.style.display = "inline-flex";
    if (tabQuizzesBtn) tabQuizzesBtn.style.display = "inline-flex";
    if (tabLiveBtn) tabLiveBtn.style.display = "inline-flex";
    if (tabHonorBoardBtn) tabHonorBoardBtn.style.display = "inline-flex";
    if (tabTeamsBtn) tabTeamsBtn.style.display = "inline-flex";
    if (tabTacticalCardsBtn) tabTacticalCardsBtn.style.display = "inline-flex";
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

  // 9. تبويب إدارة الفرق التنافسية
  try { renderTeamsManagementTab(); } catch (e) {}
}

// --------------------------------------------------------
// جدول الحسابات ونسخ الرابط المباشر والترقية
// --------------------------------------------------------
function renderAccountsTable() {
  if (!accountsTableBody) return;

  const rawSearch = accountsSearchInput ? accountsSearchInput.value.trim() : "";
  const searchTerm = normalizeArabic(rawSearch);
  const rawRoleFilter = roleFilterSelect ? roleFilterSelect.value : "all";
  const rawGradeFilter = gradeFilterSelect ? gradeFilterSelect.value : "all";

  const isAllRoles = !rawRoleFilter || rawRoleFilter.toLowerCase() === "all";
  const isAllGrades = !rawGradeFilter || rawGradeFilter.toLowerCase() === "all";

  const filtered = participantsCache.filter(user => {
    if (!user) return false;
    const userNameNorm = normalizeArabic(user.name || "");
    const userSchoolNorm = normalizeArabic(user.school || "");
    const matchesSearch = !searchTerm || 
      userNameNorm.includes(searchTerm) || 
      userSchoolNorm.includes(searchTerm);
    const matchesRole = isAllRoles || (user.role && user.role === rawRoleFilter);
    const matchesGrade = isAllGrades || (user.grade && user.grade.trim() === rawGradeFilter.trim());
    return matchesSearch && matchesRole && matchesGrade;
  });

  const subEl = document.querySelector(".table-title-group .table-subtitle");
  if (subEl) {
    subEl.textContent = `إجمالي الحسابات المسجلة: (${participantsCache.length}) حساب - يمكنك ترقية الحسابات (معلم، مشرف، عارض، طالب)، نسخ رابط الدخول المباشر، وتصنيف المدارس والفئات`;
  }

  if (filtered.length === 0) {
    accountsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <div style="padding: 24px; text-align: center;">
            <i class="fa-solid fa-users-slash" style="font-size: 32px; color: #94a3b8; margin-bottom: 10px; display: block;"></i>
            <span style="font-size: 15px; font-weight: 700; color: #64748b;">لا توجد حسابات مطابقة للبحث أو الفلتر المحدد حالياً</span>
            <div style="margin-top: 14px; display: flex; gap: 10px; justify-content: center; align-items: center;">
              <button type="button" id="btnEmptyStateRefreshAccounts" class="btn-duo-outline" style="font-size: 13px; padding: 7px 16px;">
                <i class="fa-solid fa-arrows-rotate"></i> جلب وتحديث الحسابات من السحابة الآن
              </button>
            </div>
          </div>
        </td>
      </tr>
    `;
    document.getElementById("btnEmptyStateRefreshAccounts")?.addEventListener("click", async () => {
      showToast("جاري جلب أحدث الحسابات من قاعدة البيانات السحابية...", "fa-cloud-arrow-down");
      await fetchParticipantsFromCloud(true);
      renderAccountsTable();
    });
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
    const safeUserDocId = u.id || getDocumentId(u.normalizedName || normalizeArabic(u.name || ""));
    const directUrl = `${baseUrl}?auth=${encodeURIComponent(safeUserDocId)}`;
    return `
      <tr>
        <td><strong>${idx + 1}</strong></td>
        <td><strong>${u.name || "بدون اسم"}</strong></td>
        <td>${roleLabels[u.role] || roleLabels.student}</td>
        <td>${u.school || "غير محدد"}</td>
        <td>${u.grade || "صف أول"}</td>
        <td><small style="color: #64748b;">${formatArabicDate(u.lastLoginAt)}</small></td>
        <td>
          <button type="button" class="btn-open-direct-link" data-id="${safeUserDocId}" title="فتح هذا الحساب ومعاينته مباشرة">
            <i class="fa-solid fa-right-to-bracket"></i> فتح الحساب
          </button>
        </td>
        <td>
          <div class="actions-cell-flex">
            <select class="form-control form-select select-change-role" data-id="${safeUserDocId}" style="padding: 4px 8px; font-size: 12px; width: auto;">
              <option value="student" ${u.role === 'student' ? 'selected' : ''}>طالب</option>
              <option value="teacher" ${u.role === 'teacher' ? 'selected' : ''}>معلم</option>
              <option value="supervisor" ${u.role === 'supervisor' ? 'selected' : ''}>مشرف</option>
              <option value="presenter" ${u.role === 'presenter' ? 'selected' : ''}>عارض</option>
            </select>
            <button class="btn-icon-action btn-edit-account" data-id="${safeUserDocId}" title="تعديل الحساب">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-icon-action delete btn-delete-account" data-id="${safeUserDocId}" title="حذف الحساب">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // مستمعات فتح الحساب مباشرة والدخول به (متاحة حصرياً للمشرف في جلسته المحلية)
  accountsTableBody.querySelectorAll(".btn-open-direct-link").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.getAttribute("data-id");
      const targetUser = participantsCache.find(p => p.id === userId) ||
                         participantsCache.find(p => getDocumentId(p.normalizedName || normalizeArabic(p.name || "")) === userId);
      if (targetUser) {
        showGlobalLoader("جاري الانتقال للحساب...", `يتم فتح حساب (${targetUser.name}) مباشرة`);
        try {
          if (currentUser && currentUser.role === "supervisor" && targetUser.role !== "supervisor") {
            sessionStorage.setItem("nour_supervisor_impersonation", JSON.stringify(currentUser));
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

  // ترقية وتغيير الدور
  accountsTableBody.querySelectorAll(".select-change-role").forEach(sel => {
    sel.addEventListener("change", async (e) => {
      const userId = sel.getAttribute("data-id");
      const newRole = e.target.value;
      const targetUser = participantsCache.find(p => p.id === userId) ||
                         participantsCache.find(p => getDocumentId(p.normalizedName || normalizeArabic(p.name || "")) === userId);
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
      const targetUser = participantsCache.find(p => p.id === userId) ||
                         participantsCache.find(p => getDocumentId(p.normalizedName || normalizeArabic(p.name || "")) === userId);
      if (targetUser) openAccountModal(targetUser);
    });
  });

  // حذف الحساب مع التأكيد داخل المنصة حصراً
  accountsTableBody.querySelectorAll(".btn-delete-account").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.getAttribute("data-id");
      const targetUser = participantsCache.find(p => p.id === userId) ||
                         participantsCache.find(p => getDocumentId(p.normalizedName || normalizeArabic(p.name || "")) === userId);
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
          const deleteDocId = targetUser.id || userId;
          await deleteDoc(doc(db, "participants", deleteDocId));
          participantsCache = participantsCache.filter(p => p.id !== deleteDocId && p.id !== userId);
          saveParticipants();
          renderAccountsTable();
          renderSupervisorDashboard();
          showToast(`تم حذف حساب (${targetUser.name}) سحابياً بنجاح!`, "fa-trash-can");
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
btnRefreshAccounts?.addEventListener("click", async () => {
  const icon = btnRefreshAccounts.querySelector("i");
  if (icon) icon.className = "fa-solid fa-arrows-rotate fa-spin";
  try {
    await fetchParticipantsFromCloud(true);
    renderAccountsTable();
    showToast(`تم تحديث قائمة الحسابات سحابياً (${participantsCache.length} حساب)`, "fa-circle-check");
  } catch (e) {
    renderAccountsTable();
    showToast("تم تحديث السجل بنجاح", "fa-arrows-rotate");
  } finally {
    if (icon) icon.className = "fa-solid fa-arrows-rotate";
  }
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
const accountModeSelectorGroup = document.getElementById("accountModeSelectorGroup");
const singleAccountNameGroup = document.getElementById("singleAccountNameGroup");
const batchAccountNamesGroup = document.getElementById("batchAccountNamesGroup");
const modalBatchNamesInput = document.getElementById("modalBatchNamesInput");

// مستمع التبديل بين النمط الفردي والجماعي في إضافة الحسابات
document.querySelectorAll("input[name='accountAddMode']").forEach(radio => {
  radio.addEventListener("change", (e) => {
    const isBatch = e.target.value === "batch";
    if (isBatch) {
      singleAccountNameGroup?.classList.add("hidden");
      batchAccountNamesGroup?.classList.remove("hidden");
      modalBatchNamesInput?.focus();
    } else {
      singleAccountNameGroup?.classList.remove("hidden");
      batchAccountNamesGroup?.classList.add("hidden");
      modalAccountName?.focus();
    }
  });
});

// نافذة تعديل ومراجعة الاسم غير الرباعي في الإضافة الجماعية
function requestNameCorrection(rawName, reason) {
  return new Promise((resolve) => {
    const modal = document.getElementById("editInvalidNameModal");
    const notice = document.getElementById("invalidNameReasonNotice");
    const input = document.getElementById("correctionQuadrupleNameInput");
    const btnConfirm = document.getElementById("btnConfirmCorrectedName");
    const btnSkip = document.getElementById("btnSkipInvalidName");
    const btnCancel = document.getElementById("btnCancelBatchProcess");

    if (!modal || !input) {
      resolve({ action: "skip" });
      return;
    }

    if (notice) {
      notice.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <strong>الاسم غير المستوفي:</strong> «${escapeHtml(rawName)}»<br><small style="margin-top:4px;display:block;">${escapeHtml(reason)}</small>`;
    }
    input.value = rawName;
    modal.classList.remove("hidden");
    input.focus();

    const cleanup = () => {
      if (btnConfirm) btnConfirm.onclick = null;
      if (btnSkip) btnSkip.onclick = null;
      if (btnCancel) btnCancel.onclick = null;
      modal.classList.add("hidden");
    };

    if (btnConfirm) {
      btnConfirm.onclick = () => {
        const corrected = input.value.trim();
        const check = validateQuadrupleName(corrected);
        if (!check.isValid) {
          showToast(check.message, "fa-triangle-exclamation");
          input.focus();
          return;
        }
        cleanup();
        resolve({ action: "corrected", name: corrected });
      };
    }

    if (btnSkip) {
      btnSkip.onclick = () => {
        cleanup();
        resolve({ action: "skip" });
      };
    }

    if (btnCancel) {
      btnCancel.onclick = () => {
        cleanup();
        resolve({ action: "cancel" });
      };
    }
  });
}

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

    // إخفاء محدد النمط الجماعي عند التعديل
    accountModeSelectorGroup?.classList.add("hidden");
    singleAccountNameGroup?.classList.remove("hidden");
    batchAccountNamesGroup?.classList.add("hidden");
  } else {
    accountModalTitle.innerHTML = `<i class="fa-solid fa-user-plus"></i> إضافة حساب جديد`;
    editAccountId.value = "";
    modalAccountName.value = "";
    modalAccountRole.value = "student";
    if (modalAccountSchool) modalAccountSchool.value = schoolsCache[0] || "";
    if (modalAccountGrade) modalAccountGrade.value = gradesCache[0] || "";

    // إظهار محدد النمط (فردي / جماعي) وضبطه على فردي كافتراضي
    accountModeSelectorGroup?.classList.remove("hidden");
    const rSingle = document.querySelector("input[name='accountAddMode'][value='single']");
    if (rSingle) rSingle.checked = true;
    singleAccountNameGroup?.classList.remove("hidden");
    batchAccountNamesGroup?.classList.add("hidden");
    if (modalBatchNamesInput) modalBatchNamesInput.value = "";
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

  const role = modalAccountRole.value;
  const school = modalAccountSchool.value;
  const grade = modalAccountGrade.value;
  const targetId = editAccountId.value;
  const mode = document.querySelector("input[name='accountAddMode']:checked")?.value || "single";

  // --------------------------------------------------------
  // حالة الإضافة الجماعية (دفعة أسماء مع التحقق والمراجعة الرباعية)
  // --------------------------------------------------------
  if (!targetId && mode === "batch") {
    const rawText = modalBatchNamesInput ? modalBatchNamesInput.value.trim() : "";
    if (!rawText) {
      showToast("يرجى كتابة الأسماء الرباعية أولاً (كل اسم في سطر مستقل)", "fa-triangle-exclamation");
      return;
    }

    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      showToast("يرجى كتابة اسم رباعي واحد على الأقل", "fa-triangle-exclamation");
      return;
    }

    accountModalForm.dataset.submitting = "true";
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري مراجعة وحفظ الأسماء...';
    }

    let addedCount = 0;
    let cancelled = false;
    const remainingLines = [];

    for (let i = 0; i < lines.length; i++) {
      let currentName = lines[i];
      let valid = validateQuadrupleName(currentName);

      if (!valid.isValid) {
        // نوقف العملية فورياً ونفتح نافذة التعديل للمشرف مع عرض الاسم
        const correctionResult = await requestNameCorrection(currentName, valid.message);
        if (correctionResult.action === "cancel") {
          cancelled = true;
          remainingLines.push(...lines.slice(i));
          break;
        } else if (correctionResult.action === "skip") {
          continue;
        } else if (correctionResult.action === "corrected") {
          currentName = correctionResult.name;
        }
      }

      const norm = normalizeArabic(currentName);
      const newId = getDocumentId(norm);
      const nowIso = new Date().toISOString();

      let existing = participantsCache.find(p => p.id === newId || p.normalizedName === norm);
      if (existing) {
        existing.name = currentName;
        existing.role = role;
        existing.school = school;
        existing.grade = grade;
        await syncParticipantToCloud(existing);
      } else {
        const newUser = {
          id: newId,
          name: currentName,
          normalizedName: norm,
          role,
          school,
          grade,
          firstLoginAt: nowIso,
          lastLoginAt: nowIso,
          loginCount: 1,
          totalScore: 0
        };
        participantsCache.push(newUser);
        await syncParticipantToCloud(newUser);
      }
      addedCount++;
    }

    saveParticipants();
    renderAccountsTable();
    renderSupervisorDashboard();

    if (cancelled) {
      if (modalBatchNamesInput) modalBatchNamesInput.value = remainingLines.join("\n");
      showToast(`تم إيقاف المراجعة. تم حفظ (${addedCount}) حسابات بنجاح، والأسماء المتبقية محفوظة لتعديلها.`, "fa-circle-info");
    } else {
      accountModal.classList.add("hidden");
      if (modalBatchNamesInput) modalBatchNamesInput.value = "";
      showToast(`تمت مراجعة وإضافة (${addedCount}) حسابات بنجاح في السحابة!`, "fa-circle-check");
    }

    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = origBtnHtml;
    }
    delete accountModalForm.dataset.submitting;
    return;
  }

  // --------------------------------------------------------
  // حالة الإضافة الفردية / التعديل
  // --------------------------------------------------------
  const name = modalAccountName.value.trim();
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
      showToast("تم تحديث بيانات الحساب في السحابة بنجاح!", "fa-circle-check");
    } else {
      // إضافة حساب جديد فردي
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
        loginCount: 1,
        totalScore: 0
      };
      participantsCache.push(newUser);
      await syncParticipantToCloud(newUser);
      showToast("تم إنشاء الحساب وحفظه في السحابة بنجاح!", "fa-circle-check");
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

// إضافة مجموعة مدارس دفعة واحدة (كل مدرسة في سطر)
document.getElementById("btnSubmitBatchSchools")?.addEventListener("click", () => {
  if (!currentUser || currentUser.role !== "supervisor") {
    showToast("هذه الصلاحية خاصة بالمشرف العام فقط", "fa-shield-halved");
    return;
  }
  const batchEl = document.getElementById("newSchoolsBatchInput");
  const raw = batchEl ? batchEl.value.trim() : "";
  if (!raw) {
    showToast("يرجى كتابة أسماء المدارس أولاً (كل مدرسة في سطر مستقل)", "fa-triangle-exclamation");
    return;
  }
  const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0);
  if (lines.length === 0) {
    showToast("يرجى كتابة اسم مدرسة واحدة على الأقل", "fa-triangle-exclamation");
    return;
  }

  let addedCount = 0;
  lines.forEach(schoolName => {
    if (!schoolsCache.includes(schoolName)) {
      schoolsCache.push(schoolName);
      addedCount++;
    }
  });

  if (addedCount > 0) {
    saveSchools();
    renderSchoolsAndGradesTags();
    updateDropdowns();
    if (batchEl) batchEl.value = "";
    showToast(`تمت إضافة (${addedCount}) مدارس جديدة إلى القائمة بنجاح!`, "fa-circle-check");
  } else {
    showToast("جميع المدارس المدخلة مسجلة مسبقاً في القائمة", "fa-circle-info");
  }
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

    showToast(isEdit ? `تم حفظ تعديل الاختبار «${title}» في السحابة وتحديثه للجميع بنجاح!` : `تم إنشاء الاختبار «${title}» وحفظه سحابياً للجميع بنجاح!`, "fa-circle-check");
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
    showToast("تم نسخ البرومبت الهندسي بنجاح! الصقه في ChatGPT أو Gemini أو Claude", "fa-clipboard-check");
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
    showToast("تم استيراد الاختبار بنجاح! راجع الأسئلة وعدلها ثم اضغط حفظ الاختبار", "fa-circle-check");

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

  // تفعيل تبديل نمط المسابقة (فردي vs فرق)
  const modeCardInd = document.getElementById("modeCardIndividual");
  const modeCardTms = document.getElementById("modeCardTeams");
  const teamsSecWrap = document.getElementById("teamsSelectionContainer");
  const tacGroup = document.getElementById("tacticalCardsSettingsGroup");

  modeCardInd?.addEventListener("click", () => {
    modeCardInd.classList.add("active");
    modeCardTms?.classList.remove("active");
    const radio = modeCardInd.querySelector("input");
    if (radio) radio.checked = true;
    teamsSecWrap?.classList.add("hidden");
    tacGroup?.classList.remove("hidden");
  });

  modeCardTms?.addEventListener("click", () => {
    modeCardTms.classList.add("active");
    modeCardInd?.classList.remove("active");
    const radio = modeCardTms.querySelector("input");
    if (radio) radio.checked = true;
    teamsSecWrap?.classList.remove("hidden");
    tacGroup?.classList.add("hidden");
    renderTeamsSelectOptions();
  });

  renderTeamsSelectOptions();

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

  const modeVal = document.querySelector('input[name="competitionMode"]:checked')?.value || "individual";
  const isTeamMode = modeVal === "teams";

  let teamA = null;
  let teamB = null;
  let teamSelectionState = "selecting";
  let selectedTournamentTeams = [];
  let tournamentState = null;

  if (isTeamMode) {
    const checkedBoxes = Array.from(document.querySelectorAll("#tournamentTeamsMultiSelectGrid .chk-tournament-team:checked"));
    const selectedIds = checkedBoxes.map(cb => cb.value);
    selectedTournamentTeams = selectedIds.map(id => teamsCache.find(t => t.id === id)).filter(Boolean);

    if (selectedTournamentTeams.length < 2) {
      if (teamsCache.length >= 2) {
        selectedTournamentTeams = [...teamsCache];
      } else {
        showToast("يرجى اختيار فريقين على الأقل لبدء بطولة الفرق!", "fa-triangle-exclamation");
        return;
      }
    }

    tournamentState = initTournamentBracket(selectedTournamentTeams);
    teamSelectionState = "selecting";
  }

  const roomName = newRoomNameInput.value.trim() || (isTeamMode 
    ? `بطولة الفرق الكبرى (${selectedTournamentTeams.length} فرق) - ${new Date().toLocaleDateString('ar-EG')}` 
    : `مسابقة نور البيان الكبرى - ${new Date().toLocaleDateString('ar-EG')}`);
  const quizId = roomQuizSelect.value || (quizzesCache[0]?.id || "quiz_default_1");
  const cardFreqSelect = document.getElementById("roomCardFrequencySelect");
  const cardFreq = cardFreqSelect ? cardFreqSelect.value : "4";
  const cardsEnabled = !isTeamMode && (cardFreq !== "off") && (roomTacticalCardsToggle ? roomTacticalCardsToggle.checked : true);
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
    phase: isTeamMode ? "team_stage" : "lobby",
    contestantId: null,
    contestantName: null,
    contestantSchool: null,
    contestantGrade: null,
    drawnQuestions: [],
    currentQuestionIdx: 0,
    createdAt: new Date().toISOString(),
    isTeamMatch: isTeamMode,
    tournamentState: tournamentState,
    teamSelectionState: isTeamMode ? "selecting" : "none",
    teamA: null,
    teamB: null,
    teams: selectedTournamentTeams,
    teamScores: {},
    teamScoresDetails: {},
    teamPlayerScores: isTeamMode ? {} : null,
    currentTeamRound: isTeamMode ? 1 : null,
    teamRoundStarted: false,
    teamRoundState: isTeamMode ? "selecting_teams" : null
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
      showToast("تم حفظ إعدادات الغرفة وصلاحيات الإجابة وتطبيقها عند الجميع فوراً!", "fa-circle-check", 3500);
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
// أدوات تحكم المشرف الفورية في مؤقت المسابقة اللحظي (رئيس المؤقت بالتزامن)
// --------------------------------------------------------
document.getElementById("btnSupPauseResumeTimer")?.addEventListener("click", async () => {
  if (!currentLiveRoom) return;
  const isSup = currentUser && (
    currentUser.role === "supervisor" ||
    isSupervisor(currentUser.name) ||
    currentUser.name === currentLiveRoom.leaderName ||
    currentUser.name === currentLiveRoom.creatorName
  );
  if (!isSup) return;

  const curTimer = currentLiveRoom.timerState || {};
  const isCurrentlyFrozen = !!(curTimer.isFrozen || curTimer.isCorrectionPaused);

  if (isCurrentlyFrozen) {
    // استئناف
    const remainingSecs = Math.max(1, Math.ceil(curTimer.freezeRemaining || curTimer.remainingSeconds || 15));
    const now = Date.now();
    const unfreezeTimer = {
      ...curTimer,
      isFrozen: false,
      isCorrectionPaused: false,
      endsAt: now + (remainingSecs * 1000),
      remainingSeconds: remainingSecs,
      updatedAt: now,
      supervisorAuthoritative: true
    };
    currentLiveRoom.timerState = unfreezeTimer;
    syncAndRunLiveTimer(unfreezeTimer);
    if (currentLiveRoom.id) {
      try {
        await updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
          timerState: unfreezeTimer,
          lastUpdated: serverTimestamp()
        });
      } catch (e) { console.warn("Sup unfreeze err:", e); }
    }
    showToast("▶️ استئناف المؤقت بالتزامن لجميع المشاركين", "fa-play", 2500);
  } else {
    // إيقاف مؤقت
    const now = Date.now();
    const remainingMs = Math.max(0, (curTimer.endsAt || (now + 30000)) - now);
    const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
    const freezeTimer = {
      ...curTimer,
      isFrozen: true,
      isCorrectionPaused: false,
      freezeRemaining: remainingSecs,
      remainingSeconds: remainingSecs,
      pausedBy: currentUser.name,
      updatedAt: now,
      supervisorAuthoritative: true
    };
    currentLiveRoom.timerState = freezeTimer;
    syncAndRunLiveTimer(freezeTimer);
    if (currentLiveRoom.id) {
      try {
        await updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
          timerState: freezeTimer,
          lastUpdated: serverTimestamp()
        });
      } catch (e) { console.warn("Sup pause err:", e); }
    }
    showToast(`⏸️ تم إيقاف المؤقت مؤقتاً عند (${remainingSecs} ثانية) بالتزامن للجميع`, "fa-pause", 2500);
  }
});

document.getElementById("btnSupAdd15s")?.addEventListener("click", async () => {
  if (!currentLiveRoom) return;
  const isSup = currentUser && (
    currentUser.role === "supervisor" ||
    isSupervisor(currentUser.name) ||
    currentUser.name === currentLiveRoom.leaderName ||
    currentUser.name === currentLiveRoom.creatorName
  );
  if (!isSup) return;

  const now = Date.now();
  const curTimer = currentLiveRoom.timerState || {};
  const currentEndsAt = curTimer.endsAt || (now + 30000);
  const newEndsAt = currentEndsAt + 15000;
  const newFreeze = (curTimer.freezeRemaining || 15) + 15;
  const newRem = Math.ceil(Math.max(0, newEndsAt - now) / 1000);

  const updatedTimer = {
    ...curTimer,
    endsAt: newEndsAt,
    freezeRemaining: curTimer.isFrozen ? newFreeze : undefined,
    remainingSeconds: curTimer.isFrozen ? newFreeze : newRem,
    updatedAt: now,
    supervisorAuthoritative: true
  };
  currentLiveRoom.timerState = updatedTimer;
  syncAndRunLiveTimer(updatedTimer);
  if (currentLiveRoom.id) {
    try {
      await updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
        timerState: updatedTimer,
        lastUpdated: serverTimestamp()
      });
    } catch (e) { console.warn("Sup add 15s err:", e); }
  }
  try { soundFX.btnClick(); } catch (e) {}
  showToast("⏱️ أضاف المشرف +15 ثانية إضافية للوقت بالتزامن للجميع!", "fa-clock", 2500);
});

document.getElementById("btnSupResetTimer")?.addEventListener("click", async () => {
  if (!currentLiveRoom) return;
  const isSup = currentUser && (
    currentUser.role === "supervisor" ||
    isSupervisor(currentUser.name) ||
    currentUser.name === currentLiveRoom.leaderName ||
    currentUser.name === currentLiveRoom.creatorName
  );
  if (!isSup) return;

  const timeLimit = currentLiveRoom.questionTimer || 30;
  const now = Date.now();
  const resetTimer = {
    questionIdx: currentQuestionIndex,
    duration: timeLimit,
    startedAt: now,
    endsAt: now + (timeLimit * 1000),
    remainingSeconds: timeLimit,
    isFrozen: false,
    isCorrectionPaused: false,
    updatedAt: now,
    supervisorAuthoritative: true
  };
  currentLiveRoom.timerState = resetTimer;
  syncAndRunLiveTimer(resetTimer);
  if (currentLiveRoom.id) {
    try {
      await updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
        timerState: resetTimer,
        lastUpdated: serverTimestamp()
      });
    } catch (e) { console.warn("Sup reset timer err:", e); }
  }
  try { soundFX.btnClick(); } catch (e) {}
  showToast("تم إعادة ضبط وقت السؤال بالكامل بالتزامن للجميع!", "fa-rotate-left", 2500);
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

// مستمع زر العودة لاختيار وتعديل الفرق في حال اختيار فريق بالخطأ
document.getElementById("btnReturnToTeamSelect")?.addEventListener("click", () => {
  if (typeof handleReturnToTeamSelection === "function") {
    handleReturnToTeamSelection();
  }
});
document.getElementById("btnEntranceReturnToTeamSelect")?.addEventListener("click", () => {
  if (typeof handleReturnToTeamSelection === "function") {
    handleReturnToTeamSelection();
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

// ------ بدء المسابقة: الانتقال لمرحلة اختيار الطالب أو استعراض الفرق ------
btnStartLiveContest?.addEventListener("click", async () => {
  if (!currentLiveRoom) return;
  if (currentLiveRoom.isTeamMatch) {
    await startTeamContestLobbyToEntrance();
    return;
  }
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
  contestantScore = 0;
  currentLiveRoom.contestantId = student.id;
  currentLiveRoom.contestantName = student.name;
  currentLiveRoom.contestantSchool = student.school || "--";
  currentLiveRoom.contestantGrade = student.grade || "--";
  currentLiveRoom.contestantInitialBaseScore = contestantBaseScore;
  currentLiveRoom.contestantScore = 0;
  currentLiveRoom.highestLockedScore = 0;
  currentLiveRoom.answeredQuestionsLog = {};
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

  const secList = Array.isArray(currentQuizData.sections) ? currentQuizData.sections : [];
  if (secList.length > 0 && (!currentLiveRoom.sectionCounts || Object.keys(currentLiveRoom.sectionCounts).length === 0)) {
    const totalInQuiz = secList.reduce((a, s) => a + (Array.isArray(s?.questions) ? s.questions.length : 0), 0);
    const perStudent = currentLiveRoom?.questionsPerStudent || (totalInQuiz || 5);
    const counts = {};
    secList.forEach(s => {
      const secTotal = Array.isArray(s.questions) ? s.questions.length : 0;
      counts[s.sectionName] = Math.max(1, Math.round((secTotal / (totalInQuiz || 1)) * perStudent));
    });
    currentLiveRoom.sectionCounts = counts;
    if (currentLiveRoom.id) {
      updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
        sectionCounts: counts,
        lastUpdated: serverTimestamp()
      }).catch(() => {});
    }
  }

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

  // بناء عرض الأقسام مع أدوات اختيار كم سؤال في كل قسم للمشرف والتزامن الكامل للجميع بأنيميشن مبهج
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
            <div class="draw-section-stepper observer-synced-stepper">
              <span class="stepper-label"><i class="fa-solid fa-list-check"></i> المحدد:</span>
              <span class="draw-step-val" id="drawSecVal_${idx}">${currentVal}</span>
            </div>
          `}
          <div class="draw-counter-group">
            <span class="draw-counter-badge ${isDrawn ? 'done' : ''}" id="drawBadge_${idx}">
              ${isDrawn ? `${drawnCount} / ${currentVal}` : `0 / ${currentVal}`}
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
        try { soundFX.btnClick(); } catch (e) {}

        const valEl = document.getElementById(`drawSecVal_${idx}`);
        if (valEl) {
          valEl.classList.remove("draw-count-bump");
          void valEl.offsetWidth;
          valEl.classList.add("draw-count-bump");
        }

        // بث فوري سحابي لعدد الأسئلة المختارة لكل قسم ليتزامن عند الجميع
        if (currentLiveRoom.id) {
          updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
            sectionCounts: currentLiveRoom.sectionCounts,
            sectionCountUpdate: { secName: sec.sectionName, count: val, secIdx: idx, timestamp: Date.now() },
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
        showToast(`اكتمل سحب جميع الأقسام (${drawnQuestions.length} سؤالاً) بالتزامن للجميع!`, "fa-dice", 3500);
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
          badge.textContent = `${targetCount} / ${portion}`;
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

  // إزالة أي تحويلات أو حواشي متبقية
  cardEl.style.transform = '';
  cardEl.style.marginBottom = '';
  cardEl.classList.remove("auto-scale-fit");

  const adjustLayout = () => {
    try {
      const viewportH = window.innerHeight;
      const headerEl = document.querySelector(".main-header");
      const headerH = headerEl ? headerEl.offsetHeight : 54;
      const contestantBanner = document.querySelector(".current-contestant-banner");
      const bannerH = (contestantBanner && !contestantBanner.classList.contains("hidden")) ? contestantBanner.offsetHeight : 50;
      const supBar = document.getElementById("supervisorControlBar");
      const supBarH = (supBar && !supBar.classList.contains("hidden")) ? supBar.offsetHeight : 0;

      const availableH = viewportH - headerH - bannerH - supBarH - 35;
      const cardScrollH = cardEl.scrollHeight;

      // ضبط الكثافة التلقائية للسؤال إذا كان طويلاً أو يحتوي على خيارات كثيرة
      if (cardScrollH > availableH && availableH > 260) {
        cardEl.classList.add("question-compact-density");
      } else {
        cardEl.classList.remove("question-compact-density");
      }

      // تمرير ناعم ومريح لضمان رؤية السؤال وخياراته بوضوح تام دون اقتطاع
      const topOffset = headerH + 8;
      const cardRect = cardEl.getBoundingClientRect();
      if (cardRect.top < topOffset || cardRect.bottom > viewportH) {
        window.scrollTo({
          top: Math.max(0, window.pageYOffset + cardRect.top - topOffset),
          behavior: "smooth"
        });
      }
    } catch (e) {}
  };

  adjustLayout();
  requestAnimationFrame(adjustLayout);
}

// إعادة ضبط التخطيط تلقائياً عند تغيير مقاس الشاشة أو استدارتها دون إعادة تحميل الصفحة
window.addEventListener("resize", () => {
  const cardEl = document.querySelector(".stage-question-card");
  if (cardEl && document.getElementById("arenaStage") && !document.getElementById("arenaStage").classList.contains("hidden")) {
    bringQuestionCardIntoView(cardEl);
  }
});

// =========================================================
// المؤقت اللحظي السحابي الموحد والمزامن عبر Firestore لجميع المتسابقين والعارض والمشرف
// المشرف هو المرجع الأساسي (رئيس المؤقت)، ومزامنة دقيقة 100ms بدون أي فرق في الساعات
// =========================================================
let lastTimerConfigKey = "";
let supervisorClockOffset = 0;

// تحديث نص وأيقونة زر الإيقاف/الاستئناف للمشرف
function updateSupervisorTimerButtonUI(isFrozen) {
  const btnText = document.getElementById("btnSupPauseResumeTimerText");
  const btn = document.getElementById("btnSupPauseResumeTimer");
  if (!btn) return;
  if (isFrozen) {
    btn.innerHTML = `<i class="fa-solid fa-play" style="color: #16a34a;"></i> <span id="btnSupPauseResumeTimerText">استئناف</span>`;
  } else {
    btn.innerHTML = `<i class="fa-solid fa-pause" style="color: #f59e0b;"></i> <span id="btnSupPauseResumeTimerText">إيقاف</span>`;
  }
}

// إيقاف التايمر فوراً للجميع بالتزامن أثناء تصحيح وترتيب الكلمات أو فحص الأزواج
function pauseLiveTimerForCorrection(remainingSecs = null) {
  if (liveTimerInterval) {
    clearInterval(liveTimerInterval);
    liveTimerInterval = null;
  }
  lastTimerConfigKey = "correction_paused";
  const timerDisplay = stageTimerSeconds;
  const timerPill = document.getElementById("stageTimerPill");
  if (timerDisplay) {
    timerDisplay.innerHTML = `<span style="font-size: 13.5px; color: #d97706; font-weight: 800;"><i class="fa-solid fa-pause"></i> جاري التصحيح</span>`;
  }
  if (timerPill) {
    timerPill.classList.remove("timer-urgent", "timer-infinite");
    timerPill.classList.add("timer-frozen");
  }
  updateSupervisorTimerButtonUI(true);
}

// إيقاف التايمر فوراً للجميع بالتزامن أثناء اختيار بطاقة من محفظة البطاقات التكتيكية
function pauseLiveTimerForWalletSelection(remainingSecs = null) {
  if (liveTimerInterval) {
    clearInterval(liveTimerInterval);
    liveTimerInterval = null;
  }
  lastTimerConfigKey = "wallet_selection_paused";
  const timerDisplay = stageTimerSeconds;
  const timerPill = document.getElementById("stageTimerPill");
  if (timerDisplay) {
    timerDisplay.innerHTML = `<span style="font-size: 13.5px; color: #6366f1; font-weight: 800;"><i class="fa-solid fa-layer-group"></i> اختيار بطاقة</span>`;
  }
  if (timerPill) {
    timerPill.classList.remove("timer-urgent", "timer-infinite");
    timerPill.classList.add("timer-frozen");
  }
  updateSupervisorTimerButtonUI(true);
}

// استئناف التايمر بعد انتهاء اختيار البطاقة واستعراضها
function resumeLiveTimerAfterWalletSelection(remainingSecs = null) {
  const secs = Math.max(1, Math.ceil(remainingSecs || currentLiveRoom?.timerState?.freezeRemaining || currentLiveRoom?.timerState?.remainingSeconds || liveTimeRemaining || 15));
  const now = Date.now();
  const unfreezeTimer = {
    ...(currentLiveRoom?.timerState || {}),
    isFrozen: false,
    isCorrectionPaused: false,
    isWalletSelectionPaused: false,
    endsAt: now + (secs * 1000),
    remainingSeconds: secs,
    freezeRemaining: secs,
    updatedAt: now
  };
  if (currentLiveRoom) {
    currentLiveRoom.timerState = unfreezeTimer;
  }
  syncAndRunLiveTimer(unfreezeTimer);
  if (currentLiveRoom?.id) {
    updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
      timerState: unfreezeTimer,
      lastUpdated: serverTimestamp()
    }).catch(e => console.warn("Resume timer notice after wallet selection:", e));
  }
  updateSupervisorTimerButtonUI(false);
}

// استئناف التايمر بعد انتهاء التصحيح (في حال وجود فرصة ثانية)
function resumeLiveTimerAfterCorrection(remainingSecs) {
  const secs = Math.max(1, Math.ceil(remainingSecs || liveTimeRemaining || 15));
  const now = Date.now();
  const unfreezeTimer = {
    ...(currentLiveRoom?.timerState || {}),
    isFrozen: false,
    isCorrectionPaused: false,
    isWalletSelectionPaused: false,
    endsAt: now + (secs * 1000),
    remainingSeconds: secs,
    updatedAt: now
  };
  if (currentLiveRoom) {
    currentLiveRoom.timerState = unfreezeTimer;
  }
  syncAndRunLiveTimer(unfreezeTimer);
  if (currentLiveRoom?.id) {
    updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
      timerState: unfreezeTimer,
      lastUpdated: serverTimestamp()
    }).catch(e => console.warn("Resume timer notice:", e));
  }
  updateSupervisorTimerButtonUI(false);
}

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

  // تحديث حالة زر الإيقاف/الاستئناف للمشرف
  updateSupervisorTimerButtonUI(!!(timerState.isFrozen || timerState.isCorrectionPaused || timerState.isWalletSelectionPaused));

  // 1. فحص ميزة "بلا حد زمني" (بطاقة تكتيكية)
  if (timerState.noTimeLimit) {
    if (liveTimerInterval) { clearInterval(liveTimerInterval); liveTimerInterval = null; }
    lastTimerConfigKey = "no_time_limit";
    timerDisplay.textContent = "∞";
    liveTimeRemaining = 9999;
    if (timerPill) {
      timerPill.classList.remove("timer-urgent", "timer-frozen");
      timerPill.classList.add("timer-infinite");
    }
    return;
  }

  // 2. فحص حالة التجميد أو إيقاف المؤقت (بسبب التصحيح أو إيقاف المشرف أو بطاقة التجميد أو اختيار بطاقة من المحفظة)
  if (timerState.isFrozen || timerState.isCorrectionPaused || timerState.isWalletSelectionPaused) {
    if (liveTimerInterval) { clearInterval(liveTimerInterval); liveTimerInterval = null; }
    const frozenSecs = Math.max(0, Math.ceil(timerState.freezeRemaining || timerState.remainingSeconds || 0));
    liveTimeRemaining = frozenSecs;
    lastTimerConfigKey = `frozen_${frozenSecs}_${timerState.isCorrectionPaused ? 'corr' : (timerState.isWalletSelectionPaused ? 'wallet' : 'pause')}`;
    
    if (timerState.isCorrectionPaused) {
      timerDisplay.innerHTML = `<span style="font-size: 13.5px; color: #d97706; font-weight: 800;"><i class="fa-solid fa-pause"></i> جاري التصحيح</span>`;
    } else if (timerState.isWalletSelectionPaused) {
      timerDisplay.innerHTML = `<span style="font-size: 13.5px; color: #6366f1; font-weight: 800;"><i class="fa-solid fa-layer-group"></i> اختيار بطاقة</span>`;
    } else {
      timerDisplay.textContent = `${frozenSecs} ⏸️`;
    }

    if (timerPill) {
      timerPill.classList.remove("timer-urgent", "timer-infinite");
      timerPill.classList.add("timer-frozen");
    }
    return;
  }

  // 3. معايرة التوقيت مع المشرف (المشرف هو رأس المؤقت ومرجعه الأساسي)
  const isSupervisorUser = currentUser && (
    currentUser.role === "supervisor" ||
    isSupervisor(currentUser.name) ||
    currentUser.name === currentLiveRoom?.leaderName ||
    currentUser.name === currentLiveRoom?.creatorName
  );

  // إذا لم يكن المستخدم هو المشرف، يعاير ساعته مع جهاز المشرف لمنع أي تفاوت زمني
  if (!isSupervisorUser && timerState.updatedAt) {
    supervisorClockOffset = timerState.updatedAt - Date.now();
  } else if (isSupervisorUser) {
    supervisorClockOffset = 0;
  }

  const qIdx = timerState.questionIdx ?? 0;
  const endsAt = timerState.endsAt || (Date.now() + 30000);
  const configKey = `${qIdx}_${endsAt}_running`;

  // منع إعادة إنشاء العداد بشكل متكرر إذا كان يعمل بالفعل على نفس الإعداد
  if (liveTimerInterval && lastTimerConfigKey === configKey) {
    return;
  }

  if (liveTimerInterval) {
    clearInterval(liveTimerInterval);
    liveTimerInterval = null;
  }
  lastTimerConfigKey = configKey;

  if (timerPill) {
    timerPill.classList.remove("timer-infinite", "timer-frozen");
  }

  let heartbeatCounter = 0;

  const updateTick = () => {
    // الوقت المصحح بدقة المشرف المطلقة
    const calibratedNow = Date.now() + supervisorClockOffset;
    const remainingMs = Math.max(0, endsAt - calibratedNow);
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

    // إذا كان المستخدم الحالي هو المشرف: يبث نبضة مزامنة دورية خفيفة كل ثانيتين لضمان تطابق الجميع
    if (isSupervisorUser && currentLiveRoom?.id && remainingSecs > 0) {
      heartbeatCounter++;
      if (heartbeatCounter % 20 === 0) { // كل 2 ثانية (100ms * 20)
        updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
          "timerState.remainingSeconds": remainingSecs,
          "timerState.updatedAt": Date.now(),
          lastUpdated: serverTimestamp()
        }).catch(() => {});
      }
    }

    if (remainingMs <= 0) {
      clearInterval(liveTimerInterval);
      liveTimerInterval = null;
      lastTimerConfigKey = "";
      timerDisplay.textContent = "0";

      const executeTimeout = () => {
        if (typeof onTimeout === "function") {
          onTimeout();
        } else {
          handleLiveQuestionTimeout();
        }
      };

      if (!isQuestionTransitionRunning) {
        executeTimeout();
      } else {
        if (Date.now() - transitionStartTime > 3500) {
          isQuestionTransitionRunning = false;
          executeTimeout();
        } else {
          setTimeout(() => {
            if (!isAdvancingQuestion) {
              isQuestionTransitionRunning = false;
              executeTimeout();
            }
          }, 600);
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
let isAdvancingQuestion = false;
let transitionStartTime = 0;
let questionTransitionWatchdog = null;

function handleLiveQuestionTimeout() {
  if (isAdvancingQuestion) return;
  if (isQuestionTransitionRunning) {
    if (Date.now() - transitionStartTime > 3500) {
      isQuestionTransitionRunning = false;
    } else {
      setTimeout(() => {
        if (!isAdvancingQuestion) handleLiveQuestionTimeout();
      }, 500);
      return;
    }
  }

  const allQ = (currentLiveRoom?.drawnQuestions && currentLiveRoom.drawnQuestions.length > 0)
    ? currentLiveRoom.drawnQuestions
    : (currentQuizData?.sections?.flatMap(s => s.questions || []) || []);
  const curQ = allQ[currentLiveRoom?.currentQuestionIdx || 0] || {};
  
  // فحص بطاقة الحصانة (درع الأمان)
  const basePoints = (typeof curQ.points === "number" && curQ.points > 0) ? curQ.points : 3;
  const hasImmunity = !!(activeCardEffect?.effect?.immunity);
  let penalty = 0;
  if (hasImmunity) {
    showToast("درع الأمان (الحصانة): انتهى الوقت ولكن تم إلغاء أي خصم درجات!", "fa-shield-halved", 3500);
    activeCardEffect = null;
  } else {
    // خصم نصف النقاط التي كان المفروض أن يحصل عليها لو جاوب صح
    penalty = Math.max(1, Math.round(basePoints / 2));
    showToast(`انتهى الوقت المحدد للسؤال! تم خصم ${penalty} درجات (نصف نقاط السؤال) والانتقال للوحة الشرف`, "fa-clock", 3500);
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
    currentStageAdvanceToNext(-penalty, penalty > 0, false, null, true, 0, basePoints);
  } else if (typeof advanceToNext === "function") {
    advanceToNext(-penalty, penalty > 0, false, null, true, 0, basePoints);
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
    titleEl.textContent = "ما شاء الله! إجابة صحيحة ومتقنة";
    pointsEl.textContent = `+${scoreDelta} درجات`;
    try { soundFX.correct(); } catch (e) {}
  } else if (isTimeout) {
    overlay.classList.add("wrong", "timeout");
    iconEl.innerHTML = `<i class="fa-solid fa-hourglass-end"></i>`;
    titleEl.textContent = "انتهى الوقت المحدد للسؤال";
    pointsEl.textContent = scoreDelta !== 0 ? `${scoreDelta} درجات` : "استعن بالله وركّز في السؤال القادم";
    if (questionCardEl) questionCardEl.classList.add("question-wrong-shake");
    try { soundFX.wrong(); } catch (e) {}
  } else {
    overlay.classList.add("wrong");
    iconEl.innerHTML = `<i class="fa-solid fa-circle-xmark"></i>`;
    titleEl.textContent = "إجابة غير دقيقة";
    pointsEl.textContent = scoreDelta !== 0 ? `${scoreDelta} درجات` : "استعن بالله وركّز في السؤال القادم";
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
  if (freq === "quarter") {
    // كل ربع الأسئلة (مثال: في 20 سؤال تظهر 5 مرات بمعدل كل 4 أسئلة)
    const quarterStep = Math.max(1, Math.floor(totalQ / 5) || 4);
    return ((currentIdx + 1) % quarterStep === 0);
  }
  return ((currentIdx + 1) % 4 === 0);
}

// =========================================================
function playQuestionTransitionSequence({ isCorrect, scoreDelta, isPenalty, nextIdx, isFinished, allQuestions, currentIdx, isLeaderUser = true, isTimeout = false, cardBonus = 0, basePoints = 0 }) {
  isQuestionTransitionRunning = true;
  transitionStartTime = Date.now();

  let transitionFinished = false;
  const finishTransitionSafely = () => {
    if (transitionFinished) return;
    transitionFinished = true;
    if (questionTransitionWatchdog) {
      clearTimeout(questionTransitionWatchdog);
      questionTransitionWatchdog = null;
    }
    isQuestionTransitionRunning = false;
    isAdvancingQuestion = false;

    // إنهاء أي بطاقات فورية للسؤال المنتهي فوراً
    expireInstantCardEffects();

    if (isFinished) {
      finishContestant();
    } else {
      if (isLeaderUser && currentLiveRoom) {
        currentLiveRoom.currentQuestionIdx = nextIdx;
        currentLiveRoom.contestantScore = contestantScore;
        saveRooms(currentLiveRoom);
      }

      const totalQ = allQuestions.length || 20;
      const isCardTurn = shouldTriggerTacticalCards(currentLiveRoom, currentIdx, nextIdx, totalQ);

      if (isCardTurn) {
        expireCycleCardEffects();
        const canGenerate = isLeaderUser || checkIsSolverAllowed(currentLiveRoom);
        if (canGenerate) {
          triggerTacticalCardsModal(() => loadStageQuestion(nextIdx), nextIdx);
        } else {
          // للمشاهدين والعارضين: إذا كانت البطاقات مفتوحة بالفعل سحابياً، نعرضها بأنيميشن جميل
          if (currentLiveRoom?.activeCardsTurn?.isOpen && Array.isArray(currentLiveRoom.activeCardsTurn.cards)) {
            showSynchronizedTacticalCardsModal(currentLiveRoom.activeCardsTurn.cards, nextIdx);
          } else {
            showToast("🃏 حان موعد ظهور البطاقات التكتيكية! بانتظار استعراض واختيار البطاقة...", "fa-layer-group", 4000);
          }
        }
      } else {
        loadStageQuestion(nextIdx);
      }
    }
  };

  // صمام أمان حاسم: يمنع تعليق الانتقال إطلاقاً إذا حدث أي تأخير أو عائق غير متوقع (12.5 ثانية تتيح للوحة الشرف وعداد النقاط الاكتمال بطلاقة)
  if (questionTransitionWatchdog) clearTimeout(questionTransitionWatchdog);
  questionTransitionWatchdog = setTimeout(() => {
    if (!transitionFinished) {
      console.warn("Safety Watchdog: release transition at question", nextIdx);
      finishTransitionSafely();
    }
  }, 12500);

  // 1. إظهار غطاء النتيجة الكبير الذي يغطي السؤال بالكامل ويطلع من تحت بأنيميشن صعود مبهج
  showBigQuestionResultOverlay({ isCorrect, isTimeout, scoreDelta });

  // 2. إظهار شريط نتيجة الإجابة الفورية أسفل الخيارات أيضاً مع تفصيل نقاط البطاقات
  const existingFeedback = stageInteractiveArea.querySelector(".answer-feedback-banner");
  if (!existingFeedback) {
    const fb = document.createElement("div");
    fb.className = `answer-feedback-banner ${isCorrect ? "correct" : "wrong"}`;
    if (isCorrect) {
      const breakdownText = (cardBonus > 0 && basePoints > 0)
        ? `+${basePoints} أساسي + ${cardBonus} بطاقات تكتيكية تم احتسابها لرصيدك سحابياً`
        : `+${scoreDelta} درجات تم احتسابها لرصيدك سحابياً`;
      fb.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
          <i class="fa-solid fa-circle-check" style="font-size:30px;color:#16a34a;"></i>
          <div>
            <div style="font-weight:900;font-size:16.5px;color:#14532d;">ما شاء الله تبارك الله! أحسنت، إجابة متقنة</div>
            <div style="font-size:13px;color:#15803d;font-weight:700;">${breakdownText}</div>
          </div>
        </div>
        <div class="honor-score-delta-group">
          ${(cardBonus > 0 && basePoints > 0) ? `
            <span class="score-delta-popup bonus-base">+${basePoints} أساسي</span>
            <span class="score-delta-popup bonus-cards"><i class="fa-solid fa-bolt"></i> +${cardBonus} بطاقات</span>
          ` : `
            <div class="score-increase-badge" style="font-size:16px;">+${scoreDelta}</div>
          `}
        </div>
      `;
    } else {
      fb.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
          <i class="fa-solid fa-circle-xmark" style="font-size:30px;color:#dc2626;"></i>
          <div>
            <div style="font-weight:900;font-size:16.5px;color:#7f1d1d;">${isTimeout ? "انتهى الوقت المحدد للسؤال" : "إجابة غير دقيقة"}</div>
            <div style="font-size:13px;color:#991b1b;font-weight:700;">${scoreDelta < 0 ? `تم خصم ${Math.abs(scoreDelta)} درجات من الرصيد` : "المثابرة والمراجعة هما سر التفوق والتميّز"}</div>
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

    // 4. بعد انتهاء تلاشي السؤال (420ms)، ظهور لوحة الشرف بأنيميشن جميل وعرض تفاصيل نقاط البطاقات
    setTimeout(() => {
      try {
        showHonorBoardModal(false, () => {
          finishTransitionSafely();
        }, currentContestant?.name, scoreDelta, isPenalty, cardBonus, basePoints);
      } catch (err) {
        console.warn("Honor board display notice:", err);
        finishTransitionSafely();
      }
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
  // استعادة النقاط من سجل الإجابات المعتمد أو بيانات الغرفة السحابية كمرجع موحد وأساسي لجميع الأجهزة والشاشات
  if (room.answeredQuestionsLog && typeof room.answeredQuestionsLog === "object") {
    contestantScore = calculateSessionScoreFromLog(room.answeredQuestionsLog);
  } else {
    contestantScore = typeof room.contestantScore === "number" ? room.contestantScore : 0;
  }

  // الرصيد الابتدائي الأساسي للمتسابق عند بدء الجلسة
  if (typeof room.contestantInitialBaseScore === "number") {
    contestantBaseScore = room.contestantInitialBaseScore;
  } else {
    const pFound = participantsCache.find(x => x.name === currentContestant.name || x.id === currentContestant.id);
    contestantBaseScore = (pFound && typeof pFound.totalScore === "number") ? pFound.totalScore : (currentContestant.totalScore || 0);
    room.contestantInitialBaseScore = contestantBaseScore;
  }

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
      showFloatingCardPill("+3 نقاط تخطي ذكي", "fa-forward-fast", "gold");

      if (currentLiveRoom?.id) {
        updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
          skippedQuestionIndices: currentSkipped,
          contestantScore: contestantScore,
          lastUpdated: serverTimestamp()
        }).catch(err => console.warn("Sync skipped question notice:", err));
      }

      modalPreSkipQuestion.classList.add("hidden");
      showToast(`تم اعتماد تخطي السؤال (${targetIdx + 1}) مسبقاً! واحتساب 3 نقاط ذهبية للمتسابق`, "fa-circle-check", 4000);
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
  isAdvancingQuestion = false;
  isQuestionTransitionRunning = false;
  lastSeenOrderingTimestamp = 0;
  lastSeenOrderingVerifyTimestamp = 0;
  lastSeenMatchingVerifyTimestamp = 0;
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

  // الانتقال للسؤال التالي مع اعتماد وتسجيل النتيجة ذرية دون أي تكرار
  function advanceToNext(scoreDelta = 0, isPenalty = false, isCorrect = true, chosenChoiceIdx = null, isTimeout = false, cardBonus = 0, basePoints = 0) {
    if (isAdvancingQuestion) return;
    isAdvancingQuestion = true;
    clearInterval(liveTimerInterval);
    liveTimerInterval = null;
    lastTimerConfigKey = "";

    // استخدام محرك النقاط الموحد والموثوق لتسجيل النتيجة مرة واحدة فقط ومنع أي تكرار شبكي
    const recordResult = recordAnswerIdempotent(currentLiveRoom, {
      questionIdx: idx,
      isCorrect,
      isTimeout,
      basePoints,
      cardBonus,
      penalty: isPenalty ? Math.abs(scoreDelta) : 0,
      scoreDelta,
      chosenChoiceIdx,
      answeredBy: currentUser?.name || "المتسابق"
    });

    contestantScore = recordResult.contestantScore;
    if (stageStudentScore) stageStudentScore.textContent = String(contestantScore);

    // إنهاء أي بطاقة فورية سارية على هذا السؤال فوراً
    expireInstantCardEffects();
    activeCardEffect = null;

    const nextIdx = idx + 1;
    const isFinished = nextIdx >= allQuestions.length;

    // بث نتيجة الإجابة سحابياً للغرفة الحية مع سجل الإجابات المعتمد ونقاط البطاقات
    if (currentLiveRoom) {
      const answerPayload = {
        questionIdx: idx,
        chosenChoiceIdx: chosenChoiceIdx,
        isCorrect: isCorrect,
        isTimeout: isTimeout,
        scoreDelta: scoreDelta,
        cardBonus: cardBonus,
        basePoints: basePoints,
        isPenalty: isPenalty,
        contestantScore: contestantScore,
        answeredBy: currentUser?.name || "المتسابق",
        timestamp: Date.now()
      };
      currentLiveRoom.lastAnswerEvent = answerPayload;
      currentLiveRoom.contestantScore = contestantScore;
      currentLiveRoom.timerState = null; // إيقاف العداد كلياً أثناء الانتقال والبطاقات

      if (currentLiveRoom.id) {
        try {
          const roomRef = doc(db, "live_rooms", currentLiveRoom.id);
          const updatePayload = {
            lastAnswerEvent: answerPayload,
            contestantScore: contestantScore,
            answeredQuestionsLog: currentLiveRoom.answeredQuestionsLog || {},
            highestLockedScore: currentLiveRoom.highestLockedScore || contestantScore,
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
      cardBonus,
      basePoints,
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

  // معالجة انتهاء وقت السؤال الحالي كإجابة خاطئة مع ظهور X أحمر وخصم نصف نقاط السؤال
  function handleStageQuestionTimeout() {
    if (isAdvancingQuestion) return;
    if (isQuestionTransitionRunning) {
      setTimeout(() => {
        if (!isAdvancingQuestion) handleStageQuestionTimeout();
      }, 500);
      return;
    }

    // فحص بطاقة الحصانة (درع الأمان)
    const basePoints = (typeof q.points === "number" && q.points > 0) ? q.points : 3;
    const hasImmunity = !!(activeCardEffect?.effect?.immunity);
    let penalty = 0;
    if (hasImmunity) {
      showToast("درع الأمان (الحصانة): انتهى الوقت ولكن تم إلغاء أي خصم درجات!", "fa-shield-halved", 3500);
      activeCardEffect = null;
    } else {
      // خصم نصف النقاط التي كان المفروض أن يحصل عليها لو جاوب صح
      penalty = Math.max(1, Math.round(basePoints / 2));
      showToast(`انتهى الوقت المحدد للسؤال! تم خصم ${penalty} درجات (نصف نقاط السؤال) والانتقال للوحة الشرف`, "fa-clock", 3500);
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
    advanceToNext(-penalty, penalty > 0, false, null, true, 0, basePoints);
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

  // 1. تنظيف أي بطاقات فورية لسؤال سابق
  expireInstantCardEffects();

  // 2. استخلاص التأثير الساري الدقيق للسؤال الحالي
  const currentEffects = Array.isArray(currentLiveRoom?.activeCardEffects)
    ? currentLiveRoom.activeCardEffects.filter(e => e.status === "active")
    : [];

  const thisQuestionInstant = currentEffects.find(e => (e.scope === "instant" || !e.scope) && e.questionIdx === idx);
  const activeCycleEffect = currentEffects.find(e => e.scope === "cycle" || e.scope === "permanent" || e.scope === "match");

  if (thisQuestionInstant) {
    const def = getCardById(thisQuestionInstant.cardId);
    activeCardEffect = def ? { ...def, ...thisQuestionInstant } : thisQuestionInstant;
  } else if (activeCycleEffect) {
    const def = getCardById(activeCycleEffect.cardId);
    activeCardEffect = def ? { ...def, ...activeCycleEffect } : activeCycleEffect;
  } else {
    activeCardEffect = null;
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

  // بطاقة 40: ختام المسك لآخر سؤال
  const isFinalQuestion = (idx >= allQuestions.length - 1);
  if (isFinalQuestion && (activeCardEffect?.id === 40 || activeCardEffect?.effect?.finaleBonusCap || hasActiveEffect(40))) {
    cardBonusPoints = Math.max(cardBonusPoints, Math.max(0, 5 - (q.points || 5)));
  }

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

      if (activeCardEffect.effect?.showRuleHint || activeCardEffect.effect?.hint || activeCardEffect.effect?.showRuleInfo) {
        cardBannerHtml += `
          <div style="background:#fefce8;border:2px dashed #facc15;border-radius:12px;padding:10px 16px;margin-bottom:12px;color:#854d0e;font-size:13.5px;font-weight:700;display:flex;align-items:center;gap:10px;">
            <i class="fa-solid fa-lightbulb" style="color:#eab308;font-size:18px;"></i>
            <span>تلميح وقاعدة نور البيان: ركّز في الحركات ومخارج الحروف والقاعدة التجويدية المتصلة بالسؤال قبل الإجابة.</span>
          </div>
        `;
      }

      if (activeCardEffect.effect?.showVerseContext) {
        cardBannerHtml += `
          <div style="background:#f0fdf4;border:2px dashed #86efac;border-radius:12px;padding:10px 16px;margin-bottom:12px;color:#166534;font-size:13.5px;font-weight:700;display:flex;align-items:center;gap:10px;">
            <i class="fa-solid fa-compass" style="color:#22c55e;font-size:18px;"></i>
            <span>سياق الآية الكريمة (عين الحافظ): استذكر الآيات السابقة واللاحقة للتدبّر وضبط بداية ونهاية المقطع.</span>
          </div>
        `;
      }
    }

    // عرض توجيه المعلم المعتمد إن وجد في الغرفة الحية
    if (currentLiveRoom?.lastTeacherTip?.hint) {
      cardBannerHtml += `
        <div style="background:#eff6ff;border:2px solid #93c5fd;border-radius:12px;padding:10px 16px;margin-bottom:12px;color:#1e40af;font-size:13.5px;font-weight:700;display:flex;align-items:center;gap:10px;">
          <i class="fa-solid fa-comment-dots" style="color:#3b82f6;font-size:18px;"></i>
          <div>
            <strong>توجيه الأستاذ (${escapeHtml(currentLiveRoom.lastTeacherTip.teacherName || 'المعلم')}):</strong> «${escapeHtml(currentLiveRoom.lastTeacherTip.hint)}»
          </div>
        </div>
      `;
    }

    if (activeCardEffect.effect) {
      const eff = activeCardEffect.effect;
      if (eff.pointsBonus) cardBonusPoints += eff.pointsBonus;
      if (eff.speedBonus) cardBonusPoints += eff.speedBonus;
      if (eff.honorPointsBonus) cardBonusPoints += eff.honorPointsBonus;
      if (eff.comboStreakBonus) cardBonusPoints += eff.comboStreakBonus;
      if (eff.bonusCapPoints && q.points) cardBonusPoints += Math.max(0, eff.bonusCapPoints - q.points);
      if (eff.oralBonus && q.type === "oral") cardBonusPoints += eff.oralBonus;
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

          const basePoints = (choiceIdx === q.correct) ? (q.points || 5) : 0;
          let actualCardBonus = 0;
          if (choiceIdx === q.correct) {
            if (activeCardEffect?.effect?.balanceAccuracyAndSpeed || hasActiveEffect(36)) {
              const qDuration = currentLiveRoom?.questionTimer || 30;
              const speedRatio = Math.max(0, Math.min(1, (qDuration - elapsedSec) / qDuration));
              const speedBonusPts = Math.round(speedRatio * 2.5 * 10) / 10;
              actualCardBonus += speedBonusPts;
              showToast(`توازن الحكماء: 2.5 دقة + ${speedBonusPts} سرعة!`, "fa-scale-balanced", 2500);
            }
            if (doublePointsActive) actualCardBonus += basePoints;
            actualCardBonus += cardBonusPoints;
            // مكافأة السرعة: إن أجاب في أقل من 5 ثوانٍ
            if (speedBonusExtra > 0 && elapsedSec < 5) {
              actualCardBonus += speedBonusExtra;
              showToast(`سرعة البرق! +${speedBonusExtra} نقاط إضافية (${elapsedSec.toFixed(1)}ث)`, "fa-forward-fast", 2500);
            }
          }
          const earnedPoints = basePoints + actualCardBonus;

          if (choiceIdx === q.correct) {
            btn.classList.add("correct");
            showToast(`إجابة صحيحة! (+${earnedPoints} درجات)`, "fa-circle-check");
            activeCardEffect = null; // استهلاك البطاقة
            advanceToNext(earnedPoints, false, true, choiceIdx, false, actualCardBonus, basePoints);
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
              showToast("فرصة ثانية: إجابتك غير دقيقة، ولديك فرصة أخرى!", "fa-arrow-rotate-left", 3500);
              activeCardEffect = null;
              return;
            }

            btn.classList.add("wrong");
            const correctBtn = stageInteractiveArea.querySelector(`[data-choice="${q.correct}"]`);
            if (correctBtn) correctBtn.classList.add("correct");

            if (hasImmunity) {
              showToast("درع الأمان: تم إحباط أي خصم للدرجات!", "fa-shield-halved");
              activeCardEffect = null;
              advanceToNext(0, false, false, choiceIdx, false, 0, 0);
            } else if (penaltyOnWrong > 0) {
              showToast(`إجابة غير دقيقة — المخاطرة الكبرى: خصم ${penaltyOnWrong} درجات!`, "fa-fire-flame-curved", 3000);
              activeCardEffect = null;
              advanceToNext(-penaltyOnWrong, true, false, choiceIdx, false, 0, 0);
            } else {
              showToast("إجابة غير دقيقة!", "fa-circle-xmark");
              activeCardEffect = null;
              advanceToNext(0, false, false, choiceIdx, false, 0, 0);
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

    // إذا كانت بطاقة "توصيل الحكمة" (البطاقة 18) نشطة: توصيل أول زوجين صحيحين تلقائياً وفق مفتاح الإجابة
    const autoMatchActive = !!(activeCardEffect?.effect?.autoMatchPairs || activeCardEffect?.effect?.autoMatchOne || hasActiveEffect(18));
    if (autoMatchActive && leftItems.length > 0 && activeConnections.length === 0) {
      const maxToConnect = Math.min(2, leftItems.length);
      for (let pi = 0; pi < maxToConnect; pi++) {
        const itemLeft = leftItems[pi];
        const matchR = rightItems.find(r => r.pairIdx === itemLeft.pairIdx);
        if (matchR) {
          activeConnections.push({
            leftId: itemLeft.id,
            rightId: matchR.id,
            leftPairIdx: itemLeft.pairIdx,
            rightPairIdx: matchR.pairIdx,
            leftNum: itemLeft.num,
            rightLetter: matchR.letter
          });
        }
      }
      showToast("توصيل الحكمة: تم ربط أول زوجين صحيحين تلقائياً وفق مفتاح الإجابة!", "fa-link", 3500);
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
        const basePts = q.points || 5;
        const bonusPts = Math.max(0, sc - basePts);
        activeCardEffect = null;
        advanceToNext(sc, false, true, null, false, bonusPts, basePts);
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
          const baseEarned = Math.round((correctMatchesCount / cleanPairs.length) * (q.points || 5));
          const finalEarnedScore = Math.round((correctMatchesCount / cleanPairs.length) * earnedPoints);
          const actualCardBonus = Math.max(0, finalEarnedScore - baseEarned);

          setTimeout(() => {
            if (allCorrect) {
              showToast(`ما شاء الله! جميع الأزواج صحيحة بالكامل (+${earnedPoints} درجات)`, "fa-circle-check", 3500);
              try { soundFX.celebrate(); } catch (e) {}
            } else {
              showToast(`تم التحقق: (${correctMatchesCount} من ${cleanPairs.length}) أزواج صحيحة (+${finalEarnedScore} درجات)`, "fa-check-double", 3500);
            }
            activeCardEffect = null;
            if (isInitiator) {
              advanceToNext(finalEarnedScore, false, allCorrect, null, false, actualCardBonus, baseEarned);
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

  // ── Ordering: ترتيب تفاعلي للجمل والكلمات بالتزامن الكامل وإيقاف التايمر أثناء التصحيح ──
  } else if (q.type === "ordering") {
    const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name));
    let earnedPoints = q.points || 5;
    if (doublePointsActive) earnedPoints *= 2;
    earnedPoints += cardBonusPoints;

    const originalItems = Array.isArray(q.items) && q.items.length > 0 
      ? [...q.items] 
      : (q.targetSentence ? q.targetSentence.split(/\s+/).filter(Boolean) : ["كلمة 1", "كلمة 2"]);
    
    const lockTwoActive = !!(activeCardEffect?.effect?.lockOrderingItems || activeCardEffect?.effect?.lockTwoItems || hasActiveEffect(17));

    let placedWords = [];
    let bankWords = shuffleArray(originalItems.map((word, wIdx) => ({ id: `word_${wIdx}_${Math.random().toString(36).slice(2, 6)}`, text: word, origIdx: wIdx, locked: false })));
    // التأكد من أن الكلمات مبعثرة ومبهدلة بالكامل للتفكير
    if (bankWords.length > 1 && bankWords.every((w, i) => w.origIdx === i)) {
      bankWords.reverse();
    }

    // إذا كانت هناك حالة ترتيب سابقة لنفس السؤال محملة من الغرفة (للمنضمين والجمهور والمشرفين)
    if (currentLiveRoom?.orderingState && currentLiveRoom.orderingState.questionIdx === idx) {
      if (Array.isArray(currentLiveRoom.orderingState.placedWords) && currentLiveRoom.orderingState.placedWords.length > 0) {
        placedWords = [...currentLiveRoom.orderingState.placedWords];
        if (Array.isArray(currentLiveRoom.orderingState.bankWords)) {
          bankWords = [...currentLiveRoom.orderingState.bankWords];
        }
      }
    }

    // إذا كانت بطاقة "حصانة الترتيب" نشطة: تثبيت أول عنصرين تلقائياً في موقعهما الصحيح
    if (lockTwoActive && originalItems.length >= 2 && placedWords.length === 0) {
      for (let i = 0; i < 2; i++) {
        const targetWord = originalItems[i];
        const bIdx = bankWords.findIndex(w => w.text === targetWord && w.origIdx === i);
        if (bIdx >= 0) {
          const lockedWord = { ...bankWords[bIdx], locked: true };
          bankWords.splice(bIdx, 1);
          placedWords.push(lockedWord);
        }
      }
      showToast("حصانة الترتيب: تم تثبيت أول عنصرين في موقعهما الصحيح!", "fa-lock", 3000);
    }

    let isOrderingVerifyingRunning = false;

    // بث حالة الكلمات الحالية عبر السحابة لحظياً
    function broadcastOrderingState() {
      if (!currentLiveRoom || !currentLiveRoom.id) return;
      const placedPayload = placedWords.map(w => ({ id: w.id, text: w.text, locked: !!w.locked, origIdx: w.origIdx }));
      const bankPayload = bankWords.map(w => ({ id: w.id, text: w.text, locked: !!w.locked, origIdx: w.origIdx }));
      const now = Date.now();
      updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
        orderingState: {
          questionIdx: idx,
          placedWords: placedPayload,
          bankWords: bankPayload,
          verifying: false,
          updatedBy: currentUser?.name || "المتسابق",
          timestamp: now
        },
        lastUpdated: serverTimestamp()
      }).catch(err => console.warn("Broadcast orderingState err:", err));
    }

    // بث بدء التصحيح المتزامن وإيقاف التايمر للجميع سحابياً
    function broadcastOrderingVerificationState() {
      if (!currentLiveRoom || !currentLiveRoom.id) return;
      const placedPayload = placedWords.map(w => ({ id: w.id, text: w.text, locked: !!w.locked, origIdx: w.origIdx }));
      const bankPayload = bankWords.map(w => ({ id: w.id, text: w.text, locked: !!w.locked, origIdx: w.origIdx }));
      const now = Date.now();
      const curTimer = currentLiveRoom?.timerState || {};
      const remainingSecs = Math.max(1, Math.ceil(Math.max(0, (curTimer.endsAt || (now + 30000)) - now) / 1000));

      const pausedTimer = {
        ...curTimer,
        isFrozen: true,
        isCorrectionPaused: true,
        freezeRemaining: remainingSecs,
        remainingSeconds: remainingSecs,
        updatedAt: now,
        supervisorAuthoritative: true
      };
      currentLiveRoom.timerState = pausedTimer;

      updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
        orderingState: {
          questionIdx: idx,
          placedWords: placedPayload,
          bankWords: bankPayload,
          verifying: true,
          startedAt: now,
          updatedBy: currentUser?.name || "المتسابق",
          timestamp: now
        },
        timerState: pausedTimer,
        lastUpdated: serverTimestamp()
      }).catch(err => console.warn("Broadcast ordering verification state err:", err));
    }

    // مزامنة واجهة ترتيب الكلمات عند وصول تحديث خارجي
    window.syncExternalOrderingUI = function(extPlaced, extBank) {
      if (currentQuestionIndex !== idx || isOrderingVerifyingRunning) return;
      if (Array.isArray(extPlaced) && Array.isArray(extBank)) {
        placedWords = extPlaced;
        bankWords = extBank;
        renderOrderingBoard();
      }
    };

    // تشغيل أنيميشن التصحيح المتسلسل خطوة بخطوة وإيقاف التايمر للجميع بالتزامن
    function startSequentialOrderingVerification(isInitiator = true) {
      if (isOrderingVerifyingRunning) return;
      isOrderingVerifyingRunning = true;

      // 1. إيقاف التايمر فوراً عند الجميع بالتزامن أثناء التصحيح
      const curTimer = currentLiveRoom?.timerState || {};
      const now = Date.now();
      const remainingSecs = Math.max(1, Math.ceil(Math.max(0, (curTimer.endsAt || (now + 30000)) - now) / 1000));
      pauseLiveTimerForCorrection(remainingSecs);

      // قفل أزرار التحكم وإظهار رسالة الفحص التزامنية
      const submitBtn = document.getElementById("btnSubmitOrdering");
      const supVerifyBtn = document.getElementById("btnSupervisorVerifyOrdering");
      const resetBtn = document.getElementById("btnResetOrdering");
      const manualBtn = document.getElementById("btnManualAcceptOrdering");

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري فحص الكلمات بالتزامن...`;
      }
      if (supVerifyBtn) {
        supVerifyBtn.disabled = true;
        supVerifyBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق بالتزامن...`;
      }
      if (resetBtn) resetBtn.disabled = true;
      if (manualBtn) manualBtn.disabled = true;

      // تعطيل التفاعل مع الرقائق أثناء التحقق
      const chips = stageInteractiveArea.querySelectorAll(".ordering-chip");
      chips.forEach(c => { c.style.pointerEvents = "none"; });

      let wordCheckIdx = 0;
      let correctWordsCount = 0;

      function checkNextWord() {
        if (wordCheckIdx >= placedWords.length) {
          // انتهى فحص جميع الكلمات
          const allCorrect = (correctWordsCount === originalItems.length && placedWords.length === originalItems.length);
          const baseEarned = allCorrect ? (q.points || 5) : 0;
          const actualCardBonus = allCorrect ? Math.max(0, earnedPoints - baseEarned) : 0;

          setTimeout(() => {
            if (allCorrect) {
              try { soundFX.celebrate(); } catch (e) {}
              showToast(`ما شاء الله! جميع الكلمات مرتبة بإتقان تام (+${earnedPoints} درجات)`, "fa-circle-check", 3500);
              activeCardEffect = null;
              if (isInitiator) {
                advanceToNext(earnedPoints, false, true, null, false, actualCardBonus, baseEarned);
              }
            } else {
              try { soundFX.wrong(); } catch (e) {}
              if (activeCardEffect?.effect?.secondChance) {
                showToast("فرصة ثانية: الترتيب غير صحيح، أعد ترتيب الكلمات!", "fa-arrow-rotate-left", 3500);
                activeCardEffect = null;
                isOrderingVerifyingRunning = false;
                // استئناف المؤقت بعد الفرصة الثانية
                resumeLiveTimerAfterCorrection(remainingSecs);
                renderOrderingBoard();
                return;
              }

              if (hasImmunity) {
                showToast("درع الأمان: الترتيب غير دقيق ولكن تم إحباط أي خصم!", "fa-shield-halved", 3000);
                activeCardEffect = null;
                if (isInitiator) {
                  advanceToNext(0, false, false);
                }
              } else if (penaltyOnWrong > 0) {
                showToast(`ترتيب غير دقيق — المخاطرة الكبرى: خصم ${penaltyOnWrong} درجات!`, "fa-fire-flame-curved", 3000);
                activeCardEffect = null;
                if (isInitiator) {
                  advanceToNext(-penaltyOnWrong, true, false);
                }
              } else {
                const wrongPenalty = 3;
                showToast(`الترتيب غير دقيق (${correctWordsCount} من ${originalItems.length} صحيحة) — خصم 3 درجات`, "fa-circle-xmark", 3000);
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

    // نقطة الدخول العامة لمزامنة التصحيح عند وصول حدث سحابي
    window.runExternalOrderingVerification = function(extPlaced) {
      if (currentQuestionIndex !== idx) return;
      if (Array.isArray(extPlaced) && extPlaced.length > 0) {
        placedWords = extPlaced;
        renderOrderingBoard();
        startSequentialOrderingVerification(false);
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
            <i class="fa-solid fa-arrow-down-short-wide"></i> ${isAllowedToSolve ? 'اضغط على الكلمات المبعثرة بالترتيب الصحيح لتكوين الجملة:' : 'المتسابق يرتب الكلمات لتكوين الجملة:'}
          </div>

          <!-- حاوية الترتيب -->
          <div class="ordering-slots-container ${placedWords.length === 0 ? '' : 'active-target'}" id="stageOrderingSlots">
            ${placedWords.length === 0 ? `
              <div class="ordering-empty-hint"><i class="fa-solid fa-hand-pointer"></i> ${isAllowedToSolve ? 'اضغط على الكلمات بالأسفل لإضافتها هنا بالترتيب...' : 'في انتظار وضع الكلمات في خانات الترتيب...'}</div>
            ` : placedWords.map((w, pIdx) => `
              <div class="ordering-chip font-${q.font || 'quran'} placed ${w.locked ? 'locked' : ''}" data-placed-id="${w.id}">
                <span class="chip-num">${pIdx + 1}</span>
                <span>${w.text}</span>
                ${w.locked ? '<i class="fa-solid fa-lock" style="font-size:12px;color:#ca8a04;"></i>' : (isAllowedToSolve ? '<i class="fa-solid fa-xmark" style="font-size:12px;opacity:0.6;"></i>' : '')}
              </div>
            `).join("")}
          </div>

          <!-- بنك الكلمات المبعثرة -->
          <div class="ordering-bank-title"><i class="fa-solid fa-layer-group"></i> ${isAllowedToSolve ? 'الكلمات المتاحة (اضغط للترتيب):' : 'الكلمات المتبقية بالبنك:'}</div>
          <div class="ordering-bank-container" id="stageOrderingBank">
            ${bankWords.length === 0 ? `
              <div style="font-size:13px;color:#16a34a;font-weight:700;"><i class="fa-solid fa-check"></i> تم وضع جميع الكلمات في خانات الترتيب!</div>
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
              <button type="button" class="btn-duo-green btn-sm" id="btnSupervisorVerifyOrdering" title="فحص وتصحيح الترتيب فوراً للجميع">
                <i class="fa-solid fa-circle-check"></i> فحص وتصحيح الترتيب الآن
              </button>
              <button type="button" class="btn-duo-yellow btn-sm" id="btnManualAcceptOrdering" title="قبول فوري من المشرف">
                <i class="fa-solid fa-crown"></i> قبول مباشر (${earnedPoints} درجات)
              </button>
            ` : ''}
          </div>
        </div>
      `;

      // ربط أزرار المشرف (متاح سواء كان المشرف يحل أو يشاهد)
      if (isSup) {
        document.getElementById("btnSupervisorVerifyOrdering")?.addEventListener("click", () => {
          if (isOrderingVerifyingRunning) return;
          if (placedWords.length !== originalItems.length) {
            showToast("يرجى وضع جميع الكلمات في الترتيب أولاً", "fa-triangle-exclamation");
            return;
          }
          broadcastOrderingVerificationState();
          startSequentialOrderingVerification(true);
        });

        document.getElementById("btnManualAcceptOrdering")?.addEventListener("click", () => {
          activeCardEffect = null;
          const basePts = q.points || 5;
          const bonusPts = Math.max(0, earnedPoints - basePts);
          advanceToNext(earnedPoints, false, true, null, false, bonusPts, basePts);
        }, { once: true });
      }

      // إذا كان المشاهد غير مصرح له بالحل، نتوقف هنا بعد ربط أزرار المشرف
      if (!isAllowedToSolve) {
        return;
      }

      // إضافة كلمة من البنك إلى خانات الترتيب
      stageInteractiveArea.querySelectorAll("[data-bank-id]").forEach(el => {
        el.addEventListener("click", () => {
          if (isOrderingVerifyingRunning) return;
          const bId = el.getAttribute("data-bank-id");
          const bIdx = bankWords.findIndex(w => w.id === bId);
          if (bIdx >= 0) {
            placedWords.push(bankWords[bIdx]);
            bankWords.splice(bIdx, 1);
            try { soundFX.btnClick(); } catch (e) {}
            renderOrderingBoard();
            broadcastOrderingState();
          }
        });
      });

      // إزالة كلمة من خانات الترتيب وإرجاعها للبنك
      stageInteractiveArea.querySelectorAll("[data-placed-id]").forEach(el => {
        el.addEventListener("click", () => {
          if (isOrderingVerifyingRunning) return;
          const pId = el.getAttribute("data-placed-id");
          const pIdx = placedWords.findIndex(w => w.id === pId);
          if (pIdx >= 0 && !placedWords[pIdx].locked) {
            bankWords.push(placedWords[pIdx]);
            placedWords.splice(pIdx, 1);
            try { soundFX.btnClick(); } catch (e) {}
            renderOrderingBoard();
            broadcastOrderingState();
          }
        });
      });

      // إعادة ضبط
      document.getElementById("btnResetOrdering")?.addEventListener("click", () => {
        if (isOrderingVerifyingRunning) return;
        const unlockeds = placedWords.filter(w => !w.locked);
        placedWords = placedWords.filter(w => w.locked);
        bankWords.push(...unlockeds);
        renderOrderingBoard();
        broadcastOrderingState();
      });

      // اعتماد وتحقق من المتسابق
      document.getElementById("btnSubmitOrdering")?.addEventListener("click", () => {
        if (isOrderingVerifyingRunning) return;
        if (placedWords.length !== originalItems.length) {
          showToast("يرجى ترتيب جميع الكلمات أولاً", "fa-triangle-exclamation");
          return;
        }

        broadcastOrderingVerificationState();
        startSequentialOrderingVerification(true);
      });
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
      const updateAvgText = () => {
        if (avgDisplay && evalCurrentScoreDisplay) {
          avgDisplay.textContent = evalCurrentScoreDisplay.textContent;
        }
      };
      updateAvgText();
      const observer = new MutationObserver(updateAvgText);
      if (evalCurrentScoreDisplay) observer.observe(evalCurrentScoreDisplay, { childList: true, characterData: true, subtree: true });
    }

    document.getElementById("btnOralAccept")?.addEventListener("click", () => {
      const ratings = Object.values(roomTeachersRatings);
      let avg = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 5;

      // بطاقة 22 (درع التقييم): فرض حد أدنى 4 من 5
      if (hasActiveEffect(22) || activeCardEffect?.effect?.minOralRating || minRatingVal > 0) {
        avg = Math.max(avg, 4);
      }

      const rounded = Math.round(avg * 4) / 4;
      const basePointsVal = q.points || 5;
      let baseEarned = Math.round((rounded / 5) * basePointsVal);
      let pts = baseEarned;

      // بطاقة 11 (نجمة التلاوة): إضافة +1 نقطة بحد أقصى 5
      if (hasActiveEffect(11) || activeCardEffect?.effect?.oralBonus) {
        pts = Math.min(5, pts + 1);
      }

      // بطاقة 7 (السؤال الذهبي): مضاعفة الدرجات بحد أقصى 10
      if (doublePointsActive) {
        pts = Math.min(10, pts * 2);
      }

      // بطاقة 25 (قلب الموازين): سقف 7 نقاط
      if (hasActiveEffect(25) || activeCardEffect?.effect?.bonusCapPoints === 7) {
        pts = Math.max(pts, 7);
      }

      // بطاقة 40 (ختام المسك): لآخر سؤال
      if (isFinalQuestion && (hasActiveEffect(40) || activeCardEffect?.effect?.finaleBonusCap)) {
        pts = Math.max(pts, 5);
      }

      const actualCardBonus = Math.max(0, pts - baseEarned);
      const btn = document.getElementById("btnOralAccept");
      if (btn) btn.disabled = true;
      showToast(`تم تسجيل التقييم الشفهي: ${rounded.toFixed(2)} من 5 (+${pts} درجات)`, "fa-microphone");
      activeCardEffect = null;
      advanceToNext(pts, false, true, null, false, actualCardBonus, baseEarned);
    }, { once: true });

  } else {
    stageInteractiveArea.innerHTML = "";
  }

  // إظهار أو إخفاء وتنسيق شريط تقييم المعلمين الشفهي حسب نوع السؤال والدور
  const oralEvalBar = document.getElementById("liveOralEvaluationBar");
  const teacherVotingRow = document.getElementById("teacherVotingRow");
  const oralObserverStatusMsg = document.getElementById("oralObserverStatusMsg");
  const isEvaluator = currentUser && (currentUser.role === "teacher" || currentUser.role === "supervisor" || isSupervisor(currentUser.name));

  if (oralEvalBar) {
    if (q.type === "oral") {
      oralEvalBar.classList.remove("hidden");
      if (isEvaluator) {
        teacherVotingRow?.classList.remove("hidden");
        oralObserverStatusMsg?.classList.add("hidden");
      } else {
        teacherVotingRow?.classList.add("hidden");
        oralObserverStatusMsg?.classList.remove("hidden");
      }
    } else {
      oralEvalBar.classList.add("hidden");
    }
  }

  // وقت السؤال محدد من الغرفة إن وجد أو 30 ثانية
  const timeLimit = currentLiveRoom?.questionTimer || 30;
  const now = Date.now();
  let qTimerState = currentLiveRoom?.timerState;

  // فحص هل المستخدم الحالي هو المشرف أو قائد الغرفة (المشرف هو رأس المؤقت)
  const isSupervisorOrLeader = currentUser && (
    currentUser.role === "supervisor" ||
    isSupervisor(currentUser.name) ||
    currentUser.name === currentLiveRoom?.leaderName ||
    currentUser.name === currentLiveRoom?.creatorName
  );

  if (!qTimerState || qTimerState.questionIdx !== idx) {
    qTimerState = {
      questionIdx: idx,
      duration: timeLimit,
      startedAt: now,
      endsAt: now + (timeLimit * 1000),
      remainingSeconds: timeLimit,
      isFrozen: false,
      isCorrectionPaused: false,
      noTimeLimit: !!(activeCardEffect?.effect?.noTimeLimit),
      supervisorAuthoritative: !!isSupervisorOrLeader,
      supervisorName: isSupervisorOrLeader ? currentUser.name : null,
      updatedAt: now
    };
    if (currentLiveRoom) {
      currentLiveRoom.timerState = qTimerState;
      // المشرف أو قائد الغرفة هو المصدر الأول للمؤقت. وإذا لم يكن المشرف متواجداً وكان المستخدم مصرحاً له بالحل، يبثه كاحتياط
      if (currentLiveRoom.id && (isSupervisorOrLeader || canCurrentUserSolveQuestion())) {
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
  let sessionFinalScore = Math.max(0, contestantScore); // حفظ النتيجة النهائية للجلسة قبل التصفير

  // تطبيق بطاقة 37 (صمام الأمان النهائي): عدم هبوط النتيجة عن القمة المعتمدة
  const hasSafetyValve = hasActiveEffect(37) || currentLiveRoom?.activeCardEffects?.some(e => e.cardId === 37);
  if (hasSafetyValve && currentLiveRoom?.highestLockedScore) {
    if (sessionFinalScore < currentLiveRoom.highestLockedScore) {
      sessionFinalScore = currentLiveRoom.highestLockedScore;
      showToast(`صمام الأمان النهائي: تطبيق أعلى نتيجة مسجلة (${sessionFinalScore} نقطة) كحد أدنى مضمون!`, "fa-vault", 4500);
    }
  }

  // تطبيق بطاقة 35 (وسام الشرف القرآني): +1 نقطة شرف دائمة في نهاية المسابقة
  const hasHonorMedal = hasActiveEffect(35) || currentLiveRoom?.activeCardEffects?.some(e => e.cardId === 35);
  if (hasHonorMedal) {
    sessionFinalScore += 1;
  }

  const studentUser = currentContestant ? participantsCache.find(p => p.name === currentContestant.name || p.id === currentContestant.id) : null;
  const initialBase = (currentLiveRoom && typeof currentLiveRoom.contestantInitialBaseScore === "number")
    ? currentLiveRoom.contestantInitialBaseScore
    : (typeof contestantBaseScore === "number" ? contestantBaseScore : (studentUser?.totalScore || 0));

  const totalFinalScore = Math.max(0, initialBase + sessionFinalScore);

  if (currentContestant) {
    recordHonorScore(currentContestant.name, sessionFinalScore);
    showToast(`اكتملت مسابقة المتسابق (${currentContestant.name})! المجموع النهائي المعتمد: ${totalFinalScore} نقطة (رصيد الجولة: +${sessionFinalScore})`, "fa-trophy", 4500);
  }

  // تصفير نقاط الجلسة بعد الحفظ وقبل عرض لوحة الشرف
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
    currentLiveRoom.highestLockedScore = 0;
    await saveRooms(currentLiveRoom);
  }
  enterPhaseStudentSelect();
}

function addContestantScore(pts) {
  contestantScore = Math.max(0, contestantScore + pts);
  if (stageStudentScore) stageStudentScore.textContent = String(contestantScore);
  // تحديث أعلى نتيجة مسجلة لصمام الأمان النهائي (البطاقة 37)
  if (currentLiveRoom) {
    currentLiveRoom.contestantScore = contestantScore;
    currentLiveRoom.highestLockedScore = Math.max(currentLiveRoom.highestLockedScore || 0, contestantScore);
  }

  // تحديث رصيد الطالب التراكمي المعتمد بأمان: (الرصيد الابتدائي الأصلي) + (رصيد الجلسة الحالي)
  const initialBase = (currentLiveRoom && typeof currentLiveRoom.contestantInitialBaseScore === "number")
    ? currentLiveRoom.contestantInitialBaseScore
    : (typeof contestantBaseScore === "number" ? contestantBaseScore : 0);
  const newTotal = Math.max(0, initialBase + contestantScore);

  if (currentContestant) {
    const studentUser = participantsCache.find(p => p.name === currentContestant.name || p.id === currentContestant.id);
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

// نافذة تنبيه واستشارة المعلم والمشرف (تدعم 10+ معلمين وإيقاف المؤقت واستئنافه مع +15 ثانية)
let activeTeacherConsultationInProgress = false;

function showTeacherHelpModal(helperName, contestantName, cardTitle = "استشارة المعلم", cardId = 6) {
  const modal = document.getElementById("teacherHelpModal");
  const nameEl = document.getElementById("teacherHelpChosenName");
  const descEl = document.getElementById("teacherHelpDescription");
  const targetEl = document.getElementById("teacherHelpContestantTarget");
  const listEl = document.getElementById("teacherConsultTeachersList");
  const hintInput = document.getElementById("teacherHintInput");
  if (!modal) return;

  const isSupervisorUser = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name));
  const isPresenter = currentUser && currentUser.role === "presenter";

  if (targetEl) targetEl.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> المتسابق المستفيد: <strong>${escapeHtml(contestantName || "المتسابق")}</strong>`;

  // 1. حصر المعلمين والمشرفين المتصلين المؤهلين فقط (منع الطلاب نهائياً وفق القاعدة 5.3)
  const roomUsers = Array.isArray(currentLiveRoom?.users) ? currentLiveRoom.users : [];
  const qualifiedList = [];
  roomUsers.forEach(u => {
    if (u === contestantName) return; // استبعاد المتسابق نفسه
    const p = participantsCache.find(x => x.name === u || (x.normalizedName && x.normalizedName === normalizeArabic(u)));
    if (p && (p.role === "teacher" || p.role === "supervisor" || isSupervisor(u))) {
      qualifiedList.push({ name: u, role: p.role || "teacher" });
    }
  });

  // إذا لم يتواجد معلم متصل، التحقق من قائد الغرفة أو المشرف العام
  if (qualifiedList.length === 0) {
    const leader = currentLiveRoom?.leaderName || MASTER_SUPERVISOR_NAME;
    if (leader && leader !== contestantName) {
      qualifiedList.push({ name: leader, role: "supervisor" });
    }
  }

  // إذا انعدم وجود أي معلم أو مشرف مؤهل تماماً، عرض تنبيه للمشرف ومنع الاستشارة الوهمية (القاعدة 5.4)
  if (qualifiedList.length === 0) {
    showToast("لا يوجد أي معلّم أو مشرف مؤهل متصل في الغرفة حالياً لتقديم الاستشارة.", "fa-triangle-exclamation", 4500);
    modal.classList.add("hidden");
    activeTeacherConsultationInProgress = false;
    return;
  }

  // اختيار معلم مؤهل واحد عشوائياً أو استخدام المعلم المحدد
  let currentChosen = helperName;
  if (!currentChosen && qualifiedList.length > 0) {
    const randPick = qualifiedList[Math.floor(Math.random() * qualifiedList.length)];
    currentChosen = randPick.name;
    if (currentLiveRoom?.id) {
      updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
        "activeTeacherHelp.helperName": currentChosen,
        "activeTeacherHelp.cardId": cardId,
        "activeTeacherHelp.cardTitle": cardTitle,
        "activeTeacherHelp.contestantName": contestantName || "المتسابق",
        lastUpdated: serverTimestamp()
      }).catch(() => {});
    }
  }
  if (!currentChosen) currentChosen = qualifiedList[0]?.name || MASTER_SUPERVISOR_NAME;
  if (nameEl) nameEl.textContent = currentChosen;

  const isMe = currentUser && (currentUser.name === currentChosen);

  if (descEl) {
    if (isMe) {
      descEl.innerHTML = `<span style="color:#16a34a;font-weight:900;font-size:16px;">أنت المعلم المختار!</span><br>وقع الاختيار عليك لمساعدة الطالب <strong>«${escapeHtml(contestantName)}»</strong> وتوجيهه بالإشارة أو النصيحة المفيدة.`;
    } else if (isPresenter) {
      descEl.innerHTML = `تنبيه على شاشة العارض: المعلم <strong>«${escapeHtml(currentChosen)}»</strong> يتدخل الآن لتقديم الدعم والتوجيه للمتسابق <strong>«${escapeHtml(contestantName)}»</strong>.`;
    } else if (isSupervisorUser) {
      descEl.innerHTML = `تنبيه المشرف: تم تفعيل استشارة المعلم <strong>«${escapeHtml(currentChosen)}»</strong> للمتسابق <strong>«${escapeHtml(contestantName)}»</strong> مع تجميد الوقت وإضافة +15 ثانية عند الاستئناف.`;
    } else {
      descEl.innerHTML = `تم اختيار الأستاذ <strong>«${escapeHtml(currentChosen)}»</strong> لمساعدة المتسابق <strong>«${escapeHtml(contestantName)}»</strong> وتقديم نصيحة توضيحية له.`;
    }
  }

  // ضبط حقل التلميح
  if (hintInput) {
    if (currentLiveRoom?.activeTeacherHelp?.hintText) {
      hintInput.value = currentLiveRoom.activeTeacherHelp.hintText;
    }
    // إتاحة الكتابة للمعلم المختار أو المشرف فقط
    if (isMe || isSupervisorUser) {
      hintInput.readOnly = false;
      hintInput.style.background = "#ffffff";
    } else {
      hintInput.readOnly = true;
      hintInput.style.background = "#f8fafc";
      hintInput.placeholder = "في انتظار كتابة المعلم المساعد للتوجيه...";
    }
  }

  // رسم بطاقات المعلمين في القائمة
  if (listEl) {
    listEl.innerHTML = qualifiedList.map(t => {
      const isSel = (t.name === currentChosen);
      return `
        <div class="teacher-consult-card ${isSel ? 'selected' : ''}" data-teacher-name="${escapeHtml(t.name)}">
          <div class="teacher-consult-avatar">
            <i class="fa-solid fa-user-tie"></i>
          </div>
          <div class="teacher-consult-info">
            <span class="teacher-consult-name">${escapeHtml(t.name)}</span>
            <span class="teacher-consult-role">${t.role === 'supervisor' ? 'مشرف المسابقة' : 'معلم معتمد'}</span>
          </div>
        </div>
      `;
    }).join("");

    if (isSupervisorUser) {
      listEl.querySelectorAll(".teacher-consult-card").forEach(c => {
        c.addEventListener("click", () => {
          const tName = c.getAttribute("data-teacher-name");
          listEl.querySelectorAll(".teacher-consult-card").forEach(x => x.classList.remove("selected"));
          c.classList.add("selected");
          currentChosen = tName;
          if (nameEl) nameEl.textContent = tName;
          if (currentLiveRoom?.id) {
            updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
              "activeTeacherHelp.helperName": tName,
              lastUpdated: serverTimestamp()
            }).catch(() => {});
          }
        });
      });
    }
  }

  // زر الاختيار العشوائي (للمشرف فقط)
  const btnRandom = document.getElementById("btnTeacherHelpPickRandom");
  if (btnRandom) {
    btnRandom.style.display = isSupervisorUser ? "inline-block" : "none";
    btnRandom.onclick = () => {
      if (qualifiedList.length > 0) {
        const rand = qualifiedList[Math.floor(Math.random() * qualifiedList.length)];
        currentChosen = rand.name;
        if (nameEl) nameEl.textContent = rand.name;
        if (listEl) {
          listEl.querySelectorAll(".teacher-consult-card").forEach(c => {
            if (c.getAttribute("data-teacher-name") === rand.name) {
              c.classList.add("selected");
            } else {
              c.classList.remove("selected");
            }
          });
        }
        if (currentLiveRoom?.id) {
          updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
            "activeTeacherHelp.helperName": rand.name,
            lastUpdated: serverTimestamp()
          }).catch(() => {});
        }
        showToast(`تم اختيار المعلم (${rand.name}) عشوائياً!`, "fa-chalkboard-user");
      }
    };
  }

  // زر إلغاء الاستشارة (للمشرف فقط)
  const btnCancel = document.getElementById("btnCancelTeacherHelpModal");
  if (btnCancel) {
    btnCancel.style.display = isSupervisorUser ? "inline-block" : "none";
    btnCancel.onclick = () => {
      modal.classList.add("hidden");
      activeTeacherConsultationInProgress = false;
      const pauseRemaining = currentLiveRoom?.activeTeacherHelp?.pauseRemaining || liveTimeRemaining || 15;
      resumeLiveTimerAfterWalletSelection(pauseRemaining);
      if (currentLiveRoom?.id) {
        updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
          activeTeacherHelp: null,
          lastUpdated: serverTimestamp()
        }).catch(() => {});
      }
      showToast("تم إلغاء الاستشارة واستئناف العداد السابق.", "fa-info-circle");
    };
  }

  // زر اعتماد التوجيه واستئناف المؤقت ("صح" المتاح للمعلم والمشرف والمصرح لهم)
  const btnDone = document.getElementById("btnCloseTeacherHelpModal");
  if (btnDone) {
    btnDone.onclick = () => {
      modal.classList.add("hidden");
      activeTeacherConsultationInProgress = false;
      const pauseRemaining = currentLiveRoom?.activeTeacherHelp?.pauseRemaining || liveTimeRemaining || 15;
      const writtenHint = hintInput ? hintInput.value.trim() : "";
      const isCard33 = (cardId === 33);
      const newRemaining = isCard33 ? pauseRemaining : (pauseRemaining + 15);

      if (writtenHint) {
        showToast(`توجيه الأستاذ (${currentChosen}): «${writtenHint}»`, "fa-comment-dots", 5000);
      } else {
        showToast(isCard33 ? `تم توجيه الطالب واستئناف المؤقت (${newRemaining}ث)` : `تم توجيه الطالب واستئناف المؤقت بـ ${newRemaining} ثانية (+15ث إضافية)!`, "fa-clock", 4000);
      }

      resumeLiveTimerAfterWalletSelection(newRemaining);
      if (currentLiveRoom?.id) {
        updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
          activeTeacherHelp: null,
          lastTeacherTip: writtenHint ? { teacherName: currentChosen, hint: writtenHint, timestamp: Date.now() } : null,
          lastUpdated: serverTimestamp()
        }).catch(() => {});
      }
    };
  }

  showFloatingCardPill(`استشارة المعلم: ${currentChosen}`, "fa-chalkboard-user", "gold");
  try { soundFX.celebrate(); } catch (e) {}
  modal.classList.remove("hidden");
  showToast(`تنبيه بطاقة: تم اختيار الأستاذ (${currentChosen}) لمساعدة المتسابق (${contestantName})!`, "fa-chalkboard-user", 5000);
}

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
        showToast(`تم حفظ نقاط ${currentContestant.name}: ${contestantScore} نقطة`, "fa-check", 2500);
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

// ========================================================
// 1. توليد وإظهار البطاقات التكتيكية الثلاثية الأبعاد (3D Flip & Selection)
// ========================================================
function triggerTacticalCardsModal(onDone = null, nextIdx = null) {
  tacticalCardsCallback = onDone;
  const targetNextIdx = nextIdx !== null ? nextIdx : (currentLiveRoom?.currentQuestionIdx || 0);

  // اختيار 3 بطاقات عشوائية غير مكررة من بنك الـ 40 بطاقة
  const chosenCards = getRandomTacticalCards(3);

  // بث ظهور البطاقات في الغرفة الحية لحظياً لجميع المشتركين
  if (currentLiveRoom && currentLiveRoom.id) {
    updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
      activeCardsTurn: {
        isOpen: true,
        cards: chosenCards,
        timestamp: Date.now(),
        nextIdx: targetNextIdx,
        cardsCycleIndex: (currentLiveRoom.cardsCycleIndex || 0) + 1
      },
      cardsCycleIndex: (currentLiveRoom.cardsCycleIndex || 0) + 1,
      lastUpdated: serverTimestamp()
    }).catch(err => console.warn("Broadcast activeCardsTurn:", err));
  }

  showSynchronizedTacticalCardsModal(chosenCards, targetNextIdx);
}

// عرض مودال البطاقات الثلاث ثلاثية الأبعاد بأنيميشن انقلاب وتناقص عداد 15 ثانية
function showSynchronizedTacticalCardsModal(cards, nextIdx = null) {
  if (!tacticalCardsModal || !cards3DRow) return;

  if (cardsTimerInterval) {
    clearInterval(cardsTimerInterval);
    cardsTimerInterval = null;
  }

  const isAllowedToPick = !currentLiveRoom || checkIsSolverAllowed(currentLiveRoom);

  // رسم البطاقات الثلاث بتأثير 3D Drop and Flip
  cards3DRow.innerHTML = cards.map((card, idx) => {
    const isBuff = card.type === "buff";
    const badgeText = isBuff ? "ميزة إيجابية" : "مخاطرة ذكية";
    const scopeLabel = formatCardScopeLabel(card.scope);

    return `
      <div class="card-3d-wrapper" data-card-id="${card.id}" style="animation-delay: ${(idx * 0.15).toFixed(2)}s;">
        <div class="card-3d-inner">
          <!-- ظهر البطاقة قبل القلب -->
          <div class="card-3d-back">
            <div class="card-back-pattern">
              <i class="fa-solid fa-book-quran"></i>
              <span>نور البيان</span>
              <div style="font-size: 13px; opacity: 0.9; font-weight: 700;">بطاقة #${card.id}</div>
            </div>
          </div>
          <!-- وجه البطاقة بعد القلب -->
          <div class="card-3d-front ${card.type}">
            <div class="card-front-icon">
              <i class="fa-solid ${card.icon || 'fa-bolt'}"></i>
            </div>
            <h3 class="card-front-title">${card.title}</h3>
            <p class="card-front-desc">${card.desc}</p>
            <div style="display:flex; justify-content:center; gap:6px; flex-wrap:wrap; margin-top:4px;">
              <span class="card-front-badge">${badgeText}</span>
              <span class="badge-scope-pill" style="font-size:11px; background:#f3e8ff; color:#7e22ce; padding:3px 8px; border-radius:12px; font-weight:800;">${scopeLabel}</span>
            </div>
            <div style="margin-top: 10px; font-size: 12.5px; font-weight: 800; color: ${isAllowedToPick ? '#16a34a' : '#64748b'};">
              ${isAllowedToPick ? '<i class="fa-solid fa-hand-pointer"></i> انقر للاختيار والإضافة لمحفظتك' : '<i class="fa-solid fa-lock"></i> بانتظار المتسابق/المشرف'}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // فتح المودال مع تشغيل الصوت
  tacticalCardsModal.classList.remove("hidden");
  try { soundFX.btnClick(); } catch (e) {}

  // تشغيل أنيميشن انقلاب البطاقات بعد 350 مللي ثانية
  setTimeout(() => {
    cards3DRow.querySelectorAll(".card-3d-wrapper").forEach((el, i) => {
      setTimeout(() => {
        el.classList.add("flipped");
        try { soundFX.btnClick(); } catch (e) {}
      }, i * 220);
    });
  }, 400);

  // إضافة أحداث النقر على البطاقات لمن يملك الصلاحية
  cards3DRow.querySelectorAll(".card-3d-wrapper").forEach(wrapper => {
    wrapper.addEventListener("click", () => {
      if (!isAllowedToPick) {
        showToast("المتسابق أو المشرف هو المخوّل باختيار البطاقة", "fa-lock");
        return;
      }
      const cardId = parseInt(wrapper.getAttribute("data-card-id"));
      selectTacticalCard3D(cardId, nextIdx);
    });
  });

  // عداد الـ 15 ثانية للبطاقات التكتيكية
  let countdownSec = 15;
  if (cardsCountdownTimer) cardsCountdownTimer.textContent = String(countdownSec);

  cardsTimerInterval = setInterval(() => {
    countdownSec--;
    if (cardsCountdownTimer) cardsCountdownTimer.textContent = String(countdownSec);
    if (countdownSec <= 0) {
      clearInterval(cardsTimerInterval);
      cardsTimerInterval = null;
      if (isAllowedToPick) {
        skipTacticalCards(true, nextIdx);
      }
    }
  }, 1000);
}

// اختيار بطاقة من العرض ثلاثي الأبعاد وإضافتها لمحفظة المتسابق وتفعيل تأثيرها للجميع فوراً
function selectTacticalCard3D(cardId, nextIdx = null) {
  if (cardsTimerInterval) {
    clearInterval(cardsTimerInterval);
    cardsTimerInterval = null;
  }

  const card = getCardById(cardId);
  if (!card) return;

  const contestantName = currentContestant?.name || currentLiveRoom?.contestantName || "المتسابق";
  const chosenByName = currentUser?.name || contestantName;
  const targetNextIdx = nextIdx !== null ? nextIdx : (currentLiveRoom?.currentQuestionIdx || 0);

  // إغلاق المودال
  tacticalCardsModal?.classList.add("hidden");

  // إضافة البطاقة لمحفظة المتسابق فقط دون تفعيل تأثيرها
  addCardToContestantWallet(cardId);

  // إشعار بالصوت والرسالة والشارة بأن البطاقة دخلت المحفظة
  try { soundFX.celebrate(); } catch (e) {}
  showFloatingCardPill("أُضيفت إلى المحفظة 🃏", card.icon || "fa-wallet", "purple");
  showToast(`تمت إضافة بطاقة «${card.title}» إلى محفظتك بنجاح! 🃏 يمكنك تفعيلها متى شئت من زر المحفظة.`, card.icon || "fa-wallet", 4000);

  // بث إضافة البطاقة لمحفظة المتسابق في الغرفة الحية دون تفعيل أي تأثير تلقائي
  if (currentLiveRoom && currentLiveRoom.id) {
    const updatedWallet = Array.isArray(currentLiveRoom.contestantWallet) ? [...currentLiveRoom.contestantWallet] : [cardId];
    updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
      contestantWallet: updatedWallet,
      activeCardsTurn: {
        isOpen: false,
        chosenCard: card,
        chosenBy: chosenByName,
        timestamp: Date.now(),
        nextIdx: targetNextIdx
      },
      currentQuestionIdx: targetNextIdx,
      lastUpdated: serverTimestamp()
    }).catch(err => console.warn("Broadcast chosen card notice:", err));
  }

  // المتابعة للسؤال التالي
  if (tacticalCardsCallback) {
    const cb = tacticalCardsCallback;
    tacticalCardsCallback = null;
    cb();
  } else {
    loadStageQuestion(targetNextIdx);
  }
}

// تطبيق استلام بطاقة مختارة عبر المزامنة السحابية للغرفة (إضافتها للمحفظة فقط دون تفعيل)
function applySynchronizedChosenCard(chosenCard, chosenBy, nextIdx = null) {
  clearInterval(cardsTimerInterval);
  tacticalCardsModal?.classList.add("hidden");

  if (chosenCard && chosenCard.id) {
    if (currentLiveRoom) {
      if (!Array.isArray(currentLiveRoom.contestantWallet)) currentLiveRoom.contestantWallet = [];
      if (!currentLiveRoom.contestantWallet.map(String).includes(String(chosenCard.id))) {
        currentLiveRoom.contestantWallet.push(chosenCard.id);
      }
      updateContestantWalletUI();
    }
    // إشعار بالحصول على البطاقة دون تفعيل تأثيرها
    try { soundFX.celebrate(); } catch (e) {}
    showFloatingCardPill("أُضيفت إلى المحفظة 🃏", chosenCard.icon || "fa-wallet", "purple");
    showToast(`حصل (${chosenBy || 'المتسابق'}) على بطاقة «${chosenCard.title}» وأُضيفت لمحفظته! 🃏 يمكن تفعيلها من زر المحفظة.`, chosenCard.icon || "fa-wallet", 4000);
  }

  const targetNextIdx = nextIdx !== null ? nextIdx : (currentLiveRoom?.currentQuestionIdx || 0);
  if (tacticalCardsCallback) {
    const cb = tacticalCardsCallback;
    tacticalCardsCallback = null;
    cb();
  } else {
    loadStageQuestion(targetNextIdx);
  }
}

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

let lastRenderedWalletFingerprint = "";

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

  // إذا كان مودال المحفظة معروضاً، نحدثه فقط إذا تغيرت قائمة البطاقات فعلياً لمنع تكرار أنيميشن الانفتاح
  if (walletModal && !walletModal.classList.contains("hidden")) {
    const currentFingerprint = (Array.isArray(list) ? list : []).map(String).join(",");
    if (currentFingerprint !== lastRenderedWalletFingerprint) {
      renderContestantWalletCards();
    }
  }
}

function renderContestantWalletCards() {
  const container = document.getElementById("walletCardsList");
  if (!container) return;
  const walletIds = Array.isArray(currentLiveRoom?.contestantWallet) ? currentLiveRoom.contestantWallet : [];
  lastRenderedWalletFingerprint = walletIds.map(String).join(",");
  const cards = walletIds.map(id => TACTICAL_CARDS.find(c => String(c.id) === String(id))).filter(Boolean);

  const subtitleEl = document.getElementById("walletModalSubtitle");
  if (subtitleEl) {
    const studentName = currentContestant?.name || currentLiveRoom?.contestantName || "المتسابق";
    subtitleEl.textContent = `المتسابق: ${studentName} — لديك (${cards.length}) بطاقة تكتيكية جاهزة للاستخدام في أي سؤال!`;
  }

  if (cards.length === 0) {
    container.innerHTML = `
      <div class="wallet-empty-state" style="animation: walletModalPopIn 0.3s ease-out;">
        <i class="fa-solid fa-wallet"></i>
        <h4>محفظة البطاقات فارغة حالياً</h4>
        <p>تحصل على بطاقات تكتيكية كل 4 أسئلة (أو عند تفعيل المشرف للبطاقات)، وتُحفظ هنا لتستخدمها في أي سؤال تريده بالضغط عليها!</p>
      </div>
    `;
    return;
  }

  const isAllowedToUse = checkIsSolverAllowed(currentLiveRoom);

  // عرض البطاقات بأنيميشن انقلاب ثلاثي الأبعاد جميل ومتزامن للجميع (3D Card Flip-in Reveal)
  container.innerHTML = cards.map((c, index) => `
    <div class="wallet-card-item card-flip-reveal ${c.type}" data-card-id="${c.id}" style="animation-delay: ${(index * 0.08).toFixed(2)}s;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="wallet-card-icon-bubble">
          <i class="fa-solid ${c.icon}"></i>
        </div>
        <span class="wallet-card-tag">${c.type === 'buff' ? 'ميزة إيجابية' : 'مخاطرة ذكية'}</span>
      </div>
      <h4 class="wallet-card-title">${c.title}</h4>
      <p class="wallet-card-desc">${c.desc}</p>
      <button class="btn-use-card" data-card-id="${c.id}" ${!isAllowedToUse ? 'disabled style="opacity:0.6;cursor:not-allowed;"' : ''}>
        <i class="fa-solid fa-bolt"></i> ${isAllowedToUse ? 'استخدم هذه البطاقة الآن' : 'المتسابق/المشرف مخوّل بالاستخدام'}
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

let walletModalClosingTimer = null;

// فتح محفظة البطاقات متزامنة للجميع مع أنيميشن انفتاح وانقلاب البطاقات بسلاسة ودون تعليق
function openSynchronizedWallet(broadcast = true, openedBy = null) {
  if (!walletModal) return;

  // إذا كانت المحفظة مفتوحة بالفعل وغير مغلقة، نمنع إعادة تشغيل أنيميشن الفتح
  if (!walletModal.classList.contains("hidden") && !walletModal.classList.contains("wallet-modal-closing")) {
    return;
  }

  if (walletModalClosingTimer) {
    clearTimeout(walletModalClosingTimer);
    walletModalClosingTimer = null;
  }

  const openerName = openedBy || currentUser?.name || currentContestant?.name || "المشرف";
  renderContestantWalletCards();

  const syncBanner = document.getElementById("walletSyncLiveBanner");
  const syncText = document.getElementById("walletSyncLiveText");
  if (syncBanner && syncText) {
    syncBanner.classList.remove("hidden");
    syncText.innerHTML = `مزامنة حية: قام <strong>${openerName}</strong> بفتح محفظة البطاقات التكتيكية`;
  }

  // تفعيل أنيميشن الانفتاح السلس وإزالته تلقائياً عند انتهاء مدته لئلا يعلق في الـ DOM
  walletModal.classList.remove("hidden", "wallet-modal-closing");
  walletModal.classList.add("wallet-modal-opening");
  setTimeout(() => {
    if (walletModal && !walletModal.classList.contains("hidden")) {
      walletModal.classList.remove("wallet-modal-opening");
    }
  }, 380);

  try { soundFX.btnClick(); } catch (e) {}

  if (broadcast && currentLiveRoom?.id) {
    const now = Date.now();
    lastSeenWalletSyncTimestamp = now;
    updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
      walletSync: {
        isOpen: true,
        openedBy: openerName,
        timestamp: now
      },
      lastUpdated: serverTimestamp()
    }).catch(err => console.warn("Broadcast wallet open notice:", err));
  }
}

// إغلاق محفظة البطاقات متزامنة للجميع مع أنيميشن إغلاق سلس
function closeSynchronizedWallet(broadcast = true, closedBy = null) {
  if (!walletModal) return;

  if (!walletModal.classList.contains("hidden")) {
    walletModal.classList.remove("wallet-modal-opening");
    walletModal.classList.add("wallet-modal-closing");
    if (walletModalClosingTimer) clearTimeout(walletModalClosingTimer);
    walletModalClosingTimer = setTimeout(() => {
      walletModal.classList.add("hidden");
      walletModal.classList.remove("wallet-modal-closing", "wallet-modal-opening");
      walletModalClosingTimer = null;
    }, 220);
  } else {
    walletModal.classList.add("hidden");
    walletModal.classList.remove("wallet-modal-closing", "wallet-modal-opening");
  }

  if (broadcast && currentLiveRoom?.id) {
    const now = Date.now();
    lastSeenWalletSyncTimestamp = now;
    updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
      walletSync: {
        isOpen: false,
        closedBy: closedBy || currentUser?.name || currentContestant?.name || "المتسابق",
        timestamp: now
      },
      lastUpdated: serverTimestamp()
    }).catch(err => console.warn("Broadcast wallet close notice:", err));
  }
}

// ========================================================
// محرك البطاقات التكتيكية الـ 40 الشامل والمتزامن مركزياً
// ========================================================
let isCardActivating = false;

// تسجيل حدث البطاقة في سجل الأحداث المركزي للغرفة
function logCardEvent(cardId, cardTitle, user, action, details = "") {
  if (!currentLiveRoom) return;
  const events = Array.isArray(currentLiveRoom.cardEventsLog) ? [...currentLiveRoom.cardEventsLog] : [];
  events.unshift({
    timestamp: Date.now(),
    cardId: Number(cardId),
    cardTitle: cardTitle || `بطاقة #${cardId}`,
    user: user || currentUser?.name || "المتسابق",
    action: action, // 'activate' | 'expire' | 'cancel' | 'grant'
    details: details
  });
  if (events.length > 60) events.length = 60; // الاحتفاظ بآخر 60 حدثاً
  currentLiveRoom.cardEventsLog = events;
}

// مزامنة حالة التأثيرات النشطة وسجل الأحداث مع فايربيس
function syncRoomActiveEffects(room) {
  if (!room || !room.id) return;
  updateDoc(doc(db, "live_rooms", room.id), {
    activeCardEffects: room.activeCardEffects || [],
    cardEventsLog: room.cardEventsLog || [],
    lastUpdated: serverTimestamp()
  }).catch(err => console.warn("Sync activeCardEffects notice:", err));
}

// فحص وجود تأثير نشط لبطاقة معينة ينطبق على السؤال الحالي
function hasActiveEffect(cardId, targetQIdx = null) {
  if (!currentLiveRoom || !Array.isArray(currentLiveRoom.activeCardEffects)) return false;
  const qIdx = targetQIdx !== null ? targetQIdx : currentQuestionIndex;
  const contestantName = currentContestant?.name || currentLiveRoom?.contestantName;
  return currentLiveRoom.activeCardEffects.some(e => {
    if (e.cardId !== Number(cardId) || e.status !== "active") return false;
    if (e.targetContestant && contestantName && e.targetContestant !== contestantName) return false;
    if (e.scope === "instant" || !e.scope) {
      return (e.questionIdx === undefined || e.questionIdx === null || e.questionIdx === qIdx);
    }
    return true;
  });
}

// جلب كائن التأثير النشط لبطاقة معينة
function getActiveEffect(cardId, targetQIdx = null) {
  if (!currentLiveRoom || !Array.isArray(currentLiveRoom.activeCardEffects)) return null;
  const qIdx = targetQIdx !== null ? targetQIdx : currentQuestionIndex;
  const contestantName = currentContestant?.name || currentLiveRoom?.contestantName;
  return currentLiveRoom.activeCardEffects.find(e => {
    if (e.cardId !== Number(cardId) || e.status !== "active") return false;
    if (e.targetContestant && contestantName && e.targetContestant !== contestantName) return false;
    if (e.scope === "instant" || !e.scope) {
      return (e.questionIdx === undefined || e.questionIdx === null || e.questionIdx === qIdx);
    }
    return true;
  }) || null;
}

// إنهاء التأثيرات الفورية (instant) عند انتهاء السؤال الحالي
function expireInstantCardEffects() {
  activeCardEffect = null;
  if (!currentLiveRoom || !Array.isArray(currentLiveRoom.activeCardEffects)) return;
  let changed = false;
  const expiredTitles = [];
  const currentQ = currentQuestionIndex;
  
  currentLiveRoom.activeCardEffects.forEach(eff => {
    if (eff.status === "active" && (eff.scope === "instant" || !eff.scope)) {
      // التأكد من إنهاء التأثير الفوري للسؤال المستهدف
      if (eff.questionIdx === undefined || eff.questionIdx === null || eff.questionIdx === currentQ) {
        eff.status = "expired";
        eff.expiredAt = Date.now();
        changed = true;
        expiredTitles.push(eff.title);
        logCardEvent(eff.cardId, eff.title, eff.targetContestant, "expire", "انتهى التأثير بانتهاء السؤال الحالي.");
      }
    }
  });

  if (changed) {
    currentLiveRoom.activeCardEffects = currentLiveRoom.activeCardEffects.filter(e => e.status === "active");
    syncRoomActiveEffects(currentLiveRoom);
    renderActiveCardEffectsUI(currentLiveRoom);
    expiredTitles.forEach(t => {
      showToast(`⌛ انتهت فترة تأثير بطاقة: «${t}»`, "fa-clock-rotate-left", 2500);
    });
  }
}

// إنهاء التأثيرات المستمرة (cycle) عند بداية دورة البطاقات التالية (كل 4 أسئلة)
function expireCycleCardEffects() {
  if (!currentLiveRoom || !Array.isArray(currentLiveRoom.activeCardEffects)) return;
  let changed = false;
  const expiredTitles = [];

  currentLiveRoom.activeCardEffects.forEach(eff => {
    if (eff.status === "active" && eff.scope === "cycle") {
      eff.status = "expired";
      eff.expiredAt = Date.now();
      changed = true;
      expiredTitles.push(eff.title);
      logCardEvent(eff.cardId, eff.title, eff.targetContestant, "expire", "انتهت صلاحية التأثير ببدء دورة بطاقات جديدة.");
    }
  });

  if (changed) {
    currentLiveRoom.activeCardEffects = currentLiveRoom.activeCardEffects.filter(e => e.status === "active");
    syncRoomActiveEffects(currentLiveRoom);
    renderActiveCardEffectsUI(currentLiveRoom);
    showToast(`بدأت دورة بطاقات جديدة — انتهت التأثيرات المؤقتة للدورة السابقة مع بقاء بطاقات المحفظة والنقاط المكتسبة!`, "fa-arrows-rotate", 3500);
  }
}

// تسجيل تأثير نشط جديد للبطاقة في الغرفة وسجل الأحداث
function registerActiveEffect(card, details = {}) {
  if (!currentLiveRoom) return;
  const effects = Array.isArray(currentLiveRoom.activeCardEffects) ? [...currentLiveRoom.activeCardEffects] : [];
  const contestantName = currentContestant?.name || currentLiveRoom.contestantName || currentUser?.name || "المتسابق";
  
  const effectObj = {
    id: `eff_${card.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    cardId: card.id,
    title: card.title,
    icon: card.icon,
    type: card.type,
    scope: card.scope, // instant | cycle | permanent | match
    targetContestant: contestantName,
    questionIdx: currentQuestionIndex,
    cycleIndex: currentLiveRoom.cardsCycleIndex || 0,
    startedAt: Date.now(),
    status: "active",
    details: details
  };

  effects.push(effectObj);
  currentLiveRoom.activeCardEffects = effects;
  activeCardEffect = card; // الحفاظ على التوافق الرجعي

  logCardEvent(card.id, card.title, contestantName, "activate", `تم تفعيل البطاقة بنجاح (${formatCardScopeLabel(card.scope)}).`);
  syncRoomActiveEffects(currentLiveRoom);
  renderActiveCardEffectsUI(currentLiveRoom);
}

// إلغاء تأثير بطاقة من قِبل المشرف مع تسجيل السبب
function supervisorCancelActiveCardEffect(effectId, reason = null) {
  if (!currentLiveRoom) return;
  const effects = Array.isArray(currentLiveRoom.activeCardEffects) ? [...currentLiveRoom.activeCardEffects] : [];
  const targetIdx = effects.findIndex(e => e.id === effectId);
  if (targetIdx === -1) return;

  const eff = effects[targetIdx];
  const cancelReason = reason || prompt(`يرجى كتابة سبب إلغاء تأثير بطاقة «${eff.title}»:`, "إلغاء إداري من المشرف") || "إلغاء إداري من المشرف";

  eff.status = "expired";
  eff.cancelledBy = currentUser?.name || "المشرف";
  eff.cancelReason = cancelReason;
  eff.expiredAt = Date.now();

  logCardEvent(eff.cardId, eff.title, currentUser?.name || "المشرف", "cancel", `قام المشرف بإلغاء التأثير. السبب: ${cancelReason}`);

  currentLiveRoom.activeCardEffects = effects.filter(e => e.status === "active");
  syncRoomActiveEffects(currentLiveRoom);
  renderActiveCardEffectsUI(currentLiveRoom);

  showToast(`تم إلغاء تأثير بطاقة «${eff.title}» من قبل المشرف`, "fa-ban", 3500);
}

// رسم وإدارة التأثير البصري البنفسجي الإلزامي والشارات النشطة
function renderActiveCardEffectsUI(room) {
  const currentContestantName = currentContestant?.name || room?.contestantName;
  const currentQIdx = currentQuestionIndex;

  const allActive = Array.isArray(room?.activeCardEffects)
    ? room.activeCardEffects.filter(e => e.status === "active")
    : [];

  // التأثيرات السارية حصرياً على المتسابق الحالي والسؤال الحالي
  const relevantEffects = allActive.filter(eff => {
    if (eff.targetContestant && currentContestantName && eff.targetContestant !== currentContestantName) {
      return false;
    }
    if (eff.scope === "instant" || !eff.scope) {
      return (eff.questionIdx === undefined || eff.questionIdx === null || eff.questionIdx === currentQIdx);
    }
    return true; // cycle, permanent, match
  });

  const questionCard = document.getElementById("stageQuestionCardMain") || document.querySelector(".stage-question-card");
  const purpleBar = document.getElementById("stagePurpleActiveCardsBar");
  const isSupervisorUser = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name));

  if (relevantEffects.length > 0) {
    if (questionCard) {
      questionCard.classList.add("card-purple-aura");
    }
    if (purpleBar) {
      purpleBar.classList.remove("hidden");
      purpleBar.innerHTML = relevantEffects.map(eff => `
        <div class="purple-card-badge" data-effect-id="${eff.id}">
          <i class="fa-solid ${eff.icon || 'fa-bolt'}"></i>
          <span>${escapeHtml(eff.title)} نشط</span>
          <span class="badge-scope-pill">${formatCardScopeLabel(eff.scope)}</span>
          ${isSupervisorUser ? `
            <button type="button" class="btn-cancel-effect" data-effect-id="${eff.id}" title="إلغاء التأثير مع تسجيل السبب">
              <i class="fa-solid fa-xmark"></i>
            </button>
          ` : ''}
        </div>
      `).join("");

      if (isSupervisorUser) {
        purpleBar.querySelectorAll(".btn-cancel-effect").forEach(btn => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const effId = btn.getAttribute("data-effect-id");
            supervisorCancelActiveCardEffect(effId);
          });
        });
      }
    }

    // تطبيق الخط العثماني الميسر ووضوح الرؤية (البطاقة 38: تكبير 150%) لجميع الشاشات
    const zoomEff = relevantEffects.find(e => e.cardId === 38 || e.details?.zoomQuranScript);
    const arenaStageEl = document.getElementById("arenaStage");
    if (zoomEff) {
      if (stageQuestionText) {
        stageQuestionText.style.background = "rgba(254, 252, 232, 0.95)";
        stageQuestionText.style.borderRadius = "14px";
        stageQuestionText.style.padding = "14px 20px";
      }
      if (questionCard) questionCard.classList.add("quran-script-zoomed-150");
      if (arenaStageEl) arenaStageEl.classList.add("quran-script-zoomed-150");
      document.body.classList.add("quran-script-zoomed-150");
    } else {
      if (questionCard) questionCard.classList.remove("quran-script-zoomed-150");
      if (arenaStageEl) arenaStageEl.classList.remove("quran-script-zoomed-150");
      document.body.classList.remove("quran-script-zoomed-150");
      if (stageQuestionText) {
        stageQuestionText.style.background = "";
        stageQuestionText.style.borderRadius = "";
        stageQuestionText.style.padding = "";
      }
    }

    // تطبيق إبراز الحركات ونور الصدر (البطاقة 32)
    const coloredEff = relevantEffects.find(e => e.cardId === 32);
    if (coloredEff && stageQuestionText) {
      stageQuestionText.style.textShadow = "0 0 10px rgba(234, 179, 8, 0.45)";
      stageQuestionText.style.letterSpacing = "1.5px";
    } else if (stageQuestionText && !coloredEff) {
      stageQuestionText.style.textShadow = "";
      stageQuestionText.style.letterSpacing = "";
    }
  } else {
    if (questionCard) {
      questionCard.classList.remove("card-purple-aura", "quran-script-zoomed-150");
    }
    const arenaStageEl = document.getElementById("arenaStage");
    if (arenaStageEl) arenaStageEl.classList.remove("quran-script-zoomed-150");
    document.body.classList.remove("quran-script-zoomed-150");
    if (purpleBar) {
      purpleBar.classList.add("hidden");
      purpleBar.innerHTML = "";
    }
    if (stageQuestionText) {
      stageQuestionText.style.fontSize = "";
      stageQuestionText.style.lineHeight = "";
      stageQuestionText.style.background = "";
      stageQuestionText.style.borderRadius = "";
      stageQuestionText.style.padding = "";
      stageQuestionText.style.textShadow = "";
      stageQuestionText.style.letterSpacing = "";
    }
  }

  // تحديث لوحة المشرف المخصصة للبطاقات النشطة
  renderSupervisorActiveEffects(room);
}

// رسم لوحة المشرف للبطاقات الفعالة مع إمكانية الإلغاء
function renderSupervisorActiveEffects(room) {
  const panel = document.getElementById("supervisorActiveEffectsPanel");
  const list = document.getElementById("supervisorActiveEffectsList");
  const badge = document.getElementById("activeEffectsCountBadge");
  if (!panel || !list) return;

  const isSupervisorUser = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name));
  if (!isSupervisorUser) {
    panel.classList.add("hidden");
    return;
  }

  const activeEffects = Array.isArray(room?.activeCardEffects)
    ? room.activeCardEffects.filter(e => e.status === "active")
    : [];

  if (activeEffects.length === 0) {
    panel.classList.add("hidden");
    return;
  }

  panel.classList.remove("hidden");
  if (badge) badge.textContent = `${activeEffects.length} بطاقات نشطة`;

  list.innerHTML = activeEffects.map(eff => `
    <div class="supervisor-active-effect-row">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <span class="purple-card-badge" style="padding:4px 10px;font-size:12px;">
          <i class="fa-solid ${eff.icon || 'fa-bolt'}"></i> ${escapeHtml(eff.title)}
        </span>
        <span style="font-size:13px;font-weight:700;color:#334155;">
          المتسابق: <strong>${escapeHtml(eff.targetContestant || 'المتسابق')}</strong>
        </span>
        <span class="badge-scope-pill" style="color:#7e22ce;font-size:11px;font-weight:800;">
          [${formatCardScopeLabel(eff.scope)}]
        </span>
        <span style="font-size:11.5px;color:#64748b;">سؤال #${(eff.questionIdx || 0) + 1}</span>
      </div>
      <button type="button" class="btn-duo-red btn-sm btn-sup-cancel-eff" data-effect-id="${eff.id}" style="padding:5px 12px;font-size:12px;">
        <i class="fa-solid fa-ban"></i> إلغاء التأثير مع تسجيل السبب
      </button>
    </div>
  `).join("");

  list.querySelectorAll(".btn-sup-cancel-eff").forEach(btn => {
    btn.addEventListener("click", () => {
      const effId = btn.getAttribute("data-effect-id");
      supervisorCancelActiveCardEffect(effId);
    });
  });
}

// اختيار واستخدام بطاقة من محفظة المتسابق مع التحقق الصارم من القواعد
function selectCardFromWallet(cardId) {
  if (!currentLiveRoom || !currentLiveRoom.id) {
    showToast("لا توجد غرفة مسابقة حية نشطة حالياً", "fa-circle-exclamation");
    return;
  }
  if (!checkIsSolverAllowed(currentLiveRoom)) {
    showToast("المتسابق أو المشرف هو المخوّل باستخدام البطاقة", "fa-lock");
    return;
  }
  if (isCardActivating) {
    return;
  }

  const card = getCardById(cardId);
  if (!card) {
    showToast("البطاقة المحددة غير موجودة في النظام.", "fa-circle-exclamation");
    return;
  }

  // التحقق من ملكية البطاقة في محفظة المتسابق
  const wallet = Array.isArray(currentLiveRoom.contestantWallet) ? currentLiveRoom.contestantWallet : [];
  if (!wallet.map(String).includes(String(cardId))) {
    showToast("هذه البطاقة غير متوفرة في محفظتك حالياً.", "fa-lock");
    return;
  }

  // التحقق من توافق البطاقة مع السؤال الحالي
  const allQuestions = (currentLiveRoom.drawnQuestions && currentLiveRoom.drawnQuestions.length > 0)
    ? currentLiveRoom.drawnQuestions
    : (currentQuizData?.sections?.flatMap(s => s.questions || []) || []);
  const curQ = allQuestions[currentQuestionIndex] || {};

  const curTimer = currentLiveRoom.timerState || {};
  const nowTs = Date.now();
  const currentRemSecs = Math.max(1, Math.ceil(curTimer.remainingSeconds || (curTimer.endsAt ? (curTimer.endsAt - nowTs) / 1000 : liveTimeRemaining) || 15));

  const timerContext = {
    noTimeLimit: !!curTimer.noTimeLimit,
    questionTimer: currentLiveRoom.questionTimer,
    remainingSeconds: currentRemSecs,
    currentQuestionIdx: currentQuestionIndex,
    totalQuestions: allQuestions.length
  };

  if (!isCardCompatible(card, curQ, timerContext)) {
    const reason = getIncompatibilityReason(card, curQ, timerContext);
    showToast(`تعذر التفعيل: ${reason}`, "fa-circle-exclamation", 4500);
    return;
  }

  // فحص ما إذا كانت البطاقة مفعّلة بالفعل على السؤال الحالي لمنع التفعيل المزدوج
  if (hasActiveEffect(cardId, currentQuestionIndex)) {
    showToast(`البطاقة «${card.title}» مفعّلة بالفعل على هذا السؤال ولا يمكن تكرار تفعيلها!`, "fa-ban", 4000);
    return;
  }

  // قفل منع الضغط المزدوج
  isCardActivating = true;

  const contestantName = currentContestant?.name || currentLiveRoom.contestantName || "المتسابق";
  const chosenByName = currentUser?.name || contestantName;
  lastSeenCardChosenTimestamp = nowTs;

  // إيقاف التايمر جماعياً وفورياً عند الجميع بالتزامن أثناء اختيار البطاقة وتفعيلها
  pauseLiveTimerForWalletSelection(currentRemSecs);

  const pausedTimerState = {
    ...curTimer,
    isFrozen: true,
    isWalletSelectionPaused: true,
    freezeRemaining: currentRemSecs,
    remainingSeconds: currentRemSecs,
    updatedAt: nowTs
  };
  currentLiveRoom.timerState = pausedTimerState;

  // بث اختيار البطاقة وإيقاف المؤقت فوراً لجميع المشاركين في الغرفة
  updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
    activeCardSelection: {
      cardId: card.id,
      cardTitle: card.title,
      cardIcon: card.icon,
      cardDesc: card.desc,
      cardType: card.type,
      chosenBy: chosenByName,
      contestantName: contestantName,
      remainingSecs: currentRemSecs,
      timestamp: nowTs
    },
    timerState: pausedTimerState,
    lastUpdated: serverTimestamp()
  }).catch(err => console.warn("Broadcast card selection:", err));

  // تشغيل أنيميشن الاختيار الجميل لمدة ثانيتين محلياً ثم تفعيل البطاقة
  trigger2SecondCardSelectionShowcase(card, chosenByName, true, currentRemSecs);
}

// أنيميشن تسليط الضوء والـ 2 ثانية على البطاقة المختارة ثم تفعيلها
function trigger2SecondCardSelectionShowcase(card, chosenBy, isInitiator, preservedRemainingSecs = null) {
  const remSecs = preservedRemainingSecs || (currentLiveRoom?.timerState?.freezeRemaining) || liveTimeRemaining || 15;
  pauseLiveTimerForWalletSelection(remSecs);

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
        ribbon.innerHTML = `<i class="fa-solid fa-sparkles fa-spin"></i> تم اختيار هذه البطاقة بواسطة ${chosenBy || 'المتسابق'}!`;
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
    isCardActivating = false;

    // إخفاء غطاء الأنميشن وإغلاق مودال المحفظة
    const overlay = document.getElementById("activeCardAnnouncementOverlay");
    overlay?.classList.add("hidden");
    walletModal?.classList.remove("wallet-modal-opening", "wallet-modal-closing");
    walletModal?.classList.add("hidden");
    if (walletList) {
      walletList.classList.remove("has-selection");
    }

    // حذف البطاقة من المحفظة محلياً وسحابياً بعد التحقق التام
    const wallet = Array.isArray(currentLiveRoom?.contestantWallet) ? [...currentLiveRoom.contestantWallet] : [];
    const idx = wallet.findIndex(id => String(id) === String(card.id));
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

    // استئناف المؤقت بعد انتهاء فترة الـ 2 ثانية إن لم تكن البطاقة نفسها تغير الوقت أو تلغيه
    const eff = card.effect || {};
    const modifiesTimerDirectly = eff.freezeTime || eff.timeDelta || eff.resetQuestionTimer || eff.noTimeLimit || eff.passQuestion || eff.teacherConsultation;
    if (!modifiesTimerDirectly) {
      resumeLiveTimerAfterWalletSelection(remSecs);
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
  const card = getCardById(cardId);
  if (!card) return;

  // إذا كان المستخدم الحالي هو المبادر نفسه، فقد تم استهلاك البطاقة وتطبيق تأثيرها محلياً بالفعل
  if (currentUser && usedBy && currentUser.name && usedBy.trim() === currentUser.name.trim()) {
    return;
  }

  if (currentLiveRoom && Array.isArray(currentLiveRoom.contestantWallet)) {
    const idx = currentLiveRoom.contestantWallet.findIndex(id => String(id) === String(cardId));
    if (idx > -1) currentLiveRoom.contestantWallet.splice(idx, 1);
    updateContestantWalletUI(currentLiveRoom.contestantWallet);
  }

  // إذا كانت البطاقة هي بطاقة تخطي السؤال (21)، تتولى مزامنتها الفورية والدقيقة دالة activeQuestionSkip
  if (card.id === 21) {
    return;
  }

  executeCardEffect(card, null);
}

// تنفيذ استبدال السؤال الحالي ببديل من نفس القسم (البطاقة 9)
function executeQuestionSwap() {
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
      loadStageQuestion(currentQuestionIndex);
      showToast("تم استبدال السؤال الحالي بسؤال بديل من بنك الأسئلة!", "fa-arrows-rotate", 3500);
    }
  }
}

// تنفيذ تخطي السؤال الحالي بأمان ونيل درجات (البطاقة 21) مع مزامنة سحابية كاملة لجميع الأجهزة والحضور
function executeCurrentQuestionSkip(grantedPoints = 3, broadcast = true) {
  if (!currentLiveRoom) return;

  const curIdx = currentQuestionIndex ?? (currentLiveRoom.currentQuestionIdx || 0);
  const allQ = (currentLiveRoom.drawnQuestions && currentLiveRoom.drawnQuestions.length > 0)
    ? currentLiveRoom.drawnQuestions
    : (currentQuizData?.sections?.flatMap(s => s.questions || []) || []);
  const nextIdx = curIdx + 1;
  const isFinished = nextIdx >= allQ.length;
  const nowTs = Date.now();

  // تحديث نقاط المتسابق محلياً
  addContestantScore(grantedPoints);
  expireInstantCardEffects();
  clearInterval(liveTimerInterval);
  liveTimerInterval = null;

  // إشعار مرئي وصوتي فوري
  showFloatingCardPill("تخطي السؤال الحالي +3 نقاط ⏭️", "fa-forward-fast", "gold");
  showToast("⏭️ سهم الانطلاق: تخطي السؤال الحالي بأمان ونيل +3 نقاط تكتيكية!", "fa-forward-fast", 3500);
  try { soundFX.correct(); } catch(e) {}

  currentLiveRoom.currentQuestionIdx = nextIdx;
  currentLiveRoom.contestantScore = contestantScore;
  currentQuestionIndex = nextIdx;
  lastSeenQuestionSkipTimestamp = nowTs;

  // بث التخطي سحابياً للغرفة الحية لجميع الأجهزة والحضور
  if (broadcast && currentLiveRoom.id) {
    const skipPayload = {
      questionIdx: curIdx,
      nextIdx: nextIdx,
      grantedPoints: grantedPoints,
      contestantScore: contestantScore,
      skippedBy: currentUser?.name || currentContestant?.name || "المتسابق",
      isFinished: isFinished,
      timestamp: nowTs
    };

    currentLiveRoom.activeQuestionSkip = skipPayload;
    currentLiveRoom.timerState = null;

    try {
      const roomRef = doc(db, "live_rooms", currentLiveRoom.id);
      updateDoc(roomRef, {
        activeQuestionSkip: skipPayload,
        currentQuestionIdx: nextIdx,
        contestantScore: contestantScore,
        timerState: null,
        lastUpdated: serverTimestamp()
      }).catch(err => console.warn("Sync activeQuestionSkip error:", err));
    } catch (e) {
      console.warn("Update doc activeQuestionSkip error:", e);
    }
  }

  // إظهار لوحة الشرف ثم الانتقال للسؤال التالي (أو إنهاء المسابقة)
  if (isFinished) {
    finishContestant();
  } else {
    showHonorBoardModal(
      false, 
      () => loadStageQuestion(nextIdx), 
      currentContestant?.name || currentLiveRoom.contestantName, 
      grantedPoints, 
      false, 
      grantedPoints, 
      0
    );
  }
}

// تنفيذ إعادة ترتيب الأسئلة القادمة في القسم الحالي (البطاقة 24)
function executeDeckReorder() {
  if (!currentLiveRoom || !Array.isArray(currentLiveRoom.drawnQuestions)) return;
  const drawn = [...currentLiveRoom.drawnQuestions];
  const curIdx = currentLiveRoom.currentQuestionIdx || 0;
  if (curIdx < drawn.length - 1) {
    const passed = drawn.slice(0, curIdx + 1);
    let remaining = drawn.slice(curIdx + 1);
    remaining = shuffleArray(remaining);
    currentLiveRoom.drawnQuestions = [...passed, ...remaining];
    saveRooms(currentLiveRoom);
    showToast("تم إعادة ترتيب الأسئلة القادمة في القسم بنجاح!", "fa-shuffle", 3500);
  }
}

// ========================================================
// التنفيذ البرمجي الدقيق للبطاقات التكتيكية الأربعين
// ========================================================
function executeCardEffect(card, targetNextIdx = null) {
  if (!card) return;
  const eff = card.effect || {};

  switch (card.id) {
    case 1: // تيسير الوقت: +5 ثوانٍ لكل سؤال حتى الدورة التالية
      registerActiveEffect(card, { timeDeltaPerQuestion: 5 });
      broadcastTimerModification({ deltaSeconds: 5 });
      showFloatingCardPill("+5 ثوانٍ لكل سؤال ⏱️", "fa-hourglass-start", "green");
      showToast("⏱️ تيسير الوقت: تم تفعيل +5 ثوانٍ إضافية لكل سؤال حتى ظهور مجموعة البطاقات التالية!", "fa-hourglass-start", 3500);
      break;

    case 2: // سرعة وإتقان: -5 ثوانٍ + 2 نقاط عند الصواب
      broadcastTimerModification({ deltaSeconds: -5 });
      registerActiveEffect(card, { speedBonus: 2 });
      showFloatingCardPill("-5 ثوانٍ مع +2 بونص", "fa-bolt", "gold");
      showToast("سرعة وإتقان: تم إنقاص 5 ثوانٍ، والإجابة الصحيحة تمنحك +2 نقطة إضافية!", "fa-bolt", 3500);
      break;

    case 3: // المخاطرة الكبرى: 5 نقاط كاملة عند الصواب وخصم 3 نقاط عند الخطأ
      registerActiveEffect(card, { grandRisk: true, fullMarks: 5, penalty: 3 });
      showFloatingCardPill("المخاطرة الكبرى (5 صواب / -3 خطأ)", "fa-fire-flame-curved", "red");
      showToast("المخاطرة الكبرى: الصواب يمنح 5 نقاط كاملة، والخطأ يخصم 3 نقاط!", "fa-fire-flame-curved", 3500);
      break;

    case 4: // درع الأمان: حماية تامة من الخصم
      registerActiveEffect(card, { immunity: true });
      showFloatingCardPill("درع الأمان نشط", "fa-shield-halved", "blue");
      showToast("درع الأمان: محمي من أي خصم درجات في هذا السؤال!", "fa-shield-halved", 3500);
      break;

    case 5: // حذف خيارين: استبعاد خيارين خاطئين في MCQ
      registerActiveEffect(card, { eliminateOptions: 2 });
      eliminateMCQWrongOptionsImmediately(2);
      showFloatingCardPill("حذف خيارين خاطئين", "fa-filter", "blue");
      showToast("تم حذف خيارين خاطئين من الخيارات المعروضة!", "fa-filter", 3000);
      break;

    case 6: // استشارة المعلم: إيقاف المؤقت، واختيار معلم، واستئناف المؤقت بـ +15 ثانية
      registerActiveEffect(card, { teacherConsultation: true, extraTimeAfterResume: 15 });
      const curRem6 = Math.max(1, liveTimeRemaining || 15);
      pauseLiveTimerForWalletSelection(curRem6);
      if (currentLiveRoom) {
        currentLiveRoom.activeTeacherHelp = {
          cardId: 6,
          cardTitle: "استشارة المعلم",
          contestantName: currentContestant?.name || "المتسابق",
          pauseRemaining: curRem6,
          timestamp: Date.now()
        };
      }
      showTeacherHelpModal(null, currentContestant?.name, card.title, 6);
      break;

    case 7: // السؤال الذهبي: مضاعفة النقاط حتى 10 نقاط
      registerActiveEffect(card, { goldenQuestion: true, doublePoints: true, maxPoints: 10 });
      showFloatingCardPill("السؤال الذهبي (10 درجات)", "fa-coins", "gold");
      showToast("السؤال الذهبي: مضاعفة درجات هذا السؤال حتى 10 درجات عند الإجابة الصحيحة!", "fa-coins", 3500);
      break;

    case 8: // تجميد الوقت: 10 ثوانٍ
      registerActiveEffect(card, { freezeTime: 10 });
      broadcastTimerModification({ freezeSeconds: 10 });
      showFloatingCardPill("تجميد الوقت 10 ثوانٍ", "fa-snowflake", "blue");
      showToast("تجميد الوقت: العداد متوقف لمدة 10 ثوانٍ للتفكير بهدوء!", "fa-snowflake", 3000);
      break;

    case 9: // استبدال السؤال: بموافقة المشرف
      registerActiveEffect(card, { swapQuestion: true });
      showFloatingCardPill("استبدال السؤال", "fa-arrows-rotate", "blue");
      executeQuestionSwap();
      break;

    case 10: // هدوء وسكينة: +10 ثوانٍ
      registerActiveEffect(card, { timeDelta: 10 });
      broadcastTimerModification({ deltaSeconds: 10 });
      showFloatingCardPill("+10 ثوانٍ للوقت ⏱️", "fa-clock", "green");
      showToast("⏱️ هدوء وسكينة: تم إضافة 10 ثوانٍ كاملة للوقت المتبقي!", "fa-clock", 3000);
      break;

    case 11: // نجمة التلاوة: +1 نقطة في الشفهي
      registerActiveEffect(card, { oralBonus: 1 });
      showFloatingCardPill("+1 نقطة تلاوة شفهية ⭐", "fa-star", "gold");
      showToast("⭐ نجمة التلاوة: +1 نقطة إضافية للتقييم الشفهي المعتمد!", "fa-star", 3000);
      break;

    case 12: // نَفَس عميق: +3 ثوانٍ لكل سؤال حتى الدورة التالية
      registerActiveEffect(card, { timeDeltaPerQuestion: 3 });
      broadcastTimerModification({ deltaSeconds: 3 });
      showFloatingCardPill("+3 ثوانٍ لكل سؤال", "fa-wind", "green");
      showToast("نَفَس عميق: +3 ثوانٍ لكل سؤال حتى دورة البطاقات القادمة!", "fa-wind", 3000);
      break;

    case 13: // عين الصواب: تلميح تعليمي
      registerActiveEffect(card, { showHint: true });
      showFloatingCardPill("تلميح عين الصواب", "fa-eye", "gold");
      showToast("عين الصواب: تلميح تعليمي ذكي متاح لك أعلى السؤال!", "fa-eye", 3000);
      break;

    case 14: // تحدي الأبطال: نصف الوقت + 3 نقاط بونص
      const curRem14 = Math.max(6, liveTimeRemaining || 15);
      const halfDelta = -Math.floor(curRem14 / 2);
      broadcastTimerModification({ deltaSeconds: halfDelta });
      registerActiveEffect(card, { halfTime: true, pointsBonus: 3 });
      showFloatingCardPill("نصف الوقت مع +3 نقاط", "fa-medal", "gold");
      showToast(`تحدي الأبطال: تم تقليص الوقت للنصف، والصواب يمنحك +3 نقاط إضافية!`, "fa-medal", 3500);
      break;

    case 15: // فرصة ثانية
      registerActiveEffect(card, { secondChance: true });
      showFloatingCardPill("فرصة ثانية عند الخطأ", "fa-arrow-rotate-left", "green");
      showToast("فرصة ثانية: في حال الخطأ يُتاح لك محاولة ثانية فورية!", "fa-arrow-rotate-left", 3500);
      break;

    case 16: // بركة الإتقان: تسامح مع خطأ تجويدي بسيط في الشفهي
      registerActiveEffect(card, { forgiveMinorOralFault: true });
      showFloatingCardPill("بركة الإتقان", "fa-hand-holding-heart", "green");
      showToast("بركة الإتقان: تسامح في خطأ تجويدي بسيط في التقييم الشفهي دون خصم!", "fa-hand-holding-heart", 3500);
      break;

    case 17: // حصانة الترتيب: تثبيت أول عنصرين
      registerActiveEffect(card, { lockOrderingItems: 2 });
      showFloatingCardPill("تثبيت أول عنصرين", "fa-lock", "gold");
      showToast("حصانة الترتيب: تم تثبيت أول عنصرين في موضعهما الصحيح!", "fa-lock", 3500);
      break;

    case 18: // توصيل الحكمة: توصيل زوجين تلقائياً
      registerActiveEffect(card, { autoMatchPairs: 2 });
      showFloatingCardPill("توصيل زوجين تلقائياً", "fa-link", "green");
      showToast("توصيل الحكمة: تم ربط زوجين صحيحين تلقائياً!", "fa-link", 3500);
      break;

    case 19: // نور البيان: كشف القاعدة التجويدية
      registerActiveEffect(card, { showRuleInfo: true });
      showFloatingCardPill("كشف قاعدة نور البيان", "fa-book-quran", "gold");
      showToast("نور البيان: تم إظهار القاعدة التجويدية المتصلة بالسؤال!", "fa-book-quran", 3500);
      break;

    case 20: // مكافأة الثبات: +1 نقطة لكل إجابة متتالية خلال الدورة
      registerActiveEffect(card, { comboStreakBonus: 1 });
      showFloatingCardPill("مكافأة الثبات", "fa-chart-line", "gold");
      showToast("مكافأة الثبات: +1 نقطة إضافية لكل إجابة صحيحة متتالية خلال الدورة!", "fa-chart-line", 3500);
      break;

    case 21: // سهم الانطلاق والتخطي: تخطي السؤال الحالي + 3 نقاط
      showFloatingCardPill("تخطي السؤال الحالي +3 نقاط ⏭️", "fa-forward-fast", "gold");
      showToast("⏭️ سهم الانطلاق: تخطي السؤال الحالي بأمان ونيل +3 نقاط تكتيكية!", "fa-forward-fast", 3500);
      executeCurrentQuestionSkip(3);
      break;

    case 22: // درع التقييم: حد أدنى 4 درجات في الشفهي
      registerActiveEffect(card, { minOralRating: 4 });
      showFloatingCardPill("درع التقييم الشفهي", "fa-shield", "blue");
      showToast("درع التقييم: يضمن ألا يقل التقييم الشفهي عن 4 درجات من 5!", "fa-shield", 3500);
      break;

    case 23: // صوت الواثق: إزالة التوقيت عن السؤال الشفهي
      registerActiveEffect(card, { noTimeLimitOral: true });
      broadcastTimerModification({ noTimeLimit: true });
      showFloatingCardPill("صوت الواثق (بلا مؤقت)", "fa-microphone", "green");
      showToast("صوت الواثق: إلغاء الضغط الزمني عن السؤال الشفهي والتلاوة بارتياح!", "fa-microphone", 3500);
      break;

    case 24: // إعادة ترتيب الأوراق: إعادة ترتيب الأسئلة القادمة
      registerActiveEffect(card, { reorderRemainingQuestions: true });
      showFloatingCardPill("إعادة ترتيب الأسئلة القادمة", "fa-shuffle", "blue");
      executeDeckReorder();
      break;

    case 25: // قلب الموازين: تحويل السؤال إلى 7 نقاط
      registerActiveEffect(card, { bonusCapPoints: 7 });
      showFloatingCardPill("قلب الموازين (7 درجات)", "fa-gem", "gold");
      showToast("قلب الموازين: السؤال الحالي يستحق 7 درجات كحد أقصى عند الصواب!", "fa-gem", 3500);
      break;

    case 26: // التأني والسلامة: +15 ثانية
      registerActiveEffect(card, { timeDelta: 15 });
      broadcastTimerModification({ deltaSeconds: 15 });
      showFloatingCardPill("+15 ثانية للوقت ⏳", "fa-clock-rotate-left", "green");
      showToast("⏳ التأني والسلامة: تم إضافة 15 ثانية إضافية لوقت السؤال!", "fa-clock-rotate-left", 3500);
      break;

    case 27: // عين الحافظ: عرض سياق الآيات
      registerActiveEffect(card, { showVerseContext: true });
      showFloatingCardPill("سياق الآية الكريمة", "fa-compass", "gold");
      showToast("عين الحافظ: تم إظهار سياق الآية السابقة واللاحقة لمساعدتك!", "fa-compass", 3500);
      break;

    case 28: // مضاعف الشرف: +5 نقاط شرف عند الصواب
      registerActiveEffect(card, { honorPointsBonus: 5 });
      showFloatingCardPill("+5 نقاط شرف إضافية", "fa-arrow-up-right-dots", "gold");
      showToast("مضاعف الشرف: إجابة صحيحة تمنحك +5 نقاط شرف فورية في لوحة الشرف!", "fa-arrow-up-right-dots", 3500);
      break;

    case 29: // اختيار وتخطي السؤال القادم
      registerActiveEffect(card, { preSkipUpcomingQuestion: true, grantPoints: 3 });
      showFloatingCardPill("تحديد سؤال لاحق لتخطيه", "fa-list-check", "gold");
      openPreSkipQuestionModal();
      break;

    case 30: // حزام الأمان التجويدي: تسامح في خطأ مد أو غنة
      registerActiveEffect(card, { forgiveMaddGhunnahFault: true });
      showFloatingCardPill("حزام الأمان التجويدي", "fa-circle-check", "green");
      showToast("حزام الأمان: تسامح مع خطأ واحد في أحكام المد أو الغنة دون خصم!", "fa-circle-check", 3500);
      break;

    case 31: // الإيقاع السريع: +3 نقاط إذا أجاب في أقل من 5 ثوانٍ
      registerActiveEffect(card, { speedBonusUnder5s: 3 });
      showFloatingCardPill("الإيقاع السريع (< 5 ثوانٍ)", "fa-forward-fast", "gold");
      showToast("الإيقاع السريع: إجابة صحيحة في أقل من 5 ثوانٍ تمنح +3 نقاط إضافية!", "fa-forward-fast", 3500);
      break;

    case 32: // نور الصدر: ألوان الترتيل وعلامات الضبط
      registerActiveEffect(card, { coloredQuranHarakat: true });
      showFloatingCardPill("إبراز علامات الضبط والتجويد", "fa-highlighter", "gold");
      showToast("نور الصدر: تم إبراز حركات وضبط الكلمة القرآنية بوضوح تام!", "fa-highlighter", 3500);
      break;

    case 33: // مساعدة الزميل: توجيه المعلم مع استمرار المؤقت
      registerActiveEffect(card, { peerTeacherTip: true });
      showTeacherHelpModal(null, currentContestant?.name, card.title, 33);
      break;

    case 34: // طاقة العزيمة: إعادة شحن العداد إذا كان <= 5 ثوانٍ
      broadcastTimerModification({ reset: true });
      showFloatingCardPill("إعادة شحن المؤقت بالكامل", "fa-battery-full", "green");
      showToast("طاقة العزيمة: تمت إعادة ضبط مؤقت السؤال إلى مدته الكاملة!", "fa-battery-full", 3500);
      break;

    case 35: // وسام الشرف القرآني: +1 نقطة شرف دائمة فورية
      if (currentContestant) {
        recordHonorScore(currentContestant.name, 1);
      }
      registerActiveEffect(card, { permanentHonorPoint: 1 });
      showFloatingCardPill("+1 نقطة شرف دائمة", "fa-award", "gold");
      showToast("وسام الشرف القرآني: تم تسجيل نقطة شرف دائمة في رصيد المتسابق!", "fa-award", 4000);
      break;

    case 36: // توازن الحكماء: تقسيم 50/50 بين الدقة والسرعة
      registerActiveEffect(card, { balanceAccuracyAndSpeed: true });
      showFloatingCardPill("توازن الحكماء (دقة وسرعة)", "fa-scale-balanced", "blue");
      showToast("توازن الحكماء: تقسم درجات السؤال بالتساوي بين صحة الإجابة والسرعة!", "fa-scale-balanced", 3500);
      break;

    case 37: // صمام الأمان النهائي: تثبيت أعلى مجموع نقاط حتى النهاية
      const currentTotal = contestantScore || 0;
      if (currentLiveRoom) {
        currentLiveRoom.highestLockedScore = Math.max(currentLiveRoom.highestLockedScore || 0, currentTotal);
        updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
          highestLockedScore: currentLiveRoom.highestLockedScore,
          lastUpdated: serverTimestamp()
        }).catch(() => {});
      }
      registerActiveEffect(card, { lockHighestScoreUntilEnd: true, lockedScore: currentTotal });
      showFloatingCardPill("صمام الأمان (حماية المجموع)", "fa-vault", "gold");
      showToast(`صمام الأمان النهائي: تم تثبيت أعلى مجموع نقاط (${currentTotal} نقطة) كحد أدنى مضمون للمسابقة!`, "fa-vault", 4500);
      break;

    case 38: // الخط العثماني الميسر: تكبير 150% حتى الدورة القادمة
      registerActiveEffect(card, { zoomQuranScript: 1.5 });
      showFloatingCardPill("تكبير الخط العثماني 150%", "fa-magnifying-glass-plus", "blue");
      showToast("الخط العثماني الميسر: تم تكبير حجم الخط القرآني بنسبة 150% حتى الدورة القادمة!", "fa-magnifying-glass-plus", 3500);
      break;

    case 39: // السؤال المشترك: تشاور وتكييف السؤال
      registerActiveEffect(card, { jointTeacherSupervisorReview: true });
      showFloatingCardPill("السؤال المشترك", "fa-people-arrows", "blue");
      showToast("السؤال المشترك: إتاحة مراجعة وتكييف جزء السؤال المناسب لتقييم الطالب!", "fa-people-arrows", 3500);
      showTeacherHelpModal(null, currentContestant?.name, card.title, 39);
      break;

    case 40: // ختام المسك: 5 نقاط كاملة كحد أقصى لآخر سؤال
      registerActiveEffect(card, { finaleBonusCap: 5 });
      showFloatingCardPill("ختام المسك (5 نقاط كاملة)", "fa-crown", "gold");
      showToast("ختام المسك: آخر سؤال في المسابقة يستحق 5 نقاط كاملة تقديراً للاجتهاد!", "fa-crown", 4000);
      break;

    default:
      registerActiveEffect(card, {});
      showFloatingCardPill(`تفعيل «${card.title}»`, card.icon || "fa-bolt", "gold");
      showToast(`تم تفعيل بطاقة: «${card.title}»!`, card.icon, 3000);
      break;
  }

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

walletModal?.addEventListener("click", (e) => {
  if (e.target === walletModal) {
    closeSynchronizedWallet(true);
  }
});

// ========================================================
// دليل وقسم البطاقات التكتيكية الكامل عند المشرف (دليل الـ 40 بطاقة)
// ========================================================
function renderSupervisorCardsCatalog(activeFilter = "all", searchQuery = "") {
  const grid = document.getElementById("cardsCatalogGrid");
  if (!grid) return;

  const query = (searchQuery || "").trim().toLowerCase();

  const filtered = TACTICAL_CARDS.filter(card => {
    // فلاتر الفئات والنطاق الزمني
    if (activeFilter === "buff" && card.type !== "buff") return false;
    if (activeFilter === "risk" && card.type !== "risk") return false;
    if (activeFilter === "instant" && card.scope !== "instant") return false;
    if (activeFilter === "cycle" && card.scope !== "cycle") return false;
    if (activeFilter === "timer" && card.applicableTo !== "timer" && !(card.effect?.timeDelta || card.effect?.timeDeltaPerQuestion || card.effect?.freezeTime || card.effect?.resetTimerIfLow || card.effect?.noTimeLimitOral || card.effect?.halfTime)) return false;
    if (activeFilter === "score" && !(card.effect?.pointsBonus || card.effect?.doublePoints || card.effect?.bonusCapPoints || card.effect?.honorPointsBonus || card.effect?.permanentHonorPoint || card.effect?.oralBonus || card.effect?.comboStreakBonus)) return false;
    if (activeFilter === "help" && !(card.effect?.teacherConsultation || card.effect?.peerTeacherTip || card.effect?.showHint || card.effect?.showRuleInfo || card.effect?.secondChance || card.effect?.eliminateOptions || card.effect?.forgiveMinorOralFault || card.effect?.forgiveMaddGhunnahFault)) return false;

    // بحث النص
    if (query) {
      const matchTitle = (card.title || "").toLowerCase().includes(query);
      const matchDesc = (card.desc || "").toLowerCase().includes(query);
      const matchId = String(card.id) === query;
      const matchMechanics = (card.mechanicsText || "").toLowerCase().includes(query);
      return matchTitle || matchDesc || matchId || matchMechanics;
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
    const scopeLabel = formatCardScopeLabel(card.scope);
    return `
      <div class="catalog-card-item ${card.type}">
        <div>
          <div class="catalog-card-top-row">
            <span class="catalog-card-id-pill">#${card.id}</span>
            <div class="catalog-card-icon-box">
              <i class="fa-solid ${card.icon}"></i>
            </div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;">
              <span class="wallet-card-tag">${card.type === 'buff' ? 'ميزة إيجابية' : 'مخاطرة ذكية'}</span>
              <span class="badge-scope-pill" style="font-size:11px;background:#f3e8ff;color:#7e22ce;padding:3px 8px;border-radius:12px;font-weight:800;">${scopeLabel}</span>
            </div>
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
          <i class="fa-solid fa-gift"></i> ${hasLiveRoom ? 'منح البطاقة لمحفظة المتسابق الحالي' : 'منح للمتسابق (يلزم غرفة نشطة)'}
        </button>
      </div>
    `;
  }).join("");

  // أحداث زر المنح السريع للمشرف
  grid.querySelectorAll(".catalog-card-grant-btn:not([disabled])").forEach(btn => {
    btn.addEventListener("click", () => {
      const cId = parseInt(btn.getAttribute("data-card-id"));
      const targetCard = getCardById(cId);
      if (!targetCard) return;

      if (!currentLiveRoom || !currentLiveRoom.id) {
        showToast("يرجى فتح غرفة مسابقة حية أولاً لمنح البطاقة للمتسابق", "fa-info-circle");
        return;
      }

      addCardToContestantWallet(targetCard.id);
      logCardEvent(targetCard.id, targetCard.title, currentUser?.name || "المشرف", "grant", "قام المشرف بمنح البطاقة لمحفظة المتسابق.");

      updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
        contestantWallet: arrayUnion(targetCard.id),
        cardEventsLog: currentLiveRoom.cardEventsLog || [],
        lastUpdated: serverTimestamp()
      }).catch(err => console.warn("Grant card error:", err));

      showToast(`قام المشرف بمنح بطاقة «${targetCard.title}» لمحفظة المتسابق!`, targetCard.icon, 3500);
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

// تفعيل زر المشرف اليدوي لإظهار البطاقات التكتيكية الـ 40 في أي لحظة
btnTriggerTacticalCards?.addEventListener("click", () => {
  if (!currentLiveRoom || !currentLiveRoom.id) {
    showToast("يرجى بدء المسابقة في الغرفة الحية أولاً", "fa-circle-exclamation");
    return;
  }
  const isLeader = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name));
  if (!isLeader) {
    showToast("المشرف فقط هو المخوّل بفتح جولة البطاقات التكتيكية يدوياً", "fa-lock");
    return;
  }
  showToast("جاري فتح جولة البطاقات التكتيكية الثلاثية الأبعاد...", "fa-bolt", 2500);
  triggerTacticalCardsModal(() => {
    showToast("تم إكمال جولة البطاقات التكتيكية بنجاح!", "fa-circle-check");
  });
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

  const studentUser = participantsCache.find(p => p.name === studentName);
  const initialBase = (currentLiveRoom && typeof currentLiveRoom.contestantInitialBaseScore === "number")
    ? currentLiveRoom.contestantInitialBaseScore
    : (typeof contestantBaseScore === "number" ? contestantBaseScore : (studentUser?.totalScore || 0));

  // النتيجة الإجمالية المعتمدة النهائية = الرصيد الابتدائي + نقاط الجلسة
  const newTotal = Math.max(0, initialBase + sessionFinalScore);

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

function showHonorBoardModal(openNextStudentAfter = false, onDone = null, highlightStudentName = null, scoreDelta = 0, isPenalty = false, cardBonus = 0, basePoints = 0) {
  if (!honorBoardModal || !honorPodiumList) {
    if (typeof onDone === 'function') onDone();
    return;
  }

  // حساب النقاط السابقة والنهائية للمتسابق الحالي بدقة وموثوقية دون أي جمع مكرر
  let currentTargetScore = 0;
  let previousTargetScore = 0;
  if (highlightStudentName) {
    const studentUser = participantsCache.find(p => p.name === highlightStudentName);
    const initialBase = (currentLiveRoom && typeof currentLiveRoom.contestantInitialBaseScore === "number")
      ? currentLiveRoom.contestantInitialBaseScore
      : (typeof contestantBaseScore === "number" ? contestantBaseScore : (studentUser?.totalScore || 0));

    // الرصيد النهائي المعتمد الحالي دائماً = الرصيد الابتدائي + رصيد الجلسة
    currentTargetScore = Math.max(0, initialBase + contestantScore);
    previousTargetScore = Math.max(0, currentTargetScore - scoreDelta);

    const existingEntry = honorLeaderboardCache.find(x => x.name === highlightStudentName);
    if (existingEntry) {
      existingEntry.score = currentTargetScore;
      existingEntry.timestamp = new Date().toISOString();
    } else {
      honorLeaderboardCache.push({ name: highlightStudentName, score: currentTargetScore, timestamp: new Date().toISOString() });
    }
    honorLeaderboardCache.sort((a, b) => b.score - a.score);
    localStorage.setItem("nour_honor_board", JSON.stringify(honorLeaderboardCache));
    syncHonorBoardToCloud();
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

  // رسم صفوف لوحة الشرف مع إبراز نقاط السؤال الأساسية وبونص البطاقات التكتيكية جنباً إلى جنب
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
        if (isPenalty) {
          badgeHtml = `<span class="score-delta-popup penalty">${scoreDelta}</span>`;
        } else if (cardBonus > 0 && basePoints > 0) {
          badgeHtml = `
            <div class="honor-score-delta-group">
              <span class="score-delta-popup bonus-base" title="نقاط السؤال الأساسية">+${basePoints} أساسي</span>
              <span class="score-delta-popup bonus-cards" title="نقاط إضافية من البطاقات التكتيكية"><i class="fa-solid fa-bolt"></i> +${cardBonus} بطاقات</span>
              <span class="score-delta-popup bonus-total" title="إجمالي النقاط المكتسبة">+${scoreDelta}</span>
            </div>
          `;
        } else if (cardBonus > 0 && basePoints === 0) {
          badgeHtml = `
            <div class="honor-score-delta-group">
              <span class="score-delta-popup bonus-cards" title="نقاط تكتيكية من البطاقة"><i class="fa-solid fa-bolt"></i> +${cardBonus} بطاقات</span>
            </div>
          `;
        } else {
          badgeHtml = `<span class="score-delta-popup bonus">+${scoreDelta}</span>`;
        }
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

  // ── 1. أنيميشن عداد الأرقام المتصاعد بتمهل وسلاسة (1.8 ثانية لمشاهدة إضافة النقاط بوضوح) ──
  if (highlightStudentName && scoreDelta !== 0) {
    const scoreValEl = document.getElementById("activeStudentHonorScore");
    if (scoreValEl) {
      scoreValEl.classList.add("honor-score-rolling");
      const duration = 1800; // 1.8 ثانية هادئة وممتعة تتيح رؤية النقاط تتصاعد أمام الجميع
      const startTime = performance.now();
      const startNum = previousTargetScore;
      const endNum = currentTargetScore;
      let lastAudioTickTime = 0;

      function updateCounter(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // حركة إبطاء ناعمة (ease-out cubic)
        const easeVal = 1 - Math.pow(1 - progress, 3);
        const currentNum = Math.round(startNum + (endNum - startNum) * easeVal);
        if (scoreValEl) {
          scoreValEl.textContent = `${currentNum} نقطة`;
        }
        if (progress < 1) {
          if (now - lastAudioTickTime > 110) {
            lastAudioTickTime = now;
            try { soundFX.btnClick(); } catch (e) {}
          }
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
            }, 300);
          }
        }
      }

      setTimeout(() => {
        requestAnimationFrame(updateCounter);
      }, 250);
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

    showToast(`تقدم مذهل! المتسابق (${highlightStudentName}) تجاوز ${climbCount} ${climbCount === 1 ? 'منافس' : 'منافسين'} وصعد للمركز #${newRank}!`, "fa-rocket", 3500);
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
        try {
          onDone();
        } catch (err) {
          console.warn("Honor modal onDone notice:", err);
        }
      } else if (openNextStudentAfter) {
        openPickStudentModal();
      }
    }, 380);
  }

  honorBoardModal.onclick = (e) => {
    if (e.target === honorBoardModal) {
      dismissHonorModal();
    }
  };

  const closeBtn = honorBoardModal.querySelector("[data-close-modal='honorBoardModal']");
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      dismissHonorModal();
    };
  }

  let secLeft = (didClimb || (scoreDelta !== 0)) ? 6 : 4;
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
      showToast(`تم الحفظ والمزامنة محلياً (${stats.users} حساب، ${stats.quizzes} اختبار، ${stats.rooms} غرفة)`, "fa-cloud");
      showRealtimeSyncPill(`وضع الاستعداد: تم تحديث الواجهات بالبيانات المحفوظة بنجاح`);
    } else {
      showToast(`تم تحديث السحابة بنجاح! (${stats.users} حساب، ${stats.quizzes} اختبار، ${stats.rooms} غرفة نشطة)`, "fa-cloud-arrow-down");
      showRealtimeSyncPill(`اكتمل التحديث السحابي: ${stats.users} حساب · ${stats.quizzes} اختبار · ${stats.rooms} غرفة نشطة`);
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
      showToast(`تم تحديث اللوحة بالبيانات المحفوظة (${stats.users} حساب، ${stats.quizzes} اختبار)`, "fa-cloud");
    } else {
      showToast(`تم تحديث جميع البيانات من السحابة (${stats.users} حساب، ${stats.quizzes} اختبار، ${stats.rooms} غرفة)`, "fa-circle-check");
    }
  } catch (err) {
    console.error("Supervisor cloud refresh notice:", err);
    showToast("تم تحديث لوحة التحكم بنجاح", "fa-circle-check");
  } finally {
    if (icon) icon.className = "fa-solid fa-arrows-rotate";
    hideGlobalLoader();
  }
});

// زر إعادة تعيين لوحة الشرف (للمشرف العام) - يصفر لوحة الشرف ونقاط حسابات جميع الطلاب فورياً وسحابياً
document.getElementById("btnResetHonorBoard")?.addEventListener("click", async () => {
  const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name));
  if (!isSup) {
    showToast("صلاحية إعادة تعيين لوحة الشرف خاصة بالمشرف العام فقط", "fa-triangle-exclamation");
    return;
  }

  const confirmed = await showInAppConfirm({
    title: "تصفير لوحة الشرف ونقاط الطلاب",
    message: "هل أنت متأكد من تصفير لوحة الشرف وإعادة تعيين نقاط جميع الطلاب إلى الصفر؟ سيتم تصفير النقاط في حسابات الطلاب سحابياً ولحظياً.",
    confirmText: "نعم، تصفير النقاط بالكامل",
    cancelText: "إلغاء وتراجع",
    type: "danger",
    icon: "fa-trash-can"
  });

  if (!confirmed) return;

  showGlobalLoader("جاري تصفير النقاط...", "يتم الآن تصفير لوحة الشرف ونقاط جميع الطلاب سحابياً ومحلياً...");

  try {
    // 1. تصفير لوحة الشرف محلياً وسحابياً
    honorLeaderboardCache = [];
    localStorage.setItem("nour_honor_board", JSON.stringify([]));
    await syncHonorBoardToCloud();

    // 2. تصفير نقاط جميع الطلاب في سجل الحسابات وسحابياً
    if (Array.isArray(participantsCache)) {
      const updatePromises = [];
      participantsCache.forEach(p => {
        p.totalScore = 0;
        p.score = 0;
        if (p.id && db) {
          const pRef = doc(db, "participants", p.id);
          updatePromises.push(
            setDoc(pRef, { totalScore: 0, score: 0, lastUpdated: serverTimestamp() }, { merge: true })
              .catch(e => console.warn("Sync reset error for", p.id, e))
          );
        }
      });
      await Promise.all(updatePromises);
      saveParticipants();
    }

    // 3. تحديث حساب المستخدم الحالي إن كان طالباً أو مسجلاً
    if (currentUser) {
      currentUser.totalScore = 0;
      currentUser.score = 0;
      localStorage.setItem("active_quran_user", JSON.stringify(currentUser));
      localStorage.setItem("nour_saved_user", JSON.stringify(currentUser));
      const scoreEl = document.getElementById("studentTotalScoreDisplay");
      if (scoreEl) scoreEl.textContent = "0 نقطة";
    }

    // 4. تحديث الجداول واللوحة
    renderAccountsTable();
    renderHonorLeaderboardTab();
    showToast("تمت إعادة تعيين لوحة الشرف وتصفير نقاط الطلاب في جميع الحسابات بنجاح!", "fa-circle-check");
  } catch (err) {
    console.error("Reset honor board error:", err);
    showToast("حدث خطأ أثناء تصفير النقاط: " + (err.message || ""), "fa-triangle-exclamation");
  } finally {
    hideGlobalLoader();
  }
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
        showToast("تم تطبيق ميزة البطاقة في تدريبك الحالي بنجاح!", "fa-bolt");
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
                showToast(`تم توصيل جميع الأزواج بنجاح! (+${q.points || 5} درجات)`, "fa-circle-check");
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
            showToast("يرجى ترتيب جميع الكلمات أولاً", "fa-triangle-exclamation");
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
            showToast(`أحسنت! الترتيب متقن وصحيح (+${q.points || 5} درجات)`, "fa-circle-check");
          } else {
            try { soundFX.wrong(); } catch (err) {}
            slotsEl.classList.add("shake-wrong");
            setTimeout(() => slotsEl.classList.remove("shake-wrong"), 500);
            showToast("الترتيب غير دقيق، حاول مرة أخرى", "fa-xmark");
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

// =========================================================
// محرك ونظام مسابقات الفرق التنافسي المتكامل (Teams Competition Mode)
// يشمل: إدارة الفرق السحابية، العرض السينمائي، الفقرات الأربع، والتتويج النهائي
// =========================================================

let teamsCache = [];
try {
  const savedTeams = localStorage.getItem("nour_teams");
  if (savedTeams) teamsCache = JSON.parse(savedTeams);
} catch (e) {}

const TEAM_COLOR_SCHEMES = {
  blue: { name: "أزرق ملكي", bg: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)", border: "#60a5fa", text: "#ffffff", icon: "fa-shield-halved", hex: "#1d4ed8" },
  red: { name: "أحمر ياقوتي", bg: "linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)", border: "#f87171", text: "#ffffff", icon: "fa-fire", hex: "#b91c1c" },
  emerald: { name: "أخضر زمردي", bg: "linear-gradient(135deg, #047857 0%, #065f46 100%)", border: "#34d399", text: "#ffffff", icon: "fa-leaf", hex: "#047857" },
  gold: { name: "ذهبي لامع", bg: "linear-gradient(135deg, #ca8a04 0%, #a16207 100%)", border: "#facc15", text: "#ffffff", icon: "fa-crown", hex: "#ca8a04" },
  purple: { name: "بنفسجي ملكي", bg: "linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)", border: "#c084fc", text: "#ffffff", icon: "fa-bolt", hex: "#6d28d9" },
  amber: { name: "برتقالي ناري", bg: "linear-gradient(135deg, #c2410c 0%, #9a3412 100%)", border: "#fb923c", text: "#ffffff", icon: "fa-star", hex: "#c2410c" }
};

function ensureDefaultTeams() {
  if (teamsCache.length === 0) {
    const students = participantsCache.filter(p => p.role === "student");
    const half = Math.ceil(students.length / 2);
    const m1 = students.slice(0, Math.max(2, half)).map(s => ({ id: s.id, name: s.name, school: s.school, grade: s.grade }));
    const m2 = students.slice(half).map(s => ({ id: s.id, name: s.name, school: s.school, grade: s.grade }));
    teamsCache = [
      {
        id: "team_forsan",
        name: "فرسان القرآن",
        color: "blue",
        icon: "fa-shield-halved",
        members: m1.length > 0 ? m1 : [
          { id: "st_1", name: "محمد أحمد علي", school: "مدرسة الفضيلة", grade: "الصف الأول" },
          { id: "st_2", name: "عمر خالد محمود", school: "مدرسة الفضيلة", grade: "الصف الأول" },
          { id: "st_3", name: "إبراهيم يوسف السعيد", school: "مدرسة الفضيلة", grade: "الصف الأول" }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: "team_ashbal",
        name: "أشبال الهدى",
        color: "red",
        icon: "fa-fire",
        members: m2.length > 0 ? m2 : [
          { id: "st_4", name: "عبدالله مصطفى كريم", school: "مدرسة النور", grade: "الصف الأول" },
          { id: "st_5", name: "حمزة طارق حسن", school: "مدرسة النور", grade: "الصف الأول" },
          { id: "st_6", name: "زياد أيمن المنصور", school: "مدرسة النور", grade: "الصف الأول" }
        ],
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem("nour_teams", JSON.stringify(teamsCache));
    teamsCache.forEach(t => syncTeamToCloud(t).catch(() => {}));
  }
}

async function syncTeamToCloud(team) {
  if (!team || !team.id) return;
  try {
    const clean = sanitizeForFirestore(team);
    await withTimeout(setDoc(doc(db, "teams", team.id), {
      ...clean,
      lastUpdated: serverTimestamp()
    }, { merge: true }), 5000, null);
  } catch (e) {
    console.warn("syncTeamToCloud notice:", e);
  }
}

// أسماء أدوار التصفيات التلقائية
function getRoundNameForTeams(count) {
  if (count > 16) return "دور الـ 32";
  if (count > 8) return "دور الـ 16";
  if (count > 4) return "الدور ربع النهائي (دور الـ 8)";
  if (count > 2) return "الدور نصف النهائي (المربع الذهبي)";
  if (count === 2) return "المباراة النهائية الكبرى";
  return "المواجهة التصفوية";
}

// تهيئة شجرة البطولة التصفوية
function initTournamentBracket(teams) {
  ensureDefaultTeams();
  const validTeams = (Array.isArray(teams) && teams.length >= 2) ? teams : teamsCache.slice(0, 4);
  const teamIds = validTeams.map(t => t.id);

  let byeTeamId = null;
  let pendingIds = [...teamIds];
  let qualifiedIds = [];

  // إذا كان عدد الفرق فردياً (مثل 7 أو 9 فرق)، يتأهل فريق واحد عشوائياً بالقرعة (Bye) للدور التالي
  if (pendingIds.length % 2 !== 0 && pendingIds.length > 2) {
    const byeIdx = Math.floor(Math.random() * pendingIds.length);
    byeTeamId = pendingIds.splice(byeIdx, 1)[0];
    qualifiedIds.push(byeTeamId);
  }

  const roundName = getRoundNameForTeams(validTeams.length);

  return {
    teams: validTeams,
    currentRoundIndex: 0,
    currentRoundName: roundName,
    isFinished: false,
    championTeam: null,
    runnerUpTeam: null,
    fullStandings: [],
    rounds: [
      {
        roundIndex: 0,
        roundName: roundName,
        initialTeamsCount: validTeams.length,
        pendingTeamIds: pendingIds,
        qualifiedTeamIds: qualifiedIds,
        eliminatedTeamIds: [],
        byeTeamId: byeTeamId,
        matches: []
      }
    ]
  };
}

// عرض وتحديث شبكة الفرق المتعددة في مودال إنشاء المسابقة
function renderTournamentTeamsChecklist() {
  ensureDefaultTeams();
  const grid = document.getElementById("tournamentTeamsMultiSelectGrid");
  const countDisplay = document.getElementById("tournamentSelectedCountDisplay");
  if (!grid) return;

  grid.innerHTML = teamsCache.map(t => {
    const scheme = TEAM_COLOR_SCHEMES[t.color] || TEAM_COLOR_SCHEMES.blue;
    const membersCount = t.members ? t.members.length : 0;
    return `
      <label class="duo-team-checkbox-card checked" data-team-id="${escapeHtml(t.id)}">
        <div style="display:flex;align-items:center;gap:8px;overflow:hidden;">
          <input type="checkbox" class="chk-tournament-team" value="${escapeHtml(t.id)}" checked style="accent-color:${scheme.hex};">
          <div style="width:26px;height:26px;border-radius:6px;background:${scheme.badgeBg || '#f1f5f9'};color:${scheme.hex};display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;">
            <i class="fa-solid ${t.icon || 'fa-shield-halved'}"></i>
          </div>
          <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:900;color:#1e293b;">
            ${escapeHtml(t.name)}
          </div>
        </div>
        <small style="color:#64748b;font-size:11px;font-weight:800;white-space:nowrap;">${membersCount} طلاب</small>
      </label>
    `;
  }).join("");

  function updateSelectedCount() {
    const checked = grid.querySelectorAll(".chk-tournament-team:checked");
    const count = checked.length;
    if (countDisplay) {
      countDisplay.textContent = String(count);
      countDisplay.style.color = count >= 2 ? "#1d4ed8" : "#ef4444";
    }
    grid.querySelectorAll(".duo-team-checkbox-card").forEach(c => {
      const chk = c.querySelector(".chk-tournament-team");
      c.classList.toggle("checked", !!chk?.checked);
    });
  }

  grid.querySelectorAll(".chk-tournament-team").forEach(chk => {
    chk.addEventListener("change", updateSelectedCount);
  });

  updateSelectedCount();

  // تفعيل أزرار التحديد السريع
  const btnSelectAll = document.getElementById("btnSelectAllTournamentTeams");
  if (btnSelectAll) {
    btnSelectAll.onclick = () => {
      grid.querySelectorAll(".chk-tournament-team").forEach(c => c.checked = true);
      updateSelectedCount();
    };
  }

  const btnDeselectAll = document.getElementById("btnDeselectAllTournamentTeams");
  if (btnDeselectAll) {
    btnDeselectAll.onclick = () => {
      grid.querySelectorAll(".chk-tournament-team").forEach(c => c.checked = false);
      updateSelectedCount();
    };
  }

  document.querySelectorAll(".btn-pick-preset-count").forEach(btn => {
    btn.onclick = () => {
      const targetCount = parseInt(btn.getAttribute("data-count")) || 2;
      const allCheckboxes = grid.querySelectorAll(".chk-tournament-team");
      allCheckboxes.forEach((c, idx) => {
        c.checked = idx < targetCount;
      });
      updateSelectedCount();
      showToast(`تم تحديد أول ${targetCount} فرق للبطولة بنجاح`, "fa-check");
    };
  });
}

function renderTeamsSelectOptions() {
  renderTournamentTeamsChecklist();
  ensureDefaultTeams();
  const selA = document.getElementById("selectTeamA");
  const selB = document.getElementById("selectTeamB");
  if (!selA || !selB) return;

  const buildOptions = (selectedId) => {
    return teamsCache.map((t) => {
      const scheme = TEAM_COLOR_SCHEMES[t.color] || TEAM_COLOR_SCHEMES.blue;
      const isSel = t.id === selectedId;
      return `<option value="${t.id}" data-color="${t.color}" style="background:#ffffff; color:${scheme.hex}; font-weight:800;" ${isSel ? 'selected' : ''}>
        ${t.name} (${t.members ? t.members.length : 0} طلاب) - ${scheme.name}
      </option>`;
    }).join("");
  };

  const firstId = teamsCache[0]?.id || "";
  const secondId = teamsCache.length > 1 ? teamsCache[1].id : firstId;

  selA.innerHTML = buildOptions(firstId);
  selB.innerHTML = buildOptions(secondId);

  if (teamsCache.length > 1) {
    selB.value = secondId;
  }
}

// إدارة نافذة إنشاء وتعديل الفريق
let selectedTeamStudents = [];
function openCreateTeamModal(teamToEdit = null) {
  selectedTeamStudents = [];
  const modal = document.getElementById("createTeamModal");
  const titleEl = document.getElementById("createTeamModalTitle");
  const editIdInput = document.getElementById("editTeamId");
  const nameInput = document.getElementById("newTeamNameInput");
  const colorSelect = document.getElementById("newTeamColorSelect");
  const submitBtn = document.getElementById("btnSubmitSaveTeam");

  if (teamToEdit) {
    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-users-gear"></i> تعديل بيانات وتشكيلة الفريق`;
    if (editIdInput) editIdInput.value = teamToEdit.id;
    if (nameInput) nameInput.value = teamToEdit.name;
    if (colorSelect) colorSelect.value = teamToEdit.color || "blue";
    if (submitBtn) submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> حفظ التعديلات سحابياً للجميع`;
    selectedTeamStudents = teamToEdit.members ? [...teamToEdit.members] : [];
  } else {
    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-users-gear"></i> إنشاء وتجهيز فريق جديد`;
    if (editIdInput) editIdInput.value = "";
    if (nameInput) nameInput.value = "";
    if (colorSelect) colorSelect.value = "blue";
    if (submitBtn) submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> حفظ الفريق واعتماده سحابياً`;
    selectedTeamStudents = [];
  }

  const searchInput = document.getElementById("searchTeamStudentsInput");
  if (searchInput) searchInput.value = "";
  const inlineInput = document.getElementById("inlineStudentNameInput");
  if (inlineInput) inlineInput.value = "";

  renderTeamStudentsChecklist();
  modal?.classList.remove("hidden");
  if (nameInput) setTimeout(() => nameInput.focus(), 100);
}

function renderTeamStudentsChecklist(searchQuery = "") {
  const container = document.getElementById("teamStudentsChecklistContainer");
  const badge = document.getElementById("selectedTeamMembersCountBadge");
  if (!container) return;
  const q = normalizeArabic((searchQuery || "").trim());
  const students = participantsCache.filter(p => p.role === "student");
  const filtered = q ? students.filter(s => normalizeArabic(s.name || "").includes(q) || normalizeArabic(s.school || "").includes(q)) : students;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;color:#94a3b8;font-size:12px;padding:16px;">
        <i class="fa-solid fa-users-slash" style="font-size:22px;display:block;margin-bottom:6px;color:#cbd5e1;"></i>
        لا يوجد طلاب مطابقين للبحث. يمكنك كتابة اسم الطالب وإضافته فوراً من الحقل بالأسفل.
      </div>
    `;
  } else {
    container.innerHTML = filtered.map(s => {
      const isChecked = selectedTeamStudents.some(x => (x.id && s.id && String(x.id) === String(s.id)) || (x.name && s.name && x.name.trim() === s.name.trim()));
      const activeStyle = isChecked
        ? "background:#eff6ff;border:1.5px solid #2563eb;color:#1e3a8a;box-shadow:0 1px 3px rgba(37,99,235,0.12);"
        : "background:#ffffff;border:1px solid #e2e8f0;color:#1e293b;";
      const checkIcon = isChecked
        ? `<i class="fa-solid fa-circle-check" style="color:#2563eb;font-size:17px;"></i>`
        : `<i class="fa-regular fa-circle" style="color:#94a3b8;font-size:17px;"></i>`;

      return `
        <div class="team-student-check-row" data-student-id="${escapeHtml(String(s.id))}" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;user-select:none;transition:all 0.15s ease;${activeStyle}">
          <div style="display:flex;align-items:center;gap:10px;pointer-events:none;">
            ${checkIcon}
            <span style="font-weight:800;">${escapeHtml(s.name)}</span>
          </div>
          <span style="font-size:11px;color:${isChecked ? '#1d4ed8' : '#64748b'};font-weight:700;pointer-events:none;background:${isChecked ? '#dbeafe' : '#f1f5f9'};padding:2px 8px;border-radius:6px;">
            ${escapeHtml(s.school || 'مدرسة نور البيان')}
          </span>
        </div>
      `;
    }).join("");
  }

  // تفعيل الاختيار الفوري والمباشر بنقرة واحدة فقط على كامل سطر الطالب
  container.querySelectorAll(".team-student-check-row").forEach(row => {
    row.addEventListener("click", () => {
      const sId = row.getAttribute("data-student-id");
      const found = participantsCache.find(p => String(p.id) === String(sId));
      if (!found) return;

      const idx = selectedTeamStudents.findIndex(x => (x.id && found.id && String(x.id) === String(found.id)) || (x.name && found.name && x.name.trim() === found.name.trim()));
      if (idx >= 0) {
        selectedTeamStudents.splice(idx, 1);
      } else {
        selectedTeamStudents.push({
          id: found.id,
          name: found.name,
          school: found.school || "مدرسة نور البيان",
          grade: found.grade || "الصف الأول"
        });
      }
      renderTeamStudentsChecklist(document.getElementById("searchTeamStudentsInput")?.value || "");
    });
  });

  if (badge) {
    badge.textContent = `${selectedTeamStudents.length} طلاب محددين`;
    badge.style.color = selectedTeamStudents.length >= 2 ? "#16a34a" : "#2563eb";
  }
}

document.getElementById("btnOpenCreateTeamModal")?.addEventListener("click", () => openCreateTeamModal(null));
document.getElementById("btnOpenCreateTeamModalTab")?.addEventListener("click", () => openCreateTeamModal(null));
document.getElementById("searchTeamStudentsInput")?.addEventListener("input", (e) => {
  renderTeamStudentsChecklist(e.target.value);
});

// إضافة طالب غير مسجل فورياً للفريق بنقرة واحدة مع مزامنة خلفية فورية دون تجميد
function addInlineStudentToTeam() {
  const nameInput = document.getElementById("inlineStudentNameInput");
  const rawName = nameInput?.value.trim();
  if (!rawName || rawName.length < 2) {
    showToast("يرجى إدخال اسم الطالب (مثال: أحمد محمد علي)", "fa-triangle-exclamation");
    nameInput?.focus();
    return;
  }
  const norm = normalizeArabic(rawName);
  let student = participantsCache.find(p => p.normalizedName === norm || (p.name && p.name.trim() === rawName));
  if (!student) {
    student = {
      id: "part_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      name: rawName,
      normalizedName: norm,
      role: "student",
      school: "مدرسة نور البيان",
      grade: "الصف الأول",
      totalScore: 0,
      createdAt: new Date().toISOString()
    };
    participantsCache.unshift(student);
    localStorage.setItem("nour_participants", JSON.stringify(participantsCache));
    syncParticipantToCloud(student).catch(err => console.warn("Background participant sync notice:", err));
  }

  const alreadySelected = selectedTeamStudents.some(x => (x.id && student.id && String(x.id) === String(student.id)) || (x.name && student.name && x.name.trim() === student.name.trim()));
  if (!alreadySelected) {
    selectedTeamStudents.push({
      id: student.id,
      name: student.name,
      school: student.school || "مدرسة نور البيان",
      grade: student.grade || "الصف الأول"
    });
  }

  if (nameInput) {
    nameInput.value = "";
    nameInput.focus();
  }
  renderTeamStudentsChecklist(document.getElementById("searchTeamStudentsInput")?.value || "");
  showToast(`تمت إضافة وتحديد الطالب «${rawName}» في الفريق بنجاح!`, "fa-circle-check");
}

document.getElementById("btnInlineAddStudentToTeam")?.addEventListener("click", (e) => {
  e.preventDefault();
  addInlineStudentToTeam();
});

document.getElementById("inlineStudentNameInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addInlineStudentToTeam();
  }
});

// حفظ أو تعديل الفريق (سحابياً للجميع ومحلياً فورياً)
async function handleSaveTeam(e) {
  if (e && e.preventDefault) e.preventDefault();

  const nameInput = document.getElementById("newTeamNameInput");
  const name = nameInput?.value.trim();
  const color = document.getElementById("newTeamColorSelect")?.value || "blue";
  const targetTeamId = document.getElementById("editTeamId")?.value;

  if (!name) {
    showToast("يرجى كتابة اسم الفريق أولاً (مثال: فرسان القرآن)", "fa-triangle-exclamation");
    nameInput?.focus();
    return;
  }

  if (selectedTeamStudents.length === 0) {
    showToast("يرجى اختيار طالبين على الأقل لتكوين وتجهيز الفريق", "fa-triangle-exclamation");
    return;
  }

  const submitBtn = document.getElementById("btnSubmitSaveTeam");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري حفظ الفريق...`;
  }

  try {
    let savedTeamObj = null;

    if (targetTeamId) {
      // تعديل فريق قائم
      const teamIdx = teamsCache.findIndex(t => String(t.id) === String(targetTeamId));
      if (teamIdx >= 0) {
        teamsCache[teamIdx].name = name;
        teamsCache[teamIdx].color = color;
        teamsCache[teamIdx].icon = TEAM_COLOR_SCHEMES[color]?.icon || "fa-shield-halved";
        teamsCache[teamIdx].members = [...selectedTeamStudents];
        teamsCache[teamIdx].lastUpdated = new Date().toISOString();
        savedTeamObj = teamsCache[teamIdx];
      } else {
        savedTeamObj = {
          id: targetTeamId,
          name: name,
          color: color,
          icon: TEAM_COLOR_SCHEMES[color]?.icon || "fa-shield-halved",
          members: [...selectedTeamStudents],
          lastUpdated: new Date().toISOString()
        };
        teamsCache.push(savedTeamObj);
      }
    } else {
      // إنشاء فريق جديد
      savedTeamObj = {
        id: "team_" + Date.now(),
        name: name,
        color: color,
        icon: TEAM_COLOR_SCHEMES[color]?.icon || "fa-shield-halved",
        members: [...selectedTeamStudents],
        createdAt: new Date().toISOString()
      };
      teamsCache.push(savedTeamObj);
    }

    // حفظ محلي فوري
    localStorage.setItem("nour_teams", JSON.stringify(teamsCache));

    // إغلاق المودال فوراً وتحديث العرض
    document.getElementById("createTeamModal")?.classList.add("hidden");
    renderTeamsSelectOptions();
    renderTeamsManagementTab();

    // رسالة نجاح فورية ومؤكدة
    showToast(`تم حفظ وتجهيز فريق «${name}» (${selectedTeamStudents.length} طلاب) بنجاح!`, "fa-circle-check");

    // مزامنة سحابية هادئة في الخلفية
    if (savedTeamObj) {
      syncTeamToCloud(savedTeamObj).catch(err => console.warn("Background team sync notice:", err));
    }
  } catch (err) {
    console.error("Team save error:", err);
    showToast("تعذر حفظ الفريق: " + (err.message || "خطأ غير متوقع"), "fa-triangle-exclamation");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> حفظ الفريق واعتماده سحابياً`;
    }
  }
}

document.getElementById("createTeamForm")?.addEventListener("submit", handleSaveTeam);
document.getElementById("btnSubmitSaveTeam")?.addEventListener("click", handleSaveTeam);

// دالة حذف الفريق نهائياً من المنصة والسحابة
async function deleteTeam(teamId) {
  const team = teamsCache.find(t => t.id === teamId);
  const teamName = team ? team.name : "الفريق";
  const confirmed = await showInAppConfirm({
    title: `حذف ${teamName}`,
    message: `هل أنت متأكد من رغبتك في حذف فريق «${teamName}» نهائياً؟ سيتم حذفه من قاعدة البيانات وينعكس فوراً عند جميع المشرفين والطلاب.`,
    confirmText: "نعم، حذف الفريق",
    cancelText: "إلغاء وتراجع",
    type: "danger",
    icon: "fa-trash-can"
  });
  if (!confirmed) return;

  showGlobalLoader("جاري حذف الفريق...", "يتم الآن حذف الفريق من قاعدة البيانات السحابية...");
  try {
    teamsCache = teamsCache.filter(t => t.id !== teamId);
    localStorage.setItem("nour_teams", JSON.stringify(teamsCache));
    if (db && teamId) {
      await deleteDoc(doc(db, "teams", teamId)).catch(e => console.warn("Delete team doc error:", e));
    }
    renderTeamsManagementTab();
    renderTeamsSelectOptions();
    showToast(`تم حذف فريق «${teamName}» بنجاح!`, "fa-circle-check");
  } catch (err) {
    console.error("Delete team error:", err);
    showToast("حدث خطأ أثناء حذف الفريق", "fa-triangle-exclamation");
  } finally {
    hideGlobalLoader();
  }
}

// دالة عرض كروت الفرق الملونة في تبويب الفرق الخاص بالمشرف
function renderTeamsManagementTab() {
  const grid = document.getElementById("supervisorTeamsGrid");
  if (!grid) return;

  ensureDefaultTeams();

  if (!teamsCache || teamsCache.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px;">
        <i class="fa-solid fa-users-slash" style="font-size: 38px; color: #94a3b8; margin-bottom: 12px; display: block;"></i>
        <h4 style="font-size: 16px; font-weight: 900; color: #475569; margin-bottom: 6px;">لا توجد أي فرق منشأة حالياً</h4>
        <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">قم بإنشاء وتجهيز أول فريق تنافسي واختيار طلابه ولونه لتنظيم مواجهات حماسية</p>
        <button type="button" class="btn-duo-green" id="btnEmptyStateCreateTeam">
          <i class="fa-solid fa-plus"></i> إنشاء فريق جديد الآن
        </button>
      </div>
    `;
    document.getElementById("btnEmptyStateCreateTeam")?.addEventListener("click", () => openCreateTeamModal(null));
    return;
  }

  grid.innerHTML = teamsCache.map(team => {
    const scheme = TEAM_COLOR_SCHEMES[team.color] || TEAM_COLOR_SCHEMES.blue;
    const members = team.members || [];
    const membersCount = members.length;

    return `
      <div class="supervisor-team-card" data-team-id="${escapeHtml(team.id)}">
        <div class="team-card-banner" style="background: ${scheme.bg};">
          <div class="team-card-banner-info">
            <div class="team-card-icon-bubble">
              <i class="fa-solid ${scheme.icon || 'fa-shield-halved'}"></i>
            </div>
            <div>
              <h4 class="team-card-title-text">${escapeHtml(team.name)}</h4>
              <span style="font-size: 11px; opacity: 0.9; font-weight: 700;">هوية: ${scheme.name}</span>
            </div>
          </div>
          <span class="team-card-members-badge">
            <i class="fa-solid fa-users"></i> ${membersCount} طلاب
          </span>
        </div>

        <div class="team-card-body">
          <div class="team-card-members-title">
            <i class="fa-solid fa-user-group"></i> أعضاء وطلاب الفريق:
          </div>
          <div class="team-card-members-list">
            ${members.length > 0 ? members.map(m => `
              <div class="team-member-item">
                <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
                  <i class="fa-solid fa-circle-user" style="color: ${scheme.hex}; font-size: 13px;"></i>
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(m.name)}</span>
                </div>
                <span class="team-member-item-school">${escapeHtml(m.school || '--')}</span>
              </div>
            `).join("") : `<div style="text-align: center; color: #94a3b8; font-size: 12px; padding: 8px;">لا يوجد طلاب مضافون لهذا الفريق حالياً</div>`}
          </div>
        </div>

        <div class="team-card-footer">
          <button type="button" class="btn-duo-outline btn-sm btn-edit-team-card" data-team-id="${escapeHtml(team.id)}" style="font-size: 12px; padding: 6px 12px;">
            <i class="fa-solid fa-pen-to-square"></i> تعديل الفريق
          </button>
          <button type="button" class="btn-duo-red btn-sm btn-delete-team-card" data-team-id="${escapeHtml(team.id)}" style="font-size: 12px; padding: 6px 12px;">
            <i class="fa-solid fa-trash"></i> حذف
          </button>
        </div>
      </div>
    `;
  }).join("");

  grid.querySelectorAll(".btn-edit-team-card").forEach(btn => {
    btn.addEventListener("click", () => {
      const tid = btn.getAttribute("data-team-id");
      const team = teamsCache.find(t => t.id === tid);
      if (team) openCreateTeamModal(team);
    });
  });

  grid.querySelectorAll(".btn-delete-team-card").forEach(btn => {
    btn.addEventListener("click", () => {
      const tid = btn.getAttribute("data-team-id");
      if (tid) deleteTeam(tid);
    });
  });
}

// --------------------------------------------------------
// شاشة انتظار اللوبي في مسابقة الفرق (Team Lobby Info & Admission)
// --------------------------------------------------------
function renderTeamLobbyInfo(room) {
  if (!room || !room.isTeamMatch) return;
  const teamA = room.teams?.[0];
  const teamB = room.teams?.[1];
  if (!teamA || !teamB) return;

  // فحص صلاحية الدخول: فقط المشرف والطلاب في الفريقين مسموح لهم
  const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name) || currentUser.name === room.leaderName || currentUser.name === room.creatorName);
  const allMembers = [...(teamA.members || []), ...(teamB.members || [])];
  const isTeamMember = currentUser && allMembers.some(m => m.name === currentUser.name || (currentUser.normalizedName && m.normalizedName === currentUser.normalizedName));

  if (!isSup && !isTeamMember && currentUser) {
    currentUser.isSpectator = true;
    showToast("👀 أنت تشاهد مواجهة الفرق كجمهور — المشاركة مخصصة للطلاب المختارين فقط", "fa-eye", 4000);
  }
}

// --------------------------------------------------------
// العرض السينمائي التقديمي للفرق (Cinematic Team Entrance)
// --------------------------------------------------------
let isTeamEntranceActive = false;

// --------------------------------------------------------
// استخراج وتأمين توزيع أسئلة الاختبار كاملة بالتساوي على الفقرات الأربع
// --------------------------------------------------------
function ensureTeamQuestionsPopulated(room) {
  if (!room || !room.isTeamMatch) return;
  if (!room.roundQuestions || !Array.isArray(room.roundQuestions) || room.roundQuestions.length === 0 || !room.roundQuestionConfig) {
    const quiz = (room.quizData && room.quizData.sections) 
      ? room.quizData 
      : (quizzesCache.find(q => q.id === room.quizId) || quizzesCache[0]);
    
    let allQ = [];
    if (quiz && Array.isArray(quiz.sections)) {
      quiz.sections.forEach(s => {
        (s.questions || []).forEach(q => allQ.push({ ...q, sectionName: s.sectionName }));
      });
    }

    if (allQ.length === 0) {
      INITIAL_QUIZZES.forEach(qz => {
        (qz.sections || []).forEach(s => {
          (s.questions || []).forEach(q => allQ.push({ ...q, sectionName: s.sectionName }));
        });
      });
    }

    // ضمان وجود 4 أسئلة على الأقل لتغطية الفقرات الأربع بالتساوي دون انقطاع
    if (allQ.length > 0 && allQ.length < 4) {
      const origQ = [...allQ];
      while (allQ.length < 4) {
        allQ.push(...origQ.slice(0, 4 - allQ.length));
      }
    }

    allQ = allQ.sort(() => Math.random() - 0.5);

    const totalQ = allQ.length;
    const baseCount = Math.floor(totalQ / 4);
    const remainder = totalQ % 4;

    const roundConfig = {};
    let currentStart = 0;
    for (let r = 1; r <= 4; r++) {
      const count = Math.max(1, baseCount + (r <= remainder ? 1 : 0));
      roundConfig[r] = {
        start: currentStart,
        count: count
      };
      currentStart += count;
    }

    room.roundQuestions = allQ;
    room.drawnQuestions = allQ;
    room.roundQuestionConfig = roundConfig;
  }
}

async function startTeamContestLobbyToEntrance() {
  if (!currentLiveRoom || !currentLiveRoom.isTeamMatch) return;
  ensureTeamQuestionsPopulated(currentLiveRoom);

  currentLiveRoom.teamMemberTurnPool = {
    [currentLiveRoom.teams[0].id]: [],
    [currentLiveRoom.teams[1].id]: []
  };
  currentLiveRoom.lastPickedStudentByTeam = {};
  currentLiveRoom.phase = "team_intro";
  currentLiveRoom.teamIntroTimestamp = Date.now();
  currentLiveRoom.currentTeamRound = 1;
  currentLiveRoom.currentQuestionIdx = 0;
  await saveRooms(currentLiveRoom);
  runTeamEntranceCinematicShowcase();
}

function runTeamEntranceCinematicShowcase() {
  const overlay = document.getElementById("teamEntranceOverlay");
  if (!overlay || !currentLiveRoom || !currentLiveRoom.isTeamMatch) return;
  if (isTeamEntranceActive) return;
  isTeamEntranceActive = true;

  const teamA = currentLiveRoom.teams?.[0] || { name: "الفريق الأول", color: "blue", members: [] };
  const teamB = currentLiveRoom.teams?.[1] || { name: "الفريق الثاني", color: "red", members: [] };

  const schemeA = TEAM_COLOR_SCHEMES[teamA.color] || TEAM_COLOR_SCHEMES.blue;
  const schemeB = TEAM_COLOR_SCHEMES[teamB.color] || TEAM_COLOR_SCHEMES.red;

  const cardA = document.getElementById("introCardTeamA");
  const cardB = document.getElementById("introCardTeamB");
  if (cardA) {
    cardA.style.background = schemeA.bg;
    cardA.style.border = `3px solid ${schemeA.border}`;
    cardA.className = "team-intro-card team-right";
  }
  if (cardB) {
    cardB.style.background = schemeB.bg;
    cardB.style.border = `3px solid ${schemeB.border}`;
    cardB.className = "team-intro-card team-left";
  }

  const nameA = document.getElementById("introTeamAName");
  const nameB = document.getElementById("introTeamBName");
  if (nameA) nameA.textContent = teamA.name;
  if (nameB) nameB.textContent = teamB.name;

  const countA = document.getElementById("introTeamACount");
  const countB = document.getElementById("introTeamBCount");
  if (countA) countA.textContent = `${teamA.members?.length || 0} طلاب أبطال`;
  if (countB) countB.textContent = `${teamB.members?.length || 0} طلاب أبطال`;

  const listA = document.getElementById("introTeamAMembers");
  const listB = document.getElementById("introTeamBMembers");
  if (listA) {
    listA.innerHTML = (teamA.members || []).map((m, idx) => `
      <div class="student-spotlight-item" id="spotlight_A_${idx}">
        <span><i class="fa-solid fa-user-graduate" style="margin-left:8px;"></i> ${escapeHtml(m.name)}</span>
        <i class="fa-solid fa-crown spotlight-crown"></i>
      </div>
    `).join("");
  }
  if (listB) {
    listB.innerHTML = (teamB.members || []).map((m, idx) => `
      <div class="student-spotlight-item" id="spotlight_B_${idx}">
        <span><i class="fa-solid fa-user-graduate" style="margin-left:8px;"></i> ${escapeHtml(m.name)}</span>
        <i class="fa-solid fa-crown spotlight-crown"></i>
      </div>
    `).join("");
  }

  const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name) || currentUser.name === currentLiveRoom.leaderName);
  const btnLaunch = document.getElementById("btnLaunchTeamContest");
  const obsNote = document.getElementById("teamEntranceObserverNote");
  if (isSup) {
    btnLaunch?.classList.remove("hidden");
    obsNote?.classList.add("hidden");
  } else {
    btnLaunch?.classList.add("hidden");
    obsNote?.classList.remove("hidden");
  }

  overlay.classList.remove("hidden");
  try { soundFX.celebrate(); } catch (e) {}

  // تسليط الضوء الجميل والمتزامن على أعضاء الفريقين بوقار ووضوح (يستغرق ~4 ثوانٍ)
  let sIdx = 0;
  const membersA = teamA.members || [];
  const membersB = teamB.members || [];
  const maxMembers = Math.max(membersA.length, membersB.length);
  const waveDelay = 800; // 800ms لكل طالب ليتسنى للجميع قراءة الأسماء بوضوح

  function highlightWave() {
    if (sIdx < maxMembers) {
      if (sIdx < membersA.length) {
        document.getElementById(`spotlight_A_${sIdx}`)?.classList.add("highlighted");
      }
      if (sIdx < membersB.length) {
        document.getElementById(`spotlight_B_${sIdx}`)?.classList.add("highlighted");
      }
      try { soundFX.btnClick(); } catch (e) {}
      sIdx++;
      setTimeout(highlightWave, waveDelay);
    } else {
      document.querySelectorAll(".student-spotlight-item").forEach(el => el.classList.add("highlighted"));
      try { soundFX.celebrate(); } catch (e) {}
    }
  }

  setTimeout(highlightWave, 600);
}

document.getElementById("btnLaunchTeamContest")?.addEventListener("click", async () => {
  if (currentLiveRoom) {
    const now = Date.now();
    currentLiveRoom.teamLaunchTimestamp = now;
    await saveRooms(currentLiveRoom);
  }
  executeTeamContestLaunch();
});

async function executeTeamContestLaunch() {
  const overlay = document.getElementById("teamEntranceOverlay");
  const cardA = document.getElementById("introCardTeamA");
  const cardB = document.getElementById("introCardTeamB");
  const countdownWrap = document.getElementById("teamStartCountdownWrapper");
  const circle = document.getElementById("teamCountdownSecCircle");
  const controls = document.getElementById("teamEntranceControls");
  const vsDivider = document.querySelector(".team-vs-divider");
  const topBar = document.querySelector(".team-entrance-top-bar");
  const header = document.querySelector(".team-entrance-header");

  if (window.teamCountdownInterval) {
    clearInterval(window.teamCountdownInterval);
    window.teamCountdownInterval = null;
  }

  if (controls) controls.classList.add("hidden");
  if (topBar) topBar.classList.add("hidden");

  // خروج البطاقات بالعكس فورياً (اليمين يذهب يساراً، واليسار يذهب يميناً)
  if (cardA) {
    cardA.classList.remove("team-right");
    cardA.classList.add("reverse-exit-left");
  }
  if (cardB) {
    cardB.classList.remove("team-left");
    cardB.classList.add("reverse-exit-right");
  }
  if (vsDivider) {
    vsDivider.style.transition = "opacity 0.25s ease, transform 0.25s ease";
    vsDivider.style.opacity = "0";
    vsDivider.style.transform = "scale(0.5)";
  }

  try { soundFX.pop(); } catch (e) {}

  setTimeout(() => {
    if (countdownWrap) countdownWrap.classList.remove("hidden");
    let c = 3;
    if (circle) {
      circle.style.fontSize = "64px";
      circle.textContent = "3";
    }
    try { soundFX.btnClick(); } catch (e) {}

    window.teamCountdownInterval = setInterval(async () => {
      c--;
      if (c > 0) {
        if (circle) {
          circle.style.fontSize = "64px";
          circle.textContent = String(c);
        }
        try { soundFX.btnClick(); } catch (e) {}
      } else {
        clearInterval(window.teamCountdownInterval);
        window.teamCountdownInterval = null;

        if (circle) {
          circle.style.fontSize = "28px";
          circle.textContent = "انطلاق!";
        }
        try { soundFX.celebrate(); } catch (e) {}

        setTimeout(async () => {
          if (overlay) overlay.classList.add("hidden");
          if (countdownWrap) countdownWrap.classList.add("hidden");
          if (cardA) cardA.classList.remove("reverse-exit-left");
          if (cardB) cardB.classList.remove("reverse-exit-right");
          if (vsDivider) {
            vsDivider.style.opacity = "1";
            vsDivider.style.transform = "scale(1)";
          }
          if (topBar) topBar.classList.remove("hidden");
          if (header) header.classList.remove("hidden");

          isTeamEntranceActive = false;

          const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name) || currentUser.name === currentLiveRoom?.leaderName);
          if (isSup && currentLiveRoom) {
            currentLiveRoom.phase = "team_stage";
            currentLiveRoom.currentTeamRound = 1;
            currentLiveRoom.currentQuestionIdx = 0;
            currentLiveRoom.teamRoundStarted = false; // لا يبدأ حتى يضغط المشرف التالي
            currentLiveRoom.teamRoundState = "round_banner";
            await saveRooms(currentLiveRoom);
            launchTeamRound(1);
          }
        }, 550);
      }
    }, 1000);
  }, 380);
}

// --------------------------------------------------------
// محرك الفقرات الأربع الحماسية (The 4 Rounds Engine)
// --------------------------------------------------------
const TEAM_ROUNDS_CONFIG = {
  1: {
    name: "فقرة رد الفعل",
    tag: "الفقرة الأولى",
    rule: "إذا أجاب فريقك خطأ، تُمنح الفرصة فوراً للفريق الخصم للإجابة وخطف النقاط!",
    icon: "fa-bolt-lightning"
  },
  2: {
    name: "فقرة احذر",
    tag: "الفقرة الثانية",
    rule: "إجابة صحيحة = ربح نقاط السؤال كاملة، إجابة خاطئة = خصم كامل لنفس النقاط من رصيد الفريق!",
    icon: "fa-triangle-exclamation"
  },
  3: {
    name: "فقرة تحت الضغط",
    tag: "الفقرة الثالثة",
    rule: "بطل من كل فريق في تحدي أسئلة سريعة ومكثفة (7 ثوانٍ) ونقاط إضافية وبونص 10 درجات للفائز!",
    icon: "fa-fire-flame-curved"
  },
  4: {
    name: "فقرة واحد لواحد",
    tag: "الفقرة الرابعة",
    rule: "مواجهات مباشرة بالرأس للرأس وأسرع إجابة تحصد درجات وبونص 25 نقطة كبرى للفريق الفائز!",
    icon: "fa-swords"
  }
};

// --------------------------------------------------------
// وظيفة البطاقة السينمائية التفاعلية فائقة السلاسة (انتقال الدور / إجابة خاطئة)
// --------------------------------------------------------
let cinematicAlertTimeout = null;
let lastSeenCinematicAlertTimestamp = 0;

function triggerCinematicTeamAlert(cfg) {
  if (!cfg) return;
  const card = document.getElementById("teamCinematicPopupCard");
  const wrapper = document.getElementById("cinematicPopupWrapper");
  const icon = document.getElementById("cinematicPopupIcon");
  const tag = document.getElementById("cinematicPopupTag");
  const teamPill = document.getElementById("cinematicPopupTeamPill");
  const teamName = document.getElementById("cinematicPopupTeamName");
  const headline = document.getElementById("cinematicPopupHeadline");
  const studentName = document.getElementById("cinematicPopupStudentName");
  const subtext = document.getElementById("cinematicPopupSubtext");
  const timerFill = document.getElementById("cinematicPopupProgressFill");

  if (!card || !wrapper) return;

  if (cinematicAlertTimeout) {
    clearTimeout(cinematicAlertTimeout);
    cinematicAlertTimeout = null;
  }

  const isWrong = cfg.type === "wrong_answer";

  if (isWrong) {
    wrapper.className = "cinematic-popup-wrapper type-wrong";
    if (icon) icon.className = "fa-solid fa-circle-xmark";
    if (tag) tag.textContent = cfg.tag || "❌ إجابة غير دقيقة!";
    if (headline) headline.textContent = cfg.headline || "أجاب خطأ البطل:";
    if (studentName) studentName.textContent = cfg.studentName || "--";
    if (teamName) teamName.textContent = cfg.teamName || "الفريق";
    if (subtext) subtext.textContent = cfg.subtext || "تنبيه: فرصة رد الفعل أو خصم نقاط السؤال!";
    try { soundFX.wrong(); } catch (e) {}
  } else {
    // turn_transfer
    wrapper.className = "cinematic-popup-wrapper";
    if (icon) icon.className = cfg.icon || "fa-solid fa-bolt-lightning";
    if (tag) tag.textContent = cfg.tag || "⚡ فرصة رد الفعل وانتقال الدور!";
    if (headline) headline.textContent = cfg.headline || "السؤال يتحول الآن إلى البطل:";
    if (studentName) studentName.textContent = cfg.studentName || "--";
    if (teamName) teamName.textContent = cfg.teamName || "الفريق";
    if (subtext) subtext.textContent = cfg.subtext || "استعد للإجابة وخطف النقاط لصالح فريقك!";
    try { soundFX.whoosh(); } catch (e) {}
  }

  if (cfg.teamColor && teamPill) {
    const scheme = TEAM_COLOR_SCHEMES[cfg.teamColor] || TEAM_COLOR_SCHEMES.blue;
    teamPill.style.background = scheme.badgeBg || "rgba(255,255,255,0.18)";
    teamPill.style.borderColor = scheme.border || "rgba(255,255,255,0.35)";
  }

  // إعادة ضبط شريط التقدم للتحرك بسلاسة تامة لمدة 3 ثوانٍ
  if (timerFill) {
    timerFill.style.transition = "none";
    timerFill.style.width = "100%";
    void timerFill.offsetWidth;
    timerFill.style.transition = "width 3s linear";
    timerFill.style.width = "0%";
  }

  card.classList.remove("hidden", "exit");
  card.classList.add("enter");

  cinematicAlertTimeout = setTimeout(() => {
    card.classList.remove("enter");
    card.classList.add("exit");
    setTimeout(() => {
      card.classList.add("hidden");
      card.classList.remove("exit");
    }, 420);
  }, 3000);
}

// --------------------------------------------------------
// اختيار فريقي المواجهة داخل المسرح التفاعلي ونظام التصفيات (Tournament Bracket Team Picker)
// --------------------------------------------------------
let arenaSelectedTeamA = null;
let arenaSelectedTeamB = null;
let currentArenaTeamFilter = "all";

function renderArenaTeamPickerUI(room = null) {
  const targetRoom = room || currentLiveRoom;
  if (!targetRoom || !targetRoom.isTeamMatch) return;

  const overlay = document.getElementById("arenaTeamSelectionOverlay");
  const supervisorBody = document.getElementById("supervisorTeamPickerBody");
  const observerBody = document.getElementById("observerTeamPickerBody");
  const teamsGrid = document.getElementById("arenaTeamsCardsGrid");
  const stepA = document.getElementById("pickerStepA");
  const stepB = document.getElementById("pickerStepB");
  const nameA = document.getElementById("selectedTeamANameDisplay");
  const nameB = document.getElementById("selectedTeamBNameDisplay");
  const checkA = document.getElementById("stepACheck");
  const checkB = document.getElementById("stepBCheck");
  const btnConfirm = document.getElementById("btnConfirmTeamSelection");
  const roundTitleEl = document.getElementById("arenaCurrentRoundTitle");
  const roundStatusEl = document.getElementById("arenaRoundMatchesStatus");
  const observerRoundTag = document.getElementById("observerRoundTag");
  const observerWaitingDesc = document.getElementById("observerWaitingDesc");

  if (!overlay) return;

  // إيقاف أي مؤقت فوراً وتجميده لمنع أي عداد أثناء اختيار الفرق
  if (liveTimerInterval) {
    clearInterval(liveTimerInterval);
    liveTimerInterval = null;
  }
  lastTimerConfigKey = "team_picker_paused";
  if (stageTimerSeconds) stageTimerSeconds.textContent = "⏸️";

  // تهيئة شجرة البطولة إذا لم تكن موجودة بعد في الغرفة
  if (!targetRoom.tournamentState) {
    const initTeams = (Array.isArray(targetRoom.teams) && targetRoom.teams.length >= 2) 
      ? targetRoom.teams 
      : (teamsCache.length >= 2 ? [...teamsCache] : []);
    targetRoom.tournamentState = initTournamentBracket(initTeams);
  }

  const tState = targetRoom.tournamentState;
  let currentRound = tState.rounds?.[tState.currentRoundIndex];
  if (!currentRound) {
    const tList = tState.teams || targetRoom.teams || teamsCache;
    currentRound = {
      roundIndex: 0,
      roundName: getRoundNameForTeams(tList.length),
      initialTeamsCount: tList.length,
      pendingTeamIds: tList.map(t => t.id),
      qualifiedTeamIds: [],
      eliminatedTeamIds: [],
      byeTeamId: null,
      matches: []
    };
    tState.rounds = [currentRound];
    tState.currentRoundIndex = 0;
  }

  // تحديث لافتة الدور الحالي
  if (roundTitleEl) roundTitleEl.textContent = currentRound.roundName || "المواجهة التصفوية";
  if (roundStatusEl) {
    const pendingCount = currentRound.pendingTeamIds ? currentRound.pendingTeamIds.length : 0;
    if (pendingCount > 0) {
      roundStatusEl.textContent = `باقي ${Math.ceil(pendingCount / 2)} مواجهة في هذا الدور (${pendingCount} فرق بالانتظار)`;
      roundStatusEl.style.background = "#e0f2fe";
      roundStatusEl.style.color = "#0369a1";
    } else {
      roundStatusEl.textContent = `اكتملت جميع مواجهات هذا الدور!`;
      roundStatusEl.style.background = "#dcfce7";
      roundStatusEl.style.color = "#15803d";
    }
  }

  if (observerRoundTag) {
    observerRoundTag.textContent = `مرحلة البطولة: ${currentRound.roundName || 'التصفيات'}`;
  }
  if (observerWaitingDesc) {
    observerWaitingDesc.textContent = `يقوم المشرف العام الآن بتحديد فريقي المواجهة ضمن ${currentRound.roundName || 'التصفيات'}، استعدوا للمواجهة وتشجيع أبطالكم!`;
  }

  const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name) || currentUser.name === targetRoom.leaderName);

  // إخفاء كل النوافذ المنبثقة الأخرى والأسئلة لضمان ظهور واجهة الاختيار النقية
  document.getElementById("teamEntranceOverlay")?.classList.add("hidden");
  document.getElementById("teamRoundBannerOverlay")?.classList.add("hidden");
  document.getElementById("teamFlippingModalWrapper")?.classList.add("hidden");
  document.getElementById("teamStartCountdownWrapper")?.classList.add("hidden");
  if (stageQuestionCard) stageQuestionCard.classList.add("hidden");
  if (stageInteractiveArea) stageInteractiveArea.innerHTML = "";

  overlay.classList.remove("hidden");

  if (!isSup) {
    // عرض شاشة الانتظار للمتسابقين والمشاهدين والعارض
    if (supervisorBody) supervisorBody.classList.add("hidden");
    if (observerBody) observerBody.classList.remove("hidden");
    return;
  }

  // عرض شاشة المشرف لتحديد الفريقين
  if (supervisorBody) supervisorBody.classList.remove("hidden");
  if (observerBody) observerBody.classList.add("hidden");

  // تجميع قائمة كافة الفرق المشاركة في البطولة
  const allTournamentTeams = (tState.teams && tState.teams.length > 0) ? tState.teams : teamsCache;

  // فحص أزرار الفلترة
  document.querySelectorAll(".team-filter-pill").forEach(pill => {
    pill.onclick = () => {
      document.querySelectorAll(".team-filter-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      currentArenaTeamFilter = pill.getAttribute("data-filter") || "all";
      updatePickerUI();
    };
  });

  // تفعيل زر السحب بالقرعة تلقائياً لفريقين في الانتظار
  const btnAutoDraw = document.getElementById("btnAutoDrawTeams");
  if (btnAutoDraw) {
    btnAutoDraw.onclick = () => {
      const pendingIds = currentRound.pendingTeamIds || [];
      const pendingTeams = pendingIds.map(id => allTournamentTeams.find(t => t.id === id)).filter(Boolean);
      if (pendingTeams.length < 2) {
        showToast("لا توجد فرق كافية في الانتظار للسحب بالقرعة لهذا الدور!", "fa-triangle-exclamation");
        return;
      }
      const shuffled = shuffleArray([...pendingTeams]);
      arenaSelectedTeamA = shuffled[0];
      arenaSelectedTeamB = shuffled[1];
      try { soundFX.celebrate(); } catch (e) {}
      showToast(`🎲 تم سحب فريقي المواجهة بالقرعة: «${arenaSelectedTeamA.name}» ضد «${arenaSelectedTeamB.name}»!`, "fa-dice", 3500);
      updatePickerUI();
    };
  }

  function updatePickerUI() {
    if (nameA) {
      nameA.textContent = arenaSelectedTeamA ? arenaSelectedTeamA.name : "انقر على فريق بالانتظار لتحديده";
      nameA.style.color = arenaSelectedTeamA ? "#16a34a" : "#64748b";
    }
    if (nameB) {
      nameB.textContent = arenaSelectedTeamB ? arenaSelectedTeamB.name : (arenaSelectedTeamA ? "انقر على الفريق الخصم" : "في انتظار تحديد الفريق الأول");
      nameB.style.color = arenaSelectedTeamB ? "#2563eb" : "#64748b";
    }

    if (stepA) {
      stepA.classList.toggle("confirmed", !!arenaSelectedTeamA);
      stepA.classList.toggle("active", !arenaSelectedTeamA);
    }
    if (checkA) checkA.classList.toggle("hidden", !arenaSelectedTeamA);

    if (stepB) {
      stepB.classList.toggle("confirmed", !!arenaSelectedTeamB);
      stepB.classList.toggle("active", !!arenaSelectedTeamA && !arenaSelectedTeamB);
    }
    if (checkB) checkB.classList.toggle("hidden", !arenaSelectedTeamB);

    if (btnConfirm) {
      const ready = !!(arenaSelectedTeamA && arenaSelectedTeamB && arenaSelectedTeamA.id !== arenaSelectedTeamB.id);
      btnConfirm.disabled = !ready;
      btnConfirm.style.opacity = ready ? "1" : "0.5";
      btnConfirm.style.cursor = ready ? "pointer" : "not-allowed";
    }

    // تحديث أرقام عدادات الفلاتر
    const pendingIds = currentRound.pendingTeamIds || [];
    const qualifiedIds = currentRound.qualifiedTeamIds || [];
    const eliminatedIds = currentRound.eliminatedTeamIds || [];

    const countAllEl = document.getElementById("countAllFilter");
    const countPendEl = document.getElementById("countPendingFilter");
    const countQualEl = document.getElementById("countQualifiedFilter");
    const countElimEl = document.getElementById("countEliminatedFilter");

    if (countAllEl) countAllEl.textContent = String(allTournamentTeams.length);
    if (countPendEl) countPendEl.textContent = String(pendingIds.length);
    if (countQualEl) countQualEl.textContent = String(qualifiedIds.length);
    if (countElimEl) countElimEl.textContent = String(eliminatedIds.length);

    // تصفية الفرق وفق الفلتر المحدد
    let displayedTeams = allTournamentTeams;
    if (currentArenaTeamFilter === "pending") {
      displayedTeams = allTournamentTeams.filter(t => pendingIds.includes(t.id));
    } else if (currentArenaTeamFilter === "qualified") {
      displayedTeams = allTournamentTeams.filter(t => qualifiedIds.includes(t.id));
    } else if (currentArenaTeamFilter === "eliminated") {
      displayedTeams = allTournamentTeams.filter(t => eliminatedIds.includes(t.id));
    }

    // رسم بطاقات الفرق
    if (teamsGrid) {
      if (displayedTeams.length === 0) {
        teamsGrid.innerHTML = `
          <div style="grid-column: 1/-1; padding: 24px; text-align: center; color: #64748b; font-weight: 800;">
            لا توجد فرق في هذا التصنيف حالياً.
          </div>
        `;
        return;
      }

      teamsGrid.innerHTML = displayedTeams.map(t => {
        const isA = arenaSelectedTeamA && arenaSelectedTeamA.id === t.id;
        const isB = arenaSelectedTeamB && arenaSelectedTeamB.id === t.id;
        const scheme = TEAM_COLOR_SCHEMES[t.color] || TEAM_COLOR_SCHEMES.blue;
        const membersCount = Array.isArray(t.members) ? t.members.length : 0;

        const isQualified = qualifiedIds.includes(t.id);
        const isEliminated = eliminatedIds.includes(t.id);
        const isPending = pendingIds.includes(t.id);

        let statusBadgeHtml = "";
        let cardClass = "duo-team-pick-card";

        if (isQualified) {
          cardClass += " is-qualified";
          statusBadgeHtml = `<span class="badge-team-status qualified"><i class="fa-solid fa-bolt"></i> متأهل</span>`;
        } else if (isEliminated) {
          cardClass += " is-eliminated";
          statusBadgeHtml = `<span class="badge-team-status eliminated"><i class="fa-solid fa-xmark"></i> تم إقصاؤه</span>`;
        } else {
          cardClass += " is-pending";
          statusBadgeHtml = `<span class="badge-team-status pending"><i class="fa-solid fa-hourglass-half"></i> لم ينافس بعد</span>`;
        }

        let selectionSubtext = `${membersCount} طلاب`;
        if (isA) {
          cardClass += " selected-team-a";
          selectionSubtext = "✔ الفريق الأول";
        } else if (isB) {
          cardClass += " selected-team-b";
          selectionSubtext = "✔ الفريق الثاني (الخصم)";
        }

        return `
          <div class="${cardClass}" data-team-id="${escapeHtml(t.id)}" data-status="${isQualified ? 'qualified' : (isEliminated ? 'eliminated' : 'pending')}">
            ${statusBadgeHtml}
            <div class="team-card-icon" style="background:${scheme.badgeBg || '#f1f5f9'}; color:${scheme.badgeText || '#2563eb'};">
              <i class="fa-solid ${t.icon || 'fa-shield-halved'}"></i>
            </div>
            <div class="team-card-name">${escapeHtml(t.name)}</div>
            <div class="team-card-members-count">${selectionSubtext}</div>
          </div>
        `;
      }).join("");

      teamsGrid.querySelectorAll(".duo-team-pick-card").forEach(c => {
        c.addEventListener("click", () => {
          const tId = c.getAttribute("data-team-id");
          const status = c.getAttribute("data-status");
          const team = allTournamentTeams.find(t => t.id === tId);
          if (!team) return;

          // 1. منع اختيار الفريق المقضي
          if (status === "eliminated") {
            try { soundFX.wrong(); } catch (e) {}
            showToast(`❌ تم إقصاء فريق «${team.name}» من البطولة ولا يمكن اختياره للمنافسة!`, "fa-circle-xmark", 2500);
            return;
          }

          // 2. فحص اختيار فريق متأهل بينما لم ينتهِ الدور الحالي
          if (status === "qualified") {
            if (pendingIds.length > 0) {
              try { soundFX.wrong(); } catch (e) {}
              showToast(`⚠️ لم تنتهي المرحلة بعد! يجب إكمال جميع مواجهات الدور الحالي أولاً قبل اختيار المتأهلين.`, "fa-lock", 3000);
              return;
            }
          }

          try { soundFX.btnClick(); } catch (e) {}

          if (!arenaSelectedTeamA) {
            arenaSelectedTeamA = team;
            showToast(`تم تحديد «${team.name}» كفريق أول 🟢`, "fa-flag");
          } else if (arenaSelectedTeamA.id === team.id) {
            arenaSelectedTeamA = null;
          } else if (!arenaSelectedTeamB) {
            arenaSelectedTeamB = team;
            showToast(`تم تحديد «${team.name}» كفريق خصم 🔵`, "fa-flag");
          } else if (arenaSelectedTeamB.id === team.id) {
            arenaSelectedTeamB = null;
          } else {
            arenaSelectedTeamB = team;
            showToast(`تم تغيير الفريق الثاني إلى «${team.name}» 🔵`, "fa-flag");
          }

          updatePickerUI();
        });
      });
    }
  }

  updatePickerUI();

  // مستمع زر إعادة التحديد
  document.getElementById("btnResetSelectedTeams")?.addEventListener("click", () => {
    arenaSelectedTeamA = null;
    arenaSelectedTeamB = null;
    updatePickerUI();
  });

  // مستمع زر اعتماد وبدء المواجهة
  const btnConf = document.getElementById("btnConfirmTeamSelection");
  if (btnConf) {
    btnConf.onclick = async () => {
      if (!arenaSelectedTeamA || !arenaSelectedTeamB) return;
      if (arenaSelectedTeamA.id === arenaSelectedTeamB.id) {
        showToast("يرجى اختيار فريقين مختلفين للمواجهة", "fa-triangle-exclamation");
        return;
      }

      btnConf.disabled = true;
      btnConf.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري إطلاق المواجهة...`;

      targetRoom.teamA = arenaSelectedTeamA;
      targetRoom.teamB = arenaSelectedTeamB;
      targetRoom.teams = [arenaSelectedTeamA, arenaSelectedTeamB];
      targetRoom.teamScores = { [arenaSelectedTeamA.id]: 0, [arenaSelectedTeamB.id]: 0 };
      targetRoom.teamScoresDetails = { [arenaSelectedTeamA.id]: [], [arenaSelectedTeamB.id]: [] };
      targetRoom.teamSelectionState = "ready";
      targetRoom.phase = "team_intro";
      targetRoom.teamEntranceStartedAt = Date.now();
      targetRoom.teamRoundStarted = false;
      targetRoom.currentTeamRound = 1;
      targetRoom.currentQuestionIdx = 0;
      targetRoom.teamRoundState = "entrance";

      await saveRooms(targetRoom);

      overlay.classList.add("hidden");
      btnConf.disabled = false;
      btnConf.innerHTML = `<i class="fa-solid fa-play"></i> اعتماد الفريقين وبدء المواجهة والعرض!`;

      runTeamEntranceCinematicShowcase();
    };
  }
}

// العودة لاختيار وتعديل الفرق داخل المسرح مع إيقاف المؤقت بشكل حاسم وفوري
async function handleReturnToTeamSelection() {
  const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name) || currentUser.name === currentLiveRoom?.leaderName);
  if (!isSup) {
    showToast("عذراً، هذه الصلاحية للمشرف العام فقط لاختيار وتعديل الفرق", "fa-lock");
    return;
  }
  if (!currentLiveRoom) return;

  // 1. إيقاف وتجميد المؤقت نهائياً وفورياً لجميع الحاضرين
  if (liveTimerInterval) {
    clearInterval(liveTimerInterval);
    liveTimerInterval = null;
  }
  lastTimerConfigKey = "team_picker_paused";
  if (stageTimerSeconds) stageTimerSeconds.textContent = "⏸️";

  currentLiveRoom.timerState = {
    isFrozen: true,
    remainingSeconds: currentLiveRoom.questionTimer || 30,
    isCorrectionPaused: false,
    isWalletSelectionPaused: false,
    updatedAt: Date.now()
  };

  // 2. إعادة ضبط الغرفة لحالة اختيار الفرق دون حذفها أو طرد المشاركين
  currentLiveRoom.teamSelectionState = "selecting";
  currentLiveRoom.phase = "team_stage";
  currentLiveRoom.teamA = null;
  currentLiveRoom.teamB = null;
  currentLiveRoom.teams = [];
  currentLiveRoom.teamScores = {};
  currentLiveRoom.teamScoresDetails = {};
  currentLiveRoom.teamRoundStarted = false;
  currentLiveRoom.teamRoundState = "selecting_teams";
  currentLiveRoom.teamLaunchTimestamp = null;
  currentLiveRoom.teamCountdownStartedAt = null;
  currentLiveRoom.teamActiveSolver = null;

  await saveRooms(currentLiveRoom);

  // 3. إخفاء نوافذ ومسرح الفرق وبطاقة السؤال فوراً
  document.getElementById("teamEntranceOverlay")?.classList.add("hidden");
  document.getElementById("teamRoundBannerOverlay")?.classList.add("hidden");
  document.getElementById("teamFlippingModalWrapper")?.classList.add("hidden");
  document.getElementById("teamGrandFinaleOverlay")?.classList.add("hidden");
  document.getElementById("teamCinematicPopupCard")?.classList.add("hidden");
  document.getElementById("teamStartCountdownWrapper")?.classList.add("hidden");
  if (stageQuestionCard) stageQuestionCard.classList.add("hidden");
  if (stageInteractiveArea) stageInteractiveArea.innerHTML = "";

  // 4. فتح شاشة تحديد الفريقين للمشرف وبث شاشة الانتظار للآخرين
  arenaSelectedTeamA = null;
  arenaSelectedTeamB = null;
  renderArenaTeamPickerUI(currentLiveRoom);
  showToast("تم فتح شاشة اختيار وتعديل الفريقين وتجميد المؤقت بنجاح", "fa-rotate-left");
}

// --------------------------------------------------------
// لافتة الفقرة مع زر تحكم المشرف (التالي لبدء الفقرة يدوياً)
// مع إيقاف المؤقت وحجب بطاقة السؤال نهائياً لتبقى فقط خلفية المنصة
// --------------------------------------------------------
function showTeamRoundBanner(roundNum, onComplete) {
  const overlay = document.getElementById("teamRoundBannerOverlay");
  const cfg = TEAM_ROUNDS_CONFIG[roundNum] || TEAM_ROUNDS_CONFIG[1];
  if (!overlay) {
    if (typeof onComplete === "function") onComplete();
    return;
  }

  // 1. إيقاف وتجميد مؤقت السؤال فورياً للجميع بالتزامن التام
  if (liveTimerInterval) {
    clearInterval(liveTimerInterval);
    liveTimerInterval = null;
  }
  lastTimerConfigKey = "round_banner_paused";
  if (stageTimerSeconds) {
    stageTimerSeconds.innerHTML = `<span style="font-size:12.5px;color:#d97706;font-weight:800;"><i class="fa-solid fa-pause"></i> في انتظار بدء الفقرة</span>`;
  }

  if (currentLiveRoom) {
    currentLiveRoom.timerState = {
      isFrozen: true,
      remainingSeconds: currentLiveRoom.questionTimer || 30,
      isCorrectionPaused: false,
      isWalletSelectionPaused: false,
      isBannerPaused: true,
      updatedAt: Date.now()
    };
  }

  // 2. إخفاء وحجب أي سؤال أو بطاقة سؤال أو خانة تفاعل تماماً لتبقى فقط خلفية المنصة
  if (stageQuestionCard) stageQuestionCard.classList.add("hidden");
  if (stageInteractiveArea) stageInteractiveArea.innerHTML = "";
  if (stageStudentName) stageStudentName.textContent = "";
  if (stageQuestionText) stageQuestionText.textContent = "";

  const tag = document.getElementById("teamRoundBannerTag");
  const title = document.getElementById("teamRoundBannerTitle");
  const rule = document.getElementById("teamRoundBannerRule");
  const btnStartNow = document.getElementById("btnStartTeamRoundNow");
  const btnStartText = document.getElementById("btnStartTeamRoundText");
  const waitingNotice = document.getElementById("roundBannerWaitingNotice");

  if (tag) tag.textContent = cfg.tag;
  if (title) title.innerHTML = `<i class="fa-solid ${cfg.icon}" style="color:#facc15;margin-left:10px;"></i> ${cfg.name}`;
  if (rule) rule.textContent = cfg.rule;
  if (btnStartText) btnStartText.textContent = `التالي: بدء ${cfg.name}`;

  const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name) || currentUser.name === currentLiveRoom?.leaderName);

  if (isSup) {
    btnStartNow?.classList.remove("hidden");
    waitingNotice?.classList.add("hidden");
  } else {
    btnStartNow?.classList.add("hidden");
    waitingNotice?.classList.remove("hidden");
  }

  overlay.classList.remove("hidden");
  try { soundFX.celebrate(); } catch (e) {}

  if (btnStartNow) {
    btnStartNow.onclick = async () => {
      btnStartNow.onclick = null;
      btnStartNow.disabled = true;
      btnStartNow.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري الانطلاق...`;

      if (currentLiveRoom) {
        currentLiveRoom.teamRoundStarted = true;
        currentLiveRoom.teamRoundStartedAt = Date.now();
        currentLiveRoom.teamRoundState = "round_active";
        await saveRooms(currentLiveRoom);
      }

      overlay.classList.add("hidden");
      btnStartNow.disabled = false;
      if (btnStartText) btnStartText.textContent = `التالي: بدء ${cfg.name}`;

      // إظهار بطاقة الأسئلة فقط بعد ضغط المشرف على زر التالي
      if (stageQuestionCard) stageQuestionCard.classList.remove("hidden");

      if (typeof onComplete === "function") {
        onComplete();
      }
    };
  }
}

// البطاقة الدوارة لاختيار الفريق والطالب (تتقلب وتتدحرج من اليمين للمنتصف سريعاً، تظهر اسم الفريق، ثم روليت سريع لاختيار الطالب، ثم تتشقلب لليسار)
function showTeamRollingStudentCard(team, studentName, onComplete) {
  const wrapper = document.getElementById("teamFlippingModalWrapper");
  const card = document.getElementById("teamRollingCard");
  const phaseTeam = document.getElementById("rollingCardPhaseTeam");
  const phaseStudent = document.getElementById("rollingCardPhaseStudent");
  const teamIcon = document.getElementById("rollingTeamHeaderIcon");
  const teamNameBig = document.getElementById("rollingCardTeamNameBig");
  const teamBadge = document.getElementById("rollingCardTeamBadge");
  const studentSubhead = document.getElementById("rollingStudentSubhead");
  const rouletteBox = document.getElementById("rollingRouletteBox");
  const targetStudent = document.getElementById("rollingCardTargetStudent");

  // إخفاء منطقة السؤال الحالية تماماً حتى لا يظهر السؤال قبل رحيل البطاقة
  if (stageInteractiveArea) stageInteractiveArea.innerHTML = "";
  if (stageQuestionText) stageQuestionText.textContent = "";

  if (!wrapper || !card) {
    if (typeof onComplete === "function") onComplete();
    return;
  }

  const scheme = TEAM_COLOR_SCHEMES[team.color] || TEAM_COLOR_SCHEMES.blue;
  card.style.background = scheme.bg;
  card.style.border = `3px solid ${scheme.border}`;

  // ضبط محتوى مرحلة الفريق أولاً
  if (teamIcon) teamIcon.className = `fa-solid ${team.icon || 'fa-shield-halved'}`;
  if (teamNameBig) teamNameBig.textContent = team.name;
  if (phaseTeam) phaseTeam.classList.remove("hidden");

  // إعادة ضبط مرحلة الطالب
  if (phaseStudent) phaseStudent.classList.add("hidden");
  if (teamBadge) teamBadge.textContent = team.name;
  if (rouletteBox) rouletteBox.classList.remove("settled");
  if (studentSubhead) studentSubhead.textContent = "جاري سحب المتسابق للإجابة...";
  if (targetStudent) targetStudent.textContent = "جاري السحب...";

  // إظهار النافذة وبدء دخول البطاقة المتدحرجة من اليمين للمنتصف سريعاً
  wrapper.classList.remove("hidden");
  card.className = "team-rolling-card animate-enter-flip";
  try { soundFX.pop(); } catch (e) {}

  // بعد استقرار البطاقة في المنتصف (650ms)، إبقاء اسم الفريق واضحاً (1400ms) ثم الانتقال لاختيار الطالب
  setTimeout(() => {
    try { soundFX.whoosh(); } catch (e) {}

    setTimeout(() => {
      if (phaseTeam) phaseTeam.classList.add("hidden");
      if (phaseStudent) phaseStudent.classList.remove("hidden");

      // تشغيل روليت حماسي مشوق لأسماء طلاب الفريق
      const members = (team.members && team.members.length > 0) 
        ? team.members 
        : [{ name: studentName }];
      
      const namesList = members.map(m => m.name);
      if (!namesList.includes(studentName)) namesList.push(studentName);

      let step = 0;
      const totalSteps = 10;
      let delay = 80;

      function spinNextStudent() {
        step++;
        const candidateName = namesList[step % namesList.length];
        if (targetStudent) targetStudent.textContent = candidateName;
        try { soundFX.btnClick(); } catch (e) {}

        if (step < totalSteps) {
          delay += 18;
          setTimeout(spinNextStudent, delay);
        } else {
          // التوقف النهائي الحاسم على اسم الطالب المختار
          if (targetStudent) {
            targetStudent.innerHTML = `<i class="fa-solid fa-crown" style="color:#facc15;margin-left:6px;"></i> ${escapeHtml(studentName)}`;
          }
          if (studentSubhead) studentSubhead.innerHTML = `⭐ السؤال موجه إلى البطل:`;
          if (rouletteBox) rouletteBox.classList.add("settled");
          try { soundFX.correct(); } catch (e) {}

          // إبقاء اسم الطالب ظاهراً بوضوح للجميع (2200ms) ثم تشقلب البطاقة وخروجها لليسار
          setTimeout(() => {
            card.className = "team-rolling-card animate-exit-flip";
            try { soundFX.pop(); } catch (e) {}

            setTimeout(() => {
              wrapper.classList.add("hidden");
              if (typeof onComplete === "function") onComplete();
            }, 550);
          }, 2200);
        }
      }

      spinNextStudent();
    }, 1400);
  }, 650);
}

// بطاقات الفرق الجانبية المتحركة (Score Flyers)
function updateTeamScoreFlyers(winningTeamId = null, deltaPoints = 0) {
  const container = document.getElementById("teamScoreFlyersContainer");
  const flyerA = document.getElementById("flyerTeamA");
  const flyerB = document.getElementById("flyerTeamB");
  if (!container || !currentLiveRoom) return;

  const teamA = currentLiveRoom.teams?.[0];
  const teamB = currentLiveRoom.teams?.[1];
  if (!teamA || !teamB) return;

  const schemeA = TEAM_COLOR_SCHEMES[teamA.color] || TEAM_COLOR_SCHEMES.blue;
  const schemeB = TEAM_COLOR_SCHEMES[teamB.color] || TEAM_COLOR_SCHEMES.red;

  if (flyerA) {
    flyerA.style.background = schemeA.bg;
    flyerA.style.border = `2.5px solid ${schemeA.border}`;
    document.getElementById("flyerTeamAName").textContent = teamA.name;
    document.getElementById("flyerTeamAScore").textContent = currentLiveRoom.teamScores?.[teamA.id] || 0;
    flyerA.classList.add("visible");
  }
  if (flyerB) {
    flyerB.style.background = schemeB.bg;
    flyerB.style.border = `2.5px solid ${schemeB.border}`;
    document.getElementById("flyerTeamBName").textContent = teamB.name;
    document.getElementById("flyerTeamBScore").textContent = currentLiveRoom.teamScores?.[teamB.id] || 0;
    flyerB.classList.add("visible");
  }

  if (winningTeamId) {
    const winningFlyer = winningTeamId === teamA.id ? flyerA : flyerB;
    if (winningFlyer) {
      winningFlyer.classList.add("team-card-pulse-win");
      try { soundFX.celebrate(); } catch (e) {}
      setTimeout(() => {
        winningFlyer.classList.remove("team-card-pulse-win");
      }, 1800);
    }
  }

  setTimeout(() => {
    flyerA?.classList.remove("visible");
    flyerB?.classList.remove("visible");
  }, 2600);
}

// --------------------------------------------------------
// تشغيل الجولة الحالية للمسابقة
// --------------------------------------------------------
let currentActiveTeamSolver = null;
let currentActiveTeamRound = null;

// سحب عشوائي عادل لطلاب الفريق يضمن مشاركة الجميع ومنع تكرار نفس الطالب
function pickFairRandomStudentForTeam(team, room) {
  let members = team?.members || [];
  if (!Array.isArray(members) || members.length === 0) {
    members = [
      { name: `بطل ${team?.name || 'الفريق'} (1)` },
      { name: `بطل ${team?.name || 'الفريق'} (2)` }
    ];
  }
  if (members.length === 1) {
    const single = members[0];
    return typeof single === "object" ? single : { name: single };
  }

  room.teamMemberTurnPool = room.teamMemberTurnPool || {};
  let called = room.teamMemberTurnPool[team.id] || [];

  // ترشيح الطلاب الذين لم يشاركوا في الدورة الحالية
  let available = members.filter(m => {
    const mName = typeof m === "object" && m.name ? m.name : String(m);
    return !called.includes(mName);
  });

  // إذا شارك جميع طلاب الفريق، تصفير السجل والبدء في دورة جديدة
  if (available.length === 0) {
    called = [];
    room.teamMemberTurnPool[team.id] = [];
    available = [...members];
  }

  // منع تكرار نفس الطالب مرتين متتاليتين إذا وُجد غيره
  const lastPicked = room.lastPickedStudentByTeam?.[team.id];
  if (available.length > 1 && lastPicked) {
    const poolWithoutLast = available.filter(m => {
      const mName = typeof m === "object" && m.name ? m.name : String(m);
      return mName !== lastPicked;
    });
    if (poolWithoutLast.length > 0) {
      available = poolWithoutLast;
    }
  }

  // قرعة عشوائية حقيقية
  const randIdx = Math.floor(Math.random() * available.length);
  const chosenStudent = available[randIdx];
  const chosenName = typeof chosenStudent === "object" && chosenStudent.name ? chosenStudent.name : String(chosenStudent);

  // تسجيل الاختيار في السجل
  called.push(chosenName);
  room.teamMemberTurnPool[team.id] = called;
  room.lastPickedStudentByTeam = room.lastPickedStudentByTeam || {};
  room.lastPickedStudentByTeam[team.id] = chosenName;

  return typeof chosenStudent === "object" ? chosenStudent : { name: chosenName };
}

// احتساب عدد أسئلة الفقرة الحالية بناءً على توزيع بنك أسئلة الاختبار
function getTeamRoundQuestionCount(roundNum, room) {
  if (room && room.roundQuestionConfig && (room.roundQuestionConfig[roundNum] || room.roundQuestionConfig[String(roundNum)])) {
    const cfg = room.roundQuestionConfig[roundNum] || room.roundQuestionConfig[String(roundNum)];
    return cfg.count;
  }
  const totalQ = room?.roundQuestions?.length || 0;
  if (totalQ >= 4) {
    const base = Math.floor(totalQ / 4);
    const rem = totalQ % 4;
    return Math.max(1, base + (roundNum <= rem ? 1 : 0));
  }
  return 1;
}

// احتساب رقم السؤال التسلسلي الشامل في الاختبار
function getTeamQuestionGlobalIndex(roundNum, qIndexInRound, room) {
  if (room && room.roundQuestionConfig && (room.roundQuestionConfig[roundNum] || room.roundQuestionConfig[String(roundNum)])) {
    const cfg = room.roundQuestionConfig[roundNum] || room.roundQuestionConfig[String(roundNum)];
    return cfg.start + qIndexInRound;
  }
  const totalQ = room?.roundQuestions?.length || 0;
  if (totalQ >= 4) {
    let offset = 0;
    const base = Math.floor(totalQ / 4);
    const rem = totalQ % 4;
    for (let r = 1; r < roundNum; r++) {
      offset += base + (r <= rem ? 1 : 0);
    }
    return offset + qIndexInRound;
  }
  return qIndexInRound;
}

function launchTeamRound(roundNum) {
  currentActiveTeamRound = roundNum;
  showArenaPhase("stage");
  const isLead = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name) || currentUser.name === currentLiveRoom?.leaderName);
  
  if (isLead && currentLiveRoom) {
    currentLiveRoom.currentTeamRound = roundNum;
    currentLiveRoom.currentQuestionIdx = 0;
    currentLiveRoom.teamActiveSolver = null;
    currentLiveRoom.teamRoundStarted = false;
    currentLiveRoom.teamRoundState = "round_waiting_supervisor";
    saveRooms(currentLiveRoom);
  }

  showTeamRoundBanner(roundNum, () => {
    if (isLead) {
      executeNextTeamQuestion(0);
    }
  });
}

function executeNextTeamQuestion(qIndex) {
  if (!currentLiveRoom || !currentLiveRoom.isTeamMatch) return;
  ensureTeamQuestionsPopulated(currentLiveRoom);
  const questions = currentLiveRoom.roundQuestions || [];
  if (questions.length === 0) return;

  const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name) || currentUser.name === currentLiveRoom?.leaderName);

  // فحص الانتقال للفقرة التالية وفق عدد أسئلة الفقرة الموزعة
  const countInThisRound = getTeamRoundQuestionCount(currentActiveTeamRound, currentLiveRoom);
  if (qIndex >= countInThisRound) {
    if (currentActiveTeamRound < 4) {
      const nextRound = currentActiveTeamRound + 1;
      currentActiveTeamRound = nextRound;
      if (isSup) {
        currentLiveRoom.currentTeamRound = nextRound;
        currentLiveRoom.currentQuestionIdx = 0;
        currentLiveRoom.teamActiveSolver = null;
        currentLiveRoom.teamRoundStarted = false;
        currentLiveRoom.teamRoundState = "round_waiting_supervisor";
        saveRooms(currentLiveRoom);
      }
      launchTeamRound(nextRound);
    } else {
      // انتهت الفقرات الأربع للمواجهة بين الفريقين! معالجة نتيجة المواجهة وشجرة البطولة
      if (isSup) {
        handleTournamentMatchFinished();
      } else {
        setTimeout(() => {
          if (currentLiveRoom?.phase === "team_finale") {
            showTeamGrandFinaleModal();
          }
        }, 1500);
      }
    }
    return;
  }

  const teamA = currentLiveRoom.teams?.[0];
  const teamB = currentLiveRoom.teams?.[1];
  if (!teamA || !teamB) return;

  // تحديد الفريق المستهدف بالتناوب
  const targetTeam = (qIndex % 2 === 0) ? teamA : teamB;
  const opponentTeam = (qIndex % 2 === 0) ? teamB : teamA;

  // اختيار عشوائي عادل للطالب يضمن عدم التكرار ومشاركة الجميع
  const chosenStudent = pickFairRandomStudentForTeam(targetTeam, currentLiveRoom);

  // احتساب رقم السؤال التسلسلي الشامل في بنك أسئلة الاختبار
  const globalQIdx = getTeamQuestionGlobalIndex(currentActiveTeamRound, qIndex, currentLiveRoom);

  currentActiveTeamSolver = {
    team: targetTeam,
    opponentTeam: opponentTeam,
    studentName: chosenStudent.name,
    isRebound: false,
    qIndex: qIndex,
    globalQIndex: globalQIdx
  };

  // المشرف هو قائد العرض: يكتب حالة السؤال والمتسابق للسحابة فوراً لتظهر عند الجميع بلحظتها وبدون أي تأخير
  const solverStamp = Date.now();
  window.lastHandledTeamSolverStartedAt = solverStamp;
  currentLiveRoom.currentQuestionIdx = qIndex;
  currentLiveRoom.currentTeamRound = currentActiveTeamRound;
  currentLiveRoom.teamActiveSolver = {
    teamId: targetTeam.id,
    teamName: targetTeam.name,
    teamColor: targetTeam.color,
    studentName: chosenStudent.name,
    qIndex: qIndex,
    globalQIndex: globalQIdx,
    roundNum: currentActiveTeamRound,
    isRebound: false,
    startedAt: solverStamp
  };
  saveRooms(currentLiveRoom);

  const targetQuestion = questions[globalQIdx % questions.length];
  showTeamRollingStudentCard(targetTeam, chosenStudent.name, () => {
    renderTeamQuestion(targetQuestion, globalQIdx, qIndex);
  });
}

function renderTeamQuestion(q, globalQIdx, qIndex) {
  if (!q || !stageInteractiveArea) return;

  const totalInQuiz = currentLiveRoom?.roundQuestions?.length || 1;
  const displayQNum = (typeof globalQIdx === "number") ? (globalQIdx + 1) : ((qIndex || 0) + 1);
  if (stageQuestionNumber) stageQuestionNumber.textContent = `السؤال ${displayQNum} من ${totalInQuiz} • ${TEAM_ROUNDS_CONFIG[currentActiveTeamRound]?.name || ''}`;
  if (stageSectionName) stageSectionName.textContent = q.sectionName || "القسم العام";
  if (stageQuestionText) {
    stageQuestionText.className = `question-text-content font-${q.font || 'quran'}`;
    stageQuestionText.textContent = q.text;
  }
  if (stageStudentName) stageStudentName.textContent = `${currentActiveTeamSolver.studentName} (${currentActiveTeamSolver.team.name})`;

  bringQuestionCardIntoView();

  const isMe = currentUser && (
    currentUser.name === currentActiveTeamSolver.studentName || 
    (currentUser.normalizedName && normalizeArabic(currentActiveTeamSolver.studentName) === currentUser.normalizedName)
  );
  const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name) || currentUser.name === currentLiveRoom?.leaderName);
  const canSolve = isMe || isSup;

  // مؤقت السؤال: في فقرة تحت الضغط 7 ثوانٍ، وباقي الفقرات 25 ثانية
  const roundTimerSec = currentActiveTeamRound === 3 ? 7 : (currentLiveRoom.questionTimer || 25);
  startQuestionTimer(roundTimerSec, () => {
    handleTeamQuestionResult(false, null, 0);
  });

  if (q.type === "mcq" && q.options) {
    stageInteractiveArea.innerHTML = `
      ${!canSolve ? `
        <div class="spectator-mode-banner">
          <i class="fa-solid fa-lock"></i>
          <span>الدور الحالي للبطل: <strong>${escapeHtml(currentActiveTeamSolver.studentName)}</strong> (${escapeHtml(currentActiveTeamSolver.team.name)})</span>
        </div>
      ` : ''}
      <div class="mcq-options-grid ${!canSolve ? 'stage-viewer-locked' : ''}">
        ${q.options.map((opt, oIdx) => `
          <button class="btn-choice-duo font-${q.font || 'quran'}" data-choice="${oIdx}" ${!canSolve ? 'disabled style="pointer-events:none;"' : ''}>
            ${opt}
          </button>
        `).join("")}
      </div>
    `;

    if (canSolve) {
      stageInteractiveArea.querySelectorAll(".btn-choice-duo").forEach(btn => {
        btn.addEventListener("click", () => {
          stageInteractiveArea.querySelectorAll(".btn-choice-duo").forEach(b => { b.disabled = true; b.style.pointerEvents = "none"; });
          clearInterval(liveTimerInterval);
          const cIdx = parseInt(btn.getAttribute("data-choice"));
          const isCorrect = (cIdx === q.correct);
          const points = q.points || 5;

          if (isCorrect) {
            btn.classList.add("correct");
            try { soundFX.correct(); } catch (e) {}
          } else {
            btn.classList.add("wrong");
            try { soundFX.wrong(); } catch (e) {}
            // إبراز الخيار الصحيح إذا لم تكن فقرة رد فعل أولى
            if (currentActiveTeamRound !== 1 || currentActiveTeamSolver.isRebound) {
              const corBtn = stageInteractiveArea.querySelector(`[data-choice="${q.correct}"]`);
              if (corBtn) corBtn.classList.add("correct");
            }
          }

          handleTeamQuestionResult(isCorrect, cIdx, points);
        }, { once: true });
      });
    }
  } else {
    // الأسئلة الأخرى (شفهي، ترتيب، توصيل): عرض محتوى السؤال بوضوح وتحكم المشرف
    let specificContentHtml = "";
    if (q.targetOral) {
      specificContentHtml = `
        <div style="margin: 12px auto; padding: 12px 18px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; font-size: 18px; font-weight: 800; color: #0f172a; max-width: 540px;">
          📖 النص القرآني المطلوب تلاوته: <span class="font-${q.font || 'quran'}" style="color: #2563eb; display:inline-block; margin-top: 4px;">${escapeHtml(q.targetOral)}</span>
        </div>
      `;
    } else if (Array.isArray(q.items) && q.items.length > 0) {
      specificContentHtml = `
        <div style="display:flex;justify-content:center;gap:8px;margin:12px auto;flex-wrap:wrap;max-width:540px;">
          ${q.items.map(it => `<span style="padding:8px 16px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;font-weight:800;font-size:16px;color:#1e293b;">${escapeHtml(it)}</span>`).join("")}
        </div>
      `;
    } else if (Array.isArray(q.pairs) && q.pairs.length > 0) {
      const cleanPairs = q.pairs.map((p, pIdx) => {
        let left = "";
        let right = "";
        if (Array.isArray(p)) { left = p[0] || ""; right = p[1] || ""; }
        else if (p && typeof p === "object") { left = p.left || p.first || ""; right = p.right || p.second || ""; }
        return { left: String(left).trim(), right: String(right).trim(), origIdx: pIdx };
      }).filter(p => p.left || p.right);

      const ARABIC_LETTERS = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"];
      const leftItems = cleanPairs.map((p, idx) => ({
        id: `team_match_left_${idx}`,
        text: p.left,
        num: idx + 1,
        origIdx: p.origIdx
      }));

      let rightItems = cleanPairs.map((p, idx) => ({
        id: `team_match_right_${idx}`,
        text: p.right,
        origIdx: p.origIdx,
        letter: ARABIC_LETTERS[idx] || String(idx + 1)
      }));

      // خلط عشوائي حقيقي مبعثر ومؤكد بحيث لا تكون أي إجابة مقابلة لسؤالها أفقياً (Strict Scramble Derangement)
      let scrambledRight = shuffleArray([...rightItems]);
      if (cleanPairs.length > 1) {
        for (let tries = 0; tries < 25; tries++) {
          let hasDirectMatch = false;
          for (let i = 0; i < scrambledRight.length; i++) {
            if (scrambledRight[i].origIdx === leftItems[i].origIdx) {
              hasDirectMatch = true;
              const swapIdx = (i + 1) % scrambledRight.length;
              const tmp = scrambledRight[i];
              scrambledRight[i] = scrambledRight[swapIdx];
              scrambledRight[swapIdx] = tmp;
            }
          }
          if (!hasDirectMatch) break;
        }
      }

      specificContentHtml = `
        <div class="team-matching-container">
          <div style="font-size:14px;font-weight:800;color:#2563eb;margin-bottom:6px;">
            <i class="fa-solid fa-arrows-split-up-and-left"></i> صِل بين كل عنصر في الطرف (أ) وما يناسبه في الطرف (ب) المبعثر:
          </div>
          <div class="team-matching-grid" id="teamMatchInteractiveGrid">
            <div class="team-matching-col">
              <div class="team-matching-header"><i class="fa-solid fa-list-ol"></i> الطرف (أ) [الأصول]:</div>
              ${leftItems.map(it => `
                <div class="team-match-tile team-match-tile-left font-${q.font || 'quran'}" data-left-id="${it.id}" data-orig-idx="${it.origIdx}" data-num="${it.num}">
                  <span class="team-match-badge">${it.num}</span>
                  <span style="flex:1;text-align:right;">${escapeHtml(it.text)}</span>
                  <span class="match-conn-pill" style="font-size:12px;color:#2563eb;font-weight:900;"></span>
                </div>
              `).join("")}
            </div>

            <div class="team-matching-col">
              <div class="team-matching-header"><i class="fa-solid fa-shuffle"></i> الطرف (ب) [مبعثر]:</div>
              ${scrambledRight.map(it => `
                <div class="team-match-tile team-match-tile-right font-${q.font || 'quran'}" data-right-id="${it.id}" data-orig-idx="${it.origIdx}" data-letter="${it.letter}">
                  <span class="team-match-badge" style="background:#eff6ff;color:#1d4ed8;">${it.letter}</span>
                  <span style="flex:1;text-align:right;">${escapeHtml(it.text)}</span>
                  <span class="match-conn-pill" style="font-size:12px;color:#16a34a;font-weight:900;"></span>
                </div>
              `).join("")}
            </div>
          </div>
          ${canSolve ? `
            <div style="margin-top:10px;">
              <button type="button" id="btnSubmitTeamMatch" class="btn-duo-green" style="font-size:15px;padding:8px 24px;display:none;">
                <i class="fa-solid fa-check-double"></i> اعتماد التوصيل
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }

    stageInteractiveArea.innerHTML = `
      <div style="text-align:center;padding:20px;">
        <div style="font-weight:900;font-size:16px;color:#1e293b;margin-bottom:12px;">
          المتسابق المعني بالإجابة: <strong style="color:#2563eb;">${escapeHtml(currentActiveTeamSolver.studentName)}</strong> (${escapeHtml(currentActiveTeamSolver.team.name)})
        </div>
        ${specificContentHtml}
        ${isSup ? `
          <div style="display:flex;justify-content:center;gap:12px;margin-top:14px;">
            <button type="button" id="btnTeamEvaluateCorrect" class="btn-duo-green" style="padding:10px 24px;">
              <i class="fa-solid fa-circle-check"></i> إجابة صحيحة (+5 درجات)
            </button>
            <button type="button" id="btnTeamEvaluateWrong" class="btn-duo-outline" style="color:#dc2626;border-color:#ef4444;padding:10px 24px;">
              <i class="fa-solid fa-circle-xmark"></i> إجابة غير صحيحة
            </button>
          </div>
        ` : `
          <div style="font-size:13px;color:#64748b;font-weight:700;margin-top:10px;">في انتظار تقييم المشرف لإجابة المتسابق...</div>
        `}
      </div>
    `;

    // تفعيل تفاعل النقر للتوصيل إن وجد
    if (canSolve) {
      let selectedLeftTile = null;
      const connections = [];
      const grid = document.getElementById("teamMatchInteractiveGrid");
      const btnSubMatch = document.getElementById("btnSubmitTeamMatch");

      if (grid) {
        grid.querySelectorAll(".team-match-tile-left").forEach(lTile => {
          lTile.addEventListener("click", () => {
            if (lTile.classList.contains("connected")) {
              const idx = connections.findIndex(c => c.leftTile === lTile);
              if (idx > -1) {
                connections[idx].rightTile.classList.remove("connected");
                connections[idx].rightTile.querySelector(".match-conn-pill").textContent = "";
                connections.splice(idx, 1);
              }
              lTile.classList.remove("connected", "selected");
              lTile.querySelector(".match-conn-pill").textContent = "";
              if (btnSubMatch) btnSubMatch.style.display = (connections.length === grid.querySelectorAll(".team-match-tile-left").length) ? "inline-flex" : "none";
              return;
            }
            grid.querySelectorAll(".team-match-tile-left").forEach(t => t.classList.remove("selected"));
            lTile.classList.add("selected");
            selectedLeftTile = lTile;
            try { soundFX.btnClick(); } catch (e) {}
          });
        });

        grid.querySelectorAll(".team-match-tile-right").forEach(rTile => {
          rTile.addEventListener("click", () => {
            if (!selectedLeftTile) {
              showToast("انقر على عنصر من الطرف (أ) أولاً ثم صله بالطرف (ب)", "fa-hand-pointer");
              return;
            }
            if (rTile.classList.contains("connected")) {
              const idx = connections.findIndex(c => c.rightTile === rTile);
              if (idx > -1) {
                connections[idx].leftTile.classList.remove("connected");
                connections[idx].leftTile.querySelector(".match-conn-pill").textContent = "";
                connections.splice(idx, 1);
              }
            }
            const leftNum = selectedLeftTile.getAttribute("data-num");
            const rightLetter = rTile.getAttribute("data-letter");
            const leftOrig = parseInt(selectedLeftTile.getAttribute("data-orig-idx"));
            const rightOrig = parseInt(rTile.getAttribute("data-orig-idx"));

            selectedLeftTile.classList.remove("selected");
            selectedLeftTile.classList.add("connected");
            rTile.classList.add("connected");

            selectedLeftTile.querySelector(".match-conn-pill").textContent = `⟵ [${rightLetter}]`;
            rTile.querySelector(".match-conn-pill").textContent = `[${leftNum}] ⟶`;

            connections.push({ leftOrig, rightOrig, leftTile: selectedLeftTile, rightTile: rTile });
            selectedLeftTile = null;

            try { soundFX.btnClick(); } catch (e) {}

            const totalLeft = grid.querySelectorAll(".team-match-tile-left").length;
            if (btnSubMatch) {
              btnSubMatch.style.display = (connections.length === totalLeft) ? "inline-flex" : "none";
            }
          });
        });

        btnSubMatch?.addEventListener("click", () => {
          clearInterval(liveTimerInterval);
          const allCorrect = connections.every(c => c.leftOrig === c.rightOrig);
          if (allCorrect) {
            try { soundFX.correct(); } catch (e) {}
          } else {
            try { soundFX.wrong(); } catch (e) {}
          }
          handleTeamQuestionResult(allCorrect, null, allCorrect ? 5 : 0);
        });
      }
    }

    document.getElementById("btnTeamEvaluateCorrect")?.addEventListener("click", () => {
      clearInterval(liveTimerInterval);
      handleTeamQuestionResult(true, null, 5);
    });
    document.getElementById("btnTeamEvaluateWrong")?.addEventListener("click", () => {
      clearInterval(liveTimerInterval);
      handleTeamQuestionResult(false, null, 5);
    });
  }
}

// معالجة نتيجة الإجابة للفقرات المختلفة مع المزامنة السحابية اللحظية
async function handleTeamQuestionResult(isCorrect, choiceIdx, earnedPoints) {
  if (!currentLiveRoom || !currentActiveTeamSolver) return;

  const currentRound = currentActiveTeamRound;
  const activeTeam = currentActiveTeamSolver.team;
  const oppTeam = currentActiveTeamSolver.opponentTeam;
  const solverName = currentActiveTeamSolver.studentName;
  const isLead = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name) || currentUser.name === currentLiveRoom.leaderName);

  // تحديث درجات الفريقين محلياً
  currentLiveRoom.teamScores = currentLiveRoom.teamScores || {};
  currentLiveRoom.teamPlayerScores = currentLiveRoom.teamPlayerScores || {};

  if (isCorrect) {
    currentLiveRoom.teamScores[activeTeam.id] = (currentLiveRoom.teamScores[activeTeam.id] || 0) + earnedPoints;
    currentLiveRoom.teamPlayerScores[solverName] = (currentLiveRoom.teamPlayerScores[solverName] || 0) + earnedPoints;
  } else if (currentRound === 2) {
    // فقرة احذر: خصم كامل النقاط من رصيد الفريق
    const curScore = currentLiveRoom.teamScores[activeTeam.id] || 0;
    currentLiveRoom.teamScores[activeTeam.id] = Math.max(0, curScore - earnedPoints);
  }

  const answerTimestamp = Date.now();
  window.lastHandledTeamAnswerTs = answerTimestamp;

  const currentGlobalQIdx = (typeof currentActiveTeamSolver.globalQIndex === "number")
    ? currentActiveTeamSolver.globalQIndex
    : getTeamQuestionGlobalIndex(currentRound, currentActiveTeamSolver.qIndex, currentLiveRoom);

  const answerPayload = {
    questionIdx: currentActiveTeamSolver.qIndex,
    globalQIndex: currentGlobalQIdx,
    choiceIdx: choiceIdx,
    isCorrect: isCorrect,
    earnedPoints: isCorrect ? earnedPoints : (currentRound === 2 ? -earnedPoints : 0),
    studentName: solverName,
    teamId: activeTeam.id,
    teamName: activeTeam.name,
    roundNum: currentRound,
    isRebound: false,
    answeredBy: currentUser?.name || solverName,
    timestamp: answerTimestamp
  };

  // حالة رد الفعل في الفقرة الأولى عند الخطأ
  if (!isCorrect && currentRound === 1 && !currentActiveTeamSolver.isRebound) {
    const oppStudent = pickFairRandomStudentForTeam(oppTeam, currentLiveRoom);

    answerPayload.isRebound = true;
    answerPayload.reboundTeamName = oppTeam.name;
    answerPayload.reboundStudentName = oppStudent.name;

    currentActiveTeamSolver = {
      team: oppTeam,
      opponentTeam: activeTeam,
      studentName: oppStudent.name,
      isRebound: true,
      qIndex: currentActiveTeamSolver.qIndex,
      globalQIndex: currentGlobalQIdx
    };

    currentLiveRoom.teamActiveSolver = {
      teamId: oppTeam.id,
      teamName: oppTeam.name,
      teamColor: oppTeam.color,
      studentName: oppStudent.name,
      qIndex: currentActiveTeamSolver.qIndex,
      globalQIndex: currentGlobalQIdx,
      roundNum: 1,
      isRebound: true,
      startedAt: answerTimestamp
    };

    // بطاقة سينمائية ثلاثية الأبعاد تنبثق بسلاسة للأعلى لـ 3 ثوانٍ وتنسحب بمرونة
    const transferAlert = {
      type: "turn_transfer",
      tag: "⚡ فرصة رد الفعل وانتقال الدور!",
      headline: "السؤال يتحول الآن إلى البطل:",
      studentName: oppStudent.name,
      teamName: oppTeam.name,
      teamColor: oppTeam.color,
      subtext: "لديك فرصة للإجابة وخطف نقاط السؤال لصالح فريقك!",
      timestamp: answerTimestamp
    };

    window.lastSeenCinematicAlertTimestamp = answerTimestamp;
    triggerCinematicTeamAlert(transferAlert);

    currentLiveRoom.lastCinematicAlert = transferAlert;
    currentLiveRoom.lastTeamAnswerEvent = answerPayload;
    await saveRooms(currentLiveRoom);
    updateTeamScoreFlyers();

    // انتظار 3.1 ثانية حتى تكتمل حركة البطاقة السلسة بوضوح
    setTimeout(() => {
      const questions = currentLiveRoom?.roundQuestions || [];
      const targetQuestion = questions[currentGlobalQIdx % questions.length];
      renderTeamQuestion(targetQuestion, currentGlobalQIdx, currentActiveTeamSolver.qIndex);
    }, 3100);
    return;
  }

  // في سائر الحالات (صواب، أو خطأ في فقرة 2 و 3 و 4، أو خطأ بعد الرد)
  if (!isCorrect) {
    const wrongAlert = {
      type: "wrong_answer",
      tag: currentRound === 2 ? "⚠️ فقرة احذر: إجابة خاطئة وخصم درجات!" : "❌ إجابة غير دقيقة!",
      headline: "أجاب خطأ البطل:",
      studentName: solverName,
      teamName: activeTeam.name,
      teamColor: activeTeam.color,
      subtext: currentRound === 2 
        ? `تم خصم ${earnedPoints} درجات كاملة من رصيد ${activeTeam.name}!` 
        : (currentRound === 1 && currentActiveTeamSolver.isRebound ? "انتهت فرصة رد الفعل، لم تحتسب درجات لهذا السؤال!" : "لم يحالفهم الحظ، استعدوا للسؤال القادم!"),
      timestamp: answerTimestamp
    };

    window.lastSeenCinematicAlertTimestamp = answerTimestamp;
    triggerCinematicTeamAlert(wrongAlert);
    currentLiveRoom.lastCinematicAlert = wrongAlert;
  }

  currentLiveRoom.lastTeamAnswerEvent = answerPayload;
  await saveRooms(currentLiveRoom);
  updateTeamScoreFlyers(isCorrect ? activeTeam.id : null, earnedPoints);

  if (isCorrect) {
    showToast(`⭐ إجابة صحيحة من البطل ${escapeHtml(solverName)} (+${earnedPoints} درجات)!`, "fa-circle-check", 2200);
  } else if (currentRound === 2) {
    showToast(`⚠️ فقرة احذر: تم خصم ${earnedPoints} درجات من رصيد ${escapeHtml(activeTeam.name)}!`, "fa-triangle-exclamation", 2200);
  } else {
    showToast("❌ لم يتم احتساب نقاط لهذا السؤال — استعدوا للسؤال القادم!", "fa-circle-xmark", 2200);
  }

  // إذا كان المجيب هو المشرف / قائد الغرفة، يقود الانتقال للسؤال التالي (3.2 ثانية عند الخطأ لإتاحة اكتمال البطاقة، و 1.8 ثانية عند الصواب)
  if (isLead) {
    const nextDelay = !isCorrect ? 3200 : 1800;
    setTimeout(() => {
      executeNextTeamQuestion(currentActiveTeamSolver.qIndex + 1);
    }, nextDelay);
  } else {
    // إجراء أمان احتياطي: إذا لم يكن المشرف متواجداً في الغرفة، يتم التقدم بعد 3.5 ثوانٍ
    setTimeout(() => {
      if (currentLiveRoom && currentLiveRoom.currentQuestionIdx === currentActiveTeamSolver.qIndex) {
        executeNextTeamQuestion(currentActiveTeamSolver.qIndex + 1);
      }
    }, 3500);
  }
}

// --------------------------------------------------------
// منصة التتويج النهائي للفرق الفائزة (Grand Finale Podium)
// --------------------------------------------------------
// --------------------------------------------------------
// معالجة نتيجة مواجهة الفرق وشجرة التصفيات (Tournament Knockout Engine)
// --------------------------------------------------------
async function handleTournamentMatchFinished() {
  const room = currentLiveRoom;
  if (!room || !room.isTeamMatch) return;

  const teamA = room.teams?.[0] || room.teamA;
  const teamB = room.teams?.[1] || room.teamB;
  if (!teamA || !teamB) {
    showTeamGrandFinaleModal();
    return;
  }

  // إيقاف أي مؤقت فورا
  if (liveTimerInterval) {
    clearInterval(liveTimerInterval);
    liveTimerInterval = null;
  }
  lastTimerConfigKey = "match_finished_paused";

  const scoreA = room.teamScores?.[teamA.id] || 0;
  const scoreB = room.teamScores?.[teamB.id] || 0;

  // تحديد الفائز والخاسر
  let winner = scoreA >= scoreB ? teamA : teamB;
  let loser = scoreA >= scoreB ? teamB : teamA;

  if (!room.tournamentState) {
    const allT = (Array.isArray(room.teams) && room.teams.length >= 2) ? room.teams : teamsCache;
    room.tournamentState = initTournamentBracket(allT);
  }

  const tState = room.tournamentState;
  let currentRound = tState.rounds?.[tState.currentRoundIndex];
  if (!currentRound) {
    currentRound = {
      roundIndex: 0,
      roundName: getRoundNameForTeams(tState.teams?.length || 2),
      initialTeamsCount: tState.teams?.length || 2,
      pendingTeamIds: (tState.teams || []).map(t => t.id),
      qualifiedTeamIds: [],
      eliminatedTeamIds: [],
      byeTeamId: null,
      matches: []
    };
    tState.rounds = [currentRound];
    tState.currentRoundIndex = 0;
  }

  // 1. تسجيل نتيجة المواجهة في سجل الدور
  currentRound.matches = currentRound.matches || [];
  currentRound.matches.push({
    teamA: { id: teamA.id, name: teamA.name, color: teamA.color },
    teamB: { id: teamB.id, name: teamB.name, color: teamB.color },
    scoreA: scoreA,
    scoreB: scoreB,
    winnerId: winner.id,
    winnerName: winner.name,
    loserId: loser.id,
    loserName: loser.name,
    timestamp: Date.now()
  });

  // 2. الفائز ينضم لقائمة المتأهلين والخاسر للمقصيين
  if (!currentRound.qualifiedTeamIds.includes(winner.id)) {
    currentRound.qualifiedTeamIds.push(winner.id);
  }
  if (!currentRound.eliminatedTeamIds.includes(loser.id)) {
    currentRound.eliminatedTeamIds.push(loser.id);
  }
  currentRound.pendingTeamIds = (currentRound.pendingTeamIds || []).filter(id => id !== teamA.id && id !== teamB.id);

  // 3. فحص حالة الفريق الفردي المتبقي في الدور (تأهل تلقائي بالقرعة Bye)
  if (currentRound.pendingTeamIds.length === 1) {
    const byeId = currentRound.pendingTeamIds[0];
    const byeTeam = (tState.teams || []).find(t => t.id === byeId);
    if (!currentRound.qualifiedTeamIds.includes(byeId)) {
      currentRound.qualifiedTeamIds.push(byeId);
    }
    currentRound.byeTeamId = byeId;
    currentRound.pendingTeamIds = [];
    showToast(`🎲 تأهل فريق «${byeTeam?.name || 'المتبقي'}» بالقرعة للدور القادم مباشرة!`, "fa-dice", 3500);
  }

  // 4. هل لا تزال هناك مواجهات متبقية في هذا الدور؟
  if (currentRound.pendingTeamIds.length >= 2) {
    showToast(`🏆 مبروك لفريق «${winner.name}» الفوز (${Math.max(scoreA, scoreB)} - ${Math.min(scoreA, scoreB)}) والتأهل للدور القادم!`, "fa-circle-check", 3200);
    try { soundFX.celebrate(); } catch (e) {}

    await saveRooms(room);
    setTimeout(async () => {
      await handleReturnToTeamSelection();
    }, 2500);
    return;
  }

  // 5. اكتملت جميع مواجهات هذا الدور!
  const isFinalMatch = currentRound.roundName.includes("النهائي") || currentRound.initialTeamsCount <= 2 || currentRound.qualifiedTeamIds.length === 1;

  if (isFinalMatch) {
    // تتويج بطل البطولة النهائي!
    tState.isFinished = true;
    tState.championTeam = winner;
    tState.runnerUpTeam = loser;

    // بناء جدول الترتيب الكامل لجميع الفرق المشاركة من الأول إلى الأخير
    const standings = [];
    standings.push({
      rank: 1,
      team: winner,
      stageLabel: "البطل المتوج بالمركز الأول 🏆",
      points: room.teamScores[winner.id] || 0
    });
    standings.push({
      rank: 2,
      team: loser,
      stageLabel: "وصيف البطولة - المركز الثاني 🥈",
      points: room.teamScores[loser.id] || 0
    });

    const allTeams = tState.teams || [];
    for (let rIdx = tState.rounds.length - 1; rIdx >= 0; rIdx--) {
      const r = tState.rounds[rIdx];
      (r.eliminatedTeamIds || []).forEach(tId => {
        if (tId !== loser.id && !standings.some(s => s.team.id === tId)) {
          const tObj = allTeams.find(t => t.id === tId);
          if (tObj) {
            standings.push({
              rank: standings.length + 1,
              team: tObj,
              stageLabel: r.roundName,
              points: 0
            });
          }
        }
      });
    }

    allTeams.forEach(tObj => {
      if (!standings.some(s => s.team.id === tObj.id)) {
        standings.push({
          rank: standings.length + 1,
          team: tObj,
          stageLabel: "مشارك في البطولة",
          points: 0
        });
      }
    });

    tState.fullStandings = standings;
    room.phase = "team_finale";
    await saveRooms(room);
    showTeamGrandFinaleModal();
    return;
  }

  // انتقال لدور التصفيات التالي
  const nextTeamsCount = currentRound.qualifiedTeamIds.length;
  const nextRoundName = getRoundNameForTeams(nextTeamsCount);
  const nextRoundIndex = tState.currentRoundIndex + 1;

  let nextPending = [...currentRound.qualifiedTeamIds];
  let nextQualified = [];
  let nextByeId = null;

  if (nextPending.length % 2 !== 0 && nextPending.length > 2) {
    const byeIdx = Math.floor(Math.random() * nextPending.length);
    nextByeId = nextPending.splice(byeIdx, 1)[0];
    nextQualified.push(nextByeId);
  }

  const newRound = {
    roundIndex: nextRoundIndex,
    roundName: nextRoundName,
    initialTeamsCount: nextTeamsCount,
    pendingTeamIds: nextPending,
    qualifiedTeamIds: nextQualified,
    eliminatedTeamIds: [],
    byeTeamId: nextByeId,
    matches: []
  };

  tState.rounds.push(newRound);
  tState.currentRoundIndex = nextRoundIndex;
  tState.currentRoundName = nextRoundName;

  await saveRooms(room);

  showToast(`🚀 اكتملت مواجهات ${currentRound.roundName}! تأهلت ${nextTeamsCount} فرق إلى: ${nextRoundName}!`, "fa-bolt", 4000);
  try { soundFX.celebrate(); } catch (e) {}

  setTimeout(async () => {
    await handleReturnToTeamSelection();
  }, 2800);
}

// --------------------------------------------------------
// منصة التتويج النهائي للفرق الفائزة (Grand Finale Podium)
// --------------------------------------------------------
function showTeamGrandFinaleModal() {
  const overlay = document.getElementById("teamGrandFinaleOverlay");
  if (!overlay || !currentLiveRoom) return;

  // إيقاف أي مؤقت فورا
  if (liveTimerInterval) {
    clearInterval(liveTimerInterval);
    liveTimerInterval = null;
  }
  lastTimerConfigKey = "grand_finale_paused";
  if (stageTimerSeconds) stageTimerSeconds.textContent = "🏆";

  const teamA = currentLiveRoom.teams?.[0] || currentLiveRoom.teamA || { id: "a", name: "الفريق الأول" };
  const teamB = currentLiveRoom.teams?.[1] || currentLiveRoom.teamB || { id: "b", name: "الفريق الثاني" };

  const scoreA = currentLiveRoom.teamScores?.[teamA.id] || 0;
  const scoreB = currentLiveRoom.teamScores?.[teamB.id] || 0;

  const tState = currentLiveRoom.tournamentState;
  const winningTeam = tState?.championTeam || (scoreA >= scoreB ? teamA : teamB);
  const runnerUpTeam = tState?.runnerUpTeam || (scoreA >= scoreB ? teamB : teamA);
  const winningScore = Math.max(scoreA, scoreB);

  // حساب أفضل طالب (MVP) من الفرق
  let mvpName = "--";
  let maxPScore = 0;
  const pScores = currentLiveRoom.teamPlayerScores || {};
  Object.keys(pScores).forEach(name => {
    if (pScores[name] > maxPScore) {
      maxPScore = pScores[name];
      mvpName = name;
    }
  });

  if (mvpName === "--" && winningTeam.members?.length > 0) {
    mvpName = winningTeam.members[0].name;
    maxPScore = Math.round(winningScore / 2);
  }

  const wNameEl = document.getElementById("winningTeamName");
  const wScoreEl = document.getElementById("winningTeamScore");
  const wMembersEl = document.getElementById("winningTeamMembersList");
  if (wNameEl) wNameEl.textContent = winningTeam.name;
  if (wScoreEl) wScoreEl.textContent = `${winningScore} نقطة مباركة`;
  if (wMembersEl) wMembersEl.textContent = `أبطال الفريق: ${winningTeam.members?.map(m => m.name).join("، ") || '--'}`;

  const mvpNameEl = document.getElementById("mvpStudentName");
  const mvpScoreEl = document.getElementById("mvpStudentScore");
  if (mvpNameEl) mvpNameEl.textContent = mvpName;
  if (mvpScoreEl) mvpScoreEl.textContent = `${maxPScore} نقطة مسجلة`;

  // ملء جدول الترتيب النهائي للبطولة من المركز الأول للأخير
  const standingsGrid = document.getElementById("tournamentStandingsGrid");
  const standings = tState?.fullStandings || [
    { rank: 1, team: winningTeam, stageLabel: "البطل المتوج بالمركز الأول 🏆", points: winningScore },
    { rank: 2, team: runnerUpTeam, stageLabel: "وصيف البطولة - المركز الثاني 🥈", points: Math.min(scoreA, scoreB) }
  ];

  if (standingsGrid) {
    standingsGrid.innerHTML = standings.map((item, idx) => {
      const rank = item.rank || (idx + 1);
      let rankClass = "";
      let medalHtml = `<span class="podium-rank-badge" style="background:#334155;color:#fff;">${rank}</span>`;
      if (rank === 1) {
        rankClass = "rank-1";
        medalHtml = `<span class="podium-rank-badge" style="background:#facc15;color:#854d0e;">🥇</span>`;
      } else if (rank === 2) {
        rankClass = "rank-2";
        medalHtml = `<span class="podium-rank-badge" style="background:#cbd5e1;color:#1e293b;">🥈</span>`;
      } else if (rank === 3) {
        rankClass = "rank-3";
        medalHtml = `<span class="podium-rank-badge" style="background:#d97706;color:#fff;">🥉</span>`;
      }

      return `
        <div class="standing-row-duo ${rankClass}">
          <div style="display:flex;align-items:center;gap:10px;">
            ${medalHtml}
            <div>
              <strong style="font-size:14.5px;">${escapeHtml(item.team?.name || 'فريق')}</strong>
              <div style="font-size:11.5px;opacity:0.85;">${escapeHtml(item.stageLabel || '')}</div>
            </div>
          </div>
          <div style="font-size:13px;font-weight:900;">
            ${item.points ? `${item.points} نقطة` : ''}
          </div>
        </div>
      `;
    }).join("");
  }

  overlay.classList.remove("hidden");
  try { soundFX.celebrate(); } catch (e) {}
}

// إنهاء وحفظ البطولة في أرشيف المسابقات السابقة
async function saveCurrentTournamentToArchive() {
  if (!currentLiveRoom) return;
  showGlobalLoader("جاري حفظ وتوثيق البطولة...", "يتم حفظ المسابقة والمراكز في أرشيف المسابقات السابقة سحابياً للجميع");

  try {
    const tState = currentLiveRoom.tournamentState || {};
    const teamA = currentLiveRoom.teams?.[0] || currentLiveRoom.teamA || { id: "a", name: "الفريق الأول" };
    const teamB = currentLiveRoom.teams?.[1] || currentLiveRoom.teamB || { id: "b", name: "الفريق الثاني" };
    const scoreA = currentLiveRoom.teamScores?.[teamA.id] || 0;
    const scoreB = currentLiveRoom.teamScores?.[teamB.id] || 0;
    const winningTeam = tState.championTeam || (scoreA >= scoreB ? teamA : teamB);
    const runnerUpTeam = tState.runnerUpTeam || (scoreA >= scoreB ? teamB : teamA);

    let mvpName = "--";
    let maxPScore = 0;
    const pScores = currentLiveRoom.teamPlayerScores || {};
    Object.keys(pScores).forEach(name => {
      if (pScores[name] > maxPScore) {
        maxPScore = pScores[name];
        mvpName = name;
      }
    });
    if (mvpName === "--" && winningTeam.members?.length > 0) {
      mvpName = winningTeam.members[0].name;
      maxPScore = Math.round(Math.max(scoreA, scoreB) / 2);
    }

    const archiveId = "tourn_" + Date.now();
    const tournamentArchiveDoc = {
      id: archiveId,
      roomId: currentLiveRoom.id,
      title: currentLiveRoom.name,
      championTeam: winningTeam,
      runnerUpTeam: runnerUpTeam,
      fullStandings: tState.fullStandings || [
        { rank: 1, team: winningTeam, stageLabel: "البطل المتوج بالمركز الأول 🏆", points: Math.max(scoreA, scoreB) },
        { rank: 2, team: runnerUpTeam, stageLabel: "وصيف البطولة - المركز الثاني 🥈", points: Math.min(scoreA, scoreB) }
      ],
      totalTeamsCount: tState.teams?.length || currentLiveRoom.teams?.length || 2,
      roundsCount: tState.rounds?.length || 1,
      rounds: tState.rounds || [],
      supervisorName: currentLiveRoom.leaderName || currentLiveRoom.creatorName || MASTER_SUPERVISOR_NAME,
      completedAt: new Date().toISOString(),
      formattedDate: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
      mvpStudent: { name: mvpName, score: maxPScore },
      createdAt: serverTimestamp()
    };

    const cleanDoc = sanitizeForFirestore(tournamentArchiveDoc);
    await setDoc(doc(db, "tournament_archives", archiveId), cleanDoc);

    pastTournamentsCache = pastTournamentsCache.filter(t => t.id !== archiveId);
    pastTournamentsCache.unshift(tournamentArchiveDoc);
    localStorage.setItem("nour_past_tournaments", JSON.stringify(pastTournamentsCache));

    document.getElementById("teamGrandFinaleOverlay")?.classList.add("hidden");

    try {
      await updateDoc(doc(db, "live_rooms", currentLiveRoom.id), {
        isFinished: true,
        savedToArchive: true,
        lastUpdated: serverTimestamp()
      });
    } catch (e) {}

    showToast("🏆 تم حفظ وتوثيق البطولة بنجاح في أرشيف المسابقات السابقة!", "fa-trophy", 3500);

    renderPastTournamentsTab();
    if (currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name))) {
      showView("supervisor");
      const tabBtn = document.querySelector(".nav-tab[data-tab='tabPastTournaments']");
      tabBtn?.click();
    } else {
      openPastTournamentsModal();
    }
  } catch (err) {
    console.error("Error saving tournament archive:", err);
    showToast("تعذر حفظ البطولة سحابياً: " + (err.message || "خطأ غير متوقع"), "fa-triangle-exclamation");
  } finally {
    hideGlobalLoader();
  }
}

// --------------------------------------------------------
// قسم وأرشيف المسابقات السابقة (Past Tournaments Section)
// --------------------------------------------------------
function renderPastTournamentsCard(tourn) {
  const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name));
  const champion = tourn.championTeam || { name: "غير محدد", color: "gold" };
  const runnerUp = tourn.runnerUpTeam || { name: "غير محدد" };
  const totalTeams = tourn.totalTeamsCount || (tourn.fullStandings?.length) || 2;
  const dateStr = tourn.formattedDate || (tourn.completedAt ? new Date(tourn.completedAt).toLocaleDateString('ar-EG') : 'حديثاً');

  return `
    <div class="past-tournament-card" data-tourn-id="${escapeHtml(tourn.id)}">
      <div class="past-tournament-card-header">
        <div>
          <h3 class="past-card-title"><i class="fa-solid fa-trophy" style="color:#eab308;margin-left:6px;"></i> ${escapeHtml(tourn.title || "بطولة مسابقة نور البيان")}</h3>
          <span class="past-card-date"><i class="fa-regular fa-calendar-days"></i> ${escapeHtml(dateStr)} • المشرف: ${escapeHtml(tourn.supervisorName || MASTER_SUPERVISOR_NAME)}</span>
        </div>
        <span class="badge" style="background:#dbeafe;color:#1e40af;font-weight:900;padding:4px 10px;border-radius:12px;font-size:12px;">
          ${totalTeams} فرق
        </span>
      </div>

      <div class="past-card-champion-box">
        <div class="champion-trophy-small">
          <i class="fa-solid fa-crown"></i>
        </div>
        <div style="flex:1;">
          <div style="font-size:11.5px;color:#854d0e;font-weight:800;">الفريق البطل المتوج بالمركز الأول 🏆</div>
          <strong style="font-size:17px;color:#713f12;display:block;">${escapeHtml(champion.name)}</strong>
        </div>
      </div>

      <div class="past-card-meta-row">
        <span>🥈 الوصيف: <strong>${escapeHtml(runnerUp.name)}</strong></span>
        ${tourn.mvpStudent ? `<span>⭐ هداف البطولة: <strong>${escapeHtml(tourn.mvpStudent.name)} (${tourn.mvpStudent.score}ن)</strong></span>` : ''}
      </div>

      <div style="display:flex;gap:8px;margin-top:12px;">
        <button type="button" class="btn-duo-blue btn-sm btn-view-tournament-details" data-id="${escapeHtml(tourn.id)}" style="flex:1;font-size:12.5px;padding:7px 12px;font-weight:800;">
          <i class="fa-solid fa-ranking-star"></i> عرض المراكز والترتيب
        </button>
        ${isSup ? `
          <button type="button" class="btn-duo-outline btn-sm btn-delete-past-tourn" data-id="${escapeHtml(tourn.id)}" style="color:#ef4444;border-color:#fca5a5;padding:7px 10px;" title="حذف من الأرشيف">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

function updatePastTournamentsBadges() {
  const count = pastTournamentsCache.length;
  const badge1 = document.getElementById("badgePastTournamentsCount");
  const count1 = document.getElementById("totalPastTournamentsCount");
  const count2 = document.getElementById("modalTotalPastTournamentsCount");
  if (badge1) badge1.textContent = String(count);
  if (count1) count1.textContent = String(count);
  if (count2) count2.textContent = String(count);
}

function renderPastTournamentsTab(filterQuery = "") {
  updatePastTournamentsBadges();
  const q = normalizeArabic((filterQuery || "").trim());
  const filtered = q
    ? pastTournamentsCache.filter(t => 
        normalizeArabic(t.title || "").includes(q) ||
        normalizeArabic(t.championTeam?.name || "").includes(q) ||
        normalizeArabic(t.runnerUpTeam?.name || "").includes(q) ||
        normalizeArabic(t.supervisorName || "").includes(q)
      )
    : pastTournamentsCache;

  const emptyHtml = `
    <div style="grid-column: 1/-1; padding: 40px 20px; text-align: center; background: #ffffff; border: 2px dashed #cbd5e1; border-radius: 18px; color: #64748b;">
      <i class="fa-solid fa-box-open" style="font-size: 38px; color: #94a3b8; margin-bottom: 12px; display: block;"></i>
      <h4 style="font-size: 17px; font-weight: 800; color: #1e293b; margin: 0 0 6px;">لا توجد مسابقات سابقة محفوظة حالياً</h4>
      <p style="font-size: 13.5px; margin: 0;">عند إتمام أي مسابقة فرق والضغط على «إنهاء وحفظ المسابقة»، سيتم توثيقها وحفظها هنا فورياً لجميع المستخدمين.</p>
    </div>
  `;

  const cardsHtml = filtered.length === 0 ? emptyHtml : filtered.map(t => renderPastTournamentsCard(t)).join("");

  const supervisorGrid = document.getElementById("pastTournamentsListGrid");
  const studentGrid = document.getElementById("studentPastTournamentsList");
  const modalGrid = document.getElementById("modalPastTournamentsListGrid");

  if (supervisorGrid) supervisorGrid.innerHTML = cardsHtml;
  if (studentGrid) studentGrid.innerHTML = cardsHtml;
  if (modalGrid) modalGrid.innerHTML = cardsHtml;

  // ربط الأزرار التفاعلية
  [supervisorGrid, studentGrid, modalGrid].forEach(container => {
    if (!container) return;
    container.querySelectorAll(".btn-view-tournament-details").forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-id");
        openTournamentDetailsModal(id);
      };
    });
    container.querySelectorAll(".btn-delete-past-tourn").forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-id");
        deletePastTournament(id);
      };
    });
  });
}

function openPastTournamentsModal() {
  const modal = document.getElementById("pastTournamentsModal");
  if (!modal) return;
  renderPastTournamentsTab();
  modal.classList.remove("hidden");
}

function openTournamentDetailsModal(tournamentId) {
  const tourn = pastTournamentsCache.find(t => t.id === tournamentId);
  if (!tourn) return;

  const modal = document.getElementById("tournamentDetailsModal");
  const titleEl = document.getElementById("detailsModalTournamentTitle");
  const metaEl = document.getElementById("detailsModalTournamentMeta");
  const contentEl = document.getElementById("tournamentDetailsContent");
  if (!modal || !contentEl) return;

  if (titleEl) titleEl.textContent = tourn.title || "تفاصيل البطولة";
  if (metaEl) metaEl.textContent = `التاريخ: ${tourn.formattedDate || (tourn.completedAt ? new Date(tourn.completedAt).toLocaleDateString('ar-EG') : 'حديثاً')} • المشرف: ${tourn.supervisorName || MASTER_SUPERVISOR_NAME}`;

  const champion = tourn.championTeam || { name: "غير محدد" };
  const runnerUp = tourn.runnerUpTeam || { name: "غير محدد" };
  const standings = tourn.fullStandings || [];

  contentEl.innerHTML = `
    <!-- بطاقة البطل والوصيف -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
      <div style="background:linear-gradient(135deg,#fefce8 0%,#fef08a 100%);border:2px solid #facc15;border-radius:14px;padding:12px;text-align:center;">
        <div style="font-size:24px;">🏆</div>
        <div style="font-size:12px;color:#854d0e;font-weight:800;">بطل البطولة (المركز الأول)</div>
        <strong style="font-size:18px;color:#713f12;display:block;margin-top:2px;">${escapeHtml(champion.name)}</strong>
      </div>
      <div style="background:linear-gradient(135deg,#f1f5f9 0%,#e2e8f0 100%);border:2px solid #cbd5e1;border-radius:14px;padding:12px;text-align:center;">
        <div style="font-size:24px;">🥈</div>
        <div style="font-size:12px;color:#334155;font-weight:800;">وصيف البطولة (المركز الثاني)</div>
        <strong style="font-size:18px;color:#0f172a;display:block;margin-top:2px;">${escapeHtml(runnerUp.name)}</strong>
      </div>
    </div>

    ${tourn.mvpStudent ? `
      <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:10px 14px;margin-bottom:16px;display:flex;align-items:center;gap:10px;">
        <i class="fa-solid fa-star" style="color:#eab308;font-size:20px;"></i>
        <div>
          <span style="font-size:12px;color:#166534;font-weight:800;">نجم وهداف البطولة (MVP):</span>
          <strong style="font-size:14.5px;color:#14532d;display:block;">${escapeHtml(tourn.mvpStudent.name)} (${tourn.mvpStudent.score} نقطة)</strong>
        </div>
      </div>
    ` : ''}

    <!-- جدول الترتيب الكامل للبطولة -->
    <h4 style="font-size:15px;font-weight:900;color:#1e293b;margin:0 0 10px;display:flex;align-items:center;gap:6px;">
      <i class="fa-solid fa-ranking-star" style="color:#2563eb;"></i> جدول الترتيب النهائي لفرق البطولة (${standings.length || tourn.totalTeamsCount || 0} فرق):
    </h4>
    <div style="display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto;padding-left:4px;">
      ${standings.map((s, idx) => {
        const rank = s.rank || (idx + 1);
        let rankBadge = `<span class="podium-rank-badge" style="background:#475569;color:#fff;">${rank}</span>`;
        let rowStyle = "background:#f8fafc;border:1.5px solid #e2e8f0;color:#1e293b;";
        if (rank === 1) {
          rankBadge = `<span class="podium-rank-badge" style="background:#facc15;color:#854d0e;">🥇</span>`;
          rowStyle = "background:#fefce8;border:2px solid #facc15;color:#854d0e;";
        } else if (rank === 2) {
          rankBadge = `<span class="podium-rank-badge" style="background:#cbd5e1;color:#1e293b;">🥈</span>`;
          rowStyle = "background:#f1f5f9;border:1.5px solid #cbd5e1;color:#1e293b;";
        } else if (rank === 3) {
          rankBadge = `<span class="podium-rank-badge" style="background:#fed7aa;color:#c2410c;">🥉</span>`;
          rowStyle = "background:#fff7ed;border:1.5px solid #fdba74;color:#9a3412;";
        }
        return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:10px;${rowStyle}">
            <div style="display:flex;align-items:center;gap:10px;">
              ${rankBadge}
              <div>
                <strong style="font-size:14px;">${escapeHtml(s.team?.name || 'فريق')}</strong>
                <div style="font-size:11px;opacity:0.8;">${escapeHtml(s.stageLabel || '')}</div>
              </div>
            </div>
            ${s.points ? `<span style="font-weight:900;font-size:13px;">${s.points} نقطة</span>` : ''}
          </div>
        `;
      }).join("")}
    </div>
  `;

  modal.classList.remove("hidden");
}

async function deletePastTournament(id) {
  const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name));
  if (!isSup) {
    showToast("عذراً، حذف المسابقات من الأرشيف متاح للمشرف العام فقط.", "fa-lock");
    return;
  }

  showConfirmDialog(
    "حذف مسابقة من الأرشيف",
    "هل أنت متأكد من حذف هذه المسابقة وسجل تتويجها نهائياً من الأرشيف السحابي؟",
    async () => {
      try {
        await deleteDoc(doc(db, "tournament_archives", id));
        pastTournamentsCache = pastTournamentsCache.filter(t => t.id !== id);
        localStorage.setItem("nour_past_tournaments", JSON.stringify(pastTournamentsCache));
        renderPastTournamentsTab();
        showToast("تم حذف المسابقة من الأرشيف بنجاح.", "fa-trash-can");
      } catch (err) {
        console.error("Error deleting past tournament:", err);
        showToast("تعذر حذف المسابقة من السحابة: " + (err.message || "خطأ غير متوقع"), "fa-triangle-exclamation");
      }
    },
    null,
    "نعم، حذف نهائي",
    "إلغاء"
  );
}

// مستمعي أزرار شاشة التتويج والأرشيف
document.getElementById("btnRestartTeamContest")?.addEventListener("click", async () => {
  if (!currentLiveRoom) return;
  const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name) || currentUser.name === currentLiveRoom.leaderName);
  if (!isSup) {
    showToast("عذراً، إعادة المسابقة متاحة للمشرف فقط.", "fa-lock");
    return;
  }

  showConfirmDialog(
    "إعادة البطولة من البداية",
    "هل تريد إعادة بدء بطولة الفرق من الدور الأول وتصفير النتائج؟",
    async () => {
      document.getElementById("teamGrandFinaleOverlay")?.classList.add("hidden");
      const originalTeams = currentLiveRoom.tournamentState?.teams || currentLiveRoom.teams || teamsCache;
      currentLiveRoom.tournamentState = initTournamentBracket(originalTeams);
      currentLiveRoom.teamScores = {};
      currentLiveRoom.teamPlayerScores = {};
      currentLiveRoom.currentTeamRound = 1;
      currentLiveRoom.currentQuestionIdx = 0;
      currentLiveRoom.teamMemberTurnPool = {};
      currentLiveRoom.lastPickedStudentByTeam = {};
      currentLiveRoom.teamRoundStarted = false;
      currentLiveRoom.teamActiveSolver = null;
      currentLiveRoom.phase = "team_stage";
      currentLiveRoom.teamSelectionState = "selecting";
      currentLiveRoom.teamA = null;
      currentLiveRoom.teamB = null;

      await saveRooms(currentLiveRoom);
      await handleReturnToTeamSelection();
      showToast("تمت إعادة البطولة من البداية بنجاح!", "fa-rotate-right");
    },
    null,
    "نعم، أعد البطولة",
    "إلغاء"
  );
});

document.getElementById("btnEndAndSaveTeamContest")?.addEventListener("click", () => {
  if (!currentLiveRoom) return;
  const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name) || currentUser.name === currentLiveRoom.leaderName);
  if (!isSup) {
    showToast("عذراً، حفظ وإنهاء المسابقة متاح للمشرف فقط.", "fa-lock");
    return;
  }

  showConfirmDialog(
    "إنهاء وحفظ المسابقة في الأرشيف",
    "هل تريد إنهاء المسابقة وتوثيق كافة نتائج البطولة وجدول ترتيب المراكز في قسم «مسابقات سابقة»؟",
    async () => {
      await saveCurrentTournamentToArchive();
    },
    null,
    "نعم، إنهاء وحفظ المسابقة",
    "تراجع"
  );
});

document.getElementById("btnChooseOtherTeams")?.addEventListener("click", async () => {
  document.getElementById("teamGrandFinaleOverlay")?.classList.add("hidden");
  await handleReturnToTeamSelection();
});

document.getElementById("btnCloseTeamContest")?.addEventListener("click", () => {
  document.getElementById("teamGrandFinaleOverlay")?.classList.add("hidden");
  showView(currentUser ? (currentUser.role === "student" ? "student" : "supervisor") : "hero");
});

document.getElementById("btnHeaderPastTournaments")?.addEventListener("click", () => {
  if (currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name))) {
    showView("supervisor");
    const tabPast = document.querySelector(".nav-tab[data-tab='tabPastTournaments']");
    if (tabPast) {
      tabPast.click();
      return;
    }
  }
  openPastTournamentsModal();
});

document.getElementById("btnRefreshPastTournaments")?.addEventListener("click", async () => {
  showGlobalLoader("جاري تحديث أرشيف المسابقات...", "يتم جلب أحدث البطولات المحفوظة من السحابة");
  await loadPastTournamentsFromCloud();
  renderPastTournamentsTab();
  hideGlobalLoader();
  showToast("تم تحديث أرشيف المسابقات السابقة بنجاح!", "fa-check");
});

document.getElementById("searchPastTournamentsInput")?.addEventListener("input", (e) => {
  renderPastTournamentsTab(e.target.value);
});
document.getElementById("modalSearchPastTournamentsInput")?.addEventListener("input", (e) => {
  renderPastTournamentsTab(e.target.value);
});

function syncTeamStageRealtime(room) {
  // مزامنة حالة مسرح الفرق اللحظية لجميع الأجهزة
  if (!room || !room.isTeamMatch) return;

  // إذا انتهت البطولة بالكامل وتوج البطل النهائي
  if (room.phase === "team_finale" || room.tournamentState?.isFinished) {
    document.getElementById("arenaTeamSelectionOverlay")?.classList.add("hidden");
    document.getElementById("teamRoundBannerOverlay")?.classList.add("hidden");
    document.getElementById("teamEntranceOverlay")?.classList.add("hidden");
    if (stageQuestionCard) stageQuestionCard.classList.add("hidden");
    showTeamGrandFinaleModal();
    return;
  }

  // إذا كانت الغرفة في وضع اختيار وتحديد فريقي المواجهة
  if (room.teamSelectionState === "selecting" || !room.teamA || !room.teamB) {
    renderArenaTeamPickerUI(room);
    return;
  }
  document.getElementById("arenaTeamSelectionOverlay")?.classList.add("hidden");

  ensureTeamQuestionsPopulated(room);
  showArenaPhase("stage");

  const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name) || currentUser.name === room.leaderName);

  // إظهار زر العودة لاختيار الفرق وزر الإعدادات للمشرف فقط
  const btnReturn = document.getElementById("btnReturnToTeamSelect");
  if (btnReturn) {
    btnReturn.classList.toggle("hidden", !(isSup && room.isTeamMatch));
  }
  const btnSettings = document.getElementById("btnOpenRoomSettingsModal");
  if (btnSettings) {
    btnSettings.classList.toggle("hidden", !isSup);
  }

  // إذا لم تبدأ الفقرة بعد (لافتة الفقرة معروضة): تأكد من إخفاء بطاقة السؤال خلفها تماماً
  if (!room.teamRoundStarted) {
    if (stageQuestionCard) stageQuestionCard.classList.add("hidden");
  } else {
    if (stageQuestionCard && (!document.getElementById("teamRoundBannerOverlay") || document.getElementById("teamRoundBannerOverlay").classList.contains("hidden"))) {
      stageQuestionCard.classList.remove("hidden");
    }
  }

  // مزامنة البطاقة السينمائية اللحظية (انتقال الدور / إجابة خاطئة) فور ورودها من السحابة لجميع الأجهزة
  if (room.lastCinematicAlert && room.lastCinematicAlert.timestamp && room.lastCinematicAlert.timestamp !== window.lastSeenCinematicAlertTimestamp) {
    window.lastSeenCinematicAlertTimestamp = room.lastCinematicAlert.timestamp;
    triggerCinematicTeamAlert(room.lastCinematicAlert);
  }

  // إخفاء أي شاشة تعريفية للفرق فوراً
  const overlay = document.getElementById("teamEntranceOverlay");
  if (overlay && !overlay.classList.contains("hidden")) {
    overlay.classList.add("hidden");
  }

  // تحديث نقاط الفريقين اللحظية في بطاقات النتائج الجانبية
  const teamA = room.teams?.[0];
  const teamB = room.teams?.[1];
  if (teamA && teamB && room.teamScores) {
    const elScoreA = document.getElementById("flyerTeamAScore");
    const elScoreB = document.getElementById("flyerTeamBScore");
    if (elScoreA) elScoreA.textContent = String(room.teamScores[teamA.id] || 0);
    if (elScoreB) elScoreB.textContent = String(room.teamScores[teamB.id] || 0);
  }

  // مزامنة حالة بدء الفقرة يدوياً بالضغط على زر التالي من المشرف
  if (room.teamRoundStarted && room.teamRoundStartedAt && room.teamRoundStartedAt !== window.lastHandledRoundStartTs) {
    window.lastHandledRoundStartTs = room.teamRoundStartedAt;
    const roundBannerOverlay = document.getElementById("teamRoundBannerOverlay");
    if (roundBannerOverlay && !roundBannerOverlay.classList.contains("hidden")) {
      roundBannerOverlay.classList.add("hidden");
    }
  }

  // إذا تغيرت الفقرة (Round) ولم تبدأ بعد
  if (room.currentTeamRound && room.currentTeamRound !== currentActiveTeamRound) {
    currentActiveTeamRound = room.currentTeamRound;
    if (!room.teamRoundStarted) {
      showTeamRoundBanner(room.currentTeamRound, () => {
        if (isSup) executeNextTeamQuestion(0);
      });
    }
  }

  // مزامنة فورية ومطابقة تامة لاختيار السؤال والمتسابق الذي يظهر عند المشرف ليعرض عند الجميع فوراً
  if (room.teamActiveSolver && room.teamActiveSolver.startedAt && room.teamActiveSolver.startedAt !== window.lastHandledTeamSolverStartedAt) {
    window.lastHandledTeamSolverStartedAt = room.teamActiveSolver.startedAt;
    currentActiveTeamRound = room.teamActiveSolver.roundNum || currentActiveTeamRound;
    const targetTeam = room.teams?.find(t => t.id === room.teamActiveSolver.teamId) || room.teams?.[0] || { name: room.teamActiveSolver.teamName, color: room.teamActiveSolver.teamColor || "blue" };
    const oppTeam = room.teams?.find(t => t.id !== targetTeam.id) || room.teams?.[1];

    const globalQIdx = (typeof room.teamActiveSolver.globalQIndex === "number")
      ? room.teamActiveSolver.globalQIndex
      : getTeamQuestionGlobalIndex(currentActiveTeamRound, room.teamActiveSolver.qIndex, room);

    currentActiveTeamSolver = {
      team: targetTeam,
      opponentTeam: oppTeam,
      studentName: room.teamActiveSolver.studentName,
      isRebound: room.teamActiveSolver.isRebound || false,
      qIndex: room.teamActiveSolver.qIndex,
      globalQIndex: globalQIdx
    };

    const questions = room.roundQuestions || [];
    const targetQuestion = questions[globalQIdx % questions.length];

    // إخفاء أي لافتة فقرة متبقية فور وصول بطاقة السؤال
    const roundBannerOverlay = document.getElementById("teamRoundBannerOverlay");
    if (roundBannerOverlay && !roundBannerOverlay.classList.contains("hidden")) {
      roundBannerOverlay.classList.add("hidden");
    }

    if (room.teamActiveSolver.isRebound) {
      // في حالة رد الفعل، لا حاجة لإعادة تدوير بطاقة السحب، يتم عرض لافتة رد الفعل والانتقال المباشر للسؤال
      renderTeamQuestion(targetQuestion, globalQIdx, room.teamActiveSolver.qIndex);
    } else {
      showTeamRollingStudentCard(targetTeam, room.teamActiveSolver.studentName, () => {
        renderTeamQuestion(targetQuestion, globalQIdx, room.teamActiveSolver.qIndex);
      });
    }
  }

  // مزامنة أحداث الإجابة للجميع في نظام الفرق (سواء أجاب الطالب أو المشرف)
  if (room.lastTeamAnswerEvent && room.lastTeamAnswerEvent.timestamp && room.lastTeamAnswerEvent.timestamp !== window.lastHandledTeamAnswerTs) {
    window.lastHandledTeamAnswerTs = room.lastTeamAnswerEvent.timestamp;
    const ev = room.lastTeamAnswerEvent;
    
    // إيقاف مؤقت السؤال عند وصول الإجابة لجميع الأجهزة
    clearInterval(liveTimerInterval);

    const questions = room.roundQuestions || [];
    const answerGlobalQIdx = (typeof ev.globalQIndex === "number")
      ? ev.globalQIndex
      : getTeamQuestionGlobalIndex(ev.roundNum || currentActiveTeamRound, ev.questionIdx, room);

    // إذا كانت الإجابة صادرة من جهاز آخر (مثلاً الطالب أجاب والمشرف يشاهد):
    if (!currentUser || ev.answeredBy !== currentUser.name) {
      if (ev.choiceIdx !== null && ev.choiceIdx !== undefined && stageInteractiveArea) {
        const choiceBtn = stageInteractiveArea.querySelector(`[data-choice="${ev.choiceIdx}"]`);
        if (choiceBtn) {
          choiceBtn.classList.add(ev.isCorrect ? "correct" : "wrong");
        }
        if (!ev.isCorrect && !ev.isRebound) {
          const curQ = questions[answerGlobalQIdx % questions.length];
          if (curQ && curQ.correct !== undefined) {
            const corBtn = stageInteractiveArea.querySelector(`[data-choice="${curQ.correct}"]`);
            if (corBtn) corBtn.classList.add("correct");
          }
        }
        stageInteractiveArea.querySelectorAll(".btn-choice-duo").forEach(b => {
          b.disabled = true;
          b.style.pointerEvents = "none";
        });
      }

      if (ev.isCorrect) {
        try { soundFX.correct(); } catch (e) {}
        showToast(`⭐ إجابة صحيحة من البطل ${escapeHtml(ev.studentName)} (+${ev.earnedPoints || 5} درجات لفريق ${escapeHtml(ev.teamName)})!`, "fa-circle-check", 2400);
      } else {
        try { soundFX.wrong(); } catch (e) {}
        if (ev.isRebound) {
          showToast(`⚡ إجابة غير دقيقة من ${escapeHtml(ev.studentName)} — فرصة رد الفعل!`, "fa-bolt", 2200);
        } else {
          showToast(`❌ إجابة غير دقيقة من ${escapeHtml(ev.studentName)}!`, "fa-circle-xmark", 2200);
        }
      }
    }

    // تحديث بطاقات درجات الفريقين
    updateTeamScoreFlyers(ev.winningTeamId, ev.earnedPoints || 5);

    // معالجة حالة رد الفعل (Rebound)
    if (ev.isRebound) {
      const reboundOverlay = document.getElementById("reboundBannerOverlay");
      const reboundText = document.getElementById("reboundBannerText");
      if (reboundText) {
        reboundText.textContent = `فرصة رد الفعل! السؤال ينتقل إلى ${ev.reboundTeamName} — البطل ${ev.reboundStudentName}!`;
      }
      reboundOverlay?.classList.remove("hidden");
      try { soundFX.pop(); } catch (e) {}

      setTimeout(() => {
        reboundOverlay?.classList.add("hidden");
        const curQ = questions[answerGlobalQIdx % questions.length];
        if (curQ) {
          renderTeamQuestion(curQ, answerGlobalQIdx, ev.questionIdx);
        }
      }, 2200);
    } else {
      // إجابة عادية منتهية: المشرف (أو قائد الغرفة) يقود الانتقال للسؤال التالي بعد عرض النتيجة
      const isLead = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name) || currentUser.name === room.leaderName);
      if (isLead && (!currentUser || ev.answeredBy !== currentUser.name)) {
        setTimeout(() => {
          executeNextTeamQuestion(ev.questionIdx + 1);
        }, 1800);
      }
    }
  }
}

// --------------------------------------------------------
// نقطة البداية (Initialization) مع الاستعادة الفورية للجلسة السابقة
// --------------------------------------------------------
async function initApp() {
  try {
    loadInitialStorage();
  } catch (err) {
    console.warn("Storage initial load notice:", err);
  }

  // 1. فحص مباشر وفوري لرابط الدخول المباشر (?auth=...) قبل أي استعادة للجلسة السابقة
  const directAuthToken = extractAuthTokenFromUrl();
  let directLoginSucceeded = false;

  if (directAuthToken) {
    showGlobalLoader("مسابقة نور البيان", "جاري التحقق من رابط الحساب وتسجيل الدخول المباشر...", 3000);
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
      setupPlatformThemedStickers();
    } catch (e) {
      console.warn(e);
    } finally {
      hideGlobalLoader();
    }
    return;
  }

  // 2. استعادة الجلسة السابقة ومطابقتها فورياً وبشكل متزامن قبل أي استدعاءات شبكية
  let restoredSession = false;
  let parsedUser = null;

  try {
    const savedUserJson = localStorage.getItem("active_quran_user") || localStorage.getItem("nour_saved_user");
    if (savedUserJson) {
      try {
        const parsed = JSON.parse(savedUserJson);
        if (parsed && typeof parsed === "object" && parsed.name && typeof parsed.name === "string" && parsed.name.trim()) {
          parsedUser = parsed;
        }
      } catch (parseErr) {
        console.warn("Session restore parse notice:", parseErr);
      }
    }

    // استعادة احتياطية من المفاتيح الفردية في حال عدم توفر أو تلف كائن JSON
    if (!parsedUser) {
      const fallbackName = localStorage.getItem("nour_user_name");
      const fallbackRole = localStorage.getItem("nour_user_role");
      const fallbackId = localStorage.getItem("nour_user_id");
      if (fallbackName && fallbackName.trim()) {
        const nameClean = fallbackName.trim();
        const matched = participantsCache.find(p => p.name === nameClean || p.id === fallbackId);
        if (matched) {
          parsedUser = { ...matched };
        } else {
          parsedUser = {
            id: fallbackId || getDocumentId(normalizeArabic(nameClean)),
            name: nameClean,
            role: fallbackRole || (isSupervisor(nameClean) ? "supervisor" : "student"),
            normalizedName: normalizeArabic(nameClean)
          };
        }
      }
    }

    if (parsedUser && parsedUser.name) {
      parsedUser.role = (parsedUser.role || (isSupervisor(parsedUser.name) ? "supervisor" : "student")).toLowerCase().trim();
      currentUser = parsedUser;
      restoredSession = true;

      // تفعيل جلسة المستخدم وإظهار واجهته الخاصة فوراً بدون أي تأخير وبدون إظهار واجهة البداية
      finalizeUserSession(currentUser, true);

      // إذا كان هناك تبويب محفوظ في لوحة المشرف/المعلم/العارض
      const savedTab = localStorage.getItem("nour_saved_tab");
      if (savedTab && currentUser.role !== "student") {
        try {
          const tabBtn = document.querySelector(`.nav-tab[data-tab='${savedTab}']`);
          if (tabBtn) {
            document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".tab-content-panel").forEach(p => p.classList.remove("active"));
            tabBtn.classList.add("active");
            document.getElementById(savedTab)?.classList.add("active");
          }
        } catch (tabErr) {
          console.warn("Tab restore notice:", tabErr);
        }
      }

      // إذا كانت هناك شاشة محفوظة صالحة وليست hero أو login
      const savedView = localStorage.getItem("nour_saved_view");
      if (savedView && views[savedView] && savedView !== "hero" && savedView !== "login") {
        showView(savedView);
      }
    }
  } catch (restoreErr) {
    console.error("Session restore exception:", restoreErr);
    restoredSession = false;
    currentUser = null;
    localStorage.removeItem("active_quran_user");
    localStorage.removeItem("nour_saved_user");
    localStorage.removeItem("nour_saved_view");
  }

  // 3. إذا لم تكن هناك جلسة سابقة أو فشلت الاستعادة، نظهر واجهة hero فوراً وبدون أي تعليق
  if (!restoredSession || !currentUser) {
    currentUser = null;
    showView("hero");
    hideGlobalLoader();
  } else {
    // إشعار خفيف غير معطل للشاشة بالمزامنة السحابية اللحظية
    showRealtimeSyncPill("جاري مزامنة أحدث البيانات من السحابة...");
  }

  // 4. المزامنة السحابية في الخلفية مع ضمان التحرر التام من أي حالة hidden
  try {
    setupRealtimeCloudListeners();
    await loadCloudData();

    // فحص رابط الدخول المباشر (?auth=...) إن وجد
    const urlParams = new URLSearchParams(window.location.search);
    const hasDirectAuth = urlParams.has("auth") || urlParams.has("token");
    if (hasDirectAuth) {
      const isDirectLoggedIn = await checkDirectUrlAuthentication();
      if (isDirectLoggedIn) {
        return;
      }
    }

    // بعد اكتمال جلب الغرف، إذا كان المستخدم متواجداً بغرفة نشطة مسبقاً، نعيده إليها تلقائياً
    const savedRoomId = localStorage.getItem("nour_saved_room_id");
    if (savedRoomId && currentUser) {
      const targetRoom = activeRooms.find(r => r.id === savedRoomId);
      if (targetRoom) {
        try {
          joinLiveRoom(targetRoom);
        } catch (rErr) {
          console.warn("Rejoin live room notice:", rErr);
        }
      }
    }

    // تحديث بيانات المستخدم الحالي من أحدث نسخة في السحابة بهدوء
    if (currentUser) {
      const liveUser = participantsCache.find(p => 
        p.id === currentUser.id || 
        p.normalizedName === currentUser.normalizedName || 
        p.name === currentUser.name
      );
      if (liveUser) {
        currentUser = { ...currentUser, ...liveUser };
        currentUser.role = (currentUser.role || (isSupervisor(currentUser.name) ? "supervisor" : "student")).toLowerCase().trim();
        localStorage.setItem("active_quran_user", JSON.stringify(currentUser));
        localStorage.setItem("nour_saved_user", JSON.stringify(currentUser));
        localStorage.setItem("nour_user_role", currentUser.role);
        localStorage.setItem("nour_user_name", currentUser.name);

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

    // استرجاع وتعبئة آخر اسم مستخدم فقط إذا كان المستخدم في شاشة الدخول والحقل فارغ تماماً ولم يلمسه
    if (!currentUser && views.login && views.login.classList.contains("active")) {
      const lastUsername = localStorage.getItem("nour_last_username");
      if (lastUsername && fullNameInput && !fullNameInput.value.trim() && document.activeElement !== fullNameInput) {
        fullNameInput.value = lastUsername;
        fullNameInput.dispatchEvent(new Event("input"));
      }
    }

    // حماية تامة ضد الشاشات المعلقة: تأكد من أن هناك شاشة واحدة على الأقل نشطة وغير مخفية
    const hasAnyActiveView = Object.keys(views).some(k => views[k] && views[k].classList.contains("active") && !views[k].classList.contains("hidden"));
    if (!hasAnyActiveView) {
      showView(currentUser ? (currentUser.role === "student" ? "student" : "supervisor") : "hero");
    }
  } catch (err) {
    console.warn("Init cloud load notice:", err);
  } finally {
    hideGlobalLoader();
    // صمام أمان نهائي: إخفاء أي شاشة تحميل عالقة
    const loader = document.getElementById("appGlobalLoader");
    if (loader) {
      loader.classList.remove("show");
      loader.classList.add("hidden");
    }
    const hasAnyActiveView = Object.keys(views).some(k => views[k] && views[k].classList.contains("active") && !views[k].classList.contains("hidden"));
    if (!hasAnyActiveView) {
      showView(currentUser ? (currentUser.role === "student" ? "student" : "supervisor") : "hero");
    }
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
