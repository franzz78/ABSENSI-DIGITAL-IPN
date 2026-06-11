// ==========================================================================
// CORE ENGINE V2.7 - JAVASCRIPT PROGRAM LOGIC WITH BUG FIX SUBMIT
// ==========================================================================

let db_absensi = JSON.parse(localStorage.getItem('db_absensi_v27')) || [];
let system_gate_open = localStorage.getItem('gate_status_v27') !== 'CLOSED';
let active_webhook = localStorage.getItem('webhook_url_v27') || "https://discord.com/api/webhooks/1500117207366238340/hMkE7VzL7OBCO9JnHFmCCusOFUjXjcP123j9emE4o79i26UJdZzsDTw2cyoYdGSKBw-4";
let uploaded_image_base64 = "";

// Fungsi Router Navigasi Dengan Animasi Transisi Halus (Smooth Fade-Slide)
function navigateTo(pageId) {
    const activePage = document.querySelector('.page.active');
    const targetPage = document.getElementById(pageId);
    
    if (activePage) {
        activePage.style.opacity = "0";
        activePage.style.transform = "translateY(-10px) scale(0.98)";
        
        setTimeout(() => {
            activePage.classList.remove('active');
            triggerTargetIn(targetPage);
        }, 200);
    } else {
        triggerTargetIn(targetPage);
    }
}

function triggerTargetIn(targetPage) {
    targetPage.classList.add('active');
    targetPage.offsetWidth; 
    targetPage.style.opacity = "1";
    targetPage.style.transform = "translateY(0) scale(1)";
}

// Banner Pop-up Notifikasi Melayang
function showToast(message) {
    const container = document.getElementById('notification-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { 
        toast.style.opacity = "0";
        toast.style.transform = "translateX(20px)";
        setTimeout(() => { toast.remove(); }, 300);
    }, 3200);
}

// Alur Pindah Halaman Menu Utama
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

// Otentikasi Password Masuk Admin (Password Default Sistem: 123)
document.getElementById('admin-auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const inputPass = document.getElementById('admin-secret-code').value;
    if(inputPass === "ABSENSIONADMIN2027##") {
        showToast("🟢 Akses Pengelola Terverifikasi!");
        document.getElementById('admin-secret-code').value = "";
        navigateTo('admin-page');
    } else {
        showToast("❌ Password Pengelola Salah!");
    }
});

// ==========================================================================
// OPERASIONAL FORMULIR ABSENSI V2.7 (BUG FIX SECTIONS)
// ==========================================================================

document.getElementById('btn-trigger-upload').addEventListener('click', () => {
    document.getElementById('member-photo-input').click();
});

document.getElementById('member-photo-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            uploaded_image_base64 = event.target.result;
            
            const imgEl = document.getElementById('uploaded-image-preview');
            imgEl.src = event.target.result;
            imgEl.style.display = "block";
            document.getElementById('preview-placeholder').style.display = "none";
            showToast("🟢 File bukti gambar terisi!");
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('btn-cancel-absensi').addEventListener('click', () => {
    resetFormAbsenV27();
    navigateTo('welcome-page');
});

function resetFormAbsenV27() {
    document.getElementById('login-form').reset();
    uploaded_image_base64 = "";
    document.getElementById('uploaded-image-preview').src = "";
    document.getElementById('uploaded-image-preview').style.display = "none";
    document.getElementById('preview-placeholder').style.display = "block";
}

// Pengiriman Data Akhir Absensi Kedinasan & Sinkronisasi Webhook Discord (FIXED)
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Validasi manual lewat engine JS (Mengamankan button submit yang macet)
    if (!uploaded_image_base64 || uploaded_image_base64 === "") {
        showToast("❌ Wajib melampirkan file gambar bukti hadir!");
        return; 
    }

    const payloadData = {
        waktu: new Date().toLocaleString('id-ID'),
        nama: document.getElementById('discord-name').value,
        divisi: document.getElementById('police-position').value,
        hari: document.getElementById('attendance-day').value,
        status: "HADIR",
        foto_lokal: uploaded_image_base64
    };

    db_absensi.push(payloadData);
    localStorage.setItem('db_absensi_v27', JSON.stringify(db_absensi));
    showToast(`🟢 Absensi tersimpan untuk: ${payloadData.nama}`);

    // Sinkronisasi otomatis ke Discord Webhook Pengguna
    if(active_webhook) {
        const discordFormat = {
            embeds: [{
                title: `🔔 NOTIFIKASI LOG ABSENSI MASUK - ${payloadData.hari}`,
                color: 3066993,
                fields: [
                    { name: "Nama Anggota", value: payloadData.nama, inline: true },
                    { name: "Divisi / Fungsi Kesatuan", value: payloadData.divisi, inline: true },
                    { name: "Hari Kehadiran", value: payloadData.hari, inline: true },
                    { name: "Waktu Pencatatan", value: payloadData.waktu, inline: false }
                ],
                footer: { text: "Sistem Otomatis V2.7 - POLRI COMMAND SYSTEM" }
            }]
        };
        fetch(active_webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(discordFormat)
        })
        .then(() => console.log("Payload sent to Discord successfully."))
        .catch((err) => console.log("Discord payload drop failed: ", err));
    }

    resetFormAbsenV27();
    navigateTo('welcome-page');
});

// ==========================================================================
// OPERASIONAL DASHBOARD PANEL KAPSUL KENDALI ADMIN
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
    tableBody.innerHTML = db_absensi.length === 0 ? `<tr><td colspan="5" style="text-align:center;">Belum ada record data masukan.</td></tr>` :
        db_absensi.map(d => `<tr><td>${d.waktu}</td><td>${d.nama}</td><td>${d.divisi}</td><td>${d.hari}</td><td><span class="badge">${d.status}</span></td></tr>`).join('');
    modal.classList.add('active');
});

