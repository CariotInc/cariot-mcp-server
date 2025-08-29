import { AxiosInstance } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CariotApiAuthProvider } from '../../src/lib/auth-provider.js';
import { formatConfig } from '../../src/toolsets/base-toolset.js';
import { realtimeTool } from '../../src/toolsets/get-realtime-toolset.js';
import { createMockAuthProvider, createMockAxiosClient } from '../helpers/mock-factories.js';

vi.mock('../../src/api/get-device-snapshots.js', () => ({
  getDeviceSnapshots: vi.fn(),
}));

import { getDeviceSnapshots } from '../../src/api/get-device-snapshots.js';

describe('GetRealtimeToolset', () => {
  let registration: {
    name: string;
    config: ReturnType<typeof formatConfig>;
    handler: ReturnType<typeof realtimeTool.handler>;
  };
  let mockAuthProvider: CariotApiAuthProvider;
  let mockClient: AxiosInstance;

  beforeEach(() => {
    mockAuthProvider = createMockAuthProvider();
    mockClient = createMockAxiosClient();
    registration = {
      name: realtimeTool.name,
      config: formatConfig(realtimeTool.config),
      handler: realtimeTool.handler(mockAuthProvider),
    };
    vi.mocked(mockAuthProvider.getAuthedClient).mockReturnValue(mockClient);
    vi.clearAllMocks();
  });
  describe('handler', () => {
    it('should return formatted response for successful API call', async () => {
      const mockResponse = {
        items: [
          {
            contract_status: 0,
            device_uid: 'dev-001',
            last_received_time: 111111,
            gps_time: 222222,
            latitude: 35.0,
            longitude: 139.0,
            speed: 60,
            direction: 90,
            state: { code: 'OK', type: 'NONE', label: 'Normal', color: '#000' },
            route_prediction: 'ON_ROUTE',
            estimated_duration: 0,
            destination: null,
            stop_status: 'DRIVE' as const,
            stop_duration: 0,
            alcohol_check: { status: 'DISABLED' as const },
          },
        ],
      };

      vi.mocked(getDeviceSnapshots).mockResolvedValue(mockResponse);

      const result = await registration.handler({ deviceUids: 'dev-001' });

      expect(getDeviceSnapshots).toHaveBeenCalledWith(mockClient, { device_uid: 'dev-001' });
      expect(result.content[0].text).toBe(
        `Raw API Response:\n\n${JSON.stringify(mockResponse, null, 2)}`,
      );
    });

    it('should return empty response when no realtime data found', async () => {
      const mockResponse = { items: [] };
      vi.mocked(getDeviceSnapshots).mockResolvedValue(mockResponse);

      const result = await registration.handler({ deviceUids: 'dev-001' });
      expect(result.content[0].text).toBe('API call successful but no realtime data found.');
    });

    it('should return empty response when items undefined', async () => {
      const mockResponse = {} as any;
      vi.mocked(getDeviceSnapshots).mockResolvedValue(mockResponse);

      const result = await registration.handler({ deviceUids: 'dev-001' });
      expect(result.content[0].text).toBe('API call successful but no realtime data found.');
    });

    it('should return error response on failure', async () => {
      const errorMessage = 'Network error';
      vi.mocked(getDeviceSnapshots).mockRejectedValue(new Error(errorMessage));

      const result = await registration.handler({ deviceUids: 'dev-001' });
      expect(result.content[0].text).toBe(`Failed to retrieve data: ${errorMessage}`);
    });

    it('should handle unknown error', async () => {
      vi.mocked(getDeviceSnapshots).mockRejectedValue('string error');

      const result = await registration.handler({ deviceUids: 'dev-001' });
      expect(result.content[0].text).toBe('Failed to retrieve data: Unknown error');
    });
  });

  describe('configuration', () => {
    it('should have correct tool name', () => {
      expect(registration.name).toBe('get_realtime');
    });

    it('should have correct title and description', () => {
      expect(registration.config.title).toBe('Get Realtime / リアルタイム情報取得');
      expect(registration.config.description).toBe(
        'Retrieves real-time information for the specified driver or vehicle. / 指定したドライバーまたは車両のリアルタイム情報を取得します。',
      );
    });
  });
});
