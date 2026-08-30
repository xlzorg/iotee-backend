import { Injectable, Inject } from '@nestjs/common';
import { Pool, PoolClient, QueryResult } from 'pg';

/**
 * Database Service
 * Provides methods for database operations with connection pooling
 */
@Injectable()
export class DatabaseService {
  constructor(@Inject('PG_POOL') private pool: Pool) {}

  /**
   * Execute a query
   * @param sql - SQL query string
   * @param values - Query parameters
   * @returns Query result
   */
  async query(sql: string, values?: any[]): Promise<QueryResult> {
    return this.pool.query(sql, values);
  }

  /**
   * Get a client from the pool
   * @returns Database client
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Get pool statistics
   * @returns Pool info
   */
  getPoolInfo() {
    return {
      idleCount: this.pool.idleCount,
      totalCount: this.pool.totalCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}
