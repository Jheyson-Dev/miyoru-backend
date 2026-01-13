import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto, RegisterDto } from '../dtos/requests';
import bcrypt from 'bcryptjs';
import { HeaderInfo, ValidateLogin } from '../interfaces';
import { EmailVerificationService } from './email_verification.service';
import { MessagingService } from 'src/modules/messaging/messaging.service';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { JwtService } from './jwt.services';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly messagingService: MessagingService,
    private readonly jwtService: JwtService,
  ) {}

  private comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  private async validateLogin(
    password: string,
    validateLogin: ValidateLogin,
  ): Promise<void> {
    const { emailVerified, passwordHash, user } = validateLogin;
    const isPasswordValid = await this.comparePasswords(password, passwordHash);

    if (!isPasswordValid)
      throw new UnauthorizedException('Credenciales inválidas.');
    if (!emailVerified) throw new ForbiddenException('Email no verificado.');
    if (!user.isActive) throw new ForbiddenException('Usuario inactivo.');
  }

  async register(registerDto: RegisterDto) {
    const { userType, displayName, password, ...human } = registerDto;

    const passwordHash = await bcrypt.hash(password, 10);

    const registerUser = await this.prismaService.user.create({
      data: {
        userType,
        displayName,
        humanProfile: {
          create: {
            passwordHash,
            ...human,
          },
        },
      },
    });

    if (registerUser) {
      await this.emailVerificationService.createEmailToken(registerUser.id);

      // const verification = await this.emailVerificationService.createEmailToken(
      //   registerUser.id,
      // );
      // Ahora encviar el correo de verificación
      // await this.messagingService.sendEmail(
      //   human.email,
      //   'Verificación de correo',
      //   `<p>Por favor, verifica tu correo haciendo clic en el siguiente enlace: ${verification.token}</p>`,
      // );
    }

    return registerUser;
  }

  async login(loginDto: LoginDto, userAgentInfo: HeaderInfo) {
    const { emailOrUsername, password } = loginDto;

    const human = await this.prismaService.humanProfile.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
      select: {
        // email: true,
        userId: true,
        emailVerified: true,
        passwordHash: true,
        preferences: true,
        user: {
          select: {
            isActive: true,
            displayName: true,
          },
        },
      },
    });

    if (!human) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    await this.validateLogin(password, human);

    // 1. Generar el token JWT
    const { accessToken } = await this.jwtService.generateAccessToken(
      human.user.displayName,
      emailOrUsername,
      human.userId,
    );
    // 2. Generar el refresh token y asociarlo a la session

    const { refreshToken } = await this.jwtService.generateRefreshToken(
      human.user.displayName,
      emailOrUsername,
      human.preferences,
    );

    // 3. Crear la session

    await this.prismaService.sessions.create({
      data: {
        userId: human.userId,
        deviceInfo: userAgentInfo.device.type,
        ipAddress: userAgentInfo.ip,
        userAgent: userAgentInfo.userAgent,
        expiresAt: new Date(
          Date.now() + 30 * 1000, // 30 días
        ),
        // expiresAt: new Date(
        //   Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 días
        // ),
        location: userAgentInfo.location,
        platform: userAgentInfo.os.name,
        refreshTokens: {
          create: {
            jtiHash: '',
            expiresAt: new Date(
              Date.now() + 30 * 1000, // 30 días
            ),
            // expiresAt: new Date(
            //   Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 días
            // ),
            deviceInfo: userAgentInfo.device.type,
            ipAddress: userAgentInfo.ip,
          },
        },
      },
    });

    return { accessToken, refreshToken };
  }
}
