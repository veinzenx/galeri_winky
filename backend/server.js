
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend Galeri Winky berhasil berjalan!");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server aktif" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend berjalan di http://localhost:${PORT}`);
});
