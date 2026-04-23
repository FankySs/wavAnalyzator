import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Headers,
  Body,
  BadRequestException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import type {
  WavFileDto,
  WavFileDetailDto,
  WavChunkDto,
  WavChunkDetailDto,
  WaveformDto,
  RenameWavFileDto,
  CreateAdtlDto,
  UpdateListInfoDto,
  UpdateBextDto,
  UpdateCueDto,
  UpdateSmplDto,
  UpdateInstDto,
  UpdateFactDto,
  UpdatePeakDto,
  UpdateDispDto,
  UpdateUmidDto,
  UpdateCartDto,
  UpdateIxmlDto,
  UpdateAxmlDto,
  UpdateAdtlDto,
  UpdateMextDto,
  UpdateLevlDto,
  CreateInfoEntryDto,
  CreateListInfoDto,
  CreateBextDto,
  CreateCueDto,
  CreateFactDto,
  CreateInstDto,
  CreateSmplDto,
  CreateCartDto,
  CreateDispDto,
  CreateIxmlDto,
  CreateAxmlDto,
} from '@shared-types';
import { WavService } from './wav.service';
import { WavChunkUpdateService } from './wav-chunk-update.service';
import { WavChunkCreateService } from './wav-chunk-create.service';
import { WavSerializerService } from './wav-serializer.service';
import { WavWaveformService } from './wav-waveform.service';
import { R2StorageService } from './r2-storage.service';

@Controller('wav')
export class WavController {
  constructor(
    private readonly wavService: WavService,
    private readonly chunkUpdateService: WavChunkUpdateService,
    private readonly chunkCreateService: WavChunkCreateService,
    private readonly wavSerializerService: WavSerializerService,
    private readonly wavWaveformService: WavWaveformService,
    private readonly r2Storage: R2StorageService,
  ) {}

  // --- Soubory ---

