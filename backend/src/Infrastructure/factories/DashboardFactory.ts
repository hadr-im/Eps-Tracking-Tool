import { DashboardRepository } from '../repositories/DashboardRepository';
import { AuthRepository } from '../repositories/AuthRepository';
import { DashboardUseCase } from '../../Application/use-cases/dashboard/DashboardUseCase';

export class DashboardFactory {
  private readonly repository: DashboardRepository;
  // Needed to check whose dashboard the caller is allowed to open
  private readonly authRepository: AuthRepository;

  constructor() {
    this.repository = new DashboardRepository();
    this.authRepository = new AuthRepository();
  }

  makeDashboardUseCase(): DashboardUseCase {
    return new DashboardUseCase(this.repository, this.authRepository);
  }
}
