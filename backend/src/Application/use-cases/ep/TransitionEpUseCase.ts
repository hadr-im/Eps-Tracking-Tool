import { IEpRepository } from '../../../Domain/abstracts/IEpRepository';
import { UserRole, isVpLevel } from '../../../Domain/enums/UserRole';
import { Product, PROGRAMME_DEPARTMENT_ID } from '../../../Domain/enums/Product';
import { AppError } from '../../errors/AppError';
import { Ep } from '../../../Domain/entities/Ep';

export interface TransitionEpRequest {
  epId: string;
  targetProduct: Product;
  caller: {
    id: string;
    role: UserRole;
    departmentId: string | null;
  };
  note?: string;
}

export class TransitionEpUseCase {
  constructor(private readonly epRepo: IEpRepository) {}

  async execute(request: TransitionEpRequest): Promise<Ep> {
    const { epId, targetProduct, caller, note } = request;

    // 1. Validate caller has a department (unless they are a VP who might not have one)
    if (!caller.departmentId && !isVpLevel(caller.role)) {
      throw new AppError('Caller has no department assigned', 400);
    }

    // 2. Fetch the EP and verify ownership / permissions
    const ep = await this.epRepo.findById(epId);
    if (!ep) {
      throw new AppError('EP not found', 404);
    }

    // Rule: any role can only transition an EP assigned to them
    if (ep.ownerId !== caller.id) {
      throw new AppError('You can only transition EPs assigned to you', 403);
    }

    // 3. Validate the transition is legal (must be a different product)
    if (ep.product === targetProduct) {
      throw new AppError(`EP is already in the ${targetProduct} department`, 400);
    }
    
    // Ensure targetProduct is a valid Product enum value
    if (!Object.values(Product).includes(targetProduct)) {
      throw new AppError(`Invalid target product: ${targetProduct}`, 400);
    }

    // 4. Resolve the target department ID
    const targetDepartmentId = PROGRAMME_DEPARTMENT_ID[targetProduct];
    if (!targetDepartmentId) {
      throw new AppError(`Could not resolve department for product ${targetProduct}`, 500);
    }

    /*
      5. Refuse if the person is already in the target department.

      Someone who ticked two programmes on the sign-up form exists as a row in
      each — that is deliberate, and `@@unique([expaId, departmentId])` is what
      keeps it to one row per department. Moving a row into a department the
      person already occupies breaks that constraint, which surfaced as a bare
      500 with nothing to act on.

      Refusing rather than merging is the safe half of the choice: the row
      already in the target department may be assigned to another member and
      carry their notes, and silently folding this one into it would throw
      their work away. Told plainly, the member can go and look.
    */
    if (ep.expaId) {
      const siblings = await this.epRepo.findByExpaIds([ep.expaId]);
      const clash = siblings.find(
        (s) => s.departmentId === targetDepartmentId && s.id !== ep.id,
      );

      if (clash) {
        throw new AppError(
          `${ep.fullName} is already in the ${targetProduct} department` +
            (clash.ownerId ? ', assigned to another member' : '') +
            '. They signed up for both programmes, so there is nothing to move.',
          409,
        );
      }
    }

    // 6. Execute the transition
    try {
      return await this.epRepo.transitionEp(epId, {
        triggeredById: caller.id,
        fromProduct: ep.product,
        fromDepartmentId: ep.departmentId,
        targetProduct,
        targetDepartmentId,
        note: note ?? `Transitioned from ${ep.product} to ${targetProduct}`,
      });
    } catch (err) {
      /*
        The check above can still lose a race: the sync creates the sibling row
        between reading and writing. The database has the final say, so its
        refusal is translated into the same message rather than a 500.
      */
      if ((err as { code?: string })?.code === 'P2002') {
        throw new AppError(
          `${ep.fullName} is already in the ${targetProduct} department.`,
          409,
        );
      }
      throw err;
    }
  }
}
