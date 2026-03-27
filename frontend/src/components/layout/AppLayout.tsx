// components/layout/AppLayout.tsx
import { Outlet } from "react-router-dom";
import TopBar  from "./TopBar";
import SideDrawer  from "./SideDrawer";
import BottomBar  from "./BottomBar";

import "../../styles/global.css"

export function AppLayout() {
    return (
        <div className="app-shell">
            <TopBar />

            <div className="app-body">
                <SideDrawer />

                <main className="app-content">
                    <Outlet />
                </main>
            </div>

            <BottomBar />
        </div>
    );
}
