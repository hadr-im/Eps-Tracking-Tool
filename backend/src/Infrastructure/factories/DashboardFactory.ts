import { DashboardRepository } from '../repositories/DashboardRepository';
import { DashboardUseCase } from '../../Application/use-cases/dashboard/DashboardUseCase';

export class DashboardFactory {
  private readonly repository: DashboardRepository;

  constructor() {
    this.repository = new DashboardRepository();
  }

  makeDashboardUseCase(): DashboardUseCase {
    return new DashboardUseCase(this.repository);
  }
}
