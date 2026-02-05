import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtRefreshAuthGuard extends AuthGuard('jwt-refresh') {
  handleRequest(err, user, info) {
    // Puedes personalizar el lanzamiento de errores aquí
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
