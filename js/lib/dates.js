const DAY = 24 * 60 * 60 * 1000;

// Not toISOString(), which gives the UTC date: just after midnight it would still be yesterday.
export function localDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatDate(text, today) {
  const [year, month, day] = text.split('-').map(Number);
  if (!month) {
    return text;
  }
  const options = { month: 'long' };
  if (day) {
    options.day = 'numeric';
  }
  if (year !== Number(today.slice(0, 4))) {
    options.year = 'numeric';
  }
  return new Intl.DateTimeFormat('pl-PL', options).format(new Date(year, month - 1, day || 1));
}

// Both dates are read as UTC midnights, so a daylight saving change does not shorten a day.
export function daysBetween(from, to) {
  return (Date.parse(to) - Date.parse(from)) / DAY;
}
