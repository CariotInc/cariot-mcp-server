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

  it('refreshes token when none exists and caches it', async () => {
    const provider = new CariotApiAuthProvider(credentials, loginUrl);
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

  it('re-authenticates after token expiry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const provider = new CariotApiAuthProvider(credentials, loginUrl);

    vi.mocked(axios.post).mockResolvedValueOnce({ data: { api_token: 'token-early' } });
    const first = await provider.getValidToken();
    expect(first).toBe('token-early');

    vi.setSystemTime(new Date('2025-01-11T00:00:01Z'));
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { api_token: 'token-late' } });

    const second = await provider.getValidToken();
    expect(second).toBe('token-late');
  });

  it('request interceptor sets x-auth-token and content-type', async () => {
    const provider = new CariotApiAuthProvider(credentials, loginUrl);

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
    const provider = new CariotApiAuthProvider(credentials, loginUrl);

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
    const provider = new CariotApiAuthProvider(credentials, loginUrl);

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
    new CariotApiAuthProvider(credentials, loginUrl);
    const errorHandler = mockClient.__responseErrorInterceptor!;

    const axiosLikeError = { response: { status: 500 }, message: 'Server error' } as const;

    await expect(errorHandler(axiosLikeError)).rejects.toBe(axiosLikeError);
    expect(mockClient.request).not.toHaveBeenCalled();
  });

  it('response interceptor rejects when _retry already true', async () => {
    new CariotApiAuthProvider(credentials, loginUrl);
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

  it('refreshToken failure bubbles a unified error', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('network down'));
    const provider = new CariotApiAuthProvider(credentials, loginUrl);
    await expect(provider.getValidToken()).rejects.toThrow(
      'Failed to authenticate with external API',
    );
    expect(logger.error).toHaveBeenLastCalledWith('Error refreshing token', {
      error: 'network down',
    });
  });

  it('logs stringified non-Error when refreshToken fails with non-Error', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce('string issue');
    const provider = new CariotApiAuthProvider(credentials, loginUrl);
    await expect(provider.getValidToken()).rejects.toThrow(
      'Failed to authenticate with external API',
    );
    expect(logger.error).toHaveBeenLastCalledWith('Error refreshing token', {
      error: 'string issue',
    });
  });

  it('getAuthedClient returns the created axios instance', () => {
    const provider = new CariotApiAuthProvider(credentials, loginUrl);
    expect(provider.getAuthedClient()).toBe(mockClient);
  });

  it('createCariotAuthProvider constructs with env credentials', () => {
    const prevKey = process.env.API_ACCESS_KEY;
    const prevSecret = process.env.API_ACCESS_SECRET;
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
    }
  });
});
