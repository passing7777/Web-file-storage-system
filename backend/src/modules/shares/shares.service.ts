import {
  Injectable,
  NotFoundException,
  GoneException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../storage/minio.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SharesService {
  private readonly logger = new Logger(SharesService.name);

  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
  ) {}

  async createShare(
    userId: number,
    fileId: number,
    password?: string,
    maxViews?: number,
    expiresIn?: number,
  ) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.deletedAt) {
      throw new NotFoundException('文件不存在');
    }

    if (file.userId !== userId) {
      throw new ForbiddenException('无权分享此文件');
    }

    const shareCode = uuidv4().substring(0, 12);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (expiresIn || 24));

    const share = await this.prisma.share.create({
      data: {
        fileId,
        userId,
        shareCode,
        password,
        maxViews: maxViews || 100,
        expiresAt,
      },
    });

    await this.logOperation(userId, 'SHARE_CREATE', `share:${share.id}`, null);

    this.logger.log(`Share created: ${shareCode} by user ${userId}`);

    return {
      id: share.id,
      shareCode: share.shareCode,
      expiresAt: share.expiresAt,
      shareUrl: `/share/${share.shareCode}`,
    };
  }

  async getShareByCode(shareCode: string, password?: string) {
    const share = await this.prisma.share.findUnique({
      where: { shareCode },
      include: {
        file: true,
      },
    });

    if (!share) {
      throw new NotFoundException('分享链接不存在');
    }

    if (new Date() > share.expiresAt) {
      throw new GoneException('分享链接已过期');
    }

    if (share.viewCount >= (share.maxViews || 100)) {
      throw new ForbiddenException('分享链接访问次数已达上限');
    }

    if (share.password && share.password !== password) {
      throw new ForbiddenException('分享密码错误');
    }

    await this.prisma.share.update({
      where: { id: share.id },
      data: { viewCount: { increment: 1 } },
    });

    await this.logOperation(share.userId, 'SHARE_ACCESS', `share:${share.id}`, null);

    return {
      fileName: share.file.fileName,
      fileSize: Number(share.file.fileSize),
      fileType: share.file.fileType,
      downloadUrl: `/api/v1/shares/${shareCode}/download`,
    };
  }

  async downloadShareFile(shareCode: string, password?: string) {
    const share = await this.prisma.share.findUnique({
      where: { shareCode },
      include: {
        file: true,
      },
    });

    if (!share) {
      throw new NotFoundException('分享链接不存在');
    }

    if (new Date() > share.expiresAt) {
      throw new GoneException('分享链接已过期');
    }

    if (share.viewCount >= (share.maxViews || 100)) {
      throw new ForbiddenException('分享链接访问次数已达上限');
    }

    if (share.password && share.password !== password) {
      throw new ForbiddenException('分享密码错误');
    }

    const fileBuffer = await this.minioService.downloadFile(share.file.storagePath);

    return {
      buffer: fileBuffer,
      fileName: share.file.fileName,
      fileType: share.file.fileType,
    };
  }

  async getShareList(userId: number, page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;

    const [shares, total] = await Promise.all([
      this.prisma.share.findMany({
        where: { userId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          file: {
            select: {
              fileName: true,
              fileSize: true,
            },
          },
        },
      }),
      this.prisma.share.count({ where: { userId } }),
    ]);

    return {
      items: shares.map((s) => ({
        id: s.id,
        shareCode: s.shareCode,
        fileName: s.file.fileName,
        fileSize: Number(s.file.fileSize),
        viewCount: s.viewCount,
        maxViews: s.maxViews,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async deleteShare(userId: number, shareId: number) {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
    });

    if (!share) {
      throw new NotFoundException('分享链接不存在');
    }

    if (share.userId !== userId) {
      throw new ForbiddenException('无权删除此分享链接');
    }

    await this.prisma.share.delete({
      where: { id: shareId },
    });

    await this.logOperation(userId, 'SHARE_DELETE', `share:${shareId}`, null);

    this.logger.log(`Share deleted: ${shareId} by user ${userId}`);

    return { message: '分享链接已删除' };
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