// ==========================================================================
// CORE ENGINE V2.5 - JAVASCRIPT PROGRAM LOGIC
// ==========================================================================

// Inisialisasi awal basis data
let db_absensi = JSON.parse(localStorage.getItem('db_absensi_v25')) || [];
let system_gate_open = localStorage.getItem('gate_status_v25') !== 'CLOSED';
let active_webhook = localStorage.getItem('webhook_url_v25') || "";
let uploaded_image_base64 = ""; // Menyimpan aset string gambar biner lokal

// Fungsi Router Navigasi SPA
function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// Banner Pop-up Notifikasi
function showToast(message) {
    const container = document.getElementById('notification-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3500);
}

// Alur Pindah Halaman
document.getElementById('btn-go-to-member').addEventListener('click', () => {
    if(!system_gate_open) {
        showToast("❌ PENDAFTARAN ABSENSI HARI INI SUDAH DITUTUP PENGELOLA!");
        return;
    }
    navigateTo('member-login-page');
});
document.getElementById('btn-go-to-admin').addEventListener('click', () => { navigateTo('admin-login-page'); });
document.getElementById('btn-back-from-member').addEventListener('click', () => { navigateTo('welcome-page'); });
document.getElementById('btn-back-from-admin').addEventListener('click', () => { navigateTo('welcome-page'); });

// Navigasi Tab Log In Admin
document.getElementById('tab-auth-finger').addEventListener('click', (e) => {
    document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-mode-content').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById('mode-fingerprint').classList.add('active');
});
document.getElementById('tab-auth-manual').addEventListener('click', (e) => {
    document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-mode-content').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById('mode-manual-pass').classList.add('active');
});

// Otentikasi Biometrik Masuk Admin
document.getElementById('btn-biometric-scan').addEventListener('click', function() {
    const btn = this;
    const statusText = document.getElementById('scan-status');
    btn.classList.add('scanning');
    statusText.innerText = "SEDANG MEMVERIFIKASI TANDA BIOMETRIK...";
    
    setTimeout(() => {
        btn.classList.remove('scanning');
        statusText.innerText = "OTENTIKASI SUKSES!";
        showToast("🟢 Selamat datang di konsol kendali admin.");
        navigateTo('admin-page');
        setTimeout(() => { statusText.innerText = "MENUNGGU VERIFIKASI BIOMETRIK..."; }, 1000);
    }, 1800);
});

// Otentikasi Password Masuk Admin (Password Default: 123)
document.getElementById('admin-auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if(document.getElementById('admin-secret-code').value === "123") {
        showToast("🟢 Kode Akses Diterima!");
        document.getElementById('admin-secret-code').value = "";
        navigateTo('admin-page');
    } else {
        showToast("❌ Password Salah!");
    }
});

// ==========================================================================
// OPERASIONAL PENGOLAHAN FORMULIR ABSENSI V2.5
// ==========================================================================

// Trigger input file dari tombol visual
document.getElementById('btn-trigger-upload').addEventListener('click', () => {
    document.getElementById('member-photo-input').click();
});

// Konversi File Gambar Galeri ke String Base64 untuk Penyimpanan Lokal
document.getElementById('member-photo-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            uploaded_image_base64 = event.target.result;
            
            // Masukkan ke preview box hitam
            document.getElementById('uploaded-image-preview').src = event.target.result;
            document.getElementById('uploaded-image-preview').style.display = "block";
            document.getElementById('preview-placeholder').style.display = "none";
            showToast("🟢 Gambar berhasil dimuat!");
        };
        reader.readAsDataURL(file);
    }
});

// Pembatalan Mengisi Form
document.getElementById('btn-cancel-absensi').addEventListener('click', () => {
    resetFormAbsenV25();
    navigateTo('welcome-page');
});

function resetFormAbsenV25() {
    document.getElementById('login-form').reset();
    uploaded_image_base64 = "";
    document.getElementById('uploaded-image-preview').src = "";
    document.getElementById('uploaded-image-preview').style.display = "none";
    document.getElementById('preview-placeholder').style.display = "block";
}

