import { DispatchRepository } from '../repositories/DispatchRepository';
import { DispatchUseCase } from '../../Application/use-cases/dispatch/DispatchUseCase';

//  Factory for all dispatch-related dependencies

export class DispatchFactory {
  private readonly dispatchRepository: DispatchRepository;

  constructor() {
    this.dispatchRepository = new DispatchRepository();
  }

  makeDispatchUseCase(): DispatchUseCase {
    return new DispatchUseCase(this.dispatchRepository);
  }
}
