// API Services Barrel Export

export {
  api,
  ApiError,
  API_BASE_URL,
  hasSessionMarker,
  setSessionMarker,
  clearSessionMarker,
  getAccessTokenExpiry,
  getRefreshTokenExpiry,
} from './client';

// Device utilities
export { getDeviceFingerprint, getDeviceInfo, clearDeviceFingerprint } from './utils/deviceFingerprint';

// Auth API and types
export { authApi } from './auth';
export type {
  MeResponse,
  Session,
  SessionActivity,
  TwoFactorStatus,
  SecurityAlert,
  AuthResponse,
  AvailableAuthMethods,
  LoginRequest,
  RegisterRequest,
  MyPermissionsResponse,
} from './auth';

// Other APIs
export { tokensApi } from './tokens';
export { lockingApi } from './locking';
export { airdropsApi } from './airdrops';
export { marketplaceApi } from './marketplace';
export { affiliatesApi } from './affiliates';
export { adminApi } from './admin';
export type { Role, Permission, PermissionGroup, AdminUserDetails, DeletedUser, DeletionLog } from './admin';
export { supportApi } from './support';
export { walletApi } from './wallet';
export { depositsApi } from './deposits';
export { withdrawalsApi } from './withdrawals';
export { notificationsApi } from './notifications';
export { purchaseApi } from './purchase';
