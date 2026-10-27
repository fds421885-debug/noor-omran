// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// لوحة تحكم المشرف والمعلمين (Supervisor & Teacher Dashboard - 8 Tabs)
// ========================================================

import React, { useState } from "react";
import { useApp } from "../../context/AppContext.tsx";
import { TACTICAL_CARDS } from "../../../cards-data.js";
import { TacticalCard } from "../../types.ts";

export const SupervisorDashboard: React.FC = () => {
  const {
    currentUser,
    participants,
    deleteParticipant,
    quizzes,
    deleteQuiz,
    addOrUpdateQuiz,
    liveRooms,
    deleteLiveRoom,
    joinLiveRoom,
    teams,
    deleteTeam,
    pastTournaments,
    openModal,
    logoutUser,
    schools,
    grades
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    "accounts" | "quizzes" | "liveRooms" | "teams" | "honor" | "stats" | "cardsCatalog" | "pastTournaments"
  >("accounts");

  // تصفية الحسابات
  const [accountSearch, setAccountSearch] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<string>("");

  const filteredAccounts = participants.filter(p => {
    if (accountSearch && !p.name.toLowerCase().includes(accountSearch.toLowerCase())) return false;
    if (roleFilter && p.role !== roleFilter) return false;
    if (gradeFilter && p.grade !== gradeFilter) return false;
    return true;
  });

  // تصفية البطاقات التكتيكية
  const [cardFilter, setCardFilter] = useState<string>("all");
  const filteredCards = (TACTICAL_CARDS as TacticalCard[]).filter(c => {
    if (cardFilter === "all") return true;
    if (cardFilter === "buff" || cardFilter === "risk") return c.type === cardFilter;
    if (cardFilter === "instant" || cardFilter === "cycle") return c.scope === cardFilter;
    if (cardFilter === "timer" || cardFilter === "oral" || cardFilter === "mcq") return c.applicableTo === cardFilter || c.applicableTo === "all";
    return true;
  });

  // تصفية أرشيف البطولات
  const [archiveSearch, setArchiveSearch] = useState<string>("");
  const filteredArchives = pastTournaments.filter(a => {
    if (!archiveSearch) return true;
    const s = archiveSearch.toLowerCase();
    return a.roomTitle.toLowerCase().includes(s) || a.winnerTeam?.name.toLowerCase().includes(s) || a.supervisorName?.toLowerCase().includes(s);
  });

  // تصفية لوحة الشرف
  const [honorGradeFilter, setHonorGradeFilter] = useState<string>("");
  const sortedHonorStudents = [...participants]
    .filter(p => p.role === "student")
    .filter(p => !honorGradeFilter || p.grade === honorGradeFilter)
    .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

  const totalStudents = participants.filter(p => p.role === "student").length;
  const newStudentsCount = participants.filter(p => p.role === "student" && p.firstLoginAt).length;

  return (
    <section id="supervisorSection" className="view-section active">
      <div className="supervisor-wrapper">
        
        {/* بنر الترحيب */}
        <div className="welcome-banner">
          <div className="banner-badge-icon">
            <i className="fa-solid fa-crown"></i>
          </div>
          <div className="banner-content">
            <span className="role-pill">
              <i className="fa-solid fa-shield-halved"></i>
              {currentUser?.role === "supervisor" ? "المشرف العام المعتمد" : currentUser?.role === "teacher" ? "معلم / لجنة تحكيم" : "شاشة العرض المباشر"}
            </span>
            <h2 className="welcome-title">
              لوحة الإدارة والتحكم الشاملة
            </h2>
            <p className="supervisor-name-highlight">
              المسؤول الحالي: <strong>{currentUser?.name}</strong>
            </p>
            <p className="welcome-text">
              منصة مسابقة نور البيان للعام الدراسي 1448 - 1449 هـ.
            </p>
          </div>
          <div className="banner-action">
            <button
              type="button"
              className="btn-duo-outline"
              onClick={logoutUser}
              style={{ borderColor: "#ff4b4b", color: "#ff4b4b" }}
            >
              <i className="fa-solid fa-arrow-right-from-bracket"></i> خروج
            </button>
          </div>
        </div>

        {/* بطاقات الإحصائيات السريعة */}
        <div className="stats-cards-grid">
          <div className="stat-card green">
            <div className="stat-icon"><i className="fa-solid fa-user-graduate"></i></div>
            <div className="stat-info">
              <span className="stat-label">إجمالي الطلاب المشاركين</span>
              <span className="stat-number">{totalStudents}</span>
            </div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-icon"><i className="fa-solid fa-wand-magic-sparkles"></i></div>
            <div className="stat-info">
              <span className="stat-label">مسجلين جدد هذا العام</span>
              <span className="stat-number">{newStudentsCount}</span>
            </div>
          </div>
          <div className="stat-card blue">
            <div className="stat-icon"><i className="fa-solid fa-tv"></i></div>
            <div className="stat-info">
              <span className="stat-label">المسابقات الحية والنشطة</span>
              <span className="stat-number">{liveRooms.length}</span>
            </div>
          </div>
          <div className="stat-card purple">
            <div className="stat-icon"><i className="fa-solid fa-book-quran"></i></div>
            <div className="stat-info">
              <span className="stat-label">نماذج الاختبارات المعتمدة</span>
              <span className="stat-number">{quizzes.length}</span>
            </div>
          </div>
        </div>

        {/* شريط التبويبات الـ 8 بأسلوب دولينجو المعتمد */}
        <div className="duo-tabs-bar">
          <button
            type="button"
            className={`tab-btn ${activeTab === "accounts" ? "active" : ""}`}
            onClick={() => setActiveTab("accounts")}
          >
            <i className="fa-solid fa-users-gear"></i>
            <span>إدارة الحسابات</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "quizzes" ? "active" : ""}`}
            onClick={() => setActiveTab("quizzes")}
          >
            <i className="fa-solid fa-book-bookmark"></i>
            <span>بنك الاختبارات</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "liveRooms" ? "active" : ""}`}
            onClick={() => setActiveTab("liveRooms")}
          >
            <i className="fa-solid fa-tv"></i>
            <span>المسابقات الحية</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "teams" ? "active" : ""}`}
            onClick={() => setActiveTab("teams")}
          >
            <i className="fa-solid fa-users-line"></i>
            <span>نظام الفرق والتصفيات</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "honor" ? "active" : ""}`}
            onClick={() => setActiveTab("honor")}
          >
            <i className="fa-solid fa-trophy"></i>
            <span>لوحة الشرف</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "stats" ? "active" : ""}`}
            onClick={() => setActiveTab("stats")}
          >
            <i className="fa-solid fa-chart-pie"></i>
            <span>الإحصائيات</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "cardsCatalog" ? "active" : ""}`}
            onClick={() => setActiveTab("cardsCatalog")}
          >
            <i className="fa-solid fa-bolt"></i>
            <span>بنك البطاقات (40)</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "pastTournaments" ? "active" : ""}`}
            onClick={() => setActiveTab("pastTournaments")}
          >
            <i className="fa-solid fa-box-archive"></i>
            <span>مسابقات سابقة</span>
          </button>
        </div>

        {/* ═══ التبويب 1: إدارة الحسابات ═══ */}
        {activeTab === "accounts" && (
          <div className="tab-content-panel active">
            <div className="tab-toolbar">
              <div className="toolbar-search">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input
                  type="text"
                  placeholder="ابحث بالاسم الكامل..."
                  className="form-control"
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                />
              </div>

              <div className="toolbar-filters">
                <select
                  className="form-control form-select"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="">جميع الأدوار</option>
                  <option value="student">طالب</option>
                  <option value="teacher">معلم</option>
                  <option value="supervisor">مشرف</option>
                  <option value="presenter">عارض</option>
                </select>

                <select
                  className="form-control form-select"
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                >
                  <option value="">جميع الصفوف</option>
                  {grades.map((g, i) => (
                    <option key={i} value={g}>{g}</option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn-duo-green btn-sm"
                  onClick={() => openModal("accountModal")}
                >
                  <i className="fa-solid fa-user-plus"></i> إضافة حساب
                </button>

                <button
                  type="button"
                  className="btn-duo-purple btn-sm"
                  onClick={() => openModal("schoolsGradesModal")}
                >
                  <i className="fa-solid fa-school-flag"></i> إدارة المدارس والصفوف
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="duo-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الاسم الرباعي</th>
                    <th>الصفة / الدور</th>
                    <th>المدرسة / المركز</th>
                    <th>الصف / الفئة</th>
                    <th>النقاط</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                        لا توجد حسابات مطابقة لمعايير البحث
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acc, idx) => (
                      <tr key={acc.id}>
                        <td>{idx + 1}</td>
                        <td><strong>{acc.name}</strong></td>
                        <td>
                          <span className={`role-badge-tag ${acc.role}`}>
                            {acc.role === "supervisor" ? "مشرف" : acc.role === "teacher" ? "معلم" : acc.role === "presenter" ? "عارض" : "طالب"}
                          </span>
                        </td>
                        <td>{acc.school || "--"}</td>
                        <td>{acc.grade || "--"}</td>
                        <td style={{ fontWeight: 800, color: "#ca8a04" }}>{acc.totalScore || 0}</td>
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              className="btn-icon-action edit"
                              onClick={() => openModal("accountModal", acc)}
                              title="تعديل الحساب"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button
                              type="button"
                              className="btn-icon-action delete"
                              onClick={() => {
                                if (window.confirm(`هل أنت متأكد من حذف حساب: ${acc.name}؟`)) {
                                  deleteParticipant(acc.id);
                                }
                              }}
                              title="حذف الحساب"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ التبويب 2: بنك الاختبارات ═══ */}
        {activeTab === "quizzes" && (
          <div className="tab-content-panel active">
            <div className="tab-toolbar" style={{ justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontWeight: 900, color: "#1e293b" }}>
                <i className="fa-solid fa-book-bookmark" style={{ color: "var(--duo-blue)" }}></i> بنك نماذج وأسئلة نور البيان
              </h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="btn-duo-green btn-sm"
                  onClick={() => openModal("manualQuizModal")}
                >
                  <i className="fa-solid fa-plus"></i> إنشاء اختبار يدوياً
                </button>
                <button
                  type="button"
                  className="btn-duo-purple btn-sm"
                  onClick={() => openModal("aiQuizModal")}
                >
                  <i className="fa-solid fa-wand-magic-sparkles"></i> توليد بالذكاء الاصطناعي
                </button>
              </div>
            </div>

            <div className="quizzes-grid" style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", marginTop: "20px" }}>
              {quizzes.map(quiz => {
                const totalQ = quiz.sections?.reduce((sum, s) => sum + (s.questions?.length || 0), 0) || 0;
                return (
                  <div key={quiz.id} className="quiz-card-admin" style={{ background: "#ffffff", border: "2px solid #e2e8f0", borderRadius: "18px", padding: "18px", position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "4px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: 800 }}>
                        {quiz.targetGrade}
                      </span>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 800, color: quiz.allowPractice ? "#15803d" : "#64748b", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={quiz.allowPractice}
                          onChange={(e) => {
                            addOrUpdateQuiz({ ...quiz, allowPractice: e.target.checked });
                          }}
                        />
                        <span>تدريب ذاتي</span>
                      </label>
                    </div>

                    <h4 style={{ margin: "0 0 10px", fontSize: "17px", fontWeight: 900, color: "#0f172a" }}>
                      {quiz.title}
                    </h4>

                    <div style={{ display: "flex", gap: "15px", fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
                      <span><i className="fa-solid fa-layer-group"></i> {quiz.sections?.length || 0} أقسام</span>
                      <span><i className="fa-solid fa-question-circle"></i> {totalQ} أسئلة</span>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="btn-duo-outline btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => openModal("manualQuizModal", quiz)}
                      >
                        <i className="fa-solid fa-pen"></i> تعديل
                      </button>
                      <button
                        type="button"
                        className="btn-duo-outline btn-sm"
                        style={{ borderColor: "#ff4b4b", color: "#ff4b4b" }}
                        onClick={() => {
                          if (window.confirm(`هل أنت متأكد من حذف اختبار: ${quiz.title}؟`)) {
                            deleteQuiz(quiz.id);
                          }
                        }}
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ التبويب 3: المسابقات الحية ═══ */}
        {activeTab === "liveRooms" && (
          <div className="tab-content-panel active">
            <div className="tab-toolbar" style={{ justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, color: "#1e293b" }}>
                  <i className="fa-solid fa-tv" style={{ color: "var(--duo-green)" }}></i> مسرح المسابقات الحية
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b", fontWeight: 700 }}>
                  أنشئ مسابقة فردية مباشرة أو بطولة تصفيات جماعية للفرق المتنافسة
                </p>
              </div>

              <button
                type="button"
                className="btn-duo-green"
                onClick={() => openModal("createRoomModal")}
              >
                <i className="fa-solid fa-plus"></i> إنشاء غرفة مسابقة جديدة
              </button>
            </div>

            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", marginTop: "20px" }}>
              {liveRooms.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "36px", background: "#f8fafc", borderRadius: "16px", color: "#64748b", fontWeight: 700 }}>
                  <i className="fa-solid fa-tv" style={{ fontSize: "36px", color: "#cbd5e1", marginBottom: "12px", display: "block" }}></i>
                  لا توجد غرف نشطة حالياً. اضغط على زر "إنشاء غرفة مسابقة جديدة" للبدء.
                </div>
              ) : (
                liveRooms.map(room => (
                  <div key={room.id} style={{ background: "#ffffff", border: "2px solid #e2e8f0", borderRadius: "18px", padding: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontWeight: 900, fontSize: "16px", color: "#0f172a" }}>{room.title}</span>
                      <span style={{
                        background: room.type === "tournament" ? "#fef3c7" : "#dcfce7",
                        color: room.type === "tournament" ? "#b45309" : "#15803d",
                        padding: "3px 10px",
                        borderRadius: "10px",
                        fontSize: "12px",
                        fontWeight: 800
                      }}>
                        {room.type === "tournament" ? "بطولة تصفيات" : "مسابقة فردية"}
                      </span>
                    </div>

                    <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "14px" }}>
                      رمز الغرفة: <strong style={{ color: "#0f172a", fontSize: "15px" }}>#{room.code}</strong> • المشرف: {room.leaderName}
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="btn-duo-green btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => joinLiveRoom(room.id)}
                      >
                        <i className="fa-solid fa-play"></i> دخول المسرح الحي
                      </button>
                      <button
                        type="button"
                        className="btn-duo-outline btn-sm"
                        style={{ borderColor: "#ff4b4b", color: "#ff4b4b" }}
                        onClick={() => {
                          if (window.confirm(`هل أنت متأكد من إغلاق وحذف غرفة: ${room.title}؟`)) {
                            deleteLiveRoom(room.id);
                          }
                        }}
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ═══ التبويب 4: نظام الفرق والتصفيات ═══ */}
        {activeTab === "teams" && (
          <div className="tab-content-panel active">
            <div className="tab-toolbar" style={{ justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, color: "#1e293b" }}>
                  <i className="fa-solid fa-users-line" style={{ color: "var(--duo-purple)" }}></i> نظام الفرق والبطولات الإقصائية
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b", fontWeight: 700 }}>
                  تشكيل الفرق وتوزيع الطلاب لبطولات المواجهات المباشرة
                </p>
              </div>

              <button
                type="button"
                className="btn-duo-purple"
                onClick={() => openModal("teamModal")}
              >
                <i className="fa-solid fa-plus"></i> إضافة فريق جديد
              </button>
            </div>

            <div style={{ display: "grid", gap: "18px", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", marginTop: "20px" }}>
              {teams.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "36px", background: "#f8fafc", borderRadius: "16px", color: "#64748b", fontWeight: 700 }}>
                  لم يتم إضافة أي فرق للمسابقة بعد. اضغط "إضافة فريق جديد" لتكوين فرق المتسابقين.
                </div>
              ) : (
                teams.map(team => (
                  <div key={team.id} style={{ background: "#ffffff", border: `2.5px solid ${team.color || '#3b82f6'}`, borderRadius: "18px", padding: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <strong style={{ fontSize: "18px", color: "#0f172a" }}>{team.name}</strong>
                      <span style={{ background: "#f1f5f9", padding: "4px 10px", borderRadius: "10px", fontSize: "12.5px", fontWeight: 800 }}>
                        {team.members?.length || 0} طلاب
                      </span>
                    </div>

                    <div style={{ maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
                      {(team.members || []).map((m, idx) => (
                        <div key={idx} style={{ background: "#f8fafc", padding: "6px 10px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                          <i className="fa-solid fa-user-graduate" style={{ marginLeft: "8px", color: "var(--duo-blue)" }}></i>
                          {m.name}
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="btn-duo-outline btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => openModal("teamModal", team)}
                      >
                        <i className="fa-solid fa-pen"></i> تعديل الفريق
                      </button>
                      <button
                        type="button"
                        className="btn-duo-outline btn-sm"
                        style={{ borderColor: "#ff4b4b", color: "#ff4b4b" }}
                        onClick={() => {
                          if (window.confirm(`هل أنت متأكد من حذف فريق: ${team.name}؟`)) {
                            deleteTeam(team.id);
                          }
                        }}
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ═══ التبويب 5: لوحة الشرف ═══ */}
        {activeTab === "honor" && (
          <div className="tab-content-panel active">
            <div className="tab-toolbar" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <h3 style={{ margin: 0, fontWeight: 900, color: "#1e293b" }}>
                  <i className="fa-solid fa-trophy" style={{ color: "#ca8a04" }}></i> لوحة الشرف الرسمية
                </h3>
                <select
                  className="form-control form-select"
                  style={{ width: "180px" }}
                  value={honorGradeFilter}
                  onChange={(e) => setHonorGradeFilter(e.target.value)}
                >
                  <option value="">جميع الصفوف</option>
                  {grades.map((g, i) => (
                    <option key={i} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="table-responsive" style={{ marginTop: "16px" }}>
              <table className="duo-table">
                <thead>
                  <tr>
                    <th>الترتيب</th>
                    <th>اسم الطالب المتفوق</th>
                    <th>المدرسة / المركز</th>
                    <th>الصف / الفئة</th>
                    <th>مجموع النقاط الرسمي</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHonorStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                        لا توجد درجات مسجلة بعد
                      </td>
                    </tr>
                  ) : (
                    sortedHonorStudents.map((st, idx) => (
                      <tr key={st.id} style={{ background: idx === 0 ? "#fefce8" : undefined }}>
                        <td style={{ fontWeight: 900 }}>
                          {idx === 0 ? "🥇 الأول" : idx === 1 ? "🥈 الثاني" : idx === 2 ? "🥉 الثالث" : `${idx + 1}`}
                        </td>
                        <td><strong>{st.name}</strong></td>
                        <td>{st.school}</td>
                        <td>{st.grade}</td>
                        <td style={{ fontWeight: 900, color: "#ca8a04", fontSize: "16px" }}>
                          {st.totalScore || 0} نقطة
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ التبويب 6: الإحصائيات ═══ */}
        {activeTab === "stats" && (
          <div className="tab-content-panel active">
            <h3 style={{ fontWeight: 900, color: "#1e293b", marginBottom: "18px" }}>
              <i className="fa-solid fa-chart-pie" style={{ color: "var(--duo-blue)" }}></i> تقرير إحصائيات منصة نور البيان
            </h3>

            <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
              <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1.5px solid #e2e8f0" }}>
                <h4 style={{ margin: "0 0 10px", color: "#64748b", fontSize: "14px" }}>توزيع الطلاب حسب المدارس</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {schools.map((sch, i) => {
                    const count = participants.filter(p => p.role === "student" && p.school === sch).length;
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 700 }}>
                        <span>{sch}</span>
                        <strong style={{ color: "var(--duo-green)" }}>{count} طالب</strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1.5px solid #e2e8f0" }}>
                <h4 style={{ margin: "0 0 10px", color: "#64748b", fontSize: "14px" }}>توزيع الطلاب حسب الفئات والصفوف</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {grades.map((gr, i) => {
                    const count = participants.filter(p => p.role === "student" && p.grade === gr).length;
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 700 }}>
                        <span>{gr}</span>
                        <strong style={{ color: "var(--duo-blue)" }}>{count} طالب</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ التبويب 7: بنك البطاقات التكتيكية الـ 40 ═══ */}
        {activeTab === "cardsCatalog" && (
          <div className="tab-content-panel active">
            <div className="tab-toolbar" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, color: "#1e293b" }}>
                  <i className="fa-solid fa-bolt" style={{ color: "#9333ea" }}></i> بنك البطاقات التكتيكية الكامل (40 بطاقة تكتيكية)
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b", fontWeight: 700 }}>
                  بطاقات ذكية صُممت خصيصاً لإثارة الحماس والتحدي في مسابقات القرآن الكريم ونور البيان
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={`btn-duo-outline btn-sm ${cardFilter === "all" ? "active" : ""}`}
                  onClick={() => setCardFilter("all")}
                >
                  الكل (40)
                </button>
                <button
                  type="button"
                  className={`btn-duo-outline btn-sm ${cardFilter === "buff" ? "active" : ""}`}
                  onClick={() => setCardFilter("buff")}
                >
                  إيجابية (Buff)
                </button>
                <button
                  type="button"
                  className={`btn-duo-outline btn-sm ${cardFilter === "risk" ? "active" : ""}`}
                  onClick={() => setCardFilter("risk")}
                >
                  مخاطرة (Risk)
                </button>
                <button
                  type="button"
                  className={`btn-duo-outline btn-sm ${cardFilter === "timer" ? "active" : ""}`}
                  onClick={() => setCardFilter("timer")}
                >
                  المؤقت والوقت
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", marginTop: "20px" }}>
              {filteredCards.map(c => (
                <div
                  key={c.id}
                  style={{
                    background: "#ffffff",
                    border: c.type === "buff" ? "2px solid #a855f7" : "2px solid #f97316",
                    borderRadius: "16px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{
                        background: c.type === "buff" ? "#f3e8ff" : "#ffedd5",
                        color: c.type === "buff" ? "#7e22ce" : "#c2410c",
                        padding: "3px 8px",
                        borderRadius: "8px",
                        fontSize: "11.5px",
                        fontWeight: 900
                      }}>
                        #{c.id} • {c.type === "buff" ? "ميزة إيجابية" : "مخاطرة ذكية"}
                      </span>
                      <i className={`fa-solid ${c.icon}`} style={{ fontSize: "18px", color: c.type === "buff" ? "#9333ea" : "#ea580c" }}></i>
                    </div>

                    <h4 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 900, color: "#0f172a" }}>
                      {c.title}
                    </h4>
                    <p style={{ margin: "0 0 10px", fontSize: "12.5px", color: "#64748b", fontWeight: 700, lineHeight: 1.5 }}>
                      {c.desc}
                    </p>
                  </div>

                  <div style={{ fontSize: "11px", color: "#94a3b8", background: "#f8fafc", padding: "6px 8px", borderRadius: "8px", marginTop: "8px" }}>
                    {c.mechanicsText}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ التبويب 8: مسابقات سابقة ═══ */}
        {activeTab === "pastTournaments" && (
          <div className="tab-content-panel active">
            <div className="tab-toolbar" style={{ justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, color: "#1e293b" }}>
                  <i className="fa-solid fa-box-archive" style={{ color: "#10b981" }}></i> أرشيف المسابقات والبطولات السابقة
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b", fontWeight: 700 }}>
                  سجل البطولات المكتملة ونتائج منصات التتويج والمراكز الرسمية لجميع الفرق المشاركة
                </p>
              </div>

              <div style={{ width: "300px" }}>
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو الفريق..."
                  className="form-control"
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "grid", gap: "18px", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", marginTop: "20px" }}>
              {filteredArchives.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "36px", background: "#f8fafc", borderRadius: "16px", color: "#64748b", fontWeight: 700 }}>
                  لا توجد بطولات سابقة محفوظة في الأرشيف
                </div>
              ) : (
                filteredArchives.map(tour => (
                  <div key={tour.id} style={{ background: "#ffffff", border: "2px solid #cbd5e1", borderRadius: "18px", padding: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <strong style={{ fontSize: "17px", color: "#0f172a" }}>{tour.roomTitle}</strong>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>{tour.archivedAt?.slice(0, 10)}</span>
                    </div>

                    <div style={{ background: "#ecfdf5", border: "1.5px solid #a7f3d0", padding: "10px", borderRadius: "12px", marginBottom: "12px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 900, color: "#065f46" }}>
                        🏆 الفريق البطل: {tour.winnerTeam?.name}
                      </div>
                      <div style={{ fontSize: "12.5px", color: "#047857", fontWeight: 700 }}>
                        الدرجة: {tour.winnerTeam?.score} نقطة
                      </div>
                    </div>

                    {tour.mvpStudent && (
                      <div style={{ fontSize: "13px", color: "#854d0e", background: "#fefce8", padding: "6px 10px", borderRadius: "8px", marginBottom: "10px", fontWeight: 800 }}>
                        ⭐ نجم البطولة: {tour.mvpStudent.name} ({tour.mvpStudent.score} نقطة)
                      </div>
                    )}

                    <div style={{ fontSize: "12.5px", color: "#64748b" }}>
                      المشرف: <strong>{tour.supervisorName}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
