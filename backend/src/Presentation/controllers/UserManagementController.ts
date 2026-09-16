import { Request, Response } from 'express';
import { userManagementUseCase } from '../../Infrastructure/container';
import { AppError } from '../../Application/errors/AppError';

function handleError(res: Response, err: unknown): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
  } else {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export class UserManagementController {
  /*
    PATCH /users/:memberId/team-leader
    Body: { teamLeaderId: string | null }

    Assigns (or unassigns when null) a member to a Team Leader.
    Caller must be TEAM_LEADER (own department only) or VP.
  */
  static async assignTeamLeader(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      const memberId = req.params['memberId'];

      if (typeof memberId !== 'string' || memberId.trim() === '') {
        res.status(400).json({ message: 'memberId is required' });
        return;
      }

      const body = req.body as { teamLeaderId?: unknown };

      // Accept explicit null (unassign) or a non-empty string
      const teamLeaderId =
        body.teamLeaderId === null
          ? null
          : typeof body.teamLeaderId === 'string' && body.teamLeaderId.trim() !== ''
          ? body.teamLeaderId
          : undefined;

      if (teamLeaderId === undefined) {
        res
          .status(400)
          .json({ message: 'teamLeaderId must be a non-empty string or null to unassign' });
        return;
      }

      const updated = await userManagementUseCase.assignTeamLeader(memberId, teamLeaderId, caller);

      res.status(200).json({
        message:
          teamLeaderId === null
            ? 'Member unassigned from Team Leader'
            : 'Member assigned to Team Leader successfully',
        data: updated,
      });
    } catch (err) {
      handleError(res, err);
    }
  }
}