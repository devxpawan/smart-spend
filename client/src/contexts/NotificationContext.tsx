import React, { useState, useEffect, ReactNode, useCallback } from 'react';
import { getNotifications, markAllNotificationsAsRead } from '../api/notifications';
import NotificationInterface from '../types/NotificationInterface';
import { useAuth } from './auth-exports';
import { io } from "socket.io-client";
import toast from 'react-hot-toast';
import { NotificationContext, NotificationContextType } from './notification-exports';

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationInterface[]>([]);
  const { token } = useAuth();
  
  const unreadCount = notifications.filter(notification => !notification.read).length;

  const addNotification = useCallback((notification: NotificationInterface) => {
    setNotifications(prev => [notification, ...prev]);
  }, []);

  useEffect(() => {
    const socket = io();

    socket.on("new-notification", (notification) => {
      addNotification(notification);
      
      // Show instant toast notification without refresh
      toast.custom((t) => (
        <div className={`${
          notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
          notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        } border rounded-lg p-4 shadow-lg max-w-sm`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {notification.type === 'warning' && '⚠️'}
              {notification.type === 'error' && '❌'}
              {notification.type === 'success' && '✅'}
              {!notification.type && 'ℹ️'}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium">{notification.title}</p>
              <p className="text-sm mt-1">{notification.message}</p>
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="ml-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      ), {
        duration: 5000,
        position: 'top-right',
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [addNotification]);

  const fetchNotifications = useCallback(async () => {
    try {
      const fetchedNotifications = await getNotifications(token ?? undefined);
      setNotifications(fetchedNotifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [token]);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead(token ?? undefined);
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [token]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification._id !== id));
  }, []);

  // Fetch notifications on component mount
  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token, fetchNotifications]);

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