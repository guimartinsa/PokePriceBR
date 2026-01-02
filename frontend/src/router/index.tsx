import { Routes, Route } from "react-router-dom";
import CardsPage from "../pages/CardsPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CardsPage />} />
    </Routes>
  );
}
