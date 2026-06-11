// ==========================================================================
// CONFIGURATION ENGINE - ABSENSI DIGITAL POLRI PRESISI
// ==========================================================================

const ADMIN_USER = "ABSENSIONIPN2026##"; // Token Akses Utama Provos

// Sinkronisasi Memori Lokal
let databaseAbsensi = JSON.parse(localStorage.getItem('polri_db_absensi')) || [];
// Default Webhook milik Anda langsung terpasang di sini
let currentWebhookURL = localStorage.getItem('polri_webhook_url') || "https://discord.com/api/webhooks/1500117207366238340/hMkE7VzL7OBCO9JnHFmCCusOFUjXjcP123j9emE4o79i26UJdZzsDTw2cyoYdGSKBw-4";

let currentUser = "";
let currentRank = "";
let currentPosition = "";
let currentNrp = "";

let isGateOpen = localStorage.getItem('exambro_gate_status') !== 'closed';
let countdownTimer = null;
let timeLeft = 300; // Timer Pembatasan Izin 5 Menit

// DOM Selector Pages & Form Elemen
const welcomePage = document.getElementById('welcome-page');
const memberLoginPage = document.getElementById('member-login-page');
const permissionPage = document.getElementById('permission-page');
const adminLoginPage = document.getElementById('admin-login-page');
const adminPage = document.getElementById('admin-page');

const loginForm = document.getElementById('login-form');
const permissionForm = document.getElementById('permission-form');
const adminAuthForm = document.getElementById('admin-auth-form');
const adminSecretCode = document.getElementById('admin-secret-code');
const webhookUrlInput = document.getElementById('webhook-url-input');

// Setup Tampilan Webhook di Form Pengaturan
if(currentWebhookURL) webhookUrlInput.value = currentWebhookURL;

// ROUTER SYSTEM EVENTS
document.getElementById('btn-go-to-member').addEventListener('click', () => {
    if(!isGateOpen) { showToast("Akses Ditolak! Server absensi sedang dikunci Admin.", "danger"); return; }
    switchPage('member-login-page');
});
document.getElementById('btn-go-to-admin').addEventListener('click', () => switchPage('admin-login-page'));
document.getElementById('btn-back-from-member').addEventListener('click', () => switchPage('welcome-page'));
document.getElementById('btn-back-from-admin').addEventListener('click', () => switchPage('welcome-page'));

function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// TOAST ENGINE NOTIFIKASI
function showToast(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
}

// LOGIKA INPUT DATA & PENENTUAN STATUS (HADIR / IZIN)
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    currentUser = document.getElementById('discord-name').value.trim();
    currentRank = document.getElementById('police-rank').value;
    currentPosition = document.getElementById('police-position').value.trim();
    currentNrp = document.getElementById('police-nrp').value.trim() || "Tidak Ada";
    const status = document.getElementById('attendance-status').value;

    if (status === "HADIR") {
        simpanDataKehadiran(currentUser, currentRank, currentPosition, currentNrp, "HADIR", "Dinas Aktif");
        kirimWebhookDiscord(currentUser, currentRank, currentPosition, currentNrp, "HADIR");
        
        showToast("Absensi HADIR sukses terkirim ke sistem & Discord!", "success");
        resetFormInputs();
        switchPage('welcome-page'); 
    } else {
        switchPage('permission-page');
        startPermissionTimer();
    }
});

// ENGINE COUNTDOWN SURAT IZIN (5 MENIT)
function startPermissionTimer() {
    timeLeft = 300; 
    const timerDisplay = document.getElementById('timer-countdown');
    
    if(countdownTimer) clearInterval(countdownTimer);
    
    countdownTimer = setInterval(() => {
        timeLeft--;
        let minutes = Math.floor(timeLeft / 60);
        let seconds = timeLeft % 60;
        
        timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(countdownTimer);
            showToast("Waktu habis! Anda gagal melengkapi surat izin.", "danger");
            resetFormInputs();
            switchPage('welcome-page');
        }
    }, 1000);
}

