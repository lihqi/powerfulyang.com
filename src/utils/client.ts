import { isNil, reject } from 'ramda';
import type { GetServerSideProps } from 'next';
import { notification } from '@powerfulyang/components';

export type RequestOptions = {
  method?: string;
  ctx: Parameters<GetServerSideProps>[0];
  body?: Record<string, any> | FormData;
  query?: Record<string, any>;
  notificationOnError?: boolean;
};

export const stringify = (query: RequestOptions['query']) =>
  new URLSearchParams(query && reject(isNil, query)).toString();

export type ApiResponse<T = any> = {
  data: T;
  pathViewCount: number;
  message: string;
};

export const requestAtClient = async <T = any>(
  url: string,
  options: Omit<RequestOptions, 'ctx'> = {},
): Promise<ApiResponse<T>> => {
  const host = process.env.CLIENT_BASE_HOST;

  let baseUrl = '';
  let mode: RequestMode = 'same-origin';
  const { origin: currentOrigin, host: currentHost } = window.location;
  if (url.startsWith('https://')) {
    const { origin } = new URL(url);
    if (currentOrigin !== origin) {
      mode = 'cors';
    }
  } else if (host) {
    baseUrl = `//${host}/api`;
    if (currentHost !== host) {
      mode = 'cors';
    }
  } else {
    baseUrl = `/api`;
  }

  const { method = 'GET', query, body, notificationOnError = true } = options;
  let requestBody;
  const headers = new Headers();
  if (body) {
    if (body instanceof FormData) {
      requestBody = body;
    } else {
      headers.set('content-type', 'application/json');
      requestBody = JSON.stringify(body);
    }
  }

  const isValidQuery = query && Object.values(query).some((x) => !isNil(x));
  const queryString = isValidQuery ? `?${stringify(query)}` : '';
  const requestUrl = `${baseUrl}${url}${queryString}`;

  const res = await fetch(requestUrl, {
    method,
    headers,
    mode,
    credentials: 'include',
    body: requestBody,
  });

  const json = await res.json();
  if (res.status >= 300) {
    if (notificationOnError) {
      notification.error({
        message: `请求错误: ${res.status}`,
        description: json.message,
      });
    }
    throw new Error(json.message); // 请求异常走 onError 回调
  }
  return json;
};
