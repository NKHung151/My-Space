import { OperatorFunction, map } from 'rxjs';
import { ApiResponse, Page, PageResponse } from './api-response.model';

/** Lấy phần data của ApiResponse. */
export function unwrap<T>(): OperatorFunction<ApiResponse<T>, T> {
  return map(response => response.data);
}

/** Bóc ApiResponse<PageResponse<T>> thành Page<T>; thiếu dữ liệu thì trả trang rỗng. */
export function unwrapPage<T>(): OperatorFunction<ApiResponse<PageResponse<T>>, Page<T>> {
  return map(response => ({
    items: response.data?.data ?? [],
    meta: response.data?.meta ?? { total: 0, page: 1, limit: 0, totalPages: 0 },
  }));
}
