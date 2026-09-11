
export const getArgentinaToday = (date = new Date()) => (
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/San_Juan',
  }).format(date)
);

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

export const formatDate = (dateString) => {
  if (!dateString) return '';

  const rawValue = String(dateString);
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    const [year, month, day] = rawValue.split('-').map(Number);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));
    const isValidCalendarDate = (
      calendarDate.getUTCFullYear() === year
      && calendarDate.getUTCMonth() === month - 1
      && calendarDate.getUTCDate() === day
    );
    if (!isValidCalendarDate) return '';
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/San_Juan',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatNumber = (num, decimals = 2) => {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num || 0);
};
