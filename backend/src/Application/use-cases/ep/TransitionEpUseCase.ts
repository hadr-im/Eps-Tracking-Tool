import { IEpRepository } from '../../../Domain/abstracts/IEpRepository';
import { UserRole } from '../../../Domain/enums/UserRole';
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
    if (!caller.departmentId && caller.role !== UserRole.VP) {
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

    // 5. Execute the transition
    return this.epRepo.transitionEp(epId, {
      triggeredById: caller.id,
      fromProduct: ep.product,
      fromDepartmentId: ep.departmentId,
      targetProduct,
      targetDepartmentId,
      note: note ?? `Transitioned from ${ep.product} to ${targetProduct}`,
    });
  }
}
