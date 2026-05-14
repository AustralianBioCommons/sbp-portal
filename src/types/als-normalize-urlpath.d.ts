declare module "als-normalize-urlpath" {
  interface NormalizeUrlPathParams {
    lower?: boolean;
    translate?: boolean;
    slug?: boolean;
    trim?: boolean;
    special?: boolean;
    encode?: boolean;
  }

  interface NormalizeUrlPathResult {
    pathname: string | null;
    query?: Record<string, string>;
    hash?: string;
    error?: Error;
  }

  export default function normalizeUrlPath(
    urlPath: string,
    params?: NormalizeUrlPathParams,
    throwError?: boolean
  ): NormalizeUrlPathResult;
}