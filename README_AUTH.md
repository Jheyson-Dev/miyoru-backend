# Sistema de Autenticación - Miyoru Backend

Documentación completa de los flujos de autenticación con DTOs explícitos y estructuras de datos reales.

---

## 📊 Flujo 1: Registro de Usuario

### Request DTO: `RegisterDto`

```typescript
{
  userType?: UserType,      // Opcional, default: HUMAN
  displayName: string,      // "Juanito"
  username: string,         // "juanito123"
  fullName: string,         // "Juan Pérez"
  email: string,            // "juanito@example.com"
  password: string          // "secreto123" (min 6 chars)
}
```

### Response: `ApiSuccessResponseDto<AuthResponseDto>`

```typescript
{
  success: true,
  message: "Usuario registrado exitosamente.",
  data: {
    userType: UserType,     // "HUMAN"
    displayName: string,    // "Juanito"
    avatarUrl: string | null,
    isActive: boolean,      // false (requiere verificación)
    createdAt: Date
  }
}
```

### Diagrama de Flujo

```mermaid
sequenceDiagram
    participant Client
    participant Controller as AuthController
    participant Service as AuthService
    participant UserService as UsersService
    participant EmailService as EmailVerificationService
    participant MessagingService
    participant DB as Database

    Client->>Controller: POST /auth/register<br/>{RegisterDto}
    Controller->>Service: register(registerDto)

    Note over Service: PASO 1 - Hashear contraseña
    Service->>Service: bcrypt.hash(password, 10)

    Note over Service: PASO 2 - Crear usuario y perfil
    Service->>UserService: createUserWithHumanProfile()
    UserService->>DB: prisma.user.create() with humanProfile
    DB-->>UserService: User created
    UserService-->>Service: User data

    Note over Service: PASO 3 - Generar token verificación
    Service->>EmailService: createEmailToken(userId)
    EmailService->>DB: emailVerifications.create()
    DB-->>EmailService: token stored
    EmailService-->>Service: verification token

    Note over Service: PASO 4 - Enviar email verificación
    Service->>MessagingService: sendEmail(email, subject, html)
    MessagingService-->>Service: email sent

    Note over Service: PASO 5 - Retornar datos usuario
    Service-->>Controller: User (AuthResponseDto)

    Note over Controller: PASO 6 - Devolver respuesta al cliente
    Controller-->>Client: 200 OK<br/>ApiSuccessResponseDto<AuthResponseDto>
```

---

## 📊 Flujo 2: Login

### Request DTO: `LoginDto`

```typescript
{
  emailOrUsername: string,  // "juanito@example.com" o "juanito123"
  password: string          // "secreto123"
}
```

### Response: `ApiSuccessResponseDto<AuthResponseDto>`

```typescript
{
  success: true,
  message: "Usuario autenticado exitosamente.",
  data: {
    userType: UserType,
    displayName: string,
    avatarUrl: string | null,
    isActive: boolean,
    createdAt: Date
  }
}
// + Cookies: accessToken, refreshToken (HttpOnly)
```

### Diagrama de Flujo

```mermaid
sequenceDiagram
    participant Client
    participant Controller as AuthController
    participant Service as AuthService
    participant UserService as UsersService
    participant JwtService
    participant DB as Database

    Client->>Controller: POST /auth/login {LoginDto}

    Note over Controller: PASO 1 - Extraer info dispositivo
    Controller->>Controller: getHeaderInfo(req)

    Note over Controller: PASO 2 - Autenticar usuario
    Controller->>Service: login(loginDto, userAgentInfo)

    Note over Service: PASO 3 - Buscar usuario
    Service->>UserService: findUserByUsernameOrEmail()
    UserService->>DB: humanProfile.findFirst(OR email/username)
    DB-->>UserService: HumanProfile + User
    UserService-->>Service: user data

    alt Usuario no encontrado
        Service-->>Client: 401 Usuario no encontrado
    end

    Note over Service: PASO 4 - Validar credenciales
    Service->>Service: validateLogin(password, human)
    Service->>Service: bcrypt.compare()

    alt Password incorrecta
        Service-->>Client: 401 Contraseña incorrecta
    end
    alt Email no verificado
        Service-->>Client: 403 Email no verificado
    end
    alt Usuario inactivo
        Service-->>Client: 403 Usuario inactivo
    end

    Note over Service: PASO 5 - Crear/actualizar sesión
    Service->>Service: createSession(human, userAgentInfo)
    Service->>JwtService: generateAccessToken()
    JwtService-->>Service: accessToken (15min)
    Service->>Service: generateJti()
    Service->>JwtService: generateRefreshToken()
    JwtService-->>Service: refreshToken (7d)

    Service->>DB: sessions.findFirst(userId, device, IP)
    DB-->>Service: existingSession?

    alt Sesión existente (Token Rotation)
        Service->>DB: refreshTokens.update(revoked)
        Service->>DB: refreshTokens.create(new)
        Service->>DB: sessions.update()
    else Nueva sesión
        Service->>DB: sessions.create()
    end

    Note over Service: PASO 6 - Retornar tokens y usuario
    Service-->>Controller: tokens + user

    Note over Controller: PASO 7 - Establecer cookies
    Controller->>Controller: setAuthCookies(res, tokens)

    Note over Controller: PASO 8 - Devolver respuesta
    Controller-->>Client: 200 OK<br/>ApiSuccessResponseDto<AuthResponseDto><br/>+ Cookies HttpOnly
```

