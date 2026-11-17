const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function minutesOf(value) {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
}

export function formatClock(value) {
  const total = minutesOf(value);
  if (total === null) return "";
  const hours = Math.floor(total / 60);
  return `${hours % 12 || 12}:${String(total % 60).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

// "22:00" -> "10 pm", "22:30" -> "10:30 pm" (the short form used on the cards)
export function formatShort(value) {
  const total = minutesOf(value);
  if (total === null) return "";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours % 12 || 12}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""} ${hours >= 12 ? "pm" : "am"}`;
}

// Works out "Open now / Closed / Opens at 9:00 AM" from the listing's weekly hours, in Indian time.
export function openStatus(business, now = new Date()) {
  const hours = business?.workingHours;
  if (!Array.isArray(hours) || !hours.length) return { label: "Not listed", tone: "neutral" };
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: business.timeZone || "Asia/Kolkata", weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  const day = String(get("weekday") || "").toLowerCase();
  const current = (Number(get("hour")) % 24) * 60 + Number(get("minute"));
  const yesterday = DAY_NAMES[(DAY_NAMES.indexOf(day) + 6) % 7];
  const today = hours.find((entry) => entry.day === day);
  const previous = hours.find((entry) => entry.day === yesterday);

  // A late-night shift that started yesterday can still be running after midnight.
  const prevOpens = minutesOf(previous?.opens);
  const prevCloses = minutesOf(previous?.closes);
  if (previous && !previous.isClosed && !previous.is24Hours && prevOpens !== null && prevCloses !== null && prevCloses < prevOpens && current < prevCloses) {
    return { label: "Open now", tone: "open", detail: `Closes ${formatClock(previous.closes)}`, until: formatShort(previous.closes), minutesLeft: prevCloses - current };
  }
  if (!today || today.isClosed) return { label: "Closed today", tone: "closed" };
  if (today.is24Hours) return { label: "Open now", tone: "open", detail: "Open 24 hours" };
  const opens = minutesOf(today.opens);
  const closes = minutesOf(today.closes);
  if (opens === null || closes === null) return { label: "Not listed", tone: "neutral" };
  const overnight = closes <= opens;
  const isOpen = overnight ? current >= opens || current < closes : current >= opens && current < closes;
  if (isOpen) {
    const breakStart = minutesOf(today.breakStart);
    const breakEnd = minutesOf(today.breakEnd);
    if (breakStart !== null && breakEnd !== null && current >= breakStart && current < breakEnd) {
      return { label: "On a break", tone: "neutral", detail: `Back at ${formatClock(today.breakEnd)}` };
    }
    const minutesLeft = (closes - current + 1440) % 1440;
    return { label: "Open now", tone: "open", detail: `Closes ${formatClock(today.closes)}`, until: formatShort(today.closes), minutesLeft };
  }
  if (current < opens) return { label: `Opens ${formatClock(today.opens)}`, tone: "neutral" };
  return { label: "Closed now", tone: "closed" };
}
