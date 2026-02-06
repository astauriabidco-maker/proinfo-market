/**
 * Logger Utility
 * Logger structuré pour production
 * 
 * Remplace console.log par un logger typé avec niveaux et métadonnées
 */

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    service: string;
    category: string;
    message: string;
    metadata?: Record<string, unknown>;
}

/**
 * Format une entrée de log en JSON structuré
 */
function formatLogEntry(entry: LogEntry): string {
    return JSON.stringify(entry);
}

/**
 * Logger structuré singleton
 */
class StructuredLogger {
    private serviceName: string;

    constructor(serviceName: string = 'unknown-service') {
        this.serviceName = serviceName;
    }

    setServiceName(name: string): void {
        this.serviceName = name;
    }

    private log(level: LogLevel, category: string, message: string, metadata?: Record<string, unknown>): void {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            service: this.serviceName,
            category,
            message,
            metadata
        };

        const output = formatLogEntry(entry);

        switch (level) {
            case LogLevel.ERROR:
                console.error(output);
                break;
            case LogLevel.WARN:
                console.warn(output);
                break;
            default:
                console.log(output);
        }
    }

    debug(category: string, message: string, metadata?: Record<string, unknown>): void {
        if (process.env.LOG_LEVEL === 'DEBUG') {
            this.log(LogLevel.DEBUG, category, message, metadata);
        }
    }

    info(category: string, message: string, metadata?: Record<string, unknown>): void {
        this.log(LogLevel.INFO, category, message, metadata);
    }

    warn(category: string, message: string, metadata?: Record<string, unknown>): void {
        this.log(LogLevel.WARN, category, message, metadata);
    }

    error(category: string, message: string, metadata?: Record<string, unknown>): void {
        this.log(LogLevel.ERROR, category, message, metadata);
    }

    /**
     * Log d'événement domaine structuré
     */
    event(eventType: string, payload: Record<string, unknown>): void {
        this.log(LogLevel.INFO, 'EVENT', eventType, payload);
    }

    /**
     * Log de démarrage serveur
     */
    serverStart(port: number): void {
        this.log(LogLevel.INFO, 'SERVER', `Service started on port ${port}`, { port });
    }

    /**
     * Log de connexion DB
     */
    dbConnected(): void {
        this.log(LogLevel.INFO, 'DB', 'Connected to PostgreSQL');
    }

    /**
     * Log d'arrêt serveur
     */
    serverShutdown(): void {
        this.log(LogLevel.INFO, 'SERVER', 'Shutting down...');
    }
}

// Export singleton instance
export const logger = new StructuredLogger();

// Export class for testing
export { StructuredLogger };
