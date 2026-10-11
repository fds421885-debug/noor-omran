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
  onSnapshot
} from "./firebase-config.js";

import { soundFX } from "./audio-fx.js";
import { TACTICAL_CARDS } from "./cards-data.js";
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
let activeRooms = [];
let currentLiveRoom = null;
let liveTimerInterval = null;
let liveTimeRemaining = 30;
let roomTeachersRatings = {};
let activeCardEffect = null; // البطاقة التكتيكية المختارة من قِبَل المتسابق

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
  } else {
    userQuickStatus?.classList.add("hidden");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });

  // تحديث مباشر من السحابة عند التبديل بين الشاشات
  if (viewName !== "hero" && viewName !== "login") {
    loadCloudData();
  }
}

// تبديل تبويبات لوحة التحكم مع التحديث الفوري المباشر من Firestore
document.querySelectorAll(".nav-tab").forEach(tabBtn => {
  tabBtn.addEventListener("click", async () => {
    const targetTabId = tabBtn.getAttribute("data-tab");
    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content-panel").forEach(p => p.classList.remove("active"));
    tabBtn.classList.add("active");
    document.getElementById(targetTabId)?.classList.add("active");

    // تحديث فوري مباشر من السحابة فور الضغط على أي تبويب
    await loadCloudData();
  });
});

// --------------------------------------------------------
// تحميل وتهيئة البيانات المحلية والسحابية (خالية من أي بيانات وهمية)
// --------------------------------------------------------
function loadInitialStorage() {
  // إلغاء وحذف أي كاش محلي للاختبارات والغرف ولوحة الشرف نهائياً لضمان توحيد المنصة واعتماد السحابة
  localStorage.removeItem("nour_quizzes");
  localStorage.removeItem("nour_live_rooms");
  localStorage.removeItem("nour_honor_board");

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

  // الاختبارات: تبدأ فارغة لتعتمد كلياً على Firestore وتمنع إعادة الاختبارات المحذوفة
  quizzesCache = [];

  // الغرف الحية: تبدأ فارغة وتُقرأ مباشرة ولحظياً من Firestore
  activeRooms = [];

  // لوحة الشرف: تبدأ فارغة وتُقرأ مباشرة من Firestore
  honorLeaderboardCache = [];

  updateDropdowns();
}

