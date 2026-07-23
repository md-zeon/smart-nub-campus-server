export interface UpdatePrivacySettingsInput {
  showProfile?: string;
  showAcademicInfo?: string;
  showSkills?: string;
  showProjects?: string;
  showReputation?: string;
  showBadges?: string;
  showSocialLinks?: string;
  connectionRequestPolicy?: string;
  messagingPolicy?: string;
  allowMessageRequests?: boolean;
  showOnlineStatus?: boolean;
  showLastActive?: boolean;
  readReceipts?: boolean;
  searchableProfile?: boolean;
  appearInRecommendations?: boolean;
}

export interface UpdateNotificationSettingsInput {
  resourcesInApp?: boolean;
  resourcesEmail?: boolean;
  discussionsInApp?: boolean;
  discussionsEmail?: boolean;
  qaInApp?: boolean;
  qaEmail?: boolean;
  messagingInApp?: boolean;
  messagingEmail?: boolean;
  networkInApp?: boolean;
  networkEmail?: boolean;
  teamsInApp?: boolean;
  teamsEmail?: boolean;
  adminInApp?: boolean;
  adminEmail?: boolean;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RequestExportInput {
  type: string;
}

export interface RequestArchiveInput {
  password: string;
}

export interface RequestDeletionInput {
  password: string;
  reason?: string;
}
