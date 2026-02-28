// pages/Home/HomePage.tsx
// pages/Home/HomePage.tsx
import { Hero } from "./Hero";
import { StatsBar } from "./StatsBar";
//import {CardList} from "../../components/CardList";
import "../../styles/global.css";
//import "./home.css"

import baner from "../../assets/baner-herois.jpg";

export default function HomePage() {
    return (
        <div className="home">
            <Hero />
            <StatsBar />

            <section className="home-showcase" aria-label="Destaques da plataforma">
                <div className="home-showcase-image" role="img" aria-label="Área reservada para imagem principal">
                    <img src={baner} alt="" />
                </div>

                <div className="home-showcase-content">
                    <h2>Organize sua coleção com mais clareza</h2>
                    <p>
                        Acompanhe o valor das suas cartas, veja evolução de preço e monte sua
                        estratégia de troca em um só lugar.
                    </p>
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
