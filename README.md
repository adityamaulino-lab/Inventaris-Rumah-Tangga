# Rumah Tangga Aset — Live Connected Build

This build removes localStorage demo mode. The frontend calls the configured Apps Script endpoint and reads/writes the existing Google Spreadsheet.

## IMPORTANT BEFORE USE
1. Back up the existing Apps Script project and spreadsheet.
2. Replace the Apps Script `Code.gs` with this package's `Code.gs`.
3. Confirm the Spreadsheet ID is the existing one at the top of the script.
4. Run `setupDatabase()` only if a required sheet is missing. It does not clear existing rows.
5. If there is no admin user, run `createInitialAdmin()` once. Temporary login: `admin` / `GantiPassword!2026`. Immediately create a new admin account with a unique strong password, then disable/remove the temporary admin row after verifying access.
6. Deploy as Web App, Execute as: Me, with access setting approved by the institution. Deploy a NEW VERSION.
7. Upload all frontend files to GitHub Pages.
8. Test from the deployed HTTPS website.

## Jika login masih gagal (urutan cek)
1. Buka URL Web App langsung di browser. Harus muncul JSON `{"success":true,...,"status":"online"}`. Jika diminta login Google, deployment belum "Who has access: Anyone".
2. Di editor Apps Script jalankan `diagnoseLogin()` lalu buka View > Logs. Fungsi ini melaporkan sheet/kolom yang hilang, status `active`, dan panjang hash user.
3. Jika hash/salt tidak sesuai (akun dibuat skrip versi lama), isi `PASSWORD_BARU` di `resetAdminPassword()`, jalankan sekali, lalu kosongkan lagi nilainya.
4. Setelah mengganti `Code.gs`, wajib Deploy > Manage deployments > Edit > Version: New version. Menyimpan saja tidak mengubah Web App yang sudah live.

## Browser/API compatibility
The frontend uses a cross-origin `fetch` POST with `application/x-www-form-urlencoded`. Google Apps Script Web Apps can behave differently with redirects and browser CORS policies. If the browser console reports CORS or redirect errors, do not switch to JSONP with passwords in URL parameters. Use a same-origin proxy (for example a Cloudflare Worker with a server-side secret) or an institution-approved identity/backend integration.

## Features connected to Sheets
- Login and role-based access (`admin`, `borrower`)
- Dashboard totals
- Asset list and create/update
- Borrow requests
- Admin approve/reject
- Handover decreases available quantity
- Return increases quantity and records return condition
- Vehicle records
- Admin-created accounts
- Activity log
- Maintenance endpoint foundation

