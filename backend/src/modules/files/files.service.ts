import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../storage/minio.service';
import { Express } from 'express';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly maxFileSize = parseInt(process.env.FILE_MAX_SIZE || '524288000');
  private readonly forbiddenExtensions = ['.exe', '.bat', '.sh', '.cmd', '.com', '.scr'];

  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
  ) {}

  async uploadFile(userId: number, file: Express.Multer.File) {
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`文件大小超过限制（最大${this.maxFileSize / 1024 / 1024}MB）`);
    }

    const fileExtension = this.getFileExtension(file.originalname);
    if (this.forbiddenExtensions.includes(fileExtension.toLowerCase())) {
      throw new BadRequestException('禁止上传可执行文件');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const files = await this.prisma.file.findMany({
      where: { userId, deletedAt: null },
      select: { fileSize: true },
    });

    const usedStorage = files.reduce((sum, f) => sum + Number(f.fileSize), 0);
    const storageLimit = Number(user.storageLimit);

    if (usedStorage + file.size > storageLimit) {
      throw new BadRequestException('存储空间不足');
    }

    const storagePath = this.minioService.generateObjectPath(userId, fileExtension.replace('.', ''));

    await this.minioService.uploadFile(
      storagePath,
      file.buffer,
      file.size,
      file.mimetype,
    );

    const fileRecord = await this.prisma.file.create({
      data: {
        userId,
        fileName: file.originalname,
        fileSize: BigInt(file.size),
        fileType: file.mimetype,
        storagePath,
      },
    });

    await this.logOperation(userId, 'UPLOAD', `file:${fileRecord.id}`, null);

    this.logger.log(`File uploaded: ${file.originalname} by user ${userId}`);

    return {
      id: fileRecord.id,
      fileName: fileRecord.fileName,
      fileSize: Number(fileRecord.fileSize),
      fileType: fileRecord.fileType,
      createdAt: fileRecord.createdAt,
    };
  }

  async downloadFile(userId: number, fileId: number) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.deletedAt) {
      throw new NotFoundException('文件不存在');
    }

    if (file.userId !== userId) {
      throw new ForbiddenException('无权访问此文件');
    }

    const fileBuffer = await this.minioService.downloadFile(file.storagePath);

    await this.logOperation(userId, 'DOWNLOAD', `file:${fileId}`, null);

    this.logger.log(`File downloaded: ${file.fileName} by user ${userId}`);

    return {
      buffer: fileBuffer,
      fileName: file.fileName,
      fileType: file.fileType,
    };
  }

  async getFileList(
    userId: number,
    page: number = 1,
    pageSize: number = 20,
    keyword?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const skip = (page - 1) * pageSize;

    const where: any = {
      userId,
      deletedAt: null,
    };

    if (keyword) {
      where.fileName = {
        contains: keyword,
        mode: 'insensitive',
      };
    }

    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          fileType: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.file.count({ where }),
    ]);

    return {
      items: files.map((f) => ({
        ...f,
        fileSize: Number(f.fileSize),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async deleteFile(userId: number, fileId: number) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('文件不存在');
    }

    if (file.userId !== userId) {
      throw new ForbiddenException('无权删除此文件');
    }

    await this.prisma.file.update({
      where: { id: fileId },
      data: { deletedAt: new Date() },
    });

    await this.logOperation(userId, 'DELETE', `file:${fileId}`, null);

    this.logger.log(`File deleted (soft): ${file.fileName} by user ${userId}`);

    return { message: '文件已移至回收站' };
  }

  async getTrashList(userId: number, page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;

    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where: {
          userId,
          deletedAt: { not: null },
        },
        skip,
        take: pageSize,
        orderBy: { deletedAt: 'desc' },
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          fileType: true,
          deletedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.file.count({
        where: {
          userId,
          deletedAt: { not: null },
        },
      }),
    ]);

    return {
      items: files.map((f) => ({
        ...f,
        fileSize: Number(f.fileSize),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async restoreFile(userId: number, fileId: number) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('文件不存在');
    }

    if (file.userId !== userId) {
      throw new ForbiddenException('无权恢复此文件');
    }

    if (!file.deletedAt) {
      throw new BadRequestException('文件不在回收站中');
    }

    await this.prisma.file.update({
      where: { id: fileId },
      data: { deletedAt: null },
    });

    await this.logOperation(userId, 'RESTORE', `file:${fileId}`, null);

    this.logger.log(`File restored: ${file.fileName} by user ${userId}`);

    return { message: '文件已恢复' };
  }

  async permanentDeleteFile(userId: number, fileId: number) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('文件不存在');
    }

    if (file.userId !== userId) {
      throw new ForbiddenException('无权删除此文件');
    }

    await this.minioService.deleteFile(file.storagePath);

    await this.prisma.file.delete({
      where: { id: fileId },
    });

    this.logger.log(`File permanently deleted: ${file.fileName} by user ${userId}`);

    return { message: '文件已永久删除' };
  }

  async renameFile(userId: number, fileId: number, newName: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.deletedAt) {
      throw new NotFoundException('文件不存在');
    }

    if (file.userId !== userId) {
      throw new ForbiddenException('无权重命名此文件');
    }

    const existingFile = await this.prisma.file.findFirst({
      where: {
        userId,
        fileName: newName,
        deletedAt: null,
        id: { not: fileId },
      },
    });

    if (existingFile) {
      throw new BadRequestException('文件名已存在');
    }

    const updatedFile = await this.prisma.file.update({
      where: { id: fileId },
      data: { fileName: newName },
    });

    await this.logOperation(userId, 'RENAME', `file:${fileId}`, null);

    this.logger.log(`File renamed: ${file.fileName} -> ${newName} by user ${userId}`);

    return {
      id: updatedFile.id,
      fileName: updatedFile.fileName,
      updatedAt: updatedFile.updatedAt,
    };
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
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