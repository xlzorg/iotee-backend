import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { DatabaseService } from './database.service';

const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

@Global()
@Module({
  providers: [
    {
      provide: 'PG_POOL',
      useValue: pool,
    },
    DatabaseService,
  ],
  exports: ['PG_POOL', DatabaseService],
})
export class DatabaseModule {}
