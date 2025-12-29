import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiCommonResponses } from 'src/shared/swagger/api-common-responses.decorator';
import { UsersService } from '../services/users.service';
// import { ApiResponseDto } from 'src/shared/dto/api-response.dto';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { Public } from 'src/shared/decorators/public.decorator';
import { ApiSuccessResponseDto } from 'src/shared/dtos';
import { UpdateHumanDto } from '../dtos/requests';

@UseGuards(JwtAuthGuard)
@ApiTags('USERS')
@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // User (datos generales)

  @Get('/me')
  @ApiOperation({ summary: 'Obtener el usuario actual' })
  @ApiCommonResponses({
    successDescription: 'Usuario obtenido correctamente.',
  })
  getMe() {
    // const user = await this.usersService.getUserById('some-user-id');
    // return new ApiResponseDto({
    //   success: true,
    //   message: 'User retrieved successfully.',
    //   data: user,
    // });

    return {
      message: 'Get my user endpoint',
    };
  }

  @Patch('/me')
  updateMyProfile() {
    return {
      message: 'Update my profile endpoint',
    };
  }

  @Get('/me/sessions')
  getMySessions() {
    return {
      message: 'Get my sessions endpoint',
    };
  }

  @Delete('/me/sessions')
  deleteMySessions() {
    return {
      message: 'Delete my sessions endpoint',
    };
  }

  @Delete('/me/sessions/:sessionId')
  deleteMySession() {
    return {
      message: 'Delete my session endpoint',
    };
  }

  // HumanProfile (perfil humano)

  @Public()
  @Get('/:username/profile')
  getUserHumanProfile(@Param('username') username: string) {
    const profile = this.usersService.getHumanProfileByUsername(username);

    return new ApiSuccessResponseDto({
      success: true,
      message: 'Perfil humano obtenido correctamente.',
      data: profile,
    });
  }

  @Get('/me/human-profile')
  getMyHumanProfile() {
    const profile = this.usersService.getHumanProfileByUsername('my-username');
    return new ApiSuccessResponseDto({
      success: true,
      message: 'Mi perfil humano obtenido correctamente.',
      data: profile,
    });
  }

  @Patch('/me/human-profile')
  updateMyHumanProfile(@Body() body: UpdateHumanDto) {
    const profile = this.usersService.updateHumanProfile('my-user-id', body);

    return new ApiSuccessResponseDto({
      success: true,
      message: 'Mi perfil humano actualizado correctamente.',
      data: profile,
    });
  }

  // ServiceProfiles (perfiles externos)

  @Get('/me/service-profiles')
  getMyServiceProfiles() {
    return {
      message: 'Get my service profiles endpoint',
    };
  }

  @Post('/me/service-profiles')
  createMyServiceProfile() {
    return {
      message: 'Create my service profile endpoint',
    };
  }

  @Patch('/me/service-profiles/:serviceType')
  updateMyServiceProfile() {
    return {
      message: 'Update my service profile endpoint',
    };
  }

  @Delete('/me/service-profiles/:serviceType')
  deleteMyServiceProfile() {
    return {
      message: 'Delete my service profile endpoint',
    };
  }
}
