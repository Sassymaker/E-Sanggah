const { readDb } = require('../data/db');
const { monthKey } = require('../utils/date');
const { buildSanggahWorkbook } = require('../services/export.service');
const { applyFilters } = require('./sanggah.controller');
const { isGoogleConfigured } = require('../services/google.service');

function dashboardStats(req, res) {
  const db = readDb();
  const records = db.sanggahan;
  const month = req.query.month || monthKey(new Date());
  const monthly = records.filter((item) => monthKey(item.tanggalDisanggah) === month);

  const statusCounts = records.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  const monthlyStatusCounts = monthly.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  const months = [...new Set(records.map((item) => monthKey(item.tanggalDisanggah)))].sort().reverse();

  return res.json({
    total: records.length,
    month,
    monthlyTotal: monthly.length,
    statusCounts,
    monthlyStatusCounts,
    months,
    googleSheetsEnabled: isGoogleConfigured()
  });
}

async function exportSanggahan(req, res, next) {
  try {
    const db = readDb();
    const records = applyFilters(db.sanggahan, req.query, { ...req.user, role: 'admin' });
    const label = req.query.month || 'semua-data';
    const workbook = await buildSanggahWorkbook(records, `Rekap ${label}`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="rekap-e-sanggah-${label}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
}

module.exports = { dashboardStats, exportSanggahan };
