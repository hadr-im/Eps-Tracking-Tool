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
  cvLink?: string | null;
  contacted?: boolean;
  interested?: boolean;
  trackingPhase?: TrackingPhase | null;
  notes?: string | null;
  duration?: Duration | null;
  availability?: Availability | null;
}
