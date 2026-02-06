/**
 * Asset Dossier Export Service
 * Export audit-ready (PDF + ZIP)
 * 
 * RÈGLE : Export complet, lisible par auditeur non technique
 */

import PDFDocument from 'pdfkit';
import archiver from 'archiver';
import { Writable } from 'stream';
import { AssetDossier } from '../domain/assetDossier.types';
import { ExportResult, ExportOptions, AuditBundle, BundleManifest } from '../domain/export.types';
import { createHash } from 'crypto';

export class AssetDossierExportService {

    /**
     * Exporter le dossier dans le format demandé
     */
    async export(dossier: AssetDossier, options: ExportOptions): Promise<ExportResult> {
        const { format } = options;

        switch (format) {
            case 'PDF':
                return this.exportPdf(dossier);
            case 'JSON':
                return this.exportJson(dossier);
            case 'ZIP':
                return this.exportZip(dossier);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Export PDF synthèse
     */
    private async exportPdf(dossier: AssetDossier): Promise<ExportResult> {
        const chunks: Buffer[] = [];

        const doc = new PDFDocument({ margin: 50 });

        // Collecter les chunks
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));

        // Header
        doc.fontSize(20).text('DOSSIER MACHINE', { align: 'center' });
        doc.fontSize(10).text('Document Audit-Ready', { align: 'center' });
        doc.moveDown(2);

        // Section 1: Identité
        this.addPdfSection(doc, '1. IDENTITÉ ASSET', [
            `Numéro de série: ${dossier.identity.serialNumber}`,
            `Type: ${dossier.identity.assetType}`,
            `Marque: ${dossier.identity.brand}`,
            `Modèle: ${dossier.identity.model}`,
            `Date d'entrée: ${dossier.identity.entryDate.toISOString().split('T')[0]}`
        ]);

        // Section 2: Configuration CTO
        if (dossier.ctoConfiguration) {
            this.addPdfSection(doc, '2. CONFIGURATION CTO', [
                `Configuration ID: ${dossier.ctoConfiguration.configurationId}`,
                `Statut: ${dossier.ctoConfiguration.validated ? 'VALIDÉE' : 'NON VALIDÉE'}`,
                `Composants: ${dossier.ctoConfiguration.components.length}`,
                `Décisions: ${dossier.ctoConfiguration.decisions.length}`
            ]);
        } else {
            this.addPdfSection(doc, '2. CONFIGURATION CTO', ['Aucune configuration CTO']);
        }

        // Section 3: Historique reconditionnement
        this.addPdfSection(doc, '3. HISTORIQUE RECONDITIONNEMENT', [
            `Tâches WMS: ${dossier.refurbishmentHistory.tasks.length}`,
            `Checklists QA: ${dossier.refurbishmentHistory.qaChecklists.length}`,
            `Pièces remplacées: ${dossier.refurbishmentHistory.replacedParts.length}`
        ]);

        // Section 4: Qualité
        this.addPdfSection(doc, '4. QUALITÉ & INCIDENTS', [
            `Défauts détectés: ${dossier.qualityIncidents.defects.length}`,
            `Alertes: ${dossier.qualityIncidents.alerts.length}`,
            `Batterie: ${dossier.qualityIncidents.batteryHealth
                ? `${dossier.qualityIncidents.batteryHealth.stateOfHealth}% SoH`
                : 'N/A'}`
        ]);

        // Section 5: SAV
        this.addPdfSection(doc, '5. SAV & RMA', [
            `Tickets SAV: ${dossier.savHistory.tickets.length}`,
            `RMAs: ${dossier.savHistory.rmas.length}`
        ]);

        // Section 6: Logistique
        this.addPdfSection(doc, '6. LOGISTIQUE', [
            `Entrepôt actuel: ${dossier.logistics.currentWarehouse?.name || 'N/A'}`,
            `Mouvements: ${dossier.logistics.movements.length}`,
            `Expédition: ${dossier.logistics.shipment?.status || 'Non expédié'}`
        ]);

        // Section 7: Statut final
        this.addPdfSection(doc, '7. STATUT FINAL', [
            `Statut: ${dossier.finalStatus.status}`,
            `Grade: ${dossier.finalStatus.grade || 'N/A'}`,
            `Date: ${dossier.finalStatus.statusDate.toISOString().split('T')[0]}`,
            dossier.finalStatus.scrapJustification
                ? `Justification rebut: ${dossier.finalStatus.scrapJustification}`
                : ''
        ].filter(Boolean));

        // Footer
        doc.moveDown(2);
        doc.fontSize(8).text(
            `Généré le ${dossier.meta.generatedAt.toISOString()} | Version ${dossier.meta.version} | ID: ${dossier.meta.snapshotId}`,
            { align: 'center' }
        );

        doc.end();

        // Attendre la fin
        await new Promise<void>((resolve) => doc.on('end', resolve));

        const buffer = Buffer.concat(chunks);

        return {
            assetId: dossier.meta.assetId,
            format: 'PDF',
            filename: `dossier_${dossier.identity.serialNumber}.pdf`,
            mimeType: 'application/pdf',
            buffer,
            generatedAt: new Date()
        };
    }

