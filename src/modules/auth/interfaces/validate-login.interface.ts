export interface ValidateLogin {
  // email: string;
  emailVerified: boolean;
  passwordHash: string;
  user: { isActive: boolean };
}
