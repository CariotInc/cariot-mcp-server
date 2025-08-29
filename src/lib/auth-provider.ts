import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { API_BASE } from '../api/api-utils.js';
import { getEnvironment } from './env.js';
import { logger } from './logger.js';
import { ApiAuthResponse, ApiCredentials } from './types.js';

export class CariotApiAuthProvider {
  private token: string | null = null;
  private tokenExpiry: number | null = null;
  private credentials: ApiCredentials;
  private loginUrl: string;
  private client: AxiosInstance;

  constructor(credentials: ApiCredentials, loginUrl: string) {
    this.credentials = credentials;
    this.loginUrl = loginUrl;
    this.client = axios.create({
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(async (config) => {
      const token = await this.getValidToken();
      let headersObj: AxiosHeaders;
      if (config.headers instanceof AxiosHeaders) {
        headersObj = config.headers;
      } else {
        headersObj = new AxiosHeaders(config.headers as Record<string, string | number | boolean>);
      }
      headersObj.set('x-auth-token', token);
      headersObj.set('Content-Type', 'application/json');
      config.headers = headersObj;
      logger.info('HTTP request', {
        url: config.url,
        method: config.method,
        params: config.params,
      });
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const axiosError = error as AxiosError;
        const originalConfig = axiosError.config as AxiosRequestConfig & { _retry?: boolean };
        if (axiosError.response?.status === 401 && originalConfig && !originalConfig._retry) {
          logger.warn('Received 401, attempting re-authentication');
          this.token = null;
          this.tokenExpiry = null;
          const newToken = await this.getValidToken();
          originalConfig._retry = true;
          originalConfig.headers = {
            ...(originalConfig.headers ?? {}),
            'x-auth-token': newToken,
          };
          return this.client.request(originalConfig);
        }
        logger.error('API request failed', {
          error: axiosError.message,
        });
        return Promise.reject(axiosError);
      },
    );
  }

  async getValidToken(): Promise<string> {
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    return await this.refreshToken();
  }

  private async refreshToken(): Promise<string> {
    try {
      logger.debug('Refreshing authentication token');

      const response: AxiosResponse<ApiAuthResponse> = await axios.post(
        this.loginUrl,
        this.credentials,
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
      );

      this.token = response.data.api_token;
      this.tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000;

      logger.debug('Authentication token refreshed successfully');
      return this.token;
    } catch (error) {
      logger.error('Error refreshing token', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to authenticate with external API');
    }
  }

  static createCariotAuthProvider(): CariotApiAuthProvider {
    const { apiAccessKey, apiAccessSecret } = getEnvironment();
    return new CariotApiAuthProvider(
      {
        api_access_key: apiAccessKey,
        api_access_secret: apiAccessSecret,
      },
      `${API_BASE}/login`,
    );
  }

  getAuthedClient(): AxiosInstance {
    return this.client;
  }
}
