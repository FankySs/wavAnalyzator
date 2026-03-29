export type InfoTag = {
  id: string;
  name: string;
  description: string;
};

export const INFO_TAGS: InfoTag[] = [
  { id: 'INAM', name: 'Název',            description: 'Název nahrávky nebo skladby' },
  { id: 'IART', name: 'Interpret',        description: 'Jméno interpreta nebo umělce' },
  { id: 'IPRD', name: 'Album',            description: 'Název alba nebo projektu' },
  { id: 'IGNR', name: 'Žánr',             description: 'Hudební žánr nahrávky' },
  { id: 'ICRD', name: 'Datum vytvoření',  description: 'Datum pořízení nebo vytvoření záznamu' },
  { id: 'ICMT', name: 'Komentář',         description: 'Volný textový komentář k nahrávce' },
  { id: 'ICOP', name: 'Copyright',        description: 'Informace o autorských právech' },
  { id: 'IENG', name: 'Zvukový technik',  description: 'Jméno zvukového technika nebo inženýra' },
  { id: 'ISFT', name: 'Software',         description: 'Název softwaru použitého k vytvoření souboru' },
  { id: 'ISRC', name: 'Zdroj',            description: 'Původ nebo zdroj nahrávky' },
  { id: 'ISBJ', name: 'Téma',             description: 'Téma nebo obsah nahrávky' },
  { id: 'ITCH', name: 'Technik',          description: 'Jméno technika který soubor zpracoval' },
  { id: 'IKEY', name: 'Klíčová slova',    description: 'Klíčová slova pro vyhledávání' },
  { id: 'IMED', name: 'Médium',           description: 'Originální médium nahrávky (např. "DAT", "Analog tape")' },
  { id: 'ILNG', name: 'Jazyk',            description: 'Jazyk mluveného obsahu' },
  { id: 'ICAS', name: 'Kategorie',        description: 'Kategorie nebo klasifikace obsahu' },
];

export const INFO_TAG_MAP: Record<string, InfoTag> = Object.fromEntries(
  INFO_TAGS.map((t) => [t.id, t]),
);