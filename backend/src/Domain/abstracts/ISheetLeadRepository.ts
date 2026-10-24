import { SheetLead } from '../types/SheetLead';

/*
  Reads the sign-up form responses, which hold the contact details EXPA does
  not return: the real email address and the phone number.
*/
export interface ISheetLeadRepository {
  /*
    Every submission, cleaned and deduplicated by EXPA id (most recent wins).
    Rows without a usable EXPA id are dropped — there is nothing to match them
    against.
  */
  fetchAll(): Promise<SheetLead[]>;
}
