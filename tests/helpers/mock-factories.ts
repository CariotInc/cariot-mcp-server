import { vi } from 'vitest';
import { CariotApiAuthProvider } from '../../src/lib/auth-provider.js';
import { FetchClient, FetchResponse } from '../../src/lib/http-client.js';

export function createMockAuthProvider(): CariotApiAuthProvider {
  return {
    getAuthedClient: vi.fn(),
    getValidToken: vi.fn(),
    clearToken: vi.fn(),
  } as unknown as CariotApiAuthProvider;
}

export function createMockFetchClient(): FetchClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
  } as unknown as FetchClient;
}

export function createMockFetchResponse<T>(data: T, status = 200): FetchResponse<T> {
  return {
    data,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
  };
}
