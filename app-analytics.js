// app-analytics.js

let instanceChartKantong = null;
let instanceChartHistory = null;

// 1. HITUNG SALDO DINAMIS
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

// 2. RENDER DAFTAR TRANSAKSI
// app-analytics.js

// 1. RENDER DAFTAR RIWAYAT TRANSAKSI (+ TOMBOL HAPUS)
function renderDaftarRiwayat(db) {
  const ulEl = document.getElementById('transaksi-list');
  if (!ulEl) return;

  const daftarTransaksi = Array.isArray(db?.transaksi) ? [...db.transaksi].reverse() : [];
  const mapKategori = {};
  (db?.kategori || []).forEach(k => {
    mapKategori[String(k.id)] = k.nama;
  });

  if (daftarTransaksi.length === 0) {
    ulEl.innerHTML = '<li style="text-align: center; color: #94a3b8; padding: 15px; list-style: none;">Belum ada riwayat transaksi.</li>';
    return;
  }

  ulEl.innerHTML = '';

  daftarTransaksi.forEach(t => {
    const isPemasukan = t.tipe === 'pemasukan';
    const warnaNominal = isPemasukan ? '#10b981' : '#ef4444';
    const tanda = isPemasukan ? '+' : '-';
    
    const namaKantong = isPemasukan 
      ? 'Semua Kantong (Alokasi Otomatis)' 
      : (mapKategori[String(t.kategoriId)] || 'Kantong Dihapus');

    const li = document.createElement('li');
    li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e2e8f0; list-style: none;';
    
    li.innerHTML = `
      <div>
        <strong style="display: block; font-size: 14px; color: #1e293b;">${t.deskripsi || (isPemasukan ? 'Pemasukan' : 'Pengeluaran')}</strong>
        <small style="color: #64748b; font-size: 11px;">${t.tanggal || ''} • <span style="color:#2563eb; font-weight: 500;">${namaKantong}</span></small>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-weight: bold; color: ${warnaNominal}; font-size: 14px;">
          ${tanda} Rp ${Number(t.jumlah).toLocaleString('id-ID')}
        </span>
        <!-- TOMBOL HAPUS TRANSAKSI -->
        <button onclick="hapusTransaksi('${t.id}')" style="background: none; border: none; color: #ef4444; font-size: 16px; cursor: pointer; padding: 2px 6px;" title="Hapus Transaksi">
          X
        </button>
      </div>
    `;
    
    ulEl.appendChild(li);
  });
}

// 2. FUNGSI GLOBAL HAPUS TRANSAKSI
window.hapusTransaksi = async function(id) {
  if (confirm('Yakin ingin menghapus riwayat transaksi ini?')) {
    const db = await bacaData();
    // Filter out transaksi berdasarkan ID
    db.transaksi = (db.transaksi || []).filter(t => String(t.id) !== String(id));
    
    // Tulis ulang ke OPFS
    await tulisData(db);
    
    // Render ulang UI Analytics
    await initAnalytics();
  }
};

