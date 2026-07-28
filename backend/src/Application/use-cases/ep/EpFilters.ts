import { EpStatus } from '../../../Domain/enums/EpStatus';
import { Product } from '../../../Domain/enums/Product';

/*
  Shared query-filter shape used across EP listing use-cases
  All fields are optional, omitting a field applies no constraint for that dimension
  Filtering is backend-driven for performance (Prisma WHERE clause, not in-memory)
*/
export interface EpFilters {
  // Filter by university name (exact match) 
  university?: string;
  // Filter by field of study (exact match) 
  fieldOfStudy?: string;
  // Filter by EXPA programme type 
  product?: Product;
  // Filter by one or more statuses 
  status?: EpStatus | EpStatus[];
  // Return EPs registered on/after this ISO date (inclusive) 
  createdFrom?: string;
  // Return EPs registered on/before this ISO date (inclusive) 
  createdTo?: string;
  // Filter by hosting MC (for approved+ EPs) 
  hostingMC?: string;
  // Filter by hosting LC (for approved+ EPs) 
  hostingLC?: string;
}
