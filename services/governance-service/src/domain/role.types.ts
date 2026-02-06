/**
 * Role Types
 */

export type RoleLevel = 0 | 1 | 2 | 3;

export const ROLE_LEVELS: Record<RoleLevel, string> = {
    0: 'operator',
    1: 'supervisor',
    2: 'manager',
    3: 'direction'
};

export interface RoleEntity {
    id: string;
    name: string;
    description: string | null;
    level: RoleLevel;
    createdAt: Date;
}

export interface CreateRoleDto {
    name: string;
    description?: string;
    level: RoleLevel;
}
