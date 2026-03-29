import { Module } from '@nestjs/common';
import { WavController } from './wav.controller';
import { WavService } from './wav.service';
import { WavValidatorService } from './wav-validator.service';
import { WavStorageService } from './wav-storage.service';
import { WavParserService } from './wav-parser.service';
import { WavChunkUpdateService } from './wav-chunk-update.service';
import { WavChunkCreateService } from './wav-chunk-create.service';
import { WavSerializerService } from './wav-serializer.service';
import { WavWaveformService } from './wav-waveform.service';

@Module({
  controllers: [WavController],
  providers: [
    WavService,
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
