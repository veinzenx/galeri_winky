import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./Layouts/Layouts";
import Home from "./pages/Home";
import KoleksiFoto from "./pages/KoleksiFoto";
import Login from "./pages/Login";
import Pengguna from "./pages/Pengguna";
import Register from "./pages/Register";
import Categories from "./pages/Categories";
import Profile from "./pages/Profile";
import Galeri from "./pages/Galeri";
import { getStoredUser } from "./lib/api";

function AdminRoute({ children }) {
  const pengguna = getStoredUser();
  const token = localStorage.getItem("token");

  if (!token || pengguna?.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AuthRoute({ children }) {
  if (!localStorage.getItem("token")) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/koleksi" element={<KoleksiFoto />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/ai-generation"
            element={
              <AuthRoute>
                <Galeri />
              </AuthRoute>
            }
          />
          <Route
            path="/profil"
            element={
              <AuthRoute>
                <Profile />
              </AuthRoute>
            }
          />
          <Route
            path="/pengguna"
            element={
              <AdminRoute>
                <Pengguna />
              </AdminRoute>
            }
          />
          <Route
            path="/kategori"
            element={
              <AdminRoute>
                <Categories />
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
