export interface RiffChunk {
  id: string;              // 4CC ( 'fmt ', 'data', 'LIST', 'JUNK', ...)
  offset: number;          // absolutní offset chunku (na 4CC)
  payloadOffset: number;   // absolutní offset payloadu (offset + 8)
  size: number;            // velikost payloadu (bez paddingu)
}

export interface InfoEntry {
  /** 4CC subchunku uvnitř LIST(INFO), např. INAM, IART, ICMT, ICRD... */
  id: string;
  /** Hodnota textu (bez trailing NUL, otrimovaná od koncových \0/\r/\n/\t). */
  value: string;
  /** Původní velikost payloadu subchunku (bez paddingu). */
  rawSize: number;
  /** Absolutní offset celého subchunku. */
  offset: number;
  /** Absolutní offset payloadu subchunku. */
  payloadOffset: number;
}

/** Minimální výsledek WAV parseru */
export interface ParsedWav {
  audioFormat: number;
  channels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  bitsPerSample: number;
  dataSize: number;
  durationSec: number;

  /** Všechny nalezené chunky (v pořadí v souboru) */
  chunks: RiffChunk[];

  /** Volitelný výpis LIST/INFO položek (pokud se našly) */
  info?: InfoEntry[];

  fmtExtensible?: {
    cbSize: number;              // velikost „extra“ části
    validBitsPerSample?: number; // často = bitsPerSample
    channelMask?: number;        // bitová maska kanálů dle WAVEFORMATEXTENSIBLE
    subFormatGuid?: string;      // GUID formátu ( KSDATAFORMAT_SUBTYPE_PCM / IEEE_FLOAT)
  };
}
