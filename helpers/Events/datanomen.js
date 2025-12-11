/**
 * =========================================================
 * [ EXPERIMENTAL-BELL ]
 * FILE: datanomen.js
 * * FUNGSI UTAMA: 
 * 1. Manajemen data dinamis: Upload, Hapus, dan Daftar file Excel/CSV.
 * 2. Pencarian data nomen umum (Dinamis).
 * 3. Pencarian data 'Belum Bayar' (Spesifik).
 * =========================================================
 */

// --- 1. IMPORT MODUL ---
const fs = 'fs'.import();
const path = 'path'.import();
const xlsx = await 'xlsx'.import(); 

// --- 2. KONFIGURASI PATH & BATASAN ---
const DATA_FOLDER = './data/';
const MAX_ROWS = 5; // Batasan baris yang ditampilkan dalam chat
// Nama file spesifik untuk perintah .belumbayar
const BELUM_BAYAR_FILENAME = 'belumbayar.xlsx - Sheet1.csv';
const BELUM_BAYAR_PATH = path.join(DATA_FOLDER, BELUM_BAYAR_FILENAME);

// Pastikan folder data ada
if (!fs.existsSync(DATA_FOLDER)) {
    fs.mkdirSync(DATA_FOLDER);
}

// --- 3. FUNGSI UTILITY ---

/**
 * Mendapatkan daftar file data yang valid (.xlsx atau .csv) di folder data.
 */
const getAvailableFiles = () => {
    try {
        const files = fs.readdirSync(DATA_FOLDER);
        return files.filter(file => file.endsWith('.xlsx') || file.endsWith('.csv'));
    } catch (e) {
        return [];
    }
};

// =========================================================
// --- 4. COMMAND: UPLOAD/SAVE FILE (.uploadnomen)
// =========================================================
ev.on(
  {
    cmd: ['uploadnomen', 'savenomen'],
    listmenu: ['Upload Data Nomen (XLSX/CSV)'],
    tag: 'owner', 
    energy: 10,
    media: {
      type: ['document'],
      msg: 'Kirim/reply dokumen Excel (.xlsx) atau CSV (.csv) dengan caption *.uploadnomen*',
      etc: {
          name: /(.xlsx|.csv)$/, 
          msg: 'File harus berformat Excel (.xlsx) atau CSV (.csv)!'
      }
    },
  },
  async ({ cht, media }) => {
    try {
        if (!media) return cht.reply('❌ Tidak ada dokumen yang ditemukan.');

        const uploadedFilename = cht.message.documentMessage?.fileName || `data_tanpa_nama${Date.now()}${path.extname(cht.message.documentMessage.mimetype)}`;
        const ext = path.extname(uploadedFilename).toLowerCase();
        const targetPath = path.join(DATA_FOLDER, uploadedFilename);
        let fileToSave = media;
        
        // Logika Konversi: Jika file adalah CSV, konversi ke buffer XLSX
        if (ext === '.csv') {
            await cht.reply('⏳ Terdeteksi file CSV. Sedang mengkonversi data ke format XLSX...');
            const workbook = xlsx.read(media, { type: 'buffer', raw: true });
            fileToSave = xlsx.write(workbook, {
                type: 'buffer',
                bookType: 'xlsx'
            });
            await cht.reply('✅ Konversi CSV ke XLSX berhasil.');
        }

        // Simpan file baru
        fs.writeFileSync(targetPath, fileToSave); 
        
        return cht.reply(`✅ File data nomen *${uploadedFilename}* telah berhasil diunggah dan disimpan!\n\nAnda dapat mencari file ini dengan:\n*.nomen ${uploadedFilename} [kata kunci]*`);

    } catch (e) {
      console.log('Error saat menyimpan file:', e);
      await cht.reply(`❌ Terjadi kesalahan saat mengunggah atau mengkonversi file: ${e.message}`);
    }
  }
);


