import { Request, Response } from 'express';
import { dispatchUseCase } from '../../Infrastructure/container';
import { AppError } from '../../Application/errors/AppError';
import { UserRole } from '../../Domain/enums/UserRole';

function handleError(res: Response, err: unknown): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
  } else {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export class DepartmentController {
  /*
   GET /departments/:id/members
   Returns members of a department
   - TEAM_LEADER: scoped to members assigned to them (teamLeaderId = caller.id)
   - VP: returns all active members of the department
   Both are restricted to their own department only
   */
  static async getMembers(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      const requestedDeptId = req.params['id'];

      // Both TL and VP may only view their own department
      if (caller.departmentId !== requestedDeptId) {
        res.status(403).json({ message: 'You can only view members of your own department' });
        return;
      }

      // TL callers see only their own members, UNLESS they are a dispatcher
      // VPs and dispatchers see everyone
      const teamLeaderId = (caller.role === UserRole.TEAM_LEADER && !caller.isDispatcher) 
        ? caller.id 
        : undefined;
      const members = await dispatchUseCase.getDepartmentMembers(requestedDeptId, teamLeaderId);

      res.status(200).json({ data: members, count: members.length });
    } catch (err) {
      handleError(res, err);
    }
  }
}
