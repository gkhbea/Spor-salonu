import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { PoolClient } from 'pg';

export interface CreateAuditLogParams {
  salonId: string;
  userId?: string | null;
  action: string;
  entityName: string;
  entityId?: string | null;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Kritik işlemleri audit_logs tablosuna kaydeder.
   * Eğer bir transaction client'ı verilirse o transaction içinde çalışır.
   */
  async log(params: CreateAuditLogParams, client?: PoolClient): Promise<void> {
    const query = `
      INSERT INTO audit_logs (
        salon_id, user_id, action, entity_name, entity_id, old_values, new_values, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    const values = [
      params.salonId,
      params.userId || null,
      params.action,
      params.entityName,
      params.entityId || null,
      params.oldValues ? JSON.stringify(params.oldValues) : null,
      params.newValues ? JSON.stringify(params.newValues) : null,
      params.ipAddress || null,
      params.userAgent || null,
    ];

    try {
      if (client) {
        await client.query(query, values);
      } else {
        await this.db.query(query, values);
      }
      this.logger.log(
        `Audit Log Kaydedildi: [Salon: ${params.salonId}] [Aksiyon: ${params.action}] [Varlık: ${params.entityName}:${params.entityId}]`,
      );
    } catch (error) {
      this.logger.error('Audit log kaydı yazılırken hata oluştu:', error);
      // Audit log hatası ana işlemi durdurmamalı ancak kritik loglanmalıdır
    }
  }
}
