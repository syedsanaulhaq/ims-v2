// Session service for managing user session

// Environment-based API URL configuration
const getApiBaseUrl = () => {
  // Check if running on specific ports
  const currentPort = window.location.port;
  
  // Demo environment (port 8082)
  if (currentPort === '8082') {
    return 'http://localhost:5002';  // Demo API
  }
  
  // Staging environment (port 8081)
  if (currentPort === '8081' || window.location.hostname.includes('staging')) {
    return 'http://localhost:5001';  // Staging API
  }
  
  // Check for environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Default to development backend server
  return 'http://localhost:5000';
};

const API_BASE_URL = getApiBaseUrl();

interface User {
  user_id: string;
  user_name: string;
  email: string;
  role: string;
  office_id: number;
  wing_id: number;
  created_at: string;
}

interface SessionResponse {
  success: boolean;
  session?: User;
  session_id?: string;
  user?: User;
}

class SessionService {
  private currentUser: User | null = null;
  private sessionId: string | null = null;

  // Initialize session on app start
  async initializeSession(): Promise<User | null> {
    try {
      console.log('🔄 Initializing session from:', `${API_BASE_URL}/api/session`);
      const response = await fetch(`${API_BASE_URL}/api/session`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'  // Include cookies for session
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: SessionResponse = await response.json();
      
      if (data.success && data.session) {
        this.currentUser = data.session;
        this.sessionId = data.session_id || 'default-session';
        console.log('✅ Session initialized:', this.currentUser);
        return this.currentUser;
      } else {
        console.warn('⚠️ Session response success was false or no session data');
      }
    } catch (error) {
      console.error('❌ Failed to initialize session:', error);
    }
    
    // Always provide a fallback session for development
    if (!this.currentUser) {
      const fallbackUser: User = {
        user_id: 'DEV-USER-001',
        user_name: 'Development User',
        email: 'dev.user@system.com',
        role: 'Admin',
        office_id: 583,
        wing_id: 19,
        created_at: new Date().toISOString()
      };
      this.currentUser = fallbackUser;
      this.sessionId = 'fallback-session';
      console.log('🛠️ Using fallback session for development');
    }
    
    return this.currentUser;
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Get current user ID
  getCurrentUserId(): string {
    return this.currentUser?.user_id || 'DEV-USER-001';
  }

  // Get current user name
  getCurrentUserName(): string {
    return this.currentUser?.user_name || 'Development User';
  }

  // Get current session ID
  getSessionId(): string {
    return this.sessionId || 'default-session';
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Get user role
  getUserRole(): string {
    return this.currentUser?.role || 'Admin';
  }

  // Get user office
  getUserOfficeId(): number {
    return this.currentUser?.office_id || 583;
  }

  // Get user wing
  getUserWingId(): number {
    return this.currentUser?.wing_id || 19;
  }

  // Force refresh session from server
  async refreshSession(): Promise<User | null> {
    console.log('🔄 Force refreshing session...');
    this.clearSession();
    return this.initializeSession();
  }

  // Mock login for development
  async mockLogin(): Promise<User | null> {
    return this.initializeSession();
  }

  // Clear session
  clearSession(): void {
    this.currentUser = null;
    this.sessionId = null;
  }
}

// Export singleton instance
export const sessionService = new SessionService();
export type { User };