// PROSES SUBMIT SURAT IZIN
permissionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearInterval(countdownTimer); 
    
    const alasan = document.getElementById('permission-reason').value.trim();
    
    simpanDataKehadiran(currentUser, currentRank, currentPosition, currentNrp, "IZIN", alasan);
    kirimWebhookDiscord(currentUser, currentRank, currentPosition, currentNrp, `IZIN (${alasan})`);
    
    showToast("Berkas Dokumen Izin berhasil diverifikasi dan dikirim!", "success");
    resetFormInputs();
    switchPage('welcome-page');
});

// LOCAL STORAGE PERSISTENCE ENGINE
function simpanDataKehadiran(name, rank, pos, nrp, status, ket) {
    const waktuSekarang = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const logBaru = { waktu: waktuSekarang, nama: name, pangkat: rank, jabatan: pos, nrp: nrp, status: status, keterangan: ket };
    
    databaseAbsensi.push(logBaru);
    localStorage.setItem('polri_db_absensi', JSON.stringify(databaseAbsensi));
    updateDashboardUI();
}

// SINKRONISASI INTEGRASI DISCORD EMBED PAYLOAD
function kirimWebhookDiscord(name, rank, pos, nrp, statusValue) {
    if (!currentWebhookURL) {
        console.log("Konfigurasi Webhook Discord belum disetel.");
        return;
    }

    const payload = {
        embeds: [{
            title: "🚨 LAPORAN PRESENSI DIGITAL ANGGOTA 🚨",
            color: statusValue.includes("HADIR") ? 1352433 : 14251782, // Hijau (Hadir) / Kuning-Emas (Izin)
            fields: [
                { name: "👤 Nama Anggota", value: name, inline: true },
                { name: "🏅 Pangkat", value: rank, inline: true },
                { name: "💼 Jabatan / Kesatuan", value: pos, inline: false },
                { name: "🆔 NRP", value: nrp, inline: true },
                { name: "📌 Status Kehadiran", value: `**${statusValue}**`, inline: true }
            ],
            timestamp: new Date().toISOString(),
            footer: { text: "Sistem Absensi Digital Polri • Presisi" }
        }]
    };

    fetch(currentWebhookURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    }).then(res => {
        if(res.ok) console.log("Laporan presensi diteruskan ke Discord Server.");
    }).catch(err => console.error("Kegagalan pengiriman webhook:", err));
}

// VERIFIKASI LOGIN ADMIN PROVOS
adminAuthForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (adminSecretCode.value.trim() === ADMIN_USER) {
        switchPage('admin-page');
        updateDashboardUI();
        showToast("Selamat datang di Konsol Utama Provos.", "success");
    } else {
        showToast("Token Keamanan Otoritas Salah!", "danger");
    }
});

document.getElementById('btn-save-webhook').addEventListener('click', () => {
    currentWebhookURL = webhookUrlInput.value.trim();
    localStorage.setItem('polri_webhook_url', currentWebhookURL);
    showToast("URL Webhook Discord berhasil diperbarui!", "success");
});

// TAB PANEL DASHBOARD SWITCH NAVIGATION
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// RESET & CLEAR DATA CONTROLLER
document.getElementById('btn-delete-daily').addEventListener('click', () => {
    if(confirm("Apakah Anda yakin ingin menghapus data absensi HARI INI?")) {
        const hariIni = new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
        databaseAbsensi = databaseAbsensi.filter(item => !item.waktu.includes(hariIni));
        localStorage.setItem('polri_db_absensi', JSON.stringify(databaseAbsensi));
        updateDashboardUI();
        showToast("Data log harian dibersihkan.", "success");
    }
});

document.getElementById('btn-delete-monthly').addEventListener('click', () => {
    if(confirm("Apakah Anda yakin ingin mengosongkan SELURUH database absensi?")) {
        databaseAbsensi = [];
        localStorage.removeItem('polri_db_absensi');
        updateDashboardUI();
        showToast("Seluruh database rekapitulasi dibersihkan total.", "success");
    }
});

