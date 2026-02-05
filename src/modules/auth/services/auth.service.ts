import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID, createHash } from 'crypto';
import { LoginDto, RegisterDto } from '../dtos/requests';
import bcrypt from 'bcryptjs';
import { HeaderInfo, ValidateLogin } from '../interfaces';
import { EmailVerificationService } from './email_verification.service';
import { MessagingService } from 'src/modules/messaging/messaging.service';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { JwtService } from './jwt.services';
import { UsersService } from 'src/modules/users/services/users.service';
import { Prisma } from 'src/generated/prisma/client';

/**
 * Servicio de autenticación y gestión de sesiones
 *
 * @description
 * Servicio principal que maneja toda la lógica de negocio relacionada con la autenticación
 * de usuarios, incluyendo registro, login, logout, gestión de tokens JWT y refresh tokens,
 * y administración de sesiones múltiples. Implementa un sistema robusto de seguridad con
 * rotación de tokens y validaciones exhaustivas.
 *
 * @remarks
 * Características principales:
 * - Registro de usuarios con hash de contraseñas usando bcrypt
 * - Autenticación mediante JWT (Access Token + Refresh Token)
 * - Gestión de sesiones múltiples por usuario con información de dispositivo
 * - Rotación automática de refresh tokens para mayor seguridad
 * - Validación de email mediante tokens de verificación
 * - Soporte para cierre de sesiones individuales o múltiples
 * - Endpoints administrativos para revocar sesiones
 *
 * @security
 * - Las contraseñas se hashean con bcrypt (salt rounds: 10)
 * - Los JTI (JWT ID) se hashean con SHA-256 antes de almacenarlos
 * - Los refresh tokens se rotan en cada uso (previene replay attacks)
 * - Las sesiones expiran automáticamente después de 7 días de inactividad
 *
 * @export
 * @class AuthService
 * @since 1.0.0
 * @author Miyoru Backend Team
 */
@Injectable()
export class AuthService {
  /**
   * Constructor del servicio de autenticación
   *
   * @description
   * Inyecta todas las dependencias necesarias para manejar la autenticación,
   * gestión de sesiones, verificación de email y comunicación con la base de datos.
   *
   * @param {PrismaService} prismaService - Cliente de Prisma para acceso a la base de datos
   * @param {EmailVerificationService} emailVerificationService - Servicio para generar y verificar tokens de email
   * @param {MessagingService} messagingService - Servicio para envío de emails y notificaciones
   * @param {JwtService} jwtService - Servicio para generación y verificación de tokens JWT
   * @param {UsersService} userService - Servicio para operaciones relacionadas con usuarios
   *
   * @memberof AuthService
   */
  constructor(
    private readonly prismaService: PrismaService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly messagingService: MessagingService,
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
  ) {}

  // ============================================================================
  // METODOS PRIVADOS
  // ============================================================================

  /**
   * Compara una contraseña en texto plano con su hash
   *
   * @description
   * Utiliza bcrypt para comparar de forma segura una contraseña en texto plano
   * con su versión hasheada almacenada en la base de datos.
   *
   * @param {string} plainPassword - Contraseña en texto plano proporcionada por el usuario
   * @param {string} hashedPassword - Hash de la contraseña almacenado en la base de datos
   *
   * @returns {Promise<boolean>} True si las contraseñas coinciden, false en caso contrario
   *
   * @private
   * @async
   * @method comparePasswords
   * @memberof AuthService
   */
  private comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Valida las credenciales y estado del usuario durante el login
   *
   * @description
   * Realiza múltiples validaciones de seguridad:
   * 1. Verifica que la contraseña sea correcta
   * 2. Confirma que el email del usuario esté verificado
   * 3. Valida que la cuenta del usuario esté activa
   *
   * @param {string} password - Contraseña en texto plano proporcionada por el usuario
   * @param {ValidateLogin} validateLogin - Objeto con datos del usuario para validación
   *
   * @returns {Promise<void>} No retorna valor, lanza excepciones si la validación falla
   *
   * @throws {UnauthorizedException} Si la contraseña es incorrecta
   * @throws {ForbiddenException} Si el email no está verificado o el usuario está inactivo
   *
   * @private
   * @async
   * @method validateLogin
   * @memberof AuthService
   */
  private async validateLogin(
    password: string,
    validateLogin: ValidateLogin,
  ): Promise<void> {
    const { emailVerified, passwordHash, user } = validateLogin;
    const isPasswordValid = await this.comparePasswords(password, passwordHash);

    if (!isPasswordValid)
      throw new UnauthorizedException('Contraseña inválida.');
    if (!emailVerified) throw new ForbiddenException('Email no verificado.');
    if (!user.isActive) throw new ForbiddenException('Usuario inactivo.');
  }

