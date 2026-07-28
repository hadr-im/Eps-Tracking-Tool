import { ExpaApprovedDetail } from './ExpaApprovedDetail';

/*
 Return type of IExpaRepository.fetchEpStatus()
 Combines the current EXPA status string with the approved detail (if applicable)
 The Application layer maps this into domain entities
*/
export interface EpStatusResult {
  // EXPA person ID
  epId: string;
  // Raw EXPA current_status string 
  status: string;
  /*
    Only present when the EP has an approved application on EXPA
    Undefined for EPs that are still leads / applied
   */
  approvedDetail?: ExpaApprovedDetail;
}
