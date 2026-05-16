import { Module } from '@nestjs/common';
import { WavController } from './controllers/wav.controller';
import { WavQueryService } from './services/query/wav-query.service';
import { WavMutationService } from './services/mutation/wav-mutation.service';
import { WavValidatorService } from './validation/wav-validator.service';
import { WavStorageService } from './services/io/wav-storage.service';
import { WavParserService } from './services/io/wav-parser.service';
import { WavChunkUpdateService } from './services/mutation/wav-chunk-update.service';
import { WavChunkCreateService } from './services/mutation/wav-chunk-create.service';
import { WavSerializerService } from './services/io/wav-serializer.service';
import { WavWaveformService } from './services/query/wav-waveform.service';
import { R2StorageService } from './services/io/r2-storage.service';

@Module({
  controllers: [WavController],
  providers: [
    R2StorageService,
    WavQueryService,
    WavMutationService,
    WavValidatorService,
    WavStorageService,
    WavParserService,
    WavChunkUpdateService,
    WavChunkCreateService,
    WavSerializerService,
    WavWaveformService,
  ],
})
export class WavModule {}