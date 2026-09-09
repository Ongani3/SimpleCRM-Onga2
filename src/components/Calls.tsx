import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Video, Users, PhoneCall, Clock, PhoneIncoming, UserCheck } from 'lucide-react';
import { CallHistory } from './calls/CallHistory';
import { PresenceIndicator } from './calls/PresenceIndicator';
import { CallInterface } from './calls/CallInterface';
import { CallNotification } from './calls/CallNotification';
import { usePresence } from '@/hooks/usePresence';
import { CallManager, CallSession, UserPresence } from '@/utils/CallManager';
import { createExternalCallSession, acceptExternalCall, declineExternalCall } from '@/utils/ExternalCall';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const Calls: React.FC = () => {
  const { onlineUsers, currentUserPresence, updatePresence } = usePresence('admin');
  const [callManager] = useState(() => new CallManager());
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [callStats, setCallStats] = useState({
    totalCalls: 0,
    missedCalls: 0,
    averageDuration: 0
  });
  const { toast } = useToast();

  // Set up call session monitoring
  useEffect(() => {
    const setupCallMonitoring = async () => {
      const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Listen for incoming calls
    const callChannel = supabase
      .channel('call-sessions')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_sessions'
      }, (payload) => {
        console.log('Incoming call:', payload);
        const session = payload.new as CallSession;
        // Filter in JS to ensure we only process calls where we are the callee
        if (session.callee_id === user.id) {
          setIncomingCall(session);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_sessions'
      }, (payload) => {
        console.log('Call status updated:', payload);
        const session = payload.new as CallSession;
        // Filter to only process updates where we are involved
        if (session.caller_id === user.id || session.callee_id === user.id) {
          if (session.status === 'active') {
            // Call was accepted, start the call interface
            setActiveCall(session);
            setIncomingCall(null);
          } else if (session.status === 'ended' || session.status === 'declined') {
            setActiveCall(null);
            setIncomingCall(null);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(callChannel);
    };
    };

    setupCallMonitoring();
  }, []);

  // Fetch call statistics
  useEffect(() => {
    fetchCallStats();
  }, []);

  const fetchCallStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get call statistics
      const { data: logs } = await supabase
        .from('call_logs')
        .select('duration_seconds, call_session_id')
        .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`);

      if (logs) {
        const totalCalls = logs.length;
        const missedCalls = 0; // Simplified for now
        const completedCalls = logs.filter(log => log.duration_seconds > 0);
        const averageDuration = completedCalls.length > 0 
          ? completedCalls.reduce((sum, log) => sum + log.duration_seconds, 0) / completedCalls.length 
          : 0;

        setCallStats({ totalCalls, missedCalls, averageDuration });
      }
    } catch (error) {
      console.error('Failed to fetch call stats:', error);
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    try {
      await acceptExternalCall(incomingCall.id);
      setActiveCall(incomingCall);
      setIncomingCall(null);
      updatePresence('in_call');
    } catch (error) {
      console.error('Failed to accept call:', error);
      toast({
        title: "Error",
        description: "Failed to accept the call",
        variant: "destructive",
      });
    }
  };

  const handleDeclineCall = async () => {
    if (!incomingCall) return;

    try {
      await declineExternalCall(incomingCall.id);
      setIncomingCall(null);
    } catch (error) {
      console.error('Failed to decline call:', error);
    }
  };

  const handleEndCall = () => {
    setActiveCall(null);
    updatePresence('online');
    fetchCallStats(); // Refresh stats
  };

  const handleStatusChange = async (status: UserPresence['status']) => {
    await updatePresence(status);
  };

  const onlineCustomers = onlineUsers.filter(user => user.user_type === 'customer');
  const onlineAdmins = onlineUsers.filter(user => user.user_type === 'admin');

  // Show active call interface
  if (activeCall) {
    return (
      <CallInterface
        session={activeCall}
        onEndCall={handleEndCall}
      />
    );
  }

  // Show incoming call notification
  if (incomingCall) {
    return (
      <CallNotification
        session={incomingCall}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
        callerName="Customer"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Calls</h1>
          <p className="text-muted-foreground">
            Manage customer calls and view online presence
          </p>
        </div>

        {/* Admin Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <PresenceIndicator status={currentUserPresence?.status || 'offline'} showLabel />
          </div>
          <select
            value={currentUserPresence?.status || 'offline'}
            onChange={(e) => handleStatusChange(e.target.value as UserPresence['status'])}
            className="px-3 py-1 border rounded-md bg-background"
          >
            <option value="online">Online</option>
            <option value="busy">Busy</option>
            <option value="away">Away</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <PhoneCall className="w-4 h-4" />
              Total Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats.totalCalls}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <PhoneIncoming className="w-4 h-4" />
              Missed Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{callStats.missedCalls}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Avg Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(callStats.averageDuration / 60)}m {Math.floor(callStats.averageDuration % 60)}s
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="online-customers" className="w-full">
        <TabsList>
          <TabsTrigger value="online-customers">
            Online Customers ({onlineCustomers.length})
          </TabsTrigger>
          <TabsTrigger value="call-history">
            Call History
          </TabsTrigger>
          <TabsTrigger value="settings">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="online-customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Online Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {onlineCustomers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No customers are currently online
                </div>
              ) : (
                <div className="space-y-3">
                  {onlineCustomers.map((customer) => (
                    <div
                      key={customer.user_id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <PresenceIndicator status={customer.status} />
                        <div>
                          <div className="font-medium">Customer</div>
                          <div className="text-sm text-muted-foreground">
                            {customer.status} • Last seen: {new Date(customer.last_seen).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await createExternalCallSession(customer.user_id, 'video', 'admin');
                              toast({
                                title: "Call Initiated",
                                description: "Waiting for customer to answer...",
                              });
                            } catch (error) {
                              console.error('Failed to start call:', error);
                              toast({
                                title: "Call Failed",
                                description: "Unable to start the call. Please try again.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          Call
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Online Staff */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Online Staff ({onlineAdmins.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {onlineAdmins.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No other staff members are currently online
                </div>
              ) : (
                <div className="space-y-2">
                  {onlineAdmins.map((admin) => (
                    <div
                      key={admin.user_id}
                      className="flex items-center gap-3 p-2"
                    >
                      <PresenceIndicator status={admin.status} />
                      <div>
                        <div className="font-medium">Staff Member</div>
                        <div className="text-sm text-muted-foreground">
                          {admin.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="call-history">
          <CallHistory userType="admin" />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Call Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Call settings will be implemented here, including:
                </div>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Auto-accept calls when available</li>
                  <li>Call notification preferences</li>
                  <li>Maximum call duration limits</li>
                  <li>Call recording settings</li>
                  <li>Do not disturb schedules</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};