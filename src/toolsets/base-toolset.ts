import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ZodRawShape } from 'zod';

export interface ToolHandler {
  (params: unknown): Promise<CallToolResult>;
}

export const formatErrorResponse = (error: unknown): CallToolResult => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  return {
    content: [
      {
        type: 'text',
        text: `Failed to retrieve data: ${errorMessage}`,
      },
    ],
  };
};

export const formatSuccessResponse = (data: unknown): CallToolResult => {
  return {
    content: [
      {
        type: 'text',
        text: `Raw API Response:\n\n${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
};

export const formatEmptyResponse = (
  message: string = 'API call successful but no data found.',
): CallToolResult => {
  return {
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
  };
};

export const formatEnJaWithSlash = (en: string, ja: string): string => {
  return [en, ja].join(' / ');
};

export interface ConfigParams {
  titleEn: string;
  titleJa: string;
  descriptionEn: string;
  descriptionJa: string;
  inputSchema: ZodRawShape;
}

export const formatConfig = (params: ConfigParams) => ({
  title: formatEnJaWithSlash(params.titleEn, params.titleJa),
  description: formatEnJaWithSlash(params.descriptionEn, params.descriptionJa),
  inputSchema: params.inputSchema,
});
