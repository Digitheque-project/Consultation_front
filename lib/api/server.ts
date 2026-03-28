import axios, { type InternalAxiosRequestConfig } from "axios";

const API_TIMEOUT_MS = 10000;

function resolveBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || "https://api.sih.chu";
}

function getAuthToken() {
  if (globalThis.window === undefined) {
    return process.env.SERVICE_API_TOKEN || null;
  }

  return globalThis.localStorage?.getItem("auth_token") || null;
}

function withDefaultHeaders(config: InternalAxiosRequestConfig) {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}

const serverApi = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: API_TIMEOUT_MS,
});

const clientApi = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: API_TIMEOUT_MS,
});

serverApi.interceptors.request.use(withDefaultHeaders);
clientApi.interceptors.request.use(withDefaultHeaders);

export { serverApi, clientApi };
