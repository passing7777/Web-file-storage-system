import { IsString, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3, { message: '用户名至少需要3个字符' })
  @MaxLength(50, { message: '用户名最多50个字符' })
  username: string;

  @IsString()
  @MinLength(8, { message: '密码至少需要8个字符' })
  password: string;

  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsOptional()
  email?: string;
}