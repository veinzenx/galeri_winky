import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getAuthHeaders, getStoredUser } from "../lib/api";

const emptyForm = {
  nama_pengguna: "",
  email_pengguna: "",
  no_hp_pengguna: "",
  password_email: "",
  role: "pengguna",
};

export default function Pengguna() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingUser, setEditingUser] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch("/pengguna", { headers: getAuthHeaders() })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Data pengguna tidak memiliki format yang sesuai.");
        if (active) setUsers(data);
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

  const loadUsers = useCallback(async () => {
    setError("");
    try {
      const data = await apiFetch("/pengguna", { headers: getAuthHeaders() });
      if (!Array.isArray(data)) throw new Error("Data pengguna tidak memiliki format yang sesuai.");
      setUsers(data);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  function openForm(user = null) {
    setError("");
    setNotice("");
    setEditingUser(user);
    setForm(user
      ? {
          nama_pengguna: user.nama_pengguna || "",
          email_pengguna: user.email_pengguna || "",
          no_hp_pengguna: user.no_hp_pengguna || "",
          password_email: "",
          role: user.role || "pengguna",
        }
      : { ...emptyForm });
    setFormOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    const body = { ...form };
    if (editingUser && !body.password_email) delete body.password_email;

    try {
      await apiFetch(editingUser ? `/pengguna/${editingUser.id_pengguna}` : "/pengguna", {
        method: editingUser ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      setFormOpen(false);
      setNotice(editingUser ? "Data pengguna berhasil diperbarui." : "Pengguna berhasil ditambahkan.");
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(user) {
    if (!window.confirm(`Hapus akun ${user.nama_pengguna}? Tindakan ini tidak dapat dibatalkan.`)) return;
    setError("");
    setNotice("");
    try {
      await apiFetch(`/pengguna/${user.id_pengguna}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      setNotice("Pengguna berhasil dihapus.");
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteAllUsers() {
    const confirmation = window.prompt(
      "Tindakan ini menghapus semua akun, termasuk akun admin yang sedang digunakan. Ketik HAPUS SEMUA untuk melanjutkan.",
    );
    if (confirmation !== "HAPUS SEMUA") return;

    setError("");
    try {
      await apiFetch("/pengguna", {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      localStorage.removeItem("token");
      localStorage.removeItem("pengguna");
      navigate("/login", {
        replace: true,
        state: { notice: "Semua akun telah dihapus. Sesi admin berakhir." },
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="users-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">DASHBOARD ADMIN</span>
          <h1>Kelola <span>pengguna</span></h1>
          <p>Tambah, ubah, dan atur peran akun Galeri Winky.</p>
        </div>
        {!loading && !error && (
          <div className="users-heading-actions">
            <span className="users-total">{users.length} pengguna</span>
            <button className="button button-dark button-small" onClick={() => openForm()}>
              + Tambah pengguna
            </button>
            <button
              className="button button-outline button-small danger-button"
              onClick={deleteAllUsers}
            >
              Hapus semua akun
            </button>
          </div>
        )}
      </div>

      {notice && <p className="inline-message success-message" role="status">{notice}</p>}
      {loading && (
        <div className="state-card" role="status">
          <span className="loader" />
          <p>Memuat daftar pengguna...</p>
        </div>
      )}
      {!loading && error && (
        <div className="state-card state-error" role="alert">
          <span className="state-icon">!</span>
          <h3>Daftar pengguna belum bisa dimuat</h3>
          <p>{error}</p>
          <p className="state-hint">Pastikan server aktif dan akunmu memiliki akses admin.</p>
        </div>
      )}
      {!loading && !error && users.length === 0 && (
        <div className="state-card">
          <h3>Belum ada pengguna</h3>
          <p>Daftar pengguna akan tampil di sini.</p>
        </div>
      )}
      {!loading && !error && users.length > 0 && (
        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Nomor telepon</th>
                <th>Peran</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id_pengguna}>
                  <td>{user.nama_pengguna}</td>
                  <td>{user.email_pengguna}</td>
                  <td>{user.no_hp_pengguna || "—"}</td>
                  <td><span className={`role-badge role-${user.role}`}>{user.role}</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="text-button" type="button" onClick={() => openForm(user)}>Ubah</button>
                      {Number(user.id_pengguna) !== Number(currentUser?.id_pengguna) && (
                        <button
                          className="text-button text-danger"
                          type="button"
                          onClick={() => deleteUser(user)}
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <div className="lightbox" role="presentation" onClick={() => !saving && setFormOpen(false)}>
          <div
            className="photo-form-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="lightbox-close form-close"
              type="button"
              onClick={() => setFormOpen(false)}
              aria-label="Tutup formulir"
              disabled={saving}
            >
              &times;
            </button>
            <span className="eyebrow">ADMINISTRASI AKUN</span>
            <h2 id="user-form-title">{editingUser ? "Ubah pengguna" : "Tambah pengguna"}</h2>
            <form className="login-form photo-form" onSubmit={handleSubmit}>
              <label htmlFor="user-name">Nama lengkap</label>
              <input
                id="user-name"
                value={form.nama_pengguna}
                onChange={(event) => setForm({ ...form, nama_pengguna: event.target.value })}
                required
              />
              <label htmlFor="user-email">Alamat email</label>
              <input
                id="user-email"
                type="email"
                value={form.email_pengguna}
                onChange={(event) => setForm({ ...form, email_pengguna: event.target.value })}
                required
              />
              <label htmlFor="user-phone">Nomor telepon</label>
              <input
                id="user-phone"
                type="tel"
                value={form.no_hp_pengguna}
                onChange={(event) => setForm({ ...form, no_hp_pengguna: event.target.value })}
                required
              />
              <label htmlFor="user-password">
                Kata sandi {editingUser ? "(kosongkan jika tidak diubah)" : ""}
              </label>
              <input
                id="user-password"
                type="password"
                autoComplete="new-password"
                minLength={editingUser ? undefined : 8}
                required={!editingUser}
                value={form.password_email}
                onChange={(event) => setForm({ ...form, password_email: event.target.value })}
              />
              <label htmlFor="user-role">Peran</label>
              <select
                id="user-role"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
                disabled={Number(editingUser?.id_pengguna) === Number(currentUser?.id_pengguna)}
              >
                <option value="pengguna">Pengguna</option>
                <option value="admin">Admin</option>
              </select>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button-dark login-submit" type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : editingUser ? "Simpan perubahan" : "Tambah pengguna"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
