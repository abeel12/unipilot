export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function apiError(status: number, code: string, message: string, details?: Record<string, unknown>) {
  const body: ApiErrorBody = { error: { code, message, details } };
  return Response.json(body, { status });
}

export function isSchemaMissing(message: string | undefined) {
  return /pipeline_status|storage_path|extracted_data|approval_records|schema cache|column/i.test(message ?? "");
}
