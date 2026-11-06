import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const data = await apiFetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_pengguna: email,
          password_email: password,
        }),
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("pengguna", JSON.stringify(data.pengguna));
      const requestedPath = new URLSearchParams(location.search).get("next");
      const nextPath = requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
        ? requestedPath
        : null;
      navigate(
        nextPath || (data.pengguna?.role === "admin" ? "/pengguna" : "/"),
        { replace: true },
      );
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
        <span className="eyebrow">SENANG MELIHATMU KEMBALI</span>
        <h1>Masuk ke <span>galeri.</span></h1>
        <p className="login-intro">Masuk untuk mengelola akun dan koleksi Galeri Winky.</p>
        {new URLSearchParams(location.search).get("sessionExpired") === "1" && (
          <p className="form-error" role="alert">
            Sesi login tidak valid. Silakan masuk kembali untuk melanjutkan.
          </p>
        )}
        {location.state?.notice && <p className="success-message" role="status">{location.state.notice}</p>}
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Alamat email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="password">Kata sandi</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Masukkan kata sandi"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-dark login-submit" type="submit" disabled={submitting}>
            {submitting ? "Memeriksa..." : "Masuk"}
            {!submitting && <span aria-hidden="true">&rarr;</span>}
          </button>
        </form>
        <p className="register-prompt">
          Belum punya akun? <Link to="/register">Daftar di sini</Link>
        </p>
        <Link className="back-link" to="/">&larr; Kembali ke galeri</Link>
      </div>
      <div className="login-side-note" aria-hidden="true">
        <span>&ldquo;</span>
        <p>Kenangan indah<br />layak untuk dirayakan.</p>
        <i>— Galeri Winky</i>
      </div>
    </section>
  );
}