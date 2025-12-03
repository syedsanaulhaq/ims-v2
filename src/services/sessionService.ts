// Session service for managing user session
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface User {
  user_id: string;
  user_name: string;
  email: string;
  role: string;
  office_id: number;
  wing_id: number;
  created_at: string;
  // IMS Role System fields
  ims_roles?: Array<{
    role_id: string;
    role_name: string;
    scope_type: string;
    scope_wing_id?: number;
  }>;
  ims_permissions?: Array<{
    permission_key: string;
    module_name: string;
    action_name: string;
    description: string;
  }>;
  is_super_admin?: boolean;
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
        return this.currentUser;
      } else {
        console.warn('⚠️ Session response success was false or no session data');
      }
    } catch (error) {
      console.error('❌ Failed to initialize session:', error);
    }
    
    // No fallback - return null if no session exists
    return null;
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Get current user ID
  getCurrentUserId(): string | null {
    return this.currentUser?.user_id || null;
  }

  // Get current user name
  getCurrentUserName(): string | null {
    return this.currentUser?.user_name || null;
  }

  // Get current session ID
  getSessionId(): string | null {
    return this.sessionId;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Get user role
  getUserRole(): string | null {
    return this.currentUser?.role || null;
  }

  // Get user office
  getUserOfficeId(): number | null {
    return this.currentUser?.office_id || null;
  }

  // Get user wing
  getUserWingId(): number | null {
    return this.currentUser?.wing_id || null;
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
