// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// نافذة إنشاء غرفة مسابقة حية جديدة (فردي أو بطولة فرق)
// ========================================================

import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext.tsx";
import { TournamentTeam } from "../../types.ts";

export const CreateRoomModal: React.FC = () => {
  const {
    activeModal,
    closeModal,
    createLiveRoom,
    quizzes,
    teams,
    participants,
    showToast
  } = useApp();

  const [title, setTitle] = useState<string>("");
  const [type, setType] = useState<"individual" | "tournament">("individual");
  const [quizId, setQuizId] = useState<string>("");
  const [selectedTeamAId, setSelectedTeamAId] = useState<string>("");
  const [selectedTeamBId, setSelectedTeamBId] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);

  useEffect(() => {
    if (quizzes.length > 0) {
      setQuizId(quizzes[0].id);
    }
    if (teams.length >= 2) {
      setSelectedTeamAId(teams[0].id);
      setSelectedTeamBId(teams[1].id);
    }
    setTitle(type === "tournament" ? "بطولة تصفيات الفرق - نور البيان" : "مسابقة نور البيان الحية");
  }, [type, quizzes, teams]);

  if (activeModal !== "createRoomModal") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);

    try {
      let matchTeams: TournamentTeam[] = [];
      if (type === "tournament") {
        let teamA = teams.find(t => t.id === selectedTeamAId);
        let teamB = teams.find(t => t.id === selectedTeamBId);

        // إذا لم تكن هناك فرق كافية مسجلة، نقوم بإنشاء فريقين تلقائياً من الطلاب المسجلين
        if (!teamA || !teamB || teamA.id === teamB.id) {
          const students = participants.filter(p => p.role === "student");
          const half = Math.max(1, Math.floor(students.length / 2));
          const membersA = students.slice(0, half).map(s => ({ id: s.id, name: s.name, school: s.school, grade: s.grade }));
          const membersB = students.slice(half).map(s => ({ id: s.id, name: s.name, school: s.school, grade: s.grade }));

          teamA = {
            id: `team_auto_a_${Date.now()}`,
            name: "فريق الإتقان القرآني",
            color: "#3b82f6",
            members: membersA.length > 0 ? membersA : [{ id: "m1", name: "طالب أ" }, { id: "m2", name: "طالب ب" }],
            score: 0
          };
          teamB = {
            id: `team_auto_b_${Date.now()}`,
            name: "فريق فرسان الفرقان",
            color: "#22c55e",
            members: membersB.length > 0 ? membersB : [{ id: "m3", name: "طالب ج" }, { id: "m4", name: "طالب د" }],
            score: 0
          };
        }

        matchTeams = [
          { ...teamA, score: 0 },
          { ...teamB, score: 0 }
        ];
      }

      await createLiveRoom({
        title: title.trim(),
        type,
        quizId,
        teams: matchTeams,
        tournamentRound: 1,
        teamRoundStarted: false
      });

      closeModal();
    } catch (err: any) {
      console.error(err);
      showToast("تعذر إنشاء الغرفة", "fa-circle-xmark", "error");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="duo-modal-box">
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-tv" style={{ color: "var(--duo-green)" }}></i>
            إنشاء غرفة مسابقة حية جديدة
          </h3>
          <button type="button" className="btn-modal-close" onClick={closeModal}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body-form">
          <div className="input-group" style={{ marginBottom: "16px" }}>
            <label className="input-label" style={{ fontWeight: 800, color: "#1e293b", marginBottom: "8px" }}>
              نوع المسابقة
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              <label style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px",
                background: type === "individual" ? "#f0fdf4" : "#f8fafc",
                border: type === "individual" ? "2.5px solid #22c55e" : "1.5px solid #e2e8f0",
                borderRadius: "14px",
                cursor: "pointer",
                fontWeight: 900,
                color: "#166534"
              }}>
                <input
                  type="radio"
                  name="contestType"
                  value="individual"
                  checked={type === "individual"}
                  onChange={() => setType("individual")}
                />
                <i className="fa-solid fa-user"></i> فردية (طالب بطالب)
              </label>

              <label style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px",
                background: type === "tournament" ? "#fef3c7" : "#f8fafc",
                border: type === "tournament" ? "2.5px solid #f59e0b" : "1.5px solid #e2e8f0",
                borderRadius: "14px",
                cursor: "pointer",
                fontWeight: 900,
                color: "#b45309"
              }}>
                <input
                  type="radio"
                  name="contestType"
                  value="tournament"
                  checked={type === "tournament"}
                  onChange={() => setType("tournament")}
                />
                <i className="fa-solid fa-users-line"></i> بطولة تصفيات الفرق
              </label>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">عنوان المسابقة أو الغرفة <span className="required-star">*</span></label>
            <input
              type="text"
              className="form-control"
              placeholder="مثال: تصفيات نور البيان الكبرى"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">نموذج الاختبار المستخدم</label>
            <select
              className="form-control form-select"
              value={quizId}
              onChange={(e) => setQuizId(e.target.value)}
            >
              {quizzes.map(q => (
                <option key={q.id} value={q.id}>
                  {q.title} ({q.targetGrade})
                </option>
              ))}
            </select>
          </div>

          {type === "tournament" && (
            <div style={{ background: "#fefce8", border: "1.5px solid #fde047", borderRadius: "14px", padding: "14px", marginTop: "10px" }}>
              <div style={{ fontWeight: 800, color: "#854d0e", marginBottom: "10px" }}>
                <i className="fa-solid fa-shield-halved"></i> تحديد الفريقين المتنافسين:
              </div>

              {teams.length >= 2 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 800, color: "#713f12" }}>الفريق الأول (A):</label>
                    <select
                      className="form-control form-select"
                      value={selectedTeamAId}
                      onChange={(e) => setSelectedTeamAId(e.target.value)}
                    >
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.members?.length || 0} طلاب)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 800, color: "#713f12" }}>الفريق الثاني (B):</label>
                    <select
                      className="form-control form-select"
                      value={selectedTeamBId}
                      onChange={(e) => setSelectedTeamBId(e.target.value)}
                    >
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.members?.length || 0} طلاب)</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "12.5px", color: "#854d0e", fontWeight: 700 }}>
                  <i className="fa-solid fa-circle-info"></i> سيقوم النظام بتشكيل فريقين متوازنين تلقائياً من الطلاب المشاركين في المسابقة لضمان انطلاق فوري وسلس!
                </div>
              )}
            </div>
          )}

          <div className="modal-actions-flex" style={{ marginTop: "24px" }}>
            <button
              type="submit"
              className="btn-duo-green"
              disabled={isCreating}
            >
              <i className="fa-solid fa-play"></i>
              {isCreating ? "جاري الإنشاء..." : "إنشاء وبدء الغرفة"}
            </button>
            <button type="button" className="btn-duo-outline" onClick={closeModal}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
