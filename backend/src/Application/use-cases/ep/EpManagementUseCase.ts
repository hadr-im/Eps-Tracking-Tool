import { IEpRepository } from '../../../Domain/abstracts/IEpRepository';
import { ICommentRepository } from '../../../Domain/abstracts/ICommentRepository';
import { IAuthRepository } from '../../../Domain/abstracts/IAuthRepository';
import { Ep } from '../../../Domain/entities/Ep';
import { Comment } from '../../../Domain/entities/Comment';
import { UserRole } from '../../../Domain/enums/UserRole';
import { TrackingPhase } from '../../../Domain/enums/TrackingPhase';
import { AppError } from '../../errors/AppError';
import { EpFilters } from './EpFilters';
import { EpUpdateData } from './EpUpdateData';

// Caller identity passed in by the controller (from req.user via authMiddleware)
export interface EpManagementCaller {
  id: string;
  role: UserRole;
  departmentId: string | null;
  isDispatcher?: boolean;
}

// Full CRM-aware DTO returned by all EP management endpoints
export interface EpDto {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  university: string | null;
  fieldOfStudy: string | null;
  yearOfStudy: number | null;
  product: string;
  departmentId: string;
  ownerId: string | null;
  assignedAt: string | null;
  statusOnExpa: string;
  source: string | null;
  cvLink: string | null;
  contacted: boolean;
  contactedAt: string | null;
  interested: boolean;
  trackingPhase: string | null;
  notes: string | null;
  duration: string | null;
  availability: string | null;
  createdAtExpa: string;
  syncedAt: string;
}

export interface CommentDto {
  id: string;
  epId: string;
  authorId: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  fieldName: string | null;
  content: string;
  createdAt: string;
}

export class EpManagementUseCase {
  constructor(
    private readonly epRepo: IEpRepository,
    private readonly commentRepo: ICommentRepository,
    private readonly authRepo: IAuthRepository,
  ) {}

  /*
    Returns only the EPs assigned to the logged-in member
    Supports optional filtering by phase/status/contacted/interested/duration
    MEMBER role only (TL/VP use getTeamEps)
  */
  async getMyEps(caller: EpManagementCaller, filters?: EpFilters): Promise<EpDto[]> {
    if (!caller.departmentId) throw new AppError('No department assigned to your account', 400);
    const eps = await this.epRepo.findByOwner(caller.id, filters);
    return eps.map((ep) => this.toDto(ep));
  }

  /*
    Returns EPs for a TL/VP view
    Resolution order:
      1. memberId supplied -> that member's EPs only (unchanged behaviour)
      2. ownerIds supplied -> EPs belonging to those members (TL-scoped, no memberId)
      3. Neither supplied -> all department EPs (VP full-dept view)
  */
  async getTeamEps(
    caller: EpManagementCaller,
    memberId?: string,
    filters?: EpFilters,
    ownerIds?: string[],
  ): Promise<EpDto[]> {
    if (!caller.departmentId) throw new AppError('No department assigned to your account', 400);

    let eps: Ep[];

    if (memberId) {
      await this.assertCanViewMember(caller, memberId);
      eps = await this.epRepo.findByOwner(memberId, filters);
    } else if (ownerIds) {
      eps = await this.epRepo.findByOwners(ownerIds, filters);
    } else {
      eps = await this.epRepo.findByDepartment(caller.departmentId, filters);
    }

    return eps.map((ep) => this.toDto(ep));
  }

  /*
    Decides whether the caller may read another person's pipeline.

    Mirrors exactly who the caller can already see in the member picker
    (DepartmentController.getMembers), so the API grants nothing the UI does
    not. Without this check, passing any user id to GET /eps returned that
    person's EPs regardless of role, department or team.
  */
  private async assertCanViewMember(
    caller: EpManagementCaller,
    memberId: string,
  ): Promise<void> {
    // Your own EPs are always yours to read.
    if (memberId === caller.id) return;

    if (caller.role === UserRole.MEMBER) {
      throw new AppError('You can only view your own EPs', 403);
    }

    const target = await this.authRepo.findById(memberId);
    if (!target) throw new AppError('Member not found', 404);

    if (target.departmentId !== caller.departmentId) {
      throw new AppError('That member is not in your department', 403);
    }

    // A VP oversees the whole department, and so does the dispatcher TL, who
    // has to assign leads across every member.
    if (caller.role === UserRole.VP || caller.isDispatcher) return;

    // Any other Team Leader sees only their own team.
    if (target.teamLeaderId !== caller.id) {
      throw new AppError('That member is not on your team', 403);
    }
  }

  /*
    Applies a partial CRM update to a single EP

    Permission rules:
      - MEMBER: may only update EPs assigned to them (ep.ownerId === caller.id)
      - TEAM_LEADER / VP: read-only (calling this endpoint returns 403)

    Auto-dates:
      - contactedAt is stamped server-side the FIRST time contacted is set to true
        Subsequent edits preserve the original timestamp (handled in EpRepository)
  */
  async updateEp(
    epId: string,
    caller: EpManagementCaller,
    data: EpUpdateData,
  ): Promise<EpDto> {
    const ep = await this.epRepo.findById(epId);
    if (!ep) throw new AppError('EP not found', 404);

    // Rule: any role can edit an EP assigned to them
    // TL/VP remain read-only on EPs assigned to other members
    if (ep.ownerId !== caller.id) {
      throw new AppError('You can only edit EPs assigned to you', 403);
    }

    // Validate trackingPhase enum if provided
    if (
      'trackingPhase' in data &&
      data.trackingPhase !== null &&
      data.trackingPhase !== undefined &&
      !Object.values(TrackingPhase).includes(data.trackingPhase)
    ) {
      throw new AppError(`Invalid tracking phase: ${String(data.trackingPhase)}`, 400);
    }

    const updated = await this.epRepo.updateEp(epId, data);

    return this.toDto(updated);
  }