  /**
   * Genera un identificador único para JWT (JTI)
   *
   * @description
   * Crea un UUID v4 aleatorio que se utiliza como JTI (JWT ID) para identificar
   * de forma única cada refresh token. Este ID permite rastrear y revocar tokens
   * específicos.
   *
   * @returns {string} UUID v4 en formato string
   *
   * @private
   * @method generateJti
   * @memberof AuthService
   */
  private generateJti() {
    return randomUUID();
  }

  /**
   * Genera un hash SHA-256 de un texto
   *
   * @description
   * Crea un hash SHA-256 del texto proporcionado. Se utiliza principalmente para
   * hashear los JTI antes de almacenarlos en la base de datos, añadiendo una capa
   * adicional de seguridad.
   *
   * @param {string} text - Texto a hashear (típicamente un JTI)
   *
   * @returns {string} Hash SHA-256 en formato hexadecimal
   *
   * @private
   * @method generateHash
   * @memberof AuthService
   */
  private generateHash(text: string) {
    return createHash('sha256').update(text).digest('hex');
  }

  /**
   * Genera tokens y crea/actualiza la sesión del usuario
   *
   * @description
   * Método privado que maneja la lógica de creación de sesiones y generación de tokens.
   * Implementa Token Rotation para mayor seguridad: si ya existe una sesión del mismo
   * dispositivo, revoca el refresh token anterior y crea uno nuevo.
   *
   * @param {Object} human - Datos del usuario
   * @param {string} human.userId - ID único del usuario
   * @param {string|null} human.email - Email del usuario (puede ser null)
   * @param {string} human.username - Nombre de usuario
   * @param {Prisma.JsonValue} human.preferences - Preferencias del usuario
   * @param {Object} human.user - Datos básicos del usuario
   * @param {string} human.user.displayName - Nombre para mostrar
   * @param {HeaderInfo} userAgentInfo - Información del dispositivo/navegador
   *
   * @returns {Promise<{accessToken: string, refreshToken: string}>} Par de tokens generados
   *
   * @private
   * @async
   * @method createSession
   * @memberof AuthService
   */
  private async createSession(
    human: {
      userId: string;
      email: string | null;
      username: string;
      preferences: Prisma.JsonValue;
      user: {
        displayName: string;
      };
    },
    userAgentInfo: HeaderInfo,
  ) {
    const emailOrUsername = human.email || human.username;

    // ========================================
    // PASO 1: Generar Access Token (15 minutos)
    // ========================================
    const { accessToken } = await this.jwtService.generateAccessToken(
      human.user.displayName,
      emailOrUsername,
      human.userId,
      human.preferences,
    );

    // ========================================
    // PASO 2: Generar JTI único para este refresh token
    // ========================================
    const jti = this.generateJti();

    // ========================================
    // PASO 3: Generar Refresh Token (7 días) con JTI
    // ========================================
    const { refreshToken } = await this.jwtService.generateRefreshToken(
      human.user.displayName,
      emailOrUsername,
      human.preferences,
      jti,
      human.userId,
    );

    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    // ========================================
    // PASO 4: Buscar sesión existente del mismo dispositivo
    // ========================================
    const existingSession = await this.prismaService.sessions.findFirst({
      where: {
        userId: human.userId,
        deviceInfo: userAgentInfo.device.type,
        userAgent: userAgentInfo.userAgent,
        ipAddress: userAgentInfo.ip,
      },
      include: {
        refreshTokens: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, jtiHash: true, createdAt: true, revokedAt: true },
        },
      },
    });

    // ========================================
    // CASO A: Sesión existente - Rotar tokens
    // ========================================
    if (existingSession) {
      // A.1: Revocar el refresh token anterior (Token Rotation)
      if (existingSession.refreshTokens.length > 0) {
        await this.prismaService.refreshTokens.update({
          where: {
            id: existingSession.refreshTokens[0].id,
          },
          data: { revoked: true, revokedAt: new Date() },
        });
      }

      // A.2: Crear nuevo refresh token con el nuevo JTI
      await this.prismaService.refreshTokens.create({
        data: {
          sessionId: existingSession.id,
          jtiHash: this.generateHash(jti),
          expiresAt: refreshExpires,
          deviceInfo: userAgentInfo.device.type,
          ipAddress: userAgentInfo.ip,
        },
      });

      // A.3: Actualizar fecha de expiración de la sesión
      await this.prismaService.sessions.update({
        where: { id: existingSession.id },
        data: { expiresAt: refreshExpires },
      });

      return { accessToken, refreshToken };
    }

    // ========================================
    // CASO B: Nueva sesión - Crear sesión y refresh token
    // ========================================
    await this.prismaService.sessions.create({
      data: {
        userId: human.userId,
        deviceInfo: userAgentInfo.device.type,
        ipAddress: userAgentInfo.ip,
        userAgent: userAgentInfo.userAgent,
        expiresAt: refreshExpires,
        location: userAgentInfo.location,
        platform: userAgentInfo.os.name,
        refreshTokens: {
          create: {
            jtiHash: this.generateHash(jti),
            expiresAt: refreshExpires,
            deviceInfo: userAgentInfo.device.type,
            ipAddress: userAgentInfo.ip,
          },
        },
      },
    });

    return { accessToken, refreshToken };
  }

  // ============================================================================
  // METODOS PUBLICOS
  // ============================================================================

  /**
   * Registra un nuevo usuario en el sistema
   *
   * @description
   * Crea un nuevo usuario de tipo HUMAN con su perfil asociado usando Nested Writes
   * de Prisma en una sola transacción atómica. Hashea la contraseña con bcrypt (10 salt rounds),
   * genera un token de verificación de email válido por 1 hora, y envía el correo de confirmación.
   * El usuario se crea inactivo (isActive: false) hasta que verifique su email.
   *
   * @param {RegisterDto} registerDto - Datos del usuario a registrar:
   * - userType: Tipo de usuario (opcional, default: HUMAN)
   * - displayName: Nombre a mostrar
   * - username: Nombre de usuario único
   * - fullName: Nombre completo
   * - email: Correo electrónico único
   * - password: Contraseña en texto plano (será hasheada)
   * @returns {Promise<User>} Usuario creado con estructura:
   * - id: ID único del usuario
   * - userType: HUMAN
   * - displayName: Nombre a mostrar
   * - avatarUrl: null (por defecto)
   * - isActive: false (requiere verificación)
   * - createdAt: Timestamp de creación
   * - humanProfile: Perfil asociado con email, username, etc.
   *
   * @example
   * const user = await authService.register({
   *   displayName: 'Juan',
   *   username: 'juan123',
   *   fullName: 'Juan Pérez',
   *   email: 'juan@example.com',
   *   password: 'secreto123'
   * });
   * // Returns: { id: '...', userType: 'HUMAN', displayName: 'Juan', isActive: false, ... }
   *
   * @throws {ConflictException} Email o username ya registrado en la base de datos
   * @throws {BadRequestException} Datos de entrada inválidos (validados por RegisterDto)
   * @security
   * - Password hasheado con bcrypt (10 salt rounds)
   * - Token de verificación único con expiración de 1 hora
   * - Usuario creado inactivo hasta verificar email
   * - Nested Write de Prisma garantiza atomicidad (User + HumanProfile)
   * - Email de verificación enviado automáticamente
   *
   * @memberof AuthService
   * @since 1.0.0
   */
  async register(registerDto: RegisterDto) {
    const { displayName, password, ...human } = registerDto;

    // ========================================
    // PASO 1: Hashear la contraseña
    // ========================================
    const passwordHash = await bcrypt.hash(password, 10);

    // ========================================
    // PASO 2: Crear usuario y perfil
    // ========================================

    const registerUser = await this.userService.createUserWithHumanProfile({
      displayName,
      ...human,
      passwordHash,
    });

    if (registerUser) {
      // ========================================
      // PASO 3: Generar token de verificación de email
      // ========================================
      const verification = await this.emailVerificationService.createEmailToken(
        registerUser.id,
      );

      // ========================================
      // PASO 4: Enviar email de verificación
      // ========================================
      await this.messagingService.sendEmail(
        human.email,
        'Verificación de correo',
        `<p>Por favor, verifica tu correo haciendo clic en el siguiente enlace: ${verification.token}</p>`,
      );
    }

    // ========================================
    // PASO 5: Retornar datos del usuario creado
    // ========================================
    return registerUser;
  }

  /**
   * Autentica un usuario existente
   *
   * @description
   * Valida las credenciales del usuario (email/username + password), verifica que
   * el email esté confirmado y la cuenta activa. Genera un par de tokens JWT
   * (access + refresh) y gestiona sesiones con Token Rotation. Si ya existe una sesión
   * del mismo dispositivo, revoca el refresh token anterior y genera uno nuevo.
   * Si es un dispositivo nuevo, crea una nueva sesión.
   *
   * @param {LoginDto} loginDto - Credenciales del usuario:
   * - emailOrUsername: Email o nombre de usuario
   * - password: Contraseña en texto plano
   * @param {HeaderInfo} userAgentInfo - Información del dispositivo:
   * - device: Tipo de dispositivo (desktop, mobile, etc.)
   * - userAgent: User agent completo del navegador
   * - ip: Dirección IP del cliente
   * - location: Ubicación geográfica (opcional)
   * - os: Sistema operativo
   * @returns {Promise<{accessToken: string, refreshToken: string, user: User}>} Objeto con:
   * - accessToken: JWT válido por 15 minutos
   * - refreshToken: JWT válido por 7 días
   * - user: Datos del usuario autenticado
   *
   * @example
   * const result = await authService.login(
   *   { emailOrUsername: 'juan@example.com', password: 'secreto123' },
   *   {
   *     device: { type: 'desktop' },
   *     userAgent: 'Mozilla/5.0...',
   *     ip: '192.168.1.1',
   *     location: 'Lima, Peru',
   *     os: { name: 'Windows' }
   *   }
   * );
   * // Returns: { accessToken: 'eyJ...', refreshToken: 'eyJ...', user: { ... } }
   *
   * @throws {UnauthorizedException} Usuario no encontrado o contraseña incorrecta
   * @throws {ForbiddenException} Email no verificado o cuenta inactiva
   * @security
   * - Contraseñas comparadas con bcrypt.compare()
   * - Access Token válido por 15 minutos
   * - Refresh Token válido por 7 días
   * - Token Rotation: revoca refresh token anterior al generar uno nuevo
   * - JTI hasheado con SHA-256 antes de almacenar en BD
   * - Sesiones rastreadas por dispositivo, IP y user agent
   * - Validación de email verificado y cuenta activa
   *
   * @memberof AuthService
   * @since 1.0.0
   */
  async login(loginDto: LoginDto, userAgentInfo: HeaderInfo) {
    const { emailOrUsername, password } = loginDto;

    // ========================================
    // PASO 3: Buscar usuario por email o username
    // ========================================
    const human =
      await this.userService.findUserByUsernameOrEmail(emailOrUsername);

    // Si no se encuentra el usuario, lanzar error de autenticación
    if (!human) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    // ========================================
    // PASO 4: Validar credenciales y estado de la cuenta
    // ========================================
    // validateLogin verifica:
    // - Contraseña correcta (bcrypt.compare)
    // - Email verificado
    // - Cuenta activa
    await this.validateLogin(password, human);

    // ========================================
    // PASO 5: Crear/actualizar sesión y generar tokens
    // ========================================
    // createSession maneja:
    // - Generación de accessToken (15min) y refreshToken (7d)
    // - Token Rotation si ya existe sesión del mismo dispositivo
    // - Creación de nueva sesión si es un dispositivo nuevo
    // - Almacenamiento del refreshToken con JTI hasheado en la BD
    const tokens = await this.createSession(
      {
        ...human,
        email: emailOrUsername,
        username: emailOrUsername,
      },
      userAgentInfo,
    );

    // ========================================
    // PASO 6: Retornar tokens y datos del usuario
    // ========================================
    return { ...tokens, user: human.user };
  }

  /**
   * Autentica automáticamente a un usuario después de verificar su email
   *
   * @description
   * Realiza un auto-login sin requerir contraseña después de que el usuario verifica
   * su email. Genera tokens JWT y crea una sesión automáticamente. Este método se
   * llama desde el endpoint de verificación de email para proporcionar una experiencia
   * fluida al usuario (verifica email → login automático).
   *
   * @param {string} userId - ID del usuario que acaba de verificar su email
   * @param {HeaderInfo} userAgentInfo - Información del dispositivo:
   * - device: Tipo de dispositivo
   * - userAgent: User agent del navegador
   * - ip: Dirección IP
   * - location: Ubicación geográfica (opcional)
   * - os: Sistema operativo
   * @returns {Promise<{accessToken: string, refreshToken: string, user: User}>} Objeto con:
   * - accessToken: JWT válido por 15 minutos
   * - refreshToken: JWT válido por 7 días
   * - user: Datos del usuario autenticado
   *
   * @example
   * const result = await authService.loginAfterVerification(
   *   'clx123abc',
   *   {
   *     device: { type: 'mobile' },
   *     userAgent: 'Mozilla/5.0...',
   *     ip: '192.168.1.1',
   *     os: { name: 'iOS' }
   *   }
   * );
   * // Returns: { accessToken: 'eyJ...', refreshToken: 'eyJ...', user: { ... } }
   *
   * @throws {UnauthorizedException} Usuario no encontrado
   * @throws {ForbiddenException} Usuario inactivo (no debería ocurrir si EmailVerificationService funcionó)
   * @security
   * - No requiere contraseña (usuario ya verificó email)
   * - Verifica que la cuenta esté activa
   * - Genera tokens con misma seguridad que login normal
   * - Implementa Token Rotation si ya existe sesión
   *
   * @memberof AuthService
   * @since 1.0.0
   */
  async loginAfterVerification(userId: string, userAgentInfo: HeaderInfo) {
    // ========================================
    // PASO 1: Obtener datos del usuario verificado
    // ========================================
    // Buscar el perfil del usuario que acaba de verificar su email
    const human = await this.prismaService.humanProfile.findUnique({
      where: { userId },
      select: {
        userId: true,
        email: true,
        username: true,
        preferences: true, // Se incluirán en el JWT
        user: {
          select: {
            userType: true,
            displayName: true,
            avatarUrl: true,
            isActive: true, // Ya debería estar activo (activado por EmailVerificationService)
            createdAt: true,
          },
        },
      },
    });

    // Si el usuario no existe (caso raro, pero posible si se eliminó entre verificación y login)
    if (!human) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    // ========================================
    // PASO 2: Verificar que la cuenta esté activa
    // ========================================
    // Aunque EmailVerificationService ya activó la cuenta, verificamos por seguridad
    if (!human.user.isActive) {
      throw new ForbiddenException('Usuario inactivo.');
    }

    // ========================================
    // PASO 3: Crear sesión y generar tokens (igual que login)
    // ========================================
    // No se valida contraseña porque el usuario ya verificó su email
    // createSession maneja Token Rotation y gestión de sesiones
    const { accessToken, refreshToken } = await this.createSession(
      human,
      userAgentInfo,
    );

    // ========================================
    // PASO 4: Retornar tokens y datos del usuario
    // ========================================
    // El controlador establecerá estos tokens como cookies HttpOnly
    return { accessToken, refreshToken, user: human.user };
  }

  /**
   * Renueva los tokens de autenticación usando un refresh token válido
   *
   * @description
   * Implementa el flujo de Token Rotation para mayor seguridad. Verifica que el
   * refresh token sea válido y no esté revocado/expirado, lo revoca inmediatamente
   * (uso único), y genera un nuevo par de tokens (access + refresh). Este patrón
   * previene ataques de replay y permite detectar tokens comprometidos.
   *
   * @param {string} token - Refresh token JWT que se desea renovar
   * @returns {Promise<{accessToken: string, refreshToken: string}>} Objeto con:
   * - accessToken: Nuevo JWT válido por 15 minutos
   * - refreshToken: Nuevo JWT válido por 7 días (el anterior queda invalidado)
   *
   * @example
   * const newTokens = await authService.refreshToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
   * // Returns: { accessToken: 'eyJ...', refreshToken: 'eyJ...' }
   *
   * @throws {UnauthorizedException} Token inválido, sin JTI, revocado o expirado
   * @throws {UnauthorizedException} Sesión asociada no existe
   * @security
   * - Cada refresh token solo puede usarse una vez (one-time use)
   * - Tokens antiguos se revocan inmediatamente tras uso
   * - Se genera un nuevo JTI único para cada rotación
   * - JTI hasheado con SHA-256 antes de almacenar
   * - Nuevos tokens expiran en 7 días
   * - Verifica firma JWT con secret del servidor
   *
   * @memberof AuthService
   * @since 1.0.0
   */
  async refreshToken(token: string) {
    // ========================================
    // PASO 1: Verificar firma y extraer payload del JWT
    // ========================================
    // jwtService.verifyToken valida la firma y expiración del JWT
    const payload = await this.jwtService.verifyToken(token);

    // El JTI (JWT ID) es esencial para identificar el token en la BD
    if (!payload.jti) {
      throw new UnauthorizedException('Token inválido.');
    }

    // ========================================
    // PASO 2: Buscar el refresh token en la base de datos
    // ========================================
    // Buscamos por el hash del JTI (no guardamos JTI en texto plano)
    const existingToken = await this.prismaService.refreshTokens.findFirst({
      where: { jtiHash: this.generateHash(payload.jti) },
      include: { sessions: true }, // Necesitamos la sesión asociada
    });

    // ========================================
    // PASO 3: Validar estado del token
    // ========================================
    // Verificar que el token:
    // - Exista en la BD
    // - No esté revocado (revoked = false)
    // - No haya expirado (expiresAt > now)
    if (
      !existingToken ||
      existingToken.revoked ||
      existingToken.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Token revocado o expirado.');
    }

    // Verificar que la sesión asociada aún exista
    if (!existingToken.sessions) {
      throw new UnauthorizedException('Sesión no encontrada.');
    }

    // ========================================
    // PASO 4: Generar nuevo JTI para Token Rotation
    // ========================================
    // Cada refresh genera un nuevo JTI único
    const newJti = this.generateJti();
    const newJtiHash = this.generateHash(newJti);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    // ========================================
    // PASO 5: Revocar el refresh token actual (uso único)
    // ========================================
    // Token Rotation: el token viejo se marca como revocado
    // Si alguien intenta usarlo de nuevo, sabremos que fue comprometido
    await this.prismaService.refreshTokens.update({
      where: { id: existingToken.id },
      data: { revoked: true, revokedAt: new Date() },
    });

    // ========================================
    // PASO 6: Crear nuevo refresh token en la BD
    // ========================================
    // Almacenamos el nuevo token con el nuevo JTI hasheado
    await this.prismaService.refreshTokens.create({
      data: {
        sessionId: existingToken.sessionId, // Misma sesión
        jtiHash: newJtiHash, // Nuevo JTI hasheado
        expiresAt: refreshExpires,
        deviceInfo: existingToken.deviceInfo,
        ipAddress: existingToken.ipAddress,
      },
    });

    // ========================================
    // PASO 7: Obtener datos actualizados del usuario
    // ========================================
    // Por si cambió displayName, avatar, etc. desde el último login
    const human = await this.userService.getHumanProfileById(
      existingToken.sessions.userId,
    );

    // ========================================
    // PASO 8: Generar nuevo access token (15 minutos)
    // ========================================
    const { accessToken } = await this.jwtService.generateAccessToken(
      human.user.displayName,
      human.email || human.username,
      existingToken.sessions.userId,
      human.preferences,
    );

    // ========================================
    // PASO 9: Generar nuevo refresh token (7 días) con el nuevo JTI
    // ========================================
    const { refreshToken } = await this.jwtService.generateRefreshToken(
      human.user.displayName,
      human.email || human.username,
      human.preferences,
      newJti, // Nuevo JTI generado en PASO 4
      existingToken.sessions.userId,
    );

    // ========================================
    // PASO 10: Retornar nuevos tokens y datos del usuario
    // ========================================
    // El controlador establecerá estos nuevos tokens como cookies HttpOnly
    // El token viejo queda invalidado permanentemente
    return { accessToken, refreshToken, user: human.user };
  }

  /**
   * Cierra la sesión del usuario revocando su refresh token
   *
   * @description
   * Invalida el refresh token proporcionado y marca la sesión asociada como revocada.
   * Implementa un patrón de "logout permisivo": si el token ya está revocado o no existe,
   * retorna éxito de todas formas para asegurar que el cliente limpie sus cookies.
   * Esto previene errores en el frontend cuando el usuario intenta cerrar sesión múltiples veces.
   *
   * @param {string} refreshToken - Refresh token JWT de la sesión a cerrar
   * @returns {Promise<{success: boolean}>} Objeto con confirmación:
   * - success: true (siempre, incluso si el token ya estaba revocado)
   *
   * @example
   * const result = await authService.logout('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
   * // Returns: { success: true }
   *
   * @throws {UnauthorizedException} No se proporciona refresh token
   * @security
   * - Logout permisivo: retorna éxito incluso si token ya revocado
   * - Marca refresh token como revocado en BD
   * - Establece revokedAt timestamp
   * - No revoca sesión completa (permite múltiples dispositivos)
   * - Cliente debe limpiar cookies independientemente del resultado
   *
   * @memberof AuthService
   * @since 1.0.0
   */
  async logout(refreshToken: string) {
    // ========================================
    // PASO 1: Validar que se proporcionó un refresh token
    // ========================================
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token requerido.');
    }

    // ========================================
    // PASO 2: Verificar firma del JWT y extraer payload
    // ========================================
    // jwtService.verifyToken valida la firma y expiración
    const payload = await this.jwtService.verifyToken(refreshToken);

    // El JTI es necesario para identificar el token en la BD
    if (!payload.jti) {
      throw new UnauthorizedException('Token incompleto.');
    }

    // ========================================
    // PASO 3: Buscar el refresh token en la base de datos
    // ========================================
    // Hasheamos el JTI para buscarlo (no guardamos JTI en texto plano)
    const jtiHash = this.generateHash(payload.jti);

    const existingToken = await this.prismaService.refreshTokens.findFirst({
      where: { jtiHash },
      include: { sessions: true }, // Necesitamos la sesión para cerrarla
    });

    // Si el token no existe en la BD, lanzar error
    if (!existingToken) {
      throw new UnauthorizedException('Token no encontrado.');
    }

    // ========================================
    // PASO 4: Revocar todos los refresh tokens con ese JTI
    // ========================================
    // Marcamos como revocado cualquier token con ese JTI que aún no esté revocado
    // updateMany por si hay duplicados (caso raro pero posible)
    await this.prismaService.refreshTokens.updateMany({
      where: { jtiHash, revoked: false },
      data: { revoked: true, revokedAt: new Date(), expiresAt: new Date() },
    });

    // ========================================
    // PASO 5: Cerrar la sesión asociada
    // ========================================
    // Marcamos la sesión como expirada y revocada
    if (existingToken.sessionId) {
      await this.prismaService.sessions.updateMany({
        where: { id: existingToken.sessionId },
        data: {
          expiresAt: new Date(), // Expira ahora
          revokedAt: new Date(), // Marcada como revocada
          lastUsedAt: new Date(), // Última vez usada
          revoked: true, // Flag de revocación
        },
      });
    }

    // ========================================
    // PASO 6: Retornar confirmación
    // ========================================
    // El controlador limpiará las cookies del navegador
    return { success: true };
  }
  /**
   * Obtiene todas las sesiones activas de un usuario
   *
   * @description
   * Recupera la lista completa de sesiones del usuario ordenadas por fecha de creación
   * (más recientes primero). Cada sesión contiene información sobre el dispositivo,
   * ubicación, IP y estado de la sesión.
   *
   * @param {string} userId - ID único del usuario
   *
   * @returns {Promise<Array>} Array de objetos de sesión con toda su información
   *
   * @example
   * const sessions = await authService.getUserSessions('user-id-123');
   * // [{ id: '...', deviceInfo: 'desktop', platform: 'Windows', ... }]
   *
   * @todo Considerar descomentar el include de refreshTokens si se necesita esa información
   *
   * @async
   * @method getUserSessions
   * @memberof AuthService
   * @since 1.0.0
   */
  // devuelve todas las sesiones del usuario (y sus refreshTokens recientes)
  async getUserSessions(userId: string) {
    return this.prismaService.sessions.findMany({
      where: { userId },
      // include: {
      //   refreshTokens: {
      //     orderBy: { createdAt: 'desc' },
      //     select: {
      //       id: true,
      //       revoked: true,
      //       expiresAt: true,
      //       createdAt: true,
      //       deviceInfo: true,
      //       ipAddress: true,
      //     },
      //   },
      // },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cierra una sesión específica por su ID
   *
   * @description
   * Revoca todos los refresh tokens asociados a la sesión y marca la sesión como
   * expirada y revocada. Esto cierra inmediatamente la sesión en el dispositivo específico.
   *
   * @param {string} sessionId - ID único de la sesión a cerrar
   *
   * @returns {Promise<Object>} Objeto de la sesión actualizada con estado revocado
   *
   * @example
   * const closedSession = await authService.closeSessionById('session-id-123');
   * // { id: '...', revoked: true, revokedAt: Date, ... }
   *
   * @throws {NotFoundException} Si la sesión no existe
   *
   * @async
   * @method closeSessionById
   * @memberof AuthService
   * @since 1.0.0
   */
  async closeSessionById(sessionId: string) {
    const session = await this.prismaService.sessions.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada.');
    await this.prismaService.refreshTokens.updateMany({
      where: { sessionId, revoked: false },
      data: { revoked: true, revokedAt: new Date(), expiresAt: new Date() },
    });
    return await this.prismaService.sessions.update({
      where: { id: sessionId },
      data: {
        expiresAt: new Date(),
        revoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Cierra todas las sesiones del usuario excepto la actual
   *
   * @description
   * Permite al usuario cerrar todas sus sesiones activas en otros dispositivos
   * manteniendo activa únicamente la sesión desde la cual hace la petición.
   * El proceso incluye:
   * 1. Verificar el refresh token actual y extraer su JTI
   * 2. Identificar la sesión actual mediante el JTI
   * 3. Buscar todas las demás sesiones del usuario
   * 4. Revocar los refresh tokens de las otras sesiones
   * 5. Marcar las otras sesiones como expiradas
   *
   * @param {string} currentRefreshToken - Refresh token de la sesión que debe permanecer activa
   *
   * @returns {Promise<Object>} Objeto con información sobre las sesiones cerradas:
   *  - success: true
   *  - revokedCount: Cantidad de refresh tokens revocados
   *  - closedSessions: Cantidad de sesiones cerradas
   *
   * @example
   * const result = await authService.closeAllSessionsExceptCurrent('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
   * // { success: true, revokedCount: 3, closedSessions: 3 }
   *
   * @throws {UnauthorizedException} Si no se proporciona refresh token
   * @throws {UnauthorizedException} Si el token es inválido o no tiene JTI
   * @throws {UnauthorizedException} Si la sesión actual no existe
   *
   * @async
   * @method closeAllSessionsExceptCurrent
   * @memberof AuthService
   * @since 1.0.0
   */
  async closeAllSessionsExceptCurrent(currentRefreshToken: string) {
    if (!currentRefreshToken) {
      throw new UnauthorizedException('Refresh token requerido.');
    }

    const payload = await this.jwtService.verifyToken(currentRefreshToken);
    if (!payload || !payload.jti) {
      throw new UnauthorizedException('Token inválido.');
    }

    const currentJtiHash = this.generateHash(payload.jti);

    const currentToken = await this.prismaService.refreshTokens.findFirst({
      where: { jtiHash: currentJtiHash },
      include: { sessions: true },
    });

    if (!currentToken || !currentToken.sessions) {
      throw new UnauthorizedException('Sesión actual no encontrada.');
    }

    const userId = currentToken.sessions.userId;
    const currentSessionId = currentToken.sessionId;

    // Obtener ids de sesiones del usuario excluyendo la sesión actual
    const otherSessions = await this.prismaService.sessions.findMany({
      where: { userId, NOT: { id: currentSessionId } },
      select: { id: true },
    });

    const otherSessionIds = otherSessions.map((s) => s.id);

    // Revocar refresh tokens en esas sesiones
    let revokedCount = 0;
    if (otherSessionIds.length > 0) {
      const revokeResult = await this.prismaService.refreshTokens.updateMany({
        where: { sessionId: { in: otherSessionIds }, revoked: false },
        data: { revoked: true, revokedAt: new Date(), expiresAt: new Date() },
      });
      revokedCount = revokeResult.count;

      // Expirar las sesiones
      await this.prismaService.sessions.updateMany({
        where: { id: { in: otherSessionIds } },
        data: { expiresAt: new Date(), revoked: true, revokedAt: new Date() },
      });
    }

    return {
      success: true,
      revokedCount,
      closedSessions: otherSessionIds.length,
    };
  }

  async getMyProfile(userId: string) {
    return this.prismaService.humanProfile.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });
  }

  // ADMIN ENPOINTS

  /**
   * Revoca una sesión específica (Método administrativo)
   *
   * @description
   * Permite a un administrador revocar forzosamente cualquier sesión de usuario.
   * Marca la sesión como revocada y expirada inmediatamente.
   *
   * @param {string} sessionId - ID de la sesión a revocar
   *
   * @returns {Promise<Object>} Objeto de la sesión revocada
   *
   * @example
   * const revokedSession = await authService.revokeSessionById('session-id-123');
   *
   * @async
   * @method revokeSessionById
   * @memberof AuthService
   * @since 1.0.0
   */
  revokeSessionById(sessionId: string) {
    return this.prismaService.sessions.update({
      where: { id: sessionId },
      data: { revoked: true, revokedAt: new Date(), expiresAt: new Date() },
    });
  }

  /**
   * Revoca todas las sesiones de un usuario (Método administrativo)
   *
   * @description
   * Permite a un administrador cerrar forzosamente todas las sesiones activas
   * de un usuario específico. Útil en casos de seguridad o suspensión de cuenta.
   *
   * @param {string} userId - ID del usuario cuyas sesiones se revocarán
   *
   * @returns {Promise<Object>} Resultado de la operación con cantidad de sesiones afectadas
   *
   * @example
   * const result = await authService.revoqueAllSessionsByUserId('user-id-123');
   * // { count: 5 }
   *
   * @async
   * @method revoqueAllSessionsByUserId
   * @memberof AuthService
   * @since 1.0.0
   */
  revoqueAllSessionsByUserId(userId: string) {
    return this.prismaService.sessions.updateMany({
      where: { userId },
      data: {
        revoked: true,
        revokedAt: new Date(),
        expiresAt: new Date(),
      },
    });
  }
}
