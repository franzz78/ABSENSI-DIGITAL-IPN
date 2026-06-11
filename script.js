// ==========================================================================
// CORE JAVASCRIPT SYSTEM - VERIFIKASI SELESAI DIMUAT (ANTI-LOCK)
// ==========================================================================

const ADMIN_USER = "ABSENSIONIPN2026##";

let databaseAbsensi = JSON.parse(localStorage.getItem('polri_db_absensi')) || [];
let currentWebhookURL = localStorage.getItem('polri_webhook_url') || "https://discord.com/api/webhooks/1500117207366238340/hMkE7VzL7OBCO9JnHFmCCusOFUjXjcP123j9emE4o79i26UJdZzsDTw2cyoYdGSKBw-4";

let currentUser = "", currentRank = "", currentPosition = "", currentNrp = "";
let isGateOpen = localStorage.getItem('exambro_gate_status') !== 'closed';
let countdownTimer = null, timeLeft = 300;

window.addEventListener('DOMContentLoaded', () => {
    
    const webhookInput = document.getElementById('webhook-url-input');
    if (webhookInput && currentWebhookURL) {
        webhookInput.value = currentWebhookURL;
    }
    
    updateDashboardUI();
    updateGateBtnUI();

    // ==========================================
    // 1. SISTEM NAVIGASI TOMBOL (SPA)
    // ==========================================
    document.getElementById('btn-go-to-member').addEventListener('click', () => {
        if(!isGateOpen) { 
            showToast("Akses Ditolak! Server absensi dikunci Provos.", "danger"); 
            return; 
        }
        switchPage('member-login-page');
    });

    document.getElementById('btn-go-to-admin').addEventListener('click', () => switchPage('admin-login-page'));
    document.getElementById('btn-back-from-member').addEventListener('click', () => switchPage('welcome-page'));
    document.getElementById('btn-back-from-admin').addEventListener('click', () => switchPage('welcome-page'));

    // ==========================================
    // 2. SUBMIT FORM HANDLERS
    // ==========================================
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        currentUser = document.getElementById('discord-name').value.trim();
        currentRank = document.getElementById('police-rank').value;
        currentPosition = document.getElementById('police-position').value.trim();
        currentNrp = document.getElementById('police-nrp').value.trim() || "Tidak Ada";
        const status = document.getElementById('attendance-status').value;

        if (status === "HADIR") {
            simpanDataKehadiran(currentUser, currentRank, currentPosition, currentNrp, "HADIR", "Dinas Aktif");
            kirimWebhookDiscord(currentUser, currentRank, currentPosition, currentNrp, "HADIR");
            showToast("Absensi HADIR sukses terkirim ke Discord!", "success");
            resetFormInputs();
            switchPage('welcome-page'); 
        } else {
            switchPage('permission-page');
            startPermissionTimer();
        }
    });

    document.getElementById('permission-form').addEventListener('submit', (e) => {
        e.preventDefault();
        clearInterval(countdownTimer);
        const alasan = document.getElementById('permission-reason').value.trim();
        simpanDataKehadiran(currentUser, currentRank, currentPosition, currentNrp, "IZIN", alasan);
        kirimWebhookDiscord(currentUser, currentRank, currentPosition, currentNrp, `IZIN (${alasan})`);
        showToast("Berkas Dokumen Izin berhasil dikirim!", "success");
        resetFormInputs();
        switchPage('welcome-page');
    });

    document.getElementById('admin-auth-form').addEventListener('submit', (e) => {
        e.preventDefault();
        if (document.getElementById('admin-secret-code').value.trim() === ADMIN_USER) {
            switchPage('admin-page');
            updateDashboardUI();
            showToast("Selamat datang di Konsol Utama Provos.", "success");
        } else {
            showToast("Token Keamanan Otoritas Salah!", "danger");
        }
    });

    // ==========================================
    // 3. UTILITY DAN AKSI ADMIN BUTTONS
    // ==========================================
    document.getElementById('btn-save-webhook').addEventListener('click', () => {
        const val = document.getElementById('webhook-url-input').value.trim();
        currentWebhookURL = val;
        localStorage.setItem('polri_webhook_url', val);
        showToast("URL Webhook Discord berhasil diperbarui!", "success");
    });

    document.getElementById('btn-delete-daily').addEventListener('click', () => {
        if(confirm("Hapus data absensi HARI INI?")) {
            const hariIni = new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
            databaseAbsensi = databaseAbsensi.filter(item => !item.waktu.includes(hariIni));
            localStorage.setItem('polri_db_absensi', JSON.stringify(databaseAbsensi));
            updateDashboardUI();
            showToast("Log harian dibersihkan.", "success");
        }
    });

    document.getElementById('btn-delete-monthly').addEventListener('click', () => {
        if(confirm("Kosongkan SELURUH database absensi?")) {
            databaseAbsensi = []; 
            localStorage.removeItem('polri_db_absensi');
            updateDashboardUI(); 
            showToast("Database dikosongkan.", "success");
        }
    });

    document.getElementById('btn-export-excel').addEventListener('click', () => {
        if (databaseAbsensi.length === 0) { showToast("Gagal export, data kosong.", "danger"); return; }
        const worksheet = XLSX.utils.json_to_sheet(databaseAbsensi);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Absensi");
        XLSX.writeFile(workbook, "REKAP_ABSENSI_DIGITAL_POLRI.xlsx");
        showToast("Excel berhasil diunduh!", "success");
    });

    const gateBtn = document.getElementById('btn-gate-toggle');
    gateBtn.addEventListener('click', () => {
        isGateOpen = !isGateOpen;
        localStorage.setItem('exambro_gate_status', isGateOpen ? 'open' : 'closed');
        updateGateBtnUI();
        showToast(`Status Gerbang Absensi: ${isGateOpen ? 'DIBUKA' : 'DIKUNCI PROVOS'}`, "info");
    });

    document.getElementById('btn-admin-logout').addEventListener('click', () => {
        document.getElementById('admin-secret-code').value = "";
        switchPage('welcome-page');
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetTab = document.getElementById(btn.dataset.tab);
            if(targetTab) targetTab.classList.add('active');
        });
    });
});

