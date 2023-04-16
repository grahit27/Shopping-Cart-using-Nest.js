import { NestApplication } from "@nestjs/core";
import { ApiProperty } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { IsDate, IsEmail, IsEnum, IsIn, IsNotEmpty, IsNumber, IsObject, IsOptional, IsPositive, isString, IsString, Length, Matches, Max, Min, min, ValidateNested } from "class-validator";
// import { Role } from "src/role/role.enum";

export enum GST {
    lowGST = 12,
    midGST = 15,
    highGST = 18
}

export class productDTO {
    @IsString() @IsNotEmpty() @ApiProperty()
    productName: string;
    @IsString() @IsNotEmpty() @ApiProperty()
    category: string;
    @IsNumber() @IsPositive() @Min(10) @Max(1000) @ApiProperty()
    price: number;
    @IsNotEmpty() @IsNumber() @IsEnum(GST) @ApiProperty()
    percentGST: number;
}

export class showProductDTO {
    @IsNumber() @IsNotEmpty() @ApiProperty()
    productId: number;
    @IsString() @IsNotEmpty() @ApiProperty()
    productName: string;
    @IsString() @IsNotEmpty() @ApiProperty()
    category: string;
    @IsNumber() @IsPositive() @Min(10) @Max(1000) @ApiProperty()
    price: number;
    @IsNotEmpty() @IsNumber() @IsEnum(GST) @ApiProperty()
    percentGST: number;
}

export class updateProductDTO {
    @IsNumber() @IsNotEmpty() @Min(0) @Max(1000) @ApiProperty()
    id: number;

    @IsOptional() @IsString() @IsNotEmpty() @ApiProperty()
    productName: string;

    @IsOptional() @IsString() @IsNotEmpty() @ApiProperty()
    category: string;

    @IsOptional() @IsNumber() @IsPositive() @Min(0) @Max(1000) @ApiProperty()
    price: number;

    @IsOptional() @IsNotEmpty() @IsDate() @ApiProperty()
    createdAt: Date;

    @IsOptional() @IsNotEmpty() @IsEnum(GST) @ApiProperty()
    percentGST: GST;

}
