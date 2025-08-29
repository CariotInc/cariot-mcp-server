import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CariotApiAuthProvider } from './lib/auth-provider.js';
import { logger } from './lib/logger.js';
import { registerAllTools } from './toolsets/toolset-factory.js';

const authProvider = CariotApiAuthProvider.createCariotAuthProvider();

const server = new McpServer({
  name: 'cariot',
  version: '1.0.0',
  capabilities: {
    resources: {},
    tools: {},
  },
});

registerAllTools(server, authProvider);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Cariot MCP Server running on stdio');
}

main().catch((error: unknown) => {
  logger.error('Fatal error in main()', {
    error:
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error),
  });
  process.exit(1);
});