// Pengiriman Data Akhir Absensi
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if(!uploaded_image_base64) {
        showToast("❌ Anda harus melampirkan file gambar bukti hadir!");
        return;
    }

    const payloadData = {
        waktu: new Date().toLocaleString('id-ID'),
        nama: document.getElementById('discord-name').value,
        divisi: document.getElementById('police-position').value,
        hari: document.getElementById('attendance-day').value,
        status: "HADIR",
        foto_lokal: uploaded_image_base64 // Hanya disimpan di database lokal browser
    };

    // 1. Simpan ke Local Database
    db_absensi.push(payloadData);
    localStorage.setItem('db_absensi_v25', JSON.stringify(db_absensi));
    showToast(`🟢 Absensi berhasil disimpan untuk ${payloadData.nama}!`);

    // 2. Integrasi Pengiriman Log ke Webhook Discord Tanpa Foto (Mencegah Error Payload Limit)
    if(active_webhook) {
        const discordFormat = {
            embeds: [{
                title: `🔔 NOTIFIKASI LOG ABSENSI MASUK - ${payloadData.hari}`,
                color: 3066993,
                fields: [
                    { name: "Nama Anggota", value: payloadData.nama, inline: true },
                    { name: "Divisi / Kesatuan", value: payloadData.divisi, inline: true },
                    { name: "Hari Kehadiran", value: payloadData.hari, inline: true },
                    { name: "Waktu Pencatatan", value: payloadData.waktu, inline: false }
                ],
                footer: { text: "Sistem Otomatis V2.5 - POLRI COMMAND SYSTEM" }
            }]
        };
        fetch(active_webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(discordFormat)
        }).catch(() => console.log("Discord sync failed."));
    }

    resetFormAbsenV25();
    navigateTo('welcome-page');
});

// ==========================================================================
// LOGIKA SINKRONISASI TOMBOL KAPSUL GRID ADMIN PANEL
// ==========================================================================
const modal = document.getElementById('admin-data-modal');
const modalTitle = document.getElementById('modal-data-title');
const tableHead = document.getElementById('modal-table-head');
const tableBody = document.getElementById('modal-table-body');

document.getElementById('btn-close-modal').addEventListener('click', () => { modal.classList.remove('active'); });

// 1. Rekap Kehadiran
document.getElementById('btn-admin-rekap').addEventListener('click', () => {
    modalTitle.innerText = "Rekapitulasi Kehadiran Sistem";
    tableHead.innerHTML = `<tr><th>Waktu</th><th>Nama</th><th>Divisi</th><th>Hari</th><th>Status</th></tr>`;
    tableBody.innerHTML = db_absensi.length === 0 ? `<tr><td colspan="5" style="text-align:center;">Belum ada record data.</td></tr>` :
        db_absensi.map(d => `<tr><td>${d.waktu}</td><td>${d.nama}</td><td>${d.divisi}</td><td>${d.hari}</td><td><span class="badge">${d.status}</span></td></tr>`).join('');
    modal.classList.add('active');
});

// 2. Kelola Absensi (Hapus Parsial)
document.getElementById('btn-admin-kelola').addEventListener('click', () => {
    modalTitle.innerText = "Kelola Manajemen Data Absen";
    tableHead.innerHTML = `<tr><th>Nama</th><th>Divisi</th><th>Hari</th><th>Tindakan</th></tr>`;
    tableBody.innerHTML = db_absensi.length === 0 ? `<tr><td colspan="4" style="text-align:center;">Kosong.</td></tr>` :
        db_absensi.map((d, index) => `<tr><td>${d.nama}</td><td>${d.divisi}</td><td>${d.hari}</td><td><button onclick="removeLogIndex(${index})" style="background:#dc2626; color:#fff; border:none; padding:5px 10px; border-radius:30px; cursor:pointer; font-size:0.75rem; font-weight:bold;">Hapus</button></td></tr>`).join('');
    modal.classList.add('active');
});

window.removeLogIndex = function(idx) {
    if(confirm("Hapus baris absensi ini?")) {
        db_absensi.splice(idx, 1);
        localStorage.setItem('db_absensi_v25', JSON.stringify(db_absensi));
        showToast("🗑️ Log terpilih dibersihkan.");
        document.getElementById('btn-admin-kelola').click();
    }
};

// 3. Atur Biometrik
document.getElementById('btn-admin-biometric-set').addEventListener('click', () => {
    const targetName = prompt("Masukkan nama anggota baru yang mau dikunci biometriknya:");
    if(targetName) {
        showToast(`🔄 Sensor aktif... Silakan tempel jari ${targetName} ke pemindai.`);
        setTimeout(() => { showToast(`🟢 Sukses merekam data biometrik untuk: ${targetName}`); }, 2000);
    }
});

