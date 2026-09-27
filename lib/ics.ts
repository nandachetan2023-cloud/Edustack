function formatIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildIcsFile(event: { uid: string; title: string; description: string; startsAt: Date; durationMinutes?: number }) {
  const dtStart = formatIcsDate(event.startsAt);
  const end = new Date(event.startsAt.getTime() + (event.durationMinutes ?? 60) * 60 * 1000);
  const dtEnd = formatIcsDate(end);
  const dtStamp = formatIcsDate(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EduStack//Live Sessions//EN",
    "BEGIN:VEVENT",
    `UID:${event.uid}@edustack`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${event.title.replace(/\n/g, " ")}`,
    `DESCRIPTION:${event.description.replace(/\n/g, " ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function downloadIcsFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
