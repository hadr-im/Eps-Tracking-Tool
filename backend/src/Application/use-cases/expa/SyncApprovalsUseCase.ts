import crypto from 'crypto';
import { IExpaRepository } from '../../../Domain/abstracts/IExpaRepository';
import { IEpRepository } from '../../../Domain/abstracts/IEpRepository';
import { Ep } from '../../../Domain/entities/Ep';
import { ApprovedDetail } from '../../../Domain/entities/ApprovedDetail';
import { EpStatus } from '../../../Domain/enums/EpStatus';
import { Product, PROGRAMME_DEPARTMENT_ID } from '../../../Domain/enums/Product';
import { ExpaApproval } from '../../../Domain/types/ExpaApproval';

/*
  Brings every approved-or-beyond application in our committee into the app,
  filed under the department that owns the programme.

  Why this exists separately from SyncStatusUseCase: that one asks EXPA about
  leads we already hold, so it can only ever update someone who signed up
  through this app. Most approved EPs did not — they applied in earlier
  campaigns, long before the lead window this tool imports. They existed on
  EXPA and nowhere here, which is why the Approved EPs page showed 40 people
  out of roughly 790.

  This reconciles in the other direction: it starts from what EXPA says the
  committee has approved, and creates the records that are missing.
*/

const EXPA_TO_STATUS: Record<string, EpStatus> = {
  approved: EpStatus.APPROVED,
  realized: EpStatus.REALIZED,
  completed: EpStatus.COMPLETED,
  finished: EpStatus.FINISHED,
};

// How far along the funnel each status sits, so the furthest-along application
// wins when somebody has several.
const RANK: Record<EpStatus, number> = {
  [EpStatus.LEAD]: 0,
  [EpStatus.CONTACTED]: 1,
  [EpStatus.INTERESTED]: 2,
  [EpStatus.APPROVED]: 3,
  [EpStatus.REALIZED]: 4,
  [EpStatus.COMPLETED]: 5,
  [EpStatus.FINISHED]: 6,
};

export interface SyncApprovalsResult {
  fetched: number;
  // Approvals whose opportunity sits outside GV/GTa/GTe.
  skippedNoProduct: number;
  // Approvals older than the import cutoff.
  skippedTooOld: number;
  createdEps: number;
  updatedEps: number;
  approvedDetails: number;
  byProduct: Record<string, { created: number; updated: number }>;
}

export class SyncApprovalsUseCase {
  /*
    `approvedFrom` bounds how far back to import. EXPA holds approvals from
    2020 onward, but this tool tracks the current term: pulling six years of
    past cohorts in would triple the database and mix old exchanges into the
    department pages. Approvals older than the cutoff stay on EXPA.

    An approval with no date is kept — losing a real exchange to a missing
    timestamp is worse than letting one old record through.
  */
  constructor(
    private readonly expaRepo: IExpaRepository,
    private readonly epRepo: IEpRepository,
    private readonly approvedFrom: Date | null = process.env['APPROVALS_FROM_DATE']
      ? new Date(process.env['APPROVALS_FROM_DATE']!)
      : null,
  ) {
    if (this.approvedFrom && Number.isNaN(this.approvedFrom.getTime())) {
      throw new Error('APPROVALS_FROM_DATE is not a valid date (expected YYYY-MM-DD)');
    }
  }

