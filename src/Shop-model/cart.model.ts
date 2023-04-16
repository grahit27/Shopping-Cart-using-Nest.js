import { BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import * as jf from 'joiful';
import { RedisClientType } from 'redis';
import { Pool, QueryResult } from 'pg';
import { v4 } from 'uuid';
import { ShopifyProduct } from './product.model';

export class CartItemModel {
    @jf.string()
    itemId: string;

    @jf.number().required() // Changed
    productId: number;

    @jf.object()
    product: ShopifyProduct;

    @jf.number()
    itemQuantity: number;

    @jf.number()
    price: number;

    @jf.number()
    subtotalAmount: number;

    @jf.number()
    totalAmount: number;

    toJSON(dataOnly = true) {
        let d: any = {};
        for (let key in this) if (['product'].indexOf(key) < 0 || !dataOnly) {
            let value: any = this[key];
            if (value instanceof ShopifyProduct) d[key] = (value as ShopifyProduct).toJSON(dataOnly);
            else d[key] = this[key];
        }
        return d;
    }

    public static async build(r: any, pool: Pool, redisClient: RedisClientType): Promise<CartItemModel> {
        let model = new CartItemModel();
        ['cartId', 'itemId', 'productId', 'itemQuantity', 'price', 'subtotalAmount', 'totalAmount'].map((key) => { if (r[key] !== undefined) model[key] = r[key] });
        model.product = await ShopifyProduct.getFromId(model.productId, pool, redisClient);

        const valid = new jf.Validator({ abortEarly: false, allowUnknown: true }).validate(model);
        if (valid.error) throw new BadRequestException(valid.error.message);

        return model;
    }

    public static async buildCartItemFromShopify(cartItem: any, pool: Pool, redisClient: RedisClientType) {
        let model = new CartItemModel();

        model.itemId = cartItem.id;
        model.itemQuantity = cartItem.quantity;
        model.price = cartItem.cost.amountPerQuantity.amount; //
        model.subtotalAmount = cartItem.cost.subtotalAmount.amount; //
        model.totalAmount = cartItem.cost.totalAmount.amount; //

        let productCode = cartItem.merchandise.sku; // Remove This

        let queryData = {
            getDisabledProduct: 0,
            type: 'TAG',
            tagObj: [
                {
                    key: 'productCode',
                    value: productCode
                }
            ],
        }
        let searchData = await ShopifyProduct.searchProduct(queryData, redisClient, pool);

        model.product = searchData.data[0].toJSON(false);
        model.productId = searchData.data[0].productId;

        const valid = new jf.Validator({ abortEarly: false, allowUnknown: true }).validate(model);
        if (valid.error) throw new BadRequestException(valid.error.message);
        return model;
    }
}

export class CartModel {
    @jf.number().required() // Changed
    cartId: number;

    @jf.array()
    items: CartItemModel[] = [];

    @jf.number().required()
    totalQuantity: number;

    @jf.number().required()
    subtotalAmount: number;

    @jf.number().optional()
    taxAmount: number;

    @jf.number().required()
    totalAmount: number;

    @jf.string().isoDate().optional()
    updatedAt: string;

    @jf.string().isoDate().optional()
    createdAt: string;

    // @jf.string().min(3).uri().required()
    // checkoutUrl: string;

    toJSON(dataOnly: boolean = true): JSON {
        let d: any = {};
        for (let key in this) {
            let value: any = this[key];
            if (key == 'items') d.items = this.items.map((item) => item.toJSON(dataOnly)); // Reason
            else d[key] = this[key];
        }
        return d;
    }

    public static async build(r: any, pool?: Pool, redisClient?: RedisClientType): Promise<CartModel> {
        let model = new CartModel();

        model.cartId = r.cartId || r.master_id;
        if (!model.cartId && !pool) throw new BadRequestException('ID is mandatory');
        // if (!model.cartId) model.cartId = v4();
        if (!model.cartId) model.cartId = Math.random() * (1000 - 100) + 100;

        ['cartId', 'totalQuantity', 'subtotalAmount', 'taxAmount', 'totalAmount', 'updatedAt', 'createdAt'].map((key) => model[key] = r[key] !== undefined ? r[key] : model[key]);
        for (let i = 0; i < (r.items || []).length; i++) {
            let item = await CartItemModel.build(r.items[i], pool, redisClient);
            model.items.push(item);
        }

        const valid = new jf.Validator({ abortEarly: false, allowUnknown: true }).validate(model);
        if (valid.error) throw new BadRequestException(valid.error.message);
        return model;
    }

    public static async buildCartFromShopify(cartData: any, pool: Pool, redisClient: RedisClientType) {
        let model = new CartModel();

        // Reason
        for (let i = 0; i < cartData.lines.edges.length; i++) {
            let lineItem = cartData.lines.edges[i].node;
            model.items.push(await CartItemModel.buildCartItemFromShopify(lineItem, pool, redisClient));
        }

        let cartId = cartData.id.split('/')
        model.cartId = cartId[cartId.length - 1]; // need to change 
        model.totalQuantity = cartData.totalQuantity;
        model.subtotalAmount = cartData.cost.subtotalAmount?.amount;
        model.taxAmount = cartData.cost.totalTaxAmount?.amount;
        model.totalAmount = cartData.cost.totalAmount?.amount;

        const valid = new jf.Validator({ abortEarly: false, allowUnknown: true }).validate(model);
        if (valid.error) throw new BadRequestException(valid.error.message);
        return model;
    }
}