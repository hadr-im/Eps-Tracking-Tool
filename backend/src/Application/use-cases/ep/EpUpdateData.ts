import { TrackingPhase } from '../../../Domain/enums/TrackingPhase';
import { Duration } from '../../../Domain/enums/Duration';
import { Availability } from '../../../Domain/enums/Availability';

/*
  Shape of the partial update payload for EP CRM fields
  All fields are optional, only the ones present are written to the DB
  EXPA-owned fields (statusOnExpa, fullName, email, etc.) are intentionally excluded
*/
export interface EpUpdateData {
  source?: string | null;
  /*
    Profile fields the sign-up sheet normally provides, editable from the CRM
    because the form answers are often wrong or missing — a lead picks the
    wrong university from a long list, or skips the question entirely.

    The enrichment only fills these when blank, so a correction made here is
    not undone by the next sync.
  */
  university?: string | null;
  fieldOfStudy?: string | null;
  yearOfStudy?: number | null;
  cvLink?: string | null;
  contacted?: boolean;
  interested?: boolean;
  trackingPhase?: TrackingPhase | null;
  notes?: string | null;
  duration?: Duration | null;
  availability?: Availability | null;
}
