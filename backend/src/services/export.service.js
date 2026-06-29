const ExcelJS = require('exceljs');
const { formatDateTime } = require('../utils/date');

const columns = [
  { header: 'ID', key: 'id', width: 16 },
  { header: 'Waktu Input', key: 'createdAt', width: 22 },
  { header: 'Nama Lengkap', key: 'namaLengkap', width: 28 },
  { header: 'NIP / NI PPPK', key: 'nip', width: 24 },
  { header: 'Hari Disanggah', key: 'hariDisanggah', width: 18 },
  { header: 'Tanggal Disanggah', key: 'tanggalDisanggah', width: 18 },
  { header: 'Alasan Sanggahan', key: 'alasanSanggahan', width: 45 },
  { header: 'Bukti Dukung', key: 'buktiDukungUrl', width: 38 },
  { header: 'Surat Pernyataan', key: 'suratPernyataanUrl', width: 38 },
  { header: 'Status', key: 'status', width: 16 },
  { header: 'Catatan Admin', key: 'catatanAdmin', width: 35 },
  { header: 'Diupdate Pada', key: 'updatedAt', width: 22 },
  { header: 'Username', key: 'createdByUsername', width: 18 }
];

async function buildSanggahWorkbook(records, title = 'Rekap Sanggahan') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'E-Sanggah';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(title.slice(0, 31));
  worksheet.columns = columns;

  records.forEach((item) => {
    worksheet.addRow({
      ...item,
      createdAt: formatDateTime(item.createdAt),
      updatedAt: item.updatedAt ? formatDateTime(item.updatedAt) : '-'
    });
  });

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.autoFilter = 'A1:M1';

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  return workbook;
}

module.exports = { buildSanggahWorkbook };
