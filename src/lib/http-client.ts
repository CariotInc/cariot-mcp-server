/**
 * HTTP Client using native fetch API
 * Replaces axios for reduced dependencies and supply chain attack risk
 */

export interface FetchClientConfig {
  timeout?: number;
  headers?: Record<string, string>;
}

export interface FetchRequestConfig {
  params?: unknown;
  headers?: Record<string, string>;
  _retry?: boolean;
}

export interface FetchResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

export class FetchClientError extends Error {
  status?: number;
  response?: FetchResponse<unknown>;
  config?: FetchRequestConfig & { url?: string; method?: string };

  constructor(
    message: string,
    status?: number,
    response?: FetchResponse<unknown>,
    config?: FetchRequestConfig & { url?: string; method?: string },
  ) {
    super(message);
    this.name = 'FetchClientError';
    this.status = status;
    this.response = response;
    this.config = config;
  }
}

export class FetchClient {
  private baseHeaders: Record<string, string>;
  private timeout: number;

  constructor(config: FetchClientConfig = {}) {
    this.timeout = config.timeout ?? 15000;
    this.baseHeaders = config.headers ?? {};
  }

  private buildUrl(url: string, params?: unknown): string {
    if (!params) return url;

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }

    const queryString = searchParams.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    config: FetchRequestConfig = {},
  ): Promise<FetchResponse<T>> {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), this.timeout);

    const headers: Record<string, string> = {
      ...this.baseHeaders,
      ...config.headers,
    };

    const requestUrl = method === 'GET' ? this.buildUrl(url, config.params) : url;

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (data !== undefined && method !== 'GET') {
      fetchOptions.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(requestUrl, fetchOptions);
      globalThis.clearTimeout(timeoutId);

      let responseData: T;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseData = (await response.json()) as T;
      } else {
        responseData = (await response.text()) as unknown as T;
      }

      const fetchResponse: FetchResponse<T> = {
        data: responseData,
        status: response.status,
        headers: response.headers,
      };

      if (!response.ok) {
        throw new FetchClientError(
          `Request failed with status ${response.status}`,
          response.status,
          fetchResponse as FetchResponse<unknown>,
          { ...config, url, method },
        );
      }

      return fetchResponse;
    } catch (error) {
      globalThis.clearTimeout(timeoutId);

      if (error instanceof FetchClientError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new FetchClientError(
          `Request timeout after ${this.timeout}ms`,
          undefined,
          undefined,
          {
            ...config,
            url,
            method,
          },
        );
      }

      throw new FetchClientError(
        error instanceof Error ? error.message : String(error),
        undefined,
        undefined,
        { ...config, url, method },
      );
    }
  }

  async get<T>(url: string, config?: FetchRequestConfig): Promise<FetchResponse<T>> {
    return this.request<T>('GET', url, undefined, config ?? {});
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: FetchRequestConfig,
  ): Promise<FetchResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }
}
