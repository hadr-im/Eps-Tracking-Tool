import { Product } from '../enums/Product';
import { ExpaApprovedDetail } from './ExpaApprovedDetail';

/*
  An approved-or-beyond application belonging to our local committee.

  Richer than EpStatusResult on purpose. The status sync used to answer only
  "has this lead's status changed?", which meant an approved EP who was never
  a lead here — most of them, since they signed up in earlier campaigns —
  existed on EXPA but nowhere in this app. Carrying the person and the
  programme as well lets the sync create the missing record instead of
  discarding it.
*/
export interface ExpaApproval {
  // EXPA person id. The join key for everything in this app.
  expaId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  // Raw EXPA status: approved | realized | completed | finished.
  status: string;
  /*
    Derived from opportunity.programme, which is what decides the owning
    department. Null when the opportunity sits outside GV/GTa/GTe, in which
    case the application is not ours to track.
  */
  product: Product | null;
  detail: ExpaApprovedDetail;
}
