import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export class ApiError extends Error {
  statusCode: number;
  code: string;

  constructor(
    statusCode: number,
    message: string,
    code: string = "INTERNAL_ERROR",
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = "ApiError";
  }
}

export function apiSuccess<T>(
  data: T,
  status: number = 200,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json<ApiResponse<T>>({ success: true, data }, { status });
}

export function apiError(
  message: string,
  status: number = 500,
  code: string = "INTERNAL_ERROR",
): NextResponse<ApiResponse<never>> {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error: { code, message } },
    { status },
  );
}

/**
 * Wraps a route handler in try/catch. Converts ApiError to a structured
 * response and never leaks raw error text to the client.
 */
export function apiErrorHandler<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<NextResponse>,
): (...args: TArgs) => Promise<NextResponse> {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return apiError(err.message, err.statusCode, err.code);
      }
      // Never leak raw error to client
      console.error("[API Error]", err);
      return apiError("An unexpected error occurred", 500, "INTERNAL_ERROR");
    }
  };
}
