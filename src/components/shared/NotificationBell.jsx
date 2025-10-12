import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, X, AlertTriangle, Clock, Package, FileText, UserCheck } from "lucide-react";
import { RFQ } from "@/api/entities";
import { RawMaterial } from "@/api/entities";
import { Equipment } from "@/api/entities";
import { Notification } from "@/api/entities";
import { User } from "@/api/entities";
import { format } from "date-fns";

const NotificationIcon = ({ type }) => {
  switch (type) {
    case 'overdue':
      return <Clock className="w-4 h-4 text-red-500" />;
    case 'low_stock':
      return <Package className="w-4 h-4 text-orange-500" />;
    case 'maintenance':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'success':
       return <UserCheck className="w-4 h-4 text-green-500" />;
    case 'alert':
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'info':
      return <FileText className="w-4 h-4 text-blue-500" />;
    default:
      return <Bell className="w-4 h-4 text-slate-500" />;
  }
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserAndNotifications = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        loadNotifications(currentUser);
      } catch (e) {
        console.log("Not logged in");
        setUser(null);
        setLoading(false);
      }
    };
    fetchUserAndNotifications();
    const interval = setInterval(fetchUserAndNotifications, 60000); // Re-fetch every minute
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async (currentUser) => {
    if (!currentUser) return;
    try {
      setLoading(true);
      
      const staticNotifications = [];
      
      // Fetch all data needed for static notifications
      const [rfqs, rawMaterials, equipment] = await Promise.all([
        RFQ.list(), // Fetch ALL RFQs, not just sent ones
        RawMaterial.list(),
        Equipment.list()
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day for accurate comparison

      // 1. Check for overdue RFQ follow-ups
      rfqs.forEach(rfq => {
        // Only check RFQs that are still active (not awarded or cancelled)
        if (rfq.status !== 'awarded' && rfq.status !== 'cancelled' && rfq.next_followup_date) {
          const followupDate = new Date(rfq.next_followup_date);
          followupDate.setHours(0, 0, 0, 0);
          
          if (followupDate < today) {
            const daysOverdue = Math.floor((today - followupDate) / (1000 * 60 * 60 * 24));
            staticNotifications.push({
              id: `rfq-overdue-${rfq.id}`,
              type: 'overdue',
              title: 'Overdue RFQ Follow-up',
              message: `RFQ ${rfq.rfq_number} (${rfq.title}) follow-up is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
              timestamp: new Date(),
              priority: 'high',
              action_url: `/RFQDetail?id=${rfq.id}`
            });
          }
        }
      });

      // 2. Check for low stock items
      rawMaterials.forEach(material => {
        if ((material.current_quantity || 0) <= (material.minimum_stock || 0)) {
          const stockLevel = material.minimum_stock > 0 
            ? ((material.current_quantity / material.minimum_stock) * 100).toFixed(0)
            : 0;
          
          staticNotifications.push({
            id: `stock-low-${material.id}`,
            type: 'low_stock',
            title: 'Low Stock Alert',
            message: `${material.material_name} (SKU: ${material.sku}) is at ${stockLevel}% of minimum stock level (${material.current_quantity}/${material.minimum_stock} ${material.unit_of_measure})`,
            timestamp: new Date(),
            priority: material.current_quantity === 0 ? 'high' : 'medium',
            action_url: '/Inventory'
          });
        }
      });
      
      // 3. Check for equipment maintenance
      equipment.forEach(item => {
        if (item.next_maintenance) {
          const maintenanceDate = new Date(item.next_maintenance);
          maintenanceDate.setHours(0, 0, 0, 0);
          
          if (maintenanceDate <= today) {
            const isOverdue = maintenanceDate < today;
            const daysOverdue = isOverdue ? Math.floor((today - maintenanceDate) / (1000 * 60 * 60 * 24)) : 0;
            
            staticNotifications.push({
              id: `maintenance-${item.id}`,
              type: 'maintenance',
              title: isOverdue ? 'Overdue Maintenance' : 'Maintenance Due Today',
              message: `${item.equipment_name} (Serial: ${item.serial_number}) maintenance is ${isOverdue ? `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue` : 'due today'}`,
              timestamp: new Date(),
              priority: isOverdue ? 'high' : 'medium',
              action_url: '/Inventory'
            });
          }
        }
      });

      // 4. Fetch dynamic notifications from the Notification entity (admin only)
      let dynamicNotifications = [];
      if (currentUser.role === 'admin') {
          try {
            const persistentNotifs = await Notification.filter({ is_read: false });
            dynamicNotifications = persistentNotifs.map(n => ({
                ...n,
                timestamp: new Date(n.created_date),
                priority: n.type === 'alert' ? 'high' : n.type === 'success' ? 'low' : 'medium'
            }));
          } catch (notifError) {
            console.error('[NotificationBell] Failed to load dynamic notifications:', notifError);
            // Continue with static notifications even if dynamic ones fail
          }
      }

      // Combine all notifications
      const allNotifications = [...dynamicNotifications, ...staticNotifications];

      // Sort by priority and timestamp
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      allNotifications.sort((a, b) => {
        if (a.priority !== b.priority) return priorityOrder[b.priority] - priorityOrder[a.priority];
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      setNotifications(allNotifications);
    } catch (error) {
      console.error('[NotificationBell] Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissNotification = async (notificationId) => {
    // Check if it's a dynamic notification (has a numeric/uuid id) vs a generated one
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.id.startsWith('rfq-') && !notification.id.startsWith('stock-') && !notification.id.startsWith('maintenance-')) {
        try {
          await Notification.update(notificationId, { is_read: true });
        } catch (error) {
          console.error('[NotificationBell] Failed to mark notification as read:', error);
        }
    }
    // Remove from local state regardless
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const clearAllNotifications = async () => {
    // Mark all dynamic notifications as read
    const dynamicNotifs = notifications.filter(n => 
      !n.id.startsWith('rfq-') && 
      !n.id.startsWith('stock-') && 
      !n.id.startsWith('maintenance-')
    );
    
    await Promise.all(dynamicNotifs.map(async n => {
      try {
        await Notification.update(n.id, { is_read: true });
      } catch (error) {
        console.error(`[NotificationBell] Failed to mark notification ${n.id} as read:`, error);
      }
    }));

    // Clear all from state
    setNotifications([]);
  };

  const unreadCount = notifications.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllNotifications} className="text-xs">
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 text-center text-slate-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>No new notifications</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                      notification.priority === 'high' ? 'border-l-4 border-l-red-500' :
                      notification.priority === 'medium' ? 'border-l-4 border-l-orange-500' :
                      'border-l-4 border-l-blue-500'
                    }`}
                    onClick={() => {
                      if (notification.action_url) window.location.href = notification.action_url;
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <NotificationIcon type={notification.type} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-900 truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-slate-600 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {format(notification.timestamp, 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost" size="sm"
                        onClick={(e) => { e.stopPropagation(); dismissNotification(notification.id); }}
                        className="h-6 w-6 p-0 hover:bg-slate-200"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}