// 3. RENDER CHART
function renderCharts(db, saldoMap) {
  const daftarKategori = Array.isArray(db?.kategori) ? db.kategori : [];
  const daftarTransaksi = Array.isArray(db?.transaksi) ? db.transaksi : [];

  // A. Donut Chart
  const canvasKantong = document.getElementById('chart-kantong');
  const legendaEl = document.getElementById('legenda-kantong');

  if (canvasKantong && window.Chart) {
    const labels = [];
    const dataSaldo = [];
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

    if (legendaEl) legendaEl.innerHTML = '';

    daftarKategori.forEach((k, idx) => {
      const saldo = saldoMap[String(k.id)] || 0;
      labels.push(k.nama);
      dataSaldo.push(saldo > 0 ? saldo : 0);

      if (legendaEl) {
        const color = colors[idx % colors.length];
        const warnaSaldo = saldo < 0 ? '#ef4444' : '#1e293b';
        
        const itemLegenda = document.createElement('div');
        itemLegenda.style.cssText = 'display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500;';
        itemLegenda.innerHTML = `
          <span style="width: 10px; height: 10px; background-color: ${color}; border-radius: 50%; display: inline-block;"></span>
          ${k.nama}: <span style="color: ${warnaSaldo};">Rp ${saldo.toLocaleString('id-ID')}</span>
        `;
        legendaEl.appendChild(itemLegenda);
      }
    });

    if (instanceChartKantong) instanceChartKantong.destroy();

    instanceChartKantong = new Chart(canvasKantong, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataSaldo,
          backgroundColor: colors.slice(0, labels.length)
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  // B. Bar Chart
  // app-analytics.js

// --- B. GRAFIK TREN HISTORIS PEMASUKAN & PENGELUARAN (LINE CHART) ---
const canvasHistory = document.getElementById('chart-history');
if (canvasHistory && typeof window.Chart !== 'undefined') {
  const daftarTransaksi = Array.isArray(db?.transaksi) ? db.transaksi : [];

  // 1. Kelompokkan Nominal Pemasukan & Pengeluaran Berdasarkan Tanggal
  const petaTanggal = {};

  // Urutkan transaksi berdasarkan ID/Waktu (Kronologis dari lama ke baru)
  const transaksiUrut = [...daftarTransaksi].sort((a, b) => a.id - b.id);

  transaksiUrut.forEach(t => {
    const tgl = t.tanggal || 'Tanpa Tanggal';
    if (!petaTanggal[tgl]) {
      petaTanggal[tgl] = { masukan: 0, keluaran: 0 };
    }
    
    const nominal = Number(t.jumlah) || 0;
    if (t.tipe === 'pemasukan') {
      petaTanggal[tgl].masukan += nominal;
    } else if (t.tipe === 'pengeluaran') {
      petaTanggal[tgl].keluaran += nominal;
    }
  });

  // 2. Ekstrak Label Tanggal dan Data Array untuk Chart.js
  const labelsTanggal = Object.keys(petaTanggal);
  const dataPemasukan = labelsTanggal.map(tgl => petaTanggal[tgl].masukan);
  const dataPengeluaran = labelsTanggal.map(tgl => petaTanggal[tgl].keluaran);

  if (instanceChartHistory) instanceChartHistory.destroy();

  // 3. Render Line Chart
  instanceChartHistory = new Chart(canvasHistory, {
    type: 'line',
    data: {
      labels: labelsTanggal.length > 0 ? labelsTanggal : ['Belum Ada Data'],
      datasets: [
        {
          label: 'Pemasukan (+)',
          data: dataPemasukan.length > 0 ? dataPemasukan : [0],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.3, // Efek kurva halus pada garis
          pointRadius: 4,
          pointBackgroundColor: '#10b981'
        },
        {
          label: 'Pengeluaran (-)',
          data: dataPengeluaran.length > 0 ? dataPengeluaran : [0],
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#ef4444'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true, // Tampilkan legenda agar pengguna tahu garis hijau vs merah
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: Rp ${context.parsed.y.toLocaleString('id-ID')}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return 'Rp ' + value.toLocaleString('id-ID');
            }
          }
        }
      }
    }
  });
}
}

// 4. EKSKUSI UTAMA
async function initAnalytics() {
  try {
    const db = await bacaData();
    const saldoMap = hitungSaldoPerKantong(db);
    const daftarKategori = Array.isArray(db?.kategori) ? db.kategori : [];

    renderDaftarRiwayat(db);
    renderCharts(db, saldoMap);

    // Alert Defisit
    const kantongDefisit = [];
    daftarKategori.forEach(k => {
      const saldo = saldoMap[String(k.id)] || 0;
      if (saldo < 0) {
        kantongDefisit.push(`<li><strong>${k.nama}</strong>: -Rp ${Math.abs(saldo).toLocaleString('id-ID')}</li>`);
      }
    });

    const alertEl = document.getElementById('peringatan-defisit');
    if (alertEl) {
      if (kantongDefisit.length > 0) {
        alertEl.style.cssText = 'display: block; background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px; border-radius: 8px; font-size: 13px; margin-top: 15px;';
        alertEl.innerHTML = `⚠️ <strong>Perhatian: Ada Kantong Defisit!</strong><ul style="margin: 6px 0 0 16px; padding: 0;">${kantongDefisit.join('')}</ul>`;
      } else {
        alertEl.style.display = 'none';
      }
    }
  } catch (err) {
    console.error("Gagal memuat Analytics UI:", err);
  }
}

// Jalankan fungsi eksekusi langsung
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnalytics);
} else {
  initAnalytics();
}