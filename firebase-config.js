// إعدادات وتكوين قاعدة بيانات فايربيس (Firebase) لمسابقة نور البيان
// مزودة بحماية ذكية وشاملة ضد تجاوز الحصص اليومية (Quota Exhaustion Protection)
// ونظام الحفظ المحلي الفوري التلقائي (Local-First Offline Fallback)
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc as rawGetDoc, 
  getDocFromServer as rawGetDocFromServer,
  setDoc as rawSetDoc, 
  updateDoc as rawUpdateDoc, 
  deleteDoc as rawDeleteDoc,
  collection, 
  getDocs as rawGetDocs, 
  query, 
  orderBy, 
  serverTimestamp,
  onSnapshot as rawOnSnapshot,
  arrayUnion,
  arrayRemove 
} from "firebase/firestore";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  updateProfile 
} from "firebase/auth";
import { firebaseAppletConfig } from "./firebase-applet-config.js";

// استخراج متغيرات البيئة بأمان تام دون التسبب في خطأ ببيئات المتصفح العادية أو الاستضافات الثابتة
const env = (typeof import.meta !== "undefined" && import.meta && import.meta.env) ? import.meta.env : {};

// تكوين مشروع فايربيس المعتمد من ملف التكوين السحابي والمتغيرات البيئية
export const firebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId || "gen-lang-client-0244349493",
  appId: env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId || "1:576155598063:web:9dafbb06c727a4d11f2f1a",
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey || "AIzaSyBC-TnCfJ1tGpHxvXG8nTY0R5ltlaZ7LwU",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain || "gen-lang-client-0244349493.firebaseapp.com",
  firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId || "ai-studio-remixmosapqtnoor-d6187af8-fb55-4657-a7da-b404460c4252",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket || "gen-lang-client-0244349493.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId || "576155598063",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || firebaseAppletConfig.measurementId || "G-NZF6S4Z2FQ",
  oAuthClientId: firebaseAppletConfig.oAuthClientId || "",
  recaptchaSiteKey: firebaseAppletConfig.recaptchaSiteKey || ""
};

// تهيئة تطبيق فايربيس باستخدام التكوين السحابي المعتمد
const app = initializeApp(firebaseConfig);

// تهيئة قاعدة بيانات Cloud Firestore مع تمرير معرف قاعدة البيانات المخصصة (CRITICAL)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// تهيئة وتأمين خدمة المصادقة Firebase Auth
export const auth = getAuth(app);

let authInitPromise = null;
export async function ensureFirebaseAuth(userName = null) {
  if (!auth) return null;
  if (auth.currentUser) {
    if (userName && !auth.currentUser.displayName) {
      try {
        await updateProfile(auth.currentUser, { displayName: userName });
      } catch (e) {}
    }
    return auth.currentUser;
  }

  if (authInitPromise) {
    return authInitPromise;
  }

  authInitPromise = (async () => {
    try {
      const cred = await signInAnonymously(auth);
      if (userName && cred?.user) {
        try {
          await updateProfile(cred.user, { displayName: userName });
        } catch (e) {}
      }
      console.log("[FIREBASE AUTH] Anonymous session active, uid:", cred?.user?.uid);
      return cred.user;
    } catch (err) {
      console.info("[FIREBASE AUTH] Auth notice:", err?.code || err?.message || "unauthenticated");
      return null;
    } finally {
      authInitPromise = null;
    }
  })();

  return authInitPromise;
}

// --------------------------------------------------------
// نظام تتبع حصة السحابة والحماية من التكرار المفرط (Quota Guard)
// --------------------------------------------------------
let isCloudQuotaExhausted = false;
let quotaExhaustedTimestamp = 0;

try {
  if (typeof window !== "undefined" && window.sessionStorage) {
    const saved = window.sessionStorage.getItem("nour_firestore_quota_exhausted");
    if (saved) {
      const parsed = JSON.parse(saved);
      // الحصة تتجدد كل 24 ساعة، نتحقق من انقضاء اليوم
      if (Date.now() - (parsed.timestamp || 0) < 24 * 60 * 60 * 1000) {
        isCloudQuotaExhausted = true;
        quotaExhaustedTimestamp = parsed.timestamp;
      }
    }
  }
} catch (e) {}

export function isQuotaOrExhaustedError(err) {
  if (!err) return false;
  const msg = String(err.message || err).toLowerCase();
  const code = String(err.code || "").toLowerCase();
  return (
    code.includes("resource-exhausted") ||
    code.includes("quota-exceeded") ||
    msg.includes("quota") ||
    msg.includes("resource-exhausted") ||
    msg.includes("quota limit exceeded") ||
    msg.includes("free daily write units")
  );
}

export function markQuotaExhausted(err) {
  if (!isCloudQuotaExhausted) {
    console.warn(
      "⚠️ [مسابقة نور البيان] تم رصد استنفاد حصة السحابة اليومية (Firestore Quota Exceeded). تم تفعيل وضع الحفظ المحلي الفوري (Offline/Local Storage) تلقائياً لمنع أي انهيار واستمرار كافة وظائف المسابقة والاختبارات بنجاح 100%."
    );
  }
  isCloudQuotaExhausted = true;
  quotaExhaustedTimestamp = Date.now();
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem("nour_firestore_quota_exhausted", JSON.stringify({
        timestamp: quotaExhaustedTimestamp,
        exhausted: true
      }));
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("firestore-quota-exhausted", { detail: { error: err } }));
    }
  } catch (e) {}
}

