import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(1, { message: '密码不能为空' })
  password: string;
}