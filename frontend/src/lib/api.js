export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.detail || data?.error || `Error ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (url) => apiFetch(url),
  post: (url, body) => apiFetch(url, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: (url, body) => apiFetch(url, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: (url, body) => apiFetch(url, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: (url) => apiFetch(url, { method: 'DELETE' }),
};
