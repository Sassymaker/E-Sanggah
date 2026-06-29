# E-Sanggah Absensi Pegawai

Website dinamis untuk pengajuan sanggahan absensi pegawai. Stack yang dipakai:

- Frontend: HTML, CSS, JavaScript vanilla.
- Backend: Node.js + Express.
- Auth: JWT + bcryptjs.
- Upload: Multer, Google Drive opsional.
- Rekap: Google Sheets opsional, tab/sheet baru per bulan.
- Export: Excel `.xlsx` dari dashboard admin.
- Database demo: file JSON lokal `backend/src/data/db.json`.

## Struktur Folder

```text
e-sanggah/
├─ backend/
│  ├─ package.json
│  ├─ .env.example
│  ├─ server.js
│  ├─ src/
│  │  ├─ config/env.js
│  │  ├─ controllers/
│  │  │  ├─ admin.controller.js
│  │  │  ├─ auth.controller.js
│  │  │  └─ sanggah.controller.js
│  │  ├─ data/db.js
│  │  ├─ middleware/
│  │  │  ├─ auth.js
│  │  │  ├─ errorHandler.js
│  │  │  └─ upload.js
│  │  ├─ routes/
│  │  │  ├─ admin.routes.js
│  │  │  ├─ auth.routes.js
│  │  │  └─ sanggah.routes.js
│  │  ├─ services/
│  │  │  ├─ export.service.js
│  │  │  └─ google.service.js
│  │  └─ utils/
│  │     ├─ date.js
│  │     └─ id.js
│  └─ storage/
│     ├─ tmp/
│     └─ uploads/
└─ frontend/
   ├─ index.html
   ├─ assets/logo.svg
   ├─ css/styles.css
   └─ js/
      ├─ api.js
      └─ app.js
```

## Cara Menjalankan Lokal

1. Masuk folder backend.

```bash
cd backend
npm install
```

2. Buat file `.env` dari contoh.

```bash
cp .env.example .env
```

3. Jalankan server.

```bash
npm run dev
```

4. Buka browser:

```text
http://localhost:3000
```

Akun demo awal dibuat otomatis ketika `backend/src/data/db.json` belum ada:

- Admin: `admin` / `admin123`
- User: `user` / `user123`

Ubah akun awal lewat `.env` sebelum aplikasi pertama kali dijalankan.

## Endpoint Utama

### Auth

```http
POST /api/auth/login
GET  /api/auth/me
```

### Sanggahan

```http
GET    /api/sanggah
POST   /api/sanggah
GET    /api/sanggah/:id
PUT    /api/sanggah/:id
DELETE /api/sanggah/:id
```

### Admin

```http
GET /api/admin/dashboard
GET /api/admin/export?month=2026-06
```

## Integrasi Google Drive dan Google Sheets

Aplikasi tetap berjalan tanpa Google API. Jika credential Google belum diisi, file upload akan disimpan di `backend/storage/uploads`, dan data rekap tetap bisa diunduh Excel dari admin.

Agar upload masuk Google Drive dan rekap masuk Google Sheets:

1. Buat project di Google Cloud.
2. Aktifkan Google Drive API dan Google Sheets API.
3. Buat Service Account.
4. Buat key JSON untuk Service Account.
5. Share folder Google Drive tujuan ke email Service Account.
6. Share file Google Sheets tujuan ke email Service Account sebagai Editor.
7. Isi `.env`:

```env
GOOGLE_PROJECT_ID=nama-project
GOOGLE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nISI_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_ID=id_spreadsheet
GOOGLE_DRIVE_FOLDER_ID=id_folder_drive
GOOGLE_DRIVE_PUBLIC_LINKS=false
```

`GOOGLE_SHEETS_ID` diambil dari URL Google Sheets. Contoh URL:

```text
https://docs.google.com/spreadsheets/d/INI_ADALAH_ID_SPREADSHEET/edit
```

`GOOGLE_DRIVE_FOLDER_ID` diambil dari URL folder Google Drive.

## Catatan Produksi

Versi ini cocok untuk tugas, demo, atau prototipe internal. Untuk produksi, sebaiknya:

- Ganti database JSON menjadi MySQL/PostgreSQL.
- Tambahkan manajemen user dari dashboard admin.
- Tambahkan rate limit dan audit log.
- Gunakan HTTPS.
- Simpan secret di environment server, bukan di repository.
- Tambahkan backup database dan validasi file lebih ketat.
