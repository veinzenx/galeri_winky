import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Link className="brand footer-brand" to="/">
          <span className="brand-mark" aria-hidden="true">W</span>
          <span>galeri<span className="brand-accent">winky</span></span>
        </Link>
        <p>Ruang kecil untuk menyimpan cerita besar.</p>
        <span className="copyright">&copy; {new Date().getFullYear()} Galeri Winky</span>
      </div>
    </footer>
  );
}