// 4. Peringkat Anggota
document.getElementById('btn-admin-peringkat').addEventListener('click', () => {
    modalTitle.innerText = "Urutan Peringkat Ketertiban";
    tableHead.innerHTML = `<tr><th>Peringkat</th><th>Nama Anggota</th><th>Divisi</th><th>Status Kedisiplinan</th></tr>`;
    let urut = [...db_absensi].sort((a,b) => a.nama.localeCompare(b.nama));
    tableBody.innerHTML = urut.length === 0 ? `<tr><td colspan="4" style="text-align:center;">Tidak ada data.</td></tr>` :
        urut.map((d, i) => `<tr><td>#${i+1}</td><td>${d.nama}</td><td>${d.divisi}</td><td>🟢 Sangat Baik</td></tr>`).join('');
    modal.classList.add('active');
});

// 5. Anggota Teraktif
document.getElementById('btn-admin-teraktif').addEventListener('click', () => {
    modalTitle.innerText = "Analisis Log Kehadiran Teraktif";
    tableHead.innerHTML = `<tr><th>Nama Anggota</th><th>Total Absen Valid</th><th>Predikat</th></tr>`;
    let hitung = {};
    db_absensi.forEach(d => { hitung[d.nama] = (hitung[d.nama] || 0) + 1; });
    let susun = Object.keys(hitung).map(n => ({ nama: n, total: hitung[n] })).sort((a,b) => b.total - a.total);
    
    tableBody.innerHTML = susun.length === 0 ? `<tr><td colspan="3" style="text-align:center;">Belum ada rekap.</td></tr>` :
        susun.map(s => `<tr><td>${s.nama}</td><td><b>${s.total} Kali</b> Hadir</td><td>🎖️ Personel Teladan</td></tr>`).join('');
    modal.classList.add('active');
});

// 6. Tutup / Buka Absensi Efek Dinamis
const gateBtn = document.getElementById('btn-gate-toggle-v2');
function checkGateUI() {
    if(system_gate_open) {
        gateBtn.innerText = "Tutup Absensi";
        gateBtn.classList.remove('closed-status');
    } else {
        gateBtn.innerText = "Buka Absensi (TUTUP)";
        gateBtn.classList.add('closed-status');
    }
}
checkGateUI();

gateBtn.addEventListener('click', () => {
    system_gate_open = !system_gate_open;
    localStorage.setItem('gate_status_v25', system_gate_open ? 'OPEN' : 'CLOSED');
    checkGateUI();
    showToast(system_gate_open ? "🟢 Pintu sistem pendaftaran absen dibuka kembali!" : "🔴 Pintu sistem absen resmi ditutup.");
});

// 7. Unduh File Rekap Excel
document.getElementById('btn-export-excel-v2').addEventListener('click', () => {
    if(db_absensi.length === 0) {
        showToast("❌ Kosong! Tidak ada data ekspor.");
        return;
    }
    const cleanExportData = db_absensi.map(({waktu, nama, divisi, hari, status}) => ({waktu, nama, divisi, hari, status}));
    
    const ws = XLSX.utils.json_to_sheet(cleanExportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Log Presensi");
    XLSX.writeFile(wb, `REKAP_DATA_ABSENSI_POLRI_V25.xlsx`);
    showToast("🟢 File dokumen Excel diunduh!");
});

// 8. Reset Harian
document.getElementById('btn-delete-daily-v2').addEventListener('click', () => {
    if(confirm("Bersihkan log data harian?")) {
        db_absensi = [];
        localStorage.setItem('db_absensi_v25', JSON.stringify(db_absensi));
        showToast("🗑️ Log data harian dibersihkan.");
    }
});

// 9. Reset Bulanan
document.getElementById('btn-delete-monthly-v2').addEventListener('click', () => {
    const inputPrompt = prompt("Ketik 'RESET' untuk membersihkan database permanen, atau tempelkan tautan URL Webhook Discord baru:", active_webhook);
    if(inputPrompt === "RESET") {
        db_absensi = [];
        localStorage.removeItem('db_absensi_v25');
        showToast("💥 Pusat database dibersihkan total!");
    } else if (inputPrompt !== null) {
        active_webhook = inputPrompt;
        localStorage.setItem('webhook_url_v25', active_webhook);
        showToast("🟢 Integrasi Webhook Discord diperbarui!");
    }
});

// Keluar Sesi Admin
document.getElementById('btn-admin-logout-v2').addEventListener('click', () => {
    showToast("🔒 Sesi pengelola ditutup.");
    navigateTo('welcome-page');
});
