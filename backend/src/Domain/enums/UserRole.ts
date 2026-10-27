/*
 Defines the possible roles a user can have within the system.
  - MEMBER: Standard employee / end-user.
  - TEAM_LEADER: Leads a team; elevated visibility.
  - VP: Vice-President; runs one department.
  - LCP: Local Committee President; the same authority as a VP, but over any
    department rather than one.
 */
export enum UserRole {
  MEMBER = "MEMBER",
  TEAM_LEADER = "TEAM_LEADER",
  VP = "VP",
  LCP = "LCP",
}

/*
  Roles carrying department-wide authority.

  An LCP is deliberately modelled as a VP who can move: `departmentId` holds
  whichever department they are currently supervising, so every rule that
  already scopes a VP to their department applies unchanged. Without that, each
  of the forty-odd places that compare against VP would need its own notion of
  "...or an LCP, and then which department?", and one of them would be missed.

  Switching department is therefore a single write to `departmentId`, not a
  parallel permission system.
*/
export const VP_LEVEL_ROLES: readonly UserRole[] = [UserRole.VP, UserRole.LCP];

export function isVpLevel(role: UserRole): boolean {
  return VP_LEVEL_ROLES.includes(role);
}

// Only an LCP may supervise a department other than the one they signed up to.
export function canSwitchDepartment(role: UserRole): boolean {
  return role === UserRole.LCP;
}
