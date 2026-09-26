import crypto from 'crypto';
import { IExpaRepository } from '../../../Domain/abstracts/IExpaRepository';
import { IEpRepository } from '../../../Domain/abstracts/IEpRepository';
import { ApprovedDetail } from '../../../Domain/entities/ApprovedDetail';
import { StatusHistory } from '../../../Domain/entities/StatusHistory';
import { EpStatus } from '../../../Domain/enums/EpStatus';
import { Product, PROGRAMME_DEPARTMENT_ID } from '../../../Domain/enums/Product';
import { ExpaApprovedDetail } from '../../../Domain/types/ExpaApprovedDetail';

interface DepartmentStatusResult {
  product: Product;
  checked: number;
  updated: number;
  approvedDetailCreated: number;
}

const STATUS_RANK: Record<EpStatus, number> = {
  [EpStatus.LEAD]:       0,
  [EpStatus.CONTACTED]:  1,
  [EpStatus.INTERESTED]: 2,
  [EpStatus.APPROVED]:   3,
  [EpStatus.REALIZED]:   4,
  [EpStatus.COMPLETED]:  5,
  [EpStatus.FINISHED]:   6,
};

const EXPA_TO_STATUS: Record<string, EpStatus> = {
  lead:       EpStatus.LEAD,
  contacted:  EpStatus.CONTACTED,
  interested: EpStatus.INTERESTED,
  approved:   EpStatus.APPROVED,
  realized:   EpStatus.REALIZED,
  completed:  EpStatus.COMPLETED,
  finished:   EpStatus.FINISHED,
};

// Performance design:
// - Lightweight DB read per dept (only id + status + hasApprovedDetail, no full rows)
// - One EXPA API call per dept (fetchEpStatus returns all approved apps in one request)
// - In-memory Map comparison O(1) lookup per EP
// - Batched DB writes: status updates grouped by target status, bulk upsert for
//   ApprovedDetails, createMany for StatusHistory, minimises DB round-trips
// - Per department isolation: one dept failing won't abort others
export class SyncStatusUseCase {
  constructor(
    private readonly expaRepo: IExpaRepository,
    private readonly epRepo: IEpRepository,
  ) {}

  // `only` scopes the run to a single department — see SyncLeadsUseCase.execute.
  async execute(only?: Product): Promise<DepartmentStatusResult[]> {
    const products = only ? [only] : [Product.GV, Product.GTA, Product.GTE];
    const results: DepartmentStatusResult[] = [];

    for (const product of products) {
      try {
        const result = await this.syncDepartment(product);
        results.push(result);
      } catch (err) {
        console.error(`[SyncStatusUseCase] Failed for ${product}:`, err);
        results.push({ product, checked: 0, updated: 0, approvedDetailCreated: 0 });
      }
    }

    return results;
  }

  private async syncDepartment(product: Product): Promise<DepartmentStatusResult> {
    const departmentId = PROGRAMME_DEPARTMENT_ID[product];
    console.log(`[SyncStatusUseCase] Checking status for ${product}...`);

    // Lightweight read (only the fields needed for comparison)
    const snapshots = await this.epRepo.findStatusSnapshotsByDepartment(departmentId);
    if (snapshots.length === 0) {
      console.log(`[SyncStatusUseCase] ${product}: no EPs found, skipping`);
      return { product, checked: 0, updated: 0, approvedDetailCreated: 0 };
    }

    const epIds = snapshots.map((s) => s.id);
    const snapshotMap = new Map(snapshots.map((s) => [s.id, s]));

    // Single EXPA call for all epIds in this department
    const expaResults = await this.expaRepo.fetchEpStatus(epIds);

    const statusUpdates: { epId: string; status: EpStatus }[] = [];
    const newApprovedDetails: ApprovedDetail[] = [];
    const historyEntries: StatusHistory[] = [];

    for (const result of expaResults) {
      const snapshot = snapshotMap.get(result.epId);
      if (!snapshot) continue;

      const expaStatus = EXPA_TO_STATUS[result.status?.toLowerCase()] ?? EpStatus.LEAD;
      const dbStatus = snapshot.statusOnExpa;

      const statusAdvanced = STATUS_RANK[expaStatus] > STATUS_RANK[dbStatus];
      // Create/upsert ApprovedDetail if: status advanced or EP is already approved+
      // but still has no detail record (e.g seeded with APPROVED but detail never created)
      const needsDetail = !!result.approvedDetail && !snapshot.hasApprovedDetail;

      // Nothing to do for this EP
      if (!statusAdvanced && !needsDetail) continue;

      if (statusAdvanced) {
        statusUpdates.push({ epId: result.epId, status: expaStatus });
        historyEntries.push(
          new StatusHistory(crypto.randomUUID(), result.epId, dbStatus, expaStatus, new Date()),
        );
      }

      // Create ApprovedDetail if status advanced or if it was missing
      if (result.approvedDetail && (statusAdvanced || needsDetail)) {
        const detail = this.mapToApprovedDetail(result.epId, result.approvedDetail, expaStatus);
        newApprovedDetails.push(detail);
      }
    }

    // Batch DB writes 
    if (statusUpdates.length > 0) {
      await this.epRepo.updateManyStatuses(statusUpdates);
    }
    if (newApprovedDetails.length > 0) {
      await this.epRepo.upsertManyApprovedDetails(newApprovedDetails);
    }
    if (historyEntries.length > 0) {
      await this.epRepo.saveManyStatusHistory(historyEntries);
    }

    console.log(
      `[SyncStatusUseCase] ${product}: checked ${snapshots.length}, updated ${statusUpdates.length}, approved details ${newApprovedDetails.length}`,
    );

    return {
      product,
      checked: snapshots.length,
      updated: statusUpdates.length,
      approvedDetailCreated: newApprovedDetails.filter((d) => !snapshots.find((s) => s.id === d.epId && s.hasApprovedDetail)).length,
    };
  }

  private mapToApprovedDetail(epId: string, raw: ExpaApprovedDetail, status: EpStatus): ApprovedDetail {
    return new ApprovedDetail(
      crypto.randomUUID(),
      epId,
      raw.appId,
      raw.opportunityTitle,
      raw.hostingMC,
      raw.hostingLC,
      raw.projectFees,
      raw.approvalDate ? new Date(raw.approvalDate) : null,
      raw.realizedDate ? new Date(raw.realizedDate) : null,
      raw.completedDate ? new Date(raw.completedDate) : null,
      raw.finishedDate ? new Date(raw.finishedDate) : null,
      null, // contractLink 
      null, // auditFolder 
      new Date(),
    );
  }
}
