/**
 * Asset Event Types
 * Types pour les événements normalisés
 * 
 * RÈGLE : Événements immuables, sources vérifiables
 */

export type EventSource =
    | 'ASSET_SERVICE'
    | 'QUALITY_SERVICE'
    | 'WMS_SERVICE'
    | 'SAV_SERVICE'
    | 'CTO_SERVICE'
    | 'INVENTORY_SERVICE';

export type EventType =
    | 'STATUS_CHANGE'
    | 'CTO_VALIDATION'
    | 'QUALITY_CHECK'
    | 'WMS_TASK'
    | 'SAV_TICKET'
    | 'RMA'
    | 'INVENTORY_MOVEMENT'
    | 'SHIPMENT';

/**
 * Événement normalisé
 */
export interface AssetEvent {
    /** UUID unique de l'événement */
    eventId: string;

    /** ID de l'asset concerné */
    assetId: string;

    /** Service source */
    source: EventSource;

    /** Type d'événement */
    type: EventType;

    /** Horodatage de l'événement original */
    timestamp: Date;

    /** Données spécifiques à l'événement */
    data: Record<string, unknown>;

    /** Référence à l'entité source (pour audit) */
    sourceRef: string;
}

/**
 * Collection ordonnée d'événements (timeline)
 */
export interface AssetTimeline {
    assetId: string;
    events: AssetEvent[];
    firstEvent: Date;
    lastEvent: Date;
}
