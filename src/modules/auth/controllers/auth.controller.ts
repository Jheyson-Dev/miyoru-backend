import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { Public } from 'src/shared/decorators/public.decorator';
import { ApiCommonResponses } from 'src/shared/swagger/api-common-responses.decorator';
import { LoginDto, RegisterDto } from '../dtos/requests';
import { ApiSuccessResponseDto } from 'src/shared/dtos';
import { AuthService, EmailVerificationService } from '../services';
import type { CustomRequest } from 'src/shared/interfaces';
import { getHeaderInfo } from '../utils';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('AUTH')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  @Public()
  @ApiCommonResponses()
  @ApiBody({ type: RegisterDto })
  @Post('/register')
  async register(@Body() registerDto: RegisterDto) {
    const registerUser = await this.authService.register(registerDto);
    return new ApiSuccessResponseDto({
      success: true,
      message: 'Usuario registrado exitosamente.',
      data: registerUser,
    });
  }

  @Public()
  @ApiCommonResponses()
  @ApiBody({ type: LoginDto })
  @Post('/login')
  async login(@Body() loginDto: LoginDto, @Request() request: CustomRequest) {
    const userAgentInfo = getHeaderInfo(request);

    const login = await this.authService.login(loginDto, userAgentInfo);

    return new ApiSuccessResponseDto({
      success: true,
      message: 'Usuario autenticado exitosamente.',
      data: login,
    });
  }

  @Public()
  @ApiCommonResponses()
  @ApiParam({
    name: 'token',
    type: 'string',
    description: 'Email verification token',
  })
  @Get('/validate-email/:token')
  async validateEmailToken(@Param('token') token: string) {
    console.log('Validating token:', token);
    const validateToken =
      await this.emailVerificationService.verifyToken(token);

    return new ApiSuccessResponseDto({
      success: true,
      message: 'Token de verificación de email validado.',
      data: validateToken,
    });
  }

  @Post('/refresh-token')
  refreshToken() {
    return {
      message: 'Token refreshed successfully',
    };
  }

  @Post('/logout')
  logout() {
    return {
      message: 'User logged out successfully',
    };
  }

  @Post('forgot-password')
  forgotPassword() {
    return {
      message: 'Password reset link sent successfully',
    };
  }

  @Post('reset-password')
  resetPassword() {
    return {
      message: 'Password reset successfully',
    };
  }

  @Get('/me')
  getProfile() {
    return {
      message: 'User profile fetched successfully',
    };
  }
}
