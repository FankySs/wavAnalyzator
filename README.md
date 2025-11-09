## 🎵 WavAnalyzer

WavAnalyzer je webová aplikace vytvořená v rámci semestrální práce na VUT FEKT.
Slouží k analýze struktury souborů formátu RIFF (WAV) – zobrazí jednotlivé chunky (bloky) zvukového souboru, jejich velikost, offsety a základní metadata.

## 🧩 Funkce aplikace

Nahrání WAV souboru pomocí integrovaného vstupu.

Zobrazení všech chunků (RIFF, fmt , data, LIST, …) s jejich velikostmi a pozicemi.

Parsování bloku fmt včetně rozšířené varianty WAVE_FORMAT_EXTENSIBLE.

Zpracování a výpis LIST/INFO bloků – čtení textových metadat (INAM, IART, ICRD, …).

Výpočet délky nahrávky z hodnot dataSize / byteRate.

Moderní uživatelské rozhraní postavené na Angularu 19 a signálech (Signals API).

## 🏗️ Použité technologie
Technologie	Popis
Angular 19	Frontend framework
TypeScript	Logika parseru a silné typování
Nx Monorepo	Strukturování projektu (frontend + knihovna riff-parser)
Signals API	Reaktivní řízení stavu mezi komponentami
HTML / CSS / SCSS	Stylování a rozvržení rozhraní
Jest (v přípravě)	Jednotkové testy parseru WAV souborů
## 🚀 Spuštění projektu
Vývojový server
ng serve


Po spuštění otevřete prohlížeč na adrese http://localhost:4200
.
Aplikace se automaticky přenačte při každé změně kódu.

Build pro produkci
ng build


Kompilované soubory se uloží do složky dist/.
Build je optimalizovaný pro výkon a rychlé načítání.
