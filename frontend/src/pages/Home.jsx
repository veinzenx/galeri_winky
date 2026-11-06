import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import PlanetGlobe from "../componnents/PlanetGlobe";

const jakartaTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export default function Home() {
  const [jakartaNow, setJakartaNow] = useState(() => new Date());

  useEffect(() => {
    const timerId = window.setInterval(() => setJakartaNow(new Date()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const jakartaTimeParts = jakartaTimeFormatter.formatToParts(jakartaNow);
  const jakartaHour = jakartaTimeParts.find(part => part.type === "hour").value;
  const jakartaMinute = jakartaTimeParts.find(part => part.type === "minute").value;
  const jakartaSecond = jakartaTimeParts.find(part => part.type === "second").value;

  return (
    <section className="hero-section">
      <div className="hero-copy">
        <span className="eyebrow"><span className="eyebrow-dot" /> GALERI CERITA KITA</span>
        <h1>Setiap foto punya <span>ceritanya.</span></h1>
        <p>
          Kumpulan momen berharga yang disimpan dengan sepenuh hati.
          Temukan cerita di balik setiap bingkai.
        </p>
        <Link className="button button-dark hero-button" to="/koleksi">
          Jelajahi galeri <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
      <div className="jakarta-clock" aria-label="Waktu saat ini di Jakarta">
        <time
          className="jakarta-clock-time"
          dateTime={jakartaNow.toISOString()}
          aria-label={`${jakartaHour}:${jakartaMinute}:${jakartaSecond} WIB`}
        >
          <span className="jakarta-clock-hour">{jakartaHour}</span>
          <span className="jakarta-clock-minute">{jakartaMinute}</span>
          <span className="jakarta-clock-second">{jakartaSecond}</span>
        </time>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="hero-orbit orbit-one"><span className="orbit-moon" /></div>
        <div className="hero-orbit orbit-two" />
        <div className="hero-sun">
          <PlanetGlobe />
          <span className="planet-highlight" />
        </div>
        <div className="meteor-system">
          {[0, 1, 2].map(index => (
            <div className={`meteor-orbit meteor-orbit-${index + 1}`} key={index}>
              <span className="orbiting-meteor" />
            </div>
          ))}
        </div>
        <div className="hero-note"><span className="note-heart">♡</span><span>momen sederhana,<br />kenangan selamanya</span></div>
        <span className="hero-spark spark-one">✳</span>
        <span className="hero-spark spark-two">✳</span>
      </div>
    </section>
  );
}
