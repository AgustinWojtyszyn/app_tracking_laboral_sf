
export const getDayStart = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getDayEnd = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const getMonthStart = (date = new Date()) => {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getMonthEnd = (date = new Date()) => {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const isDateInRange = (dateStr, startStr, endStr) => {
  const d = new Date(dateStr);
  const start = new Date(startStr);
  const end = new Date(endStr);
  return d >= start && d <= end;
};

export const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};
