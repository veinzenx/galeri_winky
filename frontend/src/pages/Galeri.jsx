import { useEffect, useRef, useState } from "react";
import { apiFetch, getAuthHeaders } from "../lib/api";

const examplePrompts = [
  "Kebun lavender saat matahari terbenam, warna hangat dan suasana tenang",
  "Kedai kopi kecil di tengah hujan, cahaya jendela yang hangat",
  "Pemandangan pantai warna pastel dengan ilustrasi minimalis",
];

export default function Galeri() {
  const [configured, setConfigured] = useState(false);
  const [providerLoading, setProviderLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState("");
  const [pageError, setPageError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const requestRef = useRef(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    Promise.allSettled([
      apiFetch("/api/ai/providers", {
        headers: getAuthHeaders(),
        signal: controller.signal,
      }),
      apiFetch("/kategori", { signal: controller.signal }),
    ])
      .then(([providerResult, categoryResult]) => {
        if (!active) return;
        if (providerResult.status === "fulfilled") {
          const providers = providerResult.value.providers;
          if (providers?.cloudflare) {
            setConfigured(providers.cloudflare.configured);
          } else if (providers?.stability) {
            setPageError(
              "Backend masih memakai konfigurasi Stability AI. Restart backend dari folder backend agar integrasi Cloudflare aktif.",
            );
          } else {
            setPageError(
              "Respons backend tidak sesuai format. Pastikan backend terbaru berjalan di port 1910.",
            );
          }
        } else {
          const providerError = providerResult.reason;
          setPageError(
            providerError.name === "AbortError"
              ? "Backend tidak merespons. Pastikan server aktif di port 1910, lalu coba lagi."
              : providerError.message,
          );
        }

        if (categoryResult.status === "fulfilled" && Array.isArray(categoryResult.value)) {
          setCategories(categoryResult.value);
        } else {
          setCategoryError("Kategori tidak dapat dimuat. Gambar tetap bisa diunduh.");
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setProviderLoading(false);
      });

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
      requestRef.current?.abort();
    };
  }, []);

  function clearFeedback() {
    setError("");
    setNotice("");
  }

  async function runImage(event) {
    event.preventDefault();
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setImage(null);
    clearFeedback();

    try {
      const result = await apiFetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ provider: "cloudflare", prompt }),
        signal: controller.signal,
      });
      if (!result.image?.data || !result.image?.mimeType) {
        throw new Error("Cloudflare Workers AI tidak mengembalikan gambar.");
      }
      setImage({
        ...result.image,
        url: `data:${result.image.mimeType};base64,${result.image.data}`,
      });
    } catch (requestError) {
      if (requestError.name === "AbortError") setNotice("Permintaan dibatalkan.");
      else setError(requestError.message);
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      setBusy(false);
    }
  }

  async function saveImage() {
    if (!image || !categoryId) {
      setError("Pilih kategori untuk menyimpan gambar.");
      return;
    }
    setSaving(true);
    clearFeedback();
    try {
      const bytes = Uint8Array.from(atob(image.data), character => character.charCodeAt(0));
      const extension = image.mimeType === "image/jpeg" ? "jpg" : "png";
      const file = new File([bytes], `cloudflare-ai-${Date.now()}.${extension}`, {
        type: image.mimeType,
      });
      const formData = new FormData();
      formData.append("judul_foto", prompt.trim().slice(0, 100) || "Gambar AI");
      formData.append("deskripsi_foto", prompt.trim());
      formData.append("id_kategori", categoryId);
      formData.append("file_foto", file);
      await apiFetch("/foto", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });
      setNotice("Gambar berhasil disimpan ke galeri.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function closeImage() {
    setImage(null);
    setCategoryId("");
    setError("");
    setNotice("");
  }

  return (
    <section className="ai-page">
      <header className="ai-hero">
        <div className="ai-hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> KREASI DENGAN AI</span>
          <h1>Bayangkan. <span>Ciptakan.</span></h1>
          <p>Ubah ide dan imajinasimu menjadi gambar dengan Cloudflare Workers AI.</p>
        </div>
        <div className="ai-orbital-art" aria-hidden="true">
          <div className="ai-orbit ai-orbit-one" />
          <div className="ai-orbit ai-orbit-two" />
          <div className="ai-orb-glass"><span>✦</span></div>
        </div>
        <div className="ai-hero-foot"><span>RUANG KREASI GALERI WINKY</span><span>FLUX.1 SCHNELL</span></div>
      </header>

      <section className="ai-studio">
        <div className="ai-studio-heading">
          <div><span className="eyebrow">AI STUDIO</span><h2>Mulai dari <span>sebuah ide.</span></h2></div>
          <span className="ai-private-note">Token API tetap aman di backend</span>
        </div>

        <div className="ai-workspace ai-workspace-single">
          <aside className="ai-sidebar">
            <span className="ai-sidebar-label">PROVIDER AKTIF</span>
            <div className="provider-status">
              <span className={`provider-dot${configured ? " is-ready" : ""}`} />
              <span>Cloudflare Workers AI</span>
              <small>{providerLoading ? "Memeriksa..." : configured ? "Token terpasang" : "Belum diatur"}</small>
            </div>
            <p className="ai-provider-description">Model gambar FLUX.1 Schnell. Tersedia kuota harian gratis; pemakaian di atas kuota dapat memerlukan paket berbayar.</p>
          </aside>

          <section className="ai-panel" aria-live="polite">
            <div className="ai-panel-heading">
              <div>
                <span className="eyebrow">IMAGE GENERATOR</span>
                <h3>Buat gambar</h3>
              </div>
              <span className="ai-selected-provider">Cloudflare · FLUX.1</span>
            </div>

            {pageError && (
              <div className="ai-alert" role="alert">
                <span>{pageError}</span>
                <button className="ai-retry-button" type="button" onClick={() => window.location.reload()}>Coba lagi</button>
              </div>
            )}
            {providerLoading && !pageError && (
              <div className="ai-setup-note" role="status">
                <strong>Memeriksa konfigurasi Cloudflare Workers AI...</strong>
                <p>Memeriksa kredensial di backend.</p>
              </div>
            )}
            {!providerLoading && !pageError && !configured && (
              <div className="ai-setup-note">
                <strong>Cloudflare Workers AI belum dikonfigurasi</strong>
                <p>
                  Isi <code>CLOUDFLARE_ACCOUNT_ID</code> dan <code>CLOUDFLARE_API_TOKEN</code> di <code>backend/.env</code>,
                  lalu restart backend. Buat token Workers AI dengan izin Read dan Edit di{" "}
                  <a href="https://dash.cloudflare.com/?to=/:account/ai/workers-ai" target="_blank" rel="noreferrer">dashboard Cloudflare</a>.
                </p>
              </div>
            )}

            <form className="ai-form" onSubmit={runImage}>
              <label htmlFor="ai-prompt-input">Ceritakan gambar yang ingin dibuat</label>
              <textarea
                id="ai-prompt-input"
                rows="4"
                maxLength={2048}
                value={prompt}
                onChange={event => setPrompt(event.target.value)}
                placeholder="Contoh: Kebun bunga saat matahari terbenam, warna hangat dan suasana tenang..."
                required
              />
              <div className="ai-field-meta">
                <span>Jelaskan subjek, suasana, warna, atau gaya.</span>
                <span>{prompt.length}/2048</span>
              </div>
              <div className="ai-prompt-chips">
                {examplePrompts.map(idea => (
                  <button type="button" className="ai-prompt-chip" key={idea} onClick={() => setPrompt(idea)}>
                    {idea}
                  </button>
                ))}
              </div>
              <button className="button button-dark ai-submit" type="submit" disabled={busy || !configured || !prompt.trim()}>
                {busy ? <><span className="ai-button-spinner" /> Memproses...</> : "Buat gambar"}
              </button>
            </form>

            {busy && (
              <div className="ai-generating-state" role="status">
                <span>Cloudflare Workers AI sedang membuat gambarmu</span>
                <button className="ai-cancel-button" type="button" onClick={() => requestRef.current?.abort()}>Batalkan</button>
              </div>
            )}
            {error && <p className="form-error" role="alert">{error}</p>}
            {notice && <p className="success-message" role="status">{notice}</p>}

            {image && (
              <div className="ai-result">
                <div className="ai-result-heading">
                  <h4>Gambar siap disimpan</h4>
                  <button
                    className="ai-result-close"
                    type="button"
                    onClick={closeImage}
                    aria-label="Tutup hasil gambar"
                    title="Tutup hasil gambar"
                  >
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <img className="ai-generated-image" src={image.url} alt="Gambar hasil Cloudflare Workers AI" />
                {categoryError && <p className="ai-result-copy" role="status">{categoryError}</p>}
                <div className="ai-result-actions">
                  <select aria-label="Kategori foto" value={categoryId} onChange={event => setCategoryId(event.target.value)}>
                    <option value="">Pilih kategori</option>
                    {categories.map(item => (
                      <option key={item.id_kategori} value={item.id_kategori}>{item.nama_kategori}</option>
                    ))}
                  </select>
                  <button className="button button-dark" type="button" onClick={saveImage} disabled={saving || !categoryId}>
                    {saving ? "Menyimpan..." : "Simpan ke galeri"}
                  </button>
                  <a className="button button-outline" href={image.url} download="galeri-winky-flux.jpg">Unduh</a>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </section>
  );
}
