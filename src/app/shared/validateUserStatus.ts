import { UserStatus } from "../../generated/prisma/enums";

type UserStatusInput = {
  isDeleted: boolean;
  isDeactivated: boolean;
  status: UserStatus;
};

/**
 * Validates that a user account is in good standing.
 * Returns an error message string if the user is blocked, or null if valid.
 */
const validateUserStatus = (user: UserStatusInput): string | null => {
  if (user.isDeleted) {
    return "Your account has been deleted. Please contact support.";
  }

  if (user.isDeactivated) {
    return "Your account has been deactivated. Please contact support.";
  }

  if (user.status === UserStatus.BANNED) {
    return "Your account has been banned. Please contact support.";
  }

  if (user.status === UserStatus.SUSPENDED) {
    return "Your account is suspended. Please contact support.";
  }

  return null;
};

export default validateUserStatus;
