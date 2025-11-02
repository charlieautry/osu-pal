// Convert a date (string or Date) into an academic term + year string.
// Terms and ranges (inclusive):
// - Winter: Dec 15  -> Jan 20  (Winter labeled by the January year; e.g. Dec 15, 2024 -> Winter 2025)
// - Spring: Jan 21  -> May 20
// - Summer: May 21  -> Aug 20
// - Fall:   Aug 21  -> Dec 14

export function termForDate(input?: string | Date | null): string {
  if (!input) return '';

  let d: Date;
  if (input instanceof Date) {
    d = input;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(String(input).trim())) {
    // Parse YYYY-MM-DD as a local date (avoid timezone shift that new Date(str) may do)
    const [y, m, day] = String(input).split('-').map((s) => parseInt(s, 10));
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(day)) return '';
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(String(input));
    if (Number.isNaN(d.getTime())) return '';
  }

  const month = d.getMonth() + 1; // 1-12
  const day = d.getDate();
  const year = d.getFullYear();

  // Winter spans year boundary: Dec 15..Dec31 -> Winter of next year; Jan1..Jan20 -> Winter of this year
  if ((month === 12 && day >= 15) || (month === 1 && day <= 20)) {
    const termYear = month === 12 ? year + 1 : year;
    return `Winter ${termYear}`;
  }

  // Spring: Jan 21 - May 20
  if ((month === 1 && day >= 21) || (month >= 2 && month <= 4) || (month === 5 && day <= 20)) {
    return `Spring ${year}`;
  }

  // Summer: May 21 - Aug 20
  if ((month === 5 && day >= 21) || (month === 6) || (month === 7) || (month === 8 && day <= 20)) {
    return `Summer ${year}`;
  }

  // Fall: Aug 21 - Dec 14
  return `Fall ${year}`;
}
