export interface HeaderInfo {
  ip: string;
  userAgent: string;
  browser: { name: string | null; version: string | null };
  os: { name: string | null; version: string | null };
  device: {
    type: 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown';
    vendor?: string | null;
  };
  isBot: boolean;
  rawHeaders: Record<string, string | string[] | undefined>;
  location: string | null;
}
