const express = require('express');
const upload = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');
const {
  createSanggahan,
  listSanggahan,
  getSanggahan,
  updateSanggahan,
  deleteSanggahan
} = require('../controllers/sanggah.controller');

const router = express.Router();

const uploadFields = upload.fields([
  { name: 'buktiDukung', maxCount: 1 },
  { name: 'suratPernyataan', maxCount: 1 }
]);

router.use(requireAuth);
router.get('/', listSanggahan);
router.post('/', uploadFields, createSanggahan);
router.get('/:id', getSanggahan);
router.put('/:id', uploadFields, updateSanggahan);
router.delete('/:id', deleteSanggahan);

module.exports = router;
