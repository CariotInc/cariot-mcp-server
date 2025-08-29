import { AxiosInstance } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CariotApiAuthProvider } from '../../src/lib/auth-provider.js';
import { formatConfig } from '../../src/toolsets/base-toolset.js';
import { dailyReportTool } from '../../src/toolsets/get-daily-report-toolset.js';
import { createMockAuthProvider, createMockAxiosClient } from '../helpers/mock-factories.js';

vi.mock('../../src/api/get-daily-report.js', () => ({
  getDailyReport: vi.fn(),
}));

import { getDailyReport } from '../../src/api/get-daily-report.js';

describe('GetDailyReportToolset', () => {
  let registration: {
    name: string;
    config: ReturnType<typeof formatConfig>;
    handler: ReturnType<typeof dailyReportTool.handler>;
  };
  let mockAuthProvider: CariotApiAuthProvider;
  let mockClient: AxiosInstance;

  beforeEach(() => {
    mockAuthProvider = createMockAuthProvider();
    mockClient = createMockAxiosClient();
    registration = {
      name: dailyReportTool.name,
      config: formatConfig(dailyReportTool.config),
      handler: dailyReportTool.handler(mockAuthProvider),
    };
    vi.mocked(mockAuthProvider.getAuthedClient).mockReturnValue(mockClient);
    vi.clearAllMocks();
  });

  describe('handler', () => {
    it('should return formatted response for successful API call', async () => {
      const mockResponse = {
        date: '2024-01-01',
        clocked_in_at: 1704067200,
        clocked_out_at: 1704124800,
        distance: 150,
        duration: 7200,
        vehicles: [],
        fields: [],
        rides: [],
        accel_events: [],
      };

      vi.mocked(getDailyReport).mockResolvedValue(mockResponse);

      const result = await registration.handler({
        dailyReportNo: 'DR123',
      });

      expect(getDailyReport).toHaveBeenCalledWith(mockClient, {
        daily_report_no: 'DR123',
      });

      expect(result.content[0].text).toBe(
        `Raw API Response:\n\n${JSON.stringify(mockResponse, null, 2)}`,
      );
    });

    it('should return error response when API call fails', async () => {
      const errorMessage = 'Report not found';
      vi.mocked(getDailyReport).mockRejectedValue(new Error(errorMessage));

      const result = await registration.handler({
        dailyReportNo: 'INVALID',
      });

      expect(result.content[0].text).toBe(`Failed to retrieve data: ${errorMessage}`);
    });

    it('should handle unknown error types', async () => {
      vi.mocked(getDailyReport).mockRejectedValue('Network error');

      const result = await registration.handler({
        dailyReportNo: 'DR123',
      });

      expect(result.content[0].text).toBe('Failed to retrieve data: Unknown error');
    });

    it('should exclude metrics from each ride in the response', async () => {
      const mockResponse = {
        date: '2024-01-01',
        clocked_in_at: 1704067200,
        clocked_out_at: 1704124800,
        distance: 150,
        duration: 7200,
        vehicles: [],
        fields: [],
        rides: [
          {
            started_at: 1,
            ended_at: 2,
            device_uid: 'u1',
            vehicle_id: 'v1',
            vehicle_name: 'car',
            start_address: 'A',
            end_address: 'B',
            activities: [],
            geo_events: [],
            parking_events: [],
            metrics: {
              timestamp: [1, 2],
              latitude: [0, 0],
              longitude: [0, 0],
              speed: [10, 20],
              direction: [0, 0],
            },
          },
        ],
        accel_events: [],
      };

      vi.mocked(getDailyReport).mockResolvedValue(mockResponse);

      const result = await registration.handler({
        dailyReportNo: 'DR123',
      });

      const text = result.content[0].text;
      expect(text).toContain('"rides"');
      expect(text).not.toContain('"metrics"');
    });
  });

  describe('configuration', () => {
    it('should have correct tool name', () => {
      expect(registration.name).toBe('get_daily_report');
    });

    it('should have correct title and description', () => {
      expect(registration.config.title).toBe('Get Daily Report / 運転報告詳細取得');
      expect(registration.config.description).toBe(
        'Retrieves a detailed daily report for a specific date and driver. / 指定された日付とドライバーの日報詳細を取得します。',
      );
    });
  });
});
