import { EpRepository } from '../repositories/EpRepository';
import { CommentRepository } from '../repositories/CommentRepository';
import { EpManagementUseCase } from '../../Application/use-cases/ep/EpManagementUseCase';
import { TransitionEpUseCase } from '../../Application/use-cases/ep/TransitionEpUseCase';
import { GetTransitionsUseCase } from '../../Application/use-cases/ep/GetTransitionsUseCase';

/*
  Factory that constructs and wires all EP Management dependencies
  Shares a single EpRepository instance to avoid separate Prisma connections
*/
export class EpManagementFactory {
  private readonly epRepository: EpRepository;
  private readonly commentRepository: CommentRepository;

  constructor() {
    this.epRepository = new EpRepository();
    this.commentRepository = new CommentRepository();
  }

  makeEpManagementUseCase(): EpManagementUseCase {
    return new EpManagementUseCase(this.epRepository, this.commentRepository);
  }

  makeTransitionEpUseCase(): TransitionEpUseCase {
    return new TransitionEpUseCase(this.epRepository);
  }

  makeGetTransitionsUseCase(): GetTransitionsUseCase {
    return new GetTransitionsUseCase();
  }
}
