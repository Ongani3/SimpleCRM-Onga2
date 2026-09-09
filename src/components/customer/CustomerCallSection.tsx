import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Video, PhoneOff } from 'lucide-react';
import { CallInterface } from '../calls/CallInterface';
import { CallNotification } from '../calls/CallNotification';
import { CallHistory } from '../calls/CallHistory';
import { PresenceIndicator } from '../calls/PresenceIndicator';
import { usePresence } from '@/hooks/usePresence';
import { CallManager, CallSession, UserPresence } from '@/utils/CallManager';
import { createExternalCallSession, acceptExternalCall, declineExternalCall } from '@/utils/ExternalCall';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';

interface CustomerCallSectionProps {
  user: User;
}

export const CustomerCallSection: React.FC<CustomerCallSectionProps> = ({ user }) => {
  const { onlineUsers, updatePresence } = usePresence('customer');
  const [callManager] = useState(() => new CallManager());
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [isStoreOnline, setIsStoreOnline] = useState(false);
  const { toast } = useToast();

  // Check if store staff is online
  useEffect(() => {
    const storeStaffOnline = onlineUsers.some(u => 
      u.user_type === 'admin' && 
      (u.status === 'online' || u.status === 'away')
    );
    setIsStoreOnline(storeStaffOnline);
  }, [onlineUsers]);

  // Set up call session monitoring
  useEffect(() => {
    // Listen for incoming calls
    const callChannel = supabase
      .channel('call-sessions')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_sessions'
      }, (payload) => {
        console.log('Customer incoming call:', payload);
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
        console.log('Customer call status updated:', payload);
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
  }, [user.id]);

  const handleCallStore = async (callType: 'audio' | 'video') => {
    if (!isStoreOnline) {
      toast({
        title: "Store Unavailable",
        description: "No store staff are currently available for calls",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find an available admin
      const availableAdmin = onlineUsers.find(u => 
        u.user_type === 'admin' && 
        (u.status === 'online' || u.status === 'away')
      );

      if (!availableAdmin) {
        toast({
          title: "Store Unavailable",
          description: "No store staff are currently available for calls",
          variant: "destructive",
        });
        return;
      }

      await createExternalCallSession(
        availableAdmin.user_id,
        callType,
        'customer'
      );
      // Don't set activeCall immediately - wait for acceptance
      toast({
        title: "Call Initiated",
        description: "Waiting for store staff to answer...",
      });
    } catch (error) {
      console.error('Failed to initiate call:', error);
      toast({
        title: "Call Failed",
        description: "Unable to connect to the store",
        variant: "destructive",
      });
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
  };

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
        callerName="Store"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Call Store Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Contact Store
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Store Status */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <PresenceIndicator status={isStoreOnline ? 'online' : 'offline'} size="lg" />
              <div>
                <div className="font-medium">
                  Store Status: {isStoreOnline ? 'Available' : 'Unavailable'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isStoreOnline 
                    ? 'Store staff are online and available for calls'
                    : 'No store staff are currently available'
                  }
                </div>
              </div>
            </div>

            {/* Communicate Button */}
            <div>
              <Button
                onClick={() => handleCallStore('video')}
                disabled={!isStoreOnline}
                className="h-16 w-full flex gap-2 items-center justify-center"
              >
                <Phone className="w-5 h-5" />
                <span>Communicate with Store</span>
              </Button>
            </div>

            {!isStoreOnline && (
              <div className="text-center text-sm text-muted-foreground p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                Store staff are currently offline. You can still browse products or contact us via email.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Call History */}
      <CallHistory userType="customer" />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Can't reach us by call? Here are other ways to get support:
            </p>
            <ul className="space-y-2">
              <li>• Browse our FAQ section</li>
              <li>• Send us an email inquiry</li>
              <li>• Schedule a callback for later</li>
              <li>• Check our business hours</li>
            </ul>
            <Button variant="outline" size="sm" className="mt-3">
              View Support Options
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};