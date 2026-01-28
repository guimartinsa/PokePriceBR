// router/index.tsx
import { Routes, Route } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";

import HomePage from "../pages/Home/HomePage";
//import CardsPage from "../pages/CardsPage";
import CardListPage from "../pages/Cards/CardListPage";
import { CameraView } from "../components/camera/camera";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/cards" element={<CardListPage />} />
        <Route path="/scan" element={<CameraView />} />

      </Route>
    </Routes>
  );
}
