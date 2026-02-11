//import { useState } from "react";

import type { Card } from "../../types/Card";
import "./style.css";

type Props = {
    card: Card & { owned?: boolean };
    compact?: boolean;
    showOwnedToggle?: boolean;

    /** usado na CollectionPage */
    onToggleOwned?: (value: boolean) => void;
};

export function CardItemDetail({
    card,
    compact = false,
    onToggleOwned,
}: Props) {
    //const [localOwned, setLocalOwned] = useState<boolean>(card.owned ?? false);

    //const owned = card.owned ?? localOwned;

    //function handleToggle(value: boolean) {setLocalOwned(value);onToggleOwned?.(value);}

    return (
        <div className={`card-item ${compact ? "compact" : ""}`}>
            <img src={card.imagem || "/placeholder.png"} alt={card.nome} />

            <div className="card-body">
                <strong>{card.nome}</strong>
                <small>{card.numero_completo}</small>

                {!compact && (
                    <label className="owned-checkbox">
                        <input
                            type="checkbox"
                            checked={!!card.owned}
                            onChange={(e) => onToggleOwned?.(e.target.checked)}
                        />
                        <span>Tenho</span>
                    </label>
                )}
            </div>
        </div>
    );
}