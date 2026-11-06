const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const authJWT = require('./middleware');
const app = express();
const PORT = 1910;
console.log('server Galeri Winky berjalan');
console.log('LOKASI FILE:', __filename);

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
app.use(cors());
app.use(express.json());
function hanyaAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            message: 'Akses ditolak. Khusus admin.'
        });
    }
    next();
}
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));
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
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const jenis = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif'
        ];
        if (jenis.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(
                'File harus berupa gambar JPG, PNG, WEBP, atau GIF.'
            ));
        }
    }
});
class AiServiceError extends Error {
    constructor(message, status = 502) {
        super(message);
        this.status = status;
    }
}

function getCloudflareConfig() {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
    const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
    if (!accountId || !apiToken) {
        throw new AiServiceError(
            'Atur CLOUDFLARE_ACCOUNT_ID dan CLOUDFLARE_API_TOKEN di backend/.env, lalu mulai ulang backend.',
            503
        );
    }
    return { accountId, apiToken };
}

async function generateImage(prompt, signal) {
    const { accountId, apiToken } = getCloudflareConfig();
    const timeout = AbortSignal.timeout(120000);
    const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let response;
    try {
        response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt, steps: 4 }),
                signal: requestSignal
            }
        );
    } catch (error) {
        if (signal?.aborted) throw error;
        throw new AiServiceError(
            timeout.aborted
                ? 'Permintaan ke Cloudflare Workers AI terlalu lama.'
                : 'Backend tidak dapat terhubung ke Cloudflare Workers AI.',
            timeout.aborted ? 504 : 502
        );
    }

    let result;
    try {
        result = await response.json();
    } catch {
        throw new AiServiceError('Respons Cloudflare Workers AI tidak dapat dibaca.', 502);
    }

    if (!response.ok || !result.success) {
        const cloudflareError = result.errors?.find(item => item && typeof item.message === 'string');
        throw new AiServiceError(
            response.status === 401 || response.status === 403
                ? 'Cloudflare menolak kredensial. Pastikan Account ID benar dan API token memiliki izin Workers AI Read dan Workers AI Edit.'
                : response.status === 429
                    ? 'Kuota harian Cloudflare Workers AI habis atau permintaan sedang dibatasi. Periksa pemakaian di dashboard Cloudflare dan coba lagi setelah kuota direset.'
                    : response.status === 402
                        ? 'Cloudflare membutuhkan pengaturan billing untuk akun atau penggunaan ini. Periksa paket dan pemakaian Workers AI di dashboard Cloudflare.'
                        : cloudflareError?.message || `Cloudflare Workers AI gagal membuat gambar (HTTP ${response.status}).`,
            response.status === 429 || response.status === 402 ? response.status : 502
        );
    }
    if (typeof result.result?.image !== 'string' || !result.result.image) {
        throw new AiServiceError('Cloudflare Workers AI tidak mengembalikan gambar.', 502);
    }
    return {
        mimeType: 'image/jpeg',
        data: result.result.image
    };
}
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
app.get('/', (req, res) => {
    res.send('Server Galeri Winky berjalan');
});
app.get('/kategori', (req, res) => {
    db.query('SELECT * FROM kategori', (err, hasil) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(hasil);
    });
});
app.post('/kategori', authJWT, hanyaAdmin, (req, res) => {
    const nama = req.body.nama_kategori;
    if (typeof nama !== 'string' || !nama.trim()) {
        return res.status(400).json({
            message: 'Nama kategori wajib diisi'
        });
    }
    db.query(
        'SELECT id_kategori FROM kategori ORDER BY id_kategori ASC',
        (err, hasil) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            let id = 1;
            for (const data of hasil) {
                if (Number(data.id_kategori) !== id) break;
                id++;
            }
            db.query(
                'INSERT INTO kategori (id_kategori, nama_kategori) VALUES (?, ?)',
                [id, nama.trim()],
                err => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.status(201).json({
                        message: 'Kategori berhasil ditambahkan',
                        id_kategori: id
                    });
                }
            );
        }
    );
});
app.put('/kategori/:id_kategori', authJWT, hanyaAdmin, (req, res) => {
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
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (hasil.affectedRows === 0) {
                return db.query(
                    'SELECT id_kategori FROM kategori WHERE id_kategori = ?',
                    [id],
                    (err, data) => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }
                        if (data.length === 0) {
                            return res.status(404).json({
                                message: 'Kategori tidak ditemukan'
                            });
                        }
                        res.json({
                            message: 'Data kategori tidak berubah'
                        });
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
app.delete('/kategori', authJWT, hanyaAdmin, (req, res) => {
    db.query('DELETE FROM kategori', err => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        db.query('ALTER TABLE kategori AUTO_INCREMENT = 1', err => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({
                message: 'Semua kategori berhasil dihapus'
            });
        });
    });
});
app.delete('/kategori/:id', authJWT, hanyaAdmin, (req, res) => {
    db.query(
        'DELETE FROM kategori WHERE id_kategori = ?',
        [req.params.id],
        (err, hasil) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (hasil.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Kategori tidak ditemukan'
                });
            }
            db.query(
                'SELECT COUNT(*) AS total FROM kategori',
                (err, data) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    const selesai = () => {
                        res.json({
                            message: 'Kategori berhasil dihapus'
                        });
                    };
                    if (Number(data[0].total) === 0) {
                        return db.query(
                            'ALTER TABLE kategori AUTO_INCREMENT = 1',
                            err => {
                                if (err) {
                                    return res.status(500).json({
                                        error: err.message
                                    });
                                }

                                selesai();
                            }
                        );
                    }
                    selesai();
                }
            );
        }
    );
});
app.get('/pengguna', authJWT, hanyaAdmin, (req, res) => {
    db.query(
        `SELECT id_pengguna, nama_pengguna,
                email_pengguna, no_hp_pengguna, role
         FROM pengguna`,
        (err, hasil) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(hasil);
        }
    );
});
app.post('/pengguna', authJWT, hanyaAdmin, async (req, res) => {
    const {
        nama_pengguna,
        email_pengguna,
        password_email,
        no_hp_pengguna,
        role
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
    const roleBaru = role || 'pengguna';
    if (!['admin', 'pengguna'].includes(roleBaru)) {
        return res.status(400).json({
            message: 'Role tidak valid'
        });
    }
    try {
        const hashPassword = await bcrypt.hash(password_email, 10);
        db.query(
            'SELECT id_pengguna FROM pengguna ORDER BY id_pengguna ASC',
            (err, hasil) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                let id = 1;
                for (const data of hasil) {
                    if (Number(data.id_pengguna) !== id) break;
                    id++;
                }
                db.query(
                    `INSERT INTO pengguna
                    (id_pengguna, nama_pengguna, email_pengguna,
                     password_email, no_hp_pengguna, role)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        id,
                        nama_pengguna.trim(),
                        email_pengguna.trim(),
                        hashPassword,
                        no_hp_pengguna.trim(),
                        roleBaru
                    ],
                    err => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }
                        res.status(201).json({
                            message: 'Pengguna berhasil ditambahkan',
                            id_pengguna: id,
                            role: roleBaru
                        });
                    }
                );
            }
        );
    } catch (err) {
        res.status(500).json({
            message: 'Gagal memproses password'
        });
    }
});
app.put('/pengguna/:id_pengguna', authJWT, hanyaAdmin, async (req, res) => {
    const id = req.params.id_pengguna;
    const {
        nama_pengguna,
        email_pengguna,
        password_email,
        no_hp_pengguna,
        role
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
    if (role && !['admin', 'pengguna'].includes(role)) {
        return res.status(400).json({
            message: 'Role tidak valid'
        });
    }
    try {
        db.query(
            'SELECT id_pengguna, role FROM pengguna WHERE id_pengguna = ?',
            [id],
            async (err, data) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                if (data.length === 0) {
                    return res.status(404).json({
                        message: 'Pengguna tidak ditemukan'
                    });
                }
                const roleBaru = role || data[0].role;
                let sql;
                let values;
                if (password_email) {
                    const hashPassword = await bcrypt.hash(password_email, 10);
                    sql = `UPDATE pengguna
                           SET nama_pengguna = ?,
                               email_pengguna = ?,
                               password_email = ?,
                               no_hp_pengguna = ?,
                               role = ?
                           WHERE id_pengguna = ?`;
                    values = [
                        nama_pengguna.trim(),
                        email_pengguna.trim(),
                        hashPassword,
                        no_hp_pengguna.trim(),
                        roleBaru,
                        id
                    ];
                } else {
                    sql = `UPDATE pengguna
                           SET nama_pengguna = ?,
                               email_pengguna = ?,
                               no_hp_pengguna = ?,
                               role = ?
                           WHERE id_pengguna = ?`;
                    values = [
                        nama_pengguna.trim(),
                        email_pengguna.trim(),
                        no_hp_pengguna.trim(),
                        roleBaru,
                        id
                    ];
                }
                db.query(sql, values, err => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({
                        message: 'Data pengguna berhasil diperbarui',
                        id_pengguna: id,
                        role: roleBaru
                    });
                });
            }
        );
    } catch (err) {
        res.status(500).json({
            message: 'Gagal memproses password'
        });
    }
});
app.delete('/pengguna', authJWT, hanyaAdmin, (req, res) => {
    db.query('DELETE FROM pengguna', err => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        db.query('ALTER TABLE pengguna AUTO_INCREMENT = 1', err => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({
                message: 'Semua pengguna berhasil dihapus'
            });
        });
    });
});
app.delete('/pengguna/:id_pengguna', authJWT, hanyaAdmin, (req, res) => {
    const id = Number(req.params.id_pengguna);
    if (id === Number(req.user.id)) {
        return res.status(400).json({
            message: 'Admin tidak dapat menghapus akun sendiri'
        });
    }
    db.query(
        'DELETE FROM pengguna WHERE id_pengguna = ?',
        [id],
        (err, hasil) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (hasil.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Pengguna tidak ditemukan'
                });
            }
            db.query(
                'SELECT COUNT(*) AS total FROM pengguna',
                (err, data) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    const selesai = () => {
                        res.json({
                            message: 'Pengguna berhasil dihapus'
                        });
                    };
                    if (Number(data[0].total) === 0) {
                        return db.query(
                            'ALTER TABLE pengguna AUTO_INCREMENT = 1',
                            err => {
                                if (err) {
                                    return res.status(500).json({
                                        error: err.message
                                    });
                                }
                                selesai();
                            }
                        );
                    }
                    selesai();
                }
            );
        }
    );
});
app.get('/foto', authJWT, (req, res) => {
    let sql = `
        SELECT foto.*, kategori.nama_kategori,
               pengguna.nama_pengguna
        FROM foto
        LEFT JOIN kategori
            ON foto.id_kategori = kategori.id_kategori
        LEFT JOIN pengguna
            ON foto.id_pengguna = pengguna.id_pengguna
    `;
    const params = [];
    if (req.user.role !== 'admin') {
        sql += ' WHERE foto.id_pengguna = ?';
        params.push(req.user.id);
    }
    sql += ' ORDER BY foto.id_foto DESC';
    db.query(sql, params, (err, hasil) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(hasil);
    });
});
app.post('/foto', authJWT, upload.single('file_foto'), (req, res) => {
    const {
        judul_foto,
        deskripsi_foto,
        id_kategori,
        id_pengguna
    } = req.body;
    if (
        typeof judul_foto !== 'string' || !judul_foto.trim() ||
        !id_kategori || !req.file
    ) {
        if (req.file) hapusFileFoto(req.file.filename);
        return res.status(400).json({
            message: 'Judul, foto, dan kategori wajib diisi'
        });
    }
    const pemilikFoto = req.user.role === 'admin'
        ? (id_pengguna || req.user.id)
        : req.user.id;
    const fileFoto = `uploads/${req.file.filename}`;
    const namaKunci = 'galeri_winky_foto_insert';
    db.query(
        'SELECT GET_LOCK(?, 10) AS terkunci',
        [namaKunci],
        (err, kunci) => {
            if (err) {
                hapusFileFoto(req.file.filename);
                return res.status(500).json({
                    error: err.message
                });
            }
            if (Number(kunci[0].terkunci) !== 1) {
                hapusFileFoto(req.file.filename);
                return res.status(503).json({
                    message: 'Database sedang sibuk, silakan coba lagi'
                });
            }
            db.query(
                'SELECT id_foto FROM foto ORDER BY id_foto ASC',
                (err, hasil) => {
                    if (err) {
                        return lepaskanKunci(
                            () => {
                                hapusFileFoto(req.file.filename);
                                res.status(500).json({
                                    error: err.message
                                });
                            }
                        );
                    }
                    let idBaru = 1;
                    for (const data of hasil) {
                        if (Number(data.id_foto) !== idBaru) {
                            break;
                        }
                        idBaru++;
                    }
                    const sql = `
                        INSERT INTO foto (
                            id_foto,
                            judul_foto,
                            deskripsi_foto,
                            id_kategori,
                            id_pengguna,
                            file_foto
                        )
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;
                    db.query(
                        sql,
                        [
                            idBaru,
                            judul_foto.trim(),
                            deskripsi_foto || null,
                            id_kategori,
                            pemilikFoto,
                            fileFoto
                        ],
                        err => {
                            if (err) {
                                return lepaskanKunci(
                                    () => {
                                        hapusFileFoto(req.file.filename);
                                        res.status(500).json({
                                            error: err.message
                                        });
                                    }
                                );
                            }
                            lepaskanKunci(() => {
                                res.status(201).json({
                                    message: 'Foto berhasil diunggah',
                                    id_foto: idBaru,
                                    file_foto: fileFoto
                                });
                            });
                        }
                    );
                }
            );
            function lepaskanKunci(callback) {
                db.query(
                    'SELECT RELEASE_LOCK(?)',
                    [namaKunci],
                    err => {
                        if (err) {
                            console.error(
                                'Gagal melepaskan kunci:',
                                err.message
                            );
                        }
                        callback();
                    }
                );
            }
        }
    );
});
app.put('/foto/:id_foto', authJWT, upload.single('file_foto'), (req, res) => {
    const id = req.params.id_foto;
    const { judul_foto, deskripsi_foto, id_kategori, id_pengguna } = req.body;

    if (typeof judul_foto !== 'string' || !judul_foto.trim() || !id_kategori) {
        if (req.file) hapusFileFoto(req.file.filename);
        return res.status(400).json({
            message: 'Judul dan kategori wajib diisi'
        });
    }
    db.query(
        'SELECT id_pengguna, file_foto FROM foto WHERE id_foto = ?',
        [id],
        (err, data) => {
            if (err) {
                if (req.file) hapusFileFoto(req.file.filename);
                return res.status(500).json({ error: err.message });
            }
            if (data.length === 0) {
                if (req.file) hapusFileFoto(req.file.filename);
                return res.status(404).json({ message: 'Foto tidak ditemukan' });
            }
            const fotoLama = data[0];
            if (
                req.user.role !== 'admin' &&
                Number(fotoLama.id_pengguna) !== Number(req.user.id)
            ) {
                if (req.file) hapusFileFoto(req.file.filename);
                return res.status(403).json({
                    message: 'Kamu hanya boleh mengedit foto milik sendiri'
                });
            }
            const pemilikFoto = req.user.role === 'admin'
                ? (id_pengguna || fotoLama.id_pengguna)
                : fotoLama.id_pengguna;
            const fileBaru = req.file
                ? `uploads/${req.file.filename}`
                : fotoLama.file_foto;
            db.query(
                `UPDATE foto
                 SET judul_foto = ?, deskripsi_foto = ?,
                     id_kategori = ?, id_pengguna = ?, file_foto = ?
                 WHERE id_foto = ?`,
                [
                    judul_foto.trim(),
                    deskripsi_foto || null,
                    id_kategori,
                    pemilikFoto,
                    fileBaru,
                    id
                ],
                err => {
                    if (err) {
                        if (req.file) hapusFileFoto(req.file.filename);
                        return res.status(500).json({ error: err.message });
                    }
                    if (req.file) hapusFileFoto(fotoLama.file_foto);
                    res.json({
                        message: 'Foto berhasil diperbarui',
                        id_foto: Number(id),
                        file_foto: fileBaru
                    });
                }
            );
        }
    );
});
app.delete('/foto', authJWT, hanyaAdmin, (req, res) => {
    db.query('SELECT file_foto FROM foto', (err, daftar) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        db.query('DELETE FROM foto', err => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            db.query('ALTER TABLE foto AUTO_INCREMENT = 1', err => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                daftar.forEach(item => hapusFileFoto(item.file_foto));
                res.json({
                    message: 'Semua foto berhasil dihapus'
                });
            });
        });
    });
});
app.delete('/foto/:id_foto', authJWT, (req, res) => {
    const id = req.params.id_foto;
    db.query(
        'SELECT file_foto, id_pengguna FROM foto WHERE id_foto = ?',
        [id],
        (err, data) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (data.length === 0) {
                return res.status(404).json({
                    message: 'Foto tidak ditemukan'
                });
            }
            if (
                req.user.role !== 'admin' &&
                Number(data[0].id_pengguna) !== Number(req.user.id)
            ) {
                return res.status(403).json({
                    message: 'Kamu hanya boleh menghapus foto milik sendiri'
                });
            }
            db.query(
                'DELETE FROM foto WHERE id_foto = ?',
                [id],
                err => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    hapusFileFoto(data[0].file_foto);
                    db.query(
                        'SELECT COUNT(*) AS total FROM foto',
                        (err, hasil) => {
                            if (err) {
                                return res.status(500).json({ error: err.message });
                            }
                            if (Number(hasil[0].total) === 0) {
                                return db.query(
                                    'ALTER TABLE foto AUTO_INCREMENT = 1',
                                    err => {
                                        if (err) {
                                            return res.status(500).json({
                                                error: err.message
                                            });
                                        }
                                        res.json({
                                            message: 'Foto berhasil dihapus'
                                        });
                                    }
                                );
                            }
                            res.json({
                                message: 'Foto berhasil dihapus'
                            });
                        }
                    );
                }
            );
        }
    );
});
app.post('/register', async (req, res) => {
    const {
        nama_pengguna,
        email_pengguna,
        password_email,
        no_hp_pengguna
    } = req.body;

    if (
        typeof nama_pengguna !== 'string' || !nama_pengguna.trim() ||
        typeof email_pengguna !== 'string' || !email_pengguna.trim() ||
        typeof password_email !== 'string' || password_email.length < 8 ||
        typeof no_hp_pengguna !== 'string' || !no_hp_pengguna.trim()
    ) {
        return res.status(400).json({
            message: 'Data wajib diisi dan password minimal 8 karakter'
        });
    }
    try {
        const hashPassword = await bcrypt.hash(password_email, 10);
        db.query(
            'SELECT id_pengguna FROM pengguna ORDER BY id_pengguna ASC',
            (err, hasil) => {
                if (err) {
                    return res.status(500).json({
                        message: 'Gagal mengambil data pengguna'
                    });
                }
                let id = 1;
                for (const data of hasil) {
                    if (Number(data.id_pengguna) !== id) break;
                    id++;
                }
                db.query(
                    `INSERT INTO pengguna
                    (id_pengguna, nama_pengguna, email_pengguna,
                     password_email, no_hp_pengguna, role)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        id,
                        nama_pengguna.trim(),
                        email_pengguna.trim(),
                        hashPassword,
                        no_hp_pengguna.trim(),
                        'pengguna'
                    ],
                    err => {
                        if (err) {
                            if (err.code === 'ER_DUP_ENTRY') {
                                return res.status(409).json({
                                    message: 'Email sudah terdaftar'
                                });
                            }
                            return res.status(500).json({
                                message: 'Gagal mendaftarkan pengguna'
                            });
                        }
                        res.status(201).json({
                            message: 'Pendaftaran berhasil',
                            id_pengguna: id,
                            role: 'pengguna'
                        });
                    }
                );
            }
        );
    } catch (err) {
        res.status(500).json({
            message: 'Gagal memproses password'
        });
    }
});
app.post('/login', (req, res) => {
    const {
        email_pengguna,
        password_email
    } = req.body;
    if (!email_pengguna || !password_email) {
        return res.status(400).json({
            message: 'Email dan password wajib diisi'
        });
    }
    if (!process.env.JWT_SECRET) {
        return res.status(500).json({
            message: 'Konfigurasi JWT_SECRET belum tersedia'
        });
    }
    db.query(
        'SELECT * FROM pengguna WHERE email_pengguna = ?',
        [email_pengguna],
        async (err, hasil) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (hasil.length === 0) {
                return res.status(401).json({
                    message: 'Login gagal, email atau password salah'
                });
            }
            const pengguna = hasil[0];
            try {
                const cocok = await bcrypt.compare(
                    password_email,
                    pengguna.password_email
                );
                if (!cocok) {
                    return res.status(401).json({
                        message: 'Login gagal, email atau password salah'
                    });
                }
                const token = jwt.sign(
                    {
                        id: pengguna.id_pengguna,
                        role: pengguna.role
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: '7d' }
                );
                res.json({
                    message: 'Login berhasil',
                    token: token,
                    pengguna: {
                        id_pengguna: pengguna.id_pengguna,
                        nama_pengguna: pengguna.nama_pengguna,
                        email_pengguna: pengguna.email_pengguna,
                        role: pengguna.role
                    }
                });
            } catch (error) {
                res.status(500).json({
                    message: 'Terjadi kesalahan saat login'
                });
            }
        }
    );
});
app.get('/api/profile', authJWT, (req, res) => {
    db.query(
        `SELECT id_pengguna, nama_pengguna,
                email_pengguna, role
         FROM pengguna
         WHERE id_pengguna = ?`,
        [req.user.id],
        (err, hasil) => {
            if (err) {
                return res.status(500).json({
                    message: 'Gagal mengambil data profil'
                });
            }
            if (hasil.length === 0) {
                return res.status(404).json({
                    message: 'Pengguna tidak ditemukan'
                });
            }
            res.json({
                message: 'Profil berhasil diambil',
                pengguna: hasil[0]
            });
        }
    );
});
app.get('/api/ai/providers', authJWT, (req, res) => {
    res.json({
        providers: {
            cloudflare: {
                configured: Boolean(
                    process.env.CLOUDFLARE_ACCOUNT_ID?.trim() &&
                    process.env.CLOUDFLARE_API_TOKEN?.trim()
                ),
                capabilities: ['image']
            }
        }
    });
});

app.post('/api/ai/image', authJWT, async (req, res) => {
    const { prompt } = req.body;
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.trim().length > 2048) {
        return res.status(400).json({
            message: 'Prompt gambar wajib diisi dan maksimal 2.048 karakter.'
        });
    }
    const controller = new AbortController();
    res.on('close', () => {
        if (!res.writableEnded) controller.abort();
    });
    try {
        const image = await generateImage(prompt.trim(), controller.signal);
        res.json({ image });
    } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof AiServiceError) {
            return res.status(error.status).json({ message: error.message });
        }
        console.error('Gagal membuat gambar AI:', error.message);
        res.status(500).json({ message: 'Gagal membuat gambar.' });
    }
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const pesan = err.code === 'LIMIT_FILE_SIZE'
            ? 'Ukuran foto maksimal 5 MB.'
            : err.message;
        return res.status(400).json({
            message: pesan
        });
    }
    if (err) {
        return res.status(400).json({
            message: err.message
        });
    }
    next();
});
app.get('/foto/guest', (req, res) => {
    const sql = `
        SELECT foto.id_foto,
               foto.judul_foto,
               foto.deskripsi_foto,
               foto.tanggal_unggah,
               foto.file_foto,
               kategori.nama_kategori
        FROM foto
        LEFT JOIN kategori
            ON foto.id_kategori = kategori.id_kategori
        ORDER BY foto.id_foto DESC
    `;
    db.query(sql, (err, hasil) => {
        if (err) {
            return res.status(500).json({
                message: 'Galeri gagal dimuat',
                error: err.message
            });
        }
        res.json(hasil);
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di port ${PORT}`);
});