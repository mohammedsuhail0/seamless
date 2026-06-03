// Agent: 🌐 Agent C (Viewer App API)
// File: packages/viewer/src/lib/api.ts

interface RequestOptions extends RequestInit {
  json?: any;
}

class ApiClient {
  private getBaseUrl(): string {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? ''
      : 'https://browsync-api.onrender.com';
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('browsync_access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('browsync_refresh_token');
  }

  private setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('browsync_access_token', accessToken);
    localStorage.setItem('browsync_refresh_token', refreshToken);
  }

  private clearTokens() {
    localStorage.removeItem('browsync_access_token');
    localStorage.removeItem('browsync_refresh_token');
    localStorage.removeItem('browsync_user');
  }

  private async refreshTokens(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.getBaseUrl()}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const data = await response.json();
      this.setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch (err) {
      this.clearTokens();
      return false;
    }
  }

  public async request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    
    // Inject access token if available
    const token = this.getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (options.json) {
      headers.set('Content-Type', 'application/json');
      options.body = JSON.stringify(options.json);
    }

    options.headers = headers;

    let response = await fetch(`${this.getBaseUrl()}${path}`, options);

    // Auto-refresh token if unauthorized
    if (response.status === 401 && this.getRefreshToken()) {
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        // Retry request with new token
        headers.set('Authorization', `Bearer ${this.getAccessToken()}`);
        options.headers = headers;
        response = await fetch(`${this.getBaseUrl()}${path}`, options);
      } else {
        window.location.href = '/';
        throw new Error('Session expired');
      }
    }

    const data = await response.json();
    if (!response.ok) {
      throw data;
    }

    return data as T;
  }

  public get<T = any>(path: string, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  public post<T = any>(path: string, json?: any, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'POST', json });
  }

  public patch<T = any>(path: string, json?: any, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'PATCH', json });
  }

  public delete<T = any>(path: string, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
export default api;
