// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// نافذة إضافة وتعديل الفرق (Team Modal)
// ========================================================

import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext.tsx";
import { TournamentTeam, TournamentTeamMember } from "../../types.ts";

const COLOR_OPTIONS = [
  { name: "أزرق", value: "#3b82f6" },
  { name: "أخضر", value: "#22c55e" },
  { name: "أحمر", value: "#ef4444" },
  { name: "ذهبي", value: "#f59e0b" },
  { name: "بنفسجي", value: "#a855f7" }
];

export const TeamModal: React.FC = () => {
  const {
    activeModal,
    closeModal,
    modalData,
    addOrUpdateTeam,
    participants
  } = useApp();

  const isEditing = !!(modalData && modalData.id);

  const [name, setName] = useState<string>("");
  const [color, setColor] = useState<string>("#3b82f6");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState<string>("");

  useEffect(() => {
    if (modalData) {
      setName(modalData.name || "");
      setColor(modalData.color || "#3b82f6");
      setSelectedStudentIds(modalData.members?.map((m: any) => m.id) || []);
    } else {
      setName("");
      setColor("#3b82f6");
      setSelectedStudentIds([]);
    }
  }, [modalData]);

  if (activeModal !== "teamModal") return null;

  const studentsList = participants.filter(p => p.role === "student");
  const filteredStudents = studentsList.filter(s =>
    !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const chosenMembers: TournamentTeamMember[] = studentsList
      .filter(s => selectedStudentIds.includes(s.id))
      .map(s => ({
        id: s.id,
        name: s.name,
        school: s.school,
        grade: s.grade
      }));

    const teamToSave: TournamentTeam = {
      id: isEditing ? modalData.id : `team_${Date.now()}`,
      name: name.trim(),
      color,
      members: chosenMembers,
      score: modalData?.score || 0
    };

    await addOrUpdateTeam(teamToSave);
    closeModal();
  };

  return (
    <div className="modal-overlay">
      <div className="duo-modal-box">
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-users-line" style={{ color: "var(--duo-purple)" }}></i>
            {isEditing ? "تعديل بيانات الفريق" : "إضافة فريق جديد"}
          </h3>
          <button type="button" className="btn-modal-close" onClick={closeModal}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body-form">
          <div className="input-group">
            <label className="input-label">اسم الفريق <span className="required-star">*</span></label>
            <input
              type="text"
              className="form-control"
              placeholder="مثال: فريق فرسان البيان"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">لون الشارة المعتمد للفريق</label>
            <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
              {COLOR_OPTIONS.map((c, i) => (
                <div
                  key={i}
                  onClick={() => setColor(c.value)}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: c.value,
                    cursor: "pointer",
                    border: color === c.value ? "3px solid #0f172a" : "2px solid #ffffff",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff"
                  }}
                  title={c.name}
                >
                  {color === c.value && <i className="fa-solid fa-check"></i>}
                </div>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">
              اختيار طلاب الفريق ({selectedStudentIds.length} طلاب محددين)
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="بحث في أسماء الطلاب..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              style={{ marginBottom: "8px" }}
            />

            <div style={{ maxHeight: "180px", overflowY: "auto", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {filteredStudents.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "10px", fontSize: "12.5px" }}>
                  لا يوجد طلاب مطابقين للبحث
                </div>
              ) : (
                filteredStudents.map(st => {
                  const isChecked = selectedStudentIds.includes(st.id);
                  return (
                    <label
                      key={st.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 12px",
                        background: isChecked ? "#f0fdf4" : "#ffffff",
                        border: isChecked ? "1.5px solid #86efac" : "1px solid #f1f5f9",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 700
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStudent(st.id)}
                      />
                      <span>{st.name}</span>
                      <span style={{ fontSize: "11px", color: "#64748b", marginRight: "auto" }}>
                        {st.school}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="modal-actions-flex" style={{ marginTop: "20px" }}>
            <button type="submit" className="btn-duo-purple">
              <i className="fa-solid fa-check"></i> حفظ الفريق
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
