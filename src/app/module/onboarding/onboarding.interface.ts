export interface OnboardingStateResponse {
  currentStep: string;
  verificationStatus: string | null;
  verificationRequest: object | null;
  note: string | null;
}