---

## 📊 Flujo 3: Validación de Email (Auto-Login)

### Request

```
GET /auth/validate-email/:token
```

### Response: `ApiSuccessResponseDto<AuthResponseDto>`

```typescript
{
  success: true,
  message: "Email verificado y sesión iniciada exitosamente.",
  data: {
    userType: UserType,
    displayName: string,
    avatarUrl: string | null,
    isActive: boolean,      // true (activado)
    createdAt: Date
  }
}
// + Cookies: accessToken, refreshToken
```

### Diagrama de Flujo

```mermaid
sequenceDiagram
    participant Client
    participant Controller as AuthController
    participant EmailService as EmailVerificationService
    participant UserService as UsersService
    participant Service as AuthService
    participant DB as Database

    Client->>Controller: GET /auth/validate-email/:token
    Controller->>EmailService: verifyToken(token)

    EmailService->>DB: emailVerifications.findUnique()
    DB-->>EmailService: token record

    alt Token no existe
        EmailService-->>Client: 400 Token inválido
    end

    EmailService->>EmailService: validateExpiringToken()
    alt Token expirado
        EmailService->>DB: emailVerifications.delete()
        EmailService-->>Client: 400 Token expirado
    end

    EmailService->>EmailService: markHumanAsVerified()
    EmailService->>DB: humanProfile.update(emailVerified)

    EmailService->>UserService: activateUser()
    UserService->>DB: user.update(isActive)

    EmailService->>EmailService: markEmailAsVerified()
    EmailService->>DB: emailVerifications.update(verified)

    EmailService-->>Controller: userId

    Note over Controller: Auto-Login
    Controller->>Service: loginAfterVerification()
    Service->>DB: humanProfile.findUnique()
    DB-->>Service: user data

    Service->>Service: createSession()
    Service-->>Controller: tokens + user
    Controller->>Controller: setAuthCookies()
    Controller-->>Client: 200 OK + Cookies
```

---

## 📊 Flujo 4: Refresh Token

### Request

```
POST /auth/refresh-token
Cookie: refreshToken=eyJhbGc...
```

### Response: `ApiSuccessResponseDto<AuthResponseDto>`

```typescript
{
  success: true,
  message: "Tokens renovados exitosamente.",
  data: {
    userType: UserType,
    displayName: string,
    avatarUrl: string | null,
    isActive: boolean,
    createdAt: Date
  }
}
// + Cookies: NEW accessToken, NEW refreshToken
```

### Diagrama de Flujo

```mermaid
sequenceDiagram
    participant Client
    participant Guard as JwtRefreshAuthGuard
    participant Strategy as JwtRefreshStrategy
    participant Controller as AuthController
    participant Service as AuthService
    participant JwtService
    participant UserService
    participant DB as Database

    Client->>Guard: POST /auth/refresh-token

    Guard->>Strategy: validate()
    Strategy->>Strategy: Extract from cookies
    Strategy->>Strategy: Verify JWT signature

    alt Token inválido
        Strategy-->>Client: 401 Unauthorized
    end

    Strategy-->>Guard: payload
    Guard-->>Controller: req.user = payload

    Controller->>Service: refreshToken(oldToken)

    Service->>JwtService: verifyToken()
    JwtService-->>Service: payload with jti

    Service->>Service: generateHash(jti)
    Service->>DB: refreshTokens.findFirst()
    DB-->>Service: RefreshToken + Session

    alt Token revocado/expirado
        Service-->>Client: 401 Token revocado
    end

    Note over Service: Token Rotation
    Service->>Service: generateJti() new UUID
    Service->>Service: generateHash(newJti)

    Service->>DB: refreshTokens.update(revoked)
    Service->>DB: refreshTokens.create(new)

    Service->>UserService: getHumanProfileById()
    UserService->>DB: humanProfile.findUniqueOrThrow()
    DB-->>UserService: user data

    Service->>JwtService: generateAccessToken()
    JwtService-->>Service: NEW accessToken
    Service->>JwtService: generateRefreshToken()
    JwtService-->>Service: NEW refreshToken

    Service-->>Controller: new tokens + user
    Controller->>Controller: setAuthCookies()
    Controller-->>Client: 200 OK + NEW Cookies
```

