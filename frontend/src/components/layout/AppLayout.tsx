// components/layout/AppLayout.tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import SideDrawer from "./SideDrawer";
import BottomBar from "./BottomBar";

import "../../styles/global.css";

export function AppLayout() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <div className="app-shell">
            <TopBar onMenuClick={() => setIsDrawerOpen(true)} />

            <div className="app-body">
                <main className="app-content">
                    <Outlet />
                </main>
            </div>

            <SideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
            <BottomBar />
        </div>
    );
}
