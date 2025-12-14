import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getApiBaseUrl } from '../services/invmisApi';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
  actionText?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  loadNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const addNotification = (notificationData: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      isRead: false,
      createdAt: new Date()
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Persist to localStorage
    const stored = JSON.parse(localStorage.getItem(`notifications_${user?.Id}`) || '[]');
    stored.unshift(newNotification);
    localStorage.setItem(`notifications_${user?.Id}`, JSON.stringify(stored.slice(0, 50))); // Keep only 50 latest
  };

  const markAsRead = async (id: string) => {
    // Update UI immediately
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    
    try {
      // Update backend
      await fetch(`http://localhost:3001/api/notifications/${id}/read`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
    
    // Update localStorage as backup
    const stored = JSON.parse(localStorage.getItem(`notifications_${user?.Id}`) || '[]');
    const updated = stored.map((n: Notification) => n.id === id ? { ...n, isRead: true } : n);
    localStorage.setItem(`notifications_${user?.Id}`, JSON.stringify(updated));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, isRead: true }))
    );
    
    // Update localStorage
    const stored = JSON.parse(localStorage.getItem(`notifications_${user?.Id}`) || '[]');
    const updated = stored.map((n: Notification) => ({ ...n, isRead: true }));
    localStorage.setItem(`notifications_${user?.Id}`, JSON.stringify(updated));
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    // Update localStorage
    const stored = JSON.parse(localStorage.getItem(`notifications_${user?.Id}`) || '[]');
    const updated = stored.filter((n: Notification) => n.id !== id);
    localStorage.setItem(`notifications_${user?.Id}`, JSON.stringify(updated));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    localStorage.removeItem(`notifications_${user?.Id}`);
  };

  const loadNotifications = async () => {
    if (!user?.Id) return;
    
    try {
      // Load from backend API
      const response = await fetch(`${getApiBaseUrl()}/my-notifications?limit=50`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 API Response:', data);
        
        if (data.success && data.notifications) {
          console.log('📋 Raw notifications from API:', data.notifications);
          
          const apiNotifications = data.notifications.map((n: any) => {
            // Normalize type to valid values
            let type: 'info' | 'success' | 'warning' | 'error' = 'info';
            if (n.Type) {
              const typeStr = n.Type.toLowerCase();
              if (['info', 'success', 'warning', 'error'].includes(typeStr)) {
                type = typeStr as 'info' | 'success' | 'warning' | 'error';
              }
            }
            
            return {
              id: n.Id,
              title: n.Title,
              message: n.Message,
              type,
              isRead: n.IsRead,
              createdAt: new Date(n.CreatedAt),
              actionUrl: n.ActionUrl,
              actionText: n.ActionText
            };
          });
          
          console.log('✅ Loaded notifications from API:', apiNotifications.length);
          console.log('📋 Processed notifications:', apiNotifications);
          setNotifications(apiNotifications);
          return;
        } else {
          console.warn('⚠️ API response missing success or notifications:', data);
        }
      } else {
        console.error('❌ API response not OK:', response.status, response.statusText);
      }
      
      // Fallback to localStorage if API fails
      console.warn('⚠️ Failed to load from API, using localStorage fallback');
      const stored = JSON.parse(localStorage.getItem(`notifications_${user?.Id}`) || '[]');
      setNotifications(stored.map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt)
      })));
      
    } catch (error) {
      console.error('Failed to load notifications:', error);
      
      // Fallback to localStorage
      const stored = JSON.parse(localStorage.getItem(`notifications_${user?.Id}`) || '[]');
      setNotifications(stored.map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt)
      })));
    }
  };

  useEffect(() => {
    if (user?.Id) {
      loadNotifications();
      
      // Refresh notifications every 30 seconds
      const interval = setInterval(() => {
        loadNotifications();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user?.Id]);

  // Load real notifications from database only
  useEffect(() => {
    if (user?.Id) {
      // No sample notifications - only load real data from database
      console.log('Loading real notifications for user:', user.Id);
    }
  }, [user]);

  // Remove the demo notification simulator - only use real-time updates from database
  useEffect(() => {
    if (!user?.Id) return;
    
    // Real-time notifications would come from WebSocket or periodic API calls
    // For now, just rely on the loadNotifications function called every 30 seconds above
    console.log('Real-time notification system ready for user:', user.Id);
  }, [user?.Id]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    loadNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
