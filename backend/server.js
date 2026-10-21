
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 1910;

app.use(cors());
app.use(express.json());

// FOLDER PENYIMPANAN FOTO
const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/uploads', express.static(uploadDir));

// PENGATURAN UPLOAD
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const namaFile = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, namaFile);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const jenis = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

        if (jenis.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('File harus berupa gambar JPG, PNG, WEBP, atau GIF.'));
        }
    }
});

// HAPUS FILE FOTO DENGAN AMAN
function hapusFileFoto(lokasi) {
    if (!lokasi) return;

    const namaFile = path.basename(lokasi);
    const lokasiFile = path.join(uploadDir, namaFile);

    if (path.dirname(lokasiFile) !== uploadDir) return;

    fs.unlink(lokasiFile, err => {
        if (err && err.code !== 'ENOENT') {
            console.error('Gagal menghapus file:', err.message);
        }
    });
}

// KONEKSI DATABASE
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_galeri_winky_git'
});

db.connect(err => {
    if (err) {
        console.error('Gagal konek database:', err.message);
        return;
    }
    console.log('Database berhasil terhubung');
});

// ENDPOINT UTAMA
app.get('/', (req, res) => {
    res.send('Server Galeri Winky berjalan');
});

// ==================== GET ====================

app.get('/kategori', (req, res) => {
    db.query('SELECT * FROM kategori', (err, hasil) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(hasil);
    });
});

app.get('/pengguna', (req, res) => {
    db.query('SELECT * FROM pengguna', (err, hasil) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(hasil);
    });
});

app.get('/foto', (req, res) => {
    const sql = `
        SELECT foto.*, kategori.nama_kategori,
               pengguna.nama_pengguna
        FROM foto
        LEFT JOIN kategori
            ON foto.id_kategori = kategori.id_kategori
        LEFT JOIN pengguna
            ON foto.id_pengguna = pengguna.id_pengguna
    `;

    db.query(sql, (err, hasil) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(hasil);
    });
});

// ==================== POST ====================

// POST KATEGORI
app.post('/kategori', (req, res) => {
    const nama = req.body.nama_kategori;

    if (typeof nama !== 'string' || !nama.trim()) {
        return res.status(400).json({
            message: 'Nama kategori wajib diisi'
        });
    }

    db.query(
        'SELECT id_kategori FROM kategori ORDER BY id_kategori ASC',
        (err, hasil) => {
            if (err) return res.status(500).json({ error: err.message });

            let id = 1;
            for (const data of hasil) {
                if (Number(data.id_kategori) !== id) break;
                id++;
            }

            db.query(
                'INSERT INTO kategori (id_kategori, nama_kategori) VALUES (?, ?)',
                [id, nama.trim()],
                err => {
                    if (err) return res.status(500).json({ error: err.message });

                    res.status(201).json({
                        message: 'Kategori berhasil ditambahkan',
                        id_kategori: id
                    });
                }
            );
        }
    );
});

// POST PENGGUNA
app.post('/pengguna', async (req, res) => {
    const {
        nama_pengguna,
        email_pengguna,
        password_email,
        no_hp_pengguna
    } = req.body;

    if (
        typeof nama_pengguna !== 'string' || !nama_pengguna.trim() ||
        typeof email_pengguna !== 'string' || !email_pengguna.trim() ||
        typeof password_email !== 'string' || !password_email ||
        typeof no_hp_pengguna !== 'string' || !no_hp_pengguna.trim()
    ) {
        return res.status(400).json({
            message: 'Semua data pengguna wajib diisi'
        });
    }

    try {
        const hashPassword = await bcrypt.hash(password_email, 10);

        db.query(
            'SELECT id_pengguna FROM pengguna ORDER BY id_pengguna ASC',
            (err, hasil) => {
                if (err) return res.status(500).json({ error: err.message });

                let id = 1;
                for (const data of hasil) {
                    if (Number(data.id_pengguna) !== id) break;
                    id++;
                }

                db.query(
                    `INSERT INTO pengguna
                    (id_pengguna, nama_pengguna, email_pengguna,
                     password_email, no_hp_pengguna)
                    VALUES (?, ?, ?, ?, ?)`,
                    [
                        id,
                        nama_pengguna.trim(),
                        email_pengguna.trim(),
                        hashPassword,
                        no_hp_pengguna.trim()
                    ],
                    err => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }

                        res.status(201).json({
                            message: 'Pengguna berhasil ditambahkan',
                            id_pengguna: id
                        });
                    }
                );
            }
        );
    } catch (err) {
        res.status(500).json({ message: 'Gagal memproses password' });
    }
});

