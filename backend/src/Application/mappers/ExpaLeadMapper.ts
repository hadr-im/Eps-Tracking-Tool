import crypto from 'crypto';
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

// Fixed precedence — see resolveProducts.
const PRODUCT_ORDER: Product[] = [Product.GV, Product.GTA, Product.GTE];
export class ExpaLeadMapper {
  /*
    One Ep per programme the person selected.

    Someone who ticks both Volunteering and Teaching on the sign-up form is a
    lead for two departments, and each team works them independently. The first
    copy keeps the EXPA id as its row id so nothing about existing rows changes;
    any further copy gets a generated id and is tied back only by expaId.
  */
  static toEps(lead: ExpaLead): Ep[] {
    const products = ExpaLeadMapper.resolveProducts(lead.selectedProgrammes);
    if (products.length === 0) return []; // not GV/GTA/GTE

    return products.map((product, index) =>
      ExpaLeadMapper.build(lead, product, index === 0 ? lead.epId : crypto.randomUUID()),
    );
  }

  // Kept for callers that only ever want one row — returns the first product.
  static toEp(lead: ExpaLead): Ep | null {
    return ExpaLeadMapper.toEps(lead)[0] ?? null;
  }

  private static build(lead: ExpaLead, product: Product, id: string): Ep {
    const departmentId = PROGRAMME_DEPARTMENT_ID[product];
    const status = EXPA_STATUS_MAP[lead.statusOnExpa?.toLowerCase()] ?? EpStatus.LEAD;
    const now = new Date();

    return new Ep(
      id,
      lead.fullName,
      lead.email,
      lead.phone,
      lead.university,
      lead.fieldOfStudy,
      null, // yearOfStudy
      product,
      departmentId,
      status,
      new Date(lead.creationDate),
      now,
      null, // ownerId
      null, // assignedAt
      null, // source
      null, // cvLink
      false, // contacted
      null, // contactedAt
      false, // interested
      null, // trackingPhase
      null, // notes
      null, // duration
      null, // availability
      false, // addedManually — this came from the EXPA sync
      lead.epId,
    );
  }

  // Maps a batch of leads, expanding each into one row per programme chosen
  // and silently dropping any that belong to no tracked programme.
  static toEpMany(leads: ExpaLead[]): Ep[] {
    const eps: Ep[] = [];
    for (const lead of leads) {
      eps.push(...ExpaLeadMapper.toEps(lead));
    }
    return eps;
  }

  /*
    Every tracked programme the person selected.

    Ordered by PRODUCT_ORDER rather than by however EXPA happened to list the
    codes, so the copy that keeps the EXPA id as its row id is the same one on
    every sync. Left to EXPA's ordering, a person could land in GV first one
    run and GTE the next.
  */
  private static resolveProducts(codes: number[]): Product[] {
    const seen = new Set<Product>();
    for (const code of codes) {
      const product = PROGRAMME_FROM_EXPA_CODE[code];
      if (product) seen.add(product);
    }
    return PRODUCT_ORDER.filter((p) => seen.has(p));
  }
}
