# Perubahan V5 (dari V4 uji layak)

## Fitur baru
- Form kendaraan (Tambah & Edit) sekarang bisa unggah foto. Foto diperkecil otomatis di browser (maks. 1280 px, JPEG), jadi foto HP besar tidak ditolak.
- Tabel Kendaraan: kolom Foto dan tombol Edit. Status kendaraan (Aktif/Perawatan/Nonaktif) kini bisa diubah dari UI.
- Form Aset memakai pengecil foto yang sama (batas 3 MB dihapus).

- Kolom Catatan kini tampil di tabel Inventaris (portal petugas).
- Field baru **Spesifikasi lengkap** pada form aset (kolom baru `Assets.specs`). Di beranda, klik kartu barang untuk membuka popup detail berisi spesifikasi; format penulisan satu baris satu spesifikasi `Nama: isi`. Field Catatan menjadi catatan internal dan tidak tampil ke publik.

## Perbaikan bug
- code2.gs: regex nomor telepon salah tulis (`\\D`), sehingga +62 / tanda hubung tidak dibersihkan.
- code2.gs: pelacakan resi sekarang menyamakan format nomor (08… / 8… / +62…).
- code2.gs: edit aset tidak lagi menghapus `acquisition_date`.
- Edit kendaraan tidak menghapus STNK/pajak/servis/status GPS.
- Foto Drive ditampilkan lewat URL thumbnail (lebih andal dari uc?export=view), termasuk foto lama.
- Foto gagal dimuat -> kembali ke ikon, bukan gambar rusak.
- Katalog publik: tombol Esc menutup formulir, tanggal tidak bisa dipilih sebelum hari ini.
- Tampilan: teks 10-12 px dinaikkan ke 12-13 px, foto & placeholder memakai rasio 4:3.

## Pemasangan
1. Unggah semua file website ke GitHub Pages.
2. Ganti isi Code.gs di Apps Script dengan code2.gs, lalu Deploy > New version.
3. Kolom `specs` ditambahkan otomatis saat aset pertama kali disimpan; boleh juga menjalankan setupDatabase() sekali (aman, data lama tidak dihapus).
