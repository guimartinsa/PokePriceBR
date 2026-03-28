import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuth } from "../../hooks/useAuth";
import { fetchCardsAutocomplete } from "../../api/cardsAutocomplete";
import {
    fetchCollections,
    createCollection,
    deleteCollection,
    type Collection,
} from "../../services/collection";
import type { CardAutocomplete } from "../../types/CardAutocomplete";
import "./collectionsList.css";
import { hasSubscriberPrivileges } from "../../utils/plan";

import icon from "../../assets/icons/colecaoicon.svg";

const FREE_COLLECTION_LIMIT = 1;


export default function CollectionsListPage() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [newName, setNewName] = useState("");
    const [cardQuery, setCardQuery] = useState("");
    const [cardOptions, setCardOptions] = useState<CardAutocomplete[]>([]);
    const [selectedCoverCard, setSelectedCoverCard] = useState<CardAutocomplete | null>(null);
    const [showLimitPopup, setShowLimitPopup] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    const hasUnlimitedCollections = hasSubscriberPrivileges(user?.plan);
    const reachedFreeLimit = !hasUnlimitedCollections && collections.length >= FREE_COLLECTION_LIMIT;

    async function loadCollections() {
        try {
            const data = await fetchCollections();
            setCollections(data);
        } catch (err) {
            console.error(err);
        }
    }

    useEffect(() => {
        loadCollections();
    }, []);

    useEffect(() => {
        if (cardQuery.trim().length < 2) {
            setCardOptions([]);
            return;
        }

        fetchCardsAutocomplete(cardQuery)
            .then((cards) => setCardOptions(cards.slice(0, 6)))
            .catch(() => setCardOptions([]));
    }, [cardQuery]);

    async function handleCreate() {
        if (!newName.trim()) return;
        if (reachedFreeLimit) {
            setShowLimitPopup(true);
            return;
        }

        try {
            const created = await createCollection(newName, selectedCoverCard?.id ?? null);
            setCollections((prev) => [...prev, created]);
            setNewName("");
            setCardQuery("");
            setCardOptions([]);
            setSelectedCoverCard(null);
        } catch (err) {
            if (err instanceof AxiosError && err.response?.status === 403) {
                setShowLimitPopup(true);
                return;
            }
            console.error("Erro ao criar coleção", err);
        }
    }

    async function handleDelete(id: number) {
        const ok = confirm("Deseja excluir esta coleção?");
        if (!ok) return;

        try {
            await deleteCollection(id);
            setCollections((prev) => prev.filter((c) => c.id !== id));
        } catch (err) {
            console.error("Erro ao excluir coleção", err);
        }
    }

    const helperMessage = useMemo(() => {
        if (hasUnlimitedCollections) {
            return "Seu plano permite criar coleções ilimitadas.";
        }

        if (collections.length === 0) {
            return "Você pode criar sua primeira coleção grátis.";
        }

        return "Você já usou sua coleção grátis. Assine o Pro para criar coleções ilimitadas.";
    }, [collections.length, hasUnlimitedCollections]);

    return (
        <div className="collections-page">
            <header className="collections-header">
                <div>
                    <img src={icon} alt="" width={45} />
                    <h1>Minhas Coleções</h1>
                    <p>{helperMessage}</p>
                </div>
                {!hasUnlimitedCollections && collections.length > 0 && (
                    <button
                        type="button"
                        className="subscribe-btn"
                        onClick={() => navigate("/perfil")}
                    >
                        Assinar Pro
                    </button>
                )}
            </header>

            <section className="create-collection-card">
                <h2>Criar coleção</h2>
                <div className="create-row">
                    <input
                        type="text"
                        placeholder="Nome da nova coleção"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                    <button
                        onClick={handleCreate}
                        disabled={!newName.trim()}
                    >
                        Criar
                    </button>
                </div>

                <div className="cover-picker">
                    <label>Escolher carta de capa</label>
                    <input
                        type="text"
                        value={selectedCoverCard ? selectedCoverCard.nome : cardQuery}
                        onChange={(e) => {
                            setSelectedCoverCard(null);
                            setCardQuery(e.target.value);
                        }}
                        placeholder="Busque uma carta para ser a imagem da coleção"
                    />

                    {!selectedCoverCard && cardOptions.length > 0 && (
                        <ul className="cover-options">
                            {cardOptions.map((card) => (
                                <li
                                    key={card.id}
                                    onMouseDown={() => {
                                        setSelectedCoverCard(card);
                                        setCardQuery("");
                                        setCardOptions([]);
                                    }}
                                >
                                    {card.imagem && <img src={card.imagem} alt={card.nome} />}
                                    <div>
                                        <strong>{card.nome}</strong>
                                        <small>
                                            #{card.numero_completo} • {card.set.codigo_liga}
                                        </small>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>

            {showLimitPopup && (
                <div className="collection-limit-overlay" role="presentation" onClick={() => setShowLimitPopup(false)}>
                    <div className="collection-limit-popup" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
                        <h3>Limite de coleções atingido</h3>
                        <p>
                            Você não pode criar mais coleções no plano atual. Adicione cartas em uma coleção existente ou assine o Pro.
                        </p>
                        <div className="collection-limit-actions">
                            <button
                                type="button"
                                onClick={() => setShowLimitPopup(false)}
                            >
                                Escolher existente
                            </button>
                            <button
                                type="button"
                                className="subscribe-btn"
                                onClick={() => navigate("/perfil")}
                            >
                                Ver planos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <section className="collections-grid">
                {collections.length === 0 && (
                    <p className="empty-collections">Você ainda não criou nenhuma coleção.</p>
                )}

                {collections.map((col) => (
                    <article key={col.id} className="collection-set-card">

                        <button
                            type="button"
                            className="cover-area"
                            onClick={() => navigate(`/collections/${col.id}`)}
                        >
                            {col.cover_image ? (
                                <img src={col.cover_image} alt={col.name} />
                            ) : (
                                <div className="cover-fallback">Sem capa</div>
                            )}
                        </button>

                        <div className="collection-info">
                            <strong>{col.name}</strong>
                            <span>Coleção pessoal</span>
                            <div className="collection-actions">
                                <button onClick={() => navigate(`/collections/${col.id}`)}>Abrir</button>
                                <button onClick={() => handleDelete(col.id)} className="danger-btn">
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </article>
                ))}
            </section>
        </div>
    );
}
