import { IAuthRepository, DepartmentSummary } from '../../../Domain/abstracts/IAuthRepository';
import { AppError } from '../../errors/AppError';

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

  async getTeamLeaders(departmentId: string): Promise<TeamLeaderOption[]> {
    if (!(await this.repo.departmentExists(departmentId))) {
      throw new AppError('That department does not exist', 404);
    }

    const leaders = await this.repo.findTeamLeadersByDepartment(departmentId);
    return leaders.map((tl) => ({ id: tl.id, fullName: tl.fullName }));
  }
}
