/**
 * SAV Events
 * Émission d'événements domaine (simulation console.log)
 */

import { TicketEntity } from '../domain/ticket.types';
import { RmaEntity } from '../domain/rma.types';
import { DiagnosisEntity } from '../domain/diagnosis.types';

export interface SavTicketCreatedEvent {
    eventType: 'SavTicketCreated';
    version: '1.0';
    timestamp: Date;
    payload: {
        ticketId: string;
        assetId: string;
        customerRef: string;
        issue: string;
    };
}

export interface RmaCreatedEvent {
    eventType: 'RmaCreated';
    version: '1.0';
    timestamp: Date;
    payload: {
        rmaId: string;
        assetId: string;
        ticketId: string;
    };
}

export interface RmaReceivedEvent {
    eventType: 'RmaReceived';
    version: '1.0';
    timestamp: Date;
    payload: {
        rmaId: string;
        assetId: string;
    };
}

export interface RmaDiagnosedEvent {
    eventType: 'RmaDiagnosed';
    version: '1.0';
    timestamp: Date;
    payload: {
        rmaId: string;
        diagnosis: string;
        resolution: string;
    };
}

export interface RmaResolvedEvent {
    eventType: 'RmaResolved';
    version: '1.0';
    timestamp: Date;
    payload: {
        rmaId: string;
        resolution: string;
        assetId: string;
    };
}

export function emitSavTicketCreated(ticket: TicketEntity): void {
    const event: SavTicketCreatedEvent = {
        eventType: 'SavTicketCreated',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            ticketId: ticket.id,
            assetId: ticket.assetId,
            customerRef: ticket.customerRef,
            issue: ticket.issue
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}

export function emitRmaCreated(rma: RmaEntity): void {
    const event: RmaCreatedEvent = {
        eventType: 'RmaCreated',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            rmaId: rma.id,
            assetId: rma.assetId,
            ticketId: rma.ticketId
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}

export function emitRmaReceived(rma: RmaEntity): void {
    const event: RmaReceivedEvent = {
        eventType: 'RmaReceived',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            rmaId: rma.id,
            assetId: rma.assetId
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}

export function emitRmaDiagnosed(rma: RmaEntity, diagnosis: DiagnosisEntity): void {
    const event: RmaDiagnosedEvent = {
        eventType: 'RmaDiagnosed',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            rmaId: rma.id,
            diagnosis: diagnosis.diagnosis,
            resolution: diagnosis.resolution
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}

export function emitRmaResolved(rma: RmaEntity, resolution: string): void {
    const event: RmaResolvedEvent = {
        eventType: 'RmaResolved',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            rmaId: rma.id,
            resolution,
            assetId: rma.assetId
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}
