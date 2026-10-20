const express = require('express')
const app = express()
const PORT = 3000
const mysql = require('mysql2')
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_galeri_winky_git'
})
db.connect(err => {
    if (err) {
        console.error('gagal conact ke database', err)
    }
    console.log('berhasil melbu cuyyy...ke mysql josjis');
});

app.use(express.json())

app.get('/', (req, res) => {
    res.send('ini dienpoint root jos jis')
})
app.get('/kategori', (req, res) => {
    const sql = 'SELECT * FROM kategori'
    db.query(sql, (err, hasil) => {
        if (err) return res.status(500).json
            ({ error: err })
        res.json(hasil)

    })
})

app.post('/kategori', (req, res) => {
    const {nama_kategori} = req.body
    const sql = 'INSERT INTO kategori(nama_kategori) values(?)'
    db.query(sql, [nama_kategori], (err, results) => {
        if (err) return res.status(500).json
            ({ error: err.sqlMessage })
        res.json({
            message: "kategori berhasil di tambahkan ketable",
            id_kategori: results.insertId
        })
    })
})

app.listen(PORT, () => {
    console.log(`server backend berjalan di http://localhost:${PORT}`);
})
