import { ForbiddenException, Inject, NestMiddleware } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { NextFunction, Request, Response } from "express";
import jwtConfig from "src/config/jwt.config";


export class authMiddleware implements NestMiddleware {

    constructor(private jwtService: JwtService,
        @Inject(jwtConfig.KEY)
        private jwtConf: ConfigType<typeof jwtConfig>
    ) { }

    use(req: Request, res: Response, next: NextFunction) {
        const token = req.get('access-token')
        if (!token) throw new ForbiddenException('Access token is missing');
        const payload = this.jwtService.verify(token, { secret: this.jwtConf.secret })
        req['user'] = payload;
        next();
    }
}