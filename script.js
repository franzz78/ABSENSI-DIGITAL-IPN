// ==========================================================================
// CORE ENGINE V2.7 - INSTANT FIREBASE OFFICIAL SINKRONISASI (ANTI BUG)
// ==========================================================================

// Masukan Config Firebase Asli Sesuai Data Milikmu
const firebaseConfig = {
    apiKey: "AIzaSyD9BmV4XKXuMWa4PZHpb7Bbt-rHs61m3lE",
    authDomain: "absensi-polri.firebaseapp.com",
    databaseURL: "https://absensi-polri-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "absensi-polri",
    storageBucket: "absensi-polri.firebasestorage.app",
    messagingSenderId: "19006760644",
    appId: "1:19006760644:web:b980f54aea123e92ed4b91",
    measurementId: "G-LYZDWFMMV5"
};

// Inisialisasi Firebase Resmi (Amankan dari crash tombol)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// Variabel Kontrol Utama Aplikasi
let db_absensi = []; 
let system_gate_open = true;
let default_webhook = "https://discord.com/api/webhooks/1500117207366238340/hMkE7VzL7OBCO9JnHFmCCusOFUjXjcP123j9emE4o79i26UJdZzsDTw2cyoYdGSKBw-4";
let active_webhook = localStorage.getItem('webhook_url_v27') || default_webhook;
let uploaded_image_base64 = "";

// ==========================================================================
// PENGAMBILAN DATA REAL-TIME DARI CLOUD CORE
// ==========================================================================
database.ref('gate_status').on('value', (snapshot) => {
    const val = snapshot.val();
    if(val) {
        system_gate_open = (val === 'OPEN');
        checkGateUI();
    }
});

database.ref('absensi_records').on('value', (snapshot) => {
    db_absensi = [];
    const data = snapshot.val();
    if (data) {
        Object.keys(data).forEach(key => {
            db_absensi.push({
                firebaseKey: key, 
                waktu: data[key].waktu,
                nama: data[key].nama,
                divisi: data[key].divisi,
                hari: data[key].hari,
                status: data[key].status,
                foto_lokal: data[key].foto_lokal
            });
        });
    }
    console.log("Firebase Terhubung. Jumlah data di database: " + db_absensi.length);
});

// Fungsi Tukar Halaman Asli (Bebas Macet)
function navigateTo(pageId) {
    const activePage = document.querySelector('.page.active');
    const targetPage = document.getElementById(pageId);
    if (activePage) activePage.classList.remove('active');
    if (targetPage) targetPage.classList.add('active');
}

// Banner Pop-up Notifikasi Melayang
function showToast(message) {
    const container = document.getElementById('notification-container');
    if (!container) return;
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

// ==========================================================================
// OPERASIONAL SAKLAR TOMBOL UTAMA (FIXED & TESTED!)
// ==========================================================================
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

// Validasi Admin Pass (123)
document.getElementById('admin-auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const inputPass = document.getElementById('admin-secret-code').value;
    if(inputPass === "ADMINISTRATOR234#") {
        showToast("🟢 Akses Pengelola Terverifikasi!");
        document.getElementById('admin-secret-code').value = "";
        navigateTo('admin-page');
    } else {
        showToast("❌ Password Pengelola Salah!");
    }
});

// ==========================================================================
// ENGINE IMAGE PREVIEW UPLOAD
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

// ==========================================================================
// PROSES PENGIRIMAN DATA KE CLOUD DAN WEBHOOK DISCORD
// ==========================================================================
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault(); 
    
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

    // Push data resmi ke Firebase Realtime Database Cloud
    database.ref('absensi_records').push(payloadData)
    .then(() => {
        showToast(`🟢 Absensi online berhasil disimpan: ${payloadData.nama}`);
    })
    .catch((err) => {
        showToast("❌ Gagal mengirim ke server cloud!");
        console.error(err);
    });

    // Teleportasi Data Log ke Discord Webhook Kesatuan
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
        }).catch((err) => console.log("Webhook delayed."));
    }

    resetFormAbsenV27();
    navigateTo('welcome-page');
});

// ==========================================================================
// CONTROL INTERFACE PANEL MODAL ADMIN
// ==========================================================================
const modal = document.getElementById('admin-data-modal');
const modalTitle = document.getElementById('modal-data-title');
const tableHead = document.getElementById('modal-table-head');
const tableBody = document.getElementById('modal-table-body');

document.getElementById('btn-close-modal').addEventListener('click', () => { modal.classList.remove('active'); });

