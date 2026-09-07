/*
 Manual dependency-injection container.
 Instantiates infrastructure services and wires them into application use-cases.
 Import singletons from here rather than constructing dependencies ad-hoc.
*/
import { AuthRepository } from './repositories/AuthRepository';
import { BcryptService } from './services/BcryptService';
import { JwtService } from './jwt/JwtService';
import { MailService } from './services/MailService';
import { AuthUseCase } from '../Application/use-cases/auth/AuthUseCase';
import { ExpaFactory } from './factories/ExpaFactory';
import { DispatchFactory } from './factories/DispatchFactory';
import { EpManagementFactory } from './factories/EpManagementFactory';
import { DashboardFactory } from './factories/DashboardFactory';

// Auth
const authRepository = new AuthRepository();
const bcryptService = new BcryptService();
const jwtService = new JwtService();
const mailService = new MailService();

export const authUseCase = new AuthUseCase(
  authRepository,
  bcryptService,
  jwtService,
  mailService,
);

const expaFactory = new ExpaFactory();

export const seedLeadsUseCase               = expaFactory.makeSeedLeadsUseCase();
export const syncLeadsUseCase               = expaFactory.makeSyncLeadsUseCase();
export const syncStatusUseCase              = expaFactory.makeSyncStatusUseCase();
export const manualSyncUseCase              = expaFactory.makeManualSyncUseCase();
export const getApprovedEpsUseCase          = expaFactory.makeGetApprovedEpsUseCase();
export const getApprovedEpsWithDetailUseCase = expaFactory.makeGetApprovedEpsWithDetailUseCase();
export const getRealisedEpsUseCase          = expaFactory.makeGetRealisedEpsUseCase();
export const getLeadsUseCase                = expaFactory.makeGetLeadsUseCase();

const dispatchFactory = new DispatchFactory();
export const dispatchUseCase = dispatchFactory.makeDispatchUseCase();

const epManagementFactory = new EpManagementFactory();
export const epManagementUseCase = epManagementFactory.makeEpManagementUseCase();
export const transitionEpUseCase = epManagementFactory.makeTransitionEpUseCase();

const dashboardFactory = new DashboardFactory();
export const dashboardUseCase = dashboardFactory.makeDashboardUseCase();

export { jwtService };
