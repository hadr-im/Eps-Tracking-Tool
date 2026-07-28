/*
 Raw data shape returned by EXPA's 'people' GraphQL query
 This is not the Ep domain entity its the unmapped API response
 The Application layer maps ExpaLead → Ep before any business logic runs.
*/
export interface ExpaLead {
  // EXPA's internal person ID
  epId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  university: string | null;
  fieldOfStudy: string | null;
  // Year of study isnt currently exposed by EXPA GraphQL (reserved for future use) 
  yearOfStudy: number | null;
  // ISO date string (person's registration date on EXPA)
  creationDate: string;
  // Raw EXPA status 
  statusOnExpa: string;
  // EXPA numeric programme codes
  selectedProgrammes: number[];
}
