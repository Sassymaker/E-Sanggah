const dayjs = require('dayjs');

function monthKey(dateValue = new Date()) {
  return dayjs(dateValue).format('YYYY-MM');
}

function formatDateTime(dateValue = new Date()) {
  return dayjs(dateValue).format('YYYY-MM-DD HH:mm:ss');
}

function normalizeDateInput(dateValue) {
  if (!dateValue) return '';
  return dayjs(dateValue).format('YYYY-MM-DD');
}

module.exports = { monthKey, formatDateTime, normalizeDateInput };
