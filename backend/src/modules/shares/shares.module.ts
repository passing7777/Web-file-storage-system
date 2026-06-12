import { Module } from '@nestjs/common';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';
import { StorageModule } from '../../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [SharesController],
  providers: [SharesService],
  exports: [SharesService],
})
export class SharesModule {}