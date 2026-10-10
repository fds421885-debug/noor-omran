// إعدادات وتكوين قاعدة بيانات فايربيس (Firebase) لمسابقة نور البيان
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp,
  onSnapshot 
} from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import firebaseConfig from "./firebase-applet-config.json";

// تهيئة تطبيق فايربيس باستخدام التكوين السحابي المعتمد
const app = initializeApp(firebaseConfig);

// تهيئة قاعدة بيانات Cloud Firestore مع تمرير معرف قاعدة البيانات المخصصة (CRITICAL)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// اختبار الاتصال بقاعدة البيانات سحابياً
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("✅ [Firebase] متصل بنجاح بقاعدة بيانات Firestore السحابية:", firebaseConfig.projectId);
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("⚠️ [Firebase] الرجاء التأكد من إعدادات فايربيس والاتصال بالإنترنت.");
    } else {
      console.log("ℹ️ [Firebase] تم اختبار الاتصال بقاعدة بيانات Firestore.");
    }
  }
}
testConnection();

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
    operationType,
    path
  };
  console.error("Firestore Error:", JSON.stringify(errInfo));
  return errInfo;
}

// تهيئة التحليلات بأمان عند توفر measurementId فقط
let analytics = null;
if (firebaseConfig.measurementId) {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // تجاوز التحليلات بأمان في البيئات التي لا تدعمها
  });
}

export { 
  app, 
  analytics, 
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp,
  onSnapshot
};
