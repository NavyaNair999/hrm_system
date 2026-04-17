export function getWeekDates() {
  const today = new Date(2026, 3, 16); // April 16, 2026 (Thu)
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function fmt(d) {
  return d.toISOString().split("T")[0];
}

export function initials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function now() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}