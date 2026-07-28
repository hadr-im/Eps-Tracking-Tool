// Domain entity for the detail record created when an EP's application is approved
export class ApprovedDetail {
  constructor(
    public readonly id: string,
    // FK → Ep.id (EXPA person ID) 
    public epId: string,
    // EXPA's application ID kept for reference and deduplication
    public expaAppId: string,
    public opportunityTitle: string | null,
    // Hosting MC 
    public hostingMC: string | null,
    // Hosting Local Committee 
    public hostingLC: string | null,
    public projectFees: number | null,
    public approvalDate: Date | null,
    public realizedDate: Date | null,
    public completedDate: Date | null,
    public finishedDate: Date | null,
    // Link to the signed EP contract document 
    public contractLink: string | null,
    // Link to the audit/evidence folder for this EP 
    public auditFolder: string | null,
    public syncedAt: Date,
  ) {}
}
