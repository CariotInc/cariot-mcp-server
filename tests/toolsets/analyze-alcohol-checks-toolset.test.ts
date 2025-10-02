import { AxiosInstance } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CariotApiAuthProvider } from '../../src/lib/auth-provider.js';
import { formatConfig } from '../../src/toolsets/base-toolset.js';
import { analyzeAlcoholChecksTool } from '../../src/toolsets/analyze-alcohol-checks-toolset.js';
import { createMockAuthProvider, createMockAxiosClient } from '../helpers/mock-factories.js';

vi.mock('../../src/api/get-daily-reports.js', () => ({
  getDailyReports: vi.fn(),
}));

import { getDailyReports } from '../../src/api/get-daily-reports.js';

describe('AnalyzeAlcoholChecksToolset', () => {
  let registration: {
    name: string;
    config: ReturnType<typeof formatConfig>;
    handler: ReturnType<typeof analyzeAlcoholChecksTool.handler>;
  };
  let mockAuthProvider: CariotApiAuthProvider;
  let mockClient: AxiosInstance;

  beforeEach(() => {
    mockAuthProvider = createMockAuthProvider();
    mockClient = createMockAxiosClient();
    registration = {
      name: analyzeAlcoholChecksTool.name,
      config: formatConfig(analyzeAlcoholChecksTool.config),
      handler: analyzeAlcoholChecksTool.handler(mockAuthProvider),
    };
    vi.mocked(mockAuthProvider.getAuthedClient).mockReturnValue(mockClient);
    vi.clearAllMocks();
  });

  describe('handler', () => {
    it('should return formatted response with alcohol check analysis', async () => {
      const mockResponse = {
        items: [
          {
            daily_report_no: 'DR001',
            driver_id: 'D001',
            driver_name: 'Test Driver',
            department: 'Dept A',
            business_office: 'Office A',
            date: '2024-01-01',
            distance: 100,
            duration: 3600,
            vehicles: 'V001',
            start_address: 'Start Address',
            started_at: 1704067200,
            end_address: 'End Address',
            ended_at: 1704124800,
            alcohol_checks: {
              before_check_datetime: 1704067100,
              before_check_on_alcohol: false,
              after_check_datetime: 1704124900,
              after_check_on_alcohol: false,
            },
          },
          {
            daily_report_no: 'DR002',
            driver_id: 'D002',
            driver_name: 'Test Driver 2',
            department: 'Dept B',
            business_office: 'Office B',
            date: '2024-01-02',
            distance: 150,
            duration: 7200,
            vehicles: 'V002',
            start_address: 'Start Address 2',
            started_at: 1704153600,
            end_address: 'End Address 2',
            ended_at: 1704211200,
            alcohol_checks: {
              before_check_datetime: 1704153500,
              before_check_on_alcohol: true,
              after_check_datetime: 1704211300,
              after_check_on_alcohol: false,
            },
          },
        ],
      };

      vi.mocked(getDailyReports).mockResolvedValue(mockResponse);

      const result = await registration.handler({
        dateFrom: '2024-01-01',
        dateTo: '2024-01-02',
      });

      expect(getDailyReports).toHaveBeenCalledWith(mockClient, {
        driver_name: undefined,
        date_from: '2024-01-01',
        date_to: '2024-01-02',
        limit: undefined,
      });

      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;
      expect(text).toContain('total_reports');
      expect(text).toContain('reports_with_checks');
      expect(text).toContain('total_violations');
      expect(text).toContain('violation_rate');
      expect(text).toContain('DR001');
      expect(text).toContain('DR002');
    });

    it('should return analysis with complete check status', async () => {
      const mockResponse = {
        items: [
          {
            daily_report_no: 'DR001',
            driver_id: 'D001',
            driver_name: 'Test Driver',
            department: 'Dept A',
            business_office: 'Office A',
            date: '2024-01-01',
            distance: 100,
            duration: 3600,
            vehicles: 'V001',
            start_address: 'Start Address',
            started_at: 1704067200,
            end_address: 'End Address',
            ended_at: 1704124800,
            alcohol_checks: {
              before_check_datetime: 1704067100,
              before_check_on_alcohol: false,
              after_check_datetime: 1704124900,
              after_check_on_alcohol: false,
            },
          },
        ],
      };

      vi.mocked(getDailyReports).mockResolvedValue(mockResponse);

      const result = await registration.handler({});

      const text = result.content[0].text;
      const parsed = JSON.parse(text.replace('Raw API Response:\n\n', ''));
      expect(parsed.checks[0].check_status).toBe('complete');
      expect(parsed.checks[0].has_violation).toBe(false);
    });

    it('should return analysis with incomplete check status', async () => {
      const mockResponse = {
        items: [
          {
            daily_report_no: 'DR001',
            driver_id: 'D001',
            driver_name: 'Test Driver',
            department: 'Dept A',
            business_office: 'Office A',
            date: '2024-01-01',
            distance: 100,
            duration: 3600,
            vehicles: 'V001',
            start_address: 'Start Address',
            started_at: 1704067200,
            end_address: 'End Address',
            ended_at: 1704124800,
            alcohol_checks: {
              before_check_datetime: 1704067100,
              before_check_on_alcohol: false,
            },
          },
        ],
      };

      vi.mocked(getDailyReports).mockResolvedValue(mockResponse);

      const result = await registration.handler({});

      const text = result.content[0].text;
      const parsed = JSON.parse(text.replace('Raw API Response:\n\n', ''));
      expect(parsed.checks[0].check_status).toBe('incomplete');
    });

    it('should return analysis with no check status', async () => {
      const mockResponse = {
        items: [
          {
            daily_report_no: 'DR001',
            driver_id: 'D001',
            driver_name: 'Test Driver',
            department: 'Dept A',
            business_office: 'Office A',
            date: '2024-01-01',
            distance: 100,
            duration: 3600,
            vehicles: 'V001',
            start_address: 'Start Address',
            started_at: 1704067200,
            end_address: 'End Address',
            ended_at: 1704124800,
          },
        ],
      };

      vi.mocked(getDailyReports).mockResolvedValue(mockResponse);

      const result = await registration.handler({});

      const text = result.content[0].text;
      const parsed = JSON.parse(text.replace('Raw API Response:\n\n', ''));
      expect(parsed.checks[0].check_status).toBe('none');
      expect(parsed.reports_without_checks).toBe(1);
    });

    it('should detect violations when on_alcohol is true', async () => {
      const mockResponse = {
        items: [
          {
            daily_report_no: 'DR001',
            driver_id: 'D001',
            driver_name: 'Test Driver',
            department: 'Dept A',
            business_office: 'Office A',
            date: '2024-01-01',
            distance: 100,
            duration: 3600,
            vehicles: 'V001',
            start_address: 'Start Address',
            started_at: 1704067200,
            end_address: 'End Address',
            ended_at: 1704124800,
            alcohol_checks: {
              before_check_datetime: 1704067100,
              before_check_on_alcohol: true,
              after_check_datetime: 1704124900,
              after_check_on_alcohol: false,
            },
          },
        ],
      };

      vi.mocked(getDailyReports).mockResolvedValue(mockResponse);

      const result = await registration.handler({});

      const text = result.content[0].text;
      const parsed = JSON.parse(text.replace('Raw API Response:\n\n', ''));
      expect(parsed.checks[0].has_violation).toBe(true);
      expect(parsed.total_violations).toBe(1);
    });

    it('should return empty response when no reports found', async () => {
      const mockResponse = {
        items: [],
      };

      vi.mocked(getDailyReports).mockResolvedValue(mockResponse);

      const result = await registration.handler({});

      expect(result.content[0].text).toBe('API call successful but no daily reports found.');
    });

    it('should return error response on API failure', async () => {
      const error = new Error('API Error');
      vi.mocked(getDailyReports).mockRejectedValue(error);

      const result = await registration.handler({});

      expect(result.content[0].text).toBe('Failed to retrieve data: API Error');
    });
  });

  describe('configuration', () => {
    it('should have correct tool name', () => {
      expect(registration.name).toBe('analyze_alcohol_checks');
    });

    it('should have correct title and description', () => {
      expect(registration.config.title).toBe('Analyze Alcohol Checks / アルコールチェック分析');
      expect(registration.config.description).toBe(
        'Analyzes alcohol check results from daily reports. Shows check status (before/middle/after), violations, and compliance statistics for drivers within a specified date range. / 日報からアルコールチェック結果を分析します。指定された日付範囲内のドライバーのチェック状況（前/中/後）、違反、およびコンプライアンス統計を表示します。',
      );
    });
  });
});
