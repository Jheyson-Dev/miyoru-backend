import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiBody, ApiCookieAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from 'src/shared/guards/jwt-refresh-auth.guard';
import { Public } from 'src/shared/decorators/public.decorator';
import { ApiCommonResponses } from 'src/shared/swagger/api-common-responses.decorator';
import { LoginDto, RegisterDto } from '../dtos/requests';
import { ApiSuccessResponseDto } from 'src/shared/dtos';
import { AuthService, EmailVerificationService } from '../services';
import type { CustomRequest } from 'src/shared/interfaces';
import { getHeaderInfo } from '../utils';
import { ApiOkResponseWithData } from 'src/shared/swagger/api-ok-responses-with-data.decorator';
import { AuthResponseDto, LogoutResponseDto } from '../dtos/responses';
import { UserPresenter } from '../presenter';

/**
 * Controlador de autenticación y gestión de sesiones
 *
 * @description
 * Este controlador maneja todas las operaciones relacionadas con la autenticación de usuarios,
 * incluyendo registro, login, logout, verificación de email, gestión de tokens de refresco
 * y administración de sesiones activas. Por defecto, todas las rutas requieren autenticación
 * JWT excepto aquellas marcadas explícitamente con el decorador @Public().
 *
 * @remarks
 * - Utiliza JWT (JSON Web Tokens) para la autenticación
 * - Implementa refresh tokens para mantener sesiones activas
 * - Soporta múltiples sesiones simultáneas por usuario
 * - Incluye verificación de email mediante tokens
 * - Proporciona endpoints administrativos para revocar sesiones
 *
 * @decorator UseGuards - Aplica JwtAuthGuard globalmente a todas las rutas del controlador
 * @decorator ApiBearerAuth - Documenta que las rutas requieren autenticación Bearer en Swagger
 * @decorator ApiTags - Agrupa las rutas bajo la etiqueta 'AUTH' en la documentación Swagger
 * @decorator Controller - Define el prefijo de ruta base como '/auth'
 *
 * @export
 * @class AuthController
 * @since 1.0.0
 * @author Miyoru Backend Team
 */
