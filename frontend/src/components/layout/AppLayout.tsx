// components/layout/AppLayout.tsx
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import SideDrawer from "./SideDrawer";
import BottomBar from "./BottomBar";

import "../../styles/global.css";

export function AppLayout() {
    const [isDesktop, setIsDesktop] = useState(() =>
        typeof window !== "undefined" ? window.matchMedia("(min-width: 960px)").matches : false
    );
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isDesktopMenuCollapsed, setIsDesktopMenuCollapsed] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(min-width: 960px)");
        const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);

        setIsDesktop(mediaQuery.matches);
        mediaQuery.addEventListener("change", onChange);

        return () => mediaQuery.removeEventListener("change", onChange);
    }, []);

    const drawerOpen = isDesktop ? true : isDrawerOpen;

    return (
        <div className={`app-shell${isDesktop ? " is-desktop" : ""}${isDesktopMenuCollapsed ? " is-desktop-collapsed" : ""}`}>
            <TopBar
                onMenuClick={() => {
                    if (isDesktop) {
                        setIsDesktopMenuCollapsed((current) => !current);
                        return;
                    }

                    setIsDrawerOpen(true);
                }}
                isDesktop={isDesktop}
            />

            <div className="app-body">
                <main className="app-content">
                    <Outlet />
                </main>
            </div>

            <SideDrawer
                isOpen={drawerOpen}
                isDesktop={isDesktop}
                isCollapsed={isDesktopMenuCollapsed}
                onClose={() => setIsDrawerOpen(false)}
                onToggleCollapse={() => setIsDesktopMenuCollapsed((current) => !current)}
            />
            <BottomBar />
        </div>
    );
}
