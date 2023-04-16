import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PostgresService } from 'src/ecosystem-services/postgres.service';
import { Pool } from 'pg'
import { getErrors } from 'src/utils/getErrors';
import { getResponse } from 'src/utils/getResponse';
import { productDTO, showProductDTO, updateProductDTO } from './product.dto';
import { ShopifyProduct } from 'src/Shop-model/product.model';
// import { RedisClientType } from '@redis/client';
import { RedisClientType } from 'redis';
import { RedisService } from 'src/ecosystem-services/redis.service';


type RedisClient = RedisClientType<Record<string, never>, Record<string, never>>;

@Injectable()
export class ProductService {
    private readonly logger = new Logger(ProductService.name);
    pool: Pool;
    redisClient: RedisClientType;
    constructor(private readonly postgresService: PostgresService, private readonly redisService: RedisService) {
        this.pool = this.postgresService.pool;
        this.redisClient = redisService.redis;
    }
    async showProduct(): Promise<showProductDTO[]> {
        const showResponse = await this.pool.query(`SELECT * FROM product`).catch((error) => {
            this.logger.log(error);
            throw new InternalServerErrorException();
        });
        if (!showResponse.rows.length) throw new InternalServerErrorException();
        return this.showProductResponse(showResponse);
    }

    async addIntoProduct(body) {
        //Check Product Name Exist or not
        const getProductIdResponse = await this.getProductId("productName", body.productName);
        if (getProductIdResponse.rows.length === 0) {
            // Insert product into the cart
            let newData = {
                "productName": body.productName,
                "category": body.category,
                "price": body.price,
                "percentGST": body.percentGST,
                "createdAt": Date.now()
            }
            const insertIntoProductResponse = await this.pool.query(`INSERT INTO product (data) VALUES ($1) RETURNING *;`, [newData]).catch((error) => this.logger.log(error));
            if (insertIntoProductResponse.rows.length === 0) throw new InternalServerErrorException();
            return this.showProductResponse(insertIntoProductResponse);

        } else {
            throw new InternalServerErrorException(`Product already exist`);
        }

    }
    async updateProduct(newData) {
        // Remove Id from the input
        const productId = newData['id']
        delete newData['id']

        // Check Product Id Exist
        const idResponse = await this.checkProductIdExist(productId);
        if (!idResponse)
            throw new InternalServerErrorException(getErrors(102, `Product's Id`))

        const updateProductQuery = `UPDATE product SET data = data::jsonb || $1::jsonb WHERE id = $2 RETURNING *`;
        const updateProductResponse = await this.pool.query(updateProductQuery, [newData, productId]).catch((error) => this.logger.log(error));
        if (!updateProductResponse.rows.length) throw new InternalServerErrorException();
        return this.showProductResponse(updateProductResponse);

    }
    async getProductId(field: string, value: string) {
        const getProductId = await this.pool.query(`SELECT id FROM product WHERE data->>$1 = $2 ;`, [field, value]).catch(error => this.logger.log(error))
        // if (!getProductId.rows.length) return false;
        return getProductId;
    }
    async checkProductIdExist(id: number) {
        const checkProductIdExist = await this.pool.query(`SELECT * FROM product WHERE id=$1;`, [id]).catch(error => this.logger.log(error));
        if (checkProductIdExist.rows.length === 0) throw new InternalServerErrorException(getErrors(102, `Product's Id`))
        else
            return true;
    }
    async showProductResponse(queryResponse) {
        let resp: showProductDTO[] = [];
        queryResponse.rows.map((item) => {
            let obj = new showProductDTO();
            [obj.productId, obj.productName, obj.category, obj.price] = [item.data.productId, item.data.productName, item.data.category, item.data.price];
            resp = [...resp, obj];
        });
        return resp;
    }
    // Data Models related functions ----------------------------------------------------------------

    async getAllProductsFromInventory(limit: number, offset: number, search: string) {
        let productQuery = {
            getDisabledProduct: 0,
            type: 'TAG', // Look into this
            searchObj: [
                // {
                //     key: 'stockStatus',
                //     value: 'active',
                // }
                {
                    key: 'type',
                    value: 'Product',
                }
            ],
            offset,
            limit
        }
        if (search) {
            productQuery.searchObj.push({ key: 'search', value: search });
        }
        let searchData = await ShopifyProduct.searchProduct(productQuery, this.redisClient, this.pool).catch(e => { Logger.log(e); throw new InternalServerErrorException(); })
        searchData.data = searchData.data.map(product => product.toJSON(false))
        return searchData
    }

    async createProducts(data): Promise<ShopifyProduct> {
        // data.name = data.name.replace(/\s+/g, " ").trim();
        // data.sku = data.sku.replace(/\s+/g, '').trim();
        let model = await ShopifyProduct.build(data, this.pool, this.redisClient);
        let rs = await this.pool.query("SELECT master_id FROM shoppinginfomaster WHERE enabled=1 AND data->>'shopifyId' = $1", [data['shopifyId']]).catch((e) => { console.error(e); throw new InternalServerErrorException() });
        if (rs.rows.length) throw new BadRequestException("The product already exists");
        // await this.ingestService.saveProductInMagento(model);
        await model.save(this.pool, this.redisClient);
        return model;
    }



}
