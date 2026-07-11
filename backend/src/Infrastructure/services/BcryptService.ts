import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/*
 Thin, injectable wrapper around bcrypt.
 
 Using a class (rather than bare functions) allows use-cases to receive it
 via constructor injection and be tested with a mock in unit tests.
 */
export class BcryptService {
  /*
   Hashes a plain-text string (password or raw refresh-token JWT).
   bcrypt automatically generates and embeds a random salt.
   */
  async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, SALT_ROUNDS);
  }

  /*
   Compares a plain-text candidate against a stored bcrypt hash.
   Returns `true` when they match, `false` otherwise.
   */
  async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
