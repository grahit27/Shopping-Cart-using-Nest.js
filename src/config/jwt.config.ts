import { registerAs } from "@nestjs/config";

export default registerAs('jwtConfig', () => ({
    secret: process.env.JWT_SECRET,
    ALGO: process.env.JWT_ALGO,
}))