function calculateEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(baseDate, days) {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function moveToNextMonday(date) {
  const dayOfWeek = date.getDay();
  const daysUntilMonday = (8 - dayOfWeek) % 7;
  return addDays(date, daysUntilMonday);
}

export function getColombianHolidays(year) {
  const easterSunday = calculateEasterSunday(year);

  const fixed = [
    new Date(year, 0, 1),
    new Date(year, 4, 1),
    new Date(year, 6, 20),
    new Date(year, 7, 7),
    new Date(year, 11, 8),
    new Date(year, 11, 25),
  ];

  const emiliani = [
    moveToNextMonday(new Date(year, 0, 6)),
    moveToNextMonday(new Date(year, 2, 19)),
    moveToNextMonday(new Date(year, 5, 29)),
    moveToNextMonday(new Date(year, 7, 15)),
    moveToNextMonday(new Date(year, 9, 12)),
    moveToNextMonday(new Date(year, 10, 1)),
    moveToNextMonday(new Date(year, 10, 11)),
  ];

  const easterRelated = [
    addDays(easterSunday, -3),
    addDays(easterSunday, -2),
    addDays(easterSunday, 43),
    addDays(easterSunday, 64),
    addDays(easterSunday, 71),
  ];

  // Festivos por decreto especial (no permanentes)
  const decree = [];
  if (year === 2026) {
    decree.push(new Date(2026, 6, 13)); // Decreto especial gobierno colombiano
  }

  return new Set([...fixed, ...emiliani, ...easterRelated, ...decree].map(formatDate));
}

export function isColombianHoliday(dateStr) {
  const [year] = dateStr.split('-').map(Number);
  return getColombianHolidays(year).has(dateStr);
}
