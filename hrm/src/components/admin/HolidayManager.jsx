// components/HolidayManager.jsx
import { useState, useMemo } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";

const HOLIDAYS_QUERY = gql`
  query Holidays {
    holidays {
      date
      description
    }
  }
`;

const TOGGLE_HOLIDAY = gql`
  mutation ToggleHoliday($date: String!, $description: String) {
    toggleHoliday(date: $date, description: $description)
  }
`;

const WORKING_HOURS_QUERY = gql`
  query WorkingHours {
    workingHours {
      monday
      tuesday
      wednesday
      thursday
      friday
      saturday
    }
  }
`;

const SET_WORKING_HOURS = gql`
  mutation SetWorkingHours(
    $monday: String
    $tuesday: String
    $wednesday: String
    $thursday: String
    $friday: String
    $saturday: String
  ) {
    setWorkingHours(
      monday: $monday
      tuesday: $tuesday
      wednesday: $wednesday
      thursday: $thursday
      friday: $friday
      saturday: $saturday
    )
  }
`;

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const DAY_ABBR = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const DAYS_OF_WEEK = ["monday","tuesday","wednesday","thursday","friday","saturday"];

function getCalendarDays(year, month) {
  // Returns array of {dateStr, day} for a month, padded to start on Sunday
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ dateStr, day: d, dayOfWeek: (firstDay + d - 1) % 7 });
  }
  return cells;
}

