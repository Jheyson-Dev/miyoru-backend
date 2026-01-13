import { randomBytes } from 'crypto';
import { DateTime } from 'luxon';

export const createExpiringToken = (hours: number) => {
  // Genera un token seguro
  const token = randomBytes(32).toString('hex');
  const expiresAt = DateTime.utc().plus({ hours });

  return { token, expiresAt: expiresAt.toJSDate() };
};

export const validateExpiringToken = (expiresAt: Date): boolean => {
  const now = DateTime.utc();
  const expires = DateTime.fromJSDate(expiresAt, { zone: 'utc' });
  return expires.toMillis() >= now.toMillis();
};
