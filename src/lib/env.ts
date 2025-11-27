export type Environment =
  | { authType: 'id_token'; idToken: string }
  | { authType: 'api_key'; apiAccessKey: string; apiAccessSecret: string };

export function getEnvironment(): Environment {
  const apiAccessKey = process.env.API_ACCESS_KEY;
  const apiAccessSecret = process.env.API_ACCESS_SECRET;
  const idToken = process.env.ID_TOKEN;

  if (apiAccessKey && apiAccessSecret) {
    return {
      authType: 'api_key',
      apiAccessKey,
      apiAccessSecret,
    };
  }

  if (idToken) {
    return {
      authType: 'id_token',
      idToken,
    };
  }

  throw new Error(
    'Authentication credentials are required: Please set either ID_TOKEN or both API_ACCESS_KEY and API_ACCESS_SECRET environment variables',
  );
}