// ==========================================
// CENTRAL CORE FUNCTIONS
// ==========================================
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(pageId);
    if(targetPage) targetPage.classList.add('active');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
}

function startPermissionTimer() {
    timeLeft = 300;
    const timerDisplay = document.getElementById('timer-countdown');
    if(countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
        timeLeft--;
        let m = Math.floor(timeLeft / 60), s = timeLeft % 60;
        if(timerDisplay) timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        if (timeLeft <= 0) {
            clearInterval(countdownTimer);
            showToast("Waktu habis! Gagal mengirim surat izin.", "danger");
            resetFormInputs();
            switchPage('welcome-page');
        }
    }, 1000);
}

function simpanDataKehadiran(name, rank, pos, nrp, status, ket) {
    const waktuSekarang = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    databaseAbsensi.push({ waktu: waktuSekarang, nama: name, pangkat: rank, jabatan: pos, nrp: nrp, status: status, keterangan: ket });
    localStorage.setItem('polri_db_absensi', JSON.stringify(databaseAbsensi));
    updateDashboardUI();
}

// ==========================================================================
// FIX ENGINE WEBHOOK: Menggunakan Text Block (Tanpa Spam Emoji, Sangat Rapi)
// ==========================================================================
function kirimWebhookDiscord(name, rank, pos, nrp, statusValue) {
    if (!currentWebhookURL) return;

    // Membuat tampilan text block kode yang rapi & simetris
    const textFormatContent = 
        "```text\n" +
        "=========================================\n" +
        "        LAPORAN LAPANGAN ANGGOTA         \n" +
        "=========================================\n" +
        `Nama Anggota  : ${name}\n` +
        `Pangkat       : ${rank}\n` +
        `NRP           : ${nrp}\n` +
        `Fungsi/Jabtan : ${pos}\n` +
        `Status Log    : ${statusValue}\n` +
        "=========================================\n" +
        "```";

    const payload = {
        embeds: [{
            title: "SISTEM ABSENSI DIGITAL",
            description: textFormatContent,
            color: statusValue.includes("HADIR") ? 3447003 : 15105570, // Biru Polri untuk Hadir, Amber untuk Izin
            timestamp: new Date().toISOString(),
            footer: { text: "Otoritas Presensi Terpusat • RI" }
        }]
    };

    fetch(currentWebhookURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    }).catch(err => console.error(err));
}

