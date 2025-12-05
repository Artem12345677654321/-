export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  groundingSources?: Array<{
    title?: string;
    uri?: string;
  }>;
}

export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  LIVE_VOICE = 'LIVE_VOICE',
  CREATIVE = 'CREATIVE'
}

export interface WeatherData {
  temp: number;
  condition: string;
  location: string;
}
