import { Global, Inject, Injectable } from '@nestjs/common';
import { ConfigService, ConfigType } from '@nestjs/config';
import { Pool } from 'pg';
import postgresConfig from 'src/config/postgres.config';

@Injectable()
export class PostgresService {
    public pool: Pool;

    constructor(
        @Inject(postgresConfig.KEY)
        private dbConfig: ConfigType<typeof postgresConfig>
    ) { this.connect(); }

    async connect() {
        this.pool = new Pool(this.dbConfig);
    }
}  
