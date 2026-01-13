import { CustomRequest } from 'src/shared/interfaces';
import { HeaderInfo } from '../interfaces';

/* Helpers simples y sin dependencias */
const getClientIp = (req: CustomRequest): string => {
  const headers = req.headers;
  const xff = headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  const xr = headers['x-real-ip'];
  if (typeof xr === 'string' && xr.length) return xr;
  // express req.ip may exist
  if (req.ip) return String(req.ip);
  if (req.socket?.remoteAddress) return req.socket.remoteAddress;
  if (req.connection?.remoteAddress) return req.connection.remoteAddress;
  return 'unknown';
};

const isBotUa = (ua: string) =>
  /\b(bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider)\b/i.test(
    ua,
  );

const parseBrowser = (ua: string) => {
  const list: [RegExp, string][] = [
    [/(edg)\/([\d.]+)/i, 'Edge'],
    [/msie\s([\d.]+)/i, 'IE'],
    [/trident\/.*rv:([\d.]+)/i, 'IE'],
    [/opr\/([\d.]+)/i, 'Opera'],
    [/opera\/([\d.]+)/i, 'Opera'],
    [/chrome\/([\d.]+)/i, 'Chrome'],
    [/criOS\/([\d.]+)/i, 'Chrome'],
    [/firefox\/([\d.]+)/i, 'Firefox'],
    [/safari\/([\d.]+)/i, 'Safari'],
  ];
  for (const [re, name] of list) {
    const m = ua.match(re);
    if (m) return { name, version: m[1] ?? null };
  }
  return { name: null, version: null };
};

const parseOS = (ua: string) => {
  const checks: [RegExp, string][] = [
    [/(windows nt 10.0)/i, 'Windows 10'],
    [/(windows nt 6.3)/i, 'Windows 8.1'],
    [/(windows nt 6.2)/i, 'Windows 8'],
    [/(windows nt 6.1)/i, 'Windows 7'],
    [/(windows nt 6.0)/i, 'Windows Vista'],
    [/android\s+([\d.]+)/i, 'Android'],
    [/iphone os\s([\d_]+)/i, 'iOS'],
    [/ipad; cpu os\s([\d_]+)/i, 'iOS'],
    [/mac os x\s([\d_]+)/i, 'macOS'],
    [/linux/i, 'Linux'],
  ];
  for (const [re, name] of checks) {
    const m = ua.match(re);
    if (m) {
      const versionRaw = m[1] ?? null;
      const version = versionRaw ? versionRaw.replace(/_/g, '.') : null;
      return { name, version };
    }
  }
  return { name: null, version: null };
};

const detectDevice = (ua: string, osName: string | null, bot: boolean) => {
  if (bot) return { type: 'bot' as const, vendor: null };
  if (/tablet|ipad/i.test(ua) || /android(?!.*mobile)/i.test(ua))
    return { type: 'tablet' as const, vendor: null };
  if (/mobi|iphone|ipod|android/i.test(ua))
    return { type: 'mobile' as const, vendor: null };
  if (osName && /android|ios/i.test(String(osName)))
    return { type: 'mobile' as const, vendor: null };
  return { type: 'desktop' as const, vendor: null };
};

/**
 * Extrae información del navegador/cliente desde la request
 */
export const getHeaderInfo = (req: CustomRequest): HeaderInfo => {
  const uaRaw = (req.headers['user-agent'] as string) || 'unknown';
  const ua = uaRaw ? String(uaRaw) : '';
  const isBot = ua ? isBotUa(ua) : false;
  const browser = ua ? parseBrowser(ua) : { name: null, version: null };
  const os = ua ? parseOS(ua) : { name: null, version: null };
  const device = detectDevice(ua, os.name, isBot);

  const location =
    (req.headers['referer'] as string) ||
    (req.headers['origin'] as string) ||
    req.url ||
    null;

  return {
    ip: getClientIp(req),
    userAgent: uaRaw,
    browser,
    os,
    device,
    isBot,
    rawHeaders: req.headers as Record<string, string | string[] | undefined>,
    location,
  };
};
