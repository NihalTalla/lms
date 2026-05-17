export type Role = 'student' | 'faculty' | 'trainer' | 'admin';

export interface AccessTokenPayload {
  id: string;
  role: Role;
  email: string;
}

export interface RefreshTokenPayload {
  id: string;
  jti: string;
}