// SHEETJS ADVANCED EXCEL REPORT EXPORT
document.getElementById('btn-export-excel').addEventListener('click', () => {
    if (databaseAbsensi.length === 0) {
        showToast("Gagal export, data rekapitulasi kosong.", "danger");
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(databaseAbsensi);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Absensi Polri");
    XLSX.writeFile(workbook, "REKAP_ABSENSI_DIGITAL_POLRI.xlsx");
    showToast("File Laporan Excel berhasil diunduh!", "success");
});

// ENGINE RE-RENDER ENGINE UNTUK INTEGRASI STATISTIK VIEW
function updateDashboardUI() {
    const tbodyRiwayat = document.getElementById('tbody-riwayat');
    tbodyRiwayat.innerHTML = "";
    
    let rekapKeaktifan = {};
    let rekapJabatan = {};

    databaseAbsensi.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item.waktu}</td><td>${item.nama}</td><td>${item.pangkat}</td><td>${item.jabatan}</td><td>${item.nrp}</td><td><span class="status-badge ${item.status.toLowerCase()}">${item.status}</span></td><td>${item.keterangan}</td>`;
        tbodyRiwayat.appendChild(tr);

        if(!rekapKeaktifan[item.nama]) {
            rekapKeaktifan[item.nama] = { nama: item.nama, pangkat: item.pangkat, hadir: 0, izin: 0 };
        }
        if(item.status === "HADIR") rekapKeaktifan[item.nama].hadir++;
        else rekapKeaktifan[item.nama].izin++;

        if(!rekapJabatan[item.jabatan]) rekapJabatan[item.jabatan] = 0;
        rekapJabatan[item.jabatan]++;
    });

    const tbodyKeaktifan = document.getElementById('tbody-keaktifan');
    const tbodyPrestasi = document.getElementById('tbody-prestasi');
    tbodyKeaktifan.innerHTML = "";
    tbodyPrestasi.innerHTML = "";

    const arrKeaktifan = Object.values(rekapKeaktifan);
    
    arrKeaktifan.forEach(user => {
        const totalSesi = user.hadir + user.izin;
        const persen = totalSesi > 0 ? Math.round((user.hadir / totalSesi) * 100) : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${user.nama}</td><td>${user.pangkat}</td><td>${user.hadir} Hari</td><td>${user.izin} Kali</td><td><strong>${persen}% Keaktifan</strong></td>`;
        tbodyKeaktifan.appendChild(tr);
    });

    const arrPrestasi = [...arrKeaktifan].sort((a,b) => b.hadir - a.hadir);
    arrPrestasi.forEach((user, index) => {
        const predikat = user.hadir > 10 ? "TELADAN UTAMA" : "DISIPLIN";
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>#${index + 1}</td><td>${user.nama}</td><td>${user.pangkat}</td><td>${user.hadir * 10} Poin</td><td><span style="color:#10b981;font-weight:bold;">${predikat}</span></td>`;
        tbodyPrestasi.appendChild(tr);
    });

    const tbodyJabatan = document.getElementById('tbody-jabatan');
    tbodyJabatan.innerHTML = "";
    Object.keys(rekapJabatan).forEach(jab => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${jab}</td><td>${rekapJabatan[jab]} Personel</td><td><span style="color:#38bdf8;">Siaga Operasional</span></td>`;
        tbodyJabatan.appendChild(tr);
    });
}

// BUKA-TUTUP AKSES GERBANG ABSEN OLEH ADMIN
document.getElementById('btn-gate-toggle').addEventListener('click', () => {
    isGateOpen = !isGateOpen;
    localStorage.setItem('exambro_gate_status', isGateOpen ? 'open' : 'closed');
    showToast(`Status Gerbang Absensi: ${isGateOpen ? 'DIBUKA' : 'DIKUNCI PROVOS'}`, "info");
});

document.getElementById('btn-admin-logout').addEventListener('click', () => {
    adminSecretCode.value = "";
    switchPage('welcome-page');
});

function resetFormInputs() {
    document.getElementById('discord-name').value = "";
    document.getElementById('police-position').value = "";
    document.getElementById('police-nrp').value = "";
    document.getElementById('permission-reason').value = "";
    document.getElementById('permission-file').value = "";
            }
