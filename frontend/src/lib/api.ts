export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type RequestOptions = RequestInit & {
  requireAuth?: boolean;
};

export async function fetchApi(endpoint: string, options: RequestOptions = {}) {
  const { requireAuth = true, headers, ...rest } = options;
  
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  
  const customHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers as Record<string, string>,
  };

  // If uploading a file, don't set Content-Type manually so browser sets multipart boundary
  if (options.body instanceof FormData) {
    delete customHeaders["Content-Type"];
  }

  if (requireAuth && token) {
    customHeaders["Authorization"] = `Bearer ${token}`;
  } else if (requireAuth && !token) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: customHeaders,
    ...rest,
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || `API error: ${response.status}`);
  }

  return response.json();
}
