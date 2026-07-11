/*
 Defines the possible roles a user can have within the system.
  - MEMBER: Standard employee / end-user.
  - TEAM_LEADER: Leads a team; elevated visibility.
  - VP: Vice-President; broadest access level.
 */
export enum UserRole {
  MEMBER = "MEMBER",
  TEAM_LEADER = "TEAM_LEADER",
  VP = "VP",
}
