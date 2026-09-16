import { Ep } from '../entities/Ep';
import { ApprovedDetail } from '../entities/ApprovedDetail';
import { StatusHistory } from '../entities/StatusHistory';
import { EpStatus } from '../enums/EpStatus';
import { Product } from '../enums/Product';
import { EpFilters } from '../../Application/use-cases/ep/EpFilters';
import { EpUpdateData } from '../../Application/use-cases/ep/EpUpdateData';


// Lightweight projection (only what SyncStatusUseCase needs for comparison)
export interface EpStatusSnapshot {
  id: string;
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

export interface IEpRepository {
  // Queries 

  // Returns all EPs belonging to a department
  findByDepartment(departmentId: string): Promise<Ep[]>;

  // Filtered query : supports all EpFilters fields
  // Eagerly joins ApprovedDetail so callers don't need a second round-trip.
  findByDepartmentFiltered(departmentId: string, filters: EpFilters): Promise<EpWithDetail[]>;

  // Lightweight read : only id + status + hasApprovedDetail for status comparison
  findStatusSnapshotsByDepartment(departmentId: string): Promise<EpStatusSnapshot[]>;


  // Returns approved EPs (APPROVED or beyond) for a department
  findApprovedByDepartment(departmentId: string): Promise<Ep[]>;

  // Looks up a single EP by EXPA person ID
  findByExpaId(epId: string): Promise<Ep | null>;

  // Looks up a single EP by internal ID 
  findById(epId: string): Promise<Ep | null>;

  // Returns all EPs assigned to a specific member, optionally filtered
  findByOwner(ownerId: string, filters?: EpFilters): Promise<Ep[]>;

  // Returns EPs assigned to any of the given members (TL scoped view)
  findByOwners(ownerIds: string[], filters?: EpFilters): Promise<Ep[]>;

  // Returns all EPs for a department, optionally filtered (includes CRM fields)
  findByDepartment(departmentId: string, filters?: EpFilters): Promise<Ep[]>;

  // Partial update (only the fields present in data are written)
  updateEp(epId: string, data: EpUpdateData): Promise<Ep>;

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
