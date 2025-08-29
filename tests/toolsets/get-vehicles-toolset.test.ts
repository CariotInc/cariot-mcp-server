import { AxiosInstance } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CariotApiAuthProvider } from '../../src/lib/auth-provider.js';
import { formatConfig } from '../../src/toolsets/base-toolset.js';
import { vehiclesTool } from '../../src/toolsets/get-vehicles-toolset.js';
import { createMockAuthProvider, createMockAxiosClient } from '../helpers/mock-factories.js';

vi.mock('../../src/api/get-vehicles.js', () => ({
  getVehicles: vi.fn(),
}));

import { getVehicles } from '../../src/api/get-vehicles.js';
import { GetVehiclesListResponse } from '../../src/api/types/get-vehicles.js';

describe('GetVehiclesToolset', () => {
  let registration: {
    name: string;
    config: ReturnType<typeof formatConfig>;
    handler: ReturnType<typeof vehiclesTool.handler>;
  };
  let mockAuthProvider: CariotApiAuthProvider;
  let mockClient: AxiosInstance;

  beforeEach(() => {
    mockAuthProvider = createMockAuthProvider();
    mockClient = createMockAxiosClient();
    registration = {
      name: vehiclesTool.name,
      config: formatConfig(vehiclesTool.config),
      handler: vehiclesTool.handler(mockAuthProvider),
    };
    vi.mocked(mockAuthProvider.getAuthedClient).mockReturnValue(mockClient);
    vi.clearAllMocks();
  });
  describe('handler', () => {
    it('should return formatted response for successful API call', async () => {
      const mockResponse: GetVehiclesListResponse = {
        items: [
          {
            vehicle_id: 'v1',
            vehicle_name: 'Truck 1',
            driver_id: 'd1',
            driver_name: 'Test Driver',
            device_uid: 'dev1',
            description: 'Test Vehicle Description',
            disposal_date: '2025-12-31',
            lease_start: '2025-01-01',
            lease_end: '2025-12-31',
          },
        ],
      };

      vi.mocked(getVehicles).mockResolvedValue(mockResponse);

      const result = await registration.handler({ vehicleName: 'Truck' });

      expect(getVehicles).toHaveBeenCalledWith(mockClient, {
        vehicle_name: 'Truck',
        limit: undefined,
      });
      expect(result.content[0].text).toBe(
        `Raw API Response:\n\n${JSON.stringify(mockResponse, null, 2)}`,
      );
    });

    it('should handle limit parameter correctly', async () => {
      const mockResponse: GetVehiclesListResponse = { items: [] };
      vi.mocked(getVehicles).mockResolvedValue(mockResponse);

      await registration.handler({ vehicleName: 'Truck', limit: 30 });

      expect(getVehicles).toHaveBeenCalledWith(mockClient, { vehicle_name: 'Truck', limit: 30 });
    });

    it('should return empty response when no vehicles found', async () => {
      const mockResponse: GetVehiclesListResponse = { items: [] };
      vi.mocked(getVehicles).mockResolvedValue(mockResponse);

      const result = await registration.handler({});
      expect(result.content[0].text).toBe('API call successful but no vehicles found.');
    });

    it('should return empty response when items undefined', async () => {
      vi.mocked(getVehicles).mockResolvedValue({} as GetVehiclesListResponse);
      const result = await registration.handler({});
      expect(result.content[0].text).toBe('API call successful but no vehicles found.');
    });

    it('should return error response on failure', async () => {
      const errorMessage = 'Network error';
      vi.mocked(getVehicles).mockRejectedValue(new Error(errorMessage));
      const result = await registration.handler({});
      expect(result.content[0].text).toBe(`Failed to retrieve data: ${errorMessage}`);
    });

    it('should handle unknown error', async () => {
      vi.mocked(getVehicles).mockRejectedValue('string error');
      const result = await registration.handler({});
      expect(result.content[0].text).toBe('Failed to retrieve data: Unknown error');
    });
  });

  describe('configuration', () => {
    it('should have correct tool name', () => {
      expect(registration.name).toBe('get_vehicles');
    });

    it('should have correct title and description', () => {
      expect(registration.config.title).toBe('Get Vehicles / 車両一覧取得');
      expect(registration.config.description).toBe(
        "Retrieves a list of all vehicles' information. / 全車両の情報をリストで取得します。",
      );
    });
  });
});
