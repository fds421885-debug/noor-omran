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
// تكوين مشروع فايربيس المعتمد
export const firebaseConfig = {
  projectId: "gen-lang-client-0244349493",
  appId: "1:576155598063:web:9dafbb06c727a4d11f2f1a",
  apiKey: "AIzaSyBC-TnCfJ1tGpHxvXG8nTY0R5ltlaZ7LwU",
  authDomain: "gen-lang-client-0244349493.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-remixmosapqtnoor-d6187af8-fb55-4657-a7da-b404460c4252",
  storageBucket: "gen-lang-client-0244349493.firebasestorage.app",
  messagingSenderId: "576155598063",
  measurementId: "G-NZF6S4Z2FQ",
  oAuthClientId: "576155598063-9sigjmhkijl03raan3lj117q6sjbcnb6.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

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
      console.warn("ℹ️ [Firebase] جاري تشغيل التطبيق دون اتصال مؤقت بالسحابة.");
    } else {
      console.log("ℹ️ [Firebase] تم فحص الاتصال بقاعدة بيانات Firestore السحابية.");
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
