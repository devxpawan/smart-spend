import { createContext, useContext } from 'react';
import NotificationInterface from '../types/NotificationInterface';

export interface NotificationContextType {
  notifications: NotificationInterface[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: NotificationInterface) => void;
  removeNotification: (id: string) => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
