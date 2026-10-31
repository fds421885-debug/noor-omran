// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// بوابة الطالب المشارك والتدريب الذاتي (Student Portal)
// ========================================================

import React, { useState } from "react";
import { useApp } from "../../context/AppContext.tsx";

export const StudentPortal: React.FC = () => {
  const {
    currentUser,
    liveRooms,
    quizzes,
    participants,
    pastTournaments,
    joinLiveRoom,
    logoutUser,
    openModal
  } = useApp();

  const [codeInputValue, setCodeInputValue] = useState<string>("");
  const [studentTab, setStudentTab] = useState<"practice" | "honor" | "tournaments" | "profile">("practice");

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInputValue.trim()) return;
    await joinLiveRoom(codeInputValue.trim());
  };

  // تصفية اختبارات التدريب الذاتي المتاحة لصف الطالب
  const practiceQuizzes = quizzes.filter(q => q.allowPractice);

  // المتصدرون في لوحة الشرف
  const sortedStudents = [...participants]
    .filter(p => p.role === "student")
    .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
    .slice(0, 10);

  return (
    <section id="studentSection" className="view-section active">
      <div className="student-wrapper">
        
        {/* بطاقة تحية الطالب بثيم دولينجو */}
        <div className="welcome-banner student-banner">
          <div className="banner-badge-icon student-cap">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>

          <div className="banner-content">
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <span className="role-pill student-pill">
                <i className="fa-solid fa-graduation-cap"></i> طالب متسابق
              </span>
              <span className="badge-active" style={{ padding: "4px 10px", fontSize: "12px" }}>
                <i className="fa-solid fa-circle-check"></i> حساب موثق
              </span>
            </div>
            <h2 className="welcome-title" style={{ margin: "2px 0" }}>
              مرحباً بك يا بطل القرآن!
            </h2>
            <p className="student-name-highlight" style={{ margin: 0, fontSize: "17px" }}>
              المتسابق: <strong>{currentUser?.name}</strong>
            </p>
            <div className="student-quick-pills" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
              <span className="stat-pill-duo gold">
                <i className="fa-solid fa-trophy"></i>
                <span>الرصيد: <strong>{currentUser?.totalScore || 0}</strong> نقطة</span>
              </span>
              <span className="stat-pill-duo emerald">
                <i className="fa-solid fa-school"></i>
                <span>{currentUser?.school || "--"}</span>
              </span>
              <span className="stat-pill-duo teal">
                <i className="fa-solid fa-layer-group"></i>
                <span>{currentUser?.grade || "--"}</span>
              </span>
            </div>
          </div>

          <div className="banner-action">
            <button
              className="btn-duo-outline"
              onClick={logoutUser}
              style={{ borderColor: "#ff4b4b", color: "#ff4b4b" }}
            >
              <i className="fa-solid fa-arrow-right-from-bracket"></i> خروج
            </button>
          </div>
        </div>

        {/* شريط تبويبات بوابة الطالب بثيم دولينجو */}
        <nav className="student-duo-nav-tabs">
          <button
            type="button"
            className={`student-duo-tab-btn ${studentTab === "practice" ? "active" : ""}`}
            onClick={() => setStudentTab("practice")}
          >
            <i className="fa-solid fa-dumbbell"></i>
            <span>التدريب والمسابقات</span>
          </button>
          <button
            type="button"
            className={`student-duo-tab-btn ${studentTab === "honor" ? "active" : ""}`}
            onClick={() => setStudentTab("honor")}
          >
            <i className="fa-solid fa-trophy"></i>
            <span>لوحة الشرف</span>
          </button>
          <button
            type="button"
            className={`student-duo-tab-btn ${studentTab === "tournaments" ? "active" : ""}`}
            onClick={() => setStudentTab("tournaments")}
          >
            <i className="fa-solid fa-box-archive"></i>
            <span>سجل البطولات</span>
          </button>
          <button
            type="button"
            className={`student-duo-tab-btn ${studentTab === "profile" ? "active" : ""}`}
            onClick={() => setStudentTab("profile")}
          >
            <i className="fa-solid fa-id-card"></i>
            <span>بطاقتي وبياناتي</span>
          </button>
        </nav>

        {/* التبويب 1: التدريب والمسابقات */}
        {studentTab === "practice" && (
          <div className="student-tab-panel active">
            {/* المسابقات الحية الجارية */}
            <div className="student-live-rooms-section" style={{ marginBottom: "22px" }}>
              <div className="student-live-card">
                <div className="student-live-header">
                  <span className="room-pulse-dot" title="بث حي"></span>
                  <h4 style={{ margin: 0 }}>
                    <i className="fa-solid fa-tv" style={{ color: "#ca8a04" }}></i> مسابقة حية جارية الآن في المسرح!
                  </h4>
                </div>

                {liveRooms.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "16px", color: "#64748b", fontWeight: 700 }}>
                    لا توجد مسابقة حية الآن، يمكنك بدء التدريب الذاتي أدناه.
                  </div>
                ) : (
                  <div className="student-live-rooms-list" style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", marginTop: "12px" }}>
                    {liveRooms.map(room => (
                      <div
                        key={room.id}
                        className="live-room-card"
                        style={{ background: "#ffffff", border: "2px solid #fed7aa", borderRadius: "16px", padding: "14px" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontWeight: 900, color: "#9a3412" }}>{room.title}</span>
                          <span style={{ background: "#ffedd5", color: "#c2410c", padding: "3px 8px", borderRadius: "8px", fontSize: "12px", fontWeight: 800 }}>
                            {room.type === "tournament" ? "بطولة فرق" : "فردي"}
                          </span>
                        </div>
                        <div style={{ fontSize: "12.5px", color: "#64748b", marginBottom: "12px" }}>
                          رمز الغرفة: <strong style={{ color: "#0f172a" }}>#{room.code}</strong> • المشرف: {room.leaderName}
                        </div>
                        <button
                          type="button"
                          className="btn-duo-green btn-sm"
                          style={{ width: "100%" }}
                          onClick={() => joinLiveRoom(room.id)}
                        >
                          <i className="fa-solid fa-arrow-right-to-bracket"></i> دخول الغرفة الحية
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* دخول مباشر برمز الغرفة */}
                <form onSubmit={handleJoinByCode} className="student-quick-join-bar" style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1.5px dashed #fde047", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 800, fontSize: "13.5px", color: "#713f12" }}>
                    <i className="fa-solid fa-hashtag"></i> رمز الغرفة:
                  </span>
                  <input
                    type="text"
                    placeholder="123456"
                    className="input-room-code-clean"
                    maxLength={20}
                    value={codeInputValue}
                    onChange={(e) => setCodeInputValue(e.target.value)}
                    style={{ color: "#0f172a", background: "#ffffff", fontSize: "18px", fontWeight: 900, textAlign: "center", direction: "ltr", minWidth: "140px", padding: "6px 12px" }}
                  />
                  <button type="submit" className="btn-duo-green btn-sm">
                    <i className="fa-solid fa-arrow-right-to-bracket"></i> دخول
                  </button>
                </form>
              </div>
            </div>

            {/* التدريب الذاتي */}
            <div className="practice-tests-section">
              <div className="section-title-with-badge">
                <h3><i className="fa-solid fa-dumbbell"></i> التدريب الذاتي</h3>
                <span className="practice-badge">⚡ تدريب حر</span>
              </div>
              <p className="section-hint-text">
                تمرّن على أسئلة فئتك لتعزيز الحفظ وضبط أحكام نور البيان.
              </p>

              <div className="practice-quizzes-grid" style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                {practiceQuizzes.map(quiz => {
                  const qCount = quiz.sections?.reduce((sum, s) => sum + (s.questions?.length || 0), 0) || 0;
                  return (
                    <div key={quiz.id} className="quiz-card-duo">
                      <div className="quiz-card-badge">{quiz.targetGrade}</div>
                      <h4 className="quiz-card-title">{quiz.title}</h4>
                      <div className="quiz-card-meta">
                        <span><i className="fa-solid fa-layer-group"></i> {quiz.sections?.length || 0} أقسام</span>
                        <span><i className="fa-solid fa-question-circle"></i> {qCount} أسئلة</span>
                      </div>
                      <button
                        type="button"
                        className="btn-duo-blue btn-sm"
                        style={{ width: "100%", marginTop: "12px" }}
                        onClick={() => openModal("practiceQuiz", quiz)}
                      >
                        <i className="fa-solid fa-play"></i> ابدأ التدريب الآن
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* التبويب 2: لوحة الشرف */}
        {studentTab === "honor" && (
          <div className="student-tab-panel active">
            <div className="student-honor-board-section">
              <div className="section-title-with-badge">
                <h3><i className="fa-solid fa-trophy" style={{ color: "#eab308" }}></i> لوحة الشرف</h3>
                <span className="practice-badge" style={{ background: "#fef08a", color: "#854d0e", borderColor: "#ca8a04" }}>
                  🏆 ترتيب لحظي
                </span>
              </div>
              <p className="section-hint-text">
                ترتيب المتسابقين الأبطال بناءً على درجات المسابقات المعتمدة.
              </p>

              <div className="honor-board-tab-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {sortedStudents.map((st, idx) => (
                  <div
                    key={st.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: idx === 0 ? "#fefce8" : "#ffffff",
                      border: idx === 0 ? "2px solid #facc15" : "1.5px solid #e2e8f0",
                      padding: "12px 18px",
                      borderRadius: "14px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: idx === 0 ? "#facc15" : idx === 1 ? "#cbd5e1" : idx === 2 ? "#fdba74" : "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        color: "#0f172a"
                      }}>
                        {idx + 1}
                      </div>
                      <div>
                        <strong style={{ fontSize: "16px", color: "#1e293b" }}>{st.name}</strong>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{st.school} • {st.grade}</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 900, color: "#ca8a04", fontSize: "17px" }}>
                      {st.totalScore || 0} نقطة
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* التبويب 3: سجل البطولات */}
        {studentTab === "tournaments" && (
          <div className="student-tab-panel active">
            <div className="student-past-tournaments-section">
              <div className="section-title-with-badge">
                <h3><i className="fa-solid fa-box-archive" style={{ color: "#2563eb" }}></i> سجل البطولات</h3>
                <span className="practice-badge" style={{ background: "#dbeafe", color: "#1e40af", borderColor: "#93c5fd" }}>
                  🎖️ سجل الأبطال
                </span>
              </div>
              <p className="section-hint-text">
                تاريخ المسابقات ونتائج الفرق المتوجة في نور البيان.
              </p>

              <div className="past-tournaments-cards-grid" style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                {pastTournaments.length === 0 ? (
                  <div style={{ color: "#94a3b8", fontWeight: 700, padding: "12px" }}>لا توجد بطولات سابقة محفوظة بعد</div>
                ) : (
                  pastTournaments.slice(0, 8).map(tour => (
                    <div key={tour.id} style={{ background: "#ffffff", border: "1.5px solid #cbd5e1", borderRadius: "14px", padding: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <strong style={{ color: "#0f172a" }}>{tour.roomTitle}</strong>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>{tour.archivedAt?.slice(0, 10)}</span>
                      </div>
                      <div style={{ fontSize: "13px", color: "#166534", background: "#f0fdf4", padding: "6px 10px", borderRadius: "8px", fontWeight: 800 }}>
                        🏆 البطل: {tour.winnerTeam?.name} ({tour.winnerTeam?.score} نقطة)
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* التبويب 4: بطاقتي وبياناتي */}
        {studentTab === "profile" && (
          <div className="student-tab-panel active">
            <div className="student-status-card">
              <div className="card-title-flex">
                <h3><i className="fa-solid fa-id-card"></i> بطاقة المشاركة المعتمدة</h3>
                <span className="badge-active"><i className="fa-solid fa-circle-check"></i> مسجل رسمي</span>
              </div>
              <div className="info-grid">
                <div className="info-block">
                  <span className="info-label">المدرسة / المركز:</span>
                  <span className="info-val">{currentUser?.school || "--"}</span>
                </div>
                <div className="info-block">
                  <span className="info-label">الصف / الفئة:</span>
                  <span className="info-val">{currentUser?.grade || "--"}</span>
                </div>
                <div className="info-block" style={{ background: "#fefce8", border: "2px solid #fde047", borderRadius: "14px", padding: "12px 14px" }}>
                  <span className="info-label" style={{ color: "#854d0e" }}>
                    <i className="fa-solid fa-trophy" style={{ color: "#eab308" }}></i> نقاط المسابقة الرسمية:
                  </span>
                  <span className="info-val" style={{ fontWeight: 900, color: "#ca8a04", fontSize: "20px" }}>
                    {currentUser?.totalScore || 0} نقطة
                  </span>
                </div>
                <div className="info-block">
                  <span className="info-label">حالة الحساب:</span>
                  <span className="info-val" style={{ color: "#16a34a", fontWeight: 800 }}>جاهز للتنافس</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