    /**
     * Export JSON complet
     */
    private async exportJson(dossier: AssetDossier): Promise<ExportResult> {
        const json = JSON.stringify(dossier, null, 2);
        const buffer = Buffer.from(json, 'utf-8');

        return {
            assetId: dossier.meta.assetId,
            format: 'JSON',
            filename: `dossier_${dossier.identity.serialNumber}.json`,
            mimeType: 'application/json',
            buffer,
            generatedAt: new Date()
        };
    }

    /**
     * Export ZIP audit-ready (PDF + JSON + attachments)
     */
    private async exportZip(dossier: AssetDossier): Promise<ExportResult> {
        const pdfResult = await this.exportPdf(dossier);
        const jsonResult = await this.exportJson(dossier);

        // Créer le manifeste
        const manifest: BundleManifest = {
            assetId: dossier.meta.assetId,
            serialNumber: dossier.identity.serialNumber,
            generatedAt: new Date(),
            version: dossier.meta.version,
            files: [pdfResult.filename, jsonResult.filename, 'manifest.json'],
            checksum: this.computeChecksum(jsonResult.buffer)
        };

        // Créer le ZIP
        const chunks: Buffer[] = [];
        const archive = archiver('zip', { zlib: { level: 9 } });

        const writable = new Writable({
            write(chunk, encoding, callback) {
                chunks.push(chunk);
                callback();
            }
        });

        archive.pipe(writable);

        // Ajouter les fichiers
        archive.append(pdfResult.buffer, { name: pdfResult.filename });
        archive.append(jsonResult.buffer, { name: jsonResult.filename });
        archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

        await archive.finalize();

        // Attendre la fin de l'écriture
        await new Promise<void>((resolve) => writable.on('finish', resolve));

        const buffer = Buffer.concat(chunks);

        return {
            assetId: dossier.meta.assetId,
            format: 'ZIP',
            filename: `dossier_${dossier.identity.serialNumber}_audit.zip`,
            mimeType: 'application/zip',
            buffer,
            generatedAt: new Date()
        };
    }

    // ============================================
    // HELPERS
    // ============================================

    private addPdfSection(doc: PDFKit.PDFDocument, title: string, lines: string[]): void {
        doc.fontSize(12).text(title, { underline: true });
        doc.moveDown(0.5);
        for (const line of lines) {
            doc.fontSize(10).text(`  • ${line}`);
        }
        doc.moveDown(1);
    }

    private computeChecksum(buffer: Buffer): string {
        return createHash('sha256').update(buffer).digest('hex').substring(0, 16);
    }
}
