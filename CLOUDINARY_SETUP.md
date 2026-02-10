# Panduan Setup Cloudinary untuk Upload File

Karena Google Drive memiliki batasan penyimpanan 0GB untuk Service Account, kita beralih menggunakan **Cloudinary**. Cloudinary sangat mudah digunakan dan memberikan penyimpanan gratis yang cukup besar.

## Langkah 1: Registrasi Cloudinary
1. Buka [Cloudinary Console](https://cloudinary.com/console) dan login atau daftar (gratis).
2. Di halaman Dashboard, Anda akan melihat **Product Environment Credentials**.
3. Cari informasi berikut:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

## Langkah 2: Tambahkan ke Vercel (PENTING)
Agar aplikasi yang sudah dideploy bisa berjalan, Anda harus menambahkan 3 variable ini ke Dashboard Vercel:

1. Buka Dashboard Vercel proyek Anda.
2. Klik **Settings** > **Environment Variables**.
3. Tambahkan 3 variable baru:
   - Name: `CLOUDINARY_CLOUD_NAME`, Value: (isi dengan Cloud Name Anda)
   - Name: `CLOUDINARY_API_KEY`, Value: (isi dengan API Key Anda)
   - Name: `CLOUDINARY_API_SECRET`, Value: (isi dengan API Secret Anda)
4. Klik **Save**.
5. Jangan lupa untuk **Redeploy** aplikasi agar perubahan terbaca.

## Langkah 3: Update .env (Local)
Jika Anda menjalankan aplikasi di laptop sendiri, buka file `.env` di folder project dan isi data yang sama:

```env
CLOUDINARY_CLOUD_NAME="isi_di_sini"
CLOUDINARY_API_KEY="isi_di_sini"
CLOUDINARY_API_SECRET="isi_di_sini"
```

## Keuntungan Beralih ke Cloudinary:
✅ **Tanpa Masalah Kuota:** Tidak ada lagi error "Storage Quota Exceeded".
✅ **Otomatis Optimasi:** Gambar akan diperkecil ukurannya secara otomatis sehingga web lebih cepat.
✅ **Auto-Format:** Mengubah format gambar ke WebP secara otomatis jika browser mendukung.
✅ **Simple:** Tidak butuh pengaturan folder sharing yang ribet seperti di Google Drive.

---
**Catatan:** Kode di `api/upload.ts` sudah saya perbarui untuk mendukung Cloudinary secara otomatis. Setelah Anda mengisi Environment Variables, fitur upload akan langsung berfungsi kembali.