document.getElementById('btn-admin-rekap').addEventListener('click', () => {
    modalTitle.innerText = "Rekapitulasi Kehadiran Sistem";
    tableHead.innerHTML = `<tr><th>Waktu</th><th>Nama</th><th>Divisi</th><th>Hari</th><th>Status</th></tr>`;
    tableBody.innerHTML = db_absensi.length === 0 ? `<tr><td colspan="5" style="text-align:center;">Belum ada record data masukan online.</td></tr>` :
        db_absensi.map(d => `<tr><td>${d.waktu}</td><td>${d.nama}</td><td>${d.divisi}</td><td>${d.hari}</td><td><span class="badge">${d.status}</span></td></tr>`).join('');
    modal.classList.add('active');
});

document.getElementById('btn-admin-kelola').addEventListener('click', () => {
    modalTitle.innerText = "Kelola Manajemen Data Absen";
    tableHead.innerHTML = `<tr><th>Nama</th><th>Divisi</th><th>Hari</th><th>Tindakan</th></tr>`;
    tableBody.innerHTML = db_absensi.length === 0 ? `<tr><td colspan="4" style="text-align:center;">Kosong.</td></tr>` :
        db_absensi.map((d) => `<tr><td>${d.nama}</td><td>${d.divisi}</td><td>${d.hari}</td><td><button onclick="removeOnlineLog('${d.firebaseKey}')" style="background:#dc2626; color:#fff; border:none; padding:5px 12px; border-radius:30px; cursor:pointer; font-size:0.75rem; font-weight:bold;">Hapus</button></td></tr>`).join('');
    modal.classList.add('active');
});

window.removeOnlineLog = function(firebaseKey) {
    if(confirm("Hapus baris absensi online ini secara permanen?")) {
        database.ref('absensi_records/' + firebaseKey).remove()
        .then(() => {
            showToast("🗑️ Log online berhasil dihapus.");
            setTimeout(() => { document.getElementById('btn-admin-kelola').click(); }, 300);
        });
    }
};

document.getElementById('btn-admin-peringkat').addEventListener('click', () => {
    modalTitle.innerText = "Urutan Peringkat Ketertiban";
    tableHead.innerHTML = `<tr><th>Peringkat</th><th>Nama Anggota</th><th>Divisi</th><th>Status Kedisiplinan</th></tr>`;
    let urut = [...db_absensi].sort((a,b) => a.nama.localeCompare(b.nama));
    tableBody.innerHTML = urut.length === 0 ? `<tr><td colspan="4" style="text-align:center;">Tidak ada data terdeteksi.</td></tr>` :
        urut.map((d, i) => `<tr><td>#${i+1}</td><td>${d.nama}</td><td>${d.divisi}</td><td>🟢 Sangat Baik</td></tr>`).join('');
    modal.classList.add('active');
});

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

// Operasi Buka Tutup Gerbang Absensi Online
const gateBtn = document.getElementById('btn-gate-toggle-v2');
function checkGateUI() {
    if(system_gate_open) {
        gateBtn.innerText = "Tutup Absensi";
    } else {
        gateBtn.innerText = "Buka Absensi (TUTUP)";
    }
}

gateBtn.addEventListener('click', () => {
    const nextStatus = system_gate_open ? 'CLOSED' : 'OPEN';
    database.ref('gate_status').set(nextStatus).then(() => {
        showToast(nextStatus === 'OPEN' ? "🟢 Pintu pendaftaran absen dibuka kembali!" : "🔴 Pintu sistem absen ditutup.");
    });
});

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

document.getElementById('btn-delete-daily-v2').addEventListener('click', () => {
    if(confirm("Bersihkan seluruh log data harian di Cloud Database?")) {
        database.ref('absensi_records').remove()
        .then(() => { showToast("🗑️ Log data Cloud dibersihkan total."); });
    }
});

document.getElementById('btn-delete-monthly-v2').addEventListener('click', () => {
    const inputPrompt = prompt("Ketik 'RESET' untuk membersihkan database cloud permanen, atau tempelkan URL Webhook Discord baru:", active_webhook);
    if(inputPrompt === "RESET") {
        database.ref('absensi_records').remove().then(() => {
            showToast("💥 Pusat database cloud dibersihkan total!");
        });
    } else if (inputPrompt !== null) {
        active_webhook = inputPrompt;
        localStorage.setItem('webhook_url_v27', active_webhook);
        showToast("🟢 Tautan integrasi Webhook Discord diperbarui!");
    }
});

document.getElementById('btn-admin-logout-v2').addEventListener('click', () => {
    showToast("🔒 Sesi pengelola ditutup.");
    navigateTo('welcome-page');
});
                             
