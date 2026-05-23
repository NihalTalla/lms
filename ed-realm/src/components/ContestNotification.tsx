import React, { useContext } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

export interface ContestNotification {
  id: string;
  contestId: string;
  contestName: string;
  message: string;
  timestamp: number;
  type: 'new_contest' | 'contest_starting' | 'contest_ending';
  read: boolean;
}

interface ContestNotificationContextType {
  notifications: ContestNotification[];
  addNotification: (notification: ContestNotification) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

export const ContestNotificationContext = React.createContext<ContestNotificationContextType | undefined>(undefined);

export function ContestNotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = React.useState<ContestNotification[]>([]);

  const addNotification = (notification: ContestNotification) => {
    setNotifications(prev => [notification, ...prev]);
    toast.success(notification.message);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <ContestNotificationContext.Provider
      value={{ notifications, addNotification, removeNotification, markAsRead, clearAll }}
    >
      {children}
    </ContestNotificationContext.Provider>
  );
}

export function useContestNotification() {
  const context = useContext(ContestNotificationContext);
  if (!context) {
    throw new Error('useContestNotification must be used within ContestNotificationProvider');
  }
  return context;
}

// Notification Popup Component
export function ContestNotificationPopup() {
  const { notifications, removeNotification, markAsRead } = useContestNotification();
  const unreadCount = notifications.filter(n => !n.read).length;

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50 max-w-md">
      {notifications.slice(0, 3).map(notification => (
        <div
          key={notification.id}
          className="bg-white rounded-lg shadow-lg border border-neutral-200 p-4 animate-in slide-in-from-bottom-4"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-neutral-900">{notification.contestName}</h4>
              </div>
              <p className="text-sm text-neutral-600 mt-1">{notification.message}</p>
              <p className="text-xs text-neutral-400 mt-2">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
