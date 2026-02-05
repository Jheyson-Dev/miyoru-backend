---
description: NestJS + Prisma Development Standards
---

# NestJS + Prisma Development Skill

Este skill define las reglas y estándares obligatorios para el desarrollo en este proyecto NestJS + Prisma.

---

## 🚨 Reglas Obligatorias

### 1. Stack Tecnológico

**OBLIGATORIO**: Este proyecto usa **NestJS + Prisma**. No se permiten otros ORMs ni frameworks.

- **Framework**: NestJS v10+
- **ORM**: Prisma
- **Base de datos**: PostgreSQL
- **Validación**: `class-validator` + `class-transformer`
- **Documentación**: Swagger (`@nestjs/swagger`)

---

### 2. Prohibiciones Absolutas

#### ❌ Tipo `any`

**NUNCA uses el tipo `any`**. Siempre define tipos explícitos.

```typescript
// ❌ INCORRECTO
function processData(data: any) {
  return data.value;
}

// ✅ CORRECTO
interface DataInput {
  value: string;
}
function processData(data: DataInput): string {
  return data.value;
}
```

#### ❌ Imports de Prisma Incorrectos

```typescript
// ❌ INCORRECTO
import { User } from '@prisma/client';

// ✅ CORRECTO (Ruta generada localmente)
import { User } from 'src/generated/prisma/client';
```

---

### 3. DTOs: Swagger + Validación OBLIGATORIOS

**TODOS los DTOs DEBEN tener**:

1. Decoradores `@ApiProperty()` de Swagger.
2. Decoradores de validación de `class-validator`.
3. Mensajes de error personalizados en español.

#### ✅ Ejemplo de DTO Correcto

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'Nombre completo', example: 'Juan Pérez' })
  @IsString({ message: 'El nombre debe ser texto.' })
  fullName: string;

  @ApiProperty({ description: 'Email', example: 'juan@example.com' })
  @IsEmail({}, { message: 'Email inválido.' })
  email: string;
}
```

---

### 4. Prisma: Nested Writes OBLIGATORIOS

**SIEMPRE usa Nested Writes** para crear relaciones en una sola transacción.

#### ✅ Creación Atómica (CORRECTO)

```typescript
// ✅ Crea User y Profile en UNA sola query
return this.prismaService.user.create({
  data: {
    userType: UserType.HUMAN,
    displayName,
    humanProfile: {
      create: { username, email, passwordHash },
    },
  },
});
```

#### ❌ Creación Separada (INCORRECTO)

```typescript
// ❌ NUNCA hagas esto (riesgo de inconsistencia)
const user = await this.prismaService.user.create(...);
await this.prismaService.humanProfile.create(...);
```

---

### 5. Estructura de Módulos

```
src/modules/{module-name}/
├── controllers/ ({module}.controller.ts)
├── services/    ({module}.service.ts)
├── dtos/
│   ├── requests/
│   └── responses/
└── {module}.module.ts
```

---

### 6. Prisma Client: Ruta de Importación

**REGLA DE ORO**: El cliente de Prisma se genera internamente. **NO modifiques el schema.prisma**. Tu única responsabilidad es **IMPORTAR** los tipos desde la ruta correcta:

- Client: `src/generated/prisma/client`
- Enums: `src/generated/prisma/enums`

```typescript
// ✅ CORRECTO
import { User } from 'src/generated/prisma/client';
```

---

### 7. Estándares de Documentación (Compodoc + Narrativa)

**Regla**: El código se escribe para humanos primero.

#### Cabeceras JSDoc (Compodoc)

Obligatorio para métodos públicos en Controllers y Services.

```typescript
/**
 * [Acción Corta]
 * @description [Explicación detallada]
 * @param {Dto} dto - [Descripción]
 * @returns {Promise<Response>} [Estructura]
 */
```

---

## 🧩 Estándar de Trazabilidad y Flujos

### 1. En el Código Fuente (Desacoplamiento)

Para garantizar la reutilización, el código **NO** debe conocer quién lo llama.

- **Regla**: Cada método mantiene su propia numeración interna independiente, comenzando siempre desde el `PASO 1`.
- **Formato**:

```typescript
// ========================================
// PASO 1: [Descripción local]
// ========================================
```

### 2. Generación de Documentación (On-Demand)

La "historia completa" (jerarquía 1.1, 1.2...) se genera solo cuando el usuario pide documentación externa.

**Protocolo del Agente**: Si el usuario pide "Documentar el flujo X":

1. Lee los archivos recursivamente.
2. Genera un Markdown donde SÍ unes los pasos (Controller Paso 1 -> Service Paso 1.1).

---

## 🚀 Pipeline de Documentación y Despliegue

### 1. Scripts en package.json (OBLIGATORIO)

Asegúrate de que existan estos scripts exactos:

```json
{
  "scripts": {
    "compodoc:build": "npx compodoc -p tsconfig.doc.json && rm -rf documentation/template-playground documentation/template-playground-app || true",
    "compodoc:serve": "npx compodoc -s",
    "vercel:dev": "vercel dev --listen 3517",
    "vercel:prod": "vercel --prod"
  }
}
```

### 2. Archivos de Configuración Requeridos

#### A. tsconfig.doc.json (Raíz)

Necesario para que Compodoc ignore los tests.

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "test", "**/*.spec.ts"]
}
```

#### B. vercel.json (Raíz)

```json
{
  "version": 2,
  "builds": [{ "src": "src/main.ts", "use": "@vercel/node" }],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/main.ts",
      "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    }
  ]
}
```

#### C. .vercelignore (Raíz)

```plaintext
node_modules
.git
documentation
dist
```
