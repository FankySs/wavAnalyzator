export type InfoTag = {
  id: string;
  name: string;
  description: string;
};

export const INFO_TAGS: InfoTag[] = [
  { id: 'INAM', name: 'Name',             description: 'Name of the recording or track' },
  { id: 'IART', name: 'Artist',           description: 'Name of the artist or performer' },
  { id: 'IPRD', name: 'Album',            description: 'Name of the album or project' },
  { id: 'IGNR', name: 'Genre',            description: 'Musical genre of the recording' },
  { id: 'ICRD', name: 'Creation Date',    description: 'Date the recording was captured or created' },
  { id: 'ICMT', name: 'Comment',          description: 'Free-text comment about the recording' },
  { id: 'ICOP', name: 'Copyright',        description: 'Copyright information' },
  { id: 'IENG', name: 'Sound Engineer',   description: 'Name of the sound engineer or technician' },
  { id: 'ISFT', name: 'Software',         description: 'Name of the software used to create the file' },
  { id: 'ISRC', name: 'Source',           description: 'Origin or source of the recording' },
  { id: 'ISBJ', name: 'Subject',          description: 'Subject or content of the recording' },
  { id: 'ITCH', name: 'Technician',       description: 'Name of the technician who processed the file' },
  { id: 'IKEY', name: 'Keywords',         description: 'Keywords for searching' },
  { id: 'IMED', name: 'Medium',           description: 'Original medium of the recording (e.g. "DAT", "Analog tape")' },
  { id: 'ILNG', name: 'Language',         description: 'Language of the spoken content' },
  { id: 'ICAS', name: 'Category',         description: 'Category or classification of the content' },
];

export const INFO_TAG_MAP: Record<string, InfoTag> = Object.fromEntries(
  INFO_TAGS.map((t) => [t.id, t]),
);