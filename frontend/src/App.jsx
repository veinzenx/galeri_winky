
function App() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f5f5f5",
      color: "#222",
      fontFamily: "Arial, sans-serif",
      padding: "30px"
    }}>
      <h1 style={{ color: "#2563eb" }}>
        Galeri Winky
      </h1>

      <p>Selamat datang di website galeri saya.</p>

      <button
        style={{
          backgroundColor: "#2563eb",
          color: "white",
          border: "none",
          padding: "10px 20px",
          borderRadius: "6px",
          cursor: "pointer"
        }}
        onClick={() => alert("Website berhasil berjalan!")}
      >
        Tes Website
      </button>
    </div>
  );
}

export default App;
