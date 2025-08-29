import { AxiosInstance } from 'axios';
import { vi } from 'vitest';
import { CariotApiAuthProvider } from '../../src/lib/auth-provider.js';

export function createMockAuthProvider(): CariotApiAuthProvider {
  return {
    getAuthedClient: vi.fn(),
    getValidToken: vi.fn(),
  } as unknown as CariotApiAuthProvider;
}

export function createMockAxiosClient(): AxiosInstance {
  return {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  } as unknown as AxiosInstance;
}