// =========================================================
// --- 5. COMMAND: DELETE FILE (.delnomen)
// =========================================================
ev.on(
  {
    cmd: ['delnomen', 'hapusnomen'],
    listmenu: ['Hapus Data Nomen'],
    tag: 'owner', 
    energy: 5,
    args: 'Masukkan nama file lengkap yang ingin dihapus, contoh: delnomen data_baru.xlsx\n\nLihat daftar file dengan *.listnomen*',
  },
  async ({ cht, args }) => {
    const filename = args?.trim();
    if (!filename) return cht.reply(ev.data.args);

    const targetPath = path.join(DATA_FOLDER, filename);
    
    try {
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
        await cht.reply(`🗑️ File data nomen *${filename}* telah berhasil dihapus.`);
      } else {
        await cht.reply(`⚠️ File data nomen *${filename}* tidak ditemukan di server.`);
      }
    } catch (e) {
      console.log('Error saat menghapus file:', e);
      await cht.reply(`❌ Gagal menghapus file: ${e.message}`);
    }
  }
);


// =========================================================
// --- 6. COMMAND: LIST FILE (.listnomen)
// =========================================================
ev.on({
    cmd: ['listnomen', 'ceknomen'],
    listmenu: ['Lihat Daftar File Nomen'],
    tag: 'tools',
    energy: 1,
}, async ({ cht }) => {
    const files = getAvailableFiles();
    
    if (files.length === 0) {
        return cht.reply('⚠️ Tidak ada file data nomen (.xlsx/.csv) yang tersimpan di server.\nSilakan unggah dengan *.uploadnomen*');
    }

    let response = '*Daftar File Data Nomen Tersedia:*\n\n';
    files.forEach((file, index) => {
        response += `*${index + 1}.* ${file}\n`;
    });
    
    response += `\nUntuk mencari data, gunakan:\n*.nomen [nama file] [kata kunci pencarian]*`;
    
    await cht.reply(response);
});


// =========================================================
// --- 7. COMMAND: PENCARIAN SPESIFIK (.belumbayar)
// --- Mencari file: belumbayar.xlsx - Sheet1.csv
// --- OUTPUT: Menampilkan SEMUA KOLOM (FIELD)
// =========================================================
ev.on(
  {
    cmd: ['belumbayar'],           
    listmenu: ['Cari Data Belum Bayar'], 
    tag: 'tools',             
    energy: 5,                
    args: 'Masukkan kata kunci (Nomen, Nama, Petugas) atau biarkan kosong untuk melihat data yang belum lunas. Contoh: belumbayar 60139500', 
  },
  async ({ cht, args }) => {
    
    // Pastikan file spesifik ada
    if (!fs.existsSync(BELUM_BAYAR_PATH)) {
      return cht.reply(`❌ File data Belum Bayar (*${BELUM_BAYAR_FILENAME}*) tidak ditemukan.\nSilakan unggah file ini menggunakan *.uploadnomen* terlebih dahulu.`);
    }

    try {
      const workbook = xlsx.readFile(BELUM_BAYAR_PATH);
      const sheetName = workbook.SheetNames[0]; 
      const worksheet = workbook.Sheets[sheetName];

      const data = xlsx.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
          return cht.reply(`File *${BELUM_BAYAR_FILENAME}* kosong.`);
      }

      let responseText;
      let foundData = data;
      const query = args?.trim() || '';

      if (query) {
        // Mode 1: Pencarian spesifik di semua kolom
        foundData = data.filter(item => 
            Object.values(item).some(val => 
                String(val).toLowerCase().includes(query.toLowerCase())
            )
        );
        responseText = `*Hasil Pencarian di ${BELUM_BAYAR_FILENAME} untuk: ${query}*\n\n`;
      } else {
         // Mode 2: Filter 'Belum Bayar'
         foundData = data.filter(item => {
             // Asumsi kolom KET ada dan nilainya tidak mengandung "sudah di bayar"
             return item.KET && !String(item.KET).toLowerCase().includes('sudah di bayar');
         });
         responseText = `*Data Pelanggan Belum Bayar (KET ≠ "sudah di bayar")*\n\n`;
      }


      if (foundData.length === 0) {
          const notFoundMsg = query 
            ? `Tidak ditemukan data yang cocok dengan pencarian: *${query}* di file *${BELUM_BAYAR_FILENAME}*`
            : `Semua data memiliki KET "sudah di bayar" atau file kosong.`;
          return cht.reply(notFoundMsg);
      }

      // Format Data untuk Balasan (Semua Kolom Ditampilkan)
      const dataToSend = foundData.slice(0, MAX_ROWS);

      dataToSend.forEach((row, index) => {
          responseText += `*--- Data #${index + 1} ---\n`;
          // LOOPING UNTUK MENAMPILKAN SEMUA FIELD
          for (const key in row) {
              if (key && row[key] !== undefined && row[key] !== null) {
                  responseText += `*${key}:* ${row[key]}\n`;
              }
          }
          responseText += '\n';
      });
      
      if (foundData.length > MAX_ROWS) {
          responseText += `*Dan ${foundData.length - MAX_ROWS} data lainnya...*`;
      }

      await cht.reply(responseText);
      
    } catch (e) {
      console.error(e);
      await cht.reply(`❌ Terjadi kesalahan saat membaca file *${BELUM_BAYAR_FILENAME}*: ${e.message}.`);
    }
  }
);


