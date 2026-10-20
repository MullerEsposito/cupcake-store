export interface LoginState {
  failedAttempts: number;
  blockedUntil: Date | null;
}