  /*
    Reassigns an EP to a different member of the same department.
    TL / VP only. Used from the Approved EPs and Under-Process tables when the
    department wants to move ownership of an in-flight EP without going through
    the dispatch pool.
  */
  async reassignOwner(
    epId: string,
    memberId: string,
    caller: EpManagementCaller,
  ): Promise<EpDto> {
    if (caller.role === UserRole.MEMBER) {
      throw new AppError('Only Team Leaders or VPs can reassign EPs', 403);
    }
    if (!caller.departmentId) {
      throw new AppError('No department assigned to your account', 400);
    }

    const ep = await this.epRepo.findById(epId);
    if (!ep) throw new AppError('EP not found', 404);
    if (ep.departmentId !== caller.departmentId) {
      throw new AppError('EP does not belong to your department', 403);
    }

    const target = await this.authRepo.findById(memberId);
    if (!target) throw new AppError('Member not found', 404);
    if (target.departmentId !== caller.departmentId) {
      throw new AppError('That member is not in your department', 403);
    }

    const updated = await this.epRepo.reassignOwner(epId, memberId);
    return this.toDto(updated);
  }

  /*
    Adds a comment on an EP
    TL/VP only (members cannot comment)
    Validates the EP belongs to the caller's department
  */
  async addComment(
    epId: string,
    caller: EpManagementCaller,
    fieldName: string | null,
    content: string,
  ): Promise<CommentDto> {
    if (caller.role === UserRole.MEMBER) {
      throw new AppError('Members cannot add comments', 403);
    }
    if (!caller.departmentId) throw new AppError('No department assigned to your account', 400);

    const ep = await this.epRepo.findById(epId);
    if (!ep) throw new AppError('EP not found', 404);

    // Department ownership check = prevents cross-department commenting
    if (ep.departmentId !== caller.departmentId) {
      throw new AppError('EP does not belong to your department', 403);
    }

    const comment = await this.commentRepo.create(epId, caller.id, fieldName, content);
    const author = caller.id ? await this.authRepo.findById(caller.id) : null;
    const authorMap = author ? new Map([[author.id, author]]) : new Map();
    return this.toCommentDto(comment, authorMap);
  }

  /*
    Returns all comments for an EP, ordered oldest-first
    Any authenticated user in the same department can read
  */
  async getComments(epId: string, caller: EpManagementCaller): Promise<CommentDto[]> {
    if (!caller.departmentId) throw new AppError('No department assigned to your account', 400);

    const ep = await this.epRepo.findById(epId);
    if (!ep) throw new AppError('EP not found', 404);

    if (ep.departmentId !== caller.departmentId) {
      throw new AppError('EP does not belong to your department', 403);
    }

    const comments = await this.commentRepo.findByEpId(epId);
    const authorIds = [...new Set(comments.map((c) => c.authorId).filter((id): id is string => !!id))];
    const authors = await Promise.all(authorIds.map((id) => this.authRepo.findById(id)));
    const authorMap = new Map(authors.filter(Boolean).map((u) => [u!.id, u!]));
    return comments.map((c) => this.toCommentDto(c, authorMap));
  }

  /*
    Returns EPs currently in the "LOOKING_FOR_OPPORTUNITIES" tracking phase
    TL/VP only (read-only view, commentable via addComment)
  */
  async getEpsUnderProcess(caller: EpManagementCaller): Promise<EpDto[]> {
    if (!caller.departmentId) throw new AppError('No department assigned to your account', 400);

    const eps = await this.epRepo.findByDepartment(caller.departmentId, {
      trackingPhase: TrackingPhase.LOOKING_FOR_OPPORTUNITIES,
    });

    return eps.map((ep) => this.toDto(ep));
  }

  // Private mappers

  private toDto(ep: Ep): EpDto {
    return {
      id: ep.id,
      fullName: ep.fullName,
      email: ep.email,
      phone: ep.phone,
      university: ep.university,
      fieldOfStudy: ep.fieldOfStudy,
      yearOfStudy: ep.yearOfStudy,
      product: ep.product,
      departmentId: ep.departmentId,
      ownerId: ep.ownerId,
      assignedAt: ep.assignedAt?.toISOString() ?? null,
      statusOnExpa: ep.statusOnExpa,
      source: ep.source,
      cvLink: ep.cvLink,
      contacted: ep.contacted,
      contactedAt: ep.contactedAt?.toISOString() ?? null,
      interested: ep.interested,
      trackingPhase: ep.trackingPhase,
      notes: ep.notes,
      duration: ep.duration,
      availability: ep.availability,
      createdAtExpa: ep.createdAtExpa.toISOString(),
      syncedAt: ep.syncedAt.toISOString(),
    };
  }

  private toCommentDto(comment: Comment, authorMap: Map<string, import('../../../Domain/entities/User').User> = new Map()): CommentDto {
    const author = comment.authorId ? authorMap.get(comment.authorId) : undefined;
    return {
      id: comment.id,
      epId: comment.epId,
      authorId: comment.authorId,
      authorName: author?.fullName ?? null,
      authorAvatarUrl: author?.avatarUrl ?? null,
      fieldName: comment.fieldName,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
    };
  }
}
