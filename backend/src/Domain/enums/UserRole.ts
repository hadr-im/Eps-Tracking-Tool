/*
 Defines the possible roles a user can have within the system.
  - MEMBER: Standard employee / end-user.
  - TEAM_LEADER: Leads a team; elevated visibility.
  - VP: Vice-President; runs one department.
  - LCP: Local Committee President; the same authority as a VP, but over any
    department rather than one.
  - ADMIN: the person who owns the installation. Everything an LCP can do,
    plus the admin dashboard.
 */
export enum UserRole {
  MEMBER = "MEMBER",
  TEAM_LEADER = "TEAM_LEADER",
  VP = "VP",
  LCP = "LCP",
  ADMIN = "ADMIN",
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

  ADMIN extends the same idea one step further: it is an LCP that also reaches
  the admin area, so it joins these lists rather than introducing a third
  shape of authority.
*/
export const VP_LEVEL_ROLES: readonly UserRole[] = [
  UserRole.VP,
  UserRole.LCP,
  UserRole.ADMIN,
];

export function isVpLevel(role: UserRole): boolean {
  return VP_LEVEL_ROLES.includes(role);
}

/*
  Roles that oversee the whole LC rather than one department, and so are not
  part of any department's roster: they hold a departmentId only to say which
  one they are currently looking at.
*/
export const LC_WIDE_ROLES: readonly UserRole[] = [UserRole.LCP, UserRole.ADMIN];

export function canSwitchDepartment(role: UserRole): boolean {
  return LC_WIDE_ROLES.includes(role);
}

// The admin area. Only the owner of the installation reaches it.
export function isAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}