  @Get()
  async findAll(): Promise<WavFileDto[]> {
    return this.wavService.findAll();
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File): Promise<WavFileDto> {
    if (!file) {
      throw new BadRequestException('Žádný soubor nebyl nahrán. Použij pole "file".');
    }
    return this.wavService.upload(file);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<WavFileDetailDto> {
    return this.wavService.findById(id);
  }

  @Patch(':id/rename')
  async renameFile(
    @Param('id') id: string,
    @Body() dto: RenameWavFileDto,
  ): Promise<WavFileDto> {
    return this.wavService.renameFile(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteById(@Param('id') id: string): Promise<void> {
    return this.wavService.deleteById(id);
  }

  @Get(':id/download')
  async downloadWav(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const { buffer, fileName } = await this.wavSerializerService.buildWavBuffer(id);
      res.set('Content-Type', 'audio/wav');
      res.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.set('Content-Length', String(buffer.byteLength));
      res.end(buffer);
    } catch (err) {
      if (err instanceof NotFoundException) {
        res.status(404).json({ message: (err as Error).message });
      } else {
        console.error('[WavController] download error:', err);
        res.status(500).json({ message: 'Sestavení WAV souboru se nezdařilo.' });
      }
    }
  }

  @Get(':id/waveform')
  async getWaveform(
    @Param('id') id: string,
    @Query('width') widthStr?: string,
  ): Promise<WaveformDto> {
    const width = widthStr !== undefined ? parseInt(widthStr, 10) : 1000;
    if (!Number.isInteger(width) || width < 100 || width > 4000) {
      throw new BadRequestException('width musí být celé číslo v rozsahu 100–4000.');
    }
    return this.wavWaveformService.getWaveform(id, width);
  }

  @Get(':id/stream')
  async streamAudio(
    @Param('id') id: string,
    @Res() res: Response,
    @Headers('range') range?: string,
  ): Promise<void> {
    try {
      const { storageKey, fileName, fileSize } = await this.wavService.getFileInfo(id);

      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);

      if (range) {
        const [start, end] = this.parseRange(range, fileSize);
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', String(end - start + 1));
        const stream = await this.r2Storage.createReadStream(storageKey, start, end);
        stream.pipe(res);
      } else {
        res.setHeader('Content-Length', String(fileSize));
        const stream = await this.r2Storage.createReadStream(storageKey);
        stream.pipe(res);
      }
    } catch (err) {
      if (err instanceof NotFoundException) {
        res.status(404).json({ message: (err as Error).message });
      } else {
        res.status(500).json({ message: 'Stream se nezdařil.' });
      }
    }
  }

  // --- Chunky – čtení ---

  @Get(':id/chunks')
  async findChunks(@Param('id') id: string): Promise<WavChunkDto[]> {
    return this.wavService.findChunks(id);
  }

  @Get(':id/chunks/:chunkId')
  async findChunkDetail(
    @Param('id') id: string,
    @Param('chunkId') chunkId: string,
  ): Promise<WavChunkDetailDto> {
    return this.wavService.findChunkDetail(id, chunkId);
  }

  // --- Chunky – mazání ---

  @Delete(':id/chunks/:chunkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteChunk(
    @Param('id') id: string,
    @Param('chunkId') chunkId: string,
  ): Promise<void> {
    return this.wavService.deleteChunk(id, chunkId);
  }

  // --- LIST/INFO – editace ---

  @Put(':id/chunks/:chunkId/info')
  async updateListInfo(
    @Param('chunkId') chunkId: string,
    @Body() dto: UpdateListInfoDto,
  ): Promise<WavChunkDetailDto> {
    return this.chunkUpdateService.updateListInfo(chunkId, dto);
  }

  @Post(':id/chunks/:chunkId/info')
  @HttpCode(HttpStatus.OK)
  async addInfoEntry(
    @Param('chunkId') chunkId: string,
    @Body() dto: CreateInfoEntryDto,
  ): Promise<WavChunkDetailDto> {
    return this.chunkUpdateService.addInfoEntry(chunkId, dto);
  }

  @Delete(':id/chunks/:chunkId/info/:tagId')
  async deleteInfoEntry(
    @Param('chunkId') chunkId: string,
    @Param('tagId') tagId: string,
  ): Promise<WavChunkDetailDto> {
    return this.chunkUpdateService.deleteInfoEntry(chunkId, tagId);
  }

  // --- bext – editace ---

  @Put(':id/chunks/:chunkId/bext')
  async updateBext(
    @Param('chunkId') chunkId: string,
    @Body() dto: UpdateBextDto,
  ): Promise<WavChunkDetailDto> {
    return this.chunkUpdateService.updateBext(chunkId, dto);
  }

  @Put(':id/chunks/:chunkId/cue')
  async updateCue(
    @Param('chunkId') chunkId: string,
    @Body() dto: UpdateCueDto,
  ): Promise<WavChunkDetailDto> {
    return this.chunkUpdateService.updateCue(chunkId, dto);
  }

  @Put(':id/chunks/:chunkId/fact')
  async updateFact(@Param('chunkId') chunkId: string, @Body() dto: UpdateFactDto): Promise<WavChunkDetailDto> {
    return this.chunkUpdateService.updateFact(chunkId, dto);
  }

  @Put(':id/chunks/:chunkId/peak')
  async updatePeak(@Param('chunkId') chunkId: string, @Body() dto: UpdatePeakDto): Promise<WavChunkDetailDto> {
    return this.chunkUpdateService.updatePeak(chunkId, dto);
  }

  @Put(':id/chunks/:chunkId/disp')
  async updateDisp(@Param('chunkId') chunkId: string, @Body() dto: UpdateDispDto): Promise<WavChunkDetailDto> {
    return this.chunkUpdateService.updateDisp(chunkId, dto);
  }

  @Put(':id/chunks/:chunkId/umid')
  async updateUmid(@Param('chunkId') chunkId: string, @Body() dto: UpdateUmidDto): Promise<WavChunkDetailDto> {
    return this.chunkUpdateService.updateUmid(chunkId, dto);
  }

  @Put(':id/chunks/:chunkId/inst')
  async updateInst(
    @Param('chunkId') chunkId: string,
    @Body() dto: UpdateInstDto,
  ): Promise<WavChunkDetailDto> {
    return this.chunkUpdateService.updateInst(chunkId, dto);
  }

  @Put(':id/chunks/:chunkId/smpl')
  async updateSmpl(
    @Param('chunkId') chunkId: string,
    @Body() dto: UpdateSmplDto,
  ): Promise<WavChunkDetailDto> {
    return this.chunkUpdateService.updateSmpl(chunkId, dto);
  }

  @Put(':id/chunks/:chunkId/adtl')
  async updateAdtl(
    @Param('chunkId') chunkId: string,
    @Body() dto: UpdateAdtlDto,
  ): Promise<WavChunkDetailDto> {
    return this.chunkUpdateService.updateAdtl(chunkId, dto);
  }

  @Put(':id/chunks/:chunkId/mext')
  async updateMext(
    @Param('chunkId') chunkId: string,
    @Body() dto: UpdateMextDto,
  ): Promise<WavChunkDetailDto> {
    return this.chunkUpdateService.updateMext(chunkId, dto);
  }

  @Put(':id/chunks/:chunkId/levl')
  async updateLevl(
    @Param('chunkId') chunkId: string,
    @Body() dto: UpdateLevlDto,
  ): Promise<WavChunkDetailDto> {
    return this.chunkUpdateService.updateLevl(chunkId, dto);
  }

  @Put(':id/chunks/:chunkId/cart')
  async updateCart(
    @Param('chunkId') chunkId: string,
    @Body() dto: UpdateCartDto,
  ): Promise<WavChunkDetailDto> {
    return this.chunkUpdateService.updateCart(chunkId, dto);
  }

  @Put(':id/chunks/:chunkId/ixml')
  async updateIxml(
    @Param('chunkId') chunkId: string,
    @Body() dto: UpdateIxmlDto,
  ): Promise<WavChunkDetailDto> {
    return this.chunkUpdateService.updateIxml(chunkId, dto);
  }

  @Put(':id/chunks/:chunkId/axml')
  async updateAxml(
    @Param('chunkId') chunkId: string,
    @Body() dto: UpdateAxmlDto,
  ): Promise<WavChunkDetailDto> {
    return this.chunkUpdateService.updateAxml(chunkId, dto);
  }

  // --- Chunky – vytváření ---

  @Post(':id/chunks/list-info')
  @HttpCode(HttpStatus.CREATED)
  async createListInfo(
    @Param('id') id: string,
    @Body() dto: CreateListInfoDto,
  ): Promise<WavChunkDto> {
    return this.chunkCreateService.createListInfo(id, dto);
  }

  @Post(':id/chunks/bext')
  @HttpCode(HttpStatus.CREATED)
  async createBext(
    @Param('id') id: string,
    @Body() dto: CreateBextDto,
  ): Promise<WavChunkDto> {
    return this.chunkCreateService.createBext(id, dto);
  }

  @Post(':id/chunks/cue')
  @HttpCode(HttpStatus.CREATED)
  async createCue(
    @Param('id') id: string,
    @Body() dto: CreateCueDto,
  ): Promise<WavChunkDto> {
    return this.chunkCreateService.createCue(id, dto);
  }

  @Post(':id/chunks/fact')
  @HttpCode(HttpStatus.CREATED)
  async createFact(
    @Param('id') id: string,
    @Body() dto: CreateFactDto,
  ): Promise<WavChunkDto> {
    return this.chunkCreateService.createFact(id, dto);
  }

  @Post(':id/chunks/inst')
  @HttpCode(HttpStatus.CREATED)
  async createInst(
    @Param('id') id: string,
    @Body() dto: CreateInstDto,
  ): Promise<WavChunkDto> {
    return this.chunkCreateService.createInst(id, dto);
  }

  @Post(':id/chunks/smpl')
  @HttpCode(HttpStatus.CREATED)
  async createSmpl(
    @Param('id') id: string,
    @Body() dto: CreateSmplDto,
  ): Promise<WavChunkDto> {
    return this.chunkCreateService.createSmpl(id, dto);
  }

  @Post(':id/chunks/cart')
  @HttpCode(HttpStatus.CREATED)
  async createCart(
    @Param('id') id: string,
    @Body() dto: CreateCartDto,
  ): Promise<WavChunkDto> {
    return this.chunkCreateService.createCart(id, dto);
  }

  @Post(':id/chunks/disp')
  @HttpCode(HttpStatus.CREATED)
  async createDisp(
    @Param('id') id: string,
    @Body() dto: CreateDispDto,
  ): Promise<WavChunkDto> {
    return this.chunkCreateService.createDisp(id, dto);
  }

  @Post(':id/chunks/ixml')
  @HttpCode(HttpStatus.CREATED)
  async createIxml(
    @Param('id') id: string,
    @Body() dto: CreateIxmlDto,
  ): Promise<WavChunkDto> {
    return this.chunkCreateService.createIxml(id, dto);
  }

  @Post(':id/chunks/axml')
  @HttpCode(HttpStatus.CREATED)
  async createAxml(
    @Param('id') id: string,
    @Body() dto: CreateAxmlDto,
  ): Promise<WavChunkDto> {
    return this.chunkCreateService.createAxml(id, dto);
  }

  @Post(':id/chunks/adtl')
  @HttpCode(HttpStatus.CREATED)
  async createAdtl(
    @Param('id') id: string,
    @Body() dto: CreateAdtlDto,
  ): Promise<WavChunkDto> {
    return this.chunkCreateService.createAdtl(id, dto);
  }

  private parseRange(rangeHeader: string, fileSize: number): [number, number] {
    const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
    if (!match) return [0, fileSize - 1];
    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
    return [start, Math.min(end, fileSize - 1)];
  }
}