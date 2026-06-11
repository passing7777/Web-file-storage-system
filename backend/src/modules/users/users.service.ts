import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getUserProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        storageLimit: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const files = await this.prisma.file.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      select: {
        fileSize: true,
      },
    });

    const usedStorage = files.reduce((sum, file) => sum + Number(file.fileSize), 0);

    return {
      ...user,
      usedStorage,
      storageLimit: Number(user.storageLimit),
    };
  }

  async updateUserEmail(userId: number, email: string) {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail && existingEmail.id !== userId) {
      throw new ConflictException('邮箱已被使用');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { email },
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async updateUserPassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new NotFoundException('旧密码不正确');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: '密码更新成功' };
  }
}