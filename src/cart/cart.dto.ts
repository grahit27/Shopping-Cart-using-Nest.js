import { ClassSerializerInterceptor, UseInterceptors } from "@nestjs/common";
import { Exclude, Expose } from "class-transformer";
import { IsDate, IsEmail, IsEnum, IsIn, IsNotEmpty, IsNumber, IsObject, IsOptional, IsPositive, isString, IsString, Length, Matches, Max, Min, min, ValidateNested } from "class-validator";
export class cartDTO {
    @IsNumber() @IsPositive() @IsNotEmpty()
    productId: number;
    @IsNumber() @IsNotEmpty() @Min(1) @Max(10)
    quantity: number;
    @IsNumber() @IsNotEmpty() @Min(1)
    userId: number;
}

export class updateCartDTO {
    @IsNumber() @IsNotEmpty() @Min(0) @Max(1000)
    productId: number;

    @IsOptional() @IsNumber() @IsPositive() @Min(0) @Max(1000)
    quantity: number;
}
// Not added yet ( No need of Response DTO)
// @UseInterceptors(ClassSerializerInterceptor)
export class responseCartDataDTO {
    productName: string;
    price: number;
    quantity: number;
    discount: number;
    percentGST: number;
    finalPrice: number;
    @Exclude()
    totalGST: number;
    @Exclude()
    totalPrice: number;
    @Exclude()
    totalPriceAfterDiscount: number;

    createdAt: Date;
    @Expose({ name: 'Insert Date' })// Change created_at to camel case createdAt
    transformCreatedAt() {
        return this.createdAt;
    }
    // constructor(partial: Partial<responseCartDataDTO>) { // Using Partial (native typescript) We can pass any object that resembles to this object
    //     Object.assign(this, partial);
    // }
}

export class responseCheckoutDTO {
    productName: string;
    price: number;
    quantity: number;
    discount: number;
    percentGST: number;
    finalPrice: number;
}
