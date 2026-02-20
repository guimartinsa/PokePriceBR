import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function Hero() {
    const { isAuthenticated } = useAuth();
    return (
        <section className="hero">
            <h1>
                The <span className="highlight">Best</span><br />
                Pokémon Card<br />
                Tracker
            </h1>

            <p>
                Track your Pokémon card collection, prices and build your decks.
            </p>

            <div className="hero-actions">
                <button className="cta">Add Your Cards</button>
                {!isAuthenticated && (
                    <Link to="/auth" className="cta cta-secondary">
                        Criar minha conta
                    </Link>
                )}
            </div>
        </section>
    );
}
