
export interface ProcessingResult {
  imageUrl: string;
  prompt: string;
  timestamp: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export enum EditingMode {
  SINGLE = 'SINGLE',
  COUPLE = 'COUPLE'
}
