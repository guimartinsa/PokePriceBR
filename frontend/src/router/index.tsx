// router/index.tsx
import { Routes, Route } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";

import HomePage from "../pages/Home/HomePage";
import CardListPage from "../pages/Cards/CardListPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/cards" element={<CardListPage />} />
      </Route>
    </Routes>
  );
}
