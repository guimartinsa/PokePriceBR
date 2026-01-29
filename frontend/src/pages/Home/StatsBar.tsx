import { StatBlock } from "../../components/ui/StatBlock";

export function StatsBar() {
    return (
        <section className="stats-bar">
            <StatBlock value="7" label="Cards Collected" />
            <StatBlock value="5" label="Unique" />
            <StatBlock value="80%" label="Holos" />
        </section>
    );
}