import { useEffect, useState } from "react";
import { apiFetch, getAuthHeaders } from "../lib/api";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch("/kategori")
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Data kategori tidak memiliki format yang sesuai.");
        if (active) setCategories(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      await apiFetch(editingId ? `/kategori/${editingId}` : "/kategori", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ nama_kategori: name }),
      });
      setName("");
      setEditingId(null);
      setNotice(editingId ? "Kategori berhasil diperbarui." : "Kategori berhasil ditambahkan.");
      const data = await apiFetch("/kategori");
      if (!Array.isArray(data)) throw new Error("Data kategori tidak memiliki format yang sesuai.");
      setCategories(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function startEditing(category) {
    setEditingId(category.id_kategori);
    setName(category.nama_kategori);
    setError("");
    setNotice("");
  }

  async function deleteCategory(category) {
    if (!window.confirm(`Hapus kategori "${category.nama_kategori}"?`)) return;
    setError("");
    setNotice("");
    try {
      await apiFetch(`/kategori/${category.id_kategori}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      setNotice("Kategori berhasil dihapus.");
      const data = await apiFetch("/kategori");
      if (!Array.isArray(data)) throw new Error("Data kategori tidak memiliki format yang sesuai.");
      setCategories(data);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteAllCategories() {
    if (!window.confirm("Hapus semua kategori? Tindakan ini tidak dapat dibatalkan.")) return;
    setError("");
    setNotice("");
    try {
      await apiFetch("/kategori", { method: "DELETE", headers: getAuthHeaders() });
      setNotice("Semua kategori berhasil dihapus.");
      const data = await apiFetch("/kategori");
      if (!Array.isArray(data)) throw new Error("Data kategori tidak memiliki format yang sesuai.");
      setCategories(data);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="users-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">DASHBOARD ADMIN</span>
          <h1>Kelola <span>kategori</span></h1>
          <p>Atur kategori yang digunakan untuk mengelompokkan foto.</p>
        </div>
        {categories.length > 0 && (
          <button className="button button-outline button-small danger-button" onClick={deleteAllCategories}>
            Hapus semua
          </button>
        )}
      </div>

      <form className="category-form" onSubmit={handleSubmit}>
        <label htmlFor="category-name">{editingId ? "Ubah nama kategori" : "Nama kategori baru"}</label>
        <div className="category-form-row">
          <input
            id="category-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Contoh: Perjalanan"
            required
          />
          <button className="button button-dark" type="submit" disabled={saving}>
            {saving ? "Menyimpan..." : editingId ? "Simpan perubahan" : "Tambah kategori"}
          </button>
          {editingId && (
            <button
              className="button button-outline"
              type="button"
              onClick={() => { setEditingId(null); setName(""); }}
            >
              Batal
            </button>
          )}
        </div>
      </form>

      {error && <p className="inline-message form-error" role="alert">{error}</p>}
      {notice && <p className="inline-message success-message" role="status">{notice}</p>}
      {loading && (
        <div className="state-card" role="status"><span className="loader" /><p>Memuat kategori...</p></div>
      )}
      {!loading && !error && categories.length === 0 && (
        <div className="state-card"><h3>Belum ada kategori</h3><p>Tambahkan kategori untuk mengelompokkan foto.</p></div>
      )}
      {!loading && categories.length > 0 && (
        <div className="table-wrap">
          <table className="users-table">
            <thead><tr><th>Nama kategori</th><th>Aksi</th></tr></thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id_kategori}>
                  <td>{category.nama_kategori}</td>
                  <td>
                    <div className="row-actions">
                      <button className="text-button" type="button" onClick={() => startEditing(category)}>Ubah</button>
                      <button className="text-button text-danger" type="button" onClick={() => deleteCategory(category)}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
