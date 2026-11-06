import { Link, NavLink, useNavigate } from "react-router-dom";
import { getStoredUser } from "../lib/api";

const moodLabels = {
  lavender: "Lavender",
  ocean: "Laut",
  rose: "Mawar",
  aurora: "Aurora",
};

export default function Header({
  mood,
  onCycleMood,
  navVisible,
  onNavFocus,
  onNavPointerLeave,
}) {
  const navigate = useNavigate();
  const pengguna = getStoredUser();

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("pengguna");
    navigate("/");
  }

  return (
    <>
      <div
        className="nav-reveal-zone"
        onPointerEnter={onNavFocus}
        onClick={onNavFocus}
        aria-hidden="true"
      />
      <header
        className={`site-header${navVisible ? "" : " is-hidden"}`}
        onFocusCapture={onNavFocus}
        onPointerEnter={onNavFocus}
        onPointerLeave={event => {
          if (!event.currentTarget.contains(document.activeElement)) {
            onNavPointerLeave();
          }
        }}
      >
        <nav className="nav-shell" aria-label="Navigasi utama">
          <Link className="brand" to="/" aria-label="Galeri Winky, beranda">
            <span className="brand-mark" aria-hidden="true">W</span>
            <span>galeri<span className="brand-accent">winky</span></span>
          </Link>
          <div className="nav-links">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
            >
              Beranda
            </NavLink>
            <NavLink
              to="/koleksi"
              className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
            >
              Koleksi Foto
            </NavLink>
            <NavLink
              to="/ai-generation"
              className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
            >
              AI Generation
            </NavLink>
            <button
              className="mood-toggle"
              type="button"
              onClick={onCycleMood}
              aria-label={`Ganti suasana latar. Suasana saat ini ${moodLabels[mood]}.`}
              title={`Suasana ${moodLabels[mood]} — klik untuk mengganti`}
            >
              <span className="mood-toggle-icon" aria-hidden="true">✦</span>
              <span className="mood-toggle-label">{moodLabels[mood]}</span>
            </button>
            {pengguna?.role === "admin" && (
              <>
                <NavLink
                  to="/kategori"
                  className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
                >
                  Kategori
                </NavLink>
                <NavLink
                  to="/pengguna"
                  className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
                >
                  Pengguna
                </NavLink>
              </>
            )}
            {pengguna ? (
              <div className="account-actions">
                <Link className="account-name" to="/profil">{pengguna.nama_pengguna}</Link>
                <button className="button button-outline button-small" onClick={handleLogout}>
                  Keluar
                </button>
              </div>
            ) : (
              <Link className="button button-dark button-small" to="/login">
                Masuk
              </Link>
            )}
          </div>
        </nav>
      </header>
      <div className={`nav-reveal-detail${navVisible ? "" : " is-visible"}`} aria-hidden="true">
        <span className="nav-reveal-line" />
        <span className="nav-reveal-mark">✦</span>
        <span className="nav-reveal-label">GALERI WINKY</span>
        <span className="nav-reveal-line" />
      </div>
    </>
  );
}
