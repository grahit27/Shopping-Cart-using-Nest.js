import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { productDTO, showProductDTO, updateProductDTO } from './product.dto';
import { ProductService } from './product.service';

@Controller('product')
export class ProductController {
    constructor(private readonly productService: ProductService) { }

    // @UseGuards(JwtAuthGuard)
    @ApiOperation({ description: 'Get all the products' })
    @ApiOkResponse({ type: showProductDTO, description: 'Array of all the products' })
    @Get('showProduct')
    showProduct() {
        return this.productService.showProduct();
    }

    // @UseGuards(JwtAuthGuard)
    @ApiOperation({ description: 'add product to database' })
    @ApiOkResponse({ type: showProductDTO, description: 'the product is inserted' })
    @ApiInternalServerErrorResponse()
    @ApiBody({ type: productDTO })
    @Post('addIntoProduct')
    addIntoProduct(
        @Body() body: productDTO
    ) {
        return this.productService.addIntoProduct(body);
    }

    // @ApiParam({name:'productId',description:'Id of product needed'})
    @ApiOperation({ description: 'update product in database' })
    @ApiOkResponse({ type: showProductDTO, description: 'Updated Product' })
    @ApiInternalServerErrorResponse()
    @ApiBody({ type: updateProductDTO })
    @Put('updateProduct')
    updateProduct(
        @Body() body: updateProductDTO
    ) {
        return this.productService.updateProduct(body);
    }

    // Data Model Endpoint -------------------------------------
    @Get('productTest')
    async getAllProductsFromInventory(@Query('limit') limit: number, @Query('offset') offset: number, @Query('search') search?: string) {
        return await this.productService.getAllProductsFromInventory(limit || 2, offset || 0, search)
    }

    @Post('createProductTest')
    async createProducts(@Body() data) {
        return await this.productService.createProducts(data);
    }
}
