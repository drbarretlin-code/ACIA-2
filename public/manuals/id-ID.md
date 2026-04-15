# Panduan Pengguna Sistem Terjemahan Real-Time AI ACIA-2

---

## 1. Fitur Antarmuka & Panduan Operasi

### 1. Memulai

Setelah membuka halaman web untuk pertama kali, selesaikan langkah-langkah berikut:

1. **Masukkan Nama Anda**: Masukkan nama tampilan Anda (contoh: `Barret`, jabatan, atau nomor kursi Anda).
2. **Masukkan Gemini API Key**: Masukkan kunci API Google AI Studio Anda (format: `AIza...`).
3. **Buat atau Gabung Ruangan**:
   - Klik "Buat Ruangan Baru" untuk memulai sesi terjemahan.
   - Atau tempelkan link undangan yang dibagikan oleh orang lain ke kolom URL untuk bergabung langsung.

> [!NOTE]
> API Key disimpan secara lokal di browser Anda dan tidak akan diunggah ke server mana pun.

---

### 2. Bilah Pemilihan Bahasa (Panel Kontrol)

Bilah horizontal di tengah layar, dari kiri ke kanan:

| Elemen | Deskripsi |
|---|---|
| 🏳️ Bendera Kiri | Bahasa yang Anda ucapkan (bahasa sumber) |
| 🌐 Dropdown Kiri | Pilih "Bahasa Saya" (Local); tidak dapat diubah saat merekam |
| ⇄ Tombol Panah Tengah | Tukar bahasa kiri/kanan dengan cepat; dinonaktifkan saat merekam |
| 🌐 Dropdown Kanan | Pilih "Bahasa Pihak Lain" (Client); tidak dapat diubah saat merekam |
| 🏳️ Bendera Kanan | Bendera bahasa pihak lain |
| 🔴 **Badge Merah LIVE** | Koneksi suara real-time aktif, menerjemahkan melalui Gemini Live API |
| ⚡ **Badge Kuning Local** | Mode cadangan, menggunakan pengenalan suara lokal; terjemahan tetap berfungsi normal |
| 🎙️ Tombol Rekam | 🔵 Biru = belum merekam, klik untuk mulai; 🔴 Bingkai merah berkedip = sedang merekam, klik untuk berhenti |

> [!IMPORTANT]
> Bahasa harus diatur **sebelum memulai perekaman**. Anda tidak dapat mengganti bahasa saat merekam.

---

### 3. Kotak Chat Terjemahan

- Setiap pesan menampilkan: nama pembicara (contoh: `Barret`), teks asli, dan teks terjemahan.
- Bilah status di atas:
  - 🔴 **Mendengarkan...** = Gemini Live memproses audio secara real-time
  - 🟡 **Mode Lokal Mendengarkan...** = Mode cadangan; pengenalan dan terjemahan tetap berfungsi
- Tombol kanan atas:
  - **Bagikan**: Salin atau bagikan semua catatan percakapan
  - **Hapus**: Hapus semua catatan percakapan (hanya pembuat ruangan yang bisa)

---

### 4. Bilah Input Teks (Bawah Layar)

Jika suara tidak tersedia atau Anda memerlukan input teks yang tepat:

1. Klik tombol arah di kiri untuk mengubah arah terjemahan (Local → Client atau Client → Local).
2. Ketik pesan Anda di kotak teks.
3. Tekan Enter atau klik tombol kirim untuk menerjemahkan.

> [!NOTE]
> Input teks tersedia kapan saja, **tidak perlu memulai perekaman terlebih dahulu**.

---

### 5. Pengaturan Output Suara (Tombol Mengambang, Kanan Bawah)

Klik tombol bulat (ikon speaker) di kanan bawah untuk membuka pengaturan pemutaran:

| Opsi | Deskripsi |
|---|---|
| **Bisukan** | Tidak ada pemutaran suara untuk terjemahan |
| **Hanya Saya** | Putar audio terjemahan hanya di perangkat Anda |
| **Semua** | Semua peserta dapat mendengar pemutaran audio |
| **Hanya Lainnya** | Hanya peserta lain yang mendengar; Anda tidak mendengar |

---

### 6. Bilah Alat Atas

Kiri atas menampilkan logo merek **TUC** (merah tebal) dan subtitle (default: Equipment Department). Bilah alat kanan, secara berurutan:

| Ikon | Fungsi |
|---|---|
| 📋 Room ID + Tombol Salin | Salin link undangan untuk dibagikan ke orang lain |
| 📱 Ikon QR Code | Tampilkan QR Code untuk dipindai dan bergabung |
| 🚪 Ikon Keluar | Keluar dari ruangan saat ini (pembuat ruangan dapat memilih "Akhiri Ruang Rapat") |
| 👥 Jumlah Pengguna (xx/100) | Jumlah pengguna online saat ini |
| 🌙 / ☀️ Ikon Bulan / Matahari | Beralih mode Gelap / Terang |
| 🔒 Ikon Kunci | Pengaturan admin (hanya terlihat oleh pembuat ruangan) |
| 🟢 **Sistem Siap** | Sistem beroperasi normal |

---

### 7. Pengaturan Admin (Ikon Kunci)

Hanya dapat diakses oleh pembuat ruangan, mencakup:

