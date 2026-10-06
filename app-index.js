// app-index.js

// 1. HITUNG SALDO PER KANTONG
function hitungSaldoPerKantong(db) {
  const saldoMap = {};
  const daftarKategori = Array.isArray(db?.kategori) ? db.kategori : [];
  const daftarTransaksi = Array.isArray(db?.transaksi) ? db.transaksi : [];

  daftarKategori.forEach(k => {
    saldoMap[String(k.id)] = 0;
  });

  daftarTransaksi.forEach(t => {
    const nominal = Number(t.jumlah) || 0;

    if (t.tipe === 'pemasukan') {
      daftarKategori.forEach(k => {
        const persen = Number(k.persen) || 0;
        const jlhAlokasi = (nominal * persen) / 100;
        const keyId = String(k.id);
        if (saldoMap[keyId] !== undefined) {
          saldoMap[keyId] += jlhAlokasi;
        }
      });
    } else if (t.tipe === 'pengeluaran') {
      const targetId = String(t.kategoriId);
      if (saldoMap[targetId] !== undefined) {
        saldoMap[targetId] -= nominal;
      }
    }
  });

  return saldoMap;
}

// 2. RENDER POPULATE DROPDOWN KANTONG
async function populateDropdownKategori(db) {
  const selectEl = document.getElementById('select-kategori');
  if (!selectEl) return;

  const daftarKategori = Array.isArray(db?.kategori) ? db.kategori : [];
  selectEl.innerHTML = '<option value="">-- Pilih Kantong Kas --</option>';

  daftarKategori.forEach(k => {
    const option = document.createElement('option');
    option.value = String(k.id);
    option.textContent = `${k.nama} (${k.persen}%)`;
    selectEl.appendChild(option);
  });
}

// 3. TOGGLE TAMPILKAN DROPDOWN KANTONG JIKA PENGELUARAN
function handleTipeChange() {
  const tipeSelect = document.getElementById('tipe-transaksi');
  const wrapperKategori = document.getElementById('wrapper-select-kategori');

  if (tipeSelect && wrapperKategori) {
    if (tipeSelect.value === 'pengeluaran') {
      wrapperKategori.style.display = 'block';
    } else {
      wrapperKategori.style.display = 'none'; // Sembunyikan jika Pemasukan
    }
  }
}

// 4. RENDER UI UTAMA
async function renderIndexUI() {
  const db = await bacaData();
  const saldoMap = hitungSaldoPerKantong(db);
  
  const listKantongEl = document.getElementById('kantong-list');
  const totalSaldoEl = document.getElementById('total-saldo');
  const daftarKategori = Array.isArray(db?.kategori) ? db.kategori : [];

  if (listKantongEl) {
    listKantongEl.innerHTML = '';
    let totalSemua = 0;

    daftarKategori.forEach(k => {
      const saldo = saldoMap[String(k.id)] || 0;
      totalSemua += saldo;
      const warnaSaldo = saldo < 0 ? 'var(--danger-color)' : 'var(--success-color)';

      const card = document.createElement('div');
      card.className = 'card-kantong';
      
      card.innerHTML = `
        <small>${k.nama} (${k.persen}%)</small>
        <h4 style="color: ${warnaSaldo};">
          Rp ${Math.round(saldo).toLocaleString('id-ID')}
        </h4>
      `;
      listKantongEl.appendChild(card);
    });

    if (totalSaldoEl) {
      totalSaldoEl.textContent = `Rp ${Math.round(totalSemua).toLocaleString('id-ID')}`;
    }
  }

  await populateDropdownKategori(db);
  handleTipeChange();
}

// 5. INISIALISASI & HANDLER SUBMIT
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof cekStatusStorage === 'function') {
    await cekStatusStorage();
  }

  await renderIndexUI();

  // Listener ganti tipe transaksi
  const tipeSelect = document.getElementById('tipe-transaksi');
  if (tipeSelect) {
    tipeSelect.addEventListener('change', handleTipeChange);
  }

  // Listener Form Submit
  const formEl = document.getElementById('form-transaksi');
  if (formEl) {
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();

      const tipe = document.getElementById('tipe-transaksi').value;
      const kategoriId = document.getElementById('select-kategori').value;
      const deskripsi = document.getElementById('ket-transaksi').value.trim();
      const jumlahInput = document.getElementById('jumlah-transaksi').value;
      
      // Ambil angka murni jika disisipi titik format
      const jumlah = Number(jumlahInput.replace(/\D/g, '')) || 0;

      if (jumlah <= 0) {
        return typeof showToast === 'function' 
          ? showToast('Nominal harus lebih besar dari 0!', 'error')
          : alert('Nominal harus lebih besar dari 0!');
      }

      if (tipe === 'pengeluaran' && !kategoriId) {
        return typeof showToast === 'function' 
          ? showToast('Pilih kantong kas pengeluaran terlebih dahulu!', 'info')
          : alert('Pilih kantong kas pengeluaran terlebih dahulu!');
      }

      const db = await bacaData();
      db.transaksi = Array.isArray(db.transaksi) ? db.transaksi : [];

      const transaksiBaru = {
        id: Date.now(),
        tipe: tipe,
        jumlah: jumlah,
        deskripsi: deskripsi || (tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'),
        tanggal: new Date().toLocaleDateString('id-ID')
      };

      if (tipe === 'pengeluaran') {
        transaksiBaru.kategoriId = kategoriId;
      }

      db.transaksi.push(transaksiBaru);
      await tulisData(db);

      // Reset Input Form
      document.getElementById('jumlah-transaksi').value = '';
      document.getElementById('ket-transaksi').value = '';

      await renderIndexUI();

      // Notifikasi Toast
      if (typeof showToast === 'function') {
        showToast('Transaksi berhasil disimpan!', 'success');
      } else {
        alert('Transaksi berhasil disimpan!');
      }
    });
  }
});