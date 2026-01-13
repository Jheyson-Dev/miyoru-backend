import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ENVIROMENTS } from 'src/config';
import { EmailVerificationService } from './services';
import { MessagingModule } from '../messaging/messaging.module';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/services/users.service';
import { JwtService } from './services/jwt.services';

@Module({
  imports: [
    JwtModule.register({
      secret: ENVIROMENTS.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    MessagingModule,
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtService, EmailVerificationService, UsersService],
  exports: [],
})
export class AuthModule {}
