/**
 * @proinfo/shared - Entry Point
 * Exports all shared modules
 */

// Auth
export {
    Role,
    JwtPayload,
    AuthenticatedRequest,
    KeycloakConfig,
    authMiddleware,
    requireRole,
    getDefaultKeycloakConfig
} from './auth/keycloak.middleware';

// Logging
export {
    LogLevel,
    LogEntry,
    LoggerConfig,
    StructuredLogger,
    createLogger
} from './logging/logger';

// Validation
export * from './validation/schemas';
export {
    validateBody,
    validateParams,
    validateQuery
} from './validation/middleware';

// HTTP
export {
    HttpClientConfig,
    RequestOptions,
    HttpError,
    TimeoutError,
    RobustHttpClient
} from './http/client';
