// pages/Home/HomePage.tsx
// pages/Home/HomePage.tsx
import { Hero } from "./Hero";
import { StatsBar } from "./StatsBar";
import { RecentCards } from "./RecentCards";
//import {CardList} from "../../components/CardList";
import "../../styles/global.css";
//import "./home.css"
import "./Professor"
import { Profesor } from "./Professor";

export default function HomePage() {
    return (
        <div className="home">
            <Profesor/>
            <Hero />
            <StatsBar />
            <RecentCards />
        </div>
    );
}
