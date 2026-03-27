// router/index.tsx
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";

const HomePage = lazy(() => import("../pages/Home/HomePage"));
const CardListPage = lazy(() => import("../pages/Cards/CardListPage"));
const CardDetailPage = lazy(() => import("../pages/CardDetailPage"));
const CollectionPage = lazy(() => import("../pages/Collection/CollectionPage"));
const ProfilePage = lazy(() =>
  import("../pages/ProfilePage").then((mod) => ({ default: mod.ProfilePage }))
);
const CollectionsListPage = lazy(() => import("../pages/Collection/CollectionsListPage"));
const AuthPage = lazy(() => import("../pages/AuthPage"));
const SeriesPage = lazy(() => import("../pages/SeriesPage"));
const SeriesDetailPage = lazy(() => import("../pages/SeriesDetailPage"));
const SetPage = lazy(() => import("../pages/SetPage"));
const ScanPage = lazy(() => import("../pages/ScanPage"));
const ArtistsPage = lazy(() => import("../pages/ArtistsPage"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<p style={{ padding: 16 }}>Carregando página...</p>}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/cards" element={<CardListPage />} />
          <Route path="/cards/:id" element={<CardDetailPage />} />
          <Route path="/collection" element={<CollectionsListPage />} />
          <Route path="/collections/:id" element={<CollectionPage />} />

          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/profile" element={<Navigate to="/perfil" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />

          <Route path="/auth" element={<AuthPage />} />

          {/*<Route path="/scan" element={<CameraView />} />*/}
          <Route path="/scan" element={<ScanPage />} />

          <Route path="/series" element={<SeriesPage />} />
          <Route path="/series/:seriesId" element={<SeriesDetailPage />} />
          <Route path="/series/sets/:setCode" element={<SetPage />} />
          <Route path="/artists" element={<ArtistsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
