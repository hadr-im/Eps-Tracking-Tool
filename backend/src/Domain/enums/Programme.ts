export enum Programme {
  GV  = 'GV',    
  GTA = 'GTA',  
  GTE = 'GTE',  
}

// Maps EXPA numeric programme codes to Programme enum
export const EXPA_PROGRAMME_CODE: Record<Programme, number> = {
  [Programme.GV]:  9,
  [Programme.GTA]: 8,
  [Programme.GTE]: 10,
};

// Maps EXPA numeric codes back to Programme enum (for deserialization)
export const PROGRAMME_FROM_EXPA_CODE: Record<number, Programme> = {
  9:  Programme.GV,
  8:  Programme.GTA,
  10: Programme.GTE,
};

// Maps each programme to its department ID in the DB
export const PROGRAMME_DEPARTMENT_ID: Record<Programme, string> = {
  [Programme.GV]:  'dpt-gv',
  [Programme.GTA]: 'dpt-gta',
  [Programme.GTE]: 'dpt-gte',
};
