// Session service for managing user session
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
      const response = await fetch(`${API_BASE_URL}/api/session`);
      const data: SessionResponse = await response.json();
      
      if (data.success && data.session) {
        this.currentUser = data.session;
        this.sessionId = data.session_id || 'default-session';
        console.log('✅ Session initialized:', this.currentUser);
        return this.currentUser;
      }
    } catch (error) {
      console.error('❌ Failed to initialize session:', error);
    }
    return null;
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
