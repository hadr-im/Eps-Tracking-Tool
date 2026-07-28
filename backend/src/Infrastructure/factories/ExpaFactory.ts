import { ExpaRepository } from '../expa/ExpaRepository';
import { EpRepository } from '../repositories/EpRepository';
import { SeedLeadsUseCase } from '../../Application/use-cases/expa/SeedLeadsUseCase';
import { SyncLeadsUseCase } from '../../Application/use-cases/expa/SyncLeadsUseCase';
import { SyncStatusUseCase } from '../../Application/use-cases/expa/SyncStatusUseCase';
import { ManualSyncUseCase } from '../../Application/use-cases/expa/ManualSyncUseCase';
import { GetApprovedEpsUseCase } from '../../Application/use-cases/ep/GetApprovedEpsUseCase';
import { GetApprovedEpsWithDetailUseCase } from '../../Application/use-cases/ep/GetApprovedEpsWithDetailUseCase';
import { GetRealisedEpsUseCase } from '../../Application/use-cases/ep/GetRealisedEpsUseCase';
import { GetLeadsUseCase } from '../../Application/use-cases/ep/GetLeadsUseCase';

/*
  Factory that constructs and wires all EXPA-related dependencies
  Centralises instantiation so container.ts stays lean and new use-cases are added in a single place
*/
export class ExpaFactory {
  private readonly expaRepository: ExpaRepository;
  private readonly epRepository: EpRepository;

  constructor() {
    this.expaRepository = new ExpaRepository();
    this.epRepository = new EpRepository();
  }

  makeSeedLeadsUseCase(): SeedLeadsUseCase {
    return new SeedLeadsUseCase(this.expaRepository, this.epRepository);
  }

  makeSyncLeadsUseCase(): SyncLeadsUseCase {
    return new SyncLeadsUseCase(this.expaRepository, this.epRepository);
  }

  makeSyncStatusUseCase(): SyncStatusUseCase {
    return new SyncStatusUseCase(this.expaRepository, this.epRepository);
  }

  makeManualSyncUseCase(): ManualSyncUseCase {
    return new ManualSyncUseCase(this.expaRepository, this.epRepository);
  }

  makeGetApprovedEpsUseCase(): GetApprovedEpsUseCase {
    return new GetApprovedEpsUseCase(this.epRepository);
  }

  makeGetApprovedEpsWithDetailUseCase(): GetApprovedEpsWithDetailUseCase {
    return new GetApprovedEpsWithDetailUseCase(this.epRepository);
  }

  makeGetRealisedEpsUseCase(): GetRealisedEpsUseCase {
    return new GetRealisedEpsUseCase(this.epRepository);
  }

  makeGetLeadsUseCase(): GetLeadsUseCase {
    return new GetLeadsUseCase(this.epRepository);
  }
}