// دالة تطهير الكائنات قبل إرسالها لـ Firestore لحذف أي undefined نهائياً ومنع أخطاء السحابة
function sanitizeForFirestore(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
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
  if (quizToSync && quizToSync.id) {
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
  try {
    const quizRef = doc(db, "quizzes", quizObj.id);
    if (isDelete) {
      await deleteDoc(quizRef);
    } else {
      const cleanQuiz = sanitizeForFirestore(quizObj);
      await setDoc(quizRef, {
        ...cleanQuiz,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    }
  } catch (e) {
    console.warn("Firestore quiz sync notice:", e);
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
          // تحديث شاشة اختيار المدارس أو الصفوف إذا كان هناك طالب جديد قيد التسجيل
          if (loginStepSchool && !loginStepSchool.classList.contains("hidden")) {
            showOnboardingSchoolStep();
          }
          if (loginStepGrade && !loginStepGrade.classList.contains("hidden")) {
            showOnboardingGradeStep();
          }
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

      // الحفاظ على جلسة المستخدم الحالي وتحديث بياناته دون أي خروج
      if (currentUser) {
        const matchingCurrent = cloudUsers.find(p => 
          p.id === currentUser.id || 
          p.normalizedName === currentUser.normalizedName || 
          p.name === currentUser.name
        );
        if (matchingCurrent) {
          currentUser = { ...currentUser, ...matchingCurrent };
          localStorage.setItem("active_quran_user", JSON.stringify(currentUser));
          localStorage.setItem("nour_saved_user", JSON.stringify(currentUser));
        }
      }

      renderAccountsTable();
      if (currentUser && (currentUser.role === "supervisor" || currentUser.role === "teacher" || currentUser.role === "presenter")) {
        renderSupervisorDashboard();
      }
    }, (err) => {
      console.warn("Realtime participants notice:", err);
    });

    // 3. مراقبة بنك الأسئلة والاختبارات لحظياً وبشكل فوري
    const quizCol = collection(db, "quizzes");
    onSnapshot(quizCol, (snapshot) => {
      const cloudQuizzes = [];
      snapshot.forEach(docSnap => {
        cloudQuizzes.push({ id: docSnap.id, ...docSnap.data() });
      });
      quizzesCache = cloudQuizzes;
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
      activeRooms = cloudRooms;
      renderLiveRoomsList();

      // إذا كان المستخدم الحالي متواجداً داخل غرفة مسابقة
      if (currentLiveRoom) {
        const updatedRoom = activeRooms.find(r => r.id === currentLiveRoom.id);
        if (!updatedRoom) {
          const wasInArena = views.liveArena && !views.liveArena.classList.contains("hidden");
          currentLiveRoom = null;
          currentContestant = null;
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
        }
      }
    }, (err) => {
      console.warn("Realtime honor board notice:", err);
    });

  } catch (e) {
    console.warn("Setup realtime cloud listeners notice:", e);
  }
}

// تحديث واجهة المسرح الحي عند وصول تحديث سحابي من Firestore
function updateArenaUIRealtime(room) {
  if (!room) return;
  if (arenaRoomTitle) arenaRoomTitle.textContent = room.name;
  if (arenaCurrentLeaderName) arenaCurrentLeaderName.textContent = room.leaderName || MASTER_SUPERVISOR_NAME;
  if (arenaConnectedUsersList && Array.isArray(room.users)) {
    arenaConnectedUsersList.innerHTML = room.users.map(u => `
      <div class="user-tag-lobby">
        <i class="fa-solid fa-circle-user" style="color: var(--duo-blue);"></i>
        <span>${u}</span>
        ${u === room.leaderName ? '<i class="fa-solid fa-crown" style="color: #ca8a04; margin-right: auto;" title="مشرف الغرفة"></i>' : ''}
      </div>
    `).join("");
  }

  // ── تغيير المرحلة بناءً على بيانات Firestore ──
  const isController = currentUser && (
    currentUser.role === "supervisor" || 
    isSupervisor(currentUser?.name) ||
    room.leaderName === currentUser?.name ||
    room.creatorName === currentUser?.name
  );
  const isInArena = views.liveArena && !views.liveArena.classList.contains("hidden");
  if (!isInArena) return;

  const phase = room.phase;
  if (!phase || phase === "lobby") return; // Lobby يُعرض عند الدخول

  // إذا كان المستخدم قائد الغرفة أو مشرفاً، لا نفرض عليه واجهة الانتظار — هو يتحكم بالمسابقة
  if (isController) return;

  // ── للمعلمين والعارض: التحرك مع المرحلة ──
  if (phase === "select") {
    showArenaPhase("select");
    supervisorStudentSelectView?.classList.add("hidden");
    teacherStudentWaitView?.classList.remove("hidden");
    selectedStudentReveal?.classList.add("hidden");
  } else if (phase === "draw") {
    // اختار المشرف الطالب — أظهر اسمه
    showArenaPhase("select");
    supervisorStudentSelectView?.classList.add("hidden");
    teacherStudentWaitView?.classList.remove("hidden");
    if (room.contestantName) {
      if (selectedStudentReveal) selectedStudentReveal.classList.remove("hidden");
      if (revealStudentName) revealStudentName.textContent = room.contestantName;
      if (revealStudentMeta) revealStudentMeta.textContent = `${room.contestantSchool || ''} | ${room.contestantGrade || ''}`;
    }
    // بعد ثانيتين ننتقل لصفحة سحب الأسئلة
    setTimeout(() => {
      if (!currentLiveRoom || currentLiveRoom.id !== room.id) return;
      currentLiveRoom.questionsPerStudent = room.questionsPerStudent;
      currentLiveRoom.drawnQuestions = room.drawnQuestions;
      currentLiveRoom.contestantId = room.contestantId;
      currentLiveRoom.contestantName = room.contestantName;
      currentLiveRoom.contestantSchool = room.contestantSchool;
      currentLiveRoom.contestantGrade = room.contestantGrade;
      enterPhaseQuestionDraw();
      // أخفِ أزرار السحب عن غير المشرف
      drawActionsRow?.classList.add("hidden");
      drawResultActions?.classList.add("hidden");
    }, 2000);
  } else if (phase === "competing") {
    currentLiveRoom.drawnQuestions = room.drawnQuestions;
    currentLiveRoom.contestantId = room.contestantId;
    currentLiveRoom.contestantName = room.contestantName;
    currentLiveRoom.contestantSchool = room.contestantSchool;
    currentLiveRoom.contestantGrade = room.contestantGrade;
    currentLiveRoom.currentQuestionIdx = room.currentQuestionIdx || 0;
    enterPhaseStage();
  } else if (phase === "select" && !room.contestantName) {
    // عودة لاختيار طالب جديد
    enterPhaseStudentSelect();
  }
}

// تحميل ومزامنة البيانات السحابية من فايربيس (اعتماد السحابة 100% كمصدر وحيد للحقيقة)
async function loadCloudData() {
  try {
    // جلب كافة المجموعات السحابية بالتوازي لمنع أي تأخير أو انسداد
    const [sgRes, quizRes, partRes, roomRes, honorRes] = await Promise.allSettled([
      getDoc(doc(db, "system_settings", "schools_and_grades")),
      getDocs(collection(db, "quizzes")),
      getDocs(collection(db, "participants")),
      getDocs(collection(db, "live_rooms")),
      getDoc(doc(db, "system_settings", "honor_board"))
    ]);

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
    } else if (sgRes.status === "fulfilled" && !sgRes.value.exists()) {
      // إنشاء التكوين الأولي للمدارس والصفوف في السحابة
      schoolsCache = [...DEFAULT_SCHOOLS];
      gradesCache = [...DEFAULT_GRADES];
      setDoc(doc(db, "system_settings", "schools_and_grades"), {
        schools: schoolsCache,
        grades: gradesCache,
        lastUpdated: serverTimestamp()
      }, { merge: true }).catch(() => {});
      localStorage.setItem("nour_schools", JSON.stringify(schoolsCache));
      localStorage.setItem("nour_grades", JSON.stringify(gradesCache));
    }

    // 2. الاختبارات (استيراد كل ما في السحابة فورياً)
    if (quizRes.status === "fulfilled") {
      const cloudQuizzes = [];
      quizRes.value.forEach(d => {
        cloudQuizzes.push({ id: d.id, ...d.data() });
      });

      // إذا كانت السحابة خالية تماماً من أي اختبار، نرفع النماذج المعتمدة لأول مرة فقط
      if (cloudQuizzes.length === 0) {
        for (const q of INITIAL_QUIZZES) {
          syncQuizToCloud(q).catch(() => {});
          cloudQuizzes.push(q);
        }
      }
      quizzesCache = cloudQuizzes;
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

      // مزامنة وتحديث بيانات الجلسة الحالية لضمان بقاء المستخدم متصلاً دون خروج
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
    }

    // 5. لوحة الشرف من السحابة مباشرة
    if (honorRes.status === "fulfilled" && honorRes.value.exists()) {
      const hData = honorRes.value.data();
      honorLeaderboardCache = Array.isArray(hData.entries) ? hData.entries : [];
    }

    // 6. تحديث كافة الواجهات بعد اكتمال قراءة كافة البيانات السحابية
    updateDropdowns();
    renderSchoolsAndGradesTags();
    renderAccountsTable();
    renderQuizzesList();
    renderStudentPracticeQuizzes();
    renderLiveRoomsList();
    renderHonorLeaderboard();

    if (currentUser && (currentUser.role === "supervisor" || currentUser.role === "teacher" || currentUser.role === "presenter")) {
      renderSupervisorDashboard();
    }
  } catch (err) {
    console.warn("Cloud load notice:", err);
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
// معالجة الدخول المباشر عبر الرابط (Direct URL Login Handler)
// --------------------------------------------------------
async function checkDirectUrlAuthentication() {
  const params = new URLSearchParams(window.location.search);
  const rawToken = params.get("auth") || params.get("token");
  if (!rawToken) return false;

  const directToken = decodeURIComponent(rawToken).trim();
  const tokenNorm = normalizeArabic(directToken);

  // 1. البحث في الكاش أولاً
  let user = participantsCache.find(u => 
    u.id === directToken || 
    u.id === rawToken || 
    (u.normalizedName && u.normalizedName === tokenNorm) || 
    u.name === directToken
  );

  // 2. إذا لم يوجد في الكاش، نجلبه مباشرة من Cloud Firestore
  if (!user) {
    try {
      let snap = await getDoc(doc(db, "participants", directToken));
      if (!snap.exists() && directToken !== rawToken) {
        snap = await getDoc(doc(db, "participants", rawToken));
      }
      
      if (snap && snap.exists()) {
        user = { id: snap.id, ...snap.data() };
      } else {
        const allSnap = await getDocs(collection(db, "participants"));
        allSnap.forEach(d => {
          const dData = d.data();
          if (d.id === directToken || d.id === rawToken || (dData.normalizedName && dData.normalizedName === tokenNorm) || dData.name === directToken) {
            user = { id: d.id, ...dData };
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
    // تسجيل الدخول المباشر للحساب فوراً
    user.lastLoginAt = new Date().toISOString();
    user.loginCount = (user.loginCount || 1) + 1;
    saveParticipants();
    syncParticipantToCloud(user);
    finalizeUserSession(user, true);
    showToast(`مرحباً بعودتك! تم الدخول المباشر لحساب: ${user.name}`, "fa-link");
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
    document.querySelector("[data-tab='tabLive']")?.click();

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
  const quickActionsBar = document.querySelector(".quick-actions-bar");

  // تبويب لوحة الشرف متاح دائماً ومرئي للجميع
  if (tabHonorBoardBtn) tabHonorBoardBtn.style.display = "inline-flex";

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
    const baseUrl = window.location.href.split('?')[0].split('#')[0];
    const directUrl = `${baseUrl}?auth=${encodeURIComponent(u.id)}`;
    return `
      <tr>
        <td><strong>${idx + 1}</strong></td>
        <td><strong>${u.name}</strong></td>
        <td>${roleLabels[u.role] || roleLabels.student}</td>
        <td>${u.school || "غير محدد"}</td>
        <td>${u.grade || "صف أول"}</td>
        <td><small style="color: #64748b;">${formatArabicDate(u.lastLoginAt)}</small></td>
        <td>
          <button class="btn-copy-direct-link" data-url="${directUrl}" title="نسخ رابط الدخول المباشر">
            <i class="fa-solid fa-link"></i> نسخ الرابط
          </button>
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

  // مستمعات الأحداث للأزرار داخل الجدول
  accountsTableBody.querySelectorAll(".btn-copy-direct-link").forEach(btn => {
    btn.addEventListener("click", () => {
      const url = btn.getAttribute("data-url");
      navigator.clipboard.writeText(url).then(() => {
        btn.classList.add("copied");
        btn.innerHTML = `<i class="fa-solid fa-check"></i> تم النسخ!`;
        showToast("تم نسخ رابط الدخول المباشر للحساب بنجاح!", "fa-link");
        setTimeout(() => {
          btn.classList.remove("copied");
          btn.innerHTML = `<i class="fa-solid fa-link"></i> نسخ الرابط`;
        }, 2500);
      }).catch(() => {
        showToast("تم تحديد الرابط، يرجى نسخه يدوياً", "fa-link");
      });
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
        showGlobalLoader("جاري حذف الحساب...", "يتم الحذف من قاعدة البيانات السحابية فوراً");
        try {
          await deleteDoc(doc(db, "participants", userId));
          participantsCache = participantsCache.filter(p => p.id !== userId);
          saveParticipants();
          renderAccountsTable();
          renderSupervisorDashboard();
          showToast(`تم حذف حساب (${targetUser.name}) بنجاح`, "fa-trash");
        } catch (err) {
          console.warn("Delete participant from cloud notice:", err);
          showToast("حدث خطأ أثناء حذف الحساب من السحابة", "fa-triangle-exclamation");
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

accountModalForm?.addEventListener("submit", (e) => {
  e.preventDefault();
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

  if (targetId) {
    // تعديل حساب موجود
    const user = participantsCache.find(p => p.id === targetId);
    if (user) {
      user.name = name;
      user.normalizedName = norm;
      user.role = role;
      user.school = school;
      user.grade = grade;
      syncParticipantToCloud(user);
    }
    showToast("تم تحديث بيانات الحساب بنجاح");
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
    syncParticipantToCloud(newUser);
    showToast("تم إنشاء الحساب بنجاح");
  }

  saveParticipants();
  accountModal.classList.add("hidden");
  renderAccountsTable();
  renderSupervisorDashboard();
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
const quizSectionsContainer = document.getElementById("quizSectionsContainer");
const btnAddSectionBtn = document.getElementById("btnAddSectionBtn");

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
        for (const q of INITIAL_QUIZZES) {
          await syncQuizToCloud(q);
        }
        await loadCloudData();
        showToast("تم استيراد وحفظ نماذج الاختبارات في السحابة بنجاح!", "fa-circle-check");
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
      const targetQuiz = quizzesCache.find(x => x.id === qId);
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
        showGlobalLoader("جاري حذف الاختبار...", "يتم الحذف من قاعدة البيانات السحابية لجميع المستخدمين");
        try {
          // حذف الاختبار مباشرة وقطعياً من قاعدة البيانات السحابية Firestore
          await deleteDoc(doc(db, "quizzes", qId));
          quizzesCache = quizzesCache.filter(x => x.id !== qId);
          localStorage.removeItem("nour_quizzes");
          renderQuizzesList();
          renderStudentPracticeQuizzes();
          updateDropdowns();
          if (statActiveQuizzes) statActiveQuizzes.textContent = quizzesCache.length;
          showToast(`تم حذف الاختبار (${title}) نهائياً من قاعدة البيانات السحابية لجميع المستخدمين`, "fa-trash");
        } catch (err) {
          console.error("Firestore quiz delete error:", err);
          showToast("حدث خطأ أثناء حذف الاختبار من السحابة", "fa-triangle-exclamation");
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
  if (quiz) {
    editQuizId.value = quiz.id;
    quizTitleInput.value = quiz.title;
    quizTargetGrade.value = quiz.targetGrade;
    quizAllowPracticeToggle.checked = !!quiz.allowPractice;
    renderSectionsInEditor(quiz.sections);
  } else {
    editQuizId.value = "";
    quizTitleInput.value = "";
    quizTargetGrade.value = gradesCache[0] || "صف أول";
    quizAllowPracticeToggle.checked = true;
    renderSectionsInEditor([
      {
        sectionName: "القسم 1: الحروف والتلاوة",
        questions: [
          { type: "oral", font: "quran", text: "اقرأ الكلمات الآتية بضبط الحركات:", points: 5 }
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
  const qType = q.type || "mcq";
  const qFont = q.font || "quran";
  const qPoints = q.points || 5;
  const qText = q.text || "";
  const options = Array.isArray(q.options) && q.options.length > 0 ? q.options : ["خيار 1", "خيار 2", "خيار 3", "خيار 4"];
  const correctIdx = q.correct !== undefined ? q.correct : 0;
  const pairs = Array.isArray(q.pairs) && q.pairs.length > 0 ? q.pairs : [["", ""]];
  const items = Array.isArray(q.items) && q.items.length > 0 ? q.items : ["كلمة 1", "كلمة 2"];
  const targetSentence = q.targetSentence || (items.length > 0 ? items.join(" ") : "");

  return `
    <div class="question-edit-card" data-sec-idx="${secIdx}" data-q-idx="${qIdx}">
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
              <input type="radio" name="correct_radio_${secIdx}_${qIdx}" class="mcq-radio-custom" value="${oIdx}" ${oIdx === correctIdx ? 'checked' : ''} title="تعيين كإجابة صحيحة">
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
              <input type="text" class="form-control ordering-item-input font-${qFont}" value="${escapeHtml(itm)}" placeholder="الكلمة / العنصر...">
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

function bindQuestionEditorEvents() {
  if (!quizSectionsContainer) return;

  // تغيير نوع السؤال
  quizSectionsContainer.querySelectorAll(".q-type-select").forEach(sel => {
    sel.addEventListener("change", (e) => {
      const card = e.target.closest(".question-edit-card");
      const val = e.target.value;
      const mcqBox = card.querySelector(".mcq-builder-box");
      const matchBox = card.querySelector(".matching-builder-box");
      const orderBox = card.querySelector(".ordering-builder-box");
      const oralBox = card.querySelector(".oral-builder-box");

      mcqBox?.classList.toggle("hidden", val !== "mcq");
      matchBox?.classList.toggle("hidden", val !== "matching");
      orderBox?.classList.toggle("hidden", val !== "ordering");
      oralBox?.classList.toggle("hidden", val !== "oral");
    });
  });

  // تغيير نوع الخط
  quizSectionsContainer.querySelectorAll(".q-font-select").forEach(sel => {
    sel.addEventListener("change", (e) => {
      const card = e.target.closest(".question-edit-card");
      const font = e.target.value;
      const ta = card.querySelector(".q-text-input");
      if (ta) ta.className = `form-control q-text-input font-${font}`;
      card.querySelectorAll(".mcq-opt-input, .match-left-input, .ordering-sentence-input, .ordering-item-input, .q-oral-target-input").forEach(inp => {
        inp.classList.remove("font-quran", "font-amiri", "font-normal");
        inp.classList.add(`font-${font}`);
      });
    });
  });

  // اختيار الراديو للخيارات الصحيحة في MCQ
  quizSectionsContainer.querySelectorAll(".mcq-options-list").forEach(list => {
    list.addEventListener("change", (e) => {
      if (e.target.classList.contains("mcq-radio-custom")) {
        list.querySelectorAll(".mcq-option-row").forEach(row => row.classList.remove("is-correct"));
        const parentRow = e.target.closest(".mcq-option-row");
        if (parentRow) parentRow.classList.add("is-correct");
      }
    });
  });

  // إضافة خيار إضافي MCQ
  quizSectionsContainer.querySelectorAll(".btn-add-mcq-opt").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".question-edit-card");
      const list = card.querySelector(".mcq-options-list");
      const secIdx = card.getAttribute("data-sec-idx");
      const qIdx = card.getAttribute("data-q-idx");
      const font = card.querySelector(".q-font-select")?.value || "quran";
      const count = list.querySelectorAll(".mcq-option-row").length;

      const newRow = document.createElement("div");
      newRow.className = "mcq-option-row";
      newRow.innerHTML = `
        <input type="radio" name="correct_radio_${secIdx}_${qIdx}" class="mcq-radio-custom" value="${count}" title="تعيين كإجابة صحيحة">
        <span style="font-size: 13px; font-weight: 800; color: #64748b; min-width: 45px;">خيار ${count + 1}</span>
        <input type="text" class="mcq-opt-input font-${font}" value="" placeholder="اكتب نص الخيار هنا...">
        <button type="button" class="btn-icon-action delete btn-remove-mcq-opt" title="حذف هذا الخيار">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;
      list.appendChild(newRow);
      newRow.querySelector(".btn-remove-mcq-opt").addEventListener("click", () => {
        if (list.querySelectorAll(".mcq-option-row").length > 2) {
          newRow.remove();
        } else {
          showToast("يجب أن يحتوي السؤال على خيارين على الأقل", "fa-circle-info");
        }
      });
    });
  });

  // حذف خيار MCQ
  quizSectionsContainer.querySelectorAll(".btn-remove-mcq-opt").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest(".mcq-option-row");
      const list = e.target.closest(".mcq-options-list");
      if (list.querySelectorAll(".mcq-option-row").length > 2) {
        row.remove();
      } else {
        showToast("يجب أن يحتوي السؤال على خيارين على الأقل", "fa-circle-info");
      }
    });
  });

  // إضافة زوج توصيل جديد
  quizSectionsContainer.querySelectorAll(".btn-add-match-pair").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".question-edit-card");
      const list = card.querySelector(".matching-pairs-list");
      const font = card.querySelector(".q-font-select")?.value || "quran";

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
      list.appendChild(newRow);
      newRow.querySelector(".btn-remove-match-pair").addEventListener("click", () => newRow.remove());
    });
  });

  // حذف زوج توصيل
  quizSectionsContainer.querySelectorAll(".btn-remove-match-pair").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.target.closest(".matching-pair-row")?.remove();
    });
  });

  // تفريق الجملة تلقائياً للترتيب
  quizSectionsContainer.querySelectorAll(".btn-split-sentence").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".question-edit-card");
      const sentInput = card.querySelector(".ordering-sentence-input");
      const list = card.querySelector(".ordering-items-list");
      const font = card.querySelector(".q-font-select")?.value || "quran";
      const text = sentInput ? sentInput.value.trim() : "";
      if (!text) {
        showToast("يرجى كتابة الجملة المطلوب ترتيبها أولاً!", "fa-circle-info");
        return;
      }
      const words = text.split(/\s+/).filter(Boolean);
      list.innerHTML = words.map((w, idx) => `
        <div class="ordering-item-row">
          <span class="ordering-num-badge">${idx + 1}</span>
          <input type="text" class="form-control ordering-item-input font-${font}" value="${escapeHtml(w)}" placeholder="الكلمة / العنصر...">
          <button type="button" class="btn-icon-action delete btn-remove-order-item" title="حذف هذا العنصر">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `).join("");

      list.querySelectorAll(".btn-remove-order-item").forEach(b => {
        b.addEventListener("click", (ev) => {
          ev.target.closest(".ordering-item-row")?.remove();
          updateOrderingBadges(list);
        });
      });
      showToast(`تم تفريق الجملة إلى ${words.length} كلمات بنجاح!`, "fa-wand-magic-sparkles");
    });
  });

  // إضافة عنصر للترتيب
  quizSectionsContainer.querySelectorAll(".btn-add-order-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".question-edit-card");
      const list = card.querySelector(".ordering-items-list");
      const font = card.querySelector(".q-font-select")?.value || "quran";
      const count = list.querySelectorAll(".ordering-item-row").length;

      const newRow = document.createElement("div");
      newRow.className = "ordering-item-row";
      newRow.innerHTML = `
        <span class="ordering-num-badge">${count + 1}</span>
        <input type="text" class="form-control ordering-item-input font-${font}" value="" placeholder="الكلمة / العنصر...">
        <button type="button" class="btn-icon-action delete btn-remove-order-item" title="حذف هذا العنصر">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;
      list.appendChild(newRow);
      newRow.querySelector(".btn-remove-order-item").addEventListener("click", () => {
        newRow.remove();
        updateOrderingBadges(list);
      });
    });
  });

  // حذف عنصر ترتيب
  quizSectionsContainer.querySelectorAll(".btn-remove-order-item").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const list = e.target.closest(".ordering-items-list");
      e.target.closest(".ordering-item-row")?.remove();
      if (list) updateOrderingBadges(list);
    });
  });

  // إضافة سؤال جديد للقسم
  quizSectionsContainer.querySelectorAll(".btn-add-q-to-sec").forEach(b => {
    b.addEventListener("click", () => {
      const secBox = b.closest(".section-item-box");
      const list = secBox.querySelector(".questions-list-sec");
      const secIdx = secBox.getAttribute("data-section-idx");
      const qIdx = list.querySelectorAll(".question-edit-card").length;

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
      list.appendChild(newCard);
      bindQuestionEditorEvents();
      newCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });

  // حذف قسم
  quizSectionsContainer.querySelectorAll(".btn-remove-sec").forEach(b => {
    b.addEventListener("click", () => {
      const secBox = b.closest(".section-item-box");
      if (quizSectionsContainer.querySelectorAll(".section-item-box").length > 1) {
        secBox.remove();
      } else {
        showToast("يجب أن يحتوي الاختبار على قسم واحد على الأقل", "fa-triangle-exclamation");
      }
    });
  });

  // حذف سؤال
  quizSectionsContainer.querySelectorAll(".btn-remove-q").forEach(b => {
    b.addEventListener("click", (e) => {
      const card = e.target.closest(".question-edit-card");
      card?.remove();
    });
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
  const title = quizTitleInput.value.trim();
  const targetGrade = quizTargetGrade.value;
  const allowPractice = quizAllowPracticeToggle.checked;
  const sections = extractSectionsFromEditor();
  const qId = editQuizId.value || ("quiz_" + Date.now());

  if (sections.length === 0 || sections[0].questions.length === 0) {
    showToast("يرجى إضافة سؤال واحد على الأقل للاختبار.", "fa-triangle-exclamation");
    return;
  }

  const existingIdx = quizzesCache.findIndex(q => q.id === qId);
  const quizObj = { id: qId, title, targetGrade, allowPractice, sections };

  if (existingIdx >= 0) {
    quizzesCache[existingIdx] = quizObj;
    showToast("تم تحديث الاختبار بنجاح");
  } else {
    quizzesCache.unshift(quizObj);
    showToast("تم إنشاء الاختبار بنجاح");
  }

  await saveQuizzes(quizObj);
  quizEditorModal.classList.add("hidden");
  renderQuizzesList();
  updateDropdowns();
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
  const roomName = newRoomNameInput.value.trim() || `مسابقة نور البيان الكبرى - ${new Date().toLocaleDateString('ar-EG')}`;
  const quizId = roomQuizSelect.value || (quizzesCache[0]?.id || "quiz_default_1");
  const cardsEnabled = roomTacticalCardsToggle ? roomTacticalCardsToggle.checked : true;
  const roomId = "ROOM-" + Math.floor(1000 + Math.random() * 9000);

  const perStudentInput = document.getElementById("questionsPerStudentInput");
  const questionsPerStudent = perStudentInput && perStudentInput.value
    ? parseInt(perStudentInput.value) : null;

  const timerInput = document.getElementById("questionTimerInput");
  const questionTimer = timerInput && timerInput.value
    ? Math.max(5, parseInt(timerInput.value)) : 30;

  const creatorName = currentUser ? currentUser.name : MASTER_SUPERVISOR_NAME;
  const creatorRole = currentUser ? currentUser.role : "supervisor";

  const newRoom = {
    id: roomId,
    name: roomName,
    quizId: quizId,
    tacticalCardsEnabled: cardsEnabled,
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

  activeRooms = activeRooms.filter(r => r.id !== newRoom.id);
  activeRooms.unshift(newRoom);
  await saveRooms(newRoom); // حفظ ومزامنة فورية مع Firestore
  renderLiveRoomsList();
  createRoomModal?.classList.add("hidden");
  joinLiveRoom(newRoom);
  showToast("تم فتح غرفة المسابقة بنجاح ومزامنتها سحابياً!", "fa-tv");
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
    if (count > 0) {
      studentLiveRoomsSection.classList.remove("hidden");
      studentLiveRoomsList.innerHTML = activeRooms.map(r => `
        <div class="overview-room-pill" style="border-color: #fde047;">
          <div class="overview-room-pill-meta">
            <span class="room-pulse-dot"></span>
            <span class="overview-room-pill-title">${r.name}</span>
            <span class="overview-room-pill-creator"><i class="fa-solid fa-crown" style="color: #ca8a04;"></i> المشرف: ${r.leaderName}</span>
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
      studentLiveRoomsSection.classList.add("hidden");
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

function joinLiveRoom(room) {
  currentLiveRoom = room;

  // قانون قيادة الغرفة: أول معلم ينضم يكون مشرفاً، وتنتقل القيادة فوراً للمشرف العام محمد منتصر محمد يونس عند دخوله
  if (currentUser) {
    let changed = false;
    if (!Array.isArray(room.users)) {
      room.users = [];
    }
    if (!room.users.includes(currentUser.name)) {
      room.users.push(currentUser.name);
      changed = true;
    }

    if (isSupervisor(currentUser.name) && room.leaderName !== currentUser.name) {
      room.leaderName = currentUser.name;
      changed = true;
    } else if (!room.leaderName) {
      room.leaderName = currentUser.name;
      changed = true;
    }
    if (changed) {
      saveRooms(room); // حفظ ومزامنة الغرفة سحابياً عند حدوث تعديل فقط
    }
  }

  arenaRoomTitle.textContent = room.name;
  arenaRoomCode.textContent = `#${room.id}`;
  arenaCurrentLeaderName.textContent = room.leaderName || MASTER_SUPERVISOR_NAME;

  if (arenaUserRolePill) {
    const isLead = currentUser && (currentUser.name === room.leaderName || isSupervisor(currentUser.name));
    arenaUserRolePill.textContent = isLead ? "مشرف الغرفة المعتمد" : (currentUser?.role === 'presenter' ? "العارض" : "لجنة المعلمين");
  }

  // ملء قائمة المتواجدين في اللوبي
  if (arenaConnectedUsersList) {
    arenaConnectedUsersList.innerHTML = room.users.map(u => `
      <div class="user-tag-lobby">
        <i class="fa-solid fa-circle-user" style="color: var(--duo-blue);"></i>
        <span>${u}</span>
        ${u === room.leaderName ? '<i class="fa-solid fa-crown" style="color: #ca8a04; margin-right: auto;" title="مشرف الغرفة"></i>' : ''}
      </div>
    `).join("");
  }

  arenaLobby.classList.remove("hidden");
  arenaStage.classList.add("hidden");

  showView("liveArena");
}

// --------------------------------------------------------
// مودال إدارة مغادرة قائد الغرفة (تسليم الإشراف أو إنهاء المسابقة)
// --------------------------------------------------------
const leaderExitModal = document.getElementById("leaderExitModal");
const selectNewLeaderCandidate = document.getElementById("selectNewLeaderCandidate");
const btnHandoverAndExit = document.getElementById("btnHandoverAndExit");
const btnTerminateContestForAll = document.getElementById("btnTerminateContestForAll");

btnExitArena?.addEventListener("click", async () => {
  if (!currentLiveRoom) {
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
        clearInterval(liveTimerInterval);
        clearInterval(cardsTimerInterval);
        stopOfflineCountdown();
        const keptRoomId = currentLiveRoom.id;
        currentLiveRoom = null;
        currentContestant = null;
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
        currentLiveRoom.users = currentLiveRoom.users.filter(u => u !== currentUser.name);
        await saveRooms(currentLiveRoom);
      }
      clearInterval(liveTimerInterval);
      clearInterval(cardsTimerInterval);
      stopOfflineCountdown();
      currentLiveRoom = null;
      currentContestant = null;
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
    currentLiveRoom.users = currentLiveRoom.users.filter(u => u !== currentUser.name);
  }

  await saveRooms(currentLiveRoom);

  leaderExitModal?.classList.add("hidden");
  clearInterval(liveTimerInterval);
  clearInterval(cardsTimerInterval);
  stopOfflineCountdown();
  currentLiveRoom = null;
  currentContestant = null;

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
  activeRooms = activeRooms.filter(r => r.id !== roomId);
  localStorage.removeItem("nour_live_rooms");
  // حذف الغرفة من Firestore نهائياً وبشكل قطعي للجميع
  try {
    await deleteDoc(doc(db, "live_rooms", roomId));
  } catch (err) {
    console.error("Firestore delete room error:", err);
  }

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
  const quiz = quizzesCache.find(q => q.id === currentLiveRoom.quizId);
  currentQuizData = quiz || quizzesCache[0];

  if (drawPhaseStudentLabel)
    drawPhaseStudentLabel.textContent = `المتسابق: ${currentLiveRoom.contestantName || '--'}`;

  if (!currentQuizData) return;

  const secList = Array.isArray(currentQuizData.sections) ? currentQuizData.sections : [];
  const totalInQuiz = secList.reduce((a, s) => a + (Array.isArray(s?.questions) ? s.questions.length : 0), 0);
  const perStudent = currentLiveRoom.questionsPerStudent || (totalInQuiz || 5);

  // بناء عرض الأقسام
  drawSectionsList.innerHTML = secList.map((sec, idx) => {
    const secTotal = Array.isArray(sec.questions) ? sec.questions.length : 0;
    const portion = Math.max(1, Math.round((secTotal / (totalInQuiz || 1)) * perStudent));
    return `
      <div class="draw-section-row" id="drawSecRow_${idx}">
        <div>
          <div class="draw-section-name">${sec.sectionName}</div>
          <div style="font-size:12px;color:#94a3b8;">${secTotal} سؤال متاح</div>
        </div>
        <div class="draw-counter-group">
          <span class="draw-counter-badge" id="drawBadge_${idx}">0 / ${portion}</span>
          <i class="fa-solid fa-circle-check draw-done-badge" id="drawDone_${idx}"></i>
        </div>
      </div>`;
  }).join("");

  drawActionsRow?.classList.remove("hidden");
  drawResultActions?.classList.add("hidden");

  // المشرف أو قائد الغرفة يرى زر السحب
  const canControl = currentUser && (
    currentUser.role === "supervisor" || 
    isSupervisor(currentUser.name) ||
    (currentLiveRoom && (
      currentLiveRoom.leaderName === currentUser.name || 
      currentLiveRoom.creatorName === currentUser.name || 
      (Array.isArray(currentLiveRoom.users) && currentLiveRoom.users[0] === currentUser.name)
    ))
  );
  if (!canControl) {
    drawActionsRow?.classList.add("hidden");
  } else {
    drawActionsRow?.classList.remove("hidden");
  }
}

// السحب العشوائي للأسئلة مع انيميشن
document.getElementById("btnDrawQuestions")?.addEventListener("click", () => runQuestionDraw(false));
document.getElementById("btnRedrawQuestions")?.addEventListener("click", () => runQuestionDraw(false));

function runQuestionDraw(silent = false) {
  if (!currentQuizData) return;
  const totalInQuiz = currentQuizData.sections.reduce((a, s) => a + (s.questions?.length || 0), 0);
  const perStudent = currentLiveRoom.questionsPerStudent || totalInQuiz;
  const drawnQuestions = [];

  // Reset UI
  currentQuizData.sections.forEach((_, idx) => {
    document.getElementById(`drawSecRow_${idx}`)?.classList.remove("drawn");
    const badge = document.getElementById(`drawBadge_${idx}`);
    if (badge) { badge.textContent = `0 / ?`; badge.className = "draw-counter-badge"; }
    document.getElementById(`drawDone_${idx}`)?.style.setProperty("opacity", "0");
  });
  drawActionsRow?.classList.remove("hidden");
  drawResultActions?.classList.add("hidden");

  let sectionIdx = 0;
  function drawNextSection() {
    if (sectionIdx >= currentQuizData.sections.length) {
      // اكتمل السحب
      currentLiveRoom.drawnQuestions = drawnQuestions;
      saveRooms(currentLiveRoom);
      drawActionsRow?.classList.add("hidden");
      drawResultActions?.classList.remove("hidden");
      if (!silent) showToast(`تم سحب ${drawnQuestions.length} سؤال للمتسابق 🎲`, "fa-dice");
      return;
    }

    const sec = currentQuizData.sections[sectionIdx];
    const secTotal = sec.questions?.length || 0;
    const portion = Math.max(1, Math.round((secTotal / totalInQuiz) * perStudent));
    const shuffled = [...(sec.questions || [])].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, Math.min(portion, secTotal));
    picked.forEach(q => drawnQuestions.push({ ...q, sectionName: sec.sectionName }));

    const badge = document.getElementById(`drawBadge_${sectionIdx}`);
    const row = document.getElementById(`drawSecRow_${sectionIdx}`);
    if (badge) badge.className = "draw-counter-badge active";

    let tick = 0;
    const tickInterval = setInterval(() => {
      tick++;
      if (badge) badge.textContent = `${Math.min(tick, picked.length)} / ${portion}`;
      if (tick >= picked.length) {
        clearInterval(tickInterval);
        if (badge) { badge.textContent = `${picked.length} / ${portion}`; badge.className = "draw-counter-badge done"; }
        row?.classList.add("drawn");
        sectionIdx++;
        setTimeout(drawNextSection, 400);
      }
    }, 180);
  }
  drawNextSection();
}

// بدء المسابقة بعد السحب
document.getElementById("btnStartAfterDraw")?.addEventListener("click", async () => {
  if (!currentLiveRoom.drawnQuestions || currentLiveRoom.drawnQuestions.length === 0) {
    showToast("يرجى سحب الأسئلة أولاً", "fa-triangle-exclamation");
    return;
  }
  currentLiveRoom.phase = "competing";
  currentLiveRoom.currentQuestionIdx = 0;
  await saveRooms(currentLiveRoom);
  enterPhaseStage();
});

// =========================================================
// المرحلة ج: مسرح المسابقة (مع تسجيل تلقائي للإجابات)
// =========================================================
function enterPhaseStage() {
  showArenaPhase("stage");
  const room = currentLiveRoom;
  currentContestant = participantsCache.find(p => p.id === room.contestantId) || { name: room.contestantName, school: room.contestantSchool, grade: room.contestantGrade };
  currentQuizData = { sections: [{ sectionName: "أسئلة المسابقة", questions: room.drawnQuestions || [] }] };
  currentQuestionIndex = room.currentQuestionIdx || 0;
  // استعادة النقاط من بيانات الغرفة السحابية (لمنع فقدان النقاط عند التحديث أو إعادة الدخول)
  contestantScore = room.contestantScore || 0;

  if (stageStudentName) stageStudentName.textContent = currentContestant.name;
  if (stageStudentSchool) stageStudentSchool.innerHTML = `<i class="fa-solid fa-school"></i> ${currentContestant.school || '--'}`;
  if (stageStudentGrade) stageStudentGrade.innerHTML = `<i class="fa-solid fa-layer-group"></i> ${currentContestant.grade || '--'}`;
  if (stageStudentScore) stageStudentScore.textContent = String(contestantScore);

  loadStageQuestion(currentQuestionIndex);
}

// =========================================================
// تشغيل مسرح المسابقة الحي (Active Contest Controls)
// =========================================================
let currentContestant = null;
let currentQuizData = null;
let currentQuestionIndex = 0;
let contestantScore = 0;

function initLiveStage() {
  if (!currentLiveRoom) return;
  // الآن initLiveStage تُستدعى فقط إذا كانت phase=competing مسبقاً (عند إعادة الدخول)
  enterPhaseStage();
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
    finishContestant();
    return;
  }

  // انتهت أسئلة هذا الطالب → إنهاء واختيار طالب جديد
  if (idx >= allQuestions.length) {
    finishContestant();
    return;
  }

  currentQuestionIndex = idx;
  const q = allQuestions[idx];
  stageQuestionNumber.textContent = `السؤال ${idx + 1} من ${allQuestions.length}`;
  stageSectionName.textContent = q.sectionName;
  stageQuestionText.className = `question-text-content font-${q.font || 'quran'}`;
  stageQuestionText.textContent = q.text;

  // تأثير حركة ظهور السؤال (Animation)
  const questionCardEl = document.querySelector(".stage-question-card");
  if (questionCardEl) {
    questionCardEl.classList.remove("question-enter-anim");
    void questionCardEl.offsetWidth; // إعادة تشغيل الأنيميشن
    questionCardEl.classList.add("question-enter-anim");
  }

  // الانتقال للسؤال التالي مع عرض لوحة الشرف أولاً وتكبير بطاقة الطالب وإبراز نقاطه
  function advanceToNext(scoreDelta = 0, isPenalty = false) {
    clearInterval(liveTimerInterval);
    addContestantScore(scoreDelta);

    const nextIdx = idx + 1;
    const isFinished = nextIdx >= allQuestions.length;

    // عرض لوحة الشرف بعد كل سؤال مباشرة مع إبراز الزيادة للمتسابق الحالي
    showHonorBoardModal(false, () => {
      // بعد اختفاء لوحة الشرف: فحص بطاقات تكتيكية أو الانتقال للسؤال التالي / إنهاء
      if (isFinished) {
        finishContestant();
      } else {
        // البطاقات تظهر كل ربع الأسئلة (مثال: لو 20 سؤال تظهر عند 5 و10 و15، ولا تظهر عند آخر سؤال 20)
        const quarterStep = Math.max(2, Math.round(allQuestions.length / 4));
        const isCardTurn = currentLiveRoom?.tacticalCardsEnabled && 
          ((idx + 1) % quarterStep === 0) && 
          (nextIdx < allQuestions.length);

        if (isCardTurn) {
          triggerTacticalCardsModal(() => loadStageQuestion(nextIdx));
        } else {
          loadStageQuestion(nextIdx);
        }
      }
    }, currentContestant?.name, scoreDelta, isPenalty);

    // مزامنة رقم السؤال الحالي والنقاط سحابياً
    if (currentLiveRoom) {
      currentLiveRoom.currentQuestionIdx = nextIdx;
      currentLiveRoom.contestantScore = contestantScore;
      saveRooms(currentLiveRoom);
    }
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
    }

    if (activeCardEffect.effect) {
      const eff = activeCardEffect.effect;
      if (eff.pointsBonus) cardBonusPoints = eff.pointsBonus;
      if (eff.immunity) hasImmunity = true;
      if (eff.doublePoints) doublePointsActive = true;
      if (eff.eliminateOptions) eliminateActive = eff.eliminateOptions;
      if (eff.penaltyOnWrong) penaltyOnWrong = eff.penaltyOnWrong;
      if (eff.speedBonusUnder5s) speedBonusExtra = eff.speedBonusUnder5s;
    }
  }

  // ── MCQ: قفل بعد الضغط + انتقال تلقائي ──
  if (q.type === "mcq" && q.options) {
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
      <div class="mcq-options-grid">
        ${optionsToRender.map(optObj => optObj.hidden ? `
          <button class="btn-choice-duo font-${q.font || 'quran'}" style="opacity:0.25;text-decoration:line-through;pointer-events:none;" disabled>
            <i class="fa-solid fa-ban" style="color:#ef4444;margin-left:6px;"></i> ${optObj.text}
          </button>
        ` : `
          <button class="btn-choice-duo font-${q.font || 'quran'}" data-choice="${optObj.idx}">${optObj.text}</button>
        `).join("")}
      </div>`;

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
          advanceToNext(earnedPoints, false);
        } else {
          btn.classList.add("wrong");
          const correctBtn = stageInteractiveArea.querySelector(`[data-choice="${q.correct}"]`);
          if (correctBtn) correctBtn.classList.add("correct");

          if (hasImmunity) {
            showToast("🛡️ درع الأمان: تم إحباط أي خصم للدرجات!", "fa-shield-halved");
            activeCardEffect = null;
            advanceToNext(0, false);
          } else if (penaltyOnWrong > 0) {
            showToast(`❌ إجابة خاطئة — المخاطرة الكبرى: خصم ${penaltyOnWrong} درجات!`, "fa-fire-flame-curved", 3000);
            activeCardEffect = null;
            advanceToNext(-penaltyOnWrong, true);
          } else {
            showToast("❌ إجابة خاطئة", "fa-xmark");
            activeCardEffect = null;
            advanceToNext(0, false);
          }
        }
      }, { once: true });
    });

  // ── Matching: عرض + زر "تم الإجابة" بتقييم المشرف ──
  } else if (q.type === "matching" && q.pairs && q.pairs.length > 0) {
    const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name));
    stageInteractiveArea.innerHTML = `
      ${cardBannerHtml}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:15px;">
        <div style="display:flex;flex-direction:column;gap:10px;">
          <span style="font-weight:800;color:#475569;font-size:13px;">الطرف أ:</span>
          ${q.pairs.map(p => `
            <div class="font-${q.font || 'quran'}" style="background:#fff;border:2.5px solid var(--border-duo);border-bottom:5px solid var(--border-duo-dark);border-radius:var(--radius-md);padding:12px;font-weight:800;text-align:center;font-size:17px;">${p[0]}</div>
          `).join("")}
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <span style="font-weight:800;color:#475569;font-size:13px;">الطرف ب:</span>
          ${[...q.pairs].sort(() => 0.5 - Math.random()).map(p => `
            <div style="background:#f0fdf4;border:2.5px solid #86efac;border-bottom:5px solid #4ade80;border-radius:var(--radius-md);padding:12px;font-weight:800;text-align:center;color:#166534;font-size:17px;">${p[1]}</div>
          `).join("")}
        </div>
      </div>
      ${isSup ? `
        <div style="margin-top:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <label style="font-weight:700;font-size:13.5px;color:#475569;">درجة التوصيل:</label>
          <input type="number" id="matchingScoreInput" value="${q.points||5}" min="0" max="${(q.points||5)*2}" class="form-control" style="width:80px;">
          <button id="btnMatchingAccept" class="btn-duo-green btn-sm"><i class="fa-solid fa-check"></i> قبول والانتقال</button>
        </div>
      ` : `<p style="margin-top:12px;text-align:center;color:#64748b;font-weight:700;font-size:13px;"><i class="fa-solid fa-clock"></i> بانتظار تقييم المشرف...</p>`}`;

    document.getElementById("btnMatchingAccept")?.addEventListener("click", () => {
      let sc = parseInt(document.getElementById("matchingScoreInput")?.value || "0");
      if (doublePointsActive) sc *= 2;
      sc += cardBonusPoints;
      const btn = document.getElementById("btnMatchingAccept");
      if (btn) btn.disabled = true;
      showToast(`✅ تم تسجيل درجة التوصيل: ${sc}`, "fa-check");
      activeCardEffect = null;
      advanceToNext(sc, false);
    }, { once: true });

  // ── Ordering: عرض + زر قبول ──
  } else if (q.type === "ordering" && q.items && q.items.length > 0) {
    const isSup = currentUser && (currentUser.role === "supervisor" || isSupervisor(currentUser.name));
    const shuffled = [...q.items].sort(() => 0.5 - Math.random());
    stageInteractiveArea.innerHTML = `
      ${cardBannerHtml}
      <div style="margin-top:15px;text-align:center;">
        <p style="font-size:14px;color:#64748b;font-weight:700;margin-bottom:12px;">رتّب الكلمات أو العناصر التالية بالترتيب الصحيح:</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
          ${shuffled.map(itm => `<span class="btn-choice-duo font-${q.font||'quran'}" style="padding:12px 20px;font-size:18px;">${itm}</span>`).join("")}
        </div>
        ${isSup ? `
          <div style="margin-top:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;">
            <label style="font-weight:700;font-size:13.5px;color:#475569;">درجة الترتيب:</label>
            <input type="number" id="orderingScoreInput" value="${q.points||5}" min="0" max="${q.points||5}" class="form-control" style="width:80px;">
            <button id="btnOrderingAccept" class="btn-duo-green btn-sm"><i class="fa-solid fa-check"></i> قبول والانتقال</button>
          </div>
        ` : `<p style="margin-top:12px;color:#64748b;font-weight:700;font-size:13px;"><i class="fa-solid fa-clock"></i> بانتظار تقييم المشرف...</p>`}
      </div>`;

    document.getElementById("btnOrderingAccept")?.addEventListener("click", () => {
      let sc = parseInt(document.getElementById("orderingScoreInput")?.value || "0");
      if (doublePointsActive) sc *= 2;
      sc += cardBonusPoints;
      const btn = document.getElementById("btnOrderingAccept");
      if (btn) btn.disabled = true;
      showToast(`✅ تم تسجيل درجة الترتيب: ${sc}`, "fa-check");
      activeCardEffect = null;
      advanceToNext(sc, false);
    }, { once: true });

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
          <span class="oral-hint-text"><i class="fa-solid fa-users-between-lines"></i> تقييم لجنة المعلمين</span>
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

  // وقت السؤال محدد من الغرفة إن وجد أو 30 ثانية
  const timeLimit = currentLiveRoom?.questionTimer || 30;
  // بطاقة "بلا حد زمني" — إيقاف التايمر كلياً للسؤال الشفهي
  if (activeCardEffect?.effect?.noTimeLimit) {
    clearInterval(liveTimerInterval);
    if (stageTimerSeconds) stageTimerSeconds.textContent = "∞";
    showToast("⏾ بلا حد زمني: لا يوجد عداد للسؤال الحالي!", "fa-microphone");
  } else {
    startQuestionTimer(timeLimit, () => {
      // عند انتهاء الوقت: خصم 3 درجات ثم الانتقال للوحة الشرف والسؤال التالي
      showToast("⚠️ انتهى الوقت المحدد للسؤال! خصم 3 درجات والانتقال للسؤال التالي", "fa-clock", 3500);
      advanceToNext(-3, true);
    });
  }
  resetOralEvaluation();
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
  contestantScore = Math.max(0, contestantScore + pts);
  if (stageStudentScore) stageStudentScore.textContent = contestantScore;
  // مزامنة النقاط مع بيانات الغرفة السحابية لضمان التطابق
  if (currentLiveRoom) currentLiveRoom.contestantScore = contestantScore;
}

function startQuestionTimer(seconds, onTimeout = null) {
  clearInterval(liveTimerInterval);
  liveTimeRemaining = seconds;
  if (stageTimerSeconds) stageTimerSeconds.textContent = liveTimeRemaining;

  liveTimerInterval = setInterval(() => {
    liveTimeRemaining--;
    if (stageTimerSeconds) stageTimerSeconds.textContent = liveTimeRemaining;
    if (liveTimeRemaining <= 0) {
      clearInterval(liveTimerInterval);
      if (typeof onTimeout === "function") {
        onTimeout();
      } else {
        showToast("انتهى وقت السؤال!", "fa-stopwatch");
      }
    }
  }, 1000);
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
  if (evalProgressFill) {
    const pct = (roundedQuarter / 5) * 100;
    evalProgressFill.style.width = `${pct}%`;
  }
}

document.querySelectorAll(".btn-rate-score").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".btn-rate-score").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const score = parseFloat(btn.getAttribute("data-score"));
    const teacherKey = currentUser ? currentUser.name : "teacher_1";
    roomTeachersRatings[teacherKey] = score;
    updateOralAverageUI();
    showToast(`تم تسجيل تقييمك: ${score} من 5`);
  });
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
        stageStudentName.textContent = found.name;
        stageStudentSchool.innerHTML = `<i class="fa-solid fa-school"></i> ${found.school || '--'}`;
        stageStudentGrade.innerHTML = `<i class="fa-solid fa-layer-group"></i> ${found.grade || '--'}`;
        contestantScore = 0;
        stageStudentScore.textContent = "0";
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
// نظام البطاقات التكتيكية الثلاثي الأبعاد (3D Flip Animation)
// --------------------------------------------------------
const tacticalCardsModal = document.getElementById("tacticalCardsModal");
const cards3DRow = document.getElementById("cards3DRow");
const cardsCountdownTimer = document.getElementById("cardsCountdownTimer");
const btnSkipCards = document.getElementById("btnSkipCards");
let cardsTimerInterval = null;

let tacticalCardsCallback = null;

function triggerTacticalCardsModal(onComplete = null) {
  if (!tacticalCardsModal || !cards3DRow) {
    if (typeof onComplete === 'function') onComplete();
    return;
  }
  tacticalCardsCallback = typeof onComplete === 'function' ? onComplete : null;

  // اختيار 3 بطاقات عشوائية فريدة من بنك الـ 40 بطاقة في cards-data.js
  const shuffled = [...TACTICAL_CARDS].sort(() => 0.5 - Math.random());
  const selected3 = shuffled.slice(0, 3);

  cards3DRow.innerHTML = selected3.map((card, idx) => `
    <div class="card-3d-wrapper" data-card-idx="${idx}" style="animation-delay: ${idx * 0.2}s;">
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

  // قلب البطاقات تباعاً بتأثير ثلاثي الأبعاد جميل
  const wrappers = cards3DRow.querySelectorAll(".card-3d-wrapper");
  wrappers.forEach((w, i) => {
    setTimeout(() => {
      w.classList.add("flipped");
    }, 700 + (i * 350));

    w.addEventListener("click", () => {
      chooseCard(selected3[i]);
    });
  });

  // مؤقت الـ 15 ثانية للبطاقات
  let cardsTimeLeft = 15;
  if (cardsCountdownTimer) cardsCountdownTimer.textContent = cardsTimeLeft;
  clearInterval(cardsTimerInterval);

  cardsTimerInterval = setInterval(() => {
    cardsTimeLeft--;
    if (cardsCountdownTimer) cardsCountdownTimer.textContent = cardsTimeLeft;
    if (cardsTimeLeft <= 0) {
      clearInterval(cardsTimerInterval);
      skipTacticalCards();
    }
  }, 1000);
}

btnTriggerTacticalCards?.addEventListener("click", () => triggerTacticalCardsModal());

function chooseCard(card) {
  clearInterval(cardsTimerInterval);
  tacticalCardsModal.classList.add("hidden");

  const eff = card.effect || {};

  // ── تأثيرات فورية (لا تحتاج الانتظار للسؤال) ──

  // 1. تجميد الوقت: إيقاف العداد لـ N ثانية ثم إعادة تشغيله
  if (eff.freezeTime) {
    clearInterval(liveTimerInterval);
    showToast(`❄️ تجميد الوقت: العداد متوقف لـ ${eff.freezeTime} ثانية!`, "fa-snowflake", 3000);
    setTimeout(() => {
      // إعادة تشغيل العداد من الوقت المتبقي الحالي
      startQuestionTimer(liveTimeRemaining, () => {
        showToast("⚠️ انتهى الوقت! خصم 3 درجات", "fa-clock", 3000);
        advanceToNext(-3, true);
      });
      showToast("▶️ تم استئناف العداد!", "fa-play");
    }, eff.freezeTime * 1000);
    activeCardEffect = card; // تُحفظ لتُطبَّق على السؤال القادم
  }

  // 2. إضافة/إنقاص وقت: تعديل الوقت المتبقي مباشرة
  if (eff.timeDelta && eff.timeDelta !== 0) {
    liveTimeRemaining = Math.max(3, liveTimeRemaining + eff.timeDelta);
    if (stageTimerSeconds) stageTimerSeconds.textContent = liveTimeRemaining;
    const sign = eff.timeDelta > 0 ? "+" : "";
    showToast(`⏱️ ${sign}${eff.timeDelta} ثانية على الوقت!`, eff.timeDelta > 0 ? "fa-hourglass-start" : "fa-bolt", 2500);
    activeCardEffect = card; // تُحفظ للاستخدام في الأسئلة القادمة
  }

  // 3. تخطي السؤال: الانتقال مباشرة بدون درجات/خصم
  if (eff.passQuestion) {
    showToast("⏭️ تخطي السؤال: انتقال بدون درجات!", "fa-forward", 2500);
    activeCardEffect = null;
    if (typeof tacticalCardsCallback === "function") {
      tacticalCardsCallback = null;
    }
    // تخطي مباشر بدون استدعاء callback (سننتقل للسؤال التالي)
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
  if (eff.bonus7Points) {
    addContestantScore(7);
    showToast("💎 قلب الموازين: +7 نقاط ذهبية فورية!", "fa-gem", 3000);
    activeCardEffect = null;
    if (tacticalCardsCallback) { const cb = tacticalCardsCallback; tacticalCardsCallback = null; cb(); }
    return;
  }

  // 5. وسام الشرف: +1 نقطة شرف
  if (eff.honorBadge) {
    addContestantScore(1);
    showToast("🏅 وسام الشرف: +1 نقطة شرف فورية!", "fa-award", 3000);
    activeCardEffect = null;
    if (tacticalCardsCallback) { const cb = tacticalCardsCallback; tacticalCardsCallback = null; cb(); }
    return;
  }

  // 6. إعادة وقت السؤال: يُعيد ضبط العداد من البداية
  if (eff.resetQuestionTimer) {
    const timeLimit = currentLiveRoom?.questionTimer || 30;
    showToast("🔋 طاقة العزيمة: تمت إعادة ضبط وقت السؤال!", "fa-battery-full", 3000);
    activeCardEffect = null;
    startQuestionTimer(timeLimit, () => {
      showToast("⚠️ انتهى الوقت! خصم 3 درجات", "fa-clock", 3000);
      advanceToNext(-3, true);
    });
    if (tacticalCardsCallback) { const cb = tacticalCardsCallback; tacticalCardsCallback = null; cb(); }
    return;
  }

  // 7. نصف الوقت + نقاط مكافأة (مخاطرة ذكية) — halfTime
  if (eff.halfTime) {
    liveTimeRemaining = Math.max(5, Math.floor(liveTimeRemaining / 2));
    if (stageTimerSeconds) stageTimerSeconds.textContent = liveTimeRemaining;
    showToast(`⚡ تحدي الفارس: الوقت نُصِّف! لكن الإجابة الصحيحة +${eff.pointsBonus||3} نقاط إضافية`, "fa-medal", 3500);
    // تُحفظ للاستخدام في نتيجة السؤال الحالي
    activeCardEffect = card;
  }

  // 8. باقي التأثيرات المؤجلة (تؤثر على السؤال القادم/الحالي):
  // immunity, doublePoints, eliminateOptions, penaltyOnWrong, speedBonusUnder5s,
  // minRating, noTimeLimit, secondChance تُطبَّق في loadStageQuestion عند قراءة activeCardEffect
  if (!eff.freezeTime && !eff.timeDelta && !eff.halfTime) {
    activeCardEffect = card;
  }

  showToast(`✨ تم تفعيل بطاقة: «${card.title}»!`, card.icon, 3000);

  if (tacticalCardsCallback) {
    const cb = tacticalCardsCallback;
    tacticalCardsCallback = null;
    cb();
  }
}

function skipTacticalCards() {
  clearInterval(cardsTimerInterval);
  tacticalCardsModal.classList.add("hidden");
  liveTimeRemaining += 15;
  if (stageTimerSeconds) stageTimerSeconds.textContent = liveTimeRemaining;
  showToast("تم تخطي البطاقات وإضافة +15 ثانية لوقت السؤال!", "fa-hourglass-start");
  if (tacticalCardsCallback) {
    const cb = tacticalCardsCallback;
    tacticalCardsCallback = null;
    cb();
  }
}

btnSkipCards?.addEventListener("click", skipTacticalCards);

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

  const newTotal = Math.max(0, currentSaved + Math.max(0, sessionFinalScore));

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

  // إنشاء قائمة مع دمج نقاط المتسابق الحالي إن كان يخوض المسابقة الآن
  let displayList = [...honorLeaderboardCache];
  if (highlightStudentName && typeof contestantScore === "number") {
    const existing = displayList.find(x => x.name === highlightStudentName);
    const studentUser = participantsCache.find(p => p.name === highlightStudentName);
    const base = (studentUser && typeof studentUser.totalScore === "number") ? studentUser.totalScore : (existing ? existing.score : 0);
    const liveTotal = base + contestantScore;
    if (existing) {
      displayList = displayList.map(x => x.name === highlightStudentName ? { ...x, score: liveTotal } : x);
    } else {
      displayList.push({ name: highlightStudentName, score: liveTotal });
    }
    displayList.sort((a, b) => b.score - a.score);
  }

  if (displayList.length === 0) {
    honorPodiumList.innerHTML = `
      <div style="text-align: center; padding: 25px 15px; color: #64748b;">
        <i class="fa-solid fa-trophy" style="font-size: 38px; color: #facc15; margin-bottom: 10px; display: block;"></i>
        <p style="font-weight: 700; font-size: 15px;">لا توجد نتائج مسجلة في لوحة الشرف بعد.</p>
        <span style="font-size: 12.5px; color: #94a3b8;">ستُدرج النتائج تلقائياً عند إنهاء تقييم المتسابقين</span>
      </div>
    `;
  } else {
    honorPodiumList.innerHTML = displayList.slice(0, 7).map((item, idx) => {
      const isTarget = highlightStudentName && item.name === highlightStudentName;
      let badgeHtml = "";
      if (isTarget && scoreDelta !== 0) {
        badgeHtml = isPenalty
          ? `<span class="score-penalty-badge">${scoreDelta}</span>`
          : `<span class="score-increase-badge">+${scoreDelta}</span>`;
      }
      return `
        <div class="honor-rank-card ${idx === 0 ? 'rank-1' : ''} ${isTarget ? 'highlight-student' : ''}">
          <span class="honor-rank-num">#${idx + 1}</span>
          <span class="honor-student-name">
            ${item.name}
            ${isTarget ? ' <i class="fa-solid fa-star" style="color:#eab308;font-size:14px;"></i>' : ''}
          </span>
          <div style="display:flex;align-items:center;">
            ${badgeHtml}
            <span class="honor-score-val">${item.score} نقطة</span>
          </div>
        </div>
      `;
    }).join("");
  }

  honorBoardModal.classList.remove("hidden");

  let secLeft = 3;
  if (honorCountdownSec) honorCountdownSec.textContent = secLeft;

  const hInt = setInterval(() => {
    secLeft--;
    if (honorCountdownSec) honorCountdownSec.textContent = secLeft;
    if (secLeft <= 0) {
      clearInterval(hInt);
      honorBoardModal.classList.add("hidden");
      if (typeof onDone === 'function') {
        onDone();
      } else if (openNextStudentAfter) {
        openPickStudentModal();
      }
    }
  }, 1000);
}

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

// زر التحديث السحابي المباشر في الهيدر
document.getElementById("btnHeaderCloudSync")?.addEventListener("click", async () => {
  const btn = document.getElementById("btnHeaderCloudSync");
  const icon = btn?.querySelector("i");
  if (icon) icon.classList.add("fa-spin");
  showGlobalLoader("جاري تحديث السحابة...", "يتم قراءة ومزامنة كافة البيانات مباشرة من Firestore");
  try {
    await loadCloudData();
    showToast("✅ تم تحديث وقراءة كافة البيانات مباشرة من السحابة بنجاح!", "fa-arrows-rotate");
  } catch (err) {
    showToast("تعذر الاتصال بالسحابة حالياً", "fa-triangle-exclamation");
  } finally {
    if (icon) icon.classList.remove("fa-spin");
    hideGlobalLoader();
  }
});

// زر التحديث السحابي في لوحة المشرف
document.getElementById("btnSupervisorRefreshCloud")?.addEventListener("click", async () => {
  const btn = document.getElementById("btnSupervisorRefreshCloud");
  const icon = btn?.querySelector("i");
  if (icon) icon.classList.add("fa-spin");
  showGlobalLoader("جاري تحديث السحابة...", "يتم مزامنة جميع الحسابات والاختبارات ولوحة الشرف");
  try {
    await loadCloudData();
    showToast("✅ تم تحديث جميع الحسابات والاختبارات ولوحة الشرف من السحابة!", "fa-arrows-rotate");
  } catch (err) {
    showToast("تعذر الاتصال بالسحابة حالياً", "fa-triangle-exclamation");
  } finally {
    if (icon) icon.classList.remove("fa-spin");
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
      if (currentUser && earnedScore > 0) {
        recordHonorScore(currentUser.name, earnedScore);
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
          <div style="margin: 20px 0; padding: 15px; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; color: #166534; font-weight: 700; font-size: 16px;">
            <i class="fa-solid fa-trophy" style="color: #eab308; margin-left: 6px;"></i>
            تم احتساب وحفظ <strong>${earnedScore} نقطة</strong> في رصيدك السحابي وفي لوحة الشرف بنجاح!
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
      <div class="practice-sec-box">
        <h3 style="font-size: 18px; margin-bottom: 15px; color: var(--duo-green-dark);">
          <i class="fa-solid fa-bookmark"></i> ${sec.sectionName}
        </h3>
        ${sec.questions.map((q, idx) => `
          <div style="background: #f8fafc; border: 1.5px solid var(--border-duo); border-radius: var(--radius-md); padding: 18px; margin-bottom: 15px;">
            <p class="font-${q.font || 'quran'}" style="margin-bottom: 12px; font-weight: 700;">${idx + 1}. ${q.text}</p>
            ${q.type === 'mcq' && q.options && q.options.length > 0 ? `
              <div class="mcq-options-grid">
                ${q.options.map((opt, oIdx) => `
                  <button class="btn-choice-duo btn-practice-mcq font-${q.font || 'quran'}" data-q="${idx}" data-choice="${oIdx}">${opt}</button>
                `).join("")}
              </div>
            ` : q.type === 'matching' && q.pairs && q.pairs.length > 0 ? `
              <div style="background: #ffffff; border: 1.5px dashed var(--border-duo); border-radius: var(--radius-md); padding: 14px;">
                <p style="font-size: 13px; color: #64748b; font-weight: 700; margin-bottom: 10px;"><i class="fa-solid fa-arrows-split-up-and-left"></i> طابق كل عنصر بما يناسبه:</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                  <div style="display: flex; flex-direction: column; gap: 8px;">
                    <span style="font-size: 12px; font-weight: 800; color: #475569;">الموصل:</span>
                    ${q.pairs.map(p => `
                      <div class="font-${q.font || 'quran'}" style="background: #f1f5f9; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; font-weight: 700;">${p[0]}</div>
                    `).join("")}
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 8px;">
                    <span style="font-size: 12px; font-weight: 800; color: #475569;">الموصل إليه:</span>
                    ${[...q.pairs].sort(() => 0.5 - Math.random()).map(p => `
                      <div class="font-${q.font || 'quran'}" style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 10px; text-align: center; color: #166534; font-weight: 700;">${p[1]}</div>
                    `).join("")}
                  </div>
                </div>
              </div>
            ` : q.type === 'ordering' && q.items && q.items.length > 0 ? `
              <div style="background: #ffffff; border: 1.5px dashed var(--border-duo); border-radius: var(--radius-md); padding: 14px;">
                <p style="font-size: 13px; color: #64748b; font-weight: 700; margin-bottom: 10px;"><i class="fa-solid fa-arrow-down-short-wide"></i> رتب الكلمات التالية:</p>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;">
                  ${[...q.items].sort(() => 0.5 - Math.random()).map(itm => `
                    <span class="btn-choice-duo font-${q.font || 'quran'}" style="padding: 10px 18px; font-size: 16px;">${itm}</span>
                  `).join("")}
                </div>
              </div>
            ` : q.type === 'oral' ? `
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
        `).join("")}

        <button id="btnNextPracticeSection" class="btn-duo-green" style="margin-top: 15px;">
          ${secIdx + 1 === quiz.sections.length ? 'إكمال الاختبار' : 'الانتقال للقسم التالي'}
        </button>
      </div>
    `;

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
            showToast(`+${q.points || 5} نقاط إجابة صحيحة!`, "fa-star");
          } else {
            b.classList.add("wrong");
          }
        }
      });
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
      });
    });
  }

  renderPracticeSection(0);
  runnerModal.classList.remove("hidden");
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
// نقطة البداية (Initialization)
// --------------------------------------------------------
async function initApp() {
  showGlobalLoader("مسابقة نور البيان", "جاري الاتصال بقاعدة البيانات السحابية وجلب البيانات المحدثة...");
  loadInitialStorage();

  try {
    // 1. تفعيل مستمعي البيانات السحابية الحية ومزامنة السحابة أولاً وقبل أي عرض
    setupRealtimeCloudListeners();
    await loadCloudData();

    // 2. فحص رابط الدخول المباشر (?auth=...)
    const urlParams = new URLSearchParams(window.location.search);
    const hasDirectAuth = urlParams.has("auth") || urlParams.has("token");
    if (hasDirectAuth) {
      const isDirectLoggedIn = await checkDirectUrlAuthentication();
      if (isDirectLoggedIn) {
        return;
      }
    }

    // 3. استعادة الجلسة السابقة ومطابقتها مع قاعدة البيانات السحابية الحية
    let restoredSession = false;
    const savedUserJson = localStorage.getItem("active_quran_user") || localStorage.getItem("nour_saved_user");
    if (savedUserJson) {
      try {
        const parsed = JSON.parse(savedUserJson);
        if (parsed && parsed.name) {
          // نتحقق من أحدث بيانات لهذا الحساب في السحابة
          const liveUser = participantsCache.find(p => 
            p.id === parsed.id || 
            p.normalizedName === parsed.normalizedName || 
            p.name === parsed.name
          );
          currentUser = liveUser ? { ...parsed, ...liveUser } : parsed;
          finalizeUserSession(currentUser, true);
          restoredSession = true;
        }
      } catch (e) {
        console.warn("Session restore parse notice:", e);
      }
    }

    // 4. استرجاع وتعبئة آخر اسم مستخدم تلقائياً في خانة تسجيل الدخول مع تحديث العداد
    const lastUsername = localStorage.getItem("nour_last_username");
    if (lastUsername && fullNameInput) {
      fullNameInput.value = lastUsername;
      fullNameInput.dispatchEvent(new Event("input"));
    }

    // 5. إذا لم يكن هناك مستخدم مسجل مسبقاً، نظهر شاشة البداية
    if (!restoredSession && !currentUser) {
      showView("hero");
    }
  } catch (err) {
    console.warn("Init cloud load notice:", err);
    if (!currentUser) {
      showView("hero");
    }
  } finally {
    hideGlobalLoader();
  }
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
