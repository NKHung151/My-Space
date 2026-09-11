import { HttpErrorResponse } from '@angular/common/http';

type ErrorPayload = {
  message?: string | string[];
  meta?: {
    error?: {
      message?: string | string[];
    };
  };
};

export function getApiErrorMessage(error: unknown, fallback: string, preferFallback = false): string {
  if (preferFallback) return fallback;
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  const payload = error.error as ErrorPayload | null | undefined;
  const message = payload?.meta?.error?.message ?? payload?.message;

  if (Array.isArray(message)) {
    return message.join(' ');
  }

  return message || error.message || fallback;
}
