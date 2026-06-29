const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { dashboardStats, exportSanggahan } = require('../controllers/admin.controller');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));
router.get('/dashboard', dashboardStats);
router.get('/export', exportSanggahan);

module.exports = router;
