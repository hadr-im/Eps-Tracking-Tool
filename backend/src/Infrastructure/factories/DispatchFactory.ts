import { DispatchRepository } from '../repositories/DispatchRepository';
import { ExpaRepository } from '../expa/ExpaRepository';
import { MailService } from '../services/MailService';
import { DispatchUseCase } from '../../Application/use-cases/dispatch/DispatchUseCase';
import { ManualLeadUseCase } from '../../Application/use-cases/dispatch/ManualLeadUseCase';

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

  // Built lazily: ExpaRepository throws when its env vars are missing, and the
  // rest of dispatch should not depend on EXPA being configured.
  makeManualLeadUseCase(): ManualLeadUseCase {
    return new ManualLeadUseCase(this.dispatchRepository, new ExpaRepository());
  }
}