- **Quotas Limitation**: Lihat dashboard penggunaan RPM / RPD API Key saat ini.
- **Pengaturan API Key**: Ubah Gemini API Key atau Google Cloud API Key.
- **Switch Tier API**: Free Tier atau Tier 1 (bayar sesuai penggunaan).
- **Pengaturan Judul Header**: Kustomisasi nama merek kiri (default: `TUC`) dan subtitle (default: `Equipment Department`).

---

## 2. Batasan Penggunaan

### 1. Batas Kuota API

Sistem ini menggunakan Google Gemini API. Batas akun Free Tier adalah sebagai berikut:

| Item | Batas Free Tier |
|---|---|
| **Koneksi per Menit (RPM)** | 2 |
| **Koneksi per Hari (RPD)** | 50 |
| **Durasi Koneksi Tunggal Maksimum** | 3 jam (pemutusan paksa oleh sistem) |
| **Pemutusan Otomatis Saat Idle** | Ditanya setelah 1 jam; pemutusan otomatis setelah 3 menit tanpa respons |

Waktu reset kuota:
- RPM: Reset bergulir setiap menit (bukan interval tetap)
- RPD: Reset setiap hari pukul 15:00 (musim dingin) atau 16:00 (musim panas) waktu Thailand

---

### 2. Kompatibilitas Browser

| Fitur | Chrome | Safari (iOS/Mac) | Firefox |
|---|---|---|---|
| Terjemahan Suara Real-time | Dukungan Penuh | Dukungan Penuh | **Tidak Didukung** |
| Pengenalan Suara Lokal Cadangan | Didukung | Didukung | **Tidak Didukung** |
| Terjemahan Input Teks | Didukung | Didukung | Didukung |
| Berbagi QR Code | Didukung | Didukung | Didukung |

> [!CAUTION]
> **Pengguna Firefox hanya dapat menggunakan mode input teks untuk terjemahan.** Fitur suara (baik real-time maupun cadangan) tidak tersedia.

---

### 3. Dukungan Bahasa

Sistem mendukung 37 bahasa. Namun, dalam **mode cadangan (Local STT)**, akurasi pengenalan mungkin lebih rendah untuk beberapa bahasa. Chrome atau Safari direkomendasikan untuk:
- Bahasa Arab
- Bahasa Ibrani
- Bahasa Filipina

---

### 4. Catatan Perangkat iOS

> [!WARNING]
> **Beralih aplikasi ke latar belakang atau mengunci layar**: Mikrofon akan diinterupsi oleh sistem iOS. Sistem akan mencoba memulai ulang perekaman dalam 2 detik setelah Anda kembali ke aplikasi. Jika tidak dimulai ulang secara otomatis, klik tombol rekam secara manual.

- **Saat menerima panggilan telepon**: Perekaman akan dijeda. Silakan mulai ulang perekaman secara manual setelah mengakhiri panggilan.

---

## 3. Skenario Penggunaan Normal & Menghindari Batas Kuota

### Informasi Dasar

"Jumlah koneksi" suara Gemini Live dihitung sebagai: **setiap kali perekaman dimulai, atau sistem melakukan koneksi ulang otomatis, dihitung sebagai 1 permintaan**. Tidak ada hubungannya dengan berapa lama Anda berbicara.

- **Satu pertemuan berkelanjutan** (mulai rekam sekali, tanpa pemutusan) = mengonsumsi **1 RPD**
- **Satu koneksi ulang otomatis** = mengonsumsi tambahan **1 RPD dan 1 RPM**

---

### Skenario Penggunaan Umum

| Perilaku | Konsumsi |
|---|---|
| Mulai rekam sekali, gunakan terus-menerus selama 3 jam | 1 RPD |
| Batas 3 jam tercapai, sistem memutus lalu memulai ulang | +1 RPD |
| Ganti bahasa lalu mulai ulang | +1 RPD |
| Gangguan internet, sistem berhasil terhubung kembali otomatis | +1 RPD (otomatis) |

**Estimasi 50 RPD per hari:**

Jika setiap pertemuan mengonsumsi 2-3 koneksi, Anda dapat mengadakan sekitar **16-25 pertemuan per hari**.

---

### Rekomendasi untuk Menghindari Batas

> [!IMPORTANT]
> **Atur bahasa sebelum memulai perekaman**: Penggantian bahasa memicu koneksi ulang, setiap pergantian +1 RPD. Pemilih bahasa dikunci saat merekam.

> [!IMPORTANT]
> **Hindari memulai/menghentikan perekaman lebih dari 2 kali dalam 1 menit**: Free Tier hanya mengizinkan 2 koneksi per menit.

1. **Pertahankan koneksi internet yang stabil**: Koneksi intermiten memicu koneksi ulang otomatis. Wi-Fi lebih stabil daripada data seluler.

2. **Pertahankan perekaman berkelanjutan untuk pertemuan panjang**: Jangan hentikan perekaman hanya karena ada jeda singkat.

3. **Melihat ⚡ Local (badge kuning) adalah normal**: Sistem telah beralih ke pengenalan lokal. **Terjemahan tetap berfungsi.** Sistem akan mencoba koneksi ulang di latar belakang dan otomatis kembali ke mode 🔴 LIVE saat berhasil.

---

*Panduan ini ditulis berdasarkan versi sistem 2026-04-15. Silakan merujuk ke layar aktual jika antarmuka telah diperbarui.*
