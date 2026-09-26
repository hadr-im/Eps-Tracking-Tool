import { DispatchRepository } from '../repositories/DispatchRepository';
import { MailService } from '../services/MailService';
import { DispatchUseCase } from '../../Application/use-cases/dispatch/DispatchUseCase';

//  Factory for all dispatch-related dependencies

export class DispatchFactory {
  private readonly dispatchRepository: DispatchRepository;
  // Notifies the member that leads have been assigned to them
  private readonly mailService: MailService;

  constructor() {
    this.dispatchRepository = new DispatchRepository();
    this.mailService = new MailService();
  }

  makeDispatchUseCase(): DispatchUseCase {
    return new DispatchUseCase(this.dispatchRepository, this.mailService);
  }
}
