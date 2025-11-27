import axios, { AxiosHeaders, AxiosInstance, AxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CariotApiAuthProvider } from '../../src/lib/auth-provider.js';
import { logger } from '../../src/lib/logger.js';

vi.mock('../../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CariotApiAuthProvider', () => {
  const credentials = { api_access_key: 'key', api_access_secret: 'secret' } as const;
  const loginUrl = 'https://example.com/login';
  const apiKeyAuthConfig = {
    type: 'api_key' as const,
    credentials,
    loginUrl,
  };
  const accessTokenAuthConfig = {
    type: 'access_token' as const,
    accessToken: 'my-jwt-token',
    loginUrl: 'https://example.com/login/cariot',
  };

  interface InterceptableAxiosInstance extends AxiosInstance {
    __requestInterceptor?: (
      config: AxiosRequestConfig,
    ) => Promise<AxiosRequestConfig> | AxiosRequestConfig;
    __responseErrorInterceptor?: (error: unknown) => Promise<unknown>;
  }

  let mockClient: InterceptableAxiosInstance;

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();

    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      request: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn(
            (fn: (cfg: AxiosRequestConfig) => Promise<AxiosRequestConfig> | AxiosRequestConfig) => {
              mockClient.__requestInterceptor = fn;
            },
          ),
        },
        response: {
          use: vi.fn((onFulfilled: unknown, onRejected?: (error: unknown) => unknown) => {
            if (onRejected) {
              mockClient.__responseErrorInterceptor = async (error: unknown) => onRejected(error);
            }
          }),
        },
      },
    } as unknown as InterceptableAxiosInstance;

    vi.spyOn(axios, 'create').mockReturnValue(mockClient);
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { api_token: 'token-1' } });
  });

  it('fetches token when none exists and caches it (api_key)', async () => {
    const provider = new CariotApiAuthProvider(apiKeyAuthConfig);
    const token1 = await provider.getValidToken();
    expect(token1).toBe('token-1');
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      loginUrl,
      credentials,
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' }, timeout: 15000 }),
    );

    vi.mocked(axios.post).mockClear();
    const token2 = await provider.getValidToken();
    expect(token2).toBe('token-1');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('fetches token when none exists and caches it (access_token)', async () => {
    const provider = new CariotApiAuthProvider(accessTokenAuthConfig);
    const token1 = await provider.getValidToken();
    expect(token1).toBe('token-1');
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      accessTokenAuthConfig.loginUrl,
      {},
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessTokenAuthConfig.accessToken}`,
        },
        timeout: 15000,
      }),
    );

    vi.mocked(axios.post).mockClear();
    const token2 = await provider.getValidToken();
    expect(token2).toBe('token-1');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('request interceptor sets x-auth-token and content-type', async () => {
    const provider = new CariotApiAuthProvider(apiKeyAuthConfig);

    vi.mocked(axios.post).mockResolvedValueOnce({ data: { api_token: 'header-token' } });

    const interceptor = mockClient.__requestInterceptor!;
    expect(interceptor).toBeTypeOf('function');

    const cfg: AxiosRequestConfig = { url: '/foo', method: 'get', headers: {} };
    const result = await interceptor(cfg);

    expect(result.headers instanceof AxiosHeaders).toBe(true);
    const headers = result.headers as AxiosHeaders;
    expect(headers.get('x-auth-token')).toBe('header-token');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('request interceptor preserves AxiosHeaders instance', async () => {
    const provider = new CariotApiAuthProvider(apiKeyAuthConfig);

    vi.mocked(axios.post).mockResolvedValueOnce({ data: { api_token: 'hdr2' } });

    const interceptor = mockClient.__requestInterceptor!;
    const initialHeaders = new AxiosHeaders({ 'Content-Type': 'text/plain' });
    const cfg: AxiosRequestConfig = { url: '/bar', method: 'get', headers: initialHeaders };
    const result = await interceptor(cfg);

    expect(result.headers).toBe(initialHeaders);
    expect((result.headers as AxiosHeaders).get('x-auth-token')).toBe('hdr2');
    expect((result.headers as AxiosHeaders).get('Content-Type')).toBe('application/json');
  });

  it('response interceptor retries once on 401 with fresh token', async () => {
    const provider = new CariotApiAuthProvider(apiKeyAuthConfig);

    vi.mocked(axios.post).mockResolvedValueOnce({ data: { api_token: 'retry-token' } });

    const retriedResponse = { data: { ok: true } };
    vi.mocked(mockClient.request).mockResolvedValue(retriedResponse);

    const errorHandler = mockClient.__responseErrorInterceptor!;
    expect(errorHandler).toBeTypeOf('function');

    const originalConfig: AxiosRequestConfig & { _retry?: boolean } = {
      url: '/secure',
      method: 'get',
      headers: {},
    };

    const axiosLikeError = {
      response: { status: 401 },
      config: originalConfig,
      message: 'Unauthorized',
    } as const;

    const out = await errorHandler(axiosLikeError);
    expect(out).toBe(retriedResponse);

    expect(mockClient.request).toHaveBeenCalledTimes(1);
    const calledWith = vi.mocked(mockClient.request).mock.calls[0][0] as AxiosRequestConfig & {
      _retry?: boolean;
    };
    expect(calledWith._retry).toBe(true);
    expect(calledWith.headers).toBeTruthy();
    const hdrs = calledWith.headers as AxiosHeaders | Record<string, unknown>;
    expect(hdrs['x-auth-token']).toBe('retry-token');
  });

  it('response interceptor rejects on non-401 without retry', async () => {
    new CariotApiAuthProvider(apiKeyAuthConfig);
    const errorHandler = mockClient.__responseErrorInterceptor!;

    const axiosLikeError = { response: { status: 500 }, message: 'Server error' } as const;

    await expect(errorHandler(axiosLikeError)).rejects.toBe(axiosLikeError);
    expect(mockClient.request).not.toHaveBeenCalled();
  });

  it('response interceptor rejects when _retry already true', async () => {
    new CariotApiAuthProvider(apiKeyAuthConfig);
    const errorHandler = mockClient.__responseErrorInterceptor!;

    const originalConfig: AxiosRequestConfig & { _retry?: boolean } = {
      url: '/secure',
      method: 'get',
      headers: {},
      _retry: true,
    };
    const axiosLikeError = { response: { status: 401 }, config: originalConfig } as const;

    await expect(errorHandler(axiosLikeError)).rejects.toBe(axiosLikeError);
    expect(mockClient.request).not.toHaveBeenCalled();
  });

  it('fetchToken failure bubbles a unified error', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('network down'));
    const provider = new CariotApiAuthProvider(apiKeyAuthConfig);
    await expect(provider.getValidToken()).rejects.toThrow(
      'Failed to authenticate with external API',
    );
    expect(logger.error).toHaveBeenLastCalledWith('Error fetching token', {
      error: 'network down',
      authType: 'api_key',
    });
  });

  it('logs stringified non-Error when fetchToken fails with non-Error', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce('string issue');
    const provider = new CariotApiAuthProvider(apiKeyAuthConfig);
    await expect(provider.getValidToken()).rejects.toThrow(
      'Failed to authenticate with external API',
    );
    expect(logger.error).toHaveBeenLastCalledWith('Error fetching token', {
      error: 'string issue',
      authType: 'api_key',
    });
  });

  it('getAuthedClient returns the created axios instance', () => {
    const provider = new CariotApiAuthProvider(apiKeyAuthConfig);
    expect(provider.getAuthedClient()).toBe(mockClient);
  });

  it('createCariotAuthProvider constructs with env credentials (api_key)', () => {
    const prevKey = process.env.API_ACCESS_KEY;
    const prevSecret = process.env.API_ACCESS_SECRET;
    const prevToken = process.env.ACCESS_TOKEN;
    delete process.env.ACCESS_TOKEN;
    process.env.API_ACCESS_KEY = 'ek';
    process.env.API_ACCESS_SECRET = 'es';
    try {
      const provider = CariotApiAuthProvider.createCariotAuthProvider();
      expect(provider).toBeInstanceOf(CariotApiAuthProvider);
    } finally {
      if (prevKey === undefined) delete process.env.API_ACCESS_KEY;
      else process.env.API_ACCESS_KEY = prevKey;
      if (prevSecret === undefined) delete process.env.API_ACCESS_SECRET;
      else process.env.API_ACCESS_SECRET = prevSecret;
      if (prevToken === undefined) delete process.env.ACCESS_TOKEN;
      else process.env.ACCESS_TOKEN = prevToken;
    }
  });

  it('createCariotAuthProvider constructs with ACCESS_TOKEN (access_token)', () => {
    const prevKey = process.env.API_ACCESS_KEY;
    const prevSecret = process.env.API_ACCESS_SECRET;
    const prevToken = process.env.ACCESS_TOKEN;
    delete process.env.API_ACCESS_KEY;
    delete process.env.API_ACCESS_SECRET;
    process.env.ACCESS_TOKEN = 'my-jwt';
    try {
      const provider = CariotApiAuthProvider.createCariotAuthProvider();
      expect(provider).toBeInstanceOf(CariotApiAuthProvider);
    } finally {
      if (prevKey === undefined) delete process.env.API_ACCESS_KEY;
      else process.env.API_ACCESS_KEY = prevKey;
      if (prevSecret === undefined) delete process.env.API_ACCESS_SECRET;
      else process.env.API_ACCESS_SECRET = prevSecret;
      if (prevToken === undefined) delete process.env.ACCESS_TOKEN;
      else process.env.ACCESS_TOKEN = prevToken;
    }
  });

  it('createCariotAuthProvider prioritizes api_key over ACCESS_TOKEN', () => {
    const prevKey = process.env.API_ACCESS_KEY;
    const prevSecret = process.env.API_ACCESS_SECRET;
    const prevToken = process.env.ACCESS_TOKEN;
    process.env.API_ACCESS_KEY = 'ek';
    process.env.API_ACCESS_SECRET = 'es';
    process.env.ACCESS_TOKEN = 'my-jwt';
    try {
      const provider = CariotApiAuthProvider.createCariotAuthProvider();
      expect(provider).toBeInstanceOf(CariotApiAuthProvider);
      expect(logger.info).toHaveBeenCalledWith('Using API key authentication');
    } finally {
      if (prevKey === undefined) delete process.env.API_ACCESS_KEY;
      else process.env.API_ACCESS_KEY = prevKey;
      if (prevSecret === undefined) delete process.env.API_ACCESS_SECRET;
      else process.env.API_ACCESS_SECRET = prevSecret;
      if (prevToken === undefined) delete process.env.ACCESS_TOKEN;
      else process.env.ACCESS_TOKEN = prevToken;
    }
  });

  it('createCariotAuthProvider throws when no credentials provided', () => {
    const prevKey = process.env.API_ACCESS_KEY;
    const prevSecret = process.env.API_ACCESS_SECRET;
    const prevToken = process.env.ACCESS_TOKEN;
    delete process.env.API_ACCESS_KEY;
    delete process.env.API_ACCESS_SECRET;
    delete process.env.ACCESS_TOKEN;
    try {
      expect(() => CariotApiAuthProvider.createCariotAuthProvider()).toThrow(
        'Authentication credentials are required',
      );
    } finally {
      if (prevKey === undefined) delete process.env.API_ACCESS_KEY;
      else process.env.API_ACCESS_KEY = prevKey;
      if (prevSecret === undefined) delete process.env.API_ACCESS_SECRET;
      else process.env.API_ACCESS_SECRET = prevSecret;
      if (prevToken === undefined) delete process.env.ACCESS_TOKEN;
      else process.env.ACCESS_TOKEN = prevToken;
    }
  });
});
