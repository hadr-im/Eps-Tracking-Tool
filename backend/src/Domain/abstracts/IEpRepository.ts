import { Ep } from '../entities/Ep';
import { ApprovedDetail } from '../entities/ApprovedDetail';
import { StatusHistory } from '../entities/StatusHistory';
import { EpStatus } from '../enums/EpStatus';
import { Product } from '../enums/Product';
import { EpFilters } from '../../Application/use-cases/ep/EpFilters';
import { EpUpdateData } from '../../Application/use-cases/ep/EpUpdateData';
import { PageRequest } from '../../Application/use-cases/ep/Pagination';

/*
  What a list read hands back. `total` counts every row matching the filters,
  not the slice, so callers can build page controls without a second query.
  Omitting the page request returns all rows and total === rows.length.
*/
export interface RowPage<T> {
  rows: T[];
  total: number;
}


// Lightweight projection (only what SyncStatusUseCase needs for comparison)
export interface EpStatusSnapshot {
  id: string;
  // What EXPA keys on. Several snapshots can share one expaId when a person
  // selected more than one programme, and a status change applies to them all.
  expaId: string | null;
  statusOnExpa: EpStatus;
  hasApprovedDetail: boolean;
}

// EP joined with optional ApprovedDetail (used by listing use-cases)
export interface EpWithDetail {
  ep: Ep;
  approvedDetail: ApprovedDetail | null;
  // Display name of the assigned member (owner) if joined 
  memberName?: string | null;
}

// Data required to execute a product transition in a single atomic operation 
export interface TransitionInput {
  triggeredById: string;
  fromProduct: Product;
  fromDepartmentId: string;
  targetProduct: Product;
  targetDepartmentId: string;
  note?: string;
}

/*
  A single row's worth of sheet-sourced contact details. Only the keys present
  are written, so a blank cell in the sheet never wipes something already known.
*/
export interface EpContactEnrichment {
  // The EP row id, not the EXPA id — one person may have several rows.
  id: string;
  email?: string;
  phone?: string;
  university?: string;
  fieldOfStudy?: string;
  yearOfStudy?: number;
  source?: string;
}

export interface IEpRepository {
  // Queries 

  // Filtered query : supports all EpFilters fields
  // Eagerly joins ApprovedDetail so callers don't need a second round-trip.
  findByDepartmentFiltered(
    departmentId: string,
    filters: EpFilters,
    page?: PageRequest,
  ): Promise<RowPage<EpWithDetail>>;

  // Lightweight read : only id + status + hasApprovedDetail for status comparison
  findStatusSnapshotsByDepartment(departmentId: string): Promise<EpStatusSnapshot[]>;


  // Returns approved EPs (APPROVED or beyond) for a department
  findApprovedByDepartment(departmentId: string): Promise<Ep[]>;

  /*
    Every EP row matching any of these EXPA person ids, across all departments.
    One person can hold a row in several departments, and the sign-up sheet
    describes the person, so enrichment has to reach all of their rows.
  */
  findByExpaIds(expaIds: string[]): Promise<Ep[]>;

  /*
    Writes the contact details that only the sign-up sheet knows. Separate from
    updateEp, which deliberately refuses EXPA-owned fields like email.
  */
  enrichMany(updates: EpContactEnrichment[]): Promise<number>;

  // Looks up a single EP by internal ID 
  findById(epId: string): Promise<Ep | null>;

  // Returns EPs assigned to a specific member, optionally filtered and paged
  findByOwner(ownerId: string, filters?: EpFilters, page?: PageRequest): Promise<RowPage<Ep>>;

  // Returns EPs assigned to any of the given members (TL scoped view)
  findByOwners(ownerIds: string[], filters?: EpFilters, page?: PageRequest): Promise<RowPage<Ep>>;

  // Returns EPs for a department, optionally filtered (includes CRM fields)
  findByDepartment(
    departmentId: string,
    filters?: EpFilters,
    page?: PageRequest,
  ): Promise<RowPage<Ep>>;

  // Partial update (only the fields present in data are written)
  updateEp(epId: string, data: EpUpdateData): Promise<Ep>;

  // Change an EP's owner without going through the dispatch pool.
  // Stamps assignedAt server-side; used by the TL/VP reassign action.
  reassignOwner(epId: string, memberId: string): Promise<Ep>;

  /**
   Atomically moves an EP to a new product/department and records a TransitionHistory row
   Uses a Prisma interactive transaction,  if either write fails, both roll back
   The EP is set to ownerId = null (unassigned) in the target department
   */
  transitionEp(epId: string, input: TransitionInput): Promise<Ep>;

  // Single writes 

  // Upsert a single EP record
  save(ep: Ep): Promise<Ep>;

  // Bulk writes (performance-critical)

  // Bulk upsert : safe to re-run. Used by SeedLeadsUseCase & SyncLeadsUseCase
  // Returns the number of rows actually inserted (existing EXPA IDs are skipped)
  saveMany(eps: Ep[]): Promise<{ count: number }>;

  // Batch update status : groups EPs by target status for minimal DB round-trips
  updateManyStatuses(updates: { epId: string; status: EpStatus }[]): Promise<void>;

  // Bulk upsert ApprovedDetail records : keyed on expaAppId
  upsertManyApprovedDetails(details: ApprovedDetail[]): Promise<void>;

  // Batch insert StatusHistory entries in a single DB call
  saveManyStatusHistory(entries: StatusHistory[]): Promise<void>;
}
