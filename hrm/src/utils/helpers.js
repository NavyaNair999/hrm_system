// ✅ IST TIMEZONE CONSTANT (single source of truth)
const IST = "Asia/Kolkata";

// ✅ Core helper — get current time shifted to IST via UTC offset math.
// This is the ONLY reliable way — avoids toLocaleDateString("en-CA") which
// returns wrong dates on many Windows/browser combinations.
function getNowIST() {
  const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC + 5:30
  return new Date(Date.now() + istOffset);
}

// ✅ Get today's IST date string → "YYYY-MM-DD"
export function todayIST() {
  return getNowIST().toISOString().split("T")[0];
}

// ✅ Format any date → "YYYY-MM-DD" in IST
export function fmt(d) {
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(new Date(d).getTime() + istOffset).toISOString().split("T")[0];
}

// ✅ Get Monday → Friday dates of current week (IST-safe)
export function getWeekDates() {
  const todayISO = todayIST(); // "YYYY-MM-DD"
  const [y, m, d] = todayISO.split("-").map(Number);

  // Build a local date from parts — avoids UTC shift when parsing YYYY-MM-DD
  const today = new Date(y, m - 1, d);
  const day = today.getDay(); // 0=Sun, 1=Mon...

  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  const monday = new Date(y, m - 1, d + diff);

  return Array.from({ length: 5 }, (_, i) => {
    return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
  });
}

// ✅ Get all dates in current month → ["YYYY-MM-DD", ...]
export function getMonthDates() {
  const todayISO = todayIST();
  const [y, m] = todayISO.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    const month = String(m).padStart(2, "0");
    return `${y}-${month}-${day}`;
  });
}

// ✅ From today → end of month → ["YYYY-MM-DD", ...]
export function getMonthDatesFromToday() {
  const todayISO = todayIST();
  const [y, m, d] = todayISO.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  return Array.from({ length: daysInMonth - d + 1 }, (_, i) => {
    const day = String(d + i).padStart(2, "0");
    const month = String(m).padStart(2, "0");
    return `${y}-${month}-${day}`;
  });
}

// ✅ Get current IST time string → "HH:MM AM/PM"
export function now() {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: IST,
  });
}

// ✅ Get initials from name
export function initials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}