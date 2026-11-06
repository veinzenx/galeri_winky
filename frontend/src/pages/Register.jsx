import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nama_pengguna: "",
    email_pengguna: "",
    no_hp_pengguna: "",
    password_email: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await apiFetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      navigate("/login", { state: { notice: "Pendaftaran berhasil. Silakan masuk." } });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="login-section">
      <div className="login-card">
        <div className="login-emblem" aria-hidden="true">W</div>
        <span className="eyebrow">MULAI SIMPAN CERITAMU</span>
        <h1>Buat <span>akun.</span></h1>
        <p className="login-intro">Daftar untuk berbagi dan mengelola foto milikmu.</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="register-name">Nama lengkap</label>
          <input
            id="register-name"
            name="nama_pengguna"
            autoComplete="name"
            value={form.nama_pengguna}
            onChange={updateField}
            required
          />
          <label htmlFor="register-email">Alamat email</label>
          <input
            id="register-email"
            name="email_pengguna"
            type="email"
            autoComplete="email"
            value={form.email_pengguna}
            onChange={updateField}
            required
          />
          <label htmlFor="register-phone">Nomor telepon</label>
          <input
            id="register-phone"
            name="no_hp_pengguna"
            type="tel"
            autoComplete="tel"
            value={form.no_hp_pengguna}
            onChange={updateField}
            required
          />
          <label htmlFor="register-password">Kata sandi (minimal 8 karakter)</label>
          <input
            id="register-password"
            name="password_email"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={form.password_email}
            onChange={updateField}
            required
          />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-dark login-submit" type="submit" disabled={submitting}>
            {submitting ? "Mendaftarkan..." : "Buat akun"}
            {!submitting && <span aria-hidden="true">&rarr;</span>}
          </button>
        </form>
        <p className="register-prompt">
          Sudah punya akun? <Link to="/login">Masuk di sini</Link>
        </p>
        <Link className="back-link" to="/">&larr; Kembali ke galeri</Link>
      </div>
    </section>
  );
}
