import { IExpaRepository } from '../../../Domain/abstracts/IExpaRepository';
import { IEpRepository } from '../../../Domain/abstracts/IEpRepository';
import { Product, EXPA_PROGRAMME_CODE, PROGRAMME_DEPARTMENT_ID } from '../../../Domain/enums/Product';
import { ExpaLeadMapper } from '../../mappers/ExpaLeadMapper';
import { ApprovedDetail } from '../../../Domain/entities/ApprovedDetail';
import { StatusHistory } from '../../../Domain/entities/StatusHistory';
import { EpStatus } from '../../../Domain/enums/EpStatus';
import { ExpaApprovedDetail } from '../../../Domain/types/ExpaApprovedDetail';
import crypto from 'crypto';

export interface ManualSyncResult {
  newLeads: number;
  statusChanges: number;
  approvedDetailsCreated: number;
}

const EXPA_TO_STATUS: Record<string, EpStatus> = {
  lead:       EpStatus.LEAD,
  contacted:  EpStatus.CONTACTED,
  interested: EpStatus.INTERESTED,
  approved:   EpStatus.APPROVED,
  realized:   EpStatus.REALIZED,
  completed:  EpStatus.COMPLETED,
  finished:   EpStatus.FINISHED,
};

const STATUS_RANK: Record<EpStatus, number> = {
  [EpStatus.LEAD]:       0,
  [EpStatus.CONTACTED]:  1,
  [EpStatus.INTERESTED]: 2,
  [EpStatus.APPROVED]:   3,
  [EpStatus.REALIZED]:   4,
  [EpStatus.COMPLETED]:  5,
  [EpStatus.FINISHED]:   6,
};

/*
  Manual sync triggered by a TL/VP from the UI
  Runs SyncLeads + SyncStatus scoped to a single department
  Returns { newLeads, statusChanges, approvedDetailsCreated }
*/
export class ManualSyncUseCase {
  constructor(
    private readonly expaRepo: IExpaRepository,
    private readonly epRepo: IEpRepository,
  ) {}

  async execute(departmentId: string): Promise<ManualSyncResult> {
    // Resolve which EXPA product this department maps to
    const product = this.resolveProduct(departmentId);
    const code = EXPA_PROGRAMME_CODE[product];

    // Step 1: Sync new leads 
    const rawLeads = await this.expaRepo.fetchLeads(code);
    const eps = ExpaLeadMapper.toEpMany(rawLeads);
    const { count: newLeads } = await this.epRepo.saveMany(eps);

    // Step 2: Sync status changes 
    const snapshots = await this.epRepo.findStatusSnapshotsByDepartment(departmentId);
    const epIds = snapshots.map((s) => s.id);
    const snapshotMap = new Map(snapshots.map((s) => [s.id, s]));

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
      const needsDetail = !!result.approvedDetail && !snapshot.hasApprovedDetail;

      if (!statusAdvanced && !needsDetail) continue;

      if (statusAdvanced) {
        statusUpdates.push({ epId: result.epId, status: expaStatus });
        historyEntries.push(
          new StatusHistory(crypto.randomUUID(), result.epId, dbStatus, expaStatus, new Date()),
        );
      }

      if (result.approvedDetail && (statusAdvanced || needsDetail)) {
        newApprovedDetails.push(this.mapToApprovedDetail(result.epId, result.approvedDetail, expaStatus));
      }
    }

    if (statusUpdates.length > 0)        await this.epRepo.updateManyStatuses(statusUpdates);
    if (newApprovedDetails.length > 0)   await this.epRepo.upsertManyApprovedDetails(newApprovedDetails);
    if (historyEntries.length > 0)       await this.epRepo.saveManyStatusHistory(historyEntries);

    return {
      newLeads,
      statusChanges: statusUpdates.length,
      approvedDetailsCreated: newApprovedDetails.length,
    };
  }

  private resolveProduct(departmentId: string): Product {
    const entry = Object.entries(PROGRAMME_DEPARTMENT_ID).find(
      ([, deptId]) => deptId === departmentId,
    );
    if (!entry) throw new Error(`Unknown departmentId: ${departmentId}`);
    return entry[0] as Product;
  }

  private mapToApprovedDetail(
    epId: string,
    raw: ExpaApprovedDetail,
    status: EpStatus,
  ): ApprovedDetail {
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
      status === EpStatus.COMPLETED && raw.realizedDate ? new Date(raw.realizedDate) : null,
      status === EpStatus.FINISHED  && raw.realizedDate ? new Date(raw.realizedDate) : null,
      null, // contractLink 
      null, // auditFolder 
      new Date(),
    );
  }
}
