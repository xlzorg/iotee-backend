import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor(@Inject('PG_POOL') private pool: any) {}

  async findById(userId: number) {
    const client = await this.pool.connect();
    const res = await client.query('SELECT user_id, username, email FROM users WHERE user_id = $1', [userId]);
    client.release();
    return res.rows[0];
  }

  async findAll() {
    const client = await this.pool.connect();
    const res = await client.query('SELECT user_id, username, email FROM users');
    client.release();
    return res.rows;
  }
}
