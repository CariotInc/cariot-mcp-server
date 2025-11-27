export type Environment =
  | { authType: 'access_token'; accessToken: string }
  | { authType: 'api_key'; apiAccessKey: string; apiAccessSecret: string };

export function getEnvironment(): Environment {
  const apiAccessKey = process.env.API_ACCESS_KEY;
  const apiAccessSecret = process.env.API_ACCESS_SECRET;
  const accessToken = process.env.ACCESS_TOKEN;

  if (apiAccessKey && apiAccessSecret) {
    return {
      authType: 'api_key',
      apiAccessKey,
      apiAccessSecret,
    };
  }

  if (accessToken) {
    return {
      authType: 'access_token',
      accessToken,
    };
  }

  throw new Error(
    'Authentication credentials are required: Please set either ACCESS_TOKEN or both API_ACCESS_KEY and API_ACCESS_SECRET environment variables',
  );
}