---

## 📊 Flujo 5: Logout

### Request

```
POST /auth/logout
Cookie: refreshToken=eyJhbGc...
```

### Response: `ApiSuccessResponseDto<LogoutResponseDto>`

```typescript
{
  success: true,
  message: "Usuario desconectado exitosamente.",
  data: {
    loggedOutAt: Date  // "2024-01-15T10:30:00Z"
  }
}
// + Clear-Cookie: accessToken, refreshToken
```

### Diagrama de Flujo

```mermaid
sequenceDiagram
    participant Client
    participant Controller as AuthController
    participant Service as AuthService
    participant JwtService
    participant DB as Database

    Client->>Controller: POST /auth/logout

    Controller->>Controller: get refreshToken from cookie

    alt No hay refreshToken
        Controller->>Controller: clearAuthCookies()
        Controller-->>Client: 200 OK
    end

    Note over Controller: Try-catch (permisivo)
    Controller->>Service: logout(refreshToken)

    Service->>JwtService: verifyToken()
    JwtService-->>Service: payload with jti

    Service->>Service: generateHash(jti)
    Service->>DB: refreshTokens.findFirst()
    DB-->>Service: RefreshToken + Session

    alt Token no encontrado
        Service-->>Controller: UnauthorizedException
        Note over Controller: Catch error, continuar
    end

    Service->>DB: refreshTokens.updateMany(revoked)
    DB-->>Service: Tokens revocados

    Service->>DB: sessions.updateMany(expired)
    DB-->>Service: Sesión cerrada

    Service-->>Controller: success

    Controller->>Controller: clearAuthCookies()
    Controller-->>Client: 200 OK + Clear Cookies
```

---

## 📊 Flujo 6: Acceso a Ruta Protegida

### Request

```
GET /protected-route
Cookie: accessToken=eyJhbGc...
```

### Diagrama de Flujo

```mermaid
sequenceDiagram
    participant Client
    participant Guard as JwtAuthGuard
    participant Strategy as JwtStrategy
    participant Controller

    Client->>Guard: GET /protected-route

    Guard->>Guard: check @Public decorator

    alt Route is @Public
        Guard-->>Controller: Bypass auth
        Controller-->>Client: 200 OK
    end

    Guard->>Strategy: validate()
    Strategy->>Strategy: Extract from cookies
    Strategy->>Strategy: Verify JWT signature

    alt No cookie o token inválido
        Strategy-->>Client: 401 Unauthorized
    end

    Strategy-->>Guard: payload
    Guard-->>Controller: req.user = payload

    Controller->>Controller: Execute business logic
    Controller-->>Client: 200 OK with data
```

---

## 📋 DTOs y Estructuras de Datos

### Request DTOs

#### `RegisterDto`

```typescript
{
  userType?: UserType,      // Opcional, default: HUMAN
  displayName: string,      // Nombre a mostrar
  username: string,         // Nombre de usuario único
  fullName: string,         // Nombre completo
  email: string,            // Email válido
  password: string          // Mínimo 6 caracteres
}
```

#### `LoginDto`

```typescript
{
  emailOrUsername: string,  // Email o username
  password: string          // Contraseña
}
```

### Response DTOs

#### `AuthResponseDto`

```typescript
{
  userType: UserType,       // "HUMAN" | "ADMIN" | etc.
  displayName: string,      // "Juan Pérez"
  avatarUrl: string | null, // URL o null
  isActive: boolean,        // true/false
  createdAt: Date           // ISO 8601
}
```

#### `LogoutResponseDto`

```typescript
{
  loggedOutAt: Date; // Timestamp del logout
}
```

#### `ApiSuccessResponseDto<T>`

```typescript
{
  success: true,
  message: string,          // Mensaje descriptivo
  data: T                   // AuthResponseDto | LogoutResponseDto | etc.
}
```

### Cookies (HttpOnly)

```typescript
{
  accessToken: string,      // JWT, 15 minutos
  refreshToken: string      // JWT, 7 días
}
// Opciones: HttpOnly, Secure (prod), SameSite=Lax
```

### JWT Payloads

#### Access Token

