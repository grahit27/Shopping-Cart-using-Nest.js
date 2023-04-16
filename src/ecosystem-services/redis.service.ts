import { Inject } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
// import { RedisClientType } from "@redis/client";
import { RedisClientType } from "redis";
import { createClient } from "redis";
import redisConfig from "src/config/redis.config";

export class RedisService {
    redis: RedisClientType
    constructor(
        @Inject(redisConfig.KEY)
        private redisConf: ConfigType<typeof redisConfig>
    ) { this.connectRedis(); }
    connectRedis() {
        this.redis = createClient(this.redisConf);
        this.redis.connect();
    }
}

// export class RedisService {
//     client: RedisClientType;
//     constructor(
//         private readonly configService: ConfigService) {
//         this.connect();
//     }

//     async connect() {
//         let client: RedisClientType = createClient(await this.configService.get('redisConfig'))
//         client.connect();
//         this.client = client;
//     }
// }
