import { Body, ClassSerializerInterceptor, Controller, Get, Post, Put, UseInterceptors } from '@nestjs/common';
import { cartDTO, updateCartDTO } from './cart.dto';
import { CartService } from './cart.service';

@Controller('cart')
export class CartController {
    constructor(private readonly cartService: CartService) { }

    @Get('showCart')
    showCart(@Body() body) {
        return this.cartService.showCart(body.userId);
    }
    @Post('addIntoCart')
    addIntoCart(
        @Body() body: cartDTO
    ) {
        return this.cartService.addIntoCart(body.productId, body.quantity, body.userId)
    }
    // Moved to Payment
    // @Get('checkoutCart')
    // checkout() {
    //     return this.cartService.checkout();
    // }
}
