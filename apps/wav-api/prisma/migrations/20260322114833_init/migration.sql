-- CreateTable
CREATE TABLE "WavFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filePath" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "WavChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wavFileId" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "offset" INTEGER NOT NULL,
    "payloadOffset" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "isAudioData" BOOLEAN NOT NULL DEFAULT false,
    "rawData" BLOB,
    CONSTRAINT "WavChunk_wavFileId_fkey" FOREIGN KEY ("wavFileId") REFERENCES "WavFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
