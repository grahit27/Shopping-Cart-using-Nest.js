import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import jwtConfig from './config/jwt.config';
import postgresConfig from './config/postgres.config';
import redisConfig from './config/redis.config';
import { PostgresService } from './ecosystem-services/postgres.service';
import { RedisService } from './ecosystem-services/redis.service';
import { ProductController } from './product/product.controller';
import { ProductService } from './product/product.service';
import { CartController } from './cart/cart.controller';
import { CartService } from './cart/cart.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `${process.cwd()}/environments/.env`,
      isGlobal: true,
      load: [postgresConfig, redisConfig, jwtConfig]
    })],
  controllers: [AppController, ProductController, CartController],
  providers: [AppService, ProductService, PostgresService, RedisService, JwtService, CartService],
})
export class AppModule { }
