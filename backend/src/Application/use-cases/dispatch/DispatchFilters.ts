// Optional filters for the unassigned leads pool query
 
export interface DispatchFilters {
  // Filter by EP status (e.g. only LEAD) 
  status?: string;
  // Filter by product (GV | GTA | GTE) 
  product?: string;
  // Substring match on university name
  university?: string;
  // Substring match on field of study
  fieldOfStudy?: string;
  // EXPA registration date lower bound (ISO string)
  createdFrom?: string;
  // EXPA registration date upper bound (ISO string)
  createdTo?: string;
}
