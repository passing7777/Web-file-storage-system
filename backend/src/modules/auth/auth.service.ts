import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { username, password, email } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    if (email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existingEmail) {
        throw new ConflictException('邮箱已被使用');
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash,
        email,
      },
    });

    await this.logOperation(user.id, 'REGISTER', null, null);

    this.logger.log(`User registered: ${username}`);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
    };
  }

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('账户已被禁用');
    }

    const payload = {
      sub: user.id,
      username: user.username,
    };

    const token = this.jwtService.sign(payload);

    await this.logOperation(user.id, 'LOGIN', null, null);

    this.logger.log(`User logged in: ${username}`);

    return {
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }

  async logout(userId: number) {
    await this.logOperation(userId, 'LOGOUT', null, null);
    this.logger.log(`User logged out: ${userId}`);
    return { message: '登出成功' };
  }

  private async logOperation(
    userId: number,
    operationType: any,
    targetResource: string | null,
    ipAddress: string | null,
  ) {
    await this.prisma.operationLog.create({
      data: {
        userId,
        operationType,
        targetResource,
        ipAddress,
      },
    });
  }
}