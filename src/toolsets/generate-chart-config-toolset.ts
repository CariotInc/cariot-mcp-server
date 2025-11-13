import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ChartConfiguration } from 'chart.js';
import { z } from 'zod';
import { CariotApiAuthProvider } from '../lib/auth-provider.js';
import {
  ToolHandler,
  formatEnJaWithSlash,
  formatErrorResponse,
  formatSuccessResponse,
} from './base-toolset.js';

type SupportedChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polarArea';

interface ChartDataInput {
  chartType: SupportedChartType;
  labels: string[];
  datasets: Array<{
    label?: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handler = (_authProvider: CariotApiAuthProvider): ToolHandler => {
  return async (params: unknown): Promise<CallToolResult> => {
    try {
      const typedParams = params as ChartDataInput;
      
      // Validate chart type
      const validChartTypes: SupportedChartType[] = ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'];
      if (!validChartTypes.includes(typedParams.chartType)) {
        throw new Error(`Invalid chart type. Supported types: ${validChartTypes.join(', ')}`);
      }

      // Validate that labels and data match
      for (const dataset of typedParams.datasets) {
        if (dataset.data.length !== typedParams.labels.length) {
          throw new Error('Data length must match labels length for all datasets');
        }
      }

      // Generate Chart.js configuration
      const chartData: ChartConfiguration<SupportedChartType> = {
        type: typedParams.chartType,
        data: {
          labels: typedParams.labels,
          datasets: typedParams.datasets.map((dataset) => ({
            label: dataset.label || '',
            data: dataset.data,
            backgroundColor: dataset.backgroundColor,
            borderColor: dataset.borderColor,
            borderWidth: dataset.borderWidth,
          })),
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: true,
              position: 'top',
            },
            title: {
              display: !!typedParams.title,
              text: typedParams.title || '',
            },
          },
        },
      };

      // Add axis labels for charts that support them
      if (['bar', 'line', 'radar'].includes(typedParams.chartType)) {
        chartData.options = {
          ...chartData.options,
          scales: {
            x: {
              display: true,
              title: {
                display: !!typedParams.xAxisLabel,
                text: typedParams.xAxisLabel || '',
              },
            },
            y: {
              display: true,
              title: {
                display: !!typedParams.yAxisLabel,
                text: typedParams.yAxisLabel || '',
              },
            },
          },
        };
      }

      return formatSuccessResponse({ chartData });
    } catch (error) {
      return formatErrorResponse(error);
    }
  };
};

export const generateChartConfigTool = {
  name: 'generate_chart_config',
  config: {
    titleEn: 'Generate Chart.js Configuration',
    titleJa: 'Chart.js設定データ生成',
    descriptionEn:
      'Generates Chart.js configuration data based on input data. Supports bar, line, pie, doughnut, radar, and polarArea chart types. Returns a ChartConfiguration object that can be used directly with Chart.js. IMPORTANT: When using this tool, you MUST embed the generated object in your final response so that the client can use the data.',
    descriptionJa:
      '入力データに基づいてChart.js設定データを生成します。bar、line、pie、doughnut、radar、polarAreaのグラフタイプをサポートします。Chart.jsで直接使用できるChartConfigurationオブジェクトを返します。重要: このツールを使用する場合は、必ず最終的なレスポンスの中に生成されたオブジェクトを埋め込んでください。クライアントでそのデータを使用するためです。',
    inputSchema: {
      chartType: z
        .enum(['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'])
        .describe(
          formatEnJaWithSlash(
            'Chart type (bar, line, pie, doughnut, radar, polarArea)',
            'グラフタイプ（bar、line、pie、doughnut、radar、polarArea）',
          ),
        ),
      labels: z
        .array(z.string())
        .min(1)
        .describe(formatEnJaWithSlash('Array of labels for the chart', 'グラフのラベル配列')),
      datasets: z
        .array(
          z.object({
            label: z
              .string()
              .optional()
              .describe(formatEnJaWithSlash('Dataset label', 'データセットのラベル')),
            data: z
              .array(z.number())
              .min(1)
              .describe(formatEnJaWithSlash('Array of data values', 'データ値の配列')),
            backgroundColor: z
              .union([z.string(), z.array(z.string())])
              .optional()
              .describe(
                formatEnJaWithSlash('Background color(s) for the dataset', 'データセットの背景色'),
              ),
            borderColor: z
              .union([z.string(), z.array(z.string())])
              .optional()
              .describe(formatEnJaWithSlash('Border color(s) for the dataset', 'データセットの枠線色')),
            borderWidth: z
              .number()
              .optional()
              .describe(formatEnJaWithSlash('Border width for the dataset', 'データセットの枠線幅')),
          }),
        )
        .min(1)
        .describe(formatEnJaWithSlash('Array of datasets', 'データセット配列')),
      title: z
        .string()
        .optional()
        .describe(formatEnJaWithSlash('Chart title', 'グラフのタイトル')),
      xAxisLabel: z
        .string()
        .optional()
        .describe(
          formatEnJaWithSlash(
            'X-axis label (for bar, line, radar charts)',
            'X軸ラベル（bar、line、radarグラフ用）',
          ),
        ),
      yAxisLabel: z
        .string()
        .optional()
        .describe(
          formatEnJaWithSlash(
            'Y-axis label (for bar, line, radar charts)',
            'Y軸ラベル（bar、line、radarグラフ用）',
          ),
        ),
    },
  },
  handler,
};
