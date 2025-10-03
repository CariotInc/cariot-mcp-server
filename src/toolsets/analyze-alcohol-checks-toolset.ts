import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getDailyReports } from '../api/get-daily-reports.js';
import { DailyReportsQuery } from '../api/types/get-daily-reports.js';
import { CariotApiAuthProvider } from '../lib/auth-provider.js';
import {
  ToolHandler,
  formatEmptyResponse,
  formatEnJaWithSlash,
  formatErrorResponse,
  formatSuccessResponse,
} from './base-toolset.js';

interface AlcoholChecksParams {
  driverName?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

interface AlcoholCheckAnalysis {
  driver_id: string;
  driver_name: string;
  date: string;
  daily_report_no: string;
  before_check?: {
    datetime: number | null;
    on_alcohol: boolean | null;
  };
  middle_check?: {
    datetime: number | null;
    on_alcohol: boolean | null;
  };
  after_check?: {
    datetime: number | null;
    on_alcohol: boolean | null;
  };
  has_violation: boolean;
  check_status: 'complete' | 'incomplete' | 'none';
  is_implemented: boolean;
  has_driving: boolean;
}

interface AnalysisSummary {
  total_reports: number;
  reports_with_checks: number;
  reports_without_checks: number;
  reports_with_driving: number;
  reports_implemented: number;
  implementation_rate: string;
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

      // Analyze alcohol checks
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const checks: AlcoholCheckAnalysis[] = reports.map((report) => {
        const alcoholChecks = report.alcohol_checks;
        
        const beforeCheck = alcoholChecks?.before_check_datetime
          ? {
              datetime: alcoholChecks.before_check_datetime,
              on_alcohol: alcoholChecks.before_check_on_alcohol ?? null,
            }
          : undefined;

        const middleCheck = alcoholChecks?.middle_check_datetime
          ? {
              datetime: alcoholChecks.middle_check_datetime,
              on_alcohol: alcoholChecks.middle_check_on_alcohol ?? null,
            }
          : undefined;

        const afterCheck = alcoholChecks?.after_check_datetime
          ? {
              datetime: alcoholChecks.after_check_datetime,
              on_alcohol: alcoholChecks.after_check_on_alcohol ?? null,
            }
          : undefined;

        const hasViolation = !!(
          beforeCheck?.on_alcohol ||
          middleCheck?.on_alcohol ||
          afterCheck?.on_alcohol
        );

        let checkStatus: 'complete' | 'incomplete' | 'none' = 'none';
        if (beforeCheck || middleCheck || afterCheck) {
          checkStatus = beforeCheck && afterCheck ? 'complete' : 'incomplete';
        }

        // Determine if there was driving activity
        const hasDriving = report.distance > 0 || report.duration > 0;

        // Determine if checks are properly implemented
        // Implementation definition:
        // - When driving, both before-ride and after-ride checks should be performed
        // - For past dates: If driving occurred and either before or after check is missing, it's not implemented
        // - For current date: If driving occurred and before check is missing, it's not implemented
        //   (we can't determine if after check is missing because driver might still be driving)
        let isImplemented = false;
        if (hasDriving) {
          const isToday = report.date === todayStr;
          if (isToday) {
            // For today, only require before check
            isImplemented = !!beforeCheck;
          } else {
            // For past dates, require both before and after checks
            isImplemented = !!(beforeCheck && afterCheck);
          }
        } else {
          // No driving, so implementation check doesn't apply
          isImplemented = true;
        }

        return {
          driver_id: report.driver_id,
          driver_name: report.driver_name,
          date: report.date,
          daily_report_no: report.daily_report_no,
          before_check: beforeCheck,
          middle_check: middleCheck,
          after_check: afterCheck,
          has_violation: hasViolation,
          check_status: checkStatus,
          is_implemented: isImplemented,
          has_driving: hasDriving,
        };
      });

      const reportsWithChecks = checks.filter((c) => c.check_status !== 'none').length;
      const reportsWithDriving = checks.filter((c) => c.has_driving).length;
      const reportsImplemented = checks.filter((c) => c.is_implemented && c.has_driving).length;
      const totalViolations = checks.filter((c) => c.has_violation).length;

      const summary: AnalysisSummary = {
        total_reports: reports.length,
        reports_with_checks: reportsWithChecks,
        reports_without_checks: reports.length - reportsWithChecks,
        reports_with_driving: reportsWithDriving,
        reports_implemented: reportsImplemented,
        implementation_rate:
          reportsWithDriving > 0
            ? `${((reportsImplemented / reportsWithDriving) * 100).toFixed(1)}%`
            : 'N/A',
        total_violations: totalViolations,
        violation_rate:
          reportsWithChecks > 0
            ? `${((totalViolations / reportsWithChecks) * 100).toFixed(1)}%`
            : 'N/A',
        checks,
      };

      return formatSuccessResponse(summary);
    } catch (error) {
      return formatErrorResponse(error);
    }
  };
};

export const analyzeAlcoholChecksTool = {
  name: 'analyze_alcohol_checks',
  config: {
    titleEn: 'Analyze Alcohol Checks',
    titleJa: 'アルコールチェック分析',
    descriptionEn:
      'Analyzes alcohol check results from daily reports. Shows check status (before/middle/after), violations, implementation rate, and compliance statistics for drivers within a specified date range. Implementation rate is calculated based on whether both before and after checks are performed when driving (for past dates) or at least before check is performed (for current date).',
    descriptionJa:
      '日報からアルコールチェック結果を分析します。指定された日付範囲内のドライバーのチェック状況（前/中/後）、違反、実施率、およびコンプライアンス統計を表示します。実施率は、運転時に乗車前と乗車後の両方のチェックが実施されているか（前日以前）、または少なくとも乗車前チェックが実施されているか（当日）に基づいて計算されます。',
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
