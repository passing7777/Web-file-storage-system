import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

class UpdateUserDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8, { message: '密码至少需要8个字符' })
  @IsOptional()
  newPassword?: string;

  @IsString()
  @IsOptional()
  oldPassword?: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@CurrentUser('id') userId: number) {
    return this.usersService.getUserProfile(userId);
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser('id') userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    if (updateUserDto.email) {
      return this.usersService.updateUserEmail(userId, updateUserDto.email);
    }

    if (updateUserDto.newPassword && updateUserDto.oldPassword) {
      return this.usersService.updateUserPassword(
        userId,
        updateUserDto.oldPassword,
        updateUserDto.newPassword,
      );
    }

    return { message: '没有需要更新的内容' };
  }
}