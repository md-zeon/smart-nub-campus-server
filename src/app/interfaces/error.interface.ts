export interface IErrorSource {
  path: string;
  message: string;
}

export interface TErrorResponse {
  success: boolean;
  statusCode?: number;
  message: string;
  errorSources: IErrorSource[];
  stack?: string;
  error?: unknown;
}
