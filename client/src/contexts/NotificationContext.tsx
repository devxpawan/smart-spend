import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getNotifications, markAllNotificationsAsRead } from '../api/notifications';
import NotificationInterface from '../types/NotificationInterface';
import { useAuth } from './auth-exports';

interface NotificationContextType {
  notifications: NotificationInterface[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: NotificationInterface) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationInterface[]>([]);
  const { token } = useAuth();
  
  const unreadCount = notifications.filter(notification => !notification.read).length;

  const fetchNotifications = async () => {
    try {
      const fetchedNotifications = await getNotifications(token);
      setNotifications(fetchedNotifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(token);
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const addNotification = (notification: NotificationInterface) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification._id !== id));
  };

  // Fetch notifications on component mount
  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token]);

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    fetchNotifications,
    markAllAsRead,
    addNotification,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};