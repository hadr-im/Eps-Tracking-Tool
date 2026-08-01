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
   Returns all active members of a department
   
   Permission scoping:
    - VP & TL: may only request their own department (req.params.id must match JWT departmentId)
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

      const members = await dispatchUseCase.getDepartmentMembers(requestedDeptId);

      res.status(200).json({ data: members, count: members.length });
    } catch (err) {
      handleError(res, err);
    }
  }
}
