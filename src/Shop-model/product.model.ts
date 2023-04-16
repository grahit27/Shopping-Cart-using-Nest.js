import { BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import * as jf from 'joiful';
import { RedisClientType, RediSearchSchema, SchemaFieldTypes } from 'redis';
import { Pool, QueryResult } from 'pg';
import { v4 } from 'uuid';

// {"price": 20, "category": "JP", "createdAt": 1672745025713, "percentGST": 12, "productName": "Fish83"}

export class ShopifyProduct {
    // Might not need due to serial Primary Key
    // Refer from table
    @jf.number().required()
    productId: number;
    // @jf.string().min(36).max(36).required()
    // productId: string;

    @jf.string().min(3).required()
    productName: string;

    // Refers to Master Table
    @jf.string().min(3).required()
    itemType: string;

    // Refers to Product Table
    @jf.string().min(2).required()
    category: string;

    @jf.number().required()
    price: number;

    @jf.number().valid(12, 15, 18).required()
    percentGST: number;

    @jf.string().min(3).required()
    shopifyId: string;

    @jf.date()
    createdAt: Date;

    @jf.number().valid(0, 1).required()
    enabled: number = 1;

    toJSON(dataOnly: boolean = true): JSON {
        let d: any = {};
        for (let key in this)
            if (['productId', 'enabled'].indexOf(key) < 0 || !dataOnly) { // Product Id and Enabled will not go to the table
                d[key] = this[key];
            }
        return d;
    }

    async save(pool?: Pool, redisClient?: RedisClientType) {
        const valid = new jf.Validator({ abortEarly: false, allowUnknown: true }).validate(this);
        if (valid.error) throw new BadRequestException(valid.error.message);
        if (pool) {
            let d: any = this.toJSON(), pInfo: any = {};
            // let rs: QueryResult<any> = await pool.query("SELECT master_id,data FROM cb.infoMaster WHERE data->>'shopifyId'=$1", [this.shopifyId]).catch((e) => { Logger.log(e); throw new InternalServerErrorException() });
            let rs: QueryResult<any> = await pool.query("SELECT master_id,data FROM shoppinginfomaster WHERE data->>'shopifyId'=$1", [this.shopifyId]).catch((e) => { Logger.log(e); throw new InternalServerErrorException() });
            if (rs.rows[0]) {
                let r = rs.rows[0];
                Object.assign(r.data, d);
                // Reason
                this.productId = rs.rows[0].master_id;
                rs = await pool.query("UPDATE shoppinginfomaster SET data=$2, enabled=$3, type=$4 WHERE master_id=$1", [this.productId, r.data, this.enabled, this.itemType]).catch((e) => { Logger.log(e); throw new InternalServerErrorException() });
            } else {
                // rs = await pool.query("INSERT INTO cb.infoMaster (master_id,type,data) VALUES ($1,$2,$3)", [this.productId, this.itemType, d]).catch((e) => { Logger.log(e); throw new InternalServerErrorException(); });
                rs = await pool.query("INSERT INTO shoppinginfomaster (master_id,type,data) VALUES ($1,$2,$3)", [this.productId, this.itemType, d]).catch((e) => { Logger.log(e); throw new InternalServerErrorException(); });
            }
        }
        if (redisClient) {
            console.log("Data saved in Redis");

            // await redisClient.hSet('product:' + this.productId, ['data', JSON.stringify(this.toJSON(false)), 'search', ShopifyProduct.escapeRedisString((this.name ? this.name : '')), 'productCode', this.productCode, 'itemType', this.itemType, 'stockStatus', this.stockStatus, 'enabled', this.enabled === undefined ? 1 : this.enabled]).catch((e) => { Logger.log(e); throw new InternalServerErrorException() });
            // Save data-jsonb key value pairs in redis.
            await redisClient.hSet('product:' + this.productId, ['data', JSON.stringify(this.toJSON(false)), 'search', ShopifyProduct.escapeRedisString((this.productName ? this.productName : '')), 'type', this.itemType, 'enabled', this.enabled === undefined ? 1 : this.enabled]).catch((e) => { Logger.log(e); throw new InternalServerErrorException() });
        }
    }

    public static async build(r: any, pool?: Pool, redisClient?: RedisClientType): Promise<ShopifyProduct> {
        let model = new ShopifyProduct();
        // if (r.data) r = { master_id: r.master_id, category: r.category, enabled: r.enabled === undefined ? 1 : r.enabled, ...r.data };
        if (r.data) r = { master_id: r.master_id, type: r.itemType, enabled: r.enabled === undefined ? 1 : r.enabled, ...r.data };
        // Reason
        model.productId = r.productId || r.master_id;
        if (!model.productId && !pool) throw new BadRequestException('ID is mandatory');

        // Create Random Id not V4
        // if (!model.productId) model.productId = v4();
        if (!model.productId) model.productId = Math.random() * (1000 - 100) + 100;

        ['productName', 'category', 'itemType', 'price', 'percentGST', 'shopifyId'].map((key) => { if (r[key]) model[key] = r[key] });

        const valid = new jf.Validator({ abortEarly: false, allowUnknown: true }).validate(model);
        if (valid.error) throw new BadRequestException(valid.error.message);
        console.log("Model Created");

        return model;
    }

    // public static async getFromId(productId: string, pool?: Pool, redisClient?: RedisClientType): Promise<ShopifyProduct> {
    public static async getFromId(productId: number, pool?: Pool, redisClient?: RedisClientType): Promise<ShopifyProduct> {
        if (redisClient) {
            // hGetAll with hash_val will return key and value pair linewise seperately. Like passing Product:id will return data in form of 1.price(key) 2. 25(value) etc. Here we get data{}
            let d: any = await redisClient.hGetAll("product:" + productId);
            if (d.data) return await ShopifyProduct.build(JSON.parse(d.data), pool, redisClient);

        }
        //If productId is unavailable then use master_id for searching in Postgres
        if (productId && pool) {
            let rs: QueryResult<any> = await pool.query("SELECT master_id,data,enabled FROM shoppinginfomaster WHERE master_id=$1", [productId]).catch((e) => { Logger.log(e); throw new InternalServerErrorException() });
            if (rs.rows[0]) {
                let r = rs.rows[0];
                return await ShopifyProduct.build(r, pool, redisClient);
            }
        }
        return null;
    }

    public static async searchProduct(queryData, redisClient: RedisClientType, pool?: Pool) {
        let query = '';
        if (!queryData.getDisabledProduct) query += " @enabled:{1}"; // Get enabled products
        if (queryData.searchObj.length) { //If exist then proceed
            queryData.searchObj.map(obj => {
                if (obj.key == 'search') {
                    console.log("obj val", obj.val);

                    let strs = ((obj.value || '') + '').split(/\s|\,/g); // Split from every whitespace character
                    console.log("print s");

                    strs = strs.map((s) => {
                        s = this.escapeRedisString(s);
                        console.log(s, " ");

                        if (s.trim().length) return s + '*';
                    })
                    query += ' @search:' + strs.join('+');
                    console.log("search query->", query);

                }
                else {
                    query += ' @' + obj.key + ':{' + this.escapeRedisString(obj.value) + '}';
                    console.log("Non search query->", query);
                }
            })
        }
        // Limit - total rows and offset: rows to skip from result starting
        let rs = await redisClient.ft.search('idx:product', query, { RETURN: 'data', LIMIT: { from: queryData.offset || 0, size: queryData.limit || 20 } }).catch(e => { Logger.log(e); throw new InternalServerErrorException(); });
        let response = { data: [], total: rs.total, offset: queryData.offset || 0 }
        for (let i = 0; i < rs.documents.length; i++) {
            let resp: any = rs.documents[i].value.data;
            let product = await ShopifyProduct.build(JSON.parse(resp), pool, redisClient);
            if (product) response.data.push(product);
        }
        return response;
    }

    public static async createSearchIndex(redisClient: RedisClientType) {

        // Meaning of idx:product
        await redisClient.ft.dropIndex('idx:product').catch(e => { });
        let schema: RediSearchSchema = {
            'search': SchemaFieldTypes.TEXT,
            // 'productCode': SchemaFieldTypes.TAG,

            'itemType': SchemaFieldTypes.TAG,
            // 'category': SchemaFieldTypes.TAG,

            // 'percentGST': SchemaFieldTypes.TAG,

            // 'stockStatus': SchemaFieldTypes.TAG,
            'enabled': SchemaFieldTypes.TAG,
        }
        await redisClient.ft.create('idx:product', schema, { ON: 'HASH', PREFIX: 'product:' }).catch(e => { Logger.log(e); });

    }

    static escapeRedisString(str: string) {
        return (str + '').replace(/\./g, '\\.').replace(/\-/g, '\\-').replace(/\+/g, '\\+').replace(/\@/g, '\\@').replace(/:/g, '\\:').replace(/\*/g, '\\*').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\[/g, '\\[').replace(/\]/g, '\\]').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\</g, '\\<').replace(/\>/g, '\\>').replace(/\$/g, '\\$').replace(/\^/g, '\\^').replace(/\%/g, '\\%').replace(/\&/g, '\\&').replace(/\"/g, '\\"').replace(/\'/g, "\\'").replace(/\;/g, '\\;').replace(/\!/g, '\\!').replace(/\#/g, '\\#').replace(/\=/g, '\\=').replace(/\~/g, '\\~')
    }
}