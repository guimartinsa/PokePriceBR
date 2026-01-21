// components/layout/AppLayout.tsx
import { Outlet } from "react-router-dom";
import TopBar  from "./TopBar";
import SideDrawer  from "./SideDrawer";
import BottomBar  from "./BottomBar";

export function AppLayout() {
    return (
        <div className="app-shell">
            <TopBar />
            <SideDrawer />

            <main className="app-content">
                <Outlet />
            </main>

            <BottomBar />
        </div>
    );
}
