import { ExpaLead } from '../types/ExpaLead';
import { EpStatusResult } from '../types/EpStatusResult';

/*
 Repository contract for fetching data from the EXPA external API
 Defined in Domain so use-cases depend only on this abstraction
 The concrete graphql-request implementation lives in Infrastructure
*/
export interface IExpaRepository {
  /*
    Fetch all leads for a given EXPA programme code
    Handles internal pagination automatically and returns the full list
    Retries once on failure before throwing
    @param programmeCode EXPA numeric programme id (9=GV, 8=GTA, 10=GTE)
   */
  fetchLeads(programmeCode: number): Promise<ExpaLead[]>;

  /*
    Fetch the current EXPA status for a batch of EP IDs
    For EPs that are approved or beyond, the result includes the full approved detail
    EPs not found in any EXPA application are omitted (caller treats as no change)
    Retries once on failure before throwing
    @param epIds  EXPA person IDs to check
   */
  fetchEpStatus(epIds: string[]): Promise<EpStatusResult[]>;
}
