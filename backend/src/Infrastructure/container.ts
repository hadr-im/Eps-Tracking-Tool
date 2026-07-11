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

export { jwtService };
