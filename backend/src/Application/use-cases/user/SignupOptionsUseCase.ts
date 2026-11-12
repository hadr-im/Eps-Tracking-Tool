import { IAuthRepository, DepartmentSummary } from '../../../Domain/abstracts/IAuthRepository';
import { AppError } from '../../errors/AppError';
import { UserRole } from '../../../Domain/enums/UserRole';

// Deliberately minimal: the signup form needs a label and an id, nothing else.
export interface TeamLeaderOption {
  id: string;
  fullName: string;
}

/*
  Lookups that populate step 2 of the signup form.

  These are reachable WITHOUT authentication, because the person filling the
  form does not have an account yet. That makes them the only endpoints in the
  system that expose anything to anonymous callers, so each returns the
  narrowest possible shape: department names, and the names of Team Leaders a
  new member can say they report to. No emails, no ids beyond what the form
  must post back, no counts.
*/
export class SignupOptionsUseCase {
  constructor(private readonly repo: IAuthRepository) {}

  async getDepartments(): Promise<DepartmentSummary[]> {
    return this.repo.listDepartments();
  }

  /*
    Which single-holder positions are still open.

    Booleans only, and deliberately no names: the form needs to know whether
    to offer the option, and an anonymous caller has no business learning who
    holds it. Departments carry their own `hasVp`, so the VP position is
    derived from that list rather than repeated here.
  */
  async getPositionAvailability(): Promise<{ lcpTaken: boolean; adminTaken: boolean }> {
    const [lcp, admin] = await Promise.all([
      this.repo.findActiveByRole(UserRole.LCP),
      this.repo.findActiveByRole(UserRole.ADMIN),
    ]);
    return { lcpTaken: lcp !== null, adminTaken: admin !== null };
  }

  async getTeamLeaders(departmentId: string): Promise<TeamLeaderOption[]> {
    if (!(await this.repo.departmentExists(departmentId))) {
      throw new AppError('That department does not exist', 404);
    }

    const leaders = await this.repo.findTeamLeadersByDepartment(departmentId);
    return leaders.map((tl) => ({ id: tl.id, fullName: tl.fullName }));
  }
}
