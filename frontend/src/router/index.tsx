// router/index.tsx
import { Routes, Route } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";

import HomePage from "../pages/Home/HomePage";
import CardListPage from "../pages/Cards/CardListPage";
import CardDetailPage from "../pages/CardDetailPage";
import CollectionPage from "../pages/Collection/CollectionPage";
import { CameraView } from "../components/camera/CameraView";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/cards" element={<CardListPage />} />
        <Route path="/cards/:id" element={<CardDetailPage />} />
        <Route path="/collection" element={<CollectionPage />} />
        <Route path="/scan" element={<CameraView />} />
      </Route>
    </Routes>
  );
}