@UseGuards(JwtAuthGuard)
@ApiTags('AUTH')
@Controller('auth')
export class AuthController {
  /**
   * Constructor del controlador de autenticación
   *
   * @description
   * Inyecta las dependencias necesarias para manejar la lógica de autenticación
   * y verificación de email.
   *
   * @param {AuthService} authService - Servicio principal de autenticación que maneja registro, login, logout y gestión de sesiones
   * @param {EmailVerificationService} emailVerificationService - Servicio para verificar tokens de confirmación de email
   *
   * @memberof AuthController
   */
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  /**
   * Establece las cookies de autenticación en la respuesta
   *
   * @private
   * @param {Response} res - Objeto de respuesta Express
   * @param {string} accessToken - Token de acceso JWT
   * @param {string} refreshToken - Token de refresco JWT
   */
  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    };

    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, cookieOptions);
  }

  /**
   * Elimina las cookies de autenticación de la respuesta
   *
   * @private
   * @param {Response} res - Objeto de respuesta Express
   */
  private clearAuthCookies(res: Response): void {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
  }

  /**
   * Registra un nuevo usuario en el sistema
   *
   * @description
   * Crea un nuevo usuario de tipo HUMAN con su perfil asociado usando Nested Writes.
   * Hashea la contraseña, genera token de verificación de email, y envía correo de
   * confirmación. El usuario se crea inactivo hasta que verifique su email.
   * No retorna tokens JWT (requiere verificación de email primero).
   *
   * @decorator @Post('/register') - Endpoint público de registro
   * @param {RegisterDto} registerDto - Datos del usuario:
   * - displayName: Nombre a mostrar
   * - username: Nombre de usuario único
   * - fullName: Nombre completo
   * - email: Correo electrónico único
   * - password: Contraseña (será hasheada)
   * @returns {Promise<ApiSuccessResponseDto<AuthResponseDto>>} Estructura de respuesta:
   * - success: true
   * - message: "Usuario registrado exitosamente."
   * - data: { userType, displayName, avatarUrl, isActive: false, createdAt }
   *
   * @example
   * // POST /auth/register
   * // Body: { displayName: "Juan", username: "juan123", fullName: "Juan Pérez", email: "juan@example.com", password: "secreto123" }
   * // Response: { success: true, message: "...", data: { userType: "HUMAN", isActive: false, ... } }
   *
   * @throws {ConflictException} Email o username ya registrado
   * @throws {BadRequestException} Datos de entrada inválidos
   * @security
   * - Password hasheado con bcrypt (10 salt rounds)
   * - Usuario creado inactivo (isActive: false)
   * - Token de verificación enviado por email
   * - Nested Write garantiza atomicidad
   * - No retorna tokens hasta verificar email
   *
   * @memberof AuthController
   * @since 1.0.0
   */
  @Public()
  @ApiCommonResponses()
  @ApiBody({ type: RegisterDto })
  @ApiOkResponseWithData(AuthResponseDto, 'Usuario registrado exitosamente.')
  @Post('/register')
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<ApiSuccessResponseDto<AuthResponseDto>> {
    const registerUser = await this.authService.register(registerDto);

    // ========================================
    // PASO 1: Devolver respuesta al cliente
    // ========================================
    return new ApiSuccessResponseDto({
      success: true,
      message: 'Usuario registrado exitosamente.',
      data: UserPresenter.toAuthResponseDto(registerUser),
    });
  }

  /**
   * Autentica un usuario existente
   *
   * @description
   * Valida las credenciales del usuario (email/username + password), verifica que
   * el email esté confirmado y la cuenta activa. Genera un par de tokens JWT
   * (access + refresh) y los almacena en cookies HttpOnly. Implementa Token Rotation
   * para sesiones existentes del mismo dispositivo.
   *
   * @decorator @Post('/login') - Endpoint público de autenticación
   * @param {LoginDto} loginDto - Credenciales del usuario (emailOrUsername, password)
   * @param {CustomRequest} req - Request de Express con headers de dispositivo
   * @param {Response} res - Response de Express para establecer cookies
   * @returns {Promise<ApiSuccessResponseDto<AuthResponseDto>>} Estructura de respuesta:
   * - success: true
   * - message: "Usuario autenticado exitosamente."
   * - data: { userType, displayName, avatarUrl, isActive, createdAt }
   * + Cookies: accessToken (15min), refreshToken (7d)
   *
   * @example
   * // POST /auth/login
   * // Body: { emailOrUsername: "juan@example.com", password: "secreto123" }
   * // Response: { success: true, message: "...", data: { ... } }
   * // Set-Cookie: accessToken=...; refreshToken=...
   *
   * @throws {UnauthorizedException} Usuario no encontrado o contraseña incorrecta
   * @throws {ForbiddenException} Email no verificado o cuenta inactiva
   * @security
   * - Contraseñas hasheadas con bcrypt (10 salt rounds)
   * - Tokens JWT firmados con HMAC SHA-256
   * - JTI hasheado con SHA-256 antes de almacenar en BD
   * - Token Rotation: revoca refresh token anterior al generar uno nuevo
   * - Cookies HttpOnly, Secure (prod), SameSite=Lax
   *
   * @memberof AuthController
   * @since 1.0.0
   */
  @Public()
  @ApiCommonResponses()
  @ApiOkResponseWithData(AuthResponseDto, 'Usuario autenticado exitosamente.')
  @ApiBody({ type: LoginDto })
  @Post('/login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: CustomRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiSuccessResponseDto<AuthResponseDto>> {
    // ========================================
    // PASO 1: Extraer información del dispositivo/navegador
    // ========================================
    const userAgentInfo = getHeaderInfo(req);

    // ========================================
    // PASO 2: Autenticar usuario y generar tokens
    // ========================================
    const { accessToken, refreshToken, user } = await this.authService.login(
      loginDto,
      userAgentInfo,
    );

    // ========================================
    // PASO 3: Establecer tokens como cookies HttpOnly
    // ========================================
    this.setAuthCookies(res, accessToken, refreshToken);

    // ========================================
    // PASO 4: Retornar respuesta exitosa con datos del usuario
    // ========================================
    return new ApiSuccessResponseDto({
      success: true,
      message: 'Usuario autenticado exitosamente.',
      data: UserPresenter.toAuthResponseDto(user),
    });
  }

  /**
   * Verifica el email del usuario y realiza auto-login
   *
   * @description
   * Valida el token de verificación de email, marca el email como verificado,
   * activa la cuenta del usuario (isActive: true), y realiza un auto-login
   * automático generando tokens JWT y estableciéndolos en cookies. Esto proporciona
   * una experiencia fluida: el usuario hace clic en el link del email y queda
   * automáticamente autenticado.
   *
   * @decorator @Get('/validate-email/:token') - Endpoint público de verificación
   * @param {string} token - Token de verificación enviado por email
   * @param {CustomRequest} req - Request de Express con headers de dispositivo
   * @param {Response} res - Response de Express para establecer cookies
   * @returns {Promise<ApiSuccessResponseDto<AuthResponseDto>>} Estructura de respuesta:
   * - success: true
   * - message: "Email verificado y sesión iniciada exitosamente."
   * - data: { userType, displayName, avatarUrl, isActive: true, createdAt }
   * + Cookies: accessToken (15min), refreshToken (7d)
   *
   * @example
   * // GET /auth/validate-email/abc123xyz
   * // Response: { success: true, message: "...", data: { isActive: true, ... } }
   * // Set-Cookie: accessToken=...; refreshToken=...
   *
   * @throws {NotFoundException} Token no encontrado o ya usado
   * @throws {BadRequestException} Token expirado (más de 1 hora)
   * @security
   * - Token de verificación de un solo uso
   * - Token expira en 1 hora
   * - Marca email como verificado (emailVerified: true)
   * - Activa cuenta automáticamente (isActive: true)
   * - Auto-login sin requerir contraseña
   * - Genera tokens JWT con misma seguridad que login normal
   *
   * @memberof AuthController
   * @since 1.0.0
   */
  @Public()
  @ApiCommonResponses()
  @ApiOkResponseWithData(AuthResponseDto, 'Usuario autenticado exitosamente.')
  @ApiParam({
    name: 'token',
    type: 'string',
    description: 'Email verification token',
  })
  @Get('/validate-email/:token')
  async validateEmailToken(
    @Param('token') token: string,
    @Req() req: CustomRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiSuccessResponseDto<AuthResponseDto>> {
    // ========================================
    // PASO 1: Extraer información del dispositivo
    // ========================================
    const userAgentInfo = getHeaderInfo(req);

    // ========================================
    // PASO 2: Verificar token de email
    // ========================================
    // EmailVerificationService.verifyToken:
    // - Valida que el token exista y no haya expirado
    // - Marca email como verificado (emailVerified: true)
    // - Activa la cuenta del usuario (isActive: true)
    // - Marca el token como usado (verified: true) - NO lo elimina
    // - Retorna el userId
    const userId = await this.emailVerificationService.verifyToken(token);

    // ========================================
    // PASO 3: Auto-login después de verificación
    // ========================================
    // loginAfterVerification crea sesión sin validar contraseña
    const { accessToken, refreshToken, user } =
      await this.authService.loginAfterVerification(
        userId as string,
        userAgentInfo,
      );

    // ========================================
    // PASO 4: Establecer tokens como cookies HttpOnly
    // ========================================
    this.setAuthCookies(res, accessToken, refreshToken);

    // ========================================
    // PASO 5: Retornar respuesta exitosa
    // ========================================
    return new ApiSuccessResponseDto({
      success: true,
      message: 'Email verificado y sesión iniciada exitosamente.',
      data: UserPresenter.toAuthResponseDto(user),
    });
  }

  /**
   * Renueva los tokens de autenticación
   *
   * @description
   * Implementa Token Rotation para renovar tokens JWT. Extrae el refresh token de las
   * cookies, lo valida, lo revoca inmediatamente (uso único), y genera un nuevo par
   * de tokens (access + refresh). Los nuevos tokens se establecen en cookies HttpOnly.
   * Esto permite mantener la sesión activa sin requerir credenciales nuevamente.
   *
   * @decorator @Post('/refresh-token') - Endpoint público con guard de refresh token
   * @param {CustomRequest} req - Request de Express con cookies
   * @param {Response} res - Response de Express para establecer nuevas cookies
   * @returns {Promise<ApiSuccessResponseDto<AuthResponseDto>>} Estructura de respuesta:
   * - success: true
   * - message: "Tokens renovados exitosamente."
   * - data: { userType, displayName, avatarUrl, isActive, createdAt }
   * + Cookies: accessToken (15min), refreshToken (7d) - nuevos
   *
   * @example
   * // POST /auth/refresh-token
   * // Cookie: refreshToken=eyJ...
   * // Response: { success: true, message: "...", data: { ... } }
   * // Set-Cookie: accessToken=...; refreshToken=... (nuevos tokens)
   *
   * @throws {UnauthorizedException} Refresh token inválido, revocado o expirado
   * @throws {UnauthorizedException} Sesión asociada no existe
   * @security
   * - Refresh token de un solo uso (one-time use)
   * - Token anterior se revoca inmediatamente
   * - Nuevo JTI generado para cada rotación
   * - JTI hasheado con SHA-256
   * - Nuevos tokens válidos por 15min (access) y 7d (refresh)
   * - Cookies HttpOnly, Secure (prod), SameSite=Lax
   *
   * @memberof AuthController
   * @since 1.0.0
   */

  @Public()
  @UseGuards(JwtRefreshAuthGuard)
  @Post('/refresh-token')
  async refreshToken(
    @Req() req: CustomRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiSuccessResponseDto<AuthResponseDto>> {
    // ========================================
    // PASO 1: Extraer refreshToken de la cookie
    // ========================================
    // JwtRefreshAuthGuard ya validó la firma del JWT
    // Aquí solo extraemos el valor de la cookie
    const oldRefreshToken = req.cookies['refreshToken'];

    // ========================================
    // PASO 2: Rotar tokens (Token Rotation)
    // ========================================
    // AuthService.refreshToken:
    // - Valida que el token no esté revocado ni expirado
    // - Revoca el token anterior (uso único)
    // - Genera nuevo JTI
    // - Crea nuevo par de tokens (access + refresh)
    // - Almacena el nuevo refresh token en la BD
    const { accessToken, refreshToken, user } =
      await this.authService.refreshToken(oldRefreshToken);

    // ========================================
    // PASO 3: Actualizar cookies con los nuevos tokens
    // ========================================
    // Reemplaza las cookies anteriores con los nuevos tokens
    this.setAuthCookies(res, accessToken, refreshToken);

    // ========================================
    // PASO 4: Retornar respuesta exitosa
    // ========================================
    return new ApiSuccessResponseDto({
      success: true,
      message: 'Tokens renovados exitosamente.',
      data: UserPresenter.toAuthResponseDto(user),
    });
  }

  /**
   * Cierra la sesión del usuario
   *
   * @description
   * Invalida el refresh token en la base de datos y limpia las cookies de autenticación.
   * Implementa un patrón de "logout permisivo": siempre limpia las cookies del cliente
   * y retorna éxito, incluso si el token ya estaba revocado o no existe. Esto previene
   * errores en el frontend cuando el usuario intenta cerrar sesión múltiples veces.
   *
   * @decorator @Post('/logout') - Endpoint público de cierre de sesión
   * @param {Request} req - Request de Express con cookies
   * @param {Response} res - Response de Express para limpiar cookies
   * @returns {Promise<ApiSuccessResponseDto<LogoutResponseDto>>} Estructura de respuesta:
   * - success: true
   * - message: "Usuario desconectado exitosamente."
   * - data: { loggedOutAt: timestamp }
   *
   * @example
   * // POST /auth/logout
   * // Cookie: refreshToken=eyJ...
   * // Response: { success: true, message: "...", data: { loggedOutAt: "2024-01-15T10:30:00Z" } }
   * // Set-Cookie: accessToken=; refreshToken=; (cookies eliminadas)
   *
   * @throws {UnauthorizedException} No se proporciona refresh token en cookies
   * @security
   * - Logout permisivo: retorna éxito incluso si token ya revocado
   * - Marca refresh token como revocado en BD
   * - Establece revokedAt timestamp
   * - Limpia cookies del cliente (accessToken y refreshToken)
   * - No revoca sesión completa (permite múltiples dispositivos)
   *
   * @memberof AuthController
   * @since 1.0.0
   */
  @Public()
  @Post('/logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiSuccessResponseDto<LogoutResponseDto>> {
    // ========================================
    // PASO 1: Extraer refreshToken de la cookie
    // ========================================
    const refreshToken = req.cookies['refreshToken'];

    // ========================================
    // PASO 2: Intentar revocar el token en el servidor (permisivo)
    // ========================================
    // Try-catch para hacer el logout permisivo:
    // - Si el token existe y es válido: se revoca en la BD
    // - Si el token no existe o es inválido: continuamos igual
    // Esto asegura que el logout siempre funcione desde la perspectiva del cliente
    if (refreshToken) {
      try {
        // AuthService.logout:
        // - Verifica el JWT y extrae el JTI
        // - Revoca el refresh token en la BD
        // - Marca la sesión como expirada
        await this.authService.logout(refreshToken);
      } catch (error) {
        // Si el token ya no existe o es inválido, continuamos con la limpieza
        // No lanzamos error porque el objetivo (cerrar sesión) se cumple igual
      }
    }

    // ========================================
    // PASO 3: Limpiar cookies del navegador (SIEMPRE)
    // ========================================
    // clearAuthCookies elimina ambas cookies con las mismas opciones
    // que se usaron para crearlas (necesario para que funcione correctamente)
    this.clearAuthCookies(res);

    // ========================================
    // PASO 4: Retornar respuesta exitosa con timestamp
    // ========================================
    const loggedOutAt = new Date();

    return new ApiSuccessResponseDto({
      success: true,
      message: 'Usuario desconectado exitosamente.',
      data: { loggedOutAt },
    });
  }

  /**
   * Obtiene todas las sesiones activas de un usuario
   *
   * @description
   * Recupera la lista completa de sesiones activas asociadas a un usuario específico.
   * Cada sesión incluye información sobre el dispositivo, navegador, ubicación,
   * fecha de creación y última actividad.
   *
   * @decorator Public - Marca esta ruta como pública (no requiere autenticación previa)
   * @decorator Get - Define el método HTTP GET en la ruta '/sessions/:userId'
   *
   * @param {string} userId - ID único del usuario del cual se desean obtener las sesiones
   *
   * @returns {Promise<ApiSuccessResponseDto>} Respuesta con la estructura:
   *  - success: true
   *  - message: Mensaje de éxito en español
   *  - data: Array de objetos con información de cada sesión activa
   *
   * @example
   * // GET /auth/sessions/507f1f77bcf86cd799439011
   * // Response:
   * // {
   * //   "success": true,
   * //   "message": "Sesiones obtenidas exitosamente.",
   * //   "data": [
   * //     {
   * //       "sessionId": "...",
   * //       "device": "Chrome on Windows",
   * //       "ipAddress": "192.168.1.1",
   * //       "createdAt": "2024-01-15T10:30:00Z",
   * //       "lastActivity": "2024-01-15T14:20:00Z"
   * //     }
   * //   ]
   * // }
   *
   * @throws {NotFoundException} Si el usuario no existe
   * @throws {BadRequestException} Si el ID del usuario es inválido
   *
   * @async
   * @method getSessions
   * @memberof AuthController
   * @since 1.0.0
   */
  @Public()
  @Get('/sessions/:userId')
  async getSessions(@Param('userId') userId: string) {
    // ========================================
    // PASO 1: Obtener sesiones
    // ========================================
    const sessions = await this.authService.getUserSessions(userId);

    // ========================================
    // PASO 2: Retornar respuesta
    // ========================================
    return new ApiSuccessResponseDto({
      success: true,
      message: 'Sesiones obtenidas exitosamente.',
      data: sessions,
    });
  }

  /**
   * Cierra una sesión específica por su ID
   *
   * @description
   * Invalida y cierra una sesión específica identificada por su sessionId.
   * Esto permite al usuario cerrar sesiones individuales en dispositivos específicos
   * sin afectar otras sesiones activas.
   *
   * @decorator Public - Marca esta ruta como pública (no requiere autenticación previa)
   * @decorator Get - Define el método HTTP GET en la ruta '/sessions/close/:sessionId'
   *
   * @param {string} sessionId - ID único de la sesión que se desea cerrar
   *
   * @returns {Promise<ApiSuccessResponseDto>} Respuesta con la estructura:
   *  - success: true
   *  - message: Mensaje de éxito en español
   *  - data: Información sobre la sesión cerrada
   *
   * @example
   * // GET /auth/sessions/close/65a1b2c3d4e5f6789abcdef0
   * // Response:
   * // {
   * //   "success": true,
   * //   "message": "Sesiones cerradas exitosamente.",
   * //   "data": { "sessionId": "65a1b2c3d4e5f6789abcdef0", "closed": true }
   * // }
   *
   * @throws {NotFoundException} Si la sesión no existe
   * @throws {BadRequestException} Si el ID de la sesión es inválido
   *
   * @async
   * @method closeSessionBySessionId
   * @memberof AuthController
   * @since 1.0.0
   */
  @Public()
  @Get('/sessions/close/:sessionId')
  async closeSessionBySessionId(@Param('sessionId') sessionId: string) {
    // ========================================
    // PASO 1: Ejecutar cierre de sesión
    // ========================================
    const closeSession = await this.authService.closeSessionById(sessionId);

    // ========================================
    // PASO 2: Retornar respuesta exitosa
    // ========================================
    return new ApiSuccessResponseDto({
      success: true,
      message: 'Sesiones cerradas exitosamente.',
      data: closeSession,
    });
  }

  /**
   * Cierra todas las sesiones excepto la actual
   *
   * @description
   * Invalida y cierra todas las sesiones activas del usuario excepto la sesión
   * asociada al refresh token proporcionado. Útil para cerrar sesiones en otros
   * dispositivos manteniendo activa la sesión actual.
   *
   * @decorator Public - Marca esta ruta como pública (no requiere autenticación previa)
   * @decorator Get - Define el método HTTP GET en la ruta '/sessions/close-others/:refreshToken'
   *
   * @param {string} refreshToken - Refresh token de la sesión que se desea mantener activa
   *
   * @returns {Promise<ApiSuccessResponseDto>} Respuesta con la estructura:
   *  - success: true
   *  - message: Mensaje de éxito en español
   *  - data: Información sobre las sesiones cerradas (cantidad, IDs, etc.)
   *
   * @example
   * // GET /auth/sessions/close-others/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   * // Response:
   * // {
   * //   "success": true,
   * //   "message": "Otras sesiones cerradas exitosamente.",
   * //   "data": { "closedSessions": 3, "currentSession": "..." }
   * // }
   *
   * @throws {UnauthorizedException} Si el refresh token es inválido
   * @throws {NotFoundException} Si la sesión asociada al token no existe
   *
   * @async
   * @method closeOtherSessions
   * @memberof AuthController
   * @since 1.0.0
   */

  @Public()
  @Get('/sessions/close-others/:refreshToken')
  async closeOtherSessions(@Param('refreshToken') refreshToken: string) {
    // ========================================
    // PASO 1: Ejecutar cierre de otras sesiones
    // ========================================
    const result =
      await this.authService.closeAllSessionsExceptCurrent(refreshToken);

    // ========================================
    // PASO 2: Retornar respuesta exitosa
    // ========================================
    return new ApiSuccessResponseDto({
      success: true,
      message: 'Otras sesiones cerradas exitosamente.',
      data: result,
    });
  }

  /**
   * Inicia el proceso de recuperación de contraseña
   *
   * @description
   * Genera y envía un enlace de recuperación de contraseña al email del usuario.
   * El enlace contiene un token temporal que permite al usuario restablecer su contraseña.
   *
   * @decorator Post - Define el método HTTP POST en la ruta '/forgot-password'
   *
   * @returns {Object} Objeto con mensaje de confirmación
   *
   * @example
   * // POST /auth/forgot-password
   * // Body: { "email": "usuario@ejemplo.com" }
   * // Response:
   * // {
   * //   "message": "Password reset link sent successfully"
   * // }
   *
   * @throws {NotFoundException} Si el email no está registrado
   * @throws {BadRequestException} Si el formato del email es inválido
   *
   * @todo Implementar la lógica completa de envío de email
   * @todo Agregar decoradores de Swagger para documentar request/response
   * @todo Agregar DTO para validar el email en el body
   * @todo Implementar respuesta estandarizada con ApiSuccessResponseDto
   *
   * @method forgotPassword
   * @memberof AuthController
   * @since 1.0.0
   */
  @Post('forgot-password')
  forgotPassword() {
    return {
      message: 'Password reset link sent successfully',
    };
  }

  /**
   * Restablece la contraseña del usuario
   *
   * @description
   * Permite al usuario establecer una nueva contraseña utilizando el token de recuperación
   * enviado previamente a su email. El token debe ser válido y no haber expirado.
   *
   * @decorator Post - Define el método HTTP POST en la ruta '/reset-password'
   *
   * @returns {Object} Objeto con mensaje de confirmación
   *
   * @example
   * // POST /auth/reset-password
   * // Body: { "token": "abc123...", "newPassword": "nuevaContraseña123" }
   * // Response:
   * // {
   * //   "message": "Password reset successfully"
   * // }
   *
   * @throws {BadRequestException} Si el token es inválido o ha expirado
   * @throws {BadRequestException} Si la nueva contraseña no cumple los requisitos
   * @throws {NotFoundException} Si el usuario asociado al token no existe
   *
   * @todo Implementar la lógica completa de reseteo de contraseña
   * @todo Agregar decoradores de Swagger para documentar request/response
   * @todo Agregar DTO para validar token y nueva contraseña
   * @todo Implementar respuesta estandarizada con ApiSuccessResponseDto
   * @todo Invalidar el token después de usarlo
   *
   * @method resetPassword
   * @memberof AuthController
   * @since 1.0.0
   */
  @Post('reset-password')
  resetPassword() {
    return {
      message: 'Password reset successfully',
    };
  }

  /**
   * Obtiene el perfil del usuario autenticado
   *
   * @description
   * Retorna la información completa del perfil del usuario que está actualmente autenticado.
   * Esta ruta requiere autenticación JWT válida (no está marcada como @Public).
   *
   * @decorator Get - Define el método HTTP GET en la ruta '/me'
   *
   * @returns {Object} Objeto con mensaje de confirmación
   *
   * @example
   * // GET /auth/me
   * // Headers: { "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
   * // Response:
   * // {
   * //   "message": "User profile fetched successfully"
   * // }
   *
   * @throws {UnauthorizedException} Si no se proporciona un token válido
   * @throws {NotFoundException} Si el usuario no existe
   *
   * @todo Implementar la lógica para obtener el usuario del token JWT
   * @todo Retornar los datos completos del perfil del usuario
   * @todo Agregar decoradores de Swagger para documentar la respuesta
   * @todo Implementar respuesta estandarizada con ApiSuccessResponseDto
   * @todo Usar un DTO o Presenter para formatear la respuesta
   *
   * @method getProfile
   * @memberof AuthController
   * @since 1.0.0
   */
  @Get('/me')
  getProfile(@Req() req: CustomRequest) {
    const userId = req.user.userId;

    return this.authService.getMyProfile(userId);
  }

  // ADMINS ROUTES

  /**
   * Revoca una sesión específica (Endpoint administrativo)
   *
   * @description
   * Permite a un administrador revocar forzosamente una sesión de cualquier usuario.
   * Esta acción es irreversible y cierra inmediatamente la sesión especificada.
   * Esta ruta requiere autenticación JWT y permisos de administrador.
   *
   * @decorator Post - Define el método HTTP POST en la ruta '/admin/revoke-session/:sessionId'
   *
   * @param {string} sessionId - ID único de la sesión que se desea revocar
   *
   * @returns {Promise<ApiSuccessResponseDto>} Respuesta con la estructura:
   *  - success: true
   *  - message: Mensaje de éxito en español
   *  - data: Información sobre la sesión revocada
   *
   * @example
   * // POST /auth/admin/revoke-session/65a1b2c3d4e5f6789abcdef0
   * // Headers: { "Authorization": "Bearer <admin_token>" }
   * // Response:
   * // {
   * //   "success": true,
   * //   "message": "Sesión revocada exitosamente.",
   * //   "data": { "sessionId": "65a1b2c3d4e5f6789abcdef0", "revoked": true }
   * // }
   *
   * @throws {UnauthorizedException} Si no se proporciona un token de administrador válido
   * @throws {ForbiddenException} Si el usuario no tiene permisos de administrador
   * @throws {NotFoundException} Si la sesión no existe
   * @throws {BadRequestException} Si el ID de la sesión es inválido
   *
   * @todo Agregar guard de roles para verificar permisos de administrador
   * @todo Agregar decoradores de Swagger para documentar la autenticación requerida
   * @todo Implementar logging de auditoría para acciones administrativas
   *
   * @async
   * @method revokeSession
   * @memberof AuthController
   * @since 1.0.0
   */
  @Post('/admin/revoke-session/:sessionId')
  async revokeSession(@Param('sessionId') sessionId: string) {
    const revokedSession = await this.authService.revokeSessionById(sessionId);
    return new ApiSuccessResponseDto({
      success: true,
      message: 'Sesión revocada exitosamente.',
      data: revokedSession,
    });
  }
}
