# Panduan Menambahkan Environment Variables ke Vercel

## Langkah 1: Buka Settings
1. Buka https://vercel.com
2. Login ke akun Anda
3. Klik proyek **daily-logbook**
4. Klik tab **Settings** (di bagian atas)
5. Di menu samping kiri, klik **Environment Variables**

## Langkah 2: Tambahkan Variable Satu Per Satu

Klik tombol **"Add New"** atau **"Add Variable"**, lalu salin-tempel informasi berikut:

### Variable 1
- **Name**: `VITE_FIREBASE_API_KEY`
- **Value**: `AIzaSyAGyk2L2RSvizIr_aXKyX44vWPlyM8rMFk`
- **Environment**: Centang semua (Production, Preview, Development)
- Klik **Save**

### Variable 2
- **Name**: `VITE_FIREBASE_AUTH_DOMAIN`
- **Value**: `pengeluaran-dd4d0.firebaseapp.com`
- **Environment**: Centang semua
- Klik **Save**

### Variable 3
- **Name**: `VITE_FIREBASE_PROJECT_ID`
- **Value**: `pengeluaran-dd4d0`
- **Environment**: Centang semua
- Klik **Save**

### Variable 4
- **Name**: `VITE_FIREBASE_STORAGE_BUCKET`
- **Value**: `pengeluaran-dd4d0.firebasestorage.app`
- **Environment**: Centang semua
- Klik **Save**

### Variable 5
- **Name**: `VITE_FIREBASE_MESSAGING_SENDER_ID`
- **Value**: `254908773545`
- **Environment**: Centang semua
- Klik **Save**

### Variable 6
- **Name**: `VITE_FIREBASE_APP_ID`
- **Value**: `1:254908773545:web:c52a2a33b081b83e6425b8`
- **Environment**: Centang semua
- Klik **Save**

### Variable 7
- **Name**: `VITE_FIREBASE_MEASUREMENT_ID`
- **Value**: `G-44QZ1165HM`
- **Environment**: Centang semua
- Klik **Save**

## Langkah 3: Redeploy

Setelah semua 7 variables ditambahkan:

1. Klik tab **Deployments**
2. Pada deployment terakhir, klik **tiga titik (⋮)** di sebelah kanan
3. Pilih **"Redeploy"**
4. Tunggu sampai status **"Ready"**

## ✅ Selesai!

Setelah redeploy selesai, buka https://daily-logbook.vercel.app/dashboard dan tracker Anda akan muncul!

---

**Catatan**: Jika Anda kesulitan, screenshot halaman Environment Variables Anda dan tunjukkan ke saya.