// POST FOTO ASLI
app.post('/foto', upload.single('file_foto'), (req, res) => {
    const {
        judul_foto,
        deskripsi_foto,
        id_kategori,
        id_pengguna
    } = req.body;

    if (
        typeof judul_foto !== 'string' || !judul_foto.trim() ||
        !id_kategori || !id_pengguna || !req.file
    ) {
        if (req.file) hapusFileFoto(req.file.filename);

        return res.status(400).json({
            message: 'Judul, foto, kategori, dan pengguna wajib diisi'
        });
    }

    const fileFoto = `uploads/${req.file.filename}`;

    const sql = `
        INSERT INTO foto
        (judul_foto, deskripsi_foto, id_kategori, id_pengguna, file_foto)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            judul_foto.trim(),
            deskripsi_foto || null,
            id_kategori,
            id_pengguna,
            fileFoto
        ],
        (err, hasil) => {
            if (err) {
                hapusFileFoto(req.file.filename);
                return res.status(500).json({ error: err.message });
            }

            res.status(201).json({
                message: 'Foto berhasil diunggah',
                id_foto: hasil.insertId,
                file_foto: fileFoto
            });
        }
    );
});

// ==================== PUT ====================

// PUT KATEGORI
app.put('/kategori/:id_kategori', (req, res) => {
    const id = req.params.id_kategori;
    const nama = req.body.nama_kategori;

    if (typeof nama !== 'string' || !nama.trim()) {
        return res.status(400).json({
            message: 'Nama kategori wajib diisi'
        });
    }

    db.query(
        'UPDATE kategori SET nama_kategori = ? WHERE id_kategori = ?',
        [nama.trim(), id],
        (err, hasil) => {
            if (err) return res.status(500).json({ error: err.message });

            if (hasil.affectedRows === 0) {
                return db.query(
                    'SELECT id_kategori FROM kategori WHERE id_kategori = ?',
                    [id],
                    (err, data) => {
                        if (err) return res.status(500).json({ error: err.message });
                        if (data.length === 0) {
                            return res.status(404).json({
                                message: 'Kategori tidak ditemukan'
                            });
                        }
                        res.json({ message: 'Data kategori tidak berubah' });
                    }
                );
            }

            res.json({
                message: 'Kategori berhasil diperbarui',
                id_kategori: id,
                nama_kategori: nama.trim()
            });
        }
    );
});

// PUT PENGGUNA
app.put('/pengguna/:id_pengguna', async (req, res) => {
    const id = req.params.id_pengguna;
    const {
        nama_pengguna,
        email_pengguna,
        password_email,
        no_hp_pengguna
    } = req.body;

    if (
        typeof nama_pengguna !== 'string' || !nama_pengguna.trim() ||
        typeof email_pengguna !== 'string' || !email_pengguna.trim() ||
        typeof no_hp_pengguna !== 'string' || !no_hp_pengguna.trim()
    ) {
        return res.status(400).json({
            message: 'Nama, email, dan nomor HP wajib diisi'
        });
    }

    try {
        let sql;
        let values;

        if (password_email) {
            const hashPassword = await bcrypt.hash(password_email, 10);
            sql = `UPDATE pengguna
                   SET nama_pengguna = ?, email_pengguna = ?,
                       password_email = ?, no_hp_pengguna = ?
                   WHERE id_pengguna = ?`;
            values = [
                nama_pengguna.trim(),
                email_pengguna.trim(),
                hashPassword,
                no_hp_pengguna.trim(),
                id
            ];
        } else {
            sql = `UPDATE pengguna
                   SET nama_pengguna = ?, email_pengguna = ?,
                       no_hp_pengguna = ?
                   WHERE id_pengguna = ?`;
            values = [
                nama_pengguna.trim(),
                email_pengguna.trim(),
                no_hp_pengguna.trim(),
                id
            ];
        }

        db.query(sql, values, (err, hasil) => {
            if (err) return res.status(500).json({ error: err.message });

            if (hasil.affectedRows === 0) {
                return db.query(
                    'SELECT id_pengguna FROM pengguna WHERE id_pengguna = ?',
                    [id],
                    (err, data) => {
                        if (err) return res.status(500).json({ error: err.message });
                        if (data.length === 0) {
                            return res.status(404).json({
                                message: 'Pengguna tidak ditemukan'
                            });
                        }
                        res.json({ message: 'Data pengguna tidak berubah' });
                    }
                );
            }

            res.json({
                message: 'Data pengguna berhasil diperbarui',
                id_pengguna: id
            });
        });
    } catch (err) {
        res.status(500).json({ message: 'Gagal memproses password' });
    }
});

// PUT FOTO: BISA GANTI FOTO ATAU HANYA EDIT DATA
app.put('/foto/:id_foto', upload.single('file_foto'), (req, res) => {
    const id = req.params.id_foto;
    const {
        judul_foto,
        deskripsi_foto,
        id_kategori,
        id_pengguna
    } = req.body;

    if (
        typeof judul_foto !== 'string' || !judul_foto.trim() ||
        !id_kategori || !id_pengguna
    ) {
        if (req.file) hapusFileFoto(req.file.filename);

        return res.status(400).json({
            message: 'Judul, kategori, dan pengguna wajib diisi'
        });
    }

    db.query(
        'SELECT file_foto FROM foto WHERE id_foto = ?',
        [id],
        (err, data) => {
            if (err) {
                if (req.file) hapusFileFoto(req.file.filename);
                return res.status(500).json({ error: err.message });
            }

            if (data.length === 0) {
                if (req.file) hapusFileFoto(req.file.filename);
                return res.status(404).json({
                    message: 'Foto tidak ditemukan'
                });
            }

            const fileLama = data[0].file_foto;
            const fileBaru = req.file
                ? `uploads/${req.file.filename}`
                : fileLama;

            const sql = `
                UPDATE foto
                SET judul_foto = ?, deskripsi_foto = ?,
                    id_kategori = ?, id_pengguna = ?, file_foto = ?
                WHERE id_foto = ?
            `;

            db.query(
                sql,
                [
                    judul_foto.trim(),
                    deskripsi_foto || null,
                    id_kategori,
                    id_pengguna,
                    fileBaru,
                    id
                ],
                (err, hasil) => {
                    if (err) {
                        if (req.file) hapusFileFoto(req.file.filename);
                        return res.status(500).json({ error: err.message });
                    }

                    if (req.file && fileLama) {
                        hapusFileFoto(fileLama);
                    }

                    res.json({
                        message: 'Foto berhasil diperbarui',
                        id_foto: id,
                        file_foto: fileBaru
                    });
                }
            );
        }
    );
});

// ==================== DELETE ====================

// DELETE SEMUA FOTO BESERTA FILE ASLINYA
app.delete('/foto', (req, res) => {
    db.query('SELECT file_foto FROM foto', (err, daftar) => {
        if (err) return res.status(500).json({ error: err.message });

        db.query('DELETE FROM foto', err => {
            if (err) return res.status(500).json({ error: err.message });

            db.query('ALTER TABLE foto AUTO_INCREMENT = 1', err => {
                if (err) return res.status(500).json({ error: err.message });

                daftar.forEach(item => hapusFileFoto(item.file_foto));

                res.json({ message: 'Semua foto berhasil dihapus' });
            });
        });
    });
});

// DELETE SATU FOTO BESERTA FILE ASLINYA
app.delete('/foto/:id_foto', (req, res) => {
    db.query(
        'SELECT file_foto FROM foto WHERE id_foto = ?',
        [req.params.id_foto],
        (err, data) => {
            if (err) return res.status(500).json({ error: err.message });

            if (data.length === 0) {
                return res.status(404).json({
                    message: 'Foto tidak ditemukan'
                });
            }

            db.query(
                'DELETE FROM foto WHERE id_foto = ?',
                [req.params.id_foto],
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });

                    hapusFileFoto(data[0].file_foto);

                    db.query('SELECT COUNT(*) AS total FROM foto', (err, hasil) => {
                        if (err) return res.status(500).json({ error: err.message });

                        if (Number(hasil[0].total) === 0) {
                            return db.query(
                                'ALTER TABLE foto AUTO_INCREMENT = 1',
                                err => {
                                    if (err) {
                                        return res.status(500).json({ error: err.message });
                                    }
                                    res.json({ message: 'Foto berhasil dihapus' });
                                }
                            );
                        }

                        res.json({ message: 'Foto berhasil dihapus' });
                    });
                }
            );
        }
    );
});

// DELETE SEMUA KATEGORI
app.delete('/kategori', (req, res) => {
    db.query('DELETE FROM kategori', err => {
        if (err) return res.status(500).json({ error: err.message });

        db.query('ALTER TABLE kategori AUTO_INCREMENT = 1', err => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Semua kategori berhasil dihapus' });
        });
    });
});

// DELETE SATU KATEGORI
app.delete('/kategori/:id', (req, res) => {
    db.query(
        'DELETE FROM kategori WHERE id_kategori = ?',
        [req.params.id],
        (err, hasil) => {
            if (err) return res.status(500).json({ error: err.message });

            if (hasil.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Kategori tidak ditemukan'
                });
            }

            db.query('SELECT COUNT(*) AS total FROM kategori', (err, data) => {
                if (err) return res.status(500).json({ error: err.message });

                const selesai = () => {
                    res.json({ message: 'Kategori berhasil dihapus' });
                };

                if (Number(data[0].total) === 0) {
                    return db.query(
                        'ALTER TABLE kategori AUTO_INCREMENT = 1',
                        err => {
                            if (err) return res.status(500).json({ error: err.message });
                            selesai();
                        }
                    );
                }

                selesai();
            });
        }
    );
});

// DELETE SEMUA PENGGUNA
app.delete('/pengguna', (req, res) => {
    db.query('DELETE FROM pengguna', err => {
        if (err) return res.status(500).json({ error: err.message });

        db.query('ALTER TABLE pengguna AUTO_INCREMENT = 1', err => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Semua pengguna berhasil dihapus' });
        });
    });
});

// DELETE SATU PENGGUNA
app.delete('/pengguna/:id_pengguna', (req, res) => {
    db.query(
        'DELETE FROM pengguna WHERE id_pengguna = ?',
        [req.params.id_pengguna],
        (err, hasil) => {
            if (err) return res.status(500).json({ error: err.message });

            if (hasil.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Pengguna tidak ditemukan'
                });
            }

            db.query('SELECT COUNT(*) AS total FROM pengguna', (err, data) => {
                if (err) return res.status(500).json({ error: err.message });

                const selesai = () => {
                    res.json({ message: 'Pengguna berhasil dihapus' });
                };

                if (Number(data[0].total) === 0) {
                    return db.query(
                        'ALTER TABLE pengguna AUTO_INCREMENT = 1',
                        err => {
                            if (err) return res.status(500).json({ error: err.message });
                            selesai();
                        }
                    );
                }

                selesai();
            });
        }
    );
});

// MENANGANI ERROR UPLOAD
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const pesan = err.code === 'LIMIT_FILE_SIZE'
            ? 'Ukuran foto maksimal 5 MB.'
            : err.message;

        return res.status(400).json({ message: pesan });
    }

    if (err) {
        return res.status(400).json({ message: err.message });
    }

    next();
});

// JALANKAN SERVER
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
