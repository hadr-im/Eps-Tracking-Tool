import { IEpRepository } from '../../../Domain/abstracts/IEpRepository';
import { ICommentRepository, CommentAuthor } from '../../../Domain/abstracts/ICommentRepository';
import { IAuthRepository } from '../../../Domain/abstracts/IAuthRepository';
import { Ep } from '../../../Domain/entities/Ep';
import { Comment } from '../../../Domain/entities/Comment';
import { UserRole } from '../../../Domain/enums/UserRole';
import { TrackingPhase } from '../../../Domain/enums/TrackingPhase';
import { AppError } from '../../errors/AppError';
import { EpFilters } from './EpFilters';
import { EpUpdateData } from './EpUpdateData';
import { PageRequest, Paginated, toPaginated } from './Pagination';

// Caller identity passed in by the controller (from req.user via authMiddleware)
export interface EpManagementCaller {
  id: string;
  role: UserRole;
  departmentId: string | null;
}

// Full CRM-aware DTO returned by all EP management endpoints
export interface EpDto {
  id: string;
  // The EXPA person id shown in the UI. Differs from `id` on the second copy
  // of someone who belongs to two departments, and is null for a lead typed
  // in by hand that is not on EXPA.
  expaId: string | null;
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
  async getMyEps(
    caller: EpManagementCaller,
    filters?: EpFilters,
    page?: PageRequest,
  ): Promise<Paginated<EpDto>> {
    if (!caller.departmentId) throw new AppError('No department assigned to your account', 400);
    const { rows, total } = await this.epRepo.findByOwner(caller.id, filters, page);
    return toPaginated(rows.map((ep) => this.toDto(ep)), total, page);
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
    page?: PageRequest,
  ): Promise<Paginated<EpDto>> {
    if (!caller.departmentId) throw new AppError('No department assigned to your account', 400);

    let result: { rows: Ep[]; total: number };

    if (memberId) {
      await this.assertCanViewMember(caller, memberId);
      result = await this.epRepo.findByOwner(memberId, filters, page);
    } else if (ownerIds) {
      result = await this.epRepo.findByOwners(ownerIds, filters, page);
    } else {
      result = await this.epRepo.findByDepartment(caller.departmentId, filters, page);
    }

    return toPaginated(result.rows.map((ep) => this.toDto(ep)), result.total, page);
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

    // A VP oversees the whole department, and every Team Leader can now assign
    // leads across it, so both need to see any member's EPs.
    if (caller.role === UserRole.VP || caller.role === UserRole.TEAM_LEADER) return;

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

    /*
      Contacted is one-way: reaching out to someone is not an act that can be
      taken back, and the contactedAt stamp other views date their timeline
      from would be left pointing at a contact that supposedly never happened.
      The UI locks the checkbox once it is ticked; this drops the field for any
      client holding a stale copy, rather than failing a patch that is also
      carrying legitimate edits to other fields.
    */
    const patch =
      ep.contacted && data.contacted === false
        ? (({ contacted: _dropped, ...rest }) => rest)(data)
        : data;

    const updated = await this.epRepo.updateEp(epId, patch);

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

    const created = await this.commentRepo.create(epId, caller.id, fieldName, content);
    return this.toCommentDto(created.comment, created.author);
  }

  /*
    Returns all comments for an EP, ordered oldest-first
    Any authenticated user in the same department can read
  */
  async getComments(epId: string, caller: EpManagementCaller): Promise<CommentDto[]> {
    if (!caller.departmentId) throw new AppError('No department assigned to your account', 400);

    // The comments query does not depend on the EP lookup, so both go out at
    // once; the permission check below still runs before anything is returned.
    const [ep, comments] = await Promise.all([
      this.epRepo.findById(epId),
      this.commentRepo.findByEpId(epId),
    ]);

    if (!ep) throw new AppError('EP not found', 404);

    if (ep.departmentId !== caller.departmentId) {
      throw new AppError('EP does not belong to your department', 403);
    }

    return comments.map((c) => this.toCommentDto(c.comment, c.author));
  }

  /*
    Returns EPs currently in the "LOOKING_FOR_OPPORTUNITIES" tracking phase
    TL/VP only (read-only view, commentable via addComment)
  */
  async getEpsUnderProcess(
    caller: EpManagementCaller,
    filters: EpFilters = {},
  ): Promise<EpDto[]> {
    if (!caller.departmentId) throw new AppError('No department assigned to your account', 400);

    // Unpaginated: this view is a short working list, not a browsable table.
    // The phase is what defines the view, so it is applied last and cannot be
    // overridden by a query-string filter.
    const { rows } = await this.epRepo.findByDepartment(caller.departmentId, {
      ...filters,
      trackingPhase: TrackingPhase.LOOKING_FOR_OPPORTUNITIES,
    });

    return rows.map((ep) => this.toDto(ep));
  }

  // Private mappers

  private toDto(ep: Ep): EpDto {
    return {
      id: ep.id,
      expaId: ep.expaId,
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

  private toCommentDto(comment: Comment, author: CommentAuthor | null): CommentDto {
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
