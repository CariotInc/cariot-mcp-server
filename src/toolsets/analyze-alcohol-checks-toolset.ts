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
}

interface AnalysisSummary {
  total_reports: number;
  reports_with_checks: number;
  reports_without_checks: number;
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
        };
      });

      const reportsWithChecks = checks.filter((c) => c.check_status !== 'none').length;
      const totalViolations = checks.filter((c) => c.has_violation).length;

      const summary: AnalysisSummary = {
        total_reports: reports.length,
        reports_with_checks: reportsWithChecks,
        reports_without_checks: reports.length - reportsWithChecks,
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
      'Analyzes alcohol check results from daily reports. Shows check status (before/middle/after), violations, and compliance statistics for drivers within a specified date range.',
    descriptionJa:
      '日報からアルコールチェック結果を分析します。指定された日付範囲内のドライバーのチェック状況（前/中/後）、違反、およびコンプライアンス統計を表示します。',
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
