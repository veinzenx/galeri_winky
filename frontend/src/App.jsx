
import { useEffect, useState } from 'react';
import './App.css';

const API = 'http://192.168.137.1:1910';

const formKategori = { nama_kategori: '' };

const formPengguna = {
  nama_pengguna: '',
  email_pengguna: '',
  password_email: '',
  no_hp_pengguna: ''
};

const formFoto = {
  judul_foto: '',
  deskripsi_foto: '',
  id_kategori: '',
  id_pengguna: '',
  file_foto: ''
};

function App() {
  const [halaman, setHalaman] = useState('kategori');
  const [kategori, setKategori] = useState([]);
  const [pengguna, setPengguna] = useState([]);
  const [foto, setFoto] = useState([]);

  const [form, setForm] = useState({ ...formKategori });
  const [formFotoData, setFormFotoData] = useState({ ...formFoto });
  const [fileFoto, setFileFoto] = useState(null);
  const [previewFoto, setPreviewFoto] = useState('');

  const [editId, setEditId] = useState(null);
  const [pesan, setPesan] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isKategori = halaman === 'kategori';
  const isPengguna = halaman === 'pengguna';
  const isFoto = halaman === 'foto';

  const daftar = isKategori
    ? kategori
    : isPengguna
      ? pengguna
      : foto;

  async function request(url, options = {}) {
    const res = await fetch(`${API}${url}`, options);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || data.error || 'Permintaan gagal.');
    }

    return data;
  }

  // ==================== AMBIL DATA ====================

  async function ambilKategori() {
    try {
      const data = await request('/kategori');
      setKategori(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setPesan('Kategori: ' + err.message);
    }
  }

  async function ambilPengguna() {
    try {
      const data = await request('/pengguna');
      setPengguna(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setPesan('Pengguna: ' + err.message);
    }
  }

  async function ambilFoto() {
    try {
      const data = await request('/foto');
      setFoto(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setPesan('Foto: ' + err.message);
    }
  }

  async function muatData() {
    await Promise.all([
      ambilKategori(),
      ambilPengguna(),
      ambilFoto()
    ]);
  }

  useEffect(() => {
    muatData();
  }, []);

  // Pratinjau gambar yang dipilih dari komputer
  useEffect(() => {
    if (!fileFoto) {
      setPreviewFoto('');
      return;
    }

    const url = URL.createObjectURL(fileFoto);
    setPreviewFoto(url);

    return () => URL.revokeObjectURL(url);
  }, [fileFoto]);

  // ==================== NAVIGASI ====================

  function ubahHalaman(menu) {
    setHalaman(menu);
    setEditId(null);
    setForm(menu === 'kategori'
      ? { ...formKategori }
      : { ...formPengguna });

    setFormFotoData({ ...formFoto });
    setFileFoto(null);
    setPesan('');
    setShowPassword(false);
  }

  function ubahInput(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  }

  function ubahInputFoto(e) {
    setFormFotoData({
      ...formFotoData,
      [e.target.name]: e.target.value
    });
  }

  // ==================== EDIT DATA ====================

  function mulaiEdit(item) {
    setEditId(
      item.id_kategori ??
      item.id_pengguna ??
      item.id_foto
    );

    setFileFoto(null);
    setPesan('');

    if (isKategori) {
      setForm({ nama_kategori: item.nama_kategori });
    } else if (isPengguna) {
      setForm({
        nama_pengguna: item.nama_pengguna,
        email_pengguna: item.email_pengguna,
        password_email: '',
        no_hp_pengguna: item.no_hp_pengguna
      });
    } else {
      setFormFotoData({
        judul_foto: item.judul_foto || '',
        deskripsi_foto: item.deskripsi_foto || '',
        id_kategori: item.id_kategori ?? '',
        id_pengguna: item.id_pengguna ?? '',
        file_foto: item.file_foto || ''
      });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function batalEdit() {
    setEditId(null);
    setForm(isKategori
      ? { ...formKategori }
      : { ...formPengguna });

    setFormFotoData({ ...formFoto });
    setFileFoto(null);
    setPesan('');
  }

  // ==================== SIMPAN KATEGORI / PENGGUNA ====================

  async function simpanData(e) {
    e.preventDefault();
    setLoading(true);
    setPesan('');

    const endpoint = isKategori ? '/kategori' : '/pengguna';
    const body = { ...form };

    if (isKategori) {
      body.nama_kategori = body.nama_kategori.trim();
    } else {
      body.nama_pengguna = body.nama_pengguna.trim();
      body.email_pengguna = body.email_pengguna.trim();
      body.no_hp_pengguna = body.no_hp_pengguna.trim();

      if (editId && !body.password_email) {
        delete body.password_email;
      }
    }

    try {
      const data = await request(
        editId ? `${endpoint}/${editId}` : endpoint,
        {
          method: editId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      setPesan(data.message || 'Data berhasil disimpan.');
      setEditId(null);
      setForm(isKategori
        ? { ...formKategori }
        : { ...formPengguna });

      if (isKategori) await ambilKategori();
      else await ambilPengguna();
    } catch (err) {
      setPesan(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ==================== UPLOAD DAN EDIT FOTO ====================

  async function simpanFoto(e) {
    e.preventDefault();
    setLoading(true);
    setPesan('');

    if (!editId && !fileFoto) {
      setPesan('Silakan pilih foto yang ingin diunggah.');
      setLoading(false);
      return;
    }

    const dataForm = new FormData();

    dataForm.append(
      'judul_foto',
      formFotoData.judul_foto.trim()
    );
    dataForm.append(
      'deskripsi_foto',
      formFotoData.deskripsi_foto.trim()
    );
    dataForm.append('id_kategori', formFotoData.id_kategori);
    dataForm.append('id_pengguna', formFotoData.id_pengguna);

    if (fileFoto) {
      dataForm.append('file_foto', fileFoto);
    }

    try {
      const hasil = await request(
        editId ? `/foto/${editId}` : '/foto',
        {
          method: editId ? 'PUT' : 'POST',
          body: dataForm
        }
      );

      setPesan(hasil.message || 'Foto berhasil disimpan.');
      setEditId(null);
      setFormFotoData({ ...formFoto });
      setFileFoto(null);

      await ambilFoto();
    } catch (err) {
      setPesan(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ==================== HAPUS DATA ====================

  async function hapusData(id) {
    if (!window.confirm(`Yakin ingin menghapus data dengan ID ${id}?`)) {
      return;
    }

    try {
      const endpoint = isKategori
        ? '/kategori'
        : isPengguna
          ? '/pengguna'
          : '/foto';

      const data = await request(`${endpoint}/${id}`, {
        method: 'DELETE'
      });

      setPesan(data.message || 'Data berhasil dihapus.');

      if (Number(editId) === Number(id)) {
        batalEdit();
      }

      if (isKategori) await ambilKategori();
      else if (isPengguna) await ambilPengguna();
      else await ambilFoto();
    } catch (err) {
      setPesan(err.message);
    }
  }

  async function hapusSemuaData() {
    const namaData = isKategori
      ? 'kategori'
      : isPengguna
        ? 'pengguna'
        : 'foto';

    if (daftar.length === 0) {
      setPesan(`Tidak ada data ${namaData} untuk dihapus.`);
      return;
    }

    const yakin = window.confirm(
      `PERINGATAN!\nSemua data ${namaData} akan dihapus.\nTindakan ini tidak dapat dibatalkan. Lanjutkan?`
    );

    if (!yakin) return;

    setLoading(true);
    setPesan('');

    try {
      const endpoint = isKategori
        ? '/kategori'
        : isPengguna
          ? '/pengguna'
          : '/foto';

      const data = await request(endpoint, { method: 'DELETE' });

      setPesan(data.message || `Semua data ${namaData} berhasil dihapus.`);
      batalEdit();

      if (isKategori) await ambilKategori();
      else if (isPengguna) await ambilPengguna();
      else await ambilFoto();
    } catch (err) {
      setPesan(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatTanggal(tanggal) {
    if (!tanggal) return 'Tanggal tidak tersedia';

    // MySQL biasanya mengembalikan timestamp tanpa penanda zona waktu.
    // Tambahkan zona WIB agar waktu lokal tidak bergeser.
    const teksTanggal = String(tanggal);
    const tanggalISO = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(teksTanggal)
      ? teksTanggal.replace(' ', 'T') + '+07:00'
      : teksTanggal;

    const nilai = new Date(tanggalISO);

    if (Number.isNaN(nilai.getTime())) return teksTanggal;

    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(nilai);
  }

  function alamatFoto(lokasi) {
    if (!lokasi) return '';

    if (lokasi.startsWith('http://') || lokasi.startsWith('https://')) {
      return lokasi;
    }

    return `${API}/${lokasi.replace(/^\/+/, '')}`;
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <a
          href="#"
          className="brand"
          onClick={e => e.preventDefault()}
        >
          <span className="brand-icon">W</span>
          <span>Galeri <b>Winky</b></span>
        </a>

        <p className="menu-label">MENU UTAMA</p>

        <button
          className={`menu-item ${isKategori ? 'active' : ''}`}
          onClick={() => ubahHalaman('kategori')}
        >
          <span>▦</span> Kategori
        </button>

        <button
          className={`menu-item ${isPengguna ? 'active' : ''}`}
          onClick={() => ubahHalaman('pengguna')}
        >
          <span>♙</span> Pengguna
        </button>

        <button
          className={`menu-item ${isFoto ? 'active' : ''}`}
          onClick={() => ubahHalaman('foto')}
        >
          <span>▧</span> Foto
        </button>

        <div className="sidebar-bottom">
          <span className="status-dot"></span>
          Sistem Pengelolaan Data
          <small>Backend API · Port 1910</small>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span>
            Galeri Winky / {isKategori
              ? 'Kategori'
              : isPengguna
                ? 'Pengguna'
                : 'Foto'}
          </span>
          <span className="admin-label">Administrator</span>
        </header>

        <section className="page-content">
          <div className="page-heading">
            <div>
              <p className="overline">DASHBOARD</p>
              <h1>
                Data {isKategori
                  ? 'Kategori'
                  : isPengguna
                    ? 'Pengguna'
                    : 'Foto'}
              </h1>
              <p className="subtitle">
                {isFoto
                  ? 'Simpan dan kelola koleksi foto asli.'
                  : 'Tambahkan, lihat, ubah, dan hapus data.'}
              </p>
            </div>
            <div className="date-label">GALERI WINKY</div>
          </div>

          {pesan && (
            <div className="notice">
              <span>{pesan}</span>
              <button onClick={() => setPesan('')}>×</button>
            </div>
          )}

          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-icon">
                {isKategori ? '▦' : isPengguna ? '♙' : '▧'}
              </span>
              <p>
                Total {isKategori
                  ? 'Kategori'
                  : isPengguna
                    ? 'Pengguna'
                    : 'Foto'}
              </p>
              <strong>{daftar.length}</strong>
              <small>Data dari database MySQL</small>
            </div>

            <div className="stat-card">
              <span className="stat-icon">✓</span>
              <p>Operasi Data</p>
              <strong className="online-text">CRUD</strong>
              <small>GET · POST · PUT · DELETE</small>
            </div>
          </div>

          {/* FORM KATEGORI DAN PENGGUNA */}
          {!isFoto && (
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <h2>{editId ? 'Edit Data' : 'Tambah Data'}</h2>
                  <p>
                    {editId
                      ? 'Perbarui informasi data yang dipilih.'
                      : 'Isi formulir untuk menyimpan data baru.'}
                  </p>
                </div>
              </div>

              <form className="category-form" onSubmit={simpanData}>
                {isKategori ? (
                  <>
                    <label htmlFor="nama_kategori">Nama kategori</label>
                    <div className="form-row">
                      <input
                        id="nama_kategori"
                        name="nama_kategori"
                        value={form.nama_kategori}
                        onChange={ubahInput}
                        placeholder="Contoh: Elektronik"
                        required
                      />
                      <button className="primary-button" disabled={loading}>
                        {loading
                          ? 'Memproses...'
                          : editId
                            ? 'Simpan Perubahan'
                            : '+ Tambah Data'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="user-form-grid">
                    <div>
                      <label htmlFor="nama_pengguna">Nama pengguna</label>
                      <input
                        id="nama_pengguna"
                        name="nama_pengguna"
                        value={form.nama_pengguna}
                        onChange={ubahInput}
                        placeholder="Nama lengkap"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="email_pengguna">Email pengguna</label>
                      <input
                        id="email_pengguna"
                        name="email_pengguna"
                        type="email"
                        value={form.email_pengguna}
                        onChange={ubahInput}
                        placeholder="nama@example.com"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="password_email">
                        {editId ? 'Password baru (opsional)' : 'Password'}
                      </label>
                      <div className="password-field">
                        <input
                          id="password_email"
                          name="password_email"
                          type={showPassword ? 'text' : 'password'}
                          value={form.password_email}
                          onChange={ubahInput}
                          placeholder={editId
                            ? 'Kosongkan jika tidak diubah'
                            : 'Masukkan password'}
                          required={!editId}
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword
                            ? 'Sembunyikan password'
                            : 'Lihat password'}
                          title={showPassword
                            ? 'Sembunyikan password'
                            : 'Lihat password'}
                        >
                          {showPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="no_hp_pengguna">Nomor HP</label>
                      <input
                        id="no_hp_pengguna"
                        name="no_hp_pengguna"
                        value={form.no_hp_pengguna}
                        onChange={ubahInput}
                        placeholder="08xxxxxxxxxx"
                        required
                      />
                    </div>

                    <div className="user-form-actions">
                      <button className="primary-button" disabled={loading}>
                        {loading
                          ? 'Memproses...'
                          : editId
                            ? 'Simpan Perubahan'
                            : '+ Tambah Pengguna'}
                      </button>
                      {editId && (
                        <button
                          type="button"
                          className="cancel-button"
                          onClick={batalEdit}
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {isKategori && editId && (
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={batalEdit}
                  >
                    Batal Edit
                  </button>
                )}
              </form>
            </div>
          )}

          {/* FORM FOTO ASLI */}
          {isFoto && (
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <h2>{editId ? 'Edit Foto' : 'Unggah Foto Baru'}</h2>
                  <p>
                    Pilih gambar dari perangkat dan lengkapi informasi foto.
                  </p>
                </div>
              </div>

              <form className="photo-form" onSubmit={simpanFoto}>
                <div className="photo-upload-area">
                  <label htmlFor="file_foto" className="photo-file-label">
                    <span className="photo-upload-icon">＋</span>
                    <strong>Pilih Foto</strong>
                    <small>JPG, PNG, WEBP, atau GIF · Maksimal 5 MB</small>
                  </label>

                  <input
                    id="file_foto"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      const jenisDiizinkan = [
                        'image/jpeg',
                        'image/png',
                        'image/webp',
                        'image/gif'
                      ];

                      if (!jenisDiizinkan.includes(file.type)) {
                        setPesan('Pilih gambar JPG, PNG, WEBP, atau GIF.');
                        e.target.value = '';
                        return;
                      }

                      if (file.size > 5 * 1024 * 1024) {
                        setPesan('Ukuran foto maksimal 5 MB.');
                        e.target.value = '';
                        return;
                      }

                      setFileFoto(file);
                      setPesan('');
                    }}
                  />

                  {(previewFoto || formFotoData.file_foto) && (
                    <div className="photo-preview">
                      <img
                        src={previewFoto || alamatFoto(formFotoData.file_foto)}
                        alt="Pratinjau foto"
                      />
                      <span>
                        {fileFoto
                          ? fileFoto.name
                          : 'Foto yang tersimpan saat ini'}
                      </span>
                    </div>
                  )}

                  {editId && (
                    <p className="photo-help">
                      Jika tidak memilih foto baru, gambar lama tetap digunakan.
                    </p>
                  )}
                </div>

                <div className="photo-form-grid">
                  <div>
                    <label htmlFor="judul_foto">Judul foto</label>
                    <input
                      id="judul_foto"
                      name="judul_foto"
                      value={formFotoData.judul_foto}
                      onChange={ubahInputFoto}
                      placeholder="Contoh: Koleksi Elektronik"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="id_kategori">Kategori</label>
                    <select
                      id="id_kategori"
                      name="id_kategori"
                      value={formFotoData.id_kategori}
                      onChange={ubahInputFoto}
                      required
                    >
                      <option value="">Pilih kategori</option>
                      {kategori.map(item => (
                        <option
                          key={item.id_kategori}
                          value={item.id_kategori}
                        >
                          {item.nama_kategori}
                        </option>
                      ))}
                    </select>
                    {kategori.length === 0 && (
                      <small className="photo-help">
                        Tambahkan kategori terlebih dahulu di menu Kategori.
                      </small>
                    )}
                  </div>

                  <div>
                    <label htmlFor="id_pengguna">Pengguna</label>
                    <select
                      id="id_pengguna"
                      name="id_pengguna"
                      value={formFotoData.id_pengguna}
                      onChange={ubahInputFoto}
                      required
                    >
                      <option value="">Pilih pengguna</option>
                      {pengguna.map(item => (
                        <option
                          key={item.id_pengguna}
                          value={item.id_pengguna}
                        >
                          {item.nama_pengguna}
                        </option>
                      ))}
                    </select>
                    {pengguna.length === 0 && (
                      <small className="photo-help">
                        Tambahkan pengguna terlebih dahulu di menu Pengguna.
                      </small>
                    )}
                  </div>

                  <div className="photo-description">
                    <label htmlFor="deskripsi_foto">Deskripsi foto</label>
                    <textarea
                      id="deskripsi_foto"
                      name="deskripsi_foto"
                      value={formFotoData.deskripsi_foto}
                      onChange={ubahInputFoto}
                      placeholder="Tulis keterangan foto (opsional)"
                      rows={4}
                    />
                  </div>
                </div>

                <div className="photo-form-actions">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={loading}
                  >
                    {loading
                      ? 'Memproses...'
                      : editId
                        ? 'Simpan Perubahan'
                        : 'Unggah Foto'}
                  </button>

                  {editId && (
                    <button
                      type="button"
                      className="cancel-button"
                      onClick={batalEdit}
                    >
                      Batal Edit
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* TABEL KATEGORI DAN PENGGUNA */}
          {!isFoto && (
            <div className="panel">
              <div className="panel-heading table-heading">
                <div>
                  <h2>Daftar {isKategori ? 'Kategori' : 'Pengguna'}</h2>
                  <p>Data yang tersimpan di database.</p>
                </div>

                <div className="tombol-aksi">
                  <button
                    type="button"
                    className="refresh-button"
                    onClick={isKategori ? ambilKategori : ambilPengguna}
                    disabled={loading}
                  >
                    ↻ Muat Ulang
                  </button>

                  <button
                    type="button"
                    className="tombol-hapus-semua"
                    onClick={hapusSemuaData}
                    disabled={loading || daftar.length === 0}
                  >
                    {loading ? 'Memproses...' : 'Hapus Semua'}
                  </button>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    {isKategori ? (
                      <tr>
                        <th>ID</th>
                        <th>Nama Kategori</th>
                        <th>Aksi</th>
                      </tr>
                    ) : (
                      <tr>
                        <th>ID</th>
                        <th>Nama Pengguna</th>
                        <th>Email</th>
                        <th>Nomor HP</th>
                        <th>Aksi</th>
                      </tr>
                    )}
                  </thead>

                  <tbody>
                    {daftar.length ? (
                      daftar.map(item => (
                        <tr
                          key={isKategori
                            ? item.id_kategori
                            : item.id_pengguna}
                        >
                          <td>
                            #{isKategori
                              ? item.id_kategori
                              : item.id_pengguna}
                          </td>
                          <td>
                            <strong>
                              {isKategori
                                ? item.nama_kategori
                                : item.nama_pengguna}
                            </strong>
                          </td>

                          {!isKategori && (
                            <>
                              <td>{item.email_pengguna}</td>
                              <td>{item.no_hp_pengguna}</td>
                            </>
                          )}

                          <td>
                            <div className="actions">
                              <button
                                className="edit-button"
                                onClick={() => mulaiEdit(item)}
                              >
                                Edit
                              </button>
                              <button
                                className="delete-button"
                                onClick={() => hapusData(
                                  isKategori
                                    ? item.id_kategori
                                    : item.id_pengguna
                                )}
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={isKategori ? 3 : 5} className="empty">
                          Belum ada data. Silakan tambahkan data baru.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {!isKategori && (
                <p className="privacy-note">
                  Password tidak ditampilkan pada tabel pengguna.
                </p>
              )}
            </div>
          )}

          {/* GALERI FOTO */}
          {isFoto && (
            <div className="panel">
              <div className="panel-heading table-heading">
                <div>
                  <h2>Koleksi Foto</h2>
                  <p>Foto asli yang sudah tersimpan di server.</p>
                </div>

                <div className="tombol-aksi">
                  <button
                    type="button"
                    className="refresh-button"
                    onClick={ambilFoto}
                    disabled={loading}
                  >
                    ↻ Muat Ulang
                  </button>

                  <button
                    type="button"
                    className="tombol-hapus-semua"
                    onClick={hapusSemuaData}
                    disabled={loading || foto.length === 0}
                  >
                    Hapus Semua
                  </button>
                </div>
              </div>

              {foto.length > 0 ? (
                <div className="photo-gallery">
                  {foto.map(item => (
                    <article className="photo-card" key={item.id_foto}>
                      {item.file_foto ? (
                        <img
                          className="photo-card-image"
                          src={alamatFoto(item.file_foto)}
                          alt={item.judul_foto}
                          loading="lazy"
                        />
                      ) : (
                        <div className="photo-card-empty">
                          Foto belum tersedia
                        </div>
                      )}

                      <div className="photo-card-content">
                        <span className="photo-card-category">
                          {item.nama_kategori || 'Tanpa kategori'}
                        </span>

                        <h3>{item.judul_foto}</h3>

                        <p className="photo-card-description">
                          {item.deskripsi_foto || 'Tidak ada deskripsi.'}
                        </p>

                        <div className="photo-card-meta">
                          <span>
                            Pengguna: {item.nama_pengguna || 'Tidak diketahui'}
                          </span>
                          <span>
                            {formatTanggal(item.tanggal_unggah)}
                          </span>
                        </div>

                        <div className="actions photo-card-actions">
                          <button
                            className="edit-button"
                            onClick={() => mulaiEdit(item)}
                          >
                            Edit
                          </button>
                          <button
                            className="delete-button"
                            onClick={() => hapusData(item.id_foto)}
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="photo-empty-state">
                  <span>▧</span>
                  <h3>Belum ada foto</h3>
                  <p>Pilih foto dari perangkat melalui formulir di atas.</p>
                </div>
              )}
            </div>
          )}

          <footer className="page-footer">
            © 2026 Galeri Winky · Sistem Pengelolaan Data
          </footer>
        </section>
      </main>
    </div>
  );
}

export default App;
