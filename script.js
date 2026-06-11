// ==========================================================================
// CORE ENGINE V2.9 - ABSENSI IPN ANTI-BUG & MULTI-BROWSER PROTECTION
// ==========================================================================

let db_absensi = JSON.parse(localStorage.getItem('db_absensi_v27')) || [];
let system_gate_open = localStorage.getItem('gate_status_v27') !== 'CLOSED';
let active_webhook = localStorage.getItem('webhook_url_v27') || "https://discord.com/api/webhooks/1500117207366238340/hMkE7VzL7OBCO9JnHFmCCusOFUjXjcP123j9emE4o79i26UJdZzsDTw2cyoYdGSKBw-4";
let uploaded_image_base64 = "";

// Fungsi Navigasi Hard Fix (Memaksa display block/none agar layer klik tidak bertumpuk)
function navigateTo(pageId) {
    const allPages = document.querySelectorAll('.page');
    const targetPage = document.getElementById(pageId);
    
    if (!targetPage) return;

    // Sembunyikan dan matikan interaksi halaman lama secara instan
    allPages.forEach(page => {
        page.style.opacity = "0";
        page.style.transform = "translateY(-10px) scale(0.98)";
        page.classList.remove('active');
        // Jeda waktu kecil lalu buat display: none agar area klik bersih
        setTimeout(() => {
            if(!page.classList.contains('active')) {
                page.style.display = "none";
            }
        }, 200);
    });

    // Munculkan halaman target
    targetPage.style.display = "block";
    setTimeout(() => {
        targetPage.classList.add('active');
        targetPage.style.opacity = "1";
        targetPage.style.transform = "translateY(0) scale(1)";
    }, 50);
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

// Inisialisasi Event Listener Setelah DOM Siap
document.addEventListener("DOMContentLoaded", () => {
    
    // Pastikan halaman awal default bersih di setup pertama
    const welcomePage = document.getElementById('welcome-page');
    if(welcomePage) {
        welcomePage.style.display = "block";
        welcomePage.style.opacity = "1";
    }

    // Alur Pindah Halaman Menu Utama
    const btnGoMember = document.getElementById('btn-go-to-member');
    if(btnGoMember) {
        btnGoMember.addEventListener('click', () => {
            if(!system_gate_open) {
                showToast("❌ PENDAFTARAN ABSENSI HARI INI SUDAH DITUTUP PENGELOLA!");
                return;
            }
            navigateTo('member-login-page');
        });
    }

    const btnGoAdmin = document.getElementById('btn-go-to-admin');
    if(btnGoAdmin) btnGoAdmin.addEventListener('click', () => { navigateTo('admin-login-page'); });
    
    const btnBackMember = document.getElementById('btn-back-from-member');
    if(btnBackMember) btnBackMember.addEventListener('click', () => { navigateTo('welcome-page'); });
    
    const btnBackAdmin = document.getElementById('btn-back-from-admin');
    if(btnBackAdmin) btnBackAdmin.addEventListener('click', () => { navigateTo('welcome-page'); });

    // Otentikasi Password Masuk Admin (Default: 123)
    const adminForm = document.getElementById('admin-auth-form');
    if(adminForm) {
        adminForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputPass = document.getElementById('admin-secret-code').value;
            if(inputPass === "123") {
                showToast("🟢 Akses Pengelola Terverifikasi!");
                document.getElementById('admin-secret-code').value = "";
                navigateTo('admin-page');
            } else {
                showToast("❌ Password Pengelola Salah!");
            }
        });
    }

    // Trigger Pemicu Ambil Gambar dari File Device
    const btnTriggerUpload = document.getElementById('btn-trigger-upload');
    if(btnTriggerUpload) {
        btnTriggerUpload.addEventListener('click', () => {
            document.getElementById('member-photo-input').click();
        });
    }

    const fileInput = document.getElementById('member-photo-input');
    if(fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    uploaded_image_base64 = event.target.result;
                    const imgEl = document.getElementById('uploaded-image-preview');
                    if(imgEl) {
                        imgEl.src = event.target.result;
                        imgEl.style.display = "block";
                    }
                    const placeholder = document.getElementById('preview-placeholder');
                    if(placeholder) placeholder.style.display = "none";
                    showToast("🟢 File bukti gambar terisi!");
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const btnCancelAbsen = document.getElementById('btn-cancel-absensi');
    if(btnCancelAbsen) {
        btnCancelAbsen.addEventListener('click', () => {
            resetFormAbsenV29();
            navigateTo('welcome-page');
        });
    }

    // ==========================================================================
    // SEKSI PENGEKSEKSIAN UTAMA ABSENSI (ANTI-LOCK FIX)
    // ==========================================================================
    const loginForm = document.getElementById('login-form');
    if(loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault(); 
            
            const btnSubmit = document.getElementById('btn-submit-absensi');

            // Proteksi 1: Validasi keberadaan file lokal base64 javascript
            if (!uploaded_image_base64 || uploaded_image_base64.trim() === "") {
                showToast("❌ Wajib melampirkan file gambar bukti hadir!");
                return;
            }

            // Proteksi 2: Matikan tombol agar menghindari pengiriman ganda (stuck loading)
            if(btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerText = "SEDANG MENGIRIM...";
                btnSubmit.style.opacity = "0.6";
            }

            const payloadData = {
                waktu: new Date().toLocaleString('id-ID'),
                nama: document.getElementById('discord-name').value,
                divisi: document.getElementById('police-position').value,
                hari: document.getElementById('attendance-day').value,
                status: "HADIR",
                foto_lokal: uploaded_image_base64
            };

            // Simpan ke database lokal localstorage browser
            db_absensi.push(payloadData);
            localStorage.setItem('db_absensi_v27', JSON.stringify(db_absensi));
            showToast(`🟢 Absensi tersimpan untuk: ${payloadData.nama}`);

            // Jalur Pengiriman Log Webhook Ke Server Discord
            if (active_webhook) {
                const discordFormat = {
                    embeds: [{
                        title: `NOTIFIKASI LOG ABSENSI MASUK',
                        color: 3066993,
                        fields: [
                            { name: "Nama Anggota", value: payloadData.nama, inline: true },
                            { name: "Divisi / Fungsi Kesatuan", value: payloadData.divisi, inline: true },
                            { name: "Hari Kehadiran", value: payloadData.hari, inline: true },
                            { name: "Waktu Pencatatan", value: payloadData.waktu, inline: false }
                        ],
                        footer: { text: "Sistem Otomatis V2.9 - POLRI COMMAND SYSTEM" }
                    }]
                };
                
                fetch(active_webhook, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(discordFormat)
                })
                .then(() => console.log("Success forward to Discord channel."))
                .catch((err) => console.log("Discord error ignored."));
            }

            // Beri jeda 200 milidetik agar penyimpanan selesai, lalu bersihkan form dan pulang ke menu utama
            setTimeout(() => {
                resetFormAbsenV29();
                navigateTo('welcome-page');

                // Normalkan kembali status tombol untuk pengisi berikutnya
                if(btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerText = "KIRIM ABSENSI";
                    btnSubmit.style.opacity = "1";
                }
            }, 200);
        });
    }

    // ==========================================================================
    // MANAGEMENT CONSOLE ADMIN ACTIONS
    // ==========================================================================
    const modal = document.getElementById('admin-data-modal');
    const modalTitle = document.getElementById('modal-data-title');
    const tableHead = document.getElementById('modal-table-head');
    const tableBody = document.getElementById('modal-table-body');

    const btnCloseModal = document.getElementById('btn-close-modal');
    if(btnCloseModal) btnCloseModal.addEventListener('click', () => { modal.classList.remove('active'); });

    // 1. Rekap Data Kehadiran
    const btnRekap = document.getElementById('btn-admin-rekap');
    if(btnRekap) {
        btnRekap.addEventListener('click', () => {
            modalTitle.innerText = "Rekapitulasi Kehadiran Sistem";
            tableHead.innerHTML = `<tr><th>Waktu</th><th>Nama</th><th>Divisi</th><th>Hari</th><th>Status</th></tr>`;
            tableBody.innerHTML = db_absensi.length === 0 ? `<tr><td colspan="5" style="text-align:center;">Belum ada record data masukan.</td></tr>` :
                db_absensi.map(d => `<tr><td>${d.waktu}</td><td>${d.nama}</td><td>${d.divisi}</td><td>${d.hari}</td><td><span class="badge">${d.status}</span></td></tr>`).join('');
            modal.classList.add('active');
        });
    }

    // 2. Kelola/Hapus Log
    const btnKelola = document.getElementById('btn-admin-kelola');
    if(btnKelola) {
        btnKelola.addEventListener('click', () => {
            modalTitle.innerText = "Kelola Manajemen Data Absen";
            tableHead.innerHTML = `<tr><th>Nama</th><th>Divisi</th><th>Hari</th><th>Tindakan</th></tr>`;
            tableBody.innerHTML = db_absensi.length === 0 ? `<tr><td colspan="4" style="text-align:center;">Kosong.</td></tr>` :
                db_absensi.map((d, index) => `<tr><td>${d.nama}</td><td>${d.divisi}</td><td>${d.hari}</td><td><button type="button" onclick="window.removeLogIndex(${index})" style="background:#dc2626; color:#fff; border:none; padding:5px 12px; border-radius:30px; cursor:pointer; font-size:0.75rem; font-weight:bold;">Hapus</button></td></tr>`).join('');
            modal.classList.add('active');
        });
    }

    // 3. Urutan Peringkat
    const btnPeringkat = document.getElementById('btn-admin-peringkat');
    if(btnPeringkat) {
        btnPeringkat.addEventListener('click', () => {
            modalTitle.innerText = "Urutan Peringkat Ketertiban";
            tableHead.innerHTML = `<tr><th>Peringkat</th><th>Nama Anggota</th><th>Divisi</th><th>Status Kedisiplinan</th></tr>`;
            let urut = [...db_absensi].sort((a,b) => a.nama.localeCompare(b.nama));
            tableBody.innerHTML = urut.length === 0 ? `<tr><td colspan="4" style="text-align:center;">Tidak ada data terdeteksi.</td></tr>` :
                urut.map((d, i) => `<tr><td>#${i+1}</td><td>${d.nama}</td><td>${d.divisi}</td><td>🟢 Sangat Baik</td></tr>`).join('');
            modal.classList.add('active');
        });
    }

    // 4. Analisis Teraktif
    const btnTeraktif = document.getElementById('btn-admin-teraktif');
    if(btnTeraktif) {
        btnTeraktif.addEventListener('click', () => {
            modalTitle.innerText = "Analisis Log Kehadiran Teraktif";
            tableHead.innerHTML = `<tr><th>Nama Anggota</th><th>Total Absen Valid</th><th>Predikat</th></tr>`;
            let hitung = {};
            db_absensi.forEach(d => { hitung[d.nama] = (hitung[d.nama] || 0) + 1; });
            let susun = Object.keys(hitung).map(n => ({ nama: n, total: hitung[n] })).sort((a,b) => b.total - a.total);
            
            tableBody.innerHTML = susun.length === 0 ? `<tr><td colspan="3" style="text-align:center;">Belum ada rekap keaktifan.</td></tr>` :
                susun.map(s => `<tr><td>${s.nama}</td><td><b>${s.total} Kali</b> Hadir</td><td>🎖️ Personel Teladan</td></tr>`).join('');
            modal.classList.add('active');
        });
    }

    // 5. Sistem Buka/Tutup Pintu Absensi
    const gateBtn = document.getElementById('btn-gate-toggle-v2');
    if(gateBtn) {
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
    }

    // 6. Ekspor Data Excel (.XLSX)
    const btnExport = document.getElementById('btn-export-excel-v2');
    if(btnExport) {
        btnExport.addEventListener('click', () => {
            if(db_absensi.length === 0) {
                showToast("❌ Kosong! Tidak ada data ekspor.");
                return;
            }
            const cleanExportData = db_absensi.map(({waktu, nama, divisi, hari, status}) => ({waktu, nama, divisi, hari, status}));
            const ws = XLSX.utils.json_to_sheet(cleanExportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Log Presensi");
            XLSX.writeFile(wb, `REKAP_ABSENSI_POLRI_V29.xlsx`);
            showToast("🟢 File dokumen Excel berhasil diunduh!");
        });
    }

    // 7. Reset Log Harian
    const btnDelDaily = document.getElementById('btn-delete-daily-v2');
    if(btnDelDaily) {
        btnDelDaily.addEventListener('click', () => {
            if(confirm("Bersihkan log data harian?")) {
                db_absensi = [];
                localStorage.setItem('db_absensi_v27', JSON.stringify(db_absensi));
                showToast("🗑️ Log data harian dibersihkan.");
            }
        });
    }

    // 8. Hubungkan Tautan Webhook / Reset Total Database
    const btnDelMonthly = document.getElementById('btn-delete-monthly-v2');
    if(btnDelMonthly) {
        btnDelMonthly.addEventListener('click', () => {
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
    }

    // Keluar Sesi Admin
    const btnLogoutAdmin = document.getElementById('btn-admin-logout-v2');
    if(btnLogoutAdmin) {
        btnLogoutAdmin.addEventListener('click', () => {
            showToast("🔒 Sesi pengelola ditutup.");
            navigateTo('welcome-page');
        });
    }
});

// Pembersihan Form Input Formulir
function resetFormAbsenV29() {
    const form = document.getElementById('login-form');
    if(form) form.reset();
    uploaded_image_base64 = "";
    
    const previewImg = document.getElementById('uploaded-image-preview');
    if(previewImg) {
        previewImg.src = "";
        previewImg.style.display = "none";
    }
    const placeholder = document.getElementById('preview-placeholder');
    if(placeholder) placeholder.style.display = "block";
}

// Global window registration untuk tombol dinamis modal admin
window.removeLogIndex = function(idx) {
    if(confirm("Hapus baris absensi ini secara permanen?")) {
        db_absensi.splice(idx, 1);
        localStorage.setItem('db_absensi_v27', JSON.stringify(db_absensi));
        showToast("🗑️ Log terpilih berhasil dihapus.");
        
        const btnKelola = document.getElementById('btn-admin-kelola');
        if(btnKelola) btnKelola.click();
    }
};
