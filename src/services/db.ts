// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// خدمة الاتصال والتخزين السحابي والمحلي الموحد (Firestore & Local-First Database Service)
// ========================================================

import {
  db,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  isQuotaExhausted,
  markQuotaExhausted,
  testConnection
} from "../../firebase-config.js";
import {
  Participant,
  Quiz,
  LiveRoom,
  TournamentTeam,
  TournamentArchiveItem
} from "../types.ts";
import { DEFAULT_SCHOOLS, DEFAULT_GRADES, INITIAL_QUIZZES } from "../utils/defaults.ts";
import { normalizeArabic } from "../utils/arabic.ts";

const LOCAL_STORAGE_KEYS = {
  PARTICIPANTS: "nour_participants_cache_v2",
  QUIZZES: "nour_quizzes_cache_v2",
  SCHOOLS: "nour_schools_cache_v2",
  GRADES: "nour_grades_cache_v2",
  LIVE_ROOMS: "nour_live_rooms_cache_v2",
  TEAMS: "nour_teams_cache_v2",
  ARCHIVES: "nour_archives_cache_v2",
  USER_SESSION: "nour_current_user_session"
};

// --------------------------------------------------------
// قراءة وتحديث التخزين المحلي الآمن
// --------------------------------------------------------
export function getLocalCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    return fallback;
  }
}

export function setLocalCache<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Local storage write warning:", e);
  }
}

// --------------------------------------------------------
// المدارس والصفوف المعتمدة
// --------------------------------------------------------
export async function fetchSchoolsAndGrades(): Promise<{ schools: string[]; grades: string[] }> {
  const localSchools = getLocalCache<string[]>(LOCAL_STORAGE_KEYS.SCHOOLS, DEFAULT_SCHOOLS);
  const localGrades = getLocalCache<string[]>(LOCAL_STORAGE_KEYS.GRADES, DEFAULT_GRADES);

  if (isQuotaExhausted()) {
    return { schools: localSchools, grades: localGrades };
  }

  try {
    const snap = await getDoc(doc(db, "system_settings", "schools_and_grades"));
    if (snap && snap.exists && snap.exists()) {
      const data = snap.data();
      const schools = Array.isArray(data?.schools) && data.schools.length > 0 ? data.schools : localSchools;
      const grades = Array.isArray(data?.grades) && data.grades.length > 0 ? data.grades : localGrades;
      setLocalCache(LOCAL_STORAGE_KEYS.SCHOOLS, schools);
      setLocalCache(LOCAL_STORAGE_KEYS.GRADES, grades);
      return { schools, grades };
    }
  } catch (e) {
    console.warn("fetchSchoolsAndGrades fallback to local:", e);
  }

  return { schools: localSchools, grades: localGrades };
}