function updateDashboardUI() {
    const tbodyRiwayat = document.getElementById('tbody-riwayat');
    if(!tbodyRiwayat) return;
    tbodyRiwayat.innerHTML = "";
    let rekapKeaktifan = {}, rekapJabatan = {};

    databaseAbsensi.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item.waktu}</td><td>${item.nama}</td><td>${item.pangkat}</td><td>${item.jabatan}</td><td>${item.nrp}</td><td><span class="status-badge ${item.status.toLowerCase()}">${item.status}</span></td><td>${item.keterangan}</td>`;
        tbodyRiwayat.appendChild(tr);

        if(!rekapKeaktifan[item.nama]) rekapKeaktifan[item.nama] = { nama: item.nama, pangkat: item.pangkat, hadir: 0, izin: 0 };
        if(item.status === "HADIR") rekapKeaktifan[item.nama].hadir++; else rekapKeaktifan[item.nama].izin++;

        if(!rekapJabatan[item.jabatan]) rekapJabatan[item.jabatan] = 0;
        rekapJabatan[item.jabatan]++;
    });

    const tbodyKeaktifan = document.getElementById('tbody-keaktifan');
    const tbodyPrestasi = document.getElementById('tbody-prestasi');
    if(tbodyKeaktifan) tbodyKeaktifan.innerHTML = ""; 
    if(tbodyPrestasi) tbodyPrestasi.innerHTML = "";

    const arrKeaktifan = Object.values(rekapKeaktifan);
    arrKeaktifan.forEach(user => {
        const total = user.hadir + user.izin;
        const persen = total > 0 ? Math.round((user.hadir / total) * 100) : 0;
        if(tbodyKeaktifan) tbodyKeaktifan.innerHTML += `<tr><td>${user.nama}</td><td>${user.pangkat}</td><td>${user.hadir} Hari</td><td>${user.izin} Kali</td><td><strong>${persen}% Keaktifan</strong></td></tr>`;
    });

    const arrPrestasi = [...arrKeaktifan].sort((a,b) => b.hadir - a.hadir);
    arrPrestasi.forEach((user, idx) => {
        const predikat = user.hadir > 10 ? "TELADAN UTAMA" : "DISIPLIN";
        if(tbodyPrestasi) tbodyPrestasi.innerHTML += `<tr><td>#${idx + 1}</td><td>${user.nama}</td><td>${user.pangkat}</td><td>${user.hadir * 10} Poin</td><td style="color:#10b981;font-weight:bold;">${predikat}</td></tr>`;
    });

    const tbodyJabatan = document.getElementById('tbody-jabatan');
    if(tbodyJabatan) {
        tbodyJabatan.innerHTML = "";
        Object.keys(rekapJabatan).forEach(jab => {
            tbodyJabatan.innerHTML += `<tr><td>${jab}</td><td>${rekapJabatan[jab]} Personel</td><td><span style="color:#38bdf8;">Siaga Operasional</span></td></tr>`;
        });
    }
}

function updateGateBtnUI() {
    const gateBtn = document.getElementById('btn-gate-toggle');
    if(!gateBtn) return;
    if(isGateOpen) {
        gateBtn.className = "btn-sidebar-action btn-blue-action";
        gateBtn.innerHTML = '<i class="fa-solid fa-toggle-on"></i> Gerbang: BUKA';
    } else {
        gateBtn.className = "btn-sidebar-action btn-danger-action";
        gateBtn.innerHTML = '<i class="fa-solid fa-toggle-off"></i> Gerbang: KUNCI';
    }
}

function resetFormInputs() {
    document.getElementById('discord-name').value = "";
    document.getElementById('police-position').value = "";
    document.getElementById('police-nrp').value = "";
    document.getElementById('permission-reason').value = "";
    document.getElementById('permission-file').value = "";
                                        }
