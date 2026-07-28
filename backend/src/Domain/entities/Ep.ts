import { EpStatus } from '../enums/EpStatus';
import { Product } from '../enums/Product';

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
    public product: Product,
    public departmentId: string,
    // Reflects EXPA's current status  
    public statusOnExpa: EpStatus,
    // When the EP registered on EXPA
    public readonly createdAtExpa: Date,
    // Last time this record was synced from EXPA 
    public syncedAt: Date,
  ) {}
}
