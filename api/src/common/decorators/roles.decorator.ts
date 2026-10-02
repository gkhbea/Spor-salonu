import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export type UserRole = 'admin' | 'trainer' | 'member';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