export default function HolidayManager() {
  const [descInput, setDescInput] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [whForm, setWhForm] = useState({
    monday: "", tuesday: "", wednesday: "",
    thursday: "", friday: "", saturday: "",
  });
  const [whSaved, setWhSaved] = useState(false);

  const { data: hData, refetch: refetchHolidays } = useQuery(HOLIDAYS_QUERY);
  const { data: whData } = useQuery(WORKING_HOURS_QUERY, {
    onCompleted: (d) => {
      if (d?.workingHours) {
        setWhForm({
          monday: d.workingHours.monday || "",
          tuesday: d.workingHours.tuesday || "",
          wednesday: d.workingHours.wednesday || "",
          thursday: d.workingHours.thursday || "",
          friday: d.workingHours.friday || "",
          saturday: d.workingHours.saturday || "",
        });
      }
    },
  });

  const [toggleHoliday] = useMutation(TOGGLE_HOLIDAY);
  const [setWorkingHours, { loading: savingWH }] = useMutation(SET_WORKING_HOURS);

  const holidaySet = useMemo(() => {
    const s = new Set();
    hData?.holidays?.forEach((h) => s.add(h.date));
    return s;
  }, [hData]);

  const holidayDescMap = useMemo(() => {
    const m = {};
    hData?.holidays?.forEach((h) => { m[h.date] = h.description; });
    return m;
  }, [hData]);

  async function handleDayClick(dateStr, dayOfWeek) {
    if (dayOfWeek === 0) return; // Skip Sundays
    const isHoliday = holidaySet.has(dateStr);
    try {
      const desc = isHoliday ? "" : (descInput.trim() || "Holiday");
      await toggleHoliday({ variables: { date: dateStr, description: desc } });
      await refetchHolidays();
      setSuccessMsg(isHoliday ? `Removed holiday on ${dateStr}` : `Marked ${dateStr} as holiday`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleSaveWorkingHours() {
    try {
      await setWorkingHours({ variables: whForm });
      setWhSaved(true);
      setTimeout(() => setWhSaved(false), 3000);
    } catch (e) {
      alert(e.message);
    }
  }

  // Show 12 months starting from April 2026
  const months = [];
  for (let i = 0; i < 12; i++) {
    const year = i < 9 ? 2026 : 2027;
    const month = (3 + i) % 12;
    months.push({ year, month });
  }

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage holidays and working hours</p>
      </div>

      {/* ── Working Hours ── */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-title">Working Hours</div>
        <div className="card-sub">Set office working hours for each day (Mon–Sat)</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          {DAYS_OF_WEEK.map((day) => (
            <div key={day}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#666",
                  textTransform: "capitalize",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </label>
              <input
                value={whForm[day]}
                onChange={(e) =>
                  setWhForm((f) => ({ ...f, [day]: e.target.value }))
                }
                placeholder="e.g. 09:00 - 18:00"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #e5c6c6",
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="btn-primary"
            onClick={handleSaveWorkingHours}
            disabled={savingWH}
          >
            {savingWH ? "Saving..." : "Save Working Hours"}
          </button>
          {whSaved && (
            <span style={{ color: "#1a7a4a", fontSize: 13, fontWeight: 600 }}>
              ✓ Saved successfully
            </span>
          )}
        </div>
      </div>

      {/* ── Holiday Manager ── */}
      <div className="card">
        <div className="card-title">Holiday Calendar</div>
        <div className="card-sub">
          Click any working day to mark/unmark it as a holiday. Sundays are always off.
        </div>

        {/* Optional description for new holidays */}
        <div style={{ display: "flex", gap: 10, marginTop: 14, marginBottom: 20, alignItems: "center" }}>
          <input
            value={descInput}
            onChange={(e) => setDescInput(e.target.value)}
            placeholder="Holiday description (optional)"
            style={{
              padding: "8px 12px",
              border: "1px solid #e5c6c6",
              borderRadius: 6,
              fontSize: 13,
              width: 260,
            }}
          />
          <span style={{ fontSize: 12, color: "#999" }}>
            Applied to next day you click
          </span>
        </div>

        {successMsg && (
          <div
            style={{
              background: "#eafaf1",
              border: "1px solid #abebc6",
              color: "#1a7a4a",
              borderRadius: 6,
              padding: "8px 14px",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            ✓ {successMsg}
          </div>
        )}

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 14, background: "#fdecea", border: "1px solid #e57373", borderRadius: 3, display: "inline-block" }} />
            Holiday
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 14, background: "#f5f5f5", borderRadius: 3, display: "inline-block" }} />
            Sunday (auto off)
          </span>
        </div>

        {/* 12-month calendar grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 24,
          }}
        >
          {months.map(({ year, month }) => {
            const cells = getCalendarDays(year, month);
            return (
              <div key={`${year}-${month}`}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#2d0a0a",
                    marginBottom: 8,
                    textAlign: "center",
                  }}
                >
                  {MONTH_NAMES[month]} {year}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: 2,
                  }}
                >
                  {DAY_ABBR.map((d) => (
                    <div
                      key={d}
                      style={{
                        textAlign: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        color: d === "Su" ? "#c0392b" : "#888",
                        padding: "2px 0",
                      }}
                    >
                      {d}
                    </div>
                  ))}
                  {cells.map((cell, idx) => {
                    if (!cell) {
                      return <div key={`empty-${idx}`} />;
                    }
                    const { dateStr, day, dayOfWeek } = cell;
                    const isSun = dayOfWeek === 0;
                    const isHol = holidaySet.has(dateStr);
                    return (
                      <div
                        key={dateStr}
                        onClick={() => handleDayClick(dateStr, dayOfWeek)}
                        title={
                          isSun
                            ? "Sunday – weekly off"
                            : isHol
                            ? `Holiday: ${holidayDescMap[dateStr] || ""} (click to remove)`
                            : "Click to mark as holiday"
                        }
                        style={{
                          textAlign: "center",
                          padding: "4px 2px",
                          borderRadius: 4,
                          fontSize: 12,
                          cursor: isSun ? "default" : "pointer",
                          background: isSun
                            ? "#f5f5f5"
                            : isHol
                            ? "#fdecea"
                            : "transparent",
                          color: isSun ? "#bbb" : isHol ? "#c0392b" : "#333",
                          border: isHol ? "1px solid #e57373" : "1px solid transparent",
                          fontWeight: isHol ? 700 : 400,
                          userSelect: "none",
                          transition: "background 0.15s",
                        }}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}