# WAV Analyzer

Webová aplikace pro analýzu a editaci zvukových souborů WAV.
Bakalářská práce, VUT FEKT, Audio inženýrství.

---

## Co aplikace umí

- Nahrání a parsování WAV souborů
- Zobrazení struktury chunků (typ, velikost, offset)
- Editace metadat (LIST/INFO, bext, cue, smpl, inst, cart a další)
- Přidávání a mazání chunků
- Waveform vizualizace s audio přehrávačem
- Download upraveného souboru jako platný WAV

---

## Technologie

| Vrstva | Technologie |
|---|---|
| Frontend | Angular 20, TypeScript, Signals API |
| Backend | NestJS, TypeScript |
| Databáze | SQLite (via Prisma ORM) |
| Monorepo | Nx 22 |
| Správce balíčků | yarn |

---

## Požadavky

Před spuštěním je potřeba mít nainstalované:

- **Node.js 18+** – https://nodejs.org
- **yarn** – nainstaluj přes npm:
  ```bash
  npm install -g yarn
  ```
- **Git** – https://git-scm.com

Ověření instalace:
```bash
node -v   # musí být v18 nebo vyšší
yarn -v
git --version
```

---

## Instalace a spuštění

### Krok 1 – Klonování repozitáře

```bash
git clone https://github.com/FankySs/wavAnalyzator.git
cd wavAnalyzator
```

### Krok 2 – Instalace závislostí

```bash
yarn install
```

### Krok 3 – Inicializace databáze

```bash
yarn nx run wav-api:prisma-migrate
```

Vytvoří SQLite databázi v `apps/wav-api/prisma/dev.db`.

### Krok 4 – Spuštění backendu

```bash
yarn nx serve wav-api
```

Backend běží na **http://localhost:3000**

### Krok 5 – Spuštění frontendu *(nový terminál)*

```bash
yarn nx serve wav-viewer
```

Frontend běží na **http://localhost:4200**

### Krok 6 – Otevřít aplikaci

Otevři **http://localhost:4200** v prohlížeči.

---

## Struktura projektu

```
apps/
  wav-viewer/    ← Angular frontend (port 4200)
  wav-api/       ← NestJS backend (port 3000)
libs/
  shared-types/  ← Sdílené TypeScript typy (DTOs)
  riff-parser/   ← Parser a serializer WAV/RIFF souborů
```

---

## Časté problémy

### Backend se nespustí

- Zkontroluj, že port 3000 není obsazený jiným procesem
- Zkontroluj, že byla spuštěna migrace databáze (Krok 3)

### Frontend hlásí chybu připojení k serveru

- Zkontroluj, že backend běží na portu 3000 (Krok 4)
- Zkontroluj výstup terminálu backendu na případné chyby

### `yarn install` selže

- Zkontroluj verzi Node.js: `node -v` (musí být 18+)
- Vyčisti cache a zkus znovu:
  ```bash
  yarn cache clean && yarn install
  ```

---

## Užitečné příkazy

```bash
# Spuštění obou aplikací najednou
yarn nx run-many -t serve -p wav-api wav-viewer

# Build pro produkci
yarn nx build wav-api
yarn nx build wav-viewer

# Prisma Studio – správa databáze v prohlížeči
yarn prisma:studio

# Spuštění testů
yarn nx test wav-api
yarn nx test wav-viewer
```

---

## API – přehled endpointů

Všechny endpointy jsou dostupné na `http://localhost:3000/api`.

```
POST   /wav/upload               Nahrání WAV souboru
GET    /wav                      Seznam všech nahraných souborů
GET    /wav/:id                  Detail souboru (metadata + chunky)
DELETE /wav/:id                  Smazání souboru
GET    /wav/:id/download         Stažení upraveného souboru jako WAV
GET    /wav/:id/stream           Audio stream (podporuje Range requests)
GET    /wav/:id/waveform         Waveform data pro vizualizaci
GET    /wav/:id/chunks           Seznam chunků souboru
GET    /wav/:id/chunks/:chunkId  Detail chunku (včetně parsovaných dat)
DELETE /wav/:id/chunks/:chunkId  Smazání chunku
```