```typescript
{
  userId: string,
  email: string,
  displayName: string,
  preferences: JsonValue,
  iat: number,              // Issued at
  exp: number               // Expiration (15min)
}
```

#### Refresh Token

```typescript
{
  userId: string,
  email: string,
  displayName: string,
  preferences: JsonValue,
  jti: string,              // JWT ID (UUID)
  iat: number,
  exp: number               // Expiration (7d)
}
```

---

## 🔐 Seguridad

### Hashing

- **Contraseñas**: `bcrypt.hash(password, 10)`
- **JTI**: `SHA-256(jti)` antes de almacenar en DB

### Token Rotation

1. Cada refresh **revoca** el token anterior
2. Genera **nuevo JTI** único (UUID)
3. Crea **nuevo par** de tokens
4. Previene **ataques de replay**

### Cookies

- `HttpOnly`: No accesibles desde JavaScript
- `Secure`: Solo HTTPS en producción
- `SameSite=Lax`: Protección CSRF

### Validaciones

- Email verificado antes de login
- Usuario activo
- Tokens no revocados
- Sesiones no expiradas

---

## 🛠️ Servicios Utilizados

### AuthService

- `register()` - Crea usuario directamente con Prisma
- `login()` - Autentica y crea sesión
- `loginAfterVerification()` - Auto-login después de verificar email
- `refreshToken()` - Rota tokens
- `logout()` - Revoca tokens y cierra sesión
- `createSession()` - Método privado que maneja Token Rotation

### EmailVerificationService

- `createEmailToken()` - Genera token de verificación
- `verifyToken()` - Valida token y activa usuario
- `markHumanAsVerified()` - Marca email como verificado
- `markEmailAsVerified()` - Marca token como usado

### UsersService

- `findUserByUsernameOrEmail()` - Busca usuario por email o username
- `createUserWithHumanProfile()` - Crea usuario HUMAN con perfil en transacción
- `activateUser()` - Activa cuenta de usuario
- `getHumanProfileById()` - Obtiene perfil completo

### JwtService

- `generateAccessToken()` - Genera access token (15min)
- `generateRefreshToken()` - Genera refresh token (7d)
- `verifyToken()` - Verifica firma y expiración

---

## 📝 Notas de Implementación

### Gestión de Sesiones

- **Mismo dispositivo**: Rota tokens, mantiene sesión
- **Nuevo dispositivo**: Crea nueva sesión
- **Logout**: Revoca tokens y marca sesión como expirada

### Flujo de Registro

1. Usuario se registra con email y contraseña
2. Sistema hashea contraseña con bcrypt
3. Llama a `userService.createUserWithHumanProfile()` que crea usuario y perfil en una transacción
4. Genera token de verificación de email (1 hora de validez)
5. Envía email con link de verificación usando `messagingService.sendEmail()`
6. Retorna datos básicos del usuario creado (sin tokens, requiere verificación)
7. Controller devuelve `ApiSuccessResponseDto<AuthResponseDto>` al cliente

### Flujo de Verificación

1. Usuario hace clic en link del email
2. Sistema valida token (existencia y expiración)
3. Marca email como verificado
4. Activa cuenta de usuario
5. Inicia sesión automáticamente
6. Retorna tokens en cookies HttpOnly

### Flujo de Login

1. **Controller**: Extrae información del dispositivo con `getHeaderInfo(req)`
2. **Controller**: Llama a `authService.login()` con credenciales y info del dispositivo
3. **Service**: Busca usuario por email o username usando `userService.findUserByUsernameOrEmail()`
4. **Service**: Valida credenciales (password, email verificado, cuenta activa) con `validateLogin()`
5. **Service**: Crea o actualiza sesión con Token Rotation usando `createSession()`
6. **Service**: Retorna tokens (access + refresh) y datos del usuario
7. **Controller**: Establece tokens como cookies HttpOnly con `setAuthCookies()`
8. **Controller**: Retorna `ApiSuccessResponseDto<AuthResponseDto>` al cliente

### Flujo de Refresh

1. Extrae refreshToken de cookie
2. Verifica firma JWT y extrae JTI
3. Busca token en BD por JTI hasheado
4. Valida que no esté revocado ni expirado
5. **Token Rotation**: Revoca token viejo, crea nuevo
6. Genera nuevo par de tokens (access + refresh)
7. Retorna nuevos tokens en cookies

### Flujo de Logout

1. Extrae refreshToken de cookie
2. Intenta revocar token en servidor (permisivo)
3. Si falla, continúa igual (logout client-side)
4. Marca tokens como revocados en BD
5. Marca sesión como expirada
6. Limpia cookies del navegador
7. Retorna timestamp de logout
