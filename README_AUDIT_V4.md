# Rumah Tangga Aset — V4 Audit Fix

Paket ini merupakan revisi **terbatas** dari ZIP V4 yang dikirim pengguna, bukan pengembangan ulang.

## Perbaikan yang diterapkan
- Mempertahankan foto aset ketika data aset diedit tanpa mengirim `image_url`.
- Mempertahankan URL foto kendaraan saat data kendaraan disimpan ulang.
- Menormalkan tanggal Google Sheets saat pemeriksaan jadwal kendaraan dan pelacakan resi.
- Membatasi riwayat aktivitas aset ke ID aset yang diminta.
- Memulihkan formulir pengajuan publik ketika pengunjung membuka pengajuan kedua setelah menerima resi.
- Mempertahankan pemeriksaan format tanggal dan nomor telepon yang telah diperbaiki sebelumnya.

## Cara memasang dengan risiko minimal
1. **Jangan hapus atau buat ulang spreadsheet.** Cadangkan spreadsheet dan kode Apps Script aktif.
2. Unggah file website dari paket ke GitHub Pages.
3. Tempel `Code.gs` dari paket ke proyek Apps Script yang sama.
4. **Tidak perlu menjalankan `setupDatabase()` ulang** bila kolom V4 sudah ada.
5. Deploy > Manage deployments > Edit > New version > Deploy.
6. Uji menggunakan pengajuan percobaan: login, katalog, pengajuan, persetujuan, serah terima, pengembalian, dan pelacakan.

## Batasan yang belum selesai
- Paket belum diuji langsung dengan Google Sheets, Drive, dan deployment milik pengguna.
- Foto Google Drive yang dibagikan dengan tautan dapat memiliki kendala tampilan di browser tertentu.
- Pengecekan bentrok kendaraan memakai tanggal (belum jam).
- Pelacakan resi + nomor WhatsApp bukan verifikasi OTP.
- Peminjaman kendaraan lewat formulir petugas internal belum disamakan dengan katalog publik.
- Sistem stok dan keamanan belum diaudit untuk penggunaan produksi resmi.
- Data kontak pada pengajuan publik lama yang hanya tersimpan di `notes` belum dimigrasikan.

**Jangan gunakan pada transaksi resmi sebelum pengujian bersama pengguna selesai.**
