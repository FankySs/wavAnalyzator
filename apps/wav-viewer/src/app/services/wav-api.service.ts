import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { EMPTY, Observable, catchError, throwError } from 'rxjs';
import type {
  WavFileDto,
  WavFileDetailDto,
  WavChunkDto,
  WavChunkDetailDto,
  WaveformDto,
  RenameWavFileDto,
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
  CreateAdtlDto,
} from '@shared-types';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WavApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // --- Soubory ---

  getWavList(): Observable<WavFileDto[]> {
    return this.http
      .get<WavFileDto[]>(`${this.base}/wav`)
      .pipe(catchError(this.handleError));
  }

  uploadWav(file: File): Observable<WavFileDto> {
    const form = new FormData();
    form.append('file', file);
    return this.http
      .post<WavFileDto>(`${this.base}/wav/upload`, form)
      .pipe(catchError(this.handleError));
  }

  getWavDetail(id: string): Observable<WavFileDetailDto> {
    return this.http
      .get<WavFileDetailDto>(`${this.base}/wav/${id}`)
      .pipe(catchError(this.handleError));
  }

  renameWav(id: string, dto: RenameWavFileDto): Observable<WavFileDto> {
    return this.http
      .patch<WavFileDto>(`${this.base}/wav/${id}/rename`, dto)
      .pipe(catchError(this.handleError));
  }

  deleteWav(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/wav/${id}`)
      .pipe(catchError(this.handleError));
  }

  // --- Chunky ---

  getChunks(id: string): Observable<WavChunkDto[]> {
    return this.http
      .get<WavChunkDto[]>(`${this.base}/wav/${id}/chunks`)
      .pipe(catchError(this.handleError));
  }

  getChunkDetail(id: string, chunkId: string): Observable<WavChunkDetailDto> {
    return this.http
      .get<WavChunkDetailDto>(`${this.base}/wav/${id}/chunks/${chunkId}`)
      .pipe(catchError(this.handleError));
  }

  deleteChunk(fileId: string, chunkId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/wav/${fileId}/chunks/${chunkId}`)
      .pipe(catchError(this.handleError));
  }

  // --- LIST/INFO editace ---

  updateListInfo(fileId: string, chunkDbId: string, dto: UpdateListInfoDto): Observable<WavChunkDetailDto> {
    return this.http
      .put<WavChunkDetailDto>(`${this.base}/wav/${fileId}/chunks/${chunkDbId}/info`, dto)
      .pipe(catchError(this.handleError));
  }

  addInfoEntry(fileId: string, chunkDbId: string, dto: CreateInfoEntryDto): Observable<WavChunkDetailDto> {
    return this.http
      .post<WavChunkDetailDto>(`${this.base}/wav/${fileId}/chunks/${chunkDbId}/info`, dto)
      .pipe(catchError(this.handleError));
  }

  deleteInfoEntry(fileId: string, chunkDbId: string, tagId: string): Observable<WavChunkDetailDto> {
    return this.http
      .delete<WavChunkDetailDto>(
        `${this.base}/wav/${fileId}/chunks/${chunkDbId}/info/${tagId}`,
      )
      .pipe(catchError(this.handleError));
  }

  // --- bext editace ---

  updateBext(fileId: string, chunkDbId: string, dto: UpdateBextDto): Observable<WavChunkDetailDto> {
    return this.http
      .put<WavChunkDetailDto>(`${this.base}/wav/${fileId}/chunks/${chunkDbId}/bext`, dto)
      .pipe(catchError(this.handleError));
  }

  updateFact(fileId: string, chunkDbId: string, dto: UpdateFactDto): Observable<WavChunkDetailDto> {
    return this.http
      .put<WavChunkDetailDto>(`${this.base}/wav/${fileId}/chunks/${chunkDbId}/fact`, dto)
      .pipe(catchError(this.handleError));
  }

  updatePeak(fileId: string, chunkDbId: string, dto: UpdatePeakDto): Observable<WavChunkDetailDto> {
    return this.http
      .put<WavChunkDetailDto>(`${this.base}/wav/${fileId}/chunks/${chunkDbId}/peak`, dto)
      .pipe(catchError(this.handleError));
  }

  updateDisp(fileId: string, chunkDbId: string, dto: UpdateDispDto): Observable<WavChunkDetailDto> {
    return this.http
      .put<WavChunkDetailDto>(`${this.base}/wav/${fileId}/chunks/${chunkDbId}/disp`, dto)
      .pipe(catchError(this.handleError));
  }

  updateUmid(fileId: string, chunkDbId: string, dto: UpdateUmidDto): Observable<WavChunkDetailDto> {
    return this.http
      .put<WavChunkDetailDto>(`${this.base}/wav/${fileId}/chunks/${chunkDbId}/umid`, dto)
      .pipe(catchError(this.handleError));
  }

  updateInst(fileId: string, chunkDbId: string, dto: UpdateInstDto): Observable<WavChunkDetailDto> {
    return this.http
      .put<WavChunkDetailDto>(`${this.base}/wav/${fileId}/chunks/${chunkDbId}/inst`, dto)
      .pipe(catchError(this.handleError));
  }

  updateSmpl(fileId: string, chunkDbId: string, dto: UpdateSmplDto): Observable<WavChunkDetailDto> {
    return this.http
      .put<WavChunkDetailDto>(`${this.base}/wav/${fileId}/chunks/${chunkDbId}/smpl`, dto)
      .pipe(catchError(this.handleError));
  }

  updateCue(fileId: string, chunkDbId: string, dto: UpdateCueDto): Observable<WavChunkDetailDto> {
    return this.http
      .put<WavChunkDetailDto>(`${this.base}/wav/${fileId}/chunks/${chunkDbId}/cue`, dto)
      .pipe(catchError(this.handleError));
  }

  updateAdtl(fileId: string, chunkDbId: string, dto: UpdateAdtlDto): Observable<WavChunkDetailDto> {
    return this.http
      .put<WavChunkDetailDto>(`${this.base}/wav/${fileId}/chunks/${chunkDbId}/adtl`, dto)
      .pipe(catchError(this.handleError));
  }

  updateMext(fileId: string, chunkDbId: string, dto: UpdateMextDto): Observable<WavChunkDetailDto> {
    return this.http
      .put<WavChunkDetailDto>(`${this.base}/wav/${fileId}/chunks/${chunkDbId}/mext`, dto)
      .pipe(catchError(this.handleError));
  }

  updateLevl(fileId: string, chunkDbId: string, dto: UpdateLevlDto): Observable<WavChunkDetailDto> {
    return this.http
      .put<WavChunkDetailDto>(`${this.base}/wav/${fileId}/chunks/${chunkDbId}/levl`, dto)
      .pipe(catchError(this.handleError));
  }

  updateCart(fileId: string, chunkDbId: string, dto: UpdateCartDto): Observable<WavChunkDetailDto> {
    return this.http
      .put<WavChunkDetailDto>(`${this.base}/wav/${fileId}/chunks/${chunkDbId}/cart`, dto)
      .pipe(catchError(this.handleError));
  }

  updateIxml(fileId: string, chunkDbId: string, dto: UpdateIxmlDto): Observable<WavChunkDetailDto> {
    return this.http
      .put<WavChunkDetailDto>(`${this.base}/wav/${fileId}/chunks/${chunkDbId}/ixml`, dto)
      .pipe(catchError(this.handleError));
  }

  updateAxml(fileId: string, chunkDbId: string, dto: UpdateAxmlDto): Observable<WavChunkDetailDto> {
    return this.http
      .put<WavChunkDetailDto>(`${this.base}/wav/${fileId}/chunks/${chunkDbId}/axml`, dto)
      .pipe(catchError(this.handleError));
  }

  // --- Vytváření chunků ---

  createListInfo(fileId: string, dto: CreateListInfoDto): Observable<WavChunkDto> {
    return this.http
      .post<WavChunkDto>(`${this.base}/wav/${fileId}/chunks/list-info`, dto)
      .pipe(catchError(this.handleError));
  }

  createBext(fileId: string, dto: CreateBextDto): Observable<WavChunkDto> {
    return this.http
      .post<WavChunkDto>(`${this.base}/wav/${fileId}/chunks/bext`, dto)
      .pipe(catchError(this.handleError));
  }

  createCue(fileId: string, dto: CreateCueDto): Observable<WavChunkDto> {
    return this.http
      .post<WavChunkDto>(`${this.base}/wav/${fileId}/chunks/cue`, dto)
      .pipe(catchError(this.handleError));
  }

  createFact(fileId: string, dto: CreateFactDto): Observable<WavChunkDto> {
    return this.http
      .post<WavChunkDto>(`${this.base}/wav/${fileId}/chunks/fact`, dto)
      .pipe(catchError(this.handleError));
  }

  createInst(fileId: string, dto: CreateInstDto): Observable<WavChunkDto> {
    return this.http
      .post<WavChunkDto>(`${this.base}/wav/${fileId}/chunks/inst`, dto)
      .pipe(catchError(this.handleError));
  }

  createSmpl(fileId: string, dto: CreateSmplDto): Observable<WavChunkDto> {
    return this.http
      .post<WavChunkDto>(`${this.base}/wav/${fileId}/chunks/smpl`, dto)
      .pipe(catchError(this.handleError));
  }

  createCart(fileId: string, dto: CreateCartDto): Observable<WavChunkDto> {
    return this.http
      .post<WavChunkDto>(`${this.base}/wav/${fileId}/chunks/cart`, dto)
      .pipe(catchError(this.handleError));
  }

  createDisp(fileId: string, dto: CreateDispDto): Observable<WavChunkDto> {
    return this.http
      .post<WavChunkDto>(`${this.base}/wav/${fileId}/chunks/disp`, dto)
      .pipe(catchError(this.handleError));
  }

  createIxml(fileId: string, dto: CreateIxmlDto): Observable<WavChunkDto> {
    return this.http
      .post<WavChunkDto>(`${this.base}/wav/${fileId}/chunks/ixml`, dto)
      .pipe(catchError(this.handleError));
  }

  createAxml(fileId: string, dto: CreateAxmlDto): Observable<WavChunkDto> {
    return this.http
      .post<WavChunkDto>(`${this.base}/wav/${fileId}/chunks/axml`, dto)
      .pipe(catchError(this.handleError));
  }

  createAdtl(fileId: string, dto: CreateAdtlDto): Observable<WavChunkDto> {
    return this.http
      .post<WavChunkDto>(`${this.base}/wav/${fileId}/chunks/adtl`, dto)
      .pipe(catchError(this.handleError));
  }

  downloadWav(id: string): Observable<Blob> {
    return this.http
      .get(`${this.base}/wav/${id}/download`, { responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }

  getWaveform(id: string, width: number): Observable<WaveformDto> {
    return this.http
      .get<WaveformDto>(`${this.base}/wav/${id}/waveform`, { params: { width: String(width) } })
      .pipe(catchError(this.handleError));
  }

  getStreamUrl(id: string): string {
    return `${this.base}/wav/${id}/stream`;
  }

  private readonly handleError = (err: HttpErrorResponse): Observable<never> => {
    if (err.status === 0) {
      // ProgressEvent = XHR bylo přerušeno (navigace, zničení komponenty) – není to chyba serveru
      if (err.error instanceof ProgressEvent) return EMPTY;
      return throwError(() => new Error('Server není dostupný. Zkontroluj, zda běží BE na portu 3000.'));
    }
    return throwError(() => new Error(this.extractApiErrorMessage(err)));
  };

  private extractApiErrorMessage(err: HttpErrorResponse): string {
    const msg: unknown = err.error?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
    return `Chyba ${err.status}`;
  }
}
