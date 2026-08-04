import { EpStatus } from '../enums/EpStatus';
import { Product } from '../enums/Product';
import { TrackingPhase } from '../enums/TrackingPhase';
import { Duration } from '../enums/Duration';
import { Availability } from '../enums/Availability';

// Domain entity representing an Exchange Participant (EP)
// Pure class, zero ORM/framework coupling
// The 'id' is EXPA's own person ID, used as our PK to avoid duplicates on re-sync
export class Ep {
  constructor(
    // EXPA person
    public readonly id: string,
    public fullName: string,
    public email: string | null,
    public phone: string | null,
    // University name from EXPA backgrounds
    public university: string | null,
    // Field of study from EXPA lc_alignment keywords
    public fieldOfStudy: string | null,
    public yearOfStudy: number | null,
    public product: Product,
    public departmentId: string,
    // Reflects EXPA's current status
    public statusOnExpa: EpStatus,
    // When the EP registered on EXPA
    public readonly createdAtExpa: Date,
    // Last time this record was synced from EXPA
    public syncedAt: Date,

    // CRM fields set by members during pipeline management
    public ownerId: string | null,
    public assignedAt: Date | null,
    public source: string | null,
    public cvLink: string | null,
    public contacted: boolean,
    public contactedAt: Date | null,
    public interested: boolean,
    public trackingPhase: TrackingPhase | null,
    public notes: string | null,
    public duration: Duration | null,
    public availability: Availability | null,
  ) {}
}
