import { API_BASE } from '../api/api-utils.js';
import { getEnvironment } from './env.js';
import { FetchClient, FetchClientError, FetchRequestConfig, FetchResponse } from './http-client.js';
import { logger } from './logger.js';
import { ApiAuthResponse, ApiCredentials } from './types.js';

type AuthConfig =
  | { type: 'id_token'; idToken: string; loginUrl: string }
  | { type: 'api_key'; credentials: ApiCredentials; loginUrl: string };

/**
 * Authenticated HTTP client that wraps FetchClient with token management
 */
export class AuthenticatedFetchClient extends FetchClient {
  private authProvider: CariotApiAuthProvider;

  constructor(authProvider: CariotApiAuthProvider) {
    super({
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.authProvider = authProvider;
  }

  private async executeWithAuth<T>(
    method: 'GET' | 'POST',
    url: string,
    data?: unknown,
    config: FetchRequestConfig = {},
  ): Promise<FetchResponse<T>> {
    const token = await this.authProvider.getValidToken();
    const headers = {
      ...config.headers,
      'x-auth-token': token,
      'Content-Type': 'application/json',
    };

    logger.info('HTTP request', {
      url,
      method,
      params: config.params,
    });

    try {
      if (method === 'GET') {
        return await super.get<T>(url, { ...config, headers });
      } else {
        return await super.post<T>(url, data, { ...config, headers });
      }
    } catch (error) {
      if (error instanceof FetchClientError && error.status === 401 && !config._retry) {
        logger.warn('Received 401, attempting re-authentication');
        this.authProvider.clearToken();
        const newToken = await this.authProvider.getValidToken();

        const retryHeaders = {
          ...config.headers,
          'x-auth-token': newToken,
          'Content-Type': 'application/json',
        };

        if (method === 'GET') {
          return await super.get<T>(url, { ...config, headers: retryHeaders, _retry: true });
        } else {
          return await super.post<T>(url, data, { ...config, headers: retryHeaders, _retry: true });
        }
      }

      logger.error('API request failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async get<T>(url: string, config?: FetchRequestConfig): Promise<FetchResponse<T>> {
    return this.executeWithAuth<T>('GET', url, undefined, config);
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: FetchRequestConfig,
  ): Promise<FetchResponse<T>> {
    return this.executeWithAuth<T>('POST', url, data, config);
  }
}

export class CariotApiAuthProvider {
  private token: string | null = null;
  private authConfig: AuthConfig;
  private client: AuthenticatedFetchClient | null = null;

  constructor(authConfig: AuthConfig) {
    this.authConfig = authConfig;
  }

  async getValidToken(): Promise<string> {
    if (this.token) {
      return this.token;
    }

    return await this.fetchToken();
  }

  clearToken(): void {
    this.token = null;
  }

  private async fetchToken(): Promise<string> {
    try {
      logger.debug('Fetching authentication token', { authType: this.authConfig.type });

      const controller = new AbortController();
      const timeoutId = globalThis.setTimeout(() => controller.abort(), 15000);

      let response: Response;

      if (this.authConfig.type === 'id_token') {
        response = await fetch(this.authConfig.loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.authConfig.idToken}`,
          },
          body: JSON.stringify({}),
          signal: controller.signal,
        });
      } else {
        response = await fetch(this.authConfig.loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(this.authConfig.credentials),
          signal: controller.signal,
        });
      }

      globalThis.clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unable to read response body');
        logger.error('Authentication failed', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
          loginUrl: this.authConfig.loginUrl,
        });
        throw new Error(
          `Authentication request failed with status ${response.status}: ${errorBody}`,
        );
      }

      const data = (await response.json()) as ApiAuthResponse;
      this.token = data.api_token;

      logger.debug('Authentication token fetched successfully');
      return this.token;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error fetching token', {
        error: errorMessage,
        authType: this.authConfig.type,
      });
      throw new Error(`Failed to authenticate with external API: ${errorMessage}`);
    }
  }

  static createCariotAuthProvider(): CariotApiAuthProvider {
    const env = getEnvironment();

    switch (env.authType) {
      case 'api_key':
        logger.info('Using API key authentication');
        return new CariotApiAuthProvider({
          type: 'api_key',
          credentials: {
            api_access_key: env.apiAccessKey,
            api_access_secret: env.apiAccessSecret,
          },
          loginUrl: `${API_BASE}/login`,
        });
      case 'id_token':
        logger.info('Using ID_TOKEN authentication');
        return new CariotApiAuthProvider({
          type: 'id_token',
          idToken: env.idToken,
          loginUrl: `${API_BASE}/login/cariot`,
        });
    }
  }

  getAuthedClient(): FetchClient {
    if (!this.client) {
      this.client = new AuthenticatedFetchClient(this);
    }
    return this.client;
  }
}
