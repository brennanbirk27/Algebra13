export type ProxyMode = 'builtin' | 'mirror' | 'custom' | 'practice';

export interface ServerPingResult {
  id: string;
  name: string;
  host: string;
  region: string;
  status: number;
  online: boolean;
  latencyMs: number;
  error?: string;
}

export interface ProxyConfig {
  mode: ProxyMode;
  builtinEndpoint: string;
  customUrl: string;
  mirrorUrl: string;
  pointerLockEnabled: boolean;
  mouseSensitivity: number;
  aspectRatio: '16:9' | '4:3' | 'fill';
  showCrosshair: boolean;
  crosshairColor: string;
  crosshairSize: number;
  audioFeedback: boolean;
  unblockAds: boolean;
  highFpsMode: boolean;
}

export interface CodeSnippet {
  id: string;
  title: string;
  filename: string;
  language: string;
  description: string;
  code: string;
}
