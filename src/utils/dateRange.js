const toISODate = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const getWeekRange = (dateValue = new Date()) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return {
    startDate: toISODate(start),
    endDate: toISODate(end),
  };
};

const getMonthRange = (monthValue) => {
  const [year, month] = String(monthValue || toISODate()).split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return null;

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));

  return {
    startDate: toISODate(start),
    endDate: toISODate(end),
  };
};

module.exports = {
  toISODate,
  getWeekRange,
  getMonthRange,
};
