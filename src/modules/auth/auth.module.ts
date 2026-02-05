import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ENVIROMENTS } from 'src/config';
import { EmailVerificationService } from './services';
import { MessagingModule } from '../messaging/messaging.module';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/services/users.service';
import { JwtService } from './services/jwt.services';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: ENVIROMENTS.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    MessagingModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtService,
    EmailVerificationService,
    UsersService,
    JwtStrategy,
    JwtRefreshStrategy,
  ],
  exports: [JwtService, JwtStrategy, PassportModule],
})
export class AuthModule {}