## Not yet included
- Live GPS map (needs the chosen tracker's API and credentials)
- QR camera scanning / label printing
- PDF report generation
- Password reset and admin deactivation UI
- Atomic stock locking for simultaneous requests
- Production-grade password hashing and session store
- Formal security review / organization SSO

Do not use for official production transactions until the deployment and cross-user tests are completed.


## PREMIUM UPGRADE (V2)

Paket ini mempertahankan Spreadsheet ID, nama sheet, dan data lama. Perubahan skema hanya menambahkan dua kolom tanda tangan pada sheet `Loans` saat `setupDatabase()` dijalankan; data/baris lama tidak dihapus.

Fitur tambahan:
- Menu Pemeliharaan dan pencatatan biaya/perbaikan.
- Menu Laporan: ekspor CSV yang dapat dibuka di Excel, dan Cetak/Simpan sebagai PDF melalui dialog browser.
- Pengingat peminjaman terlambat berdasarkan tanggal jatuh tempo.
- QR aset untuk dicetak (membutuhkan koneksi internet saat membuat gambar QR).
- Riwayat peminjaman per aset.
- Tanda tangan digital petugas saat serah terima; gambar tanda tangan disimpan di kolom `Loans.handover_signature`.
- Kolom GPS kendaraan tetap dapat menyimpan provider dan ID perangkat.

### Langkah pemasangan
1. Cadangkan Google Sheets dan Apps Script sebelum perubahan.
2. Unggah isi folder website ke GitHub Pages, timpa file frontend lama.
3. Buka Apps Script yang sama dan ganti seluruh `Code.gs` dengan file dari paket ini.
4. Jalankan `setupDatabase()` sekali dari editor Apps Script, izinkan akses, lalu periksa bahwa data lama tetap ada.
5. Deploy > Manage deployments > Edit > New version > Deploy.
6. Jangan ganti `config.js`; URL API dan Spreadsheet ID sudah dipertahankan dari paket sumber.
7. Refresh website dengan Ctrl+Shift+R.

### Batas integrasi GPS
Pelacakan GPS real-time belum dapat aktif hanya dengan memasukkan ID perangkat. Dibutuhkan URL/API resmi dari penyedia GPS, kredensial API, dan format respons perangkat. Paket ini mempertahankan kolom provider/device ID sebagai persiapan integrasi, bukan mengarang lokasi kendaraan.

### Catatan
- Ekspor Excel menggunakan CSV UTF-8 yang kompatibel dengan Excel. PDF dibuat melalui fitur Print browser.
- QR memakai layanan QR eksternal saat dicetak.
- Tanda tangan yang disimpan adalah tanda tangan petugas admin; belum menjadi tanda tangan elektronik tersertifikasi.
- Uji login, persetujuan, serah terima, pengembalian, dan stok dengan akun uji sebelum penggunaan operasional.


## V3: Katalog publik dan pengajuan tanpa akun
- `index.html`: katalog publik dan formulir peminjaman tanpa login.
- `admin.html`: login dan aplikasi petugas yang sebelumnya berada di index.html.
- `Code.gs`: action `publicCatalog` dan `publicRequest`; pengajuan masuk sheet Loans sebagai Menunggu Persetujuan.
- Role `staff` dapat menyetujui, menolak, menyerahkan, dan menerima pengembalian; role `admin` tetap mengelola pengguna.
- Data lama tetap pada spreadsheet dan sheet yang sama. Tidak perlu membuat spreadsheet baru.
- **Penting:** backup Google Sheets dan Apps Script, ganti Code.gs, jalankan `setupDatabase`, deploy New version, lalu upload semua file ke GitHub Pages.
- Cek login admin melalui `admin.html`, cek katalog di `index.html`, dan lakukan uji peminjaman publik.
- Permohonan publik menyimpan nomor kontak pada kolom `Loans.notes` (hanya untuk petugas). Jangan mempublikasikan isi sheet.
- Pembatasan spam sederhana 3 menit per nomor kontak. Untuk situs publik bertrafik tinggi, tambahkan CAPTCHA/verifikasi dan audit keamanan.
- Foto barang belum tersedia karena database belum punya URL foto. GPS masih membutuhkan API penyedia.


## UI/UX UPDATE — PUBLIC PORTAL MATCHES STAFF
Halaman katalog publik sekarang menggunakan sistem desain yang sama dengan portal petugas: font Bricolage Grotesque + Instrument Sans, palet ink/teal, bentuk tombol dan input, radius, panel, kartu, serta gaya header yang seragam. Fungsi katalog dan formulir peminjaman tidak diubah.


## V4 — Kendaraan, foto inventaris, dan pelacakan resi

Fitur V4:
- Katalog publik menggabungkan aset dan kendaraan aktif.
- Pengajuan kendaraan memakai jadwal; backend menolak bentrok dengan pengajuan berstatus Menunggu Persetujuan, Disetujui, atau Dipinjam.
- Kendaraan dicatat di LoanItems dengan ID internal `VEH:<vehicle_id>`, sehingga alur serah terima/pengembalian mengubah status kendaraan tanpa mengurangi stok aset.
- Pelacakan publik memakai nomor resi dan nomor WhatsApp. Respons hanya mengembalikan status, barang/kendaraan, tanggal, dan petugas pemroses.
- Foto aset dapat diunggah dari form tambah/edit inventaris ke Google Drive. URL foto disimpan di kolom `Assets.image_url` dan ditampilkan di katalog.
- Skema baru menambahkan `Assets.image_url`, `Vehicles.image_url`, dan `Loans.requester_contact`. `setupDatabase()` menambahkan kolom tanpa menghapus data lama.

Pemasangan:
1. Cadangkan Sheet dan Apps Script.
2. Ganti file website di GitHub Pages dengan isi paket.
3. Ganti seluruh Code.gs di Apps Script dengan versi V4.
4. Jalankan `setupDatabase()` satu kali.
5. Deploy > Manage deployments > Edit > New version > Deploy.
6. Uji katalog, pengajuan barang, pengajuan kendaraan, pelacakan resi, persetujuan, serah terima, dan pengembalian.

Catatan foto:
- Upload menggunakan Google Drive dan membuat tautan "Anyone with the link". Jangan unggah dokumen/foto yang memuat data pribadi atau informasi terbatas.
- Upload foto aset dibatasi 3 MB di antarmuka.
- Foto kendaraan dapat ditampilkan bila kolom `Vehicles.image_url` diisi; upload form kendaraan belum ditambahkan pada V4 ini.

Catatan:
- Kendaraan yang sedang dalam perawatan harus berstatus selain Aktif/Tersedia agar tidak muncul di katalog.
- Pelacakan resi hanya untuk pengajuan publik yang dibuat setelah V4 dipasang. Pengajuan publik lama tidak memiliki kolom nomor kontak terpisah.
- Nomor WhatsApp bukan OTP; ini verifikasi kecocokan nomor yang diserahkan pengguna. Tambahkan OTP bila dibutuhkan tingkat verifikasi lebih tinggi.
