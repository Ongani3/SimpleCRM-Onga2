import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, AlertCircle, Package, CreditCard, Calendar, Gift, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerNotificationsProps {
  user: User;
  notifications: any[];
  onNotificationsUpdate: () => void;
}

export const CustomerNotifications: React.FC<CustomerNotificationsProps> = ({ 
  user, 
  notifications, 
  onNotificationsUpdate 
}) => {
  const [loading, setLoading] = useState(false);

  const markAsRead = async (notificationId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      onNotificationsUpdate();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      toast.success('All notifications marked as read');
      onNotificationsUpdate();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      toast.success('Notification deleted');
      onNotificationsUpdate();
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_update': return <Package className="h-5 w-5 text-blue-500" />;
      case 'payment': return <CreditCard className="h-5 w-5 text-green-500" />;
      case 'appointment': return <Calendar className="h-5 w-5 text-purple-500" />;
      case 'promotion': return <Gift className="h-5 w-5 text-orange-500" />;
      case 'support': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'system': return <Settings className="h-5 w-5 text-gray-500" />;
      default: return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'normal': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'low': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return 'bg-muted-foreground/10 text-muted-foreground';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const unreadNotifications = notifications.filter(n => !n.is_read);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notifications
            {unreadNotifications.length > 0 && (
              <Badge className="ml-2">
                {unreadNotifications.length} unread
              </Badge>
            )}
          </h2>
          <p className="text-muted-foreground">Stay updated with important messages and alerts</p>
        </div>
        {unreadNotifications.length > 0 && (
          <Button
            variant="outline"
            onClick={markAllAsRead}
            disabled={loading}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`transition-all ${
                !notification.is_read 
                  ? 'bg-primary/5 border-primary/20' 
                  : 'hover:shadow-md'
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{notification.title}</h3>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityBadgeColor(notification.priority)}>
                          {notification.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          disabled={loading}
                        >
                          Mark as Read
                        </Button>
                      )}
                      {notification.action_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(notification.action_url, '_blank')}
                        >
                          View Details
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                        disabled={loading}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                You're all caught up! New notifications will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notification Types Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notification Types</CardTitle>
          <CardDescription>
            Here's what different notification types mean
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Order Updates</p>
                <p className="text-sm text-muted-foreground">Status changes for your orders</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Payment Notifications</p>
                <p className="text-sm text-muted-foreground">Payment confirmations and receipts</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium">Appointment Reminders</p>
                <p className="text-sm text-muted-foreground">Upcoming appointment notifications</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Gift className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium">Promotions & Offers</p>
                <p className="text-sm text-muted-foreground">Special deals and loyalty rewards</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium">Support Updates</p>
                <p className="text-sm text-muted-foreground">Responses to your support tickets</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium">System Messages</p>
                <p className="text-sm text-muted-foreground">Account and system notifications</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};