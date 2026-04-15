import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticatedFetchClient, CariotApiAuthProvider } from '../../src/lib/auth-provider.js';
import { FetchClientError } from '../../src/lib/http-client.js';
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
  const idTokenAuthConfig = {
    type: 'id_token' as const,
    idToken: 'my-jwt-token',
    loginUrl: 'https://example.com/login/cariot',
  };

  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();

    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const createMockResponse = (data: unknown, status = 200): Response => {
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue(data),
      text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    } as unknown as Response;
  };

  it('fetches token when none exists and caches it (api_key)', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ api_token: 'token-1' }));

    const provider = new CariotApiAuthProvider(apiKeyAuthConfig);
    const token1 = await provider.getValidToken();
    expect(token1).toBe('token-1');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      loginUrl,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      }),
    );

    mockFetch.mockClear();
    const token2 = await provider.getValidToken();
    expect(token2).toBe('token-1');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches token when none exists and caches it (id_token)', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ api_token: 'token-1' }));

    const provider = new CariotApiAuthProvider(idTokenAuthConfig);
    const token1 = await provider.getValidToken();
    expect(token1).toBe('token-1');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      idTokenAuthConfig.loginUrl,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idTokenAuthConfig.idToken}`,
        },
        body: JSON.stringify({}),
      }),
    );

    mockFetch.mockClear();
    const token2 = await provider.getValidToken();
    expect(token2).toBe('token-1');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('client sets x-auth-token header on requests', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ api_token: 'header-token' }));
    mockFetch.mockResolvedValueOnce(createMockResponse({ data: 'test' }));

    const provider = new CariotApiAuthProvider(apiKeyAuthConfig);
    const client = provider.getAuthedClient();

    await client.get('https://api.example.com/test');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    // Second call should be the GET request with auth header
    expect(mockFetch).toHaveBeenLastCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-auth-token': 'header-token',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('client retries once on 401 with fresh token', async () => {
    // First call: fetch token
    mockFetch.mockResolvedValueOnce(createMockResponse({ api_token: 'first-token' }));
    // Second call: API request that returns 401
    mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'unauthorized' }, 401));
    // Third call: fetch new token after 401
    mockFetch.mockResolvedValueOnce(createMockResponse({ api_token: 'retry-token' }));
    // Fourth call: retry API request with new token
    mockFetch.mockResolvedValueOnce(createMockResponse({ data: 'success' }));

    const provider = new CariotApiAuthProvider(apiKeyAuthConfig);
    const client = provider.getAuthedClient();

    const response = await client.get('https://api.example.com/secure');

    expect(response.data).toEqual({ data: 'success' });
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(logger.warn).toHaveBeenCalledWith('Received 401, attempting re-authentication');

    // Verify the retry request has the new token
    const lastCall = mockFetch.mock.calls[3];
    expect(lastCall[1].headers['x-auth-token']).toBe('retry-token');
  });

  it('client rejects on non-401 without retry', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ api_token: 'token' }));
    mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'server error' }, 500));

    const provider = new CariotApiAuthProvider(apiKeyAuthConfig);
    const client = provider.getAuthedClient();

    await expect(client.get('https://api.example.com/broken')).rejects.toThrow(FetchClientError);
    expect(mockFetch).toHaveBeenCalledTimes(2); // token fetch + failed request, no retry
  });

  it('client retries at most once when retry also returns 401', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ api_token: 'first-token' }));
    mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'unauthorized' }, 401));
    mockFetch.mockResolvedValueOnce(createMockResponse({ api_token: 'retry-token' }));
    // Simulate the retry also failing with 401
    mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'still unauthorized' }, 401));

    const provider = new CariotApiAuthProvider(apiKeyAuthConfig);
    const client = provider.getAuthedClient();

    await expect(client.get('https://api.example.com/secure')).rejects.toThrow(FetchClientError);
    // token fetch + 401 + token refresh + retry 401 = 4 calls, no second retry
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('fetchToken failure bubbles a unified error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));
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
    mockFetch.mockRejectedValueOnce('string issue');
    const provider = new CariotApiAuthProvider(apiKeyAuthConfig);
    await expect(provider.getValidToken()).rejects.toThrow(
      'Failed to authenticate with external API',
    );
    expect(logger.error).toHaveBeenLastCalledWith('Error fetching token', {
      error: 'string issue',
      authType: 'api_key',
    });
  });

  it('fetchToken fails when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'bad credentials' }, 401));
    const provider = new CariotApiAuthProvider(apiKeyAuthConfig);
    await expect(provider.getValidToken()).rejects.toThrow(
      'Failed to authenticate with external API',
    );
  });

  it('getAuthedClient returns an AuthenticatedFetchClient instance', () => {
    const provider = new CariotApiAuthProvider(apiKeyAuthConfig);
    const client = provider.getAuthedClient();
    expect(client).toBeInstanceOf(AuthenticatedFetchClient);
    // Same instance should be returned on subsequent calls
    expect(provider.getAuthedClient()).toBe(client);
  });

  it('clearToken clears the cached token', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ api_token: 'token-1' }));
    mockFetch.mockResolvedValueOnce(createMockResponse({ api_token: 'token-2' }));

    const provider = new CariotApiAuthProvider(apiKeyAuthConfig);
    const token1 = await provider.getValidToken();
    expect(token1).toBe('token-1');

    provider.clearToken();

    const token2 = await provider.getValidToken();
    expect(token2).toBe('token-2');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('createCariotAuthProvider constructs with env credentials (api_key)', () => {
    const prevKey = process.env.API_ACCESS_KEY;
    const prevSecret = process.env.API_ACCESS_SECRET;
    const prevToken = process.env.ID_TOKEN;
    delete process.env.ID_TOKEN;
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
      if (prevToken === undefined) delete process.env.ID_TOKEN;
      else process.env.ID_TOKEN = prevToken;
    }
  });

  it('createCariotAuthProvider constructs with ID_TOKEN (id_token)', () => {
    const prevKey = process.env.API_ACCESS_KEY;
    const prevSecret = process.env.API_ACCESS_SECRET;
    const prevToken = process.env.ID_TOKEN;
    delete process.env.API_ACCESS_KEY;
    delete process.env.API_ACCESS_SECRET;
    process.env.ID_TOKEN = 'my-jwt';
    try {
      const provider = CariotApiAuthProvider.createCariotAuthProvider();
      expect(provider).toBeInstanceOf(CariotApiAuthProvider);
    } finally {
      if (prevKey === undefined) delete process.env.API_ACCESS_KEY;
      else process.env.API_ACCESS_KEY = prevKey;
      if (prevSecret === undefined) delete process.env.API_ACCESS_SECRET;
      else process.env.API_ACCESS_SECRET = prevSecret;
      if (prevToken === undefined) delete process.env.ID_TOKEN;
      else process.env.ID_TOKEN = prevToken;
    }
  });

  it('createCariotAuthProvider prioritizes api_key over ID_TOKEN', () => {
    const prevKey = process.env.API_ACCESS_KEY;
    const prevSecret = process.env.API_ACCESS_SECRET;
    const prevToken = process.env.ID_TOKEN;
    process.env.API_ACCESS_KEY = 'ek';
    process.env.API_ACCESS_SECRET = 'es';
    process.env.ID_TOKEN = 'my-jwt';
    try {
      const provider = CariotApiAuthProvider.createCariotAuthProvider();
      expect(provider).toBeInstanceOf(CariotApiAuthProvider);
      expect(logger.info).toHaveBeenCalledWith('Using API key authentication');
    } finally {
      if (prevKey === undefined) delete process.env.API_ACCESS_KEY;
      else process.env.API_ACCESS_KEY = prevKey;
      if (prevSecret === undefined) delete process.env.API_ACCESS_SECRET;
      else process.env.API_ACCESS_SECRET = prevSecret;
      if (prevToken === undefined) delete process.env.ID_TOKEN;
      else process.env.ID_TOKEN = prevToken;
    }
  });

  it('createCariotAuthProvider throws when no credentials provided', () => {
    const prevKey = process.env.API_ACCESS_KEY;
    const prevSecret = process.env.API_ACCESS_SECRET;
    const prevToken = process.env.ID_TOKEN;
    delete process.env.API_ACCESS_KEY;
    delete process.env.API_ACCESS_SECRET;
    delete process.env.ID_TOKEN;
    try {
      expect(() => CariotApiAuthProvider.createCariotAuthProvider()).toThrow(
        'Authentication credentials are required',
      );
    } finally {
      if (prevKey === undefined) delete process.env.API_ACCESS_KEY;
      else process.env.API_ACCESS_KEY = prevKey;
      if (prevSecret === undefined) delete process.env.API_ACCESS_SECRET;
      else process.env.API_ACCESS_SECRET = prevSecret;
      if (prevToken === undefined) delete process.env.ID_TOKEN;
      else process.env.ID_TOKEN = prevToken;
    }
  });
});
