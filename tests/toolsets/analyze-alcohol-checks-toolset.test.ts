import { AxiosInstance } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CariotApiAuthProvider } from '../../src/lib/auth-provider.js';
import { analyzeAlcoholChecksTool } from '../../src/toolsets/analyze-alcohol-checks-toolset.js';
import { formatConfig } from '../../src/toolsets/base-toolset.js';
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
      expect(text).toContain('checked_reports');
      expect(text).toContain('check_rate');
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

      const text = (result.content[0] as { text: string }).text;
      const parsed = JSON.parse(text);
      expect(parsed.checks[0].has_checked).toBe(true);
      expect(parsed.checks[0].has_violation).toBe(false);
      expect(parsed.checks[0].has_driven).toBe(true);
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

      const text = (result.content[0] as { text: string }).text;
      const parsed = JSON.parse(text);
      expect(parsed.checks[0].has_checked).toBe(false);
      expect(parsed.checks[0].has_driven).toBe(true);
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

      const text = (result.content[0] as { text: string }).text;
      const parsed = JSON.parse(text);
      expect(parsed.checks[0].has_checked).toBe(false);
      expect(parsed.checks[0].has_driven).toBe(true);
      expect(parsed.checked_reports).toBe(0);
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

      const text = (result.content[0] as { text: string }).text;
      const parsed = JSON.parse(text);
      expect(parsed.checks[0].has_violation).toBe(true);
      expect(parsed.checks[0].has_driven).toBe(true);
      expect(parsed.total_violations).toBe(1);
    });

    it('should calculate check rate correctly for past dates', async () => {
      const mockResponse = {
        items: [
          {
            daily_report_no: 'DR001',
            driver_id: 'D001',
            driver_name: 'Test Driver',
            department: 'Dept A',
            business_office: 'Office A',
            date: '2024-01-01', // Past date
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
            date: '2024-01-02', // Past date
            distance: 150,
            duration: 7200,
            vehicles: 'V002',
            start_address: 'Start Address 2',
            started_at: 1704153600,
            end_address: 'End Address 2',
            ended_at: 1704211200,
            alcohol_checks: {
              before_check_datetime: 1704153500,
              before_check_on_alcohol: false,
              // Missing after check
            },
          },
        ],
      };

      vi.mocked(getDailyReports).mockResolvedValue(mockResponse);

      const result = await registration.handler({});

      const text = (result.content[0] as { text: string }).text;
      const parsed = JSON.parse(text);

      // Both reports have driving
      expect(parsed.total_reports).toBe(2);
      // Only first report has both checks
      expect(parsed.checked_reports).toBe(1);
      expect(parsed.check_rate).toBe('50%');

      // Check individual flags
      expect(parsed.checks[0].has_checked).toBe(true);
      expect(parsed.checks[0].has_driven).toBe(true);
      expect(parsed.checks[1].has_checked).toBe(false);
      expect(parsed.checks[1].has_driven).toBe(true);
    });

    it('should handle reports without driving activity', async () => {
      const mockResponse = {
        items: [
          {
            daily_report_no: 'DR001',
            driver_id: 'D001',
            driver_name: 'Test Driver',
            department: 'Dept A',
            business_office: 'Office A',
            date: '2024-01-01',
            distance: 0,
            duration: 0,
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

      const text = (result.content[0] as { text: string }).text;
      const parsed = JSON.parse(text);

      expect(parsed.total_reports).toBe(1);
      expect(parsed.check_rate).toBe('N/A');
      expect(parsed.checks[0].has_driven).toBe(false);
      expect(parsed.checks[0].has_checked).toBe(true);
    });

    it('should mark as not checked when only after check exists for past date', async () => {
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
              after_check_datetime: 1704124900,
              after_check_on_alcohol: false,
            },
          },
        ],
      };

      vi.mocked(getDailyReports).mockResolvedValue(mockResponse);

      const result = await registration.handler({});

      const text = (result.content[0] as { text: string }).text;
      const parsed = JSON.parse(text);

      expect(parsed.checks[0].has_checked).toBe(false);
      expect(parsed.checks[0].has_driven).toBe(true);
      expect(parsed.checked_reports).toBe(0);
      expect(parsed.check_rate).toBe('0%');
    });

    it('should mark as not checked when no checks exist for past date with driving', async () => {
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

      const text = (result.content[0] as { text: string }).text;
      const parsed = JSON.parse(text);

      expect(parsed.checks[0].has_checked).toBe(false);
      expect(parsed.checks[0].has_driven).toBe(true);
      expect(parsed.checked_reports).toBe(0);
      expect(parsed.check_rate).toBe('0%');
    });

    it('should mark as checked when before check exists for today', async () => {
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
      const mockResponse = {
        items: [
          {
            daily_report_no: 'DR001',
            driver_id: 'D001',
            driver_name: 'Test Driver',
            department: 'Dept A',
            business_office: 'Office A',
            date: today,
            distance: 100,
            duration: 3600,
            vehicles: 'V001',
            start_address: 'Start Address',
            started_at: Math.floor(Date.now() / 1000),
            end_address: 'End Address',
            ended_at: Math.floor(Date.now() / 1000) + 3600,
            alcohol_checks: {
              before_check_datetime: Math.floor(Date.now() / 1000) - 100,
              before_check_on_alcohol: false,
            },
          },
        ],
      };

      vi.mocked(getDailyReports).mockResolvedValue(mockResponse);

      const result = await registration.handler({});

      const text = (result.content[0] as { text: string }).text;
      const parsed = JSON.parse(text);

      expect(parsed.checks[0].has_checked).toBe(true);
      expect(parsed.checks[0].has_driven).toBe(true);
      expect(parsed.checked_reports).toBe(1);
      expect(parsed.check_rate).toBe('100%');
    });

    it('should mark as not checked when no before check exists for today', async () => {
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
      const mockResponse = {
        items: [
          {
            daily_report_no: 'DR001',
            driver_id: 'D001',
            driver_name: 'Test Driver',
            department: 'Dept A',
            business_office: 'Office A',
            date: today,
            distance: 100,
            duration: 3600,
            vehicles: 'V001',
            start_address: 'Start Address',
            started_at: Math.floor(Date.now() / 1000),
            end_address: 'End Address',
            ended_at: Math.floor(Date.now() / 1000) + 3600,
          },
        ],
      };

      vi.mocked(getDailyReports).mockResolvedValue(mockResponse);

      const result = await registration.handler({});

      const text = (result.content[0] as { text: string }).text;
      const parsed = JSON.parse(text);

      expect(parsed.checks[0].has_checked).toBe(false);
      expect(parsed.checks[0].has_driven).toBe(true);
      expect(parsed.checked_reports).toBe(0);
      expect(parsed.check_rate).toBe('0%');
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
      expect(registration.config.description).toContain('check rate');
      expect(registration.config.description).toContain('チェック率');
    });
  });
});
