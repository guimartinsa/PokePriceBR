// pages/Home/HomePage.tsx
// pages/Home/HomePage.tsx
import { Hero } from "./Hero";
import { StatsBar } from "./StatsBar";
import { RecentCards } from "./RecentCards";
//import {CardList} from "../../components/CardList";
import "../../styles/global.css";
//import "./home.css"

export default function HomePage() {
    return (
        <div className="home">
            <Hero />
            <StatsBar />
            <RecentCards />
        </div>
    );
}