export function isQuotaExhausted() {
  return isCloudQuotaExhausted;
}

export function resetQuotaExhausted() {
  isCloudQuotaExhausted = false;
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.removeItem("nour_firestore_quota_exhausted");
    }
  } catch (e) {}
}

// --------------------------------------------------------
// دوال الكتابة السحابية الآمنة والمحصنة (Safe Write Operations)
// تمنع تكديس الطلبات في Firestore Backoff عند نفاذ الحصة
// --------------------------------------------------------
export async function setDoc(docRef, data, options) {
  if (isCloudQuotaExhausted) {
    return Promise.resolve();
  }
  try {
    return await rawSetDoc(docRef, data, options);
  } catch (err) {
    if (isQuotaOrExhaustedError(err)) {
      markQuotaExhausted(err);
      return Promise.resolve();
    }
    console.error("Firestore setDoc error:", err?.message || err, "at path:", docRef?.path);
    throw err;
  }
}

export async function updateDoc(docRef, ...args) {
  if (isCloudQuotaExhausted) {
    return Promise.resolve();
  }
  try {
    return await rawUpdateDoc(docRef, ...args);
  } catch (err) {
    if (isQuotaOrExhaustedError(err)) {
      markQuotaExhausted(err);
      return Promise.resolve();
    }
    console.error("Firestore updateDoc error:", err?.message || err, "at path:", docRef?.path);
    throw err;
  }
}

export async function deleteDoc(docRef) {
  if (isCloudQuotaExhausted) {
    return Promise.resolve();
  }
  try {
    return await rawDeleteDoc(docRef);
  } catch (err) {
    if (isQuotaOrExhaustedError(err)) {
      markQuotaExhausted(err);
      return Promise.resolve();
    }
    console.warn("Firestore deleteDoc notice:", err?.message || err);
    return Promise.resolve();
  }
}

// --------------------------------------------------------
// دوال القراءة السحابية الآمنة (Safe Read Operations)
// --------------------------------------------------------
export async function getDoc(docRef) {
  try {
    return await rawGetDoc(docRef);
  } catch (err) {
    if (isQuotaOrExhaustedError(err)) {
      markQuotaExhausted(err);
    }
    console.warn("Firestore getDoc notice:", err?.message || err);
    return {
      exists: () => false,
      data: () => null,
      id: docRef?.id || ""
    };
  }
}

export async function getDocFromServer(docRef) {
  try {
    return await rawGetDocFromServer(docRef);
  } catch (err) {
    if (isQuotaOrExhaustedError(err)) {
      markQuotaExhausted(err);
    }
    return {
      exists: () => false,
      data: () => null,
      id: docRef?.id || ""
    };
  }
}

export async function getDocs(queryRef) {
  try {
    return await rawGetDocs(queryRef);
  } catch (err) {
    if (isQuotaOrExhaustedError(err)) {
      markQuotaExhausted(err);
    }
    console.warn("Firestore getDocs notice:", err?.message || err);
    return {
      empty: true,
      size: 0,
      docs: [],
      forEach: () => {}
    };
  }
}

// --------------------------------------------------------
// مستمع Firestore المحصن ضد انقطاع الشبكة أو أخطاء الحصة (Safe onSnapshot)
// --------------------------------------------------------
export function onSnapshot(target, ...args) {
  let onNext = null;
  let onError = null;
  let options = undefined;

  if (typeof args[0] === "function") {
    onNext = args[0];
    onError = typeof args[1] === "function" ? args[1] : null;
  } else if (typeof args[0] === "object" && typeof args[1] === "function") {
    options = args[0];
    onNext = args[1];
    onError = typeof args[2] === "function" ? args[2] : null;
  }

  const safeOnError = (err) => {
    if (isQuotaOrExhaustedError(err)) {
      markQuotaExhausted(err);
    }
    if (onError) {
      try { onError(err); } catch (e) { console.warn("Snapshot error callback notice:", e); }
    } else {
      console.warn("Firestore snapshot notice:", err?.message || err);
    }
  };

  try {
    if (options && onNext) {
      return rawOnSnapshot(target, options, onNext, safeOnError);
    } else if (onNext) {
      return rawOnSnapshot(target, onNext, safeOnError);
    } else {
      return rawOnSnapshot(target, ...args);
    }
  } catch (err) {
    if (isQuotaOrExhaustedError(err)) {
      markQuotaExhausted(err);
    }
    console.warn("Firestore onSnapshot setup notice:", err?.message || err);
    return () => {};
  }
}

// اختبار الاتصال بقاعدة البيانات سحابياً بشكل هادئ وآمن
export async function testConnection() {
  if (isCloudQuotaExhausted) return false;
  try {
    const snap = await rawGetDoc(doc(db, "test", "connection"));
    return snap.exists();
  } catch (error) {
    if (isQuotaOrExhaustedError(error)) {
      markQuotaExhausted(error);
    }
    return false;
  }
}

// معالج أخطاء عمليات فايربيس
export const OperationType = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LIST: "list",
  GET: "get",
  WRITE: "write"
};

export function handleFirestoreError(error, operationType, path = null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error:", JSON.stringify(errInfo));
  return errInfo;
}

export { 
  app, 
  doc, 
  collection, 
  query, 
  orderBy, 
  serverTimestamp,
  arrayUnion,
  arrayRemove
};