  async execute(dryRun = false): Promise<SyncApprovalsResult> {
    const approvals = await this.expaRepo.fetchCommitteeApprovals();

    const result: SyncApprovalsResult = {
      fetched: approvals.length,
      skippedNoProduct: 0,
      skippedTooOld: 0,
      createdEps: 0,
      updatedEps: 0,
      approvedDetails: 0,
      byProduct: {},
    };

    /*
      One record per person per department. A person can hold several
      applications — two GV opportunities, or one in GV and one in GTa — and
      each department keeps its own, so the key is both.
    */
    const best = new Map<string, ExpaApproval>();

    for (const a of approvals) {
      if (!a.product) {
        result.skippedNoProduct++;
        continue;
      }

      if (this.approvedFrom && a.detail.approvalDate) {
        if (new Date(a.detail.approvalDate) < this.approvedFrom) {
          result.skippedTooOld++;
          continue;
        }
      }
      const key = `${a.expaId}:${a.product}`;
      const current = best.get(key);
      if (!current || this.rankOf(a) > this.rankOf(current)) best.set(key, a);
    }

    const expaIds = [...new Set([...best.values()].map((a) => a.expaId))];
    const existing = await this.epRepo.findByExpaIds(expaIds);

    // Keyed the same way, so an approval finds the row for its own department.
    const existingByKey = new Map<string, Ep>();
    for (const ep of existing) {
      if (ep.expaId) existingByKey.set(`${ep.expaId}:${ep.product}`, ep);
    }

    const toCreate: Ep[] = [];
    const statusUpdates: { epId: string; status: EpStatus }[] = [];
    const details: ApprovedDetail[] = [];

    for (const [key, approval] of best) {
      const product = approval.product!;
      const status = EXPA_TO_STATUS[approval.status.toLowerCase()] ?? EpStatus.APPROVED;
      const bucket = (result.byProduct[product] ??= { created: 0, updated: 0 });

      const ep = existingByKey.get(key);

      if (ep) {
        // Only ever move forward — a member's manual progress is never undone.
        if (RANK[status] > RANK[ep.statusOnExpa]) {
          statusUpdates.push({ epId: ep.id, status });
          result.updatedEps++;
          bucket.updated++;
        }
        details.push(this.toDetail(ep.id, approval));
      } else {
        const created = this.buildEp(approval, product, status);
        toCreate.push(created);
        details.push(this.toDetail(created.id, approval));
        result.createdEps++;
        bucket.created++;
      }
    }

    result.approvedDetails = details.length;

    if (!dryRun) {
      // Order matters: the detail rows reference the EPs by id.
      if (toCreate.length > 0) await this.epRepo.saveMany(toCreate);
      if (statusUpdates.length > 0) await this.epRepo.updateManyStatuses(statusUpdates);
      if (details.length > 0) await this.epRepo.upsertManyApprovedDetails(details);
    }

    console.log(
      `[SyncApprovalsUseCase] ${dryRun ? 'DRY RUN — ' : ''}${result.fetched} approvals, ` +
        `${result.createdEps} EPs created, ${result.updatedEps} advanced, ` +
        `${result.approvedDetails} details, ${result.skippedNoProduct} outside our programmes, ${result.skippedTooOld} older than the cutoff. ` +
        JSON.stringify(result.byProduct),
    );

    return result;
  }

  private rankOf(a: ExpaApproval): number {
    return RANK[EXPA_TO_STATUS[a.status.toLowerCase()] ?? EpStatus.APPROVED];
  }

  private buildEp(approval: ExpaApproval, product: Product, status: EpStatus): Ep {
    const now = new Date();
    /*
      These people never passed through the lead pipeline here, so there is no
      registration date to use. The approval date is the earliest moment this
      app knows about, and keeps date sorting meaningful.
    */
    const createdAt = approval.detail.approvalDate
      ? new Date(approval.detail.approvalDate)
      : now;

    return new Ep(
      crypto.randomUUID(),
      approval.fullName,
      approval.email,
      approval.phone,
      null, // university — not on the application
      null, // fieldOfStudy
      null, // yearOfStudy
      product,
      PROGRAMME_DEPARTMENT_ID[product],
      status,
      createdAt,
      now,
      null,  // ownerId — nobody owns a historical approval
      null,  // assignedAt
      null,  // source
      null,  // cvLink
      false, // contacted
      null,  // contactedAt
      false, // interested
      null,  // trackingPhase
      null,  // notes
      null,  // duration
      null,  // availability
      false, // addedManually — this came from EXPA
      approval.expaId,
    );
  }

  private toDetail(epId: string, approval: ExpaApproval): ApprovedDetail {
    const d = approval.detail;
    return new ApprovedDetail(
      crypto.randomUUID(),
      epId,
      d.appId,
      d.opportunityTitle,
      d.hostingMC,
      d.hostingLC,
      d.projectFees,
      d.approvalDate ? new Date(d.approvalDate) : null,
      d.realizedDate ? new Date(d.realizedDate) : null,
      d.completedDate ? new Date(d.completedDate) : null,
      d.finishedDate ? new Date(d.finishedDate) : null,
      null, // contractLink — filled in by the team, not EXPA
      null, // auditFolder
      new Date(),
    );
  }
}
