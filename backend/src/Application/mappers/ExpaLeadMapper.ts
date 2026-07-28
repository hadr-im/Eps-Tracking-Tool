import { Ep } from '../../Domain/entities/Ep';
import { ExpaLead } from '../../Domain/types/ExpaLead';
import { EpStatus } from '../../Domain/enums/EpStatus';
import { Product, PROGRAMME_FROM_EXPA_CODE, PROGRAMME_DEPARTMENT_ID } from '../../Domain/enums/Product';

// Maps raw EXPA status strings to our EpStatus enum
const EXPA_STATUS_MAP: Record<string, EpStatus> = {
  open:       EpStatus.LEAD,
  contacted:  EpStatus.CONTACTED,
  interested: EpStatus.INTERESTED,
  approved:   EpStatus.APPROVED,
  realized:   EpStatus.REALIZED,
  completed:  EpStatus.COMPLETED,
  finished:   EpStatus.FINISHED,
};
export class ExpaLeadMapper {
  // Converts a raw ExpaLead from the API into a domain Ep entity
  static toEp(lead: ExpaLead): Ep | null {
    // Use the first recognised programme code from the lead's list
    const product = ExpaLeadMapper.resolveProduct(lead.selectedProgrammes);
    if (!product) return null; // skip leads that don't belong to GV/GTA/GTE

    const departmentId = PROGRAMME_DEPARTMENT_ID[product];
    const status = EXPA_STATUS_MAP[lead.statusOnExpa?.toLowerCase()] ?? EpStatus.LEAD;
    const now = new Date();

    return new Ep(
      lead.epId,
      lead.fullName,
      lead.email,
      lead.phone,
      lead.university,
      lead.fieldOfStudy,
      product,
      departmentId,
      status,
      new Date(lead.creationDate),
      now,
    );
  }

  // Maps a batch of leads silently dropping any that can't be mapped
  static toEpMany(leads: ExpaLead[]): Ep[] {
    const eps: Ep[] = [];
    for (const lead of leads) {
      const ep = ExpaLeadMapper.toEp(lead);
      if (ep) eps.push(ep);
    }
    return eps;
  }

  private static resolveProduct(codes: number[]): Product | null {
    for (const code of codes) {
      const product = PROGRAMME_FROM_EXPA_CODE[code];
      if (product) return product;
    }
    return null;
  }
}