export async function saveSchoolsAndGrades(schools: string[], grades: string[]): Promise<void> {
  setLocalCache(LOCAL_STORAGE_KEYS.SCHOOLS, schools);
  setLocalCache(LOCAL_STORAGE_KEYS.GRADES, grades);

  if (!isQuotaExhausted()) {
    try {
      await setDoc(doc(db, "system_settings", "schools_and_grades"), {
        schools,
        grades,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (e) {
      console.warn("saveSchoolsAndGrades notice:", e);
    }
  }
}

// --------------------------------------------------------
// الحسابات والمشاركون (Participants)
// --------------------------------------------------------
export async function fetchParticipants(): Promise<Participant[]> {
  const local = getLocalCache<Participant[]>(LOCAL_STORAGE_KEYS.PARTICIPANTS, []);

  if (isQuotaExhausted()) {
    return local;
  }

  try {
    const snap = await getDocs(collection(db, "participants"));
    if (snap && !snap.empty) {
      const list: Participant[] = [];
      snap.forEach(d => {
        const item = d.data() as Participant;
        list.push({ ...item, id: d.id });
      });
      if (list.length > 0) {
        setLocalCache(LOCAL_STORAGE_KEYS.PARTICIPANTS, list);
        return list;
      }
    }
  } catch (e) {
    console.warn("fetchParticipants fallback to local:", e);
  }

  return local;
}

export async function saveParticipantDoc(participant: Participant): Promise<void> {
  const local = getLocalCache<Participant[]>(LOCAL_STORAGE_KEYS.PARTICIPANTS, []);
  const idx = local.findIndex(p => p.id === participant.id);
  if (idx >= 0) {
    local[idx] = participant;
  } else {
    local.push(participant);
  }
  setLocalCache(LOCAL_STORAGE_KEYS.PARTICIPANTS, local);

  if (!isQuotaExhausted()) {
    try {
      await setDoc(doc(db, "participants", participant.id), participant, { merge: true });
    } catch (e) {
      console.warn("saveParticipantDoc notice:", e);
    }
  }
}

export async function deleteParticipantDoc(id: string): Promise<void> {
  const local = getLocalCache<Participant[]>(LOCAL_STORAGE_KEYS.PARTICIPANTS, []);
  const filtered = local.filter(p => p.id !== id);
  setLocalCache(LOCAL_STORAGE_KEYS.PARTICIPANTS, filtered);

  if (!isQuotaExhausted()) {
    try {
      await deleteDoc(doc(db, "participants", id));
    } catch (e) {
      console.warn("deleteParticipantDoc notice:", e);
    }
  }
}

// --------------------------------------------------------
// بنك الاختبارات (Quizzes)
// --------------------------------------------------------
export async function fetchQuizzes(): Promise<Quiz[]> {
  const local = getLocalCache<Quiz[]>(LOCAL_STORAGE_KEYS.QUIZZES, INITIAL_QUIZZES);

  if (isQuotaExhausted()) {
    return local;
  }

  try {
    const snap = await getDocs(collection(db, "quizzes"));
    if (snap && !snap.empty) {
      const list: Quiz[] = [];
      snap.forEach(d => {
        const item = d.data() as Quiz;
        list.push({ ...item, id: d.id });
      });
      if (list.length > 0) {
        setLocalCache(LOCAL_STORAGE_KEYS.QUIZZES, list);
        return list;
      }
    }
  } catch (e) {
    console.warn("fetchQuizzes fallback to local:", e);
  }

  return local;
}

export async function saveQuizDoc(quiz: Quiz): Promise<void> {
  const local = getLocalCache<Quiz[]>(LOCAL_STORAGE_KEYS.QUIZZES, INITIAL_QUIZZES);
  const idx = local.findIndex(q => q.id === quiz.id);
  if (idx >= 0) {
    local[idx] = quiz;
  } else {
    local.push(quiz);
  }
  setLocalCache(LOCAL_STORAGE_KEYS.QUIZZES, local);

  if (!isQuotaExhausted()) {
    try {
      await setDoc(doc(db, "quizzes", quiz.id), quiz, { merge: true });
    } catch (e) {
      console.warn("saveQuizDoc notice:", e);
    }
  }
}

export async function deleteQuizDoc(id: string): Promise<void> {
  const local = getLocalCache<Quiz[]>(LOCAL_STORAGE_KEYS.QUIZZES, INITIAL_QUIZZES);
  const filtered = local.filter(q => q.id !== id);
  setLocalCache(LOCAL_STORAGE_KEYS.QUIZZES, filtered);

  if (!isQuotaExhausted()) {
    try {
      await deleteDoc(doc(db, "quizzes", id));
    } catch (e) {
      console.warn("deleteQuizDoc notice:", e);
    }
  }
}

// --------------------------------------------------------
// الغرف والمسابقات الحية (Live Rooms)
// --------------------------------------------------------
export async function fetchLiveRooms(): Promise<LiveRoom[]> {
  const local = getLocalCache<LiveRoom[]>(LOCAL_STORAGE_KEYS.LIVE_ROOMS, []);

  if (isQuotaExhausted()) {
    return local;
  }

  try {
    const snap = await getDocs(collection(db, "live_rooms"));
    if (snap && !snap.empty) {
      const list: LiveRoom[] = [];
      snap.forEach(d => {
        const item = d.data() as LiveRoom;
        list.push({ ...item, id: d.id });
      });
      setLocalCache(LOCAL_STORAGE_KEYS.LIVE_ROOMS, list);
      return list;
    }
  } catch (e) {
    console.warn("fetchLiveRooms fallback to local:", e);
  }

  return local;
}

export async function saveLiveRoomDoc(room: LiveRoom): Promise<void> {
  const local = getLocalCache<LiveRoom[]>(LOCAL_STORAGE_KEYS.LIVE_ROOMS, []);
  const idx = local.findIndex(r => r.id === room.id);
  if (idx >= 0) {
    local[idx] = room;
  } else {
    local.push(room);
  }
  setLocalCache(LOCAL_STORAGE_KEYS.LIVE_ROOMS, local);

  if (!isQuotaExhausted()) {
    try {
      await setDoc(doc(db, "live_rooms", room.id), room, { merge: true });
    } catch (e) {
      console.warn("saveLiveRoomDoc notice:", e);
    }
  }
}

export async function deleteLiveRoomDoc(id: string): Promise<void> {
  const local = getLocalCache<LiveRoom[]>(LOCAL_STORAGE_KEYS.LIVE_ROOMS, []);
  const filtered = local.filter(r => r.id !== id);
  setLocalCache(LOCAL_STORAGE_KEYS.LIVE_ROOMS, filtered);

  if (!isQuotaExhausted()) {
    try {
      await deleteDoc(doc(db, "live_rooms", id));
    } catch (e) {
      console.warn("deleteLiveRoomDoc notice:", e);
    }
  }
}

export function subscribeToLiveRooms(onUpdate: (rooms: LiveRoom[]) => void): () => void {
  try {
    return onSnapshot(collection(db, "live_rooms"), (snap: any) => {
      const list: LiveRoom[] = [];
      snap.forEach((d: any) => {
        list.push({ ...(d.data() as LiveRoom), id: d.id });
      });
      setLocalCache(LOCAL_STORAGE_KEYS.LIVE_ROOMS, list);
      onUpdate(list);
    }, (err: any) => {
      console.warn("subscribeToLiveRooms error callback:", err);
    });
  } catch (e) {
    console.warn("subscribeToLiveRooms failed:", e);
    return () => {};
  }
}

export function subscribeToRoom(roomId: string, onUpdate: (room: LiveRoom | null) => void): () => void {
  try {
    return onSnapshot(doc(db, "live_rooms", roomId), (snap: any) => {
      if (snap && snap.exists && snap.exists()) {
        const r = { ...(snap.data() as LiveRoom), id: snap.id };
        onUpdate(r);
      } else {
        onUpdate(null);
      }
    }, (err: any) => {
      console.warn("subscribeToRoom error callback:", err);
    });
  } catch (e) {
    console.warn("subscribeToRoom failed:", e);
    return () => {};
  }
}

// --------------------------------------------------------
// الفرق والبطولات (Teams)
// --------------------------------------------------------
export async function fetchTeams(): Promise<TournamentTeam[]> {
  const local = getLocalCache<TournamentTeam[]>(LOCAL_STORAGE_KEYS.TEAMS, []);

  if (isQuotaExhausted()) {
    return local;
  }

  try {
    const snap = await getDocs(collection(db, "teams"));
    if (snap && !snap.empty) {
      const list: TournamentTeam[] = [];
      snap.forEach(d => {
        list.push({ ...(d.data() as TournamentTeam), id: d.id });
      });
      setLocalCache(LOCAL_STORAGE_KEYS.TEAMS, list);
      return list;
    }
  } catch (e) {
    console.warn("fetchTeams notice:", e);
  }

  return local;
}

export async function saveTeamDoc(team: TournamentTeam): Promise<void> {
  const local = getLocalCache<TournamentTeam[]>(LOCAL_STORAGE_KEYS.TEAMS, []);
  const idx = local.findIndex(t => t.id === team.id);
  if (idx >= 0) {
    local[idx] = team;
  } else {
    local.push(team);
  }
  setLocalCache(LOCAL_STORAGE_KEYS.TEAMS, local);

  if (!isQuotaExhausted()) {
    try {
      await setDoc(doc(db, "teams", team.id), team, { merge: true });
    } catch (e) {}
  }
}

export async function deleteTeamDoc(id: string): Promise<void> {
  const local = getLocalCache<TournamentTeam[]>(LOCAL_STORAGE_KEYS.TEAMS, []);
  const filtered = local.filter(t => t.id !== id);
  setLocalCache(LOCAL_STORAGE_KEYS.TEAMS, filtered);

  if (!isQuotaExhausted()) {
    try {
      await deleteDoc(doc(db, "teams", id));
    } catch (e) {}
  }
}

// --------------------------------------------------------
// أرشيف المسابقات والبطولات السابقة (Tournament Archives)
// --------------------------------------------------------
export async function fetchTournamentArchives(): Promise<TournamentArchiveItem[]> {
  const local = getLocalCache<TournamentArchiveItem[]>(LOCAL_STORAGE_KEYS.ARCHIVES, []);

  if (isQuotaExhausted()) {
    return local;
  }

  try {
    const snap = await getDocs(collection(db, "tournament_archives"));
    if (snap && !snap.empty) {
      const list: TournamentArchiveItem[] = [];
      snap.forEach(d => {
        list.push({ ...(d.data() as TournamentArchiveItem), id: d.id });
      });
      setLocalCache(LOCAL_STORAGE_KEYS.ARCHIVES, list);
      return list;
    }
  } catch (e) {
    console.warn("fetchTournamentArchives notice:", e);
  }

  return local;
}

export async function saveTournamentArchiveDoc(archive: TournamentArchiveItem): Promise<void> {
  const local = getLocalCache<TournamentArchiveItem[]>(LOCAL_STORAGE_KEYS.ARCHIVES, []);
  local.unshift(archive);
  setLocalCache(LOCAL_STORAGE_KEYS.ARCHIVES, local);

  if (!isQuotaExhausted()) {
    try {
      await setDoc(doc(db, "tournament_archives", archive.id), archive, { merge: true });
    } catch (e) {}
  }
}
