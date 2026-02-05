import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ENVIROMENTS } from 'src/config';
import { Request } from 'express';
import { JwtPayload } from '../interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Extraer token de la cookie 'accessToken'
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          let token = null;
          if (request && request.cookies) {
            token = request.cookies['accessToken'];
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: ENVIROMENTS.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    // Aquí puedes hacer validaciones extra si es necesario (ej: buscar en DB)
    // Lo que retornes aquí se inyectará en request.user

    if (!payload) {
      throw new UnauthorizedException();
    }
    return payload;
  }
}
