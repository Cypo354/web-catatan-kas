// app-settings.js

async function renderSettingsUI() {
  // Cukup panggil bacaData(), storage.js yang menjamin data default tersedia
  const db = await bacaData();
  const daftarKategori = Array.isArray(db.kategori) ? db.kategori : [];

  const listEl = document.getElementById('kategori-list');
  const totalPersenEl = document.getElementById('total-persen');
  const statusPersenEl = document.getElementById('status-persen');

  let totalPersen = 0;
  if (listEl) listEl.innerHTML = '';

  daftarKategori.forEach(k => {
    const persen = Number(k.persen) || 0;
    totalPersen += persen;

    if (listEl) {
      const li = document.createElement('li');
      li.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #e2e8f0;';
      
      li.innerHTML = `
        <div>
          <strong>${k.nama}</strong>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <input type="number" class="input-persen" data-id="${k.id}" value="${persen}" min="0" max="100" style="width: 70px; padding: 6px; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px;"> %
          <button onclick="hapusKategori('${k.id}')" style="background:none; border:none; color:#ef4444; font-weight:bold; cursor:pointer; padding:4px 8px;">✕</button>
        </div>
      `;
      listEl.appendChild(li);
    }
  });

  // Update Status Total Persentase
  if (totalPersenEl) {
    totalPersenEl.textContent = `${totalPersen}%`;
    if (totalPersen === 100) {
      totalPersenEl.style.color = '#10b981';
      if (statusPersenEl) statusPersenEl.textContent = '✓ Total alokasi sudah pas 100%';
    } else {
      totalPersenEl.style.color = '#ef4444';
      if (statusPersenEl) statusPersenEl.textContent = `⚠️ Total alokasi harus 100% (Saat ini: ${totalPersen}%)`;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Handler Form Tambah Kategori (ID berbasis Timestamp)
    const formEl = document.getElementById('form-kategori');
    if (formEl) {
      formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const namaInput = document.getElementById('nama-kategori');
        const persenInput = document.getElementById('persen-kategori');

        const nama = namaInput.value.trim();
        const persen = Number(persenInput.value) || 0;

        if (!nama) return alert('Nama kantong tidak boleh kosong!');

        let db = await bacaData();
        db.kategori = db.kategori || [];

        // Gunakan timestamp agar ID dijamin unik
        const newId = Date.now();

        db.kategori.push({ id: newId, nama: nama, persen: persen });
        await tulisData(db);

        namaInput.value = '';
        persenInput.value = '';
        await renderSettingsUI();
      });
    // Export Data
    const btnExport = document.getElementById('btn-export-json');
    if (btnExport) {
      btnExport.addEventListener('click', async() => {
        const db = await bacaData();

        // Format nama file cadangan dengan tanggal hari ini
        const tgl = new Date().toISOString().split('T')[0];
        const namaFile = `backup_keuangan_${tgl}.json`;

        // Ubah data JSON ke Blob Object
        const jsonStr = JSON.stringify(db, null, 2);
        const blob = new Blob([jsonStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);

        // Triger download otomatis via elemen <a> semu
        const a = document.createElement('a');
        a.href = url;
        a.download = namaFile;
        document.body.appendChild(a);
        a.click();

        // Bersihkan DOM
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    // Import Data
    const btnImport = document.getElementById('btn-import-json');
    const fileInput = document.getElementById('input-import-file');

    if (btnImport && fileInput) {
      btnImport.addEventListener('click', async () => {
        // 1. Cek apakah pengguna sudah memilih file di <input type="file">
        const file = fileInput.files[0];

        if (!file) {
          return alert('Silakan pilih file backup (.json) terlebih dahulu!');
        }

        // 2. Konfirmasi sebelum menimpa data
        if (!confirm('PERHATIAN: Mengembalikan data dari file backup akan menimpa seluruh data kas & transaksi yang ada saat ini. Lanjutkan?')) {
          return;
        }

        const reader = new FileReader();

        // 3. Eksekusi restore saat reader membaca file (onload menggunakan 'l' kecil)
        reader.onload = async (e) => {
          try {
            const parsedData = JSON.parse(e.target.result);

            // Validasi struktur JSON (transaksi dengan huruf 'r')
            if (!parsedData || !Array.isArray(parsedData.kategori) || !Array.isArray(parsedData.transaksi)) {
              return alert('Format file JSON tidak valid! Pastikan file memuat data kategori dan transaksi.');
            }

            // Tulis data baru ke OPFS/Storage
            await tulisData(parsedData);
            alert('✅ Data berhasil dipulihkan!');

            fileInput.value = ''; // Reset input file setelah sukses
            
            if (typeof renderSettingsUI === 'function') {
              await renderSettingsUI();
            } else {
              window.location.reload();
            }
          } catch (err) {
            console.error('Gagal membaca JSON: ', err);
            alert('Gagal memproses file. Pastikan file berupa JSON yang valid.');
          }
        };

        // Mulai membaca file
        reader.readAsText(file);
      });
    }
  }

  // Handler Simpan Perubahan Persentase
  const btnSimpan = document.getElementById('btn-simpan-persen');
  if (btnSimpan) {
    btnSimpan.addEventListener('click', async () => {
      const inputs = document.querySelectorAll('.input-persen');
      let db = await bacaData();

      let newTotal = 0;
      const tempMap = {};

      inputs.forEach(input => {
        const id = String(input.dataset.id);
        const val = Number(input.value) || 0;
        tempMap[id] = val;
        newTotal += val;
      });

      if (newTotal !== 100) {
        if (!confirm(`Total alokasi saat ini ${newTotal}%. Disarankan total berjumlah 100%. Tetap simpan?`)) {
          return;
        }
      }

      db.kategori.forEach(k => {
        const keyId = String(k.id);
        if (tempMap[keyId] !== undefined) {
          k.persen = tempMap[keyId];
        }
      });

      await tulisData(db);
      alert('Alokasi persentase berhasil diperbarui!');
      await renderSettingsUI();
    });
  }

  // Render pertama kali
  renderSettingsUI();
});

// Global Function Hapus Kategori
window.hapusKategori = async function(id) {
  if (confirm('Yakin ingin menghapus kantong ini?')) {
    let db = await bacaData();
    db.kategori = (db.kategori || []).filter(k => String(k.id) !== String(id));
    await tulisData(db);
    await renderSettingsUI();
  }
};