// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// دوال معالجة وتوحيد وتدقيق الأسماء العربية (Arabic Text & Name Utilities)
// ========================================================

export const MASTER_SUPERVISOR_NAME = "محمد منتصر محمد يونس";

export function normalizeArabic(text: string): string {
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

export function isSupervisor(name: string, participantsCache: any[] = []): boolean {
  if (!name || typeof name !== "string") return false;
  const norm = normalizeArabic(name).trim();
  const rawClean = name.trim().toLowerCase();

  // 1. الكلمات المفتاحية الإدارية المحجوزة حصراً للمشرف العام
  const directKeywords = [
    "مشرف", "المشرف", "المشرف العام", "مشرف البرنامج", "مشرف المسابقة",
    "admin", "administrator", "super", "supervisor", "ادمن", "الادمن",
    "رئيس المسابقة", "ادارة المسابقة"
  ];
  if (directKeywords.includes(norm) || directKeywords.includes(rawClean)) {
    return true;
  }

  // 2. المطابقة التامة الدقيقة للاسم الكامل للمشرف العام
  const masterNorm = normalizeArabic(MASTER_SUPERVISOR_NAME);
  if (norm === masterNorm) return true;
  if (norm === "محمد منتصر") return true;

  // 3. فحص الحسابات المسجلة كـ supervisor
  if (Array.isArray(participantsCache) && participantsCache.length > 0) {
    const isRegistered = participantsCache.some(p => 
      p && p.role === "supervisor" && (
        p.normalizedName === norm || 
        normalizeArabic(p.name || "") === norm ||
        (p.name && p.name.trim().toLowerCase() === rawClean)
      )
    );
    if (isRegistered) return true;
  }

  return false;
}

export function isTeacher(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  const norm = normalizeArabic(name).trim();
  const rawClean = name.trim().toLowerCase();
  const teacherKeywords = ["معلم", "المعلم", "معلم معتمد", "استاذ", "الاستاذ", "مدرس", "المدرس", "teacher"];
  return teacherKeywords.includes(norm) || teacherKeywords.includes(rawClean) || norm.includes("معلم معتمد");
}

export function isPresenter(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  const norm = normalizeArabic(name).trim();
  const rawClean = name.trim().toLowerCase();
  const presenterKeywords = ["عارض", "العارض", "شاشة العرض", "شاشة", "عرض", "presenter", "screen", "عارض المسرح"];
  return presenterKeywords.includes(norm) || presenterKeywords.includes(rawClean);
}

export function countArabicNameParts(name: string): number {
  if (!name || typeof name !== "string") return 0;
  let clean = name.trim();
  if (!clean) return 0;

  clean = clean
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[,\.،؛\-_\/]/g, " ")
    .replace(/\s+/g, " ");

  // 1. عبد + (أي اسم معرف بأل أو الله)
  clean = clean.replace(/(^|\s)عبد\s+(ال[\u0621-\u064A]+|الله)(?=\s|$)/gu, "$1عبد_$2");
  // 2. أبو / أبا / أبي / ابن / بن / آل / أم + الاسم
  clean = clean.replace(/(^|\s)(ابو|ابا|ابي|ابن|بن|ال|ام)\s+([\u0621-\u064A]+)(?=\s|$)/gu, "$1$2_$3");
  // 3. المركب الإضافي مع (الدين / الإسلام / الله)
  clean = clean.replace(/(^|\s)([\u0621-\u064A]+)\s+(الدين|الاسلام|الله)(?=\s|$)/gu, "$1$2_$3");

  const tokens = clean.split(/\s+/).filter(w => w.length > 0);
  return tokens.length;
}

export function validateQuadrupleName(fullName: string): { isValid: boolean; count: number; isQuadruple: boolean; message: string } {
  const trimmed = (fullName || "").trim();
  if (!trimmed) {
    return { isValid: false, count: 0, isQuadruple: false, message: "يرجى كتابة الاسم الرباعي كاملاً (4 أسماء على الأقل)." };
  }
  const count = countArabicNameParts(trimmed);
  const isQuadruple = count >= 4;
  if (!isQuadruple) {
    const labels: Record<number, string> = {
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

export function getDocumentId(normalizedName: string): string {
  if (!normalizedName) return "user_guest";
  const encoded = encodeURIComponent(normalizedName).replace(/%/g, "_");
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

export const MASTER_SUPERVISOR_DOC_ID = getDocumentId(normalizeArabic(MASTER_SUPERVISOR_NAME));

export function shuffleArray<T>(arr: T[]): T[] {
  if (!Array.isArray(arr) || arr.length <= 1) return [...(arr || [])];
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
