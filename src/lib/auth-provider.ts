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

type AuthConfig =
  | { type: 'access_token'; accessToken: string; loginUrl: string }
  | { type: 'api_key'; credentials: ApiCredentials; loginUrl: string };

export class CariotApiAuthProvider {
  private token: string | null = null;
  private authConfig: AuthConfig;
  private client: AxiosInstance;

  constructor(authConfig: AuthConfig) {
    this.authConfig = authConfig;
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
    if (this.token) {
      return this.token;
    }

    return await this.fetchToken();
  }

  private async fetchToken(): Promise<string> {
    try {
      logger.debug('Fetching authentication token', { authType: this.authConfig.type });

      let response: AxiosResponse<ApiAuthResponse>;

      if (this.authConfig.type === 'access_token') {
        // Use ACCESS_TOKEN with /api/login/cariot endpoint
        response = await axios.post(
          this.authConfig.loginUrl,
          {},
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.authConfig.accessToken}`,
            },
            timeout: 15000,
          },
        );
      } else {
        // Use API key credentials with /api/login endpoint
        response = await axios.post(this.authConfig.loginUrl, this.authConfig.credentials, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        });
      }

      this.token = response.data.api_token;

      logger.debug('Authentication token fetched successfully');
      return this.token;
    } catch (error) {
      logger.error('Error fetching token', {
        error: error instanceof Error ? error.message : String(error),
        authType: this.authConfig.type,
      });
      throw new Error('Failed to authenticate with external API');
    }
  }

  static createCariotAuthProvider(): CariotApiAuthProvider {
    const env = getEnvironment();

    if (env.authType === 'access_token') {
      logger.info('Using ACCESS_TOKEN authentication');
      return new CariotApiAuthProvider({
        type: 'access_token',
        accessToken: env.accessToken,
        loginUrl: `${API_BASE}/login/cariot`,
      });
    } else {
      logger.info('Using API key authentication');
      return new CariotApiAuthProvider({
        type: 'api_key',
        credentials: {
          api_access_key: env.apiAccessKey,
          api_access_secret: env.apiAccessSecret,
        },
        loginUrl: `${API_BASE}/login`,
      });
    }
  }

  getAuthedClient(): AxiosInstance {
    return this.client;
  }
}
