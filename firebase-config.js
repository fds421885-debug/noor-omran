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
import firebaseAppletConfig from "./firebase-applet-config.json";

// تكوين مشروع فايربيس المعتمد من ملف التكوين السحابي والمتغيرات البيئية
export const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId || "gen-lang-client-0244349493",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId || "1:576155598063:web:9dafbb06c727a4d11f2f1a",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey || "AIzaSyBC-TnCfJ1tGpHxvXG8nTY0R5ltlaZ7LwU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain || "gen-lang-client-0244349493.firebaseapp.com",
  firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId || "ai-studio-remixmosapqtnoor-d6187af8-fb55-4657-a7da-b404460c4252",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket || "gen-lang-client-0244349493.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId || "576155598063",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseAppletConfig.measurementId || "G-NZF6S4Z2FQ",
  oAuthClientId: firebaseAppletConfig.oAuthClientId || "",
  recaptchaSiteKey: firebaseAppletConfig.recaptchaSiteKey || ""
};

// تهيئة تطبيق فايربيس باستخدام التكوين السحابي المعتمد
const app = initializeApp(firebaseConfig);

// تهيئة قاعدة بيانات Cloud Firestore مع تمرير معرف قاعدة البيانات المخصصة (CRITICAL)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// اختبار الاتصال بقاعدة البيانات سحابياً بشكل هادئ وآمن
export async function testConnection() {
  try {
    const snap = await getDoc(doc(db, "test", "connection"));
    return snap.exists();
  } catch (error) {
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
  return {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
}

export { 
  app, 
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
