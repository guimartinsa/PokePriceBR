import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function Hero() {
    const navigate = useNavigate()
    const { isAuthenticated } = useAuth();

    return (
        <section className="hero">
            <h1 id="tour-hero-title" data-step="1" data-intro="Este é o resumo principal da plataforma e mostra o propósito do PriceDexBR.">
                O <span className="highlight">Melhor</span><br />
                Gerenciador de coleções<br />
                Para colecionadores <span className="highlight">brasileiros</span> de Pokemon
            </h1>

            <p>
                Gerencie sua coleção de cartas Pokémon e monitore os valores de mercado em tempo real.
            </p>

            <div className="hero-actions">
                <button
                    id="tour-create-collection"
                    className="cta"
                    data-step="2"
                    data-intro="Use este botão para ir direto para sua coleção e começar a organizar as cartas."
                    onClick={() => navigate("/collection")}
                >
                    Criar minha coleção
                </button>
                {!isAuthenticated && (
                    <Link
                        to="/auth"
                        className="cta cta-secondary"
                        data-hint="Você também pode criar uma conta para salvar seu progresso."
                        data-hintPosition="top-middle"
                    >
                        Criar minha conta
                    </Link>
                )}
            </div>
        </section>
    );
}