// 2. Kelola Absensi
document.getElementById('btn-admin-kelola').addEventListener('click', () => {
    modalTitle.innerText = "Kelola Manajemen Data Absen";
    tableHead.innerHTML = `<tr><th>Nama</th><th>Divisi</th><th>Hari</th><th>Tindakan</th></tr>`;
    tableBody.innerHTML = db_absensi.length === 0 ? `<tr><td colspan="4" style="text-align:center;">Kosong.</td></tr>` :
        db_absensi.map((d, index) => `<tr><td>${d.nama}</td><td>${d.divisi}</td><td>${d.hari}</td><td><button onclick="removeLogIndex(${index})" style="background:#dc2626; color:#fff; border:none; padding:5px 12px; border-radius:30px; cursor:pointer; font-size:0.75rem; font-weight:bold;">Hapus</button></td></tr>`).join('');
    modal.classList.add('active');
});

window.removeLogIndex = function(idx) {
    if(confirm("Hapus baris absensi ini secara permanen?")) {
        db_absensi.splice(idx, 1);
        localStorage.setItem('db_absensi_v27', JSON.stringify(db_absensi));
        showToast("🗑️ Log terpilih berhasil dihapus.");
        document.getElementById('btn-admin-kelola').click();
    }
};

// 3. Peringkat Anggota
document.getElementById('btn-admin-peringkat').addEventListener('click', () => {
    modalTitle.innerText = "Urutan Peringkat Ketertiban";
    tableHead.innerHTML = `<tr><th>Peringkat</th><th>Nama Anggota</th><th>Divisi</th><th>Status Kedisiplinan</th></tr>`;
    let urut = [...db_absensi].sort((a,b) => a.nama.localeCompare(b.nama));
    tableBody.innerHTML = urut.length === 0 ? `<tr><td colspan="4" style="text-align:center;">Tidak ada data terdeteksi.</td></tr>` :
        urut.map((d, i) => `<tr><td>#${i+1}</td><td>${d.nama}</td><td>${d.divisi}</td><td>🟢 Sangat Baik</td></tr>`).join('');
    modal.classList.add('active');
});

// 4. Anggota Teraktif
document.getElementById('btn-admin-teraktif').addEventListener('click', () => {
    modalTitle.innerText = "Analisis Log Kehadiran Teraktif";
    tableHead.innerHTML = `<tr><th>Nama Anggota</th><th>Total Absen Valid</th><th>Predikat</th></tr>`;
    let hitung = {};
    db_absensi.forEach(d => { hitung[d.nama] = (hitung[d.nama] || 0) + 1; });
    let susun = Object.keys(hitung).map(n => ({ nama: n, total: hitung[n] })).sort((a,b) => b.total - a.total);
    
    tableBody.innerHTML = susun.length === 0 ? `<tr><td colspan="3" style="text-align:center;">Belum ada rekap keaktifan.</td></tr>` :
        susun.map(s => `<tr><td>${s.nama}</td><td><b>${s.total} Kali</b> Hadir</td><td>🎖️ Personel Teladan</td></tr>`).join('');
    modal.classList.add('active');
});

// 5. Buka/Tutup Pintu Absensi
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
    localStorage.setItem('gate_status_v27', system_gate_open ? 'OPEN' : 'CLOSED');
    checkGateUI();
    showToast(system_gate_open ? "🟢 Pintu pendaftaran absen dibuka kembali!" : "🔴 Pintu sistem absen ditutup.");
});

// 6. Unduh Dokumen Excel
document.getElementById('btn-export-excel-v2').addEventListener('click', () => {
    if(db_absensi.length === 0) {
        showToast("❌ Kosong! Tidak ada data ekspor.");
        return;
    }
    const cleanExportData = db_absensi.map(({waktu, nama, divisi, hari, status}) => ({waktu, nama, divisi, hari, status}));
    
    const ws = XLSX.utils.json_to_sheet(cleanExportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Log Presensi");
    XLSX.writeFile(wb, `REKAP_ABSENSI_POLRI_V27.xlsx`);
    showToast("🟢 File dokumen Excel berhasil diunduh!");
});

// 7. Reset Harian
document.getElementById('btn-delete-daily-v2').addEventListener('click', () => {
    if(confirm("Bersihkan log data harian?")) {
        db_absensi = [];
        localStorage.setItem('db_absensi_v27', JSON.stringify(db_absensi));
        showToast("🗑️ Log data harian dibersihkan.");
    }
});

// 8. Reset Bulanan & Pembaruan Webhook URL
document.getElementById('btn-delete-monthly-v2').addEventListener('click', () => {
    const inputPrompt = prompt("Ketik 'RESET' untuk membersihkan database permanen, atau tempelkan tautan URL Webhook Discord baru:", active_webhook);
    if(inputPrompt === "RESET") {
        db_absensi = [];
        localStorage.removeItem('db_absensi_v27');
        showToast("💥 Pusat database dibersihkan total!");
    } else if (inputPrompt !== null) {
        active_webhook = inputPrompt;
        localStorage.setItem('webhook_url_v27', active_webhook);
        showToast("🟢 Tautan integrasi Webhook Discord diperbarui!");
    }
});

// Keluar Sesi Admin
document.getElementById('btn-admin-logout-v2').addEventListener('click', () => {
    showToast("🔒 Sesi pengelola ditutup.");
    navigateTo('welcome-page');
});
