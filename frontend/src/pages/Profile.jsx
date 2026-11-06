import { useEffect, useState } from "react";
import { apiFetch, getAuthHeaders, getStoredUser } from "../lib/api";

export default function Profile() {
  const [profile, setProfile] = useState(getStoredUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    apiFetch("/api/profile", { headers: getAuthHeaders() })
      .then((data) => {
        if (!data.pengguna) throw new Error("Data profil tidak tersedia.");
        if (active) {
          setProfile(data.pengguna);
          localStorage.setItem("pengguna", JSON.stringify(data.pengguna));
        }
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

  return (
    <section className="users-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">AKUN GALERI WINKY</span>
          <h1>Profil <span>saya</span></h1>
          <p>Informasi akun yang sedang digunakan.</p>
        </div>
      </div>
      {loading && (
        <div className="state-card" role="status">
          <span className="loader" />
          <p>Memuat profil...</p>
        </div>
      )}
      {!loading && error && (
        <div className="state-card state-error" role="alert">
          <span className="state-icon">!</span>
          <h3>Profil belum bisa dimuat</h3>
          <p>{error}</p>
        </div>
      )}
      {!loading && !error && profile && (
        <div className="profile-card">
          <div className="profile-avatar" aria-hidden="true">
            {(profile.nama_pengguna || "W").trim().charAt(0).toUpperCase()}
          </div>
          <dl className="profile-details">
            <div><dt>Nama</dt><dd>{profile.nama_pengguna}</dd></div>
            <div><dt>Email</dt><dd>{profile.email_pengguna}</dd></div>
            <div><dt>Peran</dt><dd><span className={`role-badge role-${profile.role}`}>{profile.role}</span></dd></div>
          </dl>
        </div>
      )}
    </section>
  );
}
