export interface ApiAuthResponse {
  timestamp: number;
  api_token: string;
}

export interface ApiCredentials {
  api_access_key: string;
  api_access_secret: string;
}

export interface CariotPostResponse {
  success: boolean;
  message: string;
  id: string;
}
