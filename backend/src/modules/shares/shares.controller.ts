import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { SharesService } from './shares.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

class CreateShareDto {
  @IsInt()
  @Min(1)
  fileId: number;

  @IsString()
  @IsOptional()
  password?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  maxViews?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  expiresIn?: number;
}

@Controller('shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createShare(
    @CurrentUser('id') userId: number,
    @Body() createShareDto: CreateShareDto,
  ) {
    return this.sharesService.createShare(
      userId,
      createShareDto.fileId,
      createShareDto.password,
      createShareDto.maxViews,
      createShareDto.expiresIn,
    );
  }

  @Get(':shareCode')
  async getShare(
    @Param('shareCode') shareCode: string,
    @Query('password') password?: string,
  ) {
    return this.sharesService.getShareByCode(shareCode, password);
  }

  @Get(':shareCode/download')
  async downloadShareFile(
    @Param('shareCode') shareCode: string,
    @Query('password') password: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.sharesService.downloadShareFile(shareCode, password);

    res.setHeader('Content-Type', result.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);

    return res.send(result.buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getShareList(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.sharesService.getShareList(
      userId,
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 20,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteShare(
    @CurrentUser('id') userId: number,
    @Param('id') shareId: string,
  ) {
    return this.sharesService.deleteShare(userId, parseInt(shareId));
  }
}