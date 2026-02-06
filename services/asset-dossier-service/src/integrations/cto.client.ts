/**
 * CTO Service Client
 * Lecture seule — Configurations, decisions, explanations
 */

export interface CtoConfiguration {
    id: string;
    assetId: string;
    configuration: unknown;
    priceSnapshot: unknown;
    leadTimeDays: number;
    ruleSetId: string;
    validated: boolean;
    createdAt: Date;
}

export interface CtoDecision {
    id: string;
    configurationId: string;
    ruleVersionId: string;
    result: 'ACCEPT' | 'REJECT';
    createdAt: Date;
}

export interface CtoDecisionExplanation {
    id: string;
    decisionId: string;
    code: string;
    message: string;
    severity: string;
    createdAt: Date;
}

export interface CtoRuleVersion {
    id: string;
    ruleId: string;
    version: number;
    name: string;
    description: string;
}

export interface CtoAuditResponse {
    configurationId: string;
    overallResult: 'ACCEPT' | 'REJECT';
    evaluatedAt: Date;
    decisions: {
        ruleId: string;
        ruleName: string;
        ruleVersion: number;
        result: 'ACCEPT' | 'REJECT';
        explanations: Array<{
            code: string;
            message: string;
            severity: string;
        }>;
    }[];
}

export class CtoClient {
    constructor(private readonly baseUrl: string = 'http://localhost:3005') { }

    async getConfigurationForAsset(assetId: string): Promise<CtoConfiguration | null> {
        try {
            const response = await fetch(`${this.baseUrl}/cto/configurations?assetId=${assetId}`);
            if (!response.ok) return null;
            const data = await response.json() as { data?: CtoConfiguration[] };
            const configs = data.data || [];
            // Retourner la config validée la plus récente
            return configs.find((c: CtoConfiguration) => c.validated) || configs[0] || null;
        } catch {
            return null;
        }
    }

    async getDecisionAudit(configurationId: string): Promise<CtoAuditResponse | null> {
        try {
            const response = await fetch(`${this.baseUrl}/cto/decisions/${configurationId}`);
            if (!response.ok) return null;
            const data = await response.json() as { data?: CtoAuditResponse };
            return data.data || null;
        } catch {
            return null;
        }
    }
}
