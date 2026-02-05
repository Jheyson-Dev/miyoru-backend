import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ENVIROMENTS } from 'src/config';
import { Request } from 'express';
import { JwtPayload } from '../interfaces';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      // Extraer token de la cookie 'refreshToken'
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          let token = null;
          if (request && request.cookies) {
            token = request.cookies['refreshToken'];
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: ENVIROMENTS.JWT_SECRET,
      passReqToCallback: true, // Para tener acceso a la request en validate si fuera necesario
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    if (!payload) {
      throw new UnauthorizedException();
    }
    // Retornamos el payload tal cual, pero también podríamos retornar el token crudo si lo necesitáramos
    // Al usar passReqToCallback: true, el primer argumento es req
    return { ...payload, refreshToken: req.cookies['refreshToken'] };
  }
}
