/*
  Lifecycle of a user account.

  PENDING  - signed up, holds no privileges. The role/department the user asked
             for lives in User.requested and is NOT granted until a VP approves.
  ACTIVE   - approved. The granted role/department fields are authoritative.
  REJECTED - a VP declined the signup request. Cannot log in.

  Distinct from User.isDisabled, which deactivates an account that WAS approved
  (someone who left the LC), so the two states produce different messages.
*/
export enum AccountStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
}
