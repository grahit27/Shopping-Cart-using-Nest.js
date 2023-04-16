import { registerAs } from "@nestjs/config";

export default registerAs('postgresConfig', () => ({
    host: process.env.HOST,
    port: process.env.PORT,
    database: "shopping"
}));