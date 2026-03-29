export type UpdateInfoEntryDto = {
  id: string;    // 4CC tagu (INAM, IART...)
  value: string;
};

export type UpdateListInfoDto = {
  entries: UpdateInfoEntryDto[];
};

export type CreateInfoEntryDto = {
  id: string;    // 4CC tagu – max 4 znaky
  value: string;
};
