import { AxiosInstance } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CariotApiAuthProvider } from '../../src/lib/auth-provider.js';
import { formatConfig } from '../../src/toolsets/base-toolset.js';
import { generateChartConfigTool } from '../../src/toolsets/generate-chart-config-toolset.js';
import { createMockAuthProvider, createMockAxiosClient } from '../helpers/mock-factories.js';

describe('GenerateChartConfigToolset', () => {
  let registration: {
    name: string;
    config: ReturnType<typeof formatConfig>;
    handler: ReturnType<typeof generateChartConfigTool.handler>;
  };
  let mockAuthProvider: CariotApiAuthProvider;
  let mockClient: AxiosInstance;

  beforeEach(() => {
    mockAuthProvider = createMockAuthProvider();
    mockClient = createMockAxiosClient();
    registration = {
      name: generateChartConfigTool.name,
      config: formatConfig(generateChartConfigTool.config),
      handler: generateChartConfigTool.handler(mockAuthProvider),
    };
    vi.mocked(mockAuthProvider.getAuthedClient).mockReturnValue(mockClient);
    vi.clearAllMocks();
  });

  describe('handler', () => {
    it('should generate valid bar chart configuration', async () => {
      const params = {
        chartType: 'bar',
        labels: ['January', 'February', 'March'],
        datasets: [
          {
            label: 'Sales',
            data: [100, 200, 150],
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
        ],
        title: 'Monthly Sales',
        xAxisLabel: 'Month',
        yAxisLabel: 'Sales Amount',
      };

      const result = await registration.handler(params);
      const responseData = JSON.parse(result.content[0].text as string);

      expect(responseData.chartData.type).toBe('bar');
      expect(responseData.chartData.data.labels).toEqual(['February', 'March', 'January']);
      expect(responseData.chartData.data.datasets).toHaveLength(1);
      expect(responseData.chartData.data.datasets[0].data).toEqual([200, 150, 100]);
      expect(responseData.chartData.options?.plugins?.title?.text).toBe('Monthly Sales');
      expect(responseData.chartData.options?.scales?.x?.title?.text).toBe('Month');
      expect(responseData.chartData.options?.scales?.y?.title?.text).toBe('Sales Amount');
    });

    it('should generate valid line chart configuration', async () => {
      const params = {
        chartType: 'line',
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [
          {
            label: 'Revenue',
            data: [1000, 1200, 1100, 1300],
          },
        ],
      };

      const result = await registration.handler(params);
      const responseData = JSON.parse(result.content[0].text as string);

      expect(responseData.chartData.type).toBe('line');
      expect(responseData.chartData.data.labels).toEqual(['Q4', 'Q2', 'Q3', 'Q1']);
      expect(responseData.chartData.data.datasets[0].data).toEqual([1300, 1200, 1100, 1000]);
    });

    it('should generate valid pie chart configuration', async () => {
      const params = {
        chartType: 'pie',
        labels: ['Red', 'Blue', 'Yellow'],
        datasets: [
          {
            data: [300, 50, 100],
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
          },
        ],
        title: 'Color Distribution',
      };

      const result = await registration.handler(params);
      const responseData = JSON.parse(result.content[0].text as string);

      expect(responseData.chartData.type).toBe('pie');
      expect(responseData.chartData.data.labels).toEqual(['Red', 'Yellow', 'Blue']);
      expect(responseData.chartData.data.datasets[0].data).toEqual([300, 100, 50]);
      expect(responseData.chartData.options?.plugins?.title?.text).toBe('Color Distribution');
      expect(responseData.chartData.options?.scales).toBeUndefined();
    });

    it('should generate valid doughnut chart configuration', async () => {
      const params = {
        chartType: 'doughnut',
        labels: ['A', 'B', 'C'],
        datasets: [
          {
            label: 'Distribution',
            data: [30, 40, 30],
          },
        ],
      };

      const result = await registration.handler(params);
      const responseData = JSON.parse(result.content[0].text as string);

      expect(responseData.chartData.type).toBe('doughnut');
      expect(responseData.chartData.data.labels).toEqual(['B', 'A', 'C']);
    });

    it('should generate valid radar chart configuration', async () => {
      const params = {
        chartType: 'radar',
        labels: ['Speed', 'Reliability', 'Comfort', 'Safety'],
        datasets: [
          {
            label: 'Vehicle A',
            data: [20, 10, 15, 18],
          },
        ],
        title: 'Vehicle Comparison',
      };

      const result = await registration.handler(params);
      const responseData = JSON.parse(result.content[0].text as string);

      expect(responseData.chartData.type).toBe('radar');
      expect(responseData.chartData.data.labels).toEqual([
        'Speed',
        'Safety',
        'Comfort',
        'Reliability',
      ]);
      expect(responseData.chartData.options?.scales).toBeDefined();
    });

    it('should generate valid polarArea chart configuration', async () => {
      const params = {
        chartType: 'polarArea',
        labels: ['Category 1', 'Category 2', 'Category 3'],
        datasets: [
          {
            data: [11, 16, 7],
            backgroundColor: ['#FF6384', '#4BC0C0', '#FFCE56'],
          },
        ],
      };

      const result = await registration.handler(params);
      const responseData = JSON.parse(result.content[0].text as string);

      expect(responseData.chartData.type).toBe('polarArea');
      expect(responseData.chartData.data.labels).toEqual([
        'Category 2',
        'Category 1',
        'Category 3',
      ]);
    });

    it('should handle multiple datasets', async () => {
      const params = {
        chartType: 'bar',
        labels: ['2021', '2022', '2023'],
        datasets: [
          {
            label: 'Product A',
            data: [100, 120, 140],
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
          },
          {
            label: 'Product B',
            data: [80, 90, 110],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
          },
        ],
        title: 'Product Sales',
      };

      const result = await registration.handler(params);
      const responseData = JSON.parse(result.content[0].text as string);

      expect(responseData.chartData.data.datasets).toHaveLength(2);
      expect(responseData.chartData.data.datasets[0].label).toBe('Product A');
      expect(responseData.chartData.data.datasets[1].label).toBe('Product B');
    });

    it('should return error for invalid chart type', async () => {
      const params = {
        chartType: 'invalid',
        labels: ['A', 'B'],
        datasets: [{ data: [1, 2] }],
      };

      const result = await registration.handler(params);

      expect(result.content[0].text).toContain('Failed to retrieve data');
      expect(result.content[0].text).toContain('Invalid chart type');
    });

    it('should return error when data length does not match labels length', async () => {
      const params = {
        chartType: 'bar',
        labels: ['A', 'B', 'C'],
        datasets: [
          {
            label: 'Dataset',
            data: [1, 2], // Only 2 values but 3 labels
          },
        ],
      };

      const result = await registration.handler(params);

      expect(result.content[0].text).toContain('Failed to retrieve data');
      expect(result.content[0].text).toContain('Data length must match labels length');
    });

    it('should handle optional parameters', async () => {
      const params = {
        chartType: 'line',
        labels: ['A', 'B'],
        datasets: [
          {
            data: [10, 20],
          },
        ],
      };

      const result = await registration.handler(params);
      const responseData = JSON.parse(result.content[0].text as string);

      expect(responseData.chartData.type).toBe('line');
      expect(responseData.chartData.data.datasets[0].label).toBe('');
      expect(responseData.chartData.options?.plugins?.title?.display).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should have correct tool name', () => {
      expect(registration.name).toBe('generate_chart_config');
    });

    it('should have correct title and description', () => {
      expect(registration.config.title).toBe(
        'Generate Chart.js Configuration / Chart.js設定データ生成',
      );
      expect(registration.config.description).toContain('Chart.js configuration');
      expect(registration.config.description).toContain('Chart.js設定データ');
    });
  });
});
