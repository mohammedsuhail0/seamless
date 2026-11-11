// Agent: 🌐 Agent C (Viewer App API)
// File: packages/viewer/src/lib/api.ts

interface RequestOptions extends RequestInit {
  json?: any;
  silent?: boolean;
  timeoutMs?: number;
}

class ApiClient {
  private sessionInvalid = false;
  private isWarm = false;
  private warmupPromise: Promise<boolean> | null = null;

  public getBaseUrl(): string {
    if (typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform?.()) {
      return 'https://brosync-api.onrender.com';
    }
    if (window.location.protocol === 'capacitor:' || window.location.protocol === 'file:') {
      return 'https://brosync-api.onrender.com';
    }
    if (window.location.port === '5173' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return '';
    }
    return import.meta.env.VITE_API_URL || 'https://brosync-api.onrender.com';
  }

  public isServerWarm(): boolean {
    return this.isWarm;
  }

  /**
   * Eager background server pre-warming.
   * Wakes up the Render container before the user finishes typing credentials.
   */
  public async warmup(): Promise<boolean> {
    if (this.isWarm) return true;
    if (this.warmupPromise) return this.warmupPromise;

    this.warmupPromise = (async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 65000);
        
        const res = await fetch(`${this.getBaseUrl()}/health`, {
          method: 'GET',
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        });
        clearTimeout(timer);

        if (res.ok) {
          this.isWarm = true;
          return true;
        }
        return false;
      } catch {
        // Cold-boot in progress or network delay — silent catch
        return false;
      } finally {
        this.warmupPromise = null;
      }
    })();

    return this.warmupPromise;
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('brosync_access_token') || localStorage.getItem('browsync_access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('brosync_refresh_token') || localStorage.getItem('browsync_refresh_token');
  }

  private setTokens(accessToken: string, refreshToken: string) {
    this.sessionInvalid = false;
    localStorage.setItem('brosync_access_token', accessToken);
    localStorage.setItem('brosync_refresh_token', refreshToken);
    // Legacy compatibility aliases
    localStorage.setItem('browsync_access_token', accessToken);
    localStorage.setItem('browsync_refresh_token', refreshToken);
  }

  private clearTokens() {
    localStorage.removeItem('brosync_access_token');
    localStorage.removeItem('brosync_refresh_token');
    localStorage.removeItem('brosync_user');
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
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.status === 401 || response.status === 403) {
        this.clearTokens();
        this.sessionInvalid = true;
        return false;
      }

      if (!response.ok) return false;

      const data = await response.json();
      this.setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch (_err) {
      return false;
    }
  }

  public async request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    const maxRetries = 2;
    const timeoutMs = options.timeoutMs ?? 70000; // 70s threshold for cold-boot leeway
    let attempt = 0;

    const executeFetch = async (): Promise<Response> => {
      const headers = new Headers(options.headers || {});
      const token = this.getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const fetchOptions: RequestInit = {
        ...options,
        credentials: 'include',
      };

      if (options.json) {
        headers.set('Content-Type', 'application/json');
        fetchOptions.body = JSON.stringify(options.json);
      }
      fetchOptions.headers = headers;

      // Setup timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      fetchOptions.signal = controller.signal;

      try {
        const res = await fetch(`${this.getBaseUrl()}${path}`, fetchOptions);
        clearTimeout(timeoutId);
        return res;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error('Server request timed out. The cloud instance is taking unusually long to boot.');
        }
        throw err;
      }
    };

    while (attempt <= maxRetries) {
      try {
        let response = await executeFetch();

        // If Render returns 502/503/504 while waking up, wait and retry
        if ([502, 503, 504].includes(response.status) && attempt < maxRetries) {
          attempt++;
          await new Promise((r) => setTimeout(r, 2500));
          continue;
        }

        // Auto-refresh token if unauthorized
        if (response.status === 401 && this.getRefreshToken()) {
          const refreshed = await this.refreshTokens();
          if (refreshed) {
            response = await executeFetch();
          } else {
            if (!options.silent && this.sessionInvalid) {
              window.location.href = '/';
            }
            throw new Error(this.sessionInvalid ? 'Session expired' : 'Connection temporarily unavailable');
          }
        }

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw data || { error: { message: `Request failed with status ${response.status}` } };
        }

        this.isWarm = true;
        return data as T;
      } catch (err: any) {
        // If network failed during cold-boot container launch, retry once or twice
        if (attempt < maxRetries && (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError'))) {
          attempt++;
          await new Promise((r) => setTimeout(r, 2500));
          continue;
        }
        throw err;
      }
    }

    throw new Error('Unable to connect to server after multiple attempts.');
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
