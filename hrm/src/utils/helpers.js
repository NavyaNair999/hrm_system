// ✅ IST TIMEZONE CONSTANT (single source of truth)
const IST = "Asia/Kolkata";

// ✅ Get Monday → Friday (current week, IST-safe)
export function getWeekDates() {
  const today = new Date();

  // Convert today to IST-normalized date
  const todayIST = new Date(
    today.toLocaleDateString("en-CA", { timeZone: IST })
  );

  const monday = new Date(todayIST);
  const day = monday.getDay();

  // Adjust to Monday (0=Sun, so handle properly)
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);

  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    return new Date(
      d.toLocaleDateString("en-CA", { timeZone: IST })
    );
  });
}

// ✅ Format date → YYYY-MM-DD (IST-safe)
export function fmt(d) {
  return new Date(d).toLocaleDateString("en-CA", {
    timeZone: IST,
  });
}

// ✅ Get today's IST date string
export function todayIST() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: IST,
  });
}

// ✅ Get current IST time
export function now() {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: IST,
  });
}

// ✅ Get initials (no change needed)
export function initials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ✅ OPTIONAL: Full month (IST-safe, useful for attendance table)
export function getMonthDates() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dates = [];

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);

    const formatted = d.toLocaleDateString("en-CA", {
      timeZone: IST,
    });

    dates.push(formatted);
  }

  return dates;
}

// ✅ OPTIONAL: From today → end of month
export function getMonthDatesFromToday() {
  const today = new Date();

  const todayDate = new Date(
    today.toLocaleDateString("en-CA", { timeZone: IST })
  );

  const year = todayDate.getFullYear();
  const month = todayDate.getMonth();
  const start = todayDate.getDate();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dates = [];

  for (let i = start; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);

    const formatted = d.toLocaleDateString("en-CA", {
      timeZone: IST,
    });

    dates.push(formatted);
  }

  return dates;
}