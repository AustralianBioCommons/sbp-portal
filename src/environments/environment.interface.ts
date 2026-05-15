export interface Environment {
  production: boolean;
  auth: {
    domain: string;
    clientId: string;
    audience?: string;
  };
  apiBaseUrl?: string;
  profileUrl: string;
}
