import { useEffect } from "react";
import { Hero } from "./Hero";
import "../../styles/global.css";
//import "./home.css"

//import baner from "../../assets/baner-herois.jpg";
import baner from "../../assets/baner-herois-Dqf_ERhK.webp"

type IntroStep = {
    element: string;
    intro: string;
    title: string;
};

type IntroInstance = {
    setOptions: (options: {
        steps: IntroStep[];
        showProgress: boolean;
        showBullets: boolean;
        exitOnOverlayClick: boolean;
        nextLabel: string;
        prevLabel: string;
        doneLabel: string;
        skipLabel: string;
        tooltipClass: string;
        highlightClass: string;
        overlayOpacity: number;
    }) => void;
    start: () => void;
};

type IntroFactory = () => IntroInstance;

export default function HomePage() {
    useEffect(() => {
        // Intro.js é carregado via CDN no index.html e fica disponível no objeto global.
        const introFactory = (window as Window & { introJs?: IntroFactory }).introJs;

        if (!introFactory) return;

        // Evita abrir o tour automaticamente toda vez que o usuário voltar para a Home.
        const tourAlreadySeen = window.sessionStorage.getItem("home-tour-seen") === "true";
        if (tourAlreadySeen) return;

        // Inicializa o tour com 3 passos principais da home e classes de tema customizadas.
        const intro = introFactory();
        intro.setOptions({
            steps: [
                {
                    element: "#tour-hero-title",
                    intro: "Este bloco apresenta a proposta principal do PriceDexBR.",
                    title: "Boas-vindas"
                },
                {
                    element: "#tour-create-collection",
                    intro: "Comece sua jornada clicando aqui para montar sua coleção.",
                    title: "Ação principal"
                },
                {
                    element: "#tour-home-showcase",
                    intro: "Aqui você acompanha os destaques visuais e novidades da plataforma.",
                    title: "Destaques"
                },
                {
                    element: "#tour-bottom-bar",
                    intro: "A barra inferior reúne a navegação principal do app, incluindo o ponto para instalar o PWA quando disponível.",
                    title: "Button bar"
                }
            ],
            showProgress: true,
            showBullets: true,
            exitOnOverlayClick: true,
            nextLabel: "Próximo",
            prevLabel: "Voltar",
            doneLabel: "Concluir",
            skipLabel: "Pular",
            tooltipClass: "pricedex-tour-tooltip",
            highlightClass: "pricedex-tour-highlight",
            overlayOpacity: 0.72
        });

        intro.start();
        window.sessionStorage.setItem("home-tour-seen", "true");
    }, []);

    return (
        <div className="home">
            <Hero />

            <section
                id="tour-home-showcase"
                className="home-showcase"
                aria-label="Destaques da plataforma"
                data-step="3"
                data-intro="Esta seção reúne os destaques principais da interface inicial."
            >
                <div className="home-showcase-image" role="img" aria-label="Área reservada para imagem principal">

                    <img
                        src={baner} 
                        sizes="(max-width: 768px) 100vw, 690px"
                        width={690}
                        height={390}
                        fetchPriority="high"
                        loading="eager"
                        decoding="async"
                        alt="Banner PriceDexBR"
                    />
                </div>

                <div className="home-showcase-content">
                    <h2>Organize sua coleção com mais clareza</h2>
                    <p>Acompanhe o valor das suas cartas, veja evolução de preço.</p>
                    <p>
                        Em breve você poderá visualizar artes e capas personalizadas nesta seção.
                        Já deixamos o espaço pronto para adicionar suas imagens depois.
                    </p>
                </div>
            </section>

            <section className="home-gallery" aria-label="Prévia visual da plataforma">
                <h2>Experiência visual em evolução</h2>
                <p>
                    Estas áreas simulam os banners e imagens que serão inseridos por você na
                    próxima etapa de design.
                </p>

                <div className="home-gallery-grid">
                    <div className="home-gallery-card">
                        <div className="home-gallery-image-placeholder">Imagem 1</div>
                        <p>Espaço para banner de novidades.</p>
                    </div>
                    <div className="home-gallery-card">
                        <div className="home-gallery-image-placeholder">Imagem 2</div>
                        <p>Espaço para destaque de cartas raras.</p>
                    </div>
                    <div className="home-gallery-card">
                        <div className="home-gallery-image-placeholder">Imagem 3</div>
                        <p>Espaço para promoção ou campanha.</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
