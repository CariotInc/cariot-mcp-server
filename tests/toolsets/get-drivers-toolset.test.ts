import { AxiosInstance } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CariotApiAuthProvider } from '../../src/lib/auth-provider.js';
import { formatConfig } from '../../src/toolsets/base-toolset.js';
import { driversTool } from '../../src/toolsets/get-drivers-toolset.js';
import { createMockAuthProvider, createMockAxiosClient } from '../helpers/mock-factories.js';

vi.mock('../../src/api/get-drivers.js', () => ({
  getDrivers: vi.fn(),
}));

import { getDrivers } from '../../src/api/get-drivers.js';
import { GetDriversListResponse } from '../../src/api/types/get-drivers.js';

describe('GetDriversToolset', () => {
  let registration: {
    name: string;
    config: ReturnType<typeof formatConfig>;
    handler: ReturnType<typeof driversTool.handler>;
  };
  let mockAuthProvider: CariotApiAuthProvider;
  let mockClient: AxiosInstance;

  beforeEach(() => {
    mockAuthProvider = createMockAuthProvider();
    mockClient = createMockAxiosClient();
    registration = {
      name: driversTool.name,
      config: formatConfig(driversTool.config),
      handler: driversTool.handler(mockAuthProvider),
    };
    vi.mocked(mockAuthProvider.getAuthedClient).mockReturnValue(mockClient);
    vi.clearAllMocks();
  });
  describe('handler', () => {
    it('should return formatted response for successful API call', async () => {
      const mockResponse: GetDriversListResponse = {
        items: [
          {
            driver_id: 'd1',
            driver_name: 'Test Driver',
            vehicle_id: 'v1',
            vehicle_name: 'Vehicle 1',
            device_uid: 'dev1',
            business_office: 'Tokyo Office',
            department: 'Transportation',
            mail: 'test@example.com',
            mail2: 'test2@example.com',
            license_number: '123456789',
            license_acquisition_date: '2020-01-01',
            license_expiration_date: '2025-12-31',
            hired_date: '2021-04-01',
            resignation_date: '2025-12-31',
          },
        ],
      };

      vi.mocked(getDrivers).mockResolvedValue(mockResponse);

      const result = await registration.handler({ driverName: 'Test Driver' });

      expect(getDrivers).toHaveBeenCalledWith(mockClient, {
        driver_name: 'Test Driver',
        limit: undefined,
      });
      expect(result.content[0].text).toBe(
        `Raw API Response:\n\n${JSON.stringify(mockResponse, null, 2)}`,
      );
    });

    it('should handle limit parameter correctly', async () => {
      const mockResponse: GetDriversListResponse = { items: [] };
      vi.mocked(getDrivers).mockResolvedValue(mockResponse);

      await registration.handler({ driverName: 'Test Driver', limit: 30 });

      expect(getDrivers).toHaveBeenCalledWith(mockClient, {
        driver_name: 'Test Driver',
        limit: 30,
      });
    });

    it('should return empty response when no drivers found', async () => {
      const mockResponse: GetDriversListResponse = { items: [] };
      vi.mocked(getDrivers).mockResolvedValue(mockResponse);
      const result = await registration.handler({});
      expect(result.content[0].text).toBe('API call successful but no drivers found.');
    });

    it('should return empty response when items undefined', async () => {
      vi.mocked(getDrivers).mockResolvedValue({} as GetDriversListResponse);
      const result = await registration.handler({});
      expect(result.content[0].text).toBe('API call successful but no drivers found.');
    });

    it('should return error response on failure', async () => {
      const errorMessage = 'Network error';
      vi.mocked(getDrivers).mockRejectedValue(new Error(errorMessage));
      const result = await registration.handler({});
      expect(result.content[0].text).toBe(`Failed to retrieve data: ${errorMessage}`);
    });

    it('should handle unknown error', async () => {
      vi.mocked(getDrivers).mockRejectedValue('string error');
      const result = await registration.handler({});
      expect(result.content[0].text).toBe('Failed to retrieve data: Unknown error');
    });
  });

  describe('configuration', () => {
    it('should have correct tool name', () => {
      expect(registration.name).toBe('get_drivers');
    });

    it('should have correct title and description', () => {
      expect(registration.config.title).toBe('Get Drivers / ドライバー一覧取得');
      expect(registration.config.description).toBe(
        "Retrieves a list of all drivers' information. / 全ドライバーの情報をリストで取得します。",
      );
    });
  });
});
