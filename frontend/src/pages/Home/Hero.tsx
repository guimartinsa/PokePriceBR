import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function Hero() {
    const navigate = useNavigate()
    const { isAuthenticated } = useAuth();
    return (
        <section className="hero">
            <h1>
                O <span className="highlight">Melhor</span><br />
                Gerenciador de coleções<br />
                Para colecionadores <span className="highlight">brasileiros</span> de Pokemon
            </h1>

            <p>
                Gerencie sua coleção de cartas Pokémon e monitore os valores de mercado em tempo real.
            </p>

            <div className="hero-actions">
                <button className="cta" onClick={() => navigate("/collection")} >Criar minha coleção</button>
                {!isAuthenticated && (
                    <Link to="/auth" className="cta cta-secondary">
                        Criar minha conta
                    </Link>
                )}
            </div>
        </section>
    );
}
