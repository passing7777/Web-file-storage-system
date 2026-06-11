import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, MinLength } from 'class-validator';

class RenameFileDto {
  @IsString()
  @MinLength(1, { message: '文件名不能为空' })
  newName: string;
}

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentUser('id') userId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.filesService.uploadFile(userId, file);
  }

  @Get('download/:id')
  async downloadFile(
    @CurrentUser('id') userId: number,
    @Param('id') fileId: string,
    @Res() res: Response,
  ) {
    const result = await this.filesService.downloadFile(userId, parseInt(fileId));

    res.setHeader('Content-Type', result.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);

    return res.send(result.buffer);
  }

  @Get('list')
  async getFileList(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.filesService.getFileList(
      userId,
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 20,
      keyword,
      sortBy || 'createdAt',
      sortOrder || 'desc',
    );
  }

  @Delete(':id')
  async deleteFile(
    @CurrentUser('id') userId: number,
    @Param('id') fileId: string,
  ) {
    return this.filesService.deleteFile(userId, parseInt(fileId));
  }

  @Get('trash')
  async getTrashList(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.filesService.getTrashList(
      userId,
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 20,
    );
  }

  @Post('trash/:id/restore')
  async restoreFile(
    @CurrentUser('id') userId: number,
    @Param('id') fileId: string,
  ) {
    return this.filesService.restoreFile(userId, parseInt(fileId));
  }

  @Delete('trash/:id')
  async permanentDeleteFile(
    @CurrentUser('id') userId: number,
    @Param('id') fileId: string,
  ) {
    return this.filesService.permanentDeleteFile(userId, parseInt(fileId));
  }

  @Put(':id/rename')
  async renameFile(
    @CurrentUser('id') userId: number,
    @Param('id') fileId: string,
    @Body() renameFileDto: RenameFileDto,
  ) {
    return this.filesService.renameFile(userId, parseInt(fileId), renameFileDto.newName);
  }
}