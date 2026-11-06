export const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:1910").replace(/\/+$/, "");

export async function apiFetch(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch (error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") throw error;
    throw new Error(
      `Tidak dapat terhubung ke backend di ${API_URL}. Pastikan backend aktif.`,
      { cause: error },
    );
  }
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (
      response.status === 403 &&
      typeof data?.message === "string" &&
      (data.message.includes("Token tidak valid") || data.message.includes("kedaluwarsa") || data.message.includes("masa berlaku"))
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("pengguna");
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.assign(
        `/login?sessionExpired=1&next=${encodeURIComponent(next)}`,
      );
      throw new Error("Sesi login tidak valid. Silakan masuk kembali.");
    }

    throw new Error(
      data?.message || data?.error || data || "Permintaan gagal. Coba lagi.",
    );
  }

  return data;
}

export function getStoredUser() {
  const value = localStorage.getItem("pengguna");
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch (error) {
    console.error("Data pengguna tersimpan tidak dapat dibaca.", error);
    return null;
  }
}

export function getPhotoUrl(file) {
  if (!file) return "";
  if (/^https?:\/\//i.test(file)) return file;

  const filename = file.split(/[\\/]/).pop();
  return `${API_URL}/uploads/${encodeURIComponent(filename)}`;
}

export function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
