/**
 * Structured Logger
 * Logs JSON structurés pour audit et traçabilité
 */

/**
 * Niveaux de log
 */
export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

/**
 * Structure d'un log
 */
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    service: string;
    action: string;
    assetId?: string;
    actor?: string;
    actorType?: 'USER' | 'SERVICE' | 'SYSTEM';
    data?: Record<string, unknown>;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

/**
 * Configuration du logger
 */
export interface LoggerConfig {
    service: string;
    minLevel?: LogLevel;
    prettyPrint?: boolean;
}

/**
 * Classe Logger structuré
 */
export class StructuredLogger {
    private readonly service: string;
    private readonly minLevel: LogLevel;
    private readonly prettyPrint: boolean;

    private static readonly levelOrder: Record<LogLevel, number> = {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 1,
        [LogLevel.WARN]: 2,
        [LogLevel.ERROR]: 3
    };

    constructor(config: LoggerConfig) {
        this.service = config.service;
        this.minLevel = config.minLevel ?? LogLevel.INFO;
        this.prettyPrint = config.prettyPrint ?? (process.env.NODE_ENV !== 'production');
    }

    /**
     * Log une action
     */
    log(
        level: LogLevel,
        action: string,
        options?: {
            assetId?: string;
            actor?: string;
            actorType?: 'USER' | 'SERVICE' | 'SYSTEM';
            data?: Record<string, unknown>;
            error?: Error;
        }
    ): void {
        if (StructuredLogger.levelOrder[level] < StructuredLogger.levelOrder[this.minLevel]) {
            return;
        }

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            service: this.service,
            action,
            ...(options?.assetId && { assetId: options.assetId }),
            ...(options?.actor && { actor: options.actor }),
            ...(options?.actorType && { actorType: options.actorType }),
            ...(options?.data && { data: options.data }),
            ...(options?.error && {
                error: {
                    name: options.error.name,
                    message: options.error.message,
                    stack: options.error.stack
                }
            })
        };

        const output = this.prettyPrint
            ? JSON.stringify(entry, null, 2)
            : JSON.stringify(entry);

        if (level === LogLevel.ERROR) {
            console.error(output);
        } else if (level === LogLevel.WARN) {
            console.warn(output);
        } else {
            console.log(output);
        }
    }

    debug(action: string, options?: Parameters<typeof this.log>[2]): void {
        this.log(LogLevel.DEBUG, action, options);
    }

    info(action: string, options?: Parameters<typeof this.log>[2]): void {
        this.log(LogLevel.INFO, action, options);
    }

    warn(action: string, options?: Parameters<typeof this.log>[2]): void {
        this.log(LogLevel.WARN, action, options);
    }

    error(action: string, options?: Parameters<typeof this.log>[2]): void {
        this.log(LogLevel.ERROR, action, options);
    }

    // ============================================
    // MÉTHODES SPÉCIFIQUES AUDIT
    // ============================================

    /**
     * Log un changement de statut Asset
     */
    assetStatusChange(
        assetId: string,
        fromStatus: string,
        toStatus: string,
        actor: string,
        actorType: 'USER' | 'SERVICE' | 'SYSTEM' = 'USER'
    ): void {
        this.info('ASSET_STATUS_CHANGE', {
            assetId,
            actor,
            actorType,
            data: { fromStatus, toStatus }
        });
    }

    /**
     * Log une validation CTO
     */
    ctoValidation(
        assetId: string,
        configurationId: string,
        valid: boolean,
        actor: string
    ): void {
        this.info('CTO_VALIDATION', {
            assetId,
            actor,
            actorType: 'USER',
            data: { configurationId, valid }
        });
    }

    /**
     * Log une réservation Inventory
     */
    inventoryReservation(
        assetId: string,
        reservationId: string,
        orderRef: string,
        actor: string
    ): void {
        this.info('INVENTORY_RESERVATION', {
            assetId,
            actor,
            actorType: 'SERVICE',
            data: { reservationId, orderRef }
        });
    }

    /**
     * Log une expédition
     */
    shipment(
        assetId: string,
        shipmentId: string,
        carrier: string,
        trackingNumber: string,
        actor: string
    ): void {
        this.info('SHIPMENT', {
            assetId,
            actor,
            actorType: 'USER',
            data: { shipmentId, carrier, trackingNumber }
        });
    }

    /**
     * Log un RMA
     */
    rmaAction(
        assetId: string,
        rmaId: string,
        action: 'CREATED' | 'RECEIVED' | 'DIAGNOSED' | 'RESOLVED',
        actor: string,
        resolution?: string
    ): void {
        this.info(`RMA_${action}`, {
            assetId,
            actor,
            actorType: 'USER',
            data: { rmaId, ...(resolution && { resolution }) }
        });
    }
}

/**
 * Factory pour créer un logger
 */
export function createLogger(service: string): StructuredLogger {
    return new StructuredLogger({
        service,
        minLevel: (process.env.LOG_LEVEL as LogLevel) ?? LogLevel.INFO,
        prettyPrint: process.env.NODE_ENV !== 'production'
    });
}
