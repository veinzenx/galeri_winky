import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, getAuthHeaders, getPhotoUrl, getStoredUser } from "../lib/api";

export default function KoleksiFoto() {
  const pengguna = getStoredUser();
  const token = localStorage.getItem("token");
  const [photos, setPhotos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [activePhoto, setActivePhoto] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [photoFormOpen, setPhotoFormOpen] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoNotice, setPhotoNotice] = useState("");
  const [photoForm, setPhotoForm] = useState({
    judul_foto: "",
    deskripsi_foto: "",
    id_kategori: "",
    id_pengguna: "",
    file_foto: null,
  });

  const loadPhotos = useCallback(async () => {
    setError("");
    try {
      if (!token) {
        const data = await apiFetch("/foto/guest");
        if (!Array.isArray(data)) throw new Error("Data galeri tidak memiliki format yang sesuai.");
        setPhotos(data);
        return;
      }

      const [ownedPhotos, publicPhotos] = await Promise.all([
        apiFetch("/foto", { headers: getAuthHeaders() }),
        apiFetch("/foto/guest"),
      ]);
      if (!Array.isArray(ownedPhotos) || !Array.isArray(publicPhotos)) {
        throw new Error("Data galeri tidak memiliki format yang sesuai.");
      }
      const ownedById = new Map(ownedPhotos.map((photo) => [Number(photo.id_foto), photo]));
      setPhotos(publicPhotos.map((photo) => ({
        ...photo,
        ...ownedById.get(Number(photo.id_foto)),
      })));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    const photoRequest = token
      ? Promise.all([
          apiFetch("/foto", { headers: getAuthHeaders() }),
          apiFetch("/foto/guest"),
        ]).then(([ownedPhotos, publicPhotos]) => {
          if (!Array.isArray(ownedPhotos) || !Array.isArray(publicPhotos)) {
            throw new Error("Data galeri tidak memiliki format yang sesuai.");
          }
          const ownedById = new Map(ownedPhotos.map((photo) => [Number(photo.id_foto), photo]));
          return publicPhotos.map((photo) => ({
            ...photo,
            ...ownedById.get(Number(photo.id_foto)),
          }));
        })
      : apiFetch("/foto/guest");

    photoRequest
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Data galeri tidak memiliki format yang sesuai.");
        if (active) setPhotos(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    apiFetch("/kategori")
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Data kategori tidak memiliki format yang sesuai.");
        if (active) setCategories(data);
      })
      .catch((requestError) => {
        if (active) setPhotoError(requestError.message);
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (pengguna?.role !== "admin" || !token) return undefined;
    let active = true;

    apiFetch("/pengguna", { headers: getAuthHeaders() })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Data pengguna tidak memiliki format yang sesuai.");
        if (active) setUsers(data);
      })
      .catch((requestError) => {
        if (active) setPhotoError(requestError.message);
      });

    return () => {
      active = false;
    };
  }, [pengguna?.role, token]);

  useEffect(() => {
    if (!activePhoto && !editingPhoto) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setActivePhoto(null);
        setEditingPhoto(null);
        setPhotoFormOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activePhoto, editingPhoto]);

  function openPhotoForm(photo = null) {
    setPhotoError("");
    setPhotoNotice("");
    setEditingPhoto(photo);
    setPhotoFormOpen(true);
    setPhotoForm({
      judul_foto: photo?.judul_foto || "",
      deskripsi_foto: photo?.deskripsi_foto || "",
      id_kategori: photo?.id_kategori || "",
      id_pengguna: photo?.id_pengguna || pengguna?.id_pengguna || "",
      file_foto: null,
    });
  }

  async function handlePhotoSubmit(event) {
    event.preventDefault();
    setPhotoError("");
    setPhotoNotice("");
    if (!editingPhoto && !photoForm.file_foto) {
      setPhotoError("Pilih file foto yang akan diunggah.");
      return;
    }

    const formData = new FormData();
    formData.append("judul_foto", photoForm.judul_foto);
    formData.append("deskripsi_foto", photoForm.deskripsi_foto);
    formData.append("id_kategori", photoForm.id_kategori);
    if (pengguna?.role === "admin") formData.append("id_pengguna", photoForm.id_pengguna);
    if (photoForm.file_foto) formData.append("file_foto", photoForm.file_foto);

    setSavingPhoto(true);
    try {
      await apiFetch(editingPhoto ? `/foto/${editingPhoto.id_foto}` : "/foto", {
        method: editingPhoto ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: formData,
      });
      setEditingPhoto(null);
      setPhotoFormOpen(false);
      setPhotoForm({
        judul_foto: "",
        deskripsi_foto: "",
        id_kategori: "",
        id_pengguna: "",
        file_foto: null,
      });
      setPhotoNotice(editingPhoto ? "Foto berhasil diperbarui." : "Foto berhasil diunggah.");
      await loadPhotos();
    } catch (requestError) {
      setPhotoError(requestError.message);
    } finally {
      setSavingPhoto(false);
    }
  }

  async function deletePhoto(photo) {
    if (!window.confirm(`Hapus foto "${photo.judul_foto || "Tanpa judul"}"?`)) return;
    setPhotoError("");
    setPhotoNotice("");
    try {
      await apiFetch(`/foto/${photo.id_foto}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (activePhoto?.id_foto === photo.id_foto) setActivePhoto(null);
      setPhotoNotice("Foto berhasil dihapus.");
      await loadPhotos();
    } catch (requestError) {
      setPhotoError(requestError.message);
    }
  }

  async function deleteAllPhotos() {
    if (!window.confirm("Hapus semua foto beserta file gambarnya? Tindakan ini tidak dapat dibatalkan.")) return;
    setPhotoError("");
    setPhotoNotice("");
    try {
      await apiFetch("/foto", { method: "DELETE", headers: getAuthHeaders() });
      setPhotoNotice("Semua foto berhasil dihapus.");
      await loadPhotos();
    } catch (requestError) {
      setPhotoError(requestError.message);
    }
  }

  const categoryFilters = useMemo(
    () => ["Semua", ...new Set([
      ...categories.map((item) => item.nama_kategori),
      ...photos.map((photo) => photo.nama_kategori),
    ].filter(Boolean))],
    [categories, photos],
  );
  const visiblePhotos = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id");
    return photos.filter((photo) => {
      const matchesCategory = category === "Semua" || photo.nama_kategori === category;
      const matchesQuery = [photo.judul_foto, photo.deskripsi_foto, photo.nama_kategori]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase("id").includes(normalizedQuery));
      return matchesCategory && matchesQuery;
    });
  }, [category, photos, query]);
  return (
    <>
      <section className="gallery-section" id="koleksi">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{pengguna ? "KOLEKSI GALERI WINKY" : "JELAJAHI KENANGAN"}</span>
            <h2>Koleksi <span>foto</span></h2>
            <p>
              {pengguna
                ? pengguna.role === "admin"
                  ? "Kelola semua foto yang dibagikan di Galeri Winky."
                  : "Kelola foto milikmu dan temukan cerita komunitas."
                : "Momen-momen yang ingin kita simpan lebih lama."}
            </p>
          </div>
          <div className="gallery-tools">
            {pengguna && (
              <button className="button button-dark button-small" onClick={() => openPhotoForm()}>
                Tambah foto
              </button>
            )}
            {pengguna?.role === "admin" && photos.length > 0 && (
              <button className="button button-outline button-small danger-button" onClick={deleteAllPhotos}>
                Hapus semua foto
              </button>
            )}
            <label className="search-field">
              <span className="search-icon" aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Cari di galeri..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Cari foto"
              />
            </label>
          </div>
        </div>

        {photoError && !editingPhoto && <p className="inline-message form-error" role="alert">{photoError}</p>}
        {photoNotice && <p className="inline-message success-message" role="status">{photoNotice}</p>}
        {!loading && !error && categoryFilters.length > 1 && (
          <div className="category-list" aria-label="Filter kategori">
            {categoryFilters.map((item) => (
              <button
                className={`category-chip${category === item ? " is-selected" : ""}`}
                key={item}
                onClick={() => setCategory(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="state-card" role="status">
            <span className="loader" />
            <p>Sedang menyiapkan galeri...</p>
          </div>
        )}
        {!loading && error && (
          <div className="state-card state-error" role="alert">
            <span className="state-icon">!</span>
            <h3>Galeri belum bisa dimuat</h3>
            <p>{error}</p>
            <p className="state-hint">Pastikan server Galeri Winky aktif, lalu muat ulang halaman.</p>
          </div>
        )}
        {!loading && !error && visiblePhotos.length === 0 && (
          <div className="state-card">
            <span className="state-icon">♡</span>
            <h3>{photos.length ? "Foto tidak ditemukan" : "Galeri masih kosong"}</h3>
            <p>
              {photos.length
                ? "Coba kata kunci atau kategori yang berbeda."
                : "Belum ada foto yang dibagikan. Kembali lagi nanti, ya."}
            </p>
          </div>
        )}
        {!loading && !error && visiblePhotos.length > 0 && (
          <>
            <div className="photo-grid">
              {visiblePhotos.map((photo, index) => (
                <article className={`photo-card photo-card-${index % 3}`} key={photo.id_foto}>
                  <button
                    className="photo-button"
                    onClick={() => setActivePhoto(photo)}
                    type="button"
                    aria-label={`Lihat foto ${photo.judul_foto}`}
                  >
                    {photo.file_foto ? (
                      <img
                        src={getPhotoUrl(photo.file_foto)}
                        alt={photo.judul_foto || "Foto galeri"}
                        loading="lazy"
                      />
                    ) : (
                      <span className="photo-placeholder" aria-hidden="true">♡</span>
                    )}
                    <span className="photo-overlay">
                      <span className="photo-open" aria-hidden="true">↗</span>
                    </span>
                  </button>
                  <div className="photo-caption">
                    <div>
                      <h3>{photo.judul_foto || "Tanpa judul"}</h3>
                      <span className="photo-category">
                        {photo.nama_kategori || "Tanpa kategori"}
                        {pengguna?.role === "admin" && photo.nama_pengguna
                          ? ` · ${photo.nama_pengguna}`
                          : ""}
                      </span>
                      {photo.deskripsi_foto && (
                        <p className="photo-description">{photo.deskripsi_foto}</p>
                      )}
                    </div>
                    {pengguna && (
                      <div className="photo-actions">
                        {(pengguna.role === "admin" ||
                          Number(photo.id_pengguna) === Number(pengguna.id_pengguna)) && (
                          <>
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => openPhotoForm(photo)}
                              aria-label={`Ubah ${photo.judul_foto}`}
                            >
                              Ubah
                            </button>
                            <button
                              className="text-button text-danger"
                              type="button"
                              onClick={() => deletePhoto(photo)}
                              aria-label={`Hapus ${photo.judul_foto}`}
                            >
                              Hapus
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {!pengguna && <span className="caption-heart" aria-hidden="true">♡</span>}
                  </div>
                </article>
              ))}
            </div>
            <p className="gallery-count">
              Menampilkan {visiblePhotos.length} {visiblePhotos.length === 1 ? "foto" : "foto"} dari koleksi
            </p>
          </>
        )}
      </section>

      {activePhoto && (
        <div className="lightbox" role="presentation" onClick={() => setActivePhoto(null)}>
          <div
            className="lightbox-content"
            role="dialog"
            aria-modal="true"
            aria-label={activePhoto.judul_foto || "Detail foto"}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="lightbox-close"
              type="button"
              onClick={() => setActivePhoto(null)}
              aria-label="Tutup foto"
            >
              &times;
            </button>
            {activePhoto.file_foto && (
              <img src={getPhotoUrl(activePhoto.file_foto)} alt={activePhoto.judul_foto || "Foto galeri"} />
            )}
            <div className="lightbox-caption">
              <span className="eyebrow">{activePhoto.nama_kategori || "Cerita"}</span>
              <h2>{activePhoto.judul_foto || "Tanpa judul"}</h2>
              {activePhoto.deskripsi_foto && <p>{activePhoto.deskripsi_foto}</p>}
              {pengguna && (pengguna.role === "admin" ||
                Number(activePhoto.id_pengguna) === Number(pengguna.id_pengguna)) && (
                <div className="lightbox-actions">
                  <button className="button button-outline button-small" onClick={() => {
                    setActivePhoto(null);
                    openPhotoForm(activePhoto);
                  }}>
                    Ubah foto
                  </button>
                  <button className="button button-outline button-small danger-button" onClick={() => deletePhoto(activePhoto)}>
                    Hapus foto
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {photoFormOpen && (
        <div className="lightbox" role="presentation" onClick={() => {
          if (!savingPhoto) setPhotoFormOpen(false);
        }}>
          <div
            className="photo-form-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="lightbox-close form-close"
              type="button"
              onClick={() => setPhotoFormOpen(false)}
              aria-label="Tutup formulir"
              disabled={savingPhoto}
            >
              &times;
            </button>
            <span className="eyebrow">{editingPhoto ? "PERBARUI KOLEKSI" : "TAMBAHKAN CERITA BARU"}</span>
            <h2 id="photo-form-title">{editingPhoto ? "Ubah foto" : "Unggah foto"}</h2>
            <form className="login-form photo-form" onSubmit={handlePhotoSubmit}>
              <label htmlFor="photo-title">Judul foto</label>
              <input
                id="photo-title"
                value={photoForm.judul_foto}
                onChange={(event) => setPhotoForm({ ...photoForm, judul_foto: event.target.value })}
                required
              />
              <label htmlFor="photo-description">Deskripsi</label>
              <textarea
                id="photo-description"
                rows="3"
                value={photoForm.deskripsi_foto}
                onChange={(event) => setPhotoForm({ ...photoForm, deskripsi_foto: event.target.value })}
              />
              <label htmlFor="photo-category">Kategori</label>
              <select
                id="photo-category"
                value={photoForm.id_kategori}
                onChange={(event) => setPhotoForm({ ...photoForm, id_kategori: event.target.value })}
                required
              >
                <option value="">Pilih kategori</option>
                {categories.map((item) => (
                  <option value={item.id_kategori} key={item.id_kategori}>{item.nama_kategori}</option>
                ))}
              </select>
              {pengguna?.role === "admin" && (
                <>
                  <label htmlFor="photo-owner">Pemilik foto</label>
                  <select
                    id="photo-owner"
                    value={photoForm.id_pengguna}
                    onChange={(event) => setPhotoForm({ ...photoForm, id_pengguna: event.target.value })}
                    required
                  >
                    {users.map((user) => (
                      <option value={user.id_pengguna} key={user.id_pengguna}>
                        {user.nama_pengguna} ({user.role})
                      </option>
                    ))}
                  </select>
                </>
              )}
              <label htmlFor="photo-file">
                {editingPhoto ? "Ganti file foto (opsional)" : "File foto"}
              </label>
              <input
                id="photo-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                required={!editingPhoto}
                onChange={(event) => setPhotoForm({ ...photoForm, file_foto: event.target.files?.[0] || null })}
              />
              <span className="field-hint">JPG, PNG, WEBP, atau GIF. Maksimal 5 MB.</span>
              {photoError && <p className="form-error" role="alert">{photoError}</p>}
              {categories.length === 0 && (
                <p className="form-error" role="alert">Buat kategori terlebih dahulu sebelum mengunggah foto.</p>
              )}
              <button className="button button-dark login-submit" type="submit" disabled={savingPhoto || categories.length === 0}>
                {savingPhoto ? "Menyimpan..." : editingPhoto ? "Simpan perubahan" : "Unggah foto"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}