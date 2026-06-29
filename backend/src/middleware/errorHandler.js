function notFound(req, res) {
  res.status(404).json({ message: 'Endpoint tidak ditemukan.' });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Ukuran file terlalu besar. Maksimal 5 MB per file.' });
  }
  return res.status(err.status || 500).json({
    message: err.message || 'Terjadi kesalahan server.'
  });
}

module.exports = { notFound, errorHandler };
