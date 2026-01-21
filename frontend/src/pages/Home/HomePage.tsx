// pages/Home/HomePage.tsx
import { Hero } from "./Hero";
import { StatsBar } from "./StatsBar";
import { RecentCards } from "./RecentCards";

export default function HomePage() {
    return (
        <>
            <Hero />
            <StatsBar />
            <RecentCards />
        </>
    );
}
