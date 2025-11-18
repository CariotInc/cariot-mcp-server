# Cariot MCP Server

A Model Context Protocol (MCP) server with cariot APIs.

## Quick Start

### Prerequisites

- Node.js v22+ (ES modules support)
- Cariot API credentials (API Secret Key, API Access Secret)

### Configuration


Add the following configuration to your MCP-enabled client (e.g., Claude Desktop) settings.


#### Authentication Setup via Environment Variables

```json
{
  "mcpServers": {
    "cariot": {
      "command": "npx",
      "args": ["@cariot-labs/cariot-mcp-server"],
      "env": {
        "API_ACCESS_KEY": "your-api-access-key",
        "API_ACCESS_SECRET": "your-api-access-secret"
      }
    }
  }
}
```

**Required Environment Variables:**

- **API_ACCESS_KEY**: Cariot API access key
- **API_ACCESS_SECRET**: Cariot API access secret

**Optional Environment Variables:**

- **CARIOT_LOG_LEVEL**: Logging level (debug, info, warn, error). Default: info

### No Installation Required

npx automatically downloads and runs the server.

## Available Tools

### Cariot Tools

- **analyze_alcohol_checks**: Analyze alcohol check results from daily reports to monitor compliance and identify violations.
- **get_daily_report**: Get a specific daily report by daily report number.
- **get_daily_reports**: List daily reports.
- **get_drivers**: List drivers.
- **get_vehicles**: List vehicles.
- **get_realtime**: Get realtime snapshots for devices.

### Utility Tools

- **generate_chart_config**: Generate Chart.js configuration data based on input data. Supports bar, line, pie, doughnut, radar, and polarArea chart types. This tool can be used to visualize data obtained from other tools.

## Authentication

This MCP server uses the following authentication flow:

1. **Initial Authentication**: Login using API_ACCESS_KEY and API_ACCESS_SECRET
2. **Token Acquisition**: Obtain api_token upon successful authentication
3. **Auto Refresh**: Automatic re-authentication when token expires
4. **Retry Logic**: Automatic retry on 401 errors

## Development

### Local Development

```bash
# Clone repository
git clone https://github.com/CariotInc/cariot-mcp-server.git
cd cariot-mcp-server
npm install

# Test
npm test

# Build
npm run build
```

### Configuration

```json
{
  "mcpServers": {
    "cariot": {
      "command": "node",
      "args": ["/path/to/cariot-mcp-server/dist/index.js"],
      "env": {
        "API_ACCESS_KEY": "your-access-key",
        "API_ACCESS_SECRET": "your-access-secret",
        "CARIOT_LOG_LEVEL": "debug"
      }
    }
  }
}
```

## License

MIT
