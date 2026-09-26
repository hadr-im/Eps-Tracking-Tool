import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../Domain/enums/UserRole';

/*
  Payload for the two-step signup form, submitted in ONE request once both
  steps are filled in. Submitting per-step would leave orphaned half-created
  accounts behind whenever someone abandons the form at step 2.

  The requested* fields are named deliberately: they are what the applicant
  ASKED for. Nothing here is granted. Signup stores them on User.requested and
  leaves the account PENDING until a VP approves it.
*/
export class SignupDto {
  // Step 1 — identity

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  // Step 2 — requested placement in the organisation

  @IsEnum(UserRole, { message: 'Select a valid position' })
  requestedRole!: UserRole;

  @IsString()
  @IsNotEmpty({ message: 'Select a department' })
  requestedDepartmentId!: string;

  /*
    Only meaningful when requestedRole is MEMBER. Null or omitted means "I do
    not know yet" — the approving VP fills it in. Nullable because a member may
    sign up before their Team Leader has an account.
  */
  @IsOptional()
  @IsString()
  requestedTeamLeaderId?: string | null;

  // Only meaningful when requestedRole is TEAM_LEADER. One dispatcher per department.
  @IsOptional()
  @IsBoolean()
  requestedIsDispatcher?: boolean;

  /*
    Required when requestedRole is VP.

    A VP request cannot be approved the normal way — only a VP may approve, so
    the first VP of a department would deadlock waiting for themselves. This
    shared secret is the gate instead: the right code approves the account
    immediately, and nothing else does.
  */
  @IsOptional()
  @IsString()
  vpSetupCode?: string;
}
