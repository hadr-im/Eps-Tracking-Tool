import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserRole } from '../../../Domain/enums/UserRole';

/*
  Step 2 of the Google signup flow.

  Google covers step 1 (identity), so there is no password here. The identity
  arrives instead inside setupToken — a short-lived, single-purpose JWT minted
  by the OAuth callback for a Google account that does not exist yet. No User
  row is created until this request succeeds, so abandoning the form leaves
  nothing behind.
*/
export class CompleteGoogleSignupDto {
  @IsString()
  @IsNotEmpty({ message: 'Signup session is missing. Start again from the login page.' })
  setupToken!: string;

  @IsEnum(UserRole, { message: 'Select a valid position' })
  requestedRole!: UserRole;

  @IsString()
  @IsNotEmpty({ message: 'Select a department' })
  requestedDepartmentId!: string;

  @IsOptional()
  @IsString()
  requestedTeamLeaderId?: string | null;

  @IsOptional()
  @IsBoolean()
  requestedIsDispatcher?: boolean;

  // Required when requestedRole is VP. See SignupDto.vpSetupCode.
  @IsOptional()
  @IsString()
  vpSetupCode?: string;
}
