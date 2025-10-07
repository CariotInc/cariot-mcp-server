import { AxiosInstance } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CariotApiAuthProvider } from '../../src/lib/auth-provider.js';
import { formatConfig } from '../../src/toolsets/base-toolset.js';
import { dailyReportsTool } from '../../src/toolsets/get-daily-reports-toolset.js';
import { createMockAuthProvider, createMockAxiosClient } from '../helpers/mock-factories.js';

vi.mock('../../src/api/get-daily-reports.js', () => ({
  getDailyReports: vi.fn(),
}));

import { getDailyReports } from '../../src/api/get-daily-reports.js';
import { GetDailyReportsListResponse } from '../../src/api/types/get-daily-reports.js';

describe('GetDailyReportsToolset', () => {
  let registration: {
    name: string;
    config: ReturnType<typeof formatConfig>;
    handler: ReturnType<typeof dailyReportsTool.handler>;
  };
  let mockAuthProvider: CariotApiAuthProvider;
  let mockClient: AxiosInstance;

  beforeEach(() => {
    mockAuthProvider = createMockAuthProvider();
    mockClient = createMockAxiosClient();
    registration = {
      name: dailyReportsTool.name,
      config: formatConfig(dailyReportsTool.config),
      handler: dailyReportsTool.handler(mockAuthProvider),
    };
    vi.mocked(mockAuthProvider.getAuthedClient).mockReturnValue(mockClient);
    vi.clearAllMocks();
  });
  describe('handler', () => {
    it('should return formatted response for successful API call', async () => {
      const mockResponse = {
        items: [
          {
            daily_report_no: '123',
            driver_id: 'driver001',
            driver_name: 'Test Driver',
            department: 'Transportation',
            business_office: 'Tokyo Office',
            date: '2024-01-01',
            distance: 100,
            duration: 3600,
            vehicles: 'Vehicle001',
            start_address: 'start',
            started_at: 1704067200000,
            end_address: 'end',
            ended_at: 1704070800000,
          },
        ],
      };

      vi.mocked(getDailyReports).mockResolvedValue(mockResponse);

      const result = await registration.handler({
        driverName: 'Test',
        limit: 10,
      });

      expect(getDailyReports).toHaveBeenCalledWith(mockClient, {
        driver_name: 'Test',
        limit: 10,
      });

      expect(result.content[0].text).toBe(JSON.stringify(mockResponse, null, 2));
    });

    it('should return empty response when no reports found', async () => {
      const mockResponse = { items: [] };
      vi.mocked(getDailyReports).mockResolvedValue(mockResponse);

      const result = await registration.handler({});

      expect(result.content[0].text).toBe('API call successful but no daily reports found.');
    });

    it('should return empty response when items is undefined', async () => {
      const mockResponse = {};
      vi.mocked(getDailyReports).mockResolvedValue(mockResponse as GetDailyReportsListResponse);

      const result = await registration.handler({});

      expect(result.content[0].text).toBe('API call successful but no daily reports found.');
    });

    it('should return error response when API call fails', async () => {
      const errorMessage = 'API Error';
      vi.mocked(getDailyReports).mockRejectedValue(new Error(errorMessage));

      const result = await registration.handler({});

      expect(result.content[0].text).toBe(`Failed to retrieve data: ${errorMessage}`);
    });

    it('should handle unknown error types', async () => {
      vi.mocked(getDailyReports).mockRejectedValue('String error');

      const result = await registration.handler({});

      expect(result.content[0].text).toBe('Failed to retrieve data: Unknown error');
    });
  });

  describe('configuration', () => {
    it('should have correct tool name', () => {
      expect(registration.name).toBe('get_daily_reports');
    });

    it('should have correct title and description', () => {
      expect(registration.config.title).toBe('Get Daily Reports / 運転報告一覧取得');
      expect(registration.config.description).toBe(
        'Retrieves a list of daily reports for all drivers within a specified date range. / 指定された日付範囲内の全ドライバーの日報をリストで取得します。',
      );
    });
  });
});
