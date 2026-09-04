const USER_ID_STORAGE_KEY = 'razorflow_user_id';

export function getPersistentUserId(): string {
  const existingUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
  if (existingUserId) return existingUserId;

  const userId = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  localStorage.setItem(USER_ID_STORAGE_KEY, userId);
  return userId;
}
