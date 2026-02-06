/**
 * WMS Events
 * Émission d'événements domaine avec logger structuré
 * 
 * Sprint 17 — Events pour les tâches WMS
 */

import { WmsTaskEntity } from '../domain/task.types';
import { logger } from '../utils/logger';

// ========== LEGACY EVENTS ==========

export interface PickingCreatedEvent {
    eventType: 'PickingCreated';
    version: '1.0';
    timestamp: Date;
    payload: {
        pickingId: string;
        assetId: string;
    };
}

export interface PickingCompletedEvent {
    eventType: 'PickingCompleted';
    version: '1.0';
    timestamp: Date;
    payload: {
        pickingId: string;
        assetId: string;
    };
}

export interface AssemblyCompletedEvent {
    eventType: 'AssemblyCompleted';
    version: '1.0';
    timestamp: Date;
    payload: {
        assemblyId: string;
        assetId: string;
    };
}

export interface AssetShippedEvent {
    eventType: 'AssetShipped';
    version: '1.0';
    timestamp: Date;
    payload: {
        shipmentId: string;
        assetId: string;
        carrier: string;
        trackingRef: string | null;
    };
}

export interface AssetReturnedEvent {
    eventType: 'AssetReturned';
    version: '1.0';
    timestamp: Date;
    payload: {
        returnId: string;
        assetId: string;
        reason: string;
    };
}

// ========== SPRINT 17 EVENTS ==========

export interface TaskStartedEvent {
    eventType: 'TaskStarted';
    version: '1.0';
    timestamp: Date;
    payload: {
        taskId: string;
        assetId: string;
        type: string;
        operatorId: string;
    };
}

export interface TaskCompletedEvent {
    eventType: 'TaskCompleted';
    version: '1.0';
    timestamp: Date;
    payload: {
        taskId: string;
        assetId: string;
        type: string;
        operatorId: string | null;
        duration: number | null; // in ms
    };
}

export interface TaskBlockedEvent {
    eventType: 'TaskBlocked';
    version: '1.0';
    timestamp: Date;
    payload: {
        taskId: string;
        assetId: string;
        type: string;
        reason: string;
    };
}

// ========== LEGACY EMIT FUNCTIONS ==========

export function emitPickingCreated(picking: { id: string; assetId: string }): void {
    logger.event('PickingCreated', { pickingId: picking.id, assetId: picking.assetId });
}

export function emitPickingCompleted(picking: { id: string; assetId: string }): void {
    logger.event('PickingCompleted', { pickingId: picking.id, assetId: picking.assetId });
}

export function emitAssemblyCompleted(assembly: { id: string; assetId: string }): void {
    logger.event('AssemblyCompleted', { assemblyId: assembly.id, assetId: assembly.assetId });
}

export function emitAssetShipped(shipment: { id: string; assetId: string; carrier: string; trackingRef: string | null }): void {
    logger.event('AssetShipped', {
        shipmentId: shipment.id,
        assetId: shipment.assetId,
        carrier: shipment.carrier,
        trackingRef: shipment.trackingRef
    });
}

export function emitAssetReturned(ret: { id: string; assetId: string; reason: string }): void {
    logger.event('AssetReturned', { returnId: ret.id, assetId: ret.assetId, reason: ret.reason });
}

// ========== SPRINT 17 EMIT FUNCTIONS ==========

export function emitTaskStarted(task: WmsTaskEntity): void {
    logger.event('TaskStarted', {
        taskId: task.id,
        assetId: task.assetId,
        type: task.type,
        operatorId: task.operatorId
    });
}

export function emitTaskCompleted(task: WmsTaskEntity): void {
    const duration = task.startedAt && task.endedAt
        ? task.endedAt.getTime() - task.startedAt.getTime()
        : null;

    logger.event('TaskCompleted', {
        taskId: task.id,
        assetId: task.assetId,
        type: task.type,
        operatorId: task.operatorId,
        duration
    });
}

export function emitTaskBlocked(task: WmsTaskEntity, reason: string): void {
    logger.event('TaskBlocked', {
        taskId: task.id,
        assetId: task.assetId,
        type: task.type,
        reason
    });
}
