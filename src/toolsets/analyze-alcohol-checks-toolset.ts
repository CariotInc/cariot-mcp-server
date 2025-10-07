import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getDailyReports } from '../api/get-daily-reports.js';
import { DailyReport, DailyReportsQuery } from '../api/types/get-daily-reports.js';
import { CariotApiAuthProvider } from '../lib/auth-provider.js';
import {
  ToolHandler,
  formatEmptyResponse,
  formatEnJaWithSlash,
  formatErrorResponse,
  formatSuccessResponse,
} from './base-toolset.js';

const NOT_APPLICABLE = 'N/A';
const PERCENTAGE_DECIMAL_PLACES = 0;

interface AlcoholChecksParams {
  driverName?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

interface AlcoholCheck {
  datetime: number;
  on_alcohol: boolean;
}

interface AlcoholCheckAnalysis {
  driver_id: string;
  driver_name: string;
  date: string;
  daily_report_no: string;
  before_check?: AlcoholCheck;
  middle_check?: AlcoholCheck;
  after_check?: AlcoholCheck;
  has_violation: boolean;
  has_checked: boolean;
  has_driven: boolean;
}

interface AnalysisSummary {
  total_reports: number;
  checked_reports: number;
  check_rate: string;
  total_violations: number;
  violation_rate: string;
  checks: AlcoholCheckAnalysis[];
}

const handler = (authProvider: CariotApiAuthProvider): ToolHandler => {
  return async (params: unknown): Promise<CallToolResult> => {
    const typedParams = params as AlcoholChecksParams;
    const queryParams: DailyReportsQuery = {
      driver_name: typedParams.driverName,
      date_from: typedParams.dateFrom,
      date_to: typedParams.dateTo,
      limit: typedParams.limit,
    };

    try {
      const client = authProvider.getAuthedClient();
      const response = await getDailyReports(client, queryParams);

      const reports = response.items || [];
      if (reports.length === 0) {
        return formatEmptyResponse('API call successful but no daily reports found.');
      }

      const checks = reports.map((report) => analyzeReport(report, getTodayDateString()));

      return formatSuccessResponse(createAnalysisSummary(reports, checks));
    } catch (error) {
      return formatErrorResponse(error);
    }
  };
};

const getTodayDateString = (): string => {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
};

const hasViolation = (
  beforeCheck?: AlcoholCheck,
  middleCheck?: AlcoholCheck,
  afterCheck?: AlcoholCheck,
): boolean => {
  return !!(beforeCheck?.on_alcohol || middleCheck?.on_alcohol || afterCheck?.on_alcohol);
};

const hasDriven = (distance: number, duration: number): boolean => {
  return distance > 0 || duration > 0;
};

const hasChecked = (
  driven: boolean,
  beforeCheck: AlcoholCheck | undefined,
  afterCheck: AlcoholCheck | undefined,
  reportDate: string,
  today: string,
): boolean => {
  if (!driven) {
    // If not driven, consider as checked
    return true;
  }

  const isToday = reportDate === today;
  if (isToday) {
    // For today, only before check is required
    return !!beforeCheck;
  }

  // For past dates, both before and after checks are required
  return !!(beforeCheck && afterCheck);
};

const analyzeReport = (report: DailyReport, today: string): AlcoholCheckAnalysis => {
  const alcoholChecks = report.alcohol_checks;

  const beforeCheck =
    alcoholChecks?.before_check_datetime !== undefined &&
    alcoholChecks?.before_check_on_alcohol !== undefined
      ? {
          datetime: alcoholChecks.before_check_datetime,
          on_alcohol: alcoholChecks.before_check_on_alcohol,
        }
      : undefined;

  const middleCheck =
    alcoholChecks?.middle_check_datetime !== undefined &&
    alcoholChecks?.middle_check_on_alcohol !== undefined
      ? {
          datetime: alcoholChecks.middle_check_datetime,
          on_alcohol: alcoholChecks.middle_check_on_alcohol,
        }
      : undefined;

  const afterCheck =
    alcoholChecks?.after_check_datetime !== undefined &&
    alcoholChecks?.after_check_on_alcohol !== undefined
      ? {
          datetime: alcoholChecks.after_check_datetime,
          on_alcohol: alcoholChecks.after_check_on_alcohol,
        }
      : undefined;

  const driven = hasDriven(report.distance, report.duration);

  return {
    driver_id: report.driver_id,
    driver_name: report.driver_name,
    date: report.date,
    daily_report_no: report.daily_report_no,
    before_check: beforeCheck,
    middle_check: middleCheck,
    after_check: afterCheck,
    has_violation: hasViolation(beforeCheck, middleCheck, afterCheck),
    has_checked: hasChecked(driven, beforeCheck, afterCheck, report.date, today),
    has_driven: driven,
  };
};

const calculatePercentage = (numerator: number, denominator: number): string => {
  if (denominator === 0) {
    return NOT_APPLICABLE;
  }
  return `${((numerator / denominator) * 100).toFixed(PERCENTAGE_DECIMAL_PLACES)}%`;
};

const createAnalysisSummary = (
  reports: DailyReport[],
  checks: AlcoholCheckAnalysis[],
): AnalysisSummary => {
  const drivenReports = checks.filter((c) => c.has_driven).length;
  const checkedReports = checks.filter((c) => c.has_checked).length;
  const totalViolations = checks.filter((c) => c.has_violation).length;

  return {
    total_reports: reports.length,
    checked_reports: checkedReports,
    check_rate: calculatePercentage(checkedReports, drivenReports),
    total_violations: totalViolations,
    violation_rate: calculatePercentage(totalViolations, checkedReports),
    checks,
  };
};

export const analyzeAlcoholChecksTool = {
  name: 'analyze_alcohol_checks',
  config: {
    titleEn: 'Analyze Alcohol Checks',
    titleJa: 'アルコールチェック分析',
    descriptionEn:
      'Analyzes alcohol check results from daily reports. Shows check status (before/middle/after), violations, check rate, and check statistics for drivers within a specified date range. Check rate is calculated based on whether both before and after checks are performed when driving (for past dates) or at least before check is performed (for current date).',
    descriptionJa:
      '日報からアルコールチェック結果を分析します。指定された日付範囲内のドライバーのチェック状況(前/中/後)、違反、チェック率、およびチェック統計を表示します。チェック率は、運転時に乗車前と乗車後の両方のチェックが実施されているか(前日以前)、または少なくとも乗車前チェックが実施されているか(当日)に基づいて計算されます。',
    inputSchema: {
      driverName: z
        .string()
        .optional()
        .describe(
          formatEnJaWithSlash(
            'Driver name (partial match, put a space between family and given name)',
            'ドライバー名（部分一致。姓と名の間に必ずスペースを入れてください）',
          ),
        ),
      dateFrom: z
        .string()
        .optional()
        .describe(formatEnJaWithSlash('Start date (yyyy-MM-dd)', '開始日 (yyyy-MM-dd)')),
      dateTo: z
        .string()
        .optional()
        .describe(formatEnJaWithSlash('End date (yyyy-MM-dd)', '終了日 (yyyy-MM-dd)')),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe(
          formatEnJaWithSlash(
            'Number of results to retrieve (default: 20, max: 100)',
            '取得件数 (デフォルト:20, 最大:100)',
          ),
        ),
    },
  },
  handler,
};
