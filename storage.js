// storage.js
const NAMA_FILE = 'catatan_aliran_kas.json';

const KATEGORI_DEFAULT = [
  { id: 'kebutuhan', nama: 'Kebutuhan Pokok', persen: 50 },
  { id: 'tabungan', nama: 'Tabungan & Investasi', persen: 30 },
  { id: 'hiburan', nama: 'Gaya Hidup & Hiburan', persen: 20 }
];

// Fungsi 1: Minta izin OS agar storage tidak dihapus otomatis (Aman dari null error)
async function cekStatusStorage() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersist = await navigator.storage.persist();
      console.log('Status Persisten HP: ', isPersist);
      const statusEl = document.getElementById('storage-status');
      if (statusEl) {
        statusEl.textContent = isPersist ? 'Storage HP: Persisten (Aman)' : 'Storage HP: Standar';
      }
    } catch (e) {
      console.warn('Gagal cek persisten storage:', e);
    }
  }
}

// Fungsi 2: Mengambil file handle di OPFS
async function dapatkanFileHandle() {
  const root = await navigator.storage.getDirectory();
  return await root.getFileHandle(NAMA_FILE, { create: true });
}

// Fungsi 3: Membaca teks di dalam file
async function bacaData() {
  try {
    const handle = await dapatkanFileHandle();
    const file = await handle.getFile();
    const teks = await file.text();

    if (!teks || teks.trim() === '') {
      const dataDefault = { kategori: KATEGORI_DEFAULT, transaksi: [] };
      await tulisData(dataDefault);
      return dataDefault;
    }

    const parsed = JSON.parse(teks);

    if (Array.isArray(parsed)) {
      return { kategori: KATEGORI_DEFAULT, transaksi: parsed };
    }

    // Pastikan jika array kategori kosong/tidak ada, gunakan KATEGORI_DEFAULT
    const listKategori = (Array.isArray(parsed.kategori) && parsed.kategori.length > 0) 
      ? parsed.kategori 
      : KATEGORI_DEFAULT;

    return {
      kategori: listKategori,
      transaksi: Array.isArray(parsed.transaksi) ? parsed.transaksi : []
    };
  } catch (err) {
    console.error('Gagal membaca file OPFS: ', err);
    return { kategori: KATEGORI_DEFAULT, transaksi: [] };
  }
}

// Fungsi 4: Menulis data ke file OPFS
async function tulisData(db) {
  try {
    const handle = await dapatkanFileHandle();
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(db, null, 2));
    await writable.close();
    console.log('BERHASIL MENULIS KE FILE HP!');
    return true;
  } catch (err) {
    console.error('Gagal menulis OPFS: ', err);
    return false;
  }
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(() => {
    console.log('PWA Service Worker aktif');
  }).catch(err => {
    console.error('Gagal registrasi Service Worker: ', err);
  });
}