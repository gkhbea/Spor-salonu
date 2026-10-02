import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { envConfig } from '../config/env.config';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

  onModuleInit() {
    this.pool = new Pool({
      host: envConfig.database.host,
      port: envConfig.database.port,
      user: envConfig.database.user,
      password: envConfig.database.pass,
      database: envConfig.database.name,
      ssl: envConfig.database.ssl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      this.logger.error('Beklenmeyen veritabanı havuz hatası:', err);
    });

    this.logger.log('PostgreSQL bağlantı havuzu başlatıldı.');
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('PostgreSQL bağlantı havuzu kapatıldı.');
    }
  }

  /**
   * Parametreli sorgu çalıştırır. Asla raw SQL string interpolation kullanılmaz!
   */
  async query<T extends QueryResultRow = any>(text: string, params: any[] = []): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const res = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      if (envConfig.nodeEnv === 'development') {
        this.logger.debug(`Sorgu: ${text} | Süre: ${duration}ms | Satır: ${res.rowCount}`);
      }
      return res;
    } catch (error) {
      this.logger.error(`Sorgu hatası: ${text}`, error);
      throw error;
    }
  }

  /**
   * Transaction (işlem) yürütmek için client alır.
   */
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Callback içerisinde atomik transaction yürütür.
   */
  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
