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
import { SyncApprovalsUseCase } from '../../Application/use-cases/expa/SyncApprovalsUseCase';
import { EnrichLeadsUseCase } from '../../Application/use-cases/expa/EnrichLeadsUseCase';
import { SheetLeadRepository } from '../sheets/SheetLeadRepository';
import { TeachingSheetLeadRepository } from '../sheets/TeachingSheetLeadRepository';
import { CombinedSheetLeadRepository } from '../sheets/CombinedSheetLeadRepository';
import { ISheetLeadRepository } from '../../Domain/abstracts/ISheetLeadRepository';

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

  makeSyncApprovalsUseCase(): SyncApprovalsUseCase {
    return new SyncApprovalsUseCase(this.expaRepository, this.epRepository);
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

  /*
    Built on demand, not in the constructor: SheetLeadRepository throws when the
    Google Sheets settings are absent, and every other use-case here should
    keep working in an environment where the sheet is not configured.
  */
  makeEnrichLeadsUseCase(): EnrichLeadsUseCase {
    /*
      The general form is always read. The Teaching form joins it only when
      TEACHING_SHEET_ID is set, so an environment without it behaves exactly
      as before rather than failing on a sheet it cannot see.
    */
    const sources: ISheetLeadRepository[] = [new SheetLeadRepository()];

    const teaching = new TeachingSheetLeadRepository();
    if (teaching.isConfigured()) sources.push(teaching);

    return new EnrichLeadsUseCase(
      sources.length === 1 ? sources[0]! : new CombinedSheetLeadRepository(sources),
      this.epRepository,
    );
  }
}
