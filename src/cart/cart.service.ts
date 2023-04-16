import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { RedisClientType } from '@redis/client';
import { Pool } from 'pg'
import { PostgresService } from 'src/ecosystem-services/postgres.service';
import { RedisService } from 'src/ecosystem-services/redis.service';
import { getErrors } from 'src/utils/getErrors';
import { responseCartDataDTO, responseCheckoutDTO, updateCartDTO } from './cart.dto';
import { getProductAmount } from './cart.util';

@Injectable()
export class CartService {
    private readonly logger = new Logger(CartService.name);
    pool: Pool;
    redisClient: RedisClientType;
    constructor(private readonly postgresService: PostgresService
        // , private readonly redisService: RedisServic
    ) {
        this.pool = this.postgresService.pool;
        // this.redisClient = this.redisService.client;
    }
    async showCart(userId: number) {
        const showCart = await this.pool.query(`SELECT * FROM cart WHERE userid = $1`, [userId]).catch((error) => this.logger.log(error));
        return this.showCartResponse(showCart)
    }

    async addIntoCart(productId: number, quantity: number, userId: number) {
        // check product Id in cart
        const prodDetails = await this.pool.query(`SELECT data->>'productName' as productname, data->>'price' as price , data->>'percentGST' as percentgst FROM product WHERE id = $1 ;`, [productId]).catch((error) => this.logger.log(error))
        if (!prodDetails.rows.length) throw new InternalServerErrorException(getErrors(102, "Product"));

        // Get discount 
        let getDiscount = await this.pool.query(`SELECT data->>'discount' as discount FROM discount WHERE productid = $1 ;`, [productId]).catch((error) => this.logger.log(error));
        let productDiscount = 0
        if (getDiscount.rows.length) productDiscount = parseInt(getDiscount.rows[0]['discount']);

        const productName = prodDetails.rows[0]['productname'];
        const price = parseInt(prodDetails.rows[0]['price']);
        const percentGST = parseInt(prodDetails.rows[0]['percentgst']);
        const discount = productDiscount;

        const checkUserId = await this.pool.query(`SELECT id FROM cart WHERE userid = $1`, [userId]).catch((e) => this.logger.log(e));
        if (!checkUserId) throw new InternalServerErrorException(getErrors(102, "Can't search User"));


        // If userId found
        if (checkUserId.rows.length !== 0) {
            const cartId = checkUserId.rows[0]['id'];
            // check product Id in cart
            const checkProductId = await this.pool.query(`SELECT * FROM(SELECT jsonb_array_elements(data)::jsonb as allproducts FROM cart WHERE id = $1) as result WHERE (result.allproducts->>'productId')::int=$2;`, [cartId, productId]).catch((e) => this.logger.log(e));
            if (!checkProductId) throw new InternalServerErrorException(getErrors(102, "Can't search User's Product in Cart"));

            // if productId found in cart update the data
            if (checkProductId.rows.length !== 0) {
                // Get product Old Quantitty
                const productDetail = checkProductId.rows[0]['allproducts']['productData'];
                quantity = quantity + parseInt(productDetail['quantity']);
                if (quantity <= 0)
                    throw new InternalServerErrorException("Total Quantity should be than 0")
                // Update the prices
                let productAmountData = await getProductAmount(price, percentGST, discount, quantity, productName);
                const finalProductData = {
                    productId: productId,
                    productData: productAmountData
                }
                // Get All products from User in a Cart
                const getAllProducts = await this.pool.query(`SELECT jsonb_array_elements(data)::jsonb as allproducts FROM cart  WHERE id = $1;`, [cartId]).catch((e) => this.logger.log(e));
                if (!getAllProducts) throw new InternalServerErrorException(getErrors(102, "Can't get User's Product in Cart"));
                // Add Changed Product data in the cart
                const allProds = getAllProducts.rows;
                let finalAllproducts = [];
                allProds.map((product) => {
                    if (product['allproducts']['productId'] == productId) {
                        finalAllproducts.push(finalProductData)
                    }
                    else {
                        finalAllproducts.push(product['allproducts'])
                    }

                })
                const updateCartResponse = await this.pool.query(`UPDATE cart SET data = $1 WHERE id = $2 RETURNING *;`, [JSON.stringify(finalAllproducts), cartId]).catch((error) => this.logger.log(error));
                if (!updateCartResponse) throw new InternalServerErrorException("Cart Not Updated");
                return updateCartResponse.rows;
            }
            else {
                // if productId not found, insert in Data
                let productAmountData = await getProductAmount(price, percentGST, discount, quantity, productName);
                const finalProductData = {
                    productId: productId,
                    productData: productAmountData
                }
                // Get All products from User in a Cart
                const insertUserProduct = await this.pool.query(`UPDATE cart SET data = data || $1 WHERE id = $2 RETURNING *;`, [JSON.stringify(finalProductData), cartId]).catch((e) => this.logger.log(e));
                if (!insertUserProduct) throw new InternalServerErrorException("New Product not Inserted");
                return insertUserProduct.rows;
            }
        }
        else {
            // User not Found, Just Insert the data
            let productAmountData = await getProductAmount(price, percentGST, discount, quantity, productName);
            const finalProductData = {
                productId: productId,
                productData: productAmountData
            }
            // Get All products from User in a Cart
            let finalAllproducts = [];
            finalAllproducts.push(finalProductData);
            const insertUserProduct = await this.pool.query(`INSERT INTO cart(userid,data) VALUES($1,$2) RETURNING *;`, [userId, JSON.stringify(finalAllproducts)]).catch((e) => this.logger.log(e));
            if (!insertUserProduct) throw new InternalServerErrorException("Cant Insert New user to cart");
            return insertUserProduct.rows;
        }
    }


    // Moved to Payment Section
    // async checkout() {
    //     const chekoutAmount = `SELECT SUM((data->>'totalPrice')::double precision) AS total_sum,
    //     SUM((data->>'totalPriceAfterDiscount')::double precision) AS after_discount ,
    //     SUM((data->>'totalGST')::double precision) AS total_GST ,
    //     SUM((data->>'finalPrice')::double precision) AS final_price  FROM cart;`
    //     const checkoutAmountResponse = await this.pool.query(chekoutAmount).catch((error) => this.logger.log(error));
    //     if (!checkoutAmountResponse || !checkoutAmountResponse.rows) throw new InternalServerErrorException("Can't Checkout");
    //     let obj = new responseCheckoutDTO();
    //     let resp: responseCartDataDTO[] = [];
    //     checkoutAmountResponse.rows.map((item) => {
    //         let obj = new responseCartDataDTO();
    //         obj = item;
    //         resp = [...resp, obj];
    //     });
    //     // return checkoutAmountResponse.rows;
    //     return resp;
    // }
    // Not Implemented yet
    async showCartResponse(queryResponse) {
        let resp: responseCartDataDTO[] = [];
        queryResponse.rows.map((item) => {
            let obj = new responseCartDataDTO();
            // [obj.productName, obj.price, obj.quantity, obj.discount, obj.percentGST, obj.finalPrice] = [item.data.productName, item.data.price, item.data.quantity, item.data.discount, item.data.percentGST, item.data.finalPrice];
            obj = item;
            resp = [...resp, obj];
        });
        return resp;
    }

}
