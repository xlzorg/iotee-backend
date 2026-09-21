import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [
    {
      provide: 'PG_POOL',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('PG_HOST', '127.0.0.1');
        const port = Number(configService.get<string | number>('PG_PORT', 5433));
        const database = configService.get<string>('PG_DATABASE', 'postgres');
        const user = configService.get<string>('PG_USER', 'postgres');
        const password = String(configService.get<string>('PG_PASSWORD', ''));

        return new Pool({
          host,
          port,
          database,
          user,
          password,
        });
      },
    },
    DatabaseService,
  ],
  exports: ['PG_POOL', DatabaseService],
})
export class DatabaseModule {}