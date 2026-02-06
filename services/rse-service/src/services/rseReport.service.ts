/**
 * RSE Report Service
 * Agrégation et export des rapports RSE
 * 
 * RÈGLE : Export audit-ready, sources traçables
 */

import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { RseCalculationService } from './rseCalculation.service';
import { RseMethodologyService } from './rseMethodology.service';
import { AssetClient } from '../integrations/asset.client';
import {
    CustomerReport,
    AggregatedMetrics,
    AssetReportLine,
    ExportResult,
    ExportOptions,
    ReportFilters
} from '../domain/rseReport.types';
import { RseMetricEntity, METRIC_LABELS } from '../domain/rseMetric.types';

export class RseReportService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly calculationService: RseCalculationService,
        private readonly methodologyService: RseMethodologyService,
        private readonly assetClient: AssetClient
    ) { }

    /**
     * Générer un rapport client
     */
    async getCustomerReport(filters: ReportFilters): Promise<CustomerReport> {
        const { customerRef, period } = filters;

        if (!customerRef) {
            throw new Error('customerRef is required');
        }

        // 1. Récupérer les assets du client
        const orderAssets = await this.assetClient.getAssetsByCustomer(customerRef);
        const assetIds = orderAssets.map(oa => oa.assetId);

        // 2. Récupérer les métriques
        const metrics = await this.calculationService.getMetricsForAssets(assetIds);

        // 3. Agréger
        const totals = this.aggregateMetrics(metrics);
        const assetCount = new Set(metrics.map(m => m.assetId)).size;

        // 4. Construire lignes détail
        const assets = await this.buildAssetLines(assetIds, metrics);

        // 5. Récupérer la méthodologie
        const methodology = await this.methodologyService.getActiveMethodology();

        return {
            customerRef,
            period: period || new Date().getFullYear().toString(),
            totals,
            averages: {
                co2PerAsset: assetCount > 0 ? totals.co2Avoided / assetCount : 0,
                waterPerAsset: assetCount > 0 ? totals.waterSaved / assetCount : 0,
                materialPerAsset: assetCount > 0 ? totals.materialSaved / assetCount : 0
            },
            assets,
            methodology: {
                version: methodology.version,
                sources: methodology.sources
            },
            generatedAt: new Date()
        };
    }

    /**
     * Exporter le rapport
     */
    async exportReport(report: CustomerReport, options: ExportOptions): Promise<ExportResult> {
        switch (options.format) {
            case 'PDF':
                return this.exportPdf(report);
            case 'CSV':
                return this.exportCsv(report);
            case 'JSON':
                return this.exportJson(report);
            default:
                throw new Error(`Unsupported format: ${options.format}`);
        }
    }

    // ============================================
    // AGGREGATION
    // ============================================

    private aggregateMetrics(metrics: RseMetricEntity[]): AggregatedMetrics {
        let co2Avoided = 0;
        let waterSaved = 0;
        let materialSaved = 0;
        const assetIds = new Set<string>();

        for (const metric of metrics) {
            assetIds.add(metric.assetId);
            switch (metric.metricType) {
                case 'CO2_AVOIDED':
                    co2Avoided += metric.value;
                    break;
                case 'WATER_SAVED':
                    waterSaved += metric.value;
                    break;
                case 'MATERIAL_SAVED':
                    materialSaved += metric.value;
                    break;
            }
        }

        return {
            co2Avoided: Math.round(co2Avoided * 100) / 100,
            waterSaved: Math.round(waterSaved * 100) / 100,
            materialSaved: Math.round(materialSaved * 100) / 100,
            assetCount: assetIds.size
        };
    }

    private async buildAssetLines(
        assetIds: string[],
        metrics: RseMetricEntity[]
    ): Promise<AssetReportLine[]> {
        const lines: AssetReportLine[] = [];

        for (const assetId of assetIds) {
            const asset = await this.assetClient.getAsset(assetId);
            const assetMetrics = metrics.filter(m => m.assetId === assetId);

            if (asset && assetMetrics.length > 0) {
                lines.push({
                    assetId,
                    serialNumber: asset.serialNumber,
                    assetType: asset.assetType,
                    metrics: assetMetrics.map(m => ({
                        type: m.metricType,
                        value: m.value,
                        unit: m.unit
                    })),
                    calculatedAt: assetMetrics[0].createdAt
                });
            }
        }

        return lines;
    }

    // ============================================
    // EXPORTS
    // ============================================

    private async exportPdf(report: CustomerReport): Promise<ExportResult> {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ margin: 50 });

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));

        // Header
        doc.fontSize(18).text('RAPPORT RSE - IMPACT ENVIRONNEMENTAL', { align: 'center' });
        doc.fontSize(10).text('Document de conformité audit-ready', { align: 'center' });
        doc.moveDown(2);

        // Client info
        doc.fontSize(12).text(`Client: ${report.customerRef}`);
        doc.text(`Période: ${report.period}`);
        doc.text(`Généré le: ${report.generatedAt.toISOString().split('T')[0]}`);
        doc.moveDown(1);

        // Totaux
        doc.fontSize(14).text('IMPACT TOTAL', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        doc.text(`• CO₂ évité: ${report.totals.co2Avoided} kg`);
        doc.text(`• Eau économisée: ${report.totals.waterSaved} L`);
        doc.text(`• Matières évitées: ${report.totals.materialSaved} kg`);
        doc.text(`• Équipements: ${report.totals.assetCount}`);
        doc.moveDown(1);

        // Méthodologie
        doc.fontSize(14).text('MÉTHODOLOGIE', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Version: ${report.methodology.version}`);
        doc.text(`Sources: ${report.methodology.sources}`);
        doc.moveDown(2);

        // Footer
        doc.fontSize(8).text(
            'Ce rapport est généré automatiquement. Les calculs sont basés sur des sources publiques (ADEME, EPEAT).',
            { align: 'center' }
        );

        doc.end();

        await new Promise<void>((resolve) => doc.on('end', resolve));

        return {
            format: 'PDF',
            filename: `rapport_rse_${report.customerRef}_${report.period}.pdf`,
            mimeType: 'application/pdf',
            buffer: Buffer.concat(chunks),
            generatedAt: new Date()
        };
    }

    private async exportCsv(report: CustomerReport): Promise<ExportResult> {
        const lines: string[] = [];

        // Header
        lines.push('Asset ID,Serial Number,Type,CO2 Avoided (kg),Water Saved (L),Material Saved (kg),Calculated At');

        // Data
        for (const asset of report.assets) {
            const co2 = asset.metrics.find(m => m.type === 'CO2_AVOIDED')?.value || 0;
            const water = asset.metrics.find(m => m.type === 'WATER_SAVED')?.value || 0;
            const material = asset.metrics.find(m => m.type === 'MATERIAL_SAVED')?.value || 0;
            lines.push(`${asset.assetId},${asset.serialNumber},${asset.assetType},${co2},${water},${material},${asset.calculatedAt.toISOString()}`);
        }

        // Totals
        lines.push('');
        lines.push(`TOTAL,,${report.totals.assetCount} assets,${report.totals.co2Avoided},${report.totals.waterSaved},${report.totals.materialSaved},`);

        const csv = lines.join('\n');

        return {
            format: 'CSV',
            filename: `rapport_rse_${report.customerRef}_${report.period}.csv`,
            mimeType: 'text/csv',
            buffer: Buffer.from(csv, 'utf-8'),
            generatedAt: new Date()
        };
    }

    private async exportJson(report: CustomerReport): Promise<ExportResult> {
        const json = JSON.stringify(report, null, 2);

        return {
            format: 'JSON',
            filename: `rapport_rse_${report.customerRef}_${report.period}.json`,
            mimeType: 'application/json',
            buffer: Buffer.from(json, 'utf-8'),
            generatedAt: new Date()
        };
    }
}
