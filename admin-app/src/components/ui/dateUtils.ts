/**
 * Human-Readable Date & Time Utilities for Admin App
 */

/**
 * Formats a date or timestamp string into human-readable date & time (e.g. "1 Aug, 8:49 AM" or "15 Aug 2026, 8:49 AM")
 */
export const formatHumanDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);

    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const currentYear = new Date().getFullYear();

    let hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    const timePart = `${hours}:${mins} ${ampm}`;
    return year === currentYear ? `${day} ${month}, ${timePart}` : `${day} ${month} ${year}, ${timePart}`;
  } catch {
    return String(dateStr);
  }
};

/**
 * Formats a date string into human-readable date (e.g. "1 Aug 2026" or "No expiry")
 */
export const formatHumanDate = (dateStr: string | null | undefined, fallbackText: string = 'No expiry'): string => {
  if (!dateStr) return fallbackText;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return String(dateStr);
  }
};

/**
 * Formats time string (HH:MM:SS -> 11:00 AM)
 */
export const formatHumanTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return 'N/A';
  try {
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const mins = parts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${mins} ${ampm}`;
    }
    return timeStr;
  } catch {
    return timeStr;
  }
};