// =========================================================
// --- 8. COMMAND: PENCARIAN DINAMIS (.nomen)
// =========================================================
ev.on(
  {
    cmd: ['nomen'],           
    listmenu: ['Cari Data Nomen Dinamis'], 
    tag: 'tools',             
    energy: 5,                
    args: 'Format: *.nomen [nama file] [kata kunci pencarian]*\n\nContoh: *.nomen data_baru.xlsx ID001*\n\nLihat daftar file dengan *.listnomen*', 
  },
  async ({ cht, args }) => {
    const parts = args?.split(/\s+/);
    if (parts?.length < 2) return cht.reply(ev.data.args);
    
    const filename = parts[0].trim();
    const query = parts.slice(1).join(' ').trim();
    const targetPath = path.join(DATA_FOLDER, filename);

    if (!filename.match(/\.(xlsx|csv)$/i)) {
         return cht.reply('⚠️ Format file harus .xlsx atau .csv. Cek daftar file dengan *.listnomen*');
    }

    if (!fs.existsSync(targetPath)) {
      return cht.reply(`❌ File data *${filename}* tidak ditemukan. Cek daftar file dengan *.listnomen*`);
    }

    try {
      const workbook = xlsx.readFile(targetPath);
      const sheetName = workbook.SheetNames[0]; 
      const worksheet = workbook.Sheets[sheetName];

      const data = xlsx.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
          return cht.reply(`File *${filename}* kosong.`);
      }

      let responseText = `*Hasil Pencarian di ${filename} untuk: ${query}*\n\n`;

      const foundData = data.filter(item => 
          Object.values(item).some(val => 
              String(val).toLowerCase().includes(query.toLowerCase())
          )
      );

      if (foundData.length === 0) {
          return cht.reply(`Tidak ditemukan data nomen yang cocok dengan pencarian: *${query}* di file *${filename}*`);
      }

      // Format Data untuk Balasan (semua kolom)
      const dataToSend = foundData.slice(0, MAX_ROWS);

      dataToSend.forEach((row, index) => {
          responseText += `*--- Data #${index + 1} ---\n`;
          for (const key in row) {
              if (key && row[key] !== undefined && row[key] !== null) {
                  responseText += `*${key}:* ${row[key]}\n`;
              }
          }
          responseText += '\n';
      });
      
      if (foundData.length > MAX_ROWS) {
          responseText += `*Dan ${foundData.length - MAX_ROWS} data lainnya...*`;
      }

      await cht.reply(responseText);
      
    } catch (e) {
      console.error(e);
      await cht.reply(`❌ Terjadi kesalahan saat membaca file *${filename}*: ${e.message}.`);
    }
  }
);
