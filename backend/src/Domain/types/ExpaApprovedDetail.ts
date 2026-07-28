/*
 Raw data shape returned by EXPA's 'allOpportunityApplication' GraphQL query
 This isnt the ApprovedDetail domain entity, it is the unmapped API response
 The Application layer maps ExpaApprovedDetail -> ApprovedDetail
*/
export interface ExpaApprovedDetail {
  // EXPA application ID 
  appId: string;
  // EXPA person ID (links back to our Ep record) 
  personExpaId: string;
  fullName: string;
  phone: string | null;
  opportunityId: string | null;
  opportunityTitle: string | null;
  // Host MC name from host_lc.parent.name 
  hostingMC: string | null;
  // Host LC name from host_lc_name 
  hostingLC: string | null;
  // ISO date string 
  approvalDate: string | null;
  // ISO date string 
  realizedDate: string | null;
  // ISO date string derived when current_status = "completed" 
  completedDate: string | null;
  // ISO date string derived when current_status = "finished"
  finishedDate: string | null;
  projectFees: number | null;
}
