/**
 * Asset Dossier Types
 * Types pour le dossier machine unifié
 * 
 * RÈGLE STRICTE : Structure figée, jamais modifiée après création
 */

// ============================================
// DOSSIER MACHINE COMPLET (7 SECTIONS)
// ============================================

/**
 * Dossier machine unifié
 * Agrège toutes les informations d'un Asset
 */
export interface AssetDossier {
    /** Métadonnées du snapshot */
    meta: DossierMeta;

    /** 1️⃣ Identité Asset */
    identity: AssetIdentity;

    /** 2️⃣ Configuration technique CTO */
    ctoConfiguration: CtoConfigurationSection | null;

    /** 3️⃣ Historique reconditionnement */
    refurbishmentHistory: RefurbishmentSection;

    /** 4️⃣ Qualité & incidents */
    qualityIncidents: QualitySection;

    /** 5️⃣ SAV & RMA */
    savHistory: SavSection;

    /** 6️⃣ Logistique */
    logistics: LogisticsSection;

    /** 7️⃣ Statut final */
    finalStatus: FinalStatusSection;
}

// ============================================
// META
// ============================================

export interface DossierMeta {
    snapshotId: string;
    assetId: string;
    generatedAt: Date;
    version: string;  // Format: "1.0.0"
}

// ============================================
// SECTION 1: IDENTITÉ ASSET
// ============================================

export interface AssetIdentity {
    serialNumber: string;
    assetType: string;
    brand: string;
    model: string;
    chassisRef: string | null;
    origin: AssetOrigin | null;
    entryDate: Date;
}

export interface AssetOrigin {
    supplierRef: string | null;
    lotRef: string | null;
    procurementDate: Date | null;
}

// ============================================
// SECTION 2: CONFIGURATION CTO
// ============================================

export interface CtoConfigurationSection {
    configurationId: string;
    validated: boolean;
    components: CtoComponent[];
    decisions: CtoDecisionInfo[];
    validatedAt: Date;
}

export interface CtoComponent {
    type: string;
    reference: string;
    quantity: number;
}

export interface CtoDecisionInfo {
    ruleId: string;
    ruleName: string;
    ruleVersion: number;
    result: 'ACCEPT' | 'REJECT';
    explanations: CtoExplanation[];
}

export interface CtoExplanation {
    code: string;
    message: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
}

// ============================================
// SECTION 3: HISTORIQUE RECONDITIONNEMENT
// ============================================

export interface RefurbishmentSection {
    tasks: WmsTaskInfo[];
    qaChecklists: QaChecklistResult[];
    replacedParts: ReplacedPart[];
}

export interface WmsTaskInfo {
    taskId: string;
    type: string;
    status: string;
    operatorAnonymized: string | null;  // RÈGLE : Jamais de nom réel
    steps: WmsTaskStep[];
    startedAt: Date | null;
    completedAt: Date | null;
}

export interface WmsTaskStep {
    description: string;
    completed: boolean;
    completedAt: Date | null;
}

export interface QaChecklistResult {
    checklistName: string;
    itemCode: string;
    result: 'PASS' | 'FAIL';
    measuredValue: string | null;
    evaluatedAt: Date;
}

export interface ReplacedPart {
    partType: string;
    reference: string;
    replacedAt: Date;
}

// ============================================
// SECTION 4: QUALITÉ & INCIDENTS
// ============================================

export interface QualitySection {
    defects: QualityDefect[];
    alerts: QualityAlertInfo[];
    batteryHealth: BatteryHealthInfo | null;
}

export interface QualityDefect {
    code: string;
    description: string;
    severity: string;
    detectedAt: Date;
}

export interface QualityAlertInfo {
    alertId: string;
    type: string;
    scope: string;
    reason: string;
    active: boolean;
    createdAt: Date;
}

export interface BatteryHealthInfo {
    stateOfHealth: number;
    cycles: number;
    measuredAt: Date;
}

// ============================================
// SECTION 5: SAV & RMA
// ============================================

export interface SavSection {
    tickets: SavTicketInfo[];
    rmas: RmaInfo[];
}

export interface SavTicketInfo {
    ticketId: string;
    customerRef: string;
    issue: string;
    status: string;
    createdAt: Date;
}

export interface RmaInfo {
    rmaId: string;
    ticketId: string;
    status: string;
    diagnosis: RmaDiagnosisInfo | null;
    createdAt: Date;
}

export interface RmaDiagnosisInfo {
    diagnosis: string;
    resolution: string;
    createdAt: Date;
}

// ============================================
// SECTION 6: LOGISTIQUE
// ============================================

export interface LogisticsSection {
    currentWarehouse: WarehouseInfo | null;
    movements: InventoryMovementInfo[];
    shipment: ShipmentInfo | null;
}

export interface WarehouseInfo {
    warehouseId: string;
    code: string;
    name: string;
    country: string;
}

export interface InventoryMovementInfo {
    fromLocation: string | null;
    toLocation: string | null;
    reason: string;
    movedAt: Date;
}

export interface ShipmentInfo {
    shipmentId: string;
    carrier: string;
    trackingRef: string | null;
    status: string;
    shippedAt: Date;
}

// ============================================
// SECTION 7: STATUT FINAL
// ============================================

export interface FinalStatusSection {
    status: string;
    grade: string | null;
    statusDate: Date;
    scrapJustification: string | null;
}

// ============================================
// ERRORS
// ============================================

export class AssetNotFoundError extends Error {
    constructor(public readonly assetId: string) {
        super(`Asset ${assetId} not found`);
        this.name = 'AssetNotFoundError';
    }
}

export class DossierNotFoundError extends Error {
    constructor(public readonly assetId: string) {
        super(`Dossier for asset ${assetId} not found`);
        this.name = 'DossierNotFoundError';
    }
}

export class DossierBuildError extends Error {
    constructor(public readonly assetId: string, public readonly reason: string) {
        super(`Failed to build dossier for ${assetId}: ${reason}`);
        this.name = 'DossierBuildError';
    }
}
