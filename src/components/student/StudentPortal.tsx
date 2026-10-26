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
        
        {/* بطاقة تحية الطالب */}
        <div className="welcome-banner student-banner">
          <div className="banner-badge-icon student-cap">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>

          <div className="banner-content">
            <span className="role-pill student-pill">
              <i className="fa-solid fa-graduation-cap"></i> طالب مشارك
            </span>
            <h2 className="welcome-title">
              أهلاً بك يا بطل القرآن الكريم
            </h2>
            <p className="student-name-highlight">
              اسم المتسابق: <strong>{currentUser?.name}</strong>
            </p>
            <p className="welcome-text">
              مسابقة نور البيان للعام 1448 - 1449 هـ. نسأل الله لك التوفيق والتميز ونيل أعلى المراتب في كتاب الله.
            </p>
          </div>

          <div className="banner-action">
            <button
              className="btn-duo-outline"
              onClick={logoutUser}
              style={{ borderColor: "#ff4b4b", color: "#ff4b4b" }}
            >
              <i className="fa-solid fa-arrow-right-from-bracket"></i> تسجيل الخروج
            </button>
          </div>
        </div>

        {/* بطاقة تفاصيل تسجيل المتسابق */}
        <div className="student-status-card">
          <div className="card-title-flex">
            <h3><i className="fa-solid fa-certificate"></i> بطاقة المشاركة المعتمدة</h3>
            <span className="badge-active"><i className="fa-solid fa-circle-check"></i> مسجل ومعتمد</span>
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
            <div className="info-block" style={{ background: "#fefce8", border: "1.5px solid #fde047", borderRadius: "10px", padding: "8px 12px" }}>
              <span className="info-label" style={{ color: "#854d0e" }}>
                <i className="fa-solid fa-trophy" style={{ color: "#eab308" }}></i> نقاط المسابقة الرسمية:
              </span>
              <span className="info-val" style={{ fontWeight: 900, color: "#ca8a04", fontSize: "18px" }}>
                {currentUser?.totalScore || 0} نقطة
              </span>
            </div>
            <div className="info-block">
              <span className="info-label">حالة الحساب:</span>
              <span className="info-val">نشط وموثق</span>
            </div>
          </div>
        </div>

        {/* المسابقات الحية الجارية */}
        <div className="student-live-rooms-section">
          <div className="student-live-card">
            <div className="student-live-header">
              <span className="room-pulse-dot" title="بث حي"></span>
              <h4><i className="fa-solid fa-tv" style={{ color: "#ca8a04" }}></i> المسابقات المباشرة في المسرح الحي:</h4>
            </div>

            {liveRooms.length === 0 ? (
              <div style={{ textAlign: "center", padding: "18px", color: "#64748b", fontWeight: 700 }}>
                لا توجد مسابقة حية منشأة حالياً، يمكنك التدريب أدناه ريثما تبدأ المسابقة.
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
            <form onSubmit={handleJoinByCode} className="student-quick-join-bar" style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1.5px dashed #fde047", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: "13.5px", color: "#713f12" }}>
                <i className="fa-solid fa-hashtag"></i> أو أدخل رمز الغرفة مباشرة:
              </span>
              <input
                type="text"
                placeholder="مثال: 123456"
                className="input-room-code-clean"
                maxLength={20}
                value={codeInputValue}
                onChange={(e) => setCodeInputValue(e.target.value)}
                style={{ color: "#0f172a", background: "#ffffff", fontSize: "18px", fontWeight: 900, textAlign: "center", direction: "ltr", minWidth: "160px" }}
              />
              <button type="submit" className="btn-duo-green btn-sm">
                <i className="fa-solid fa-arrow-right-to-bracket"></i> دخول الغرفة
              </button>
            </form>
          </div>
        </div>

        {/* التدريب الذاتي */}
        <div className="practice-tests-section" style={{ marginTop: "30px" }}>
          <div className="section-title-with-badge">
            <h3><i className="fa-solid fa-dumbbell"></i> التدريب الذاتي والتمرين على الأسئلة</h3>
            <span className="practice-badge">متاح مجاناً لا يؤثر على درجات المسابقة الرسمية</span>
          </div>
          <p className="section-hint-text">
            هذه الاختبارات المخصصة لفئتك مصرح بها للتدريب الذاتي لتثبيت الحفظ ومراجعة أحكام نور البيان.
          </p>

          <div className="practice-quizzes-grid" style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", marginTop: "16px" }}>
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
                    <i className="fa-solid fa-play"></i> بدء التدريب الذاتي الآن
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* لوحة الشرف */}
        <div className="student-honor-board-section" style={{ marginTop: "30px" }}>
          <div className="section-title-with-badge">
            <h3><i className="fa-solid fa-trophy" style={{ color: "#eab308" }}></i> لوحة الشرف — ترتيب المتسابقين</h3>
            <span className="practice-badge" style={{ background: "#fef08a", color: "#854d0e", borderColor: "#ca8a04" }}>
              نقاط معتمدة ومحفوظة
            </span>
          </div>
          <p className="section-hint-text">
            يتم تحديث الترتيب والنقاط تلقائياً ومباشرة مع كل مسابقة تجريها.
          </p>

          <div className="honor-board-tab-list" style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
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

        {/* أرشيف البطولات السابقة */}
        <div className="student-past-tournaments-section" style={{ marginTop: "30px" }}>
          <div className="section-title-with-badge">
            <h3><i className="fa-solid fa-box-archive" style={{ color: "#2563eb" }}></i> أرشيف المسابقات والبطولات السابقة</h3>
            <span className="practice-badge" style={{ background: "#dbeafe", color: "#1e40af", borderColor: "#93c5fd" }}>
              تاريخ الأبطال
            </span>
          </div>
          <p className="section-hint-text">
            سجل البطولات ومراكز الفرق المتوجة في مسابقات نور البيان السابقة.
          </p>

          <div className="past-tournaments-cards-grid" style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", marginTop: "14px" }}>
            {pastTournaments.length === 0 ? (
              <div style={{ color: "#94a3b8", fontWeight: 700, padding: "12px" }}>لا توجد بطولات سابقة محفوظة بعد</div>
            ) : (
              pastTournaments.slice(0, 4).map(tour => (
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
    </section>
  );
};
