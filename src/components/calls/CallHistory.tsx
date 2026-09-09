import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CallLog {
  id: string;
  call_session_id: string;
  caller_id: string;
  callee_id: string;
  call_type: 'audio' | 'video';
  duration_seconds: number;
  created_at: string;
  call_sessions: {
    status: string;
    caller_type: 'customer' | 'admin';
  };
  currentUserId?: string;
}

interface CallHistoryProps {
  userType: 'customer' | 'admin';
}

export const CallHistory: React.FC<CallHistoryProps> = ({ userType }) => {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCallHistory();
  }, []);

  const fetchCallHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Fetch call sessions separately to avoid join issues
      const logs = data || [];
      const logsWithSessions = await Promise.all(
        logs.map(async (log) => {
          const { data: session } = await supabase
            .from('call_sessions')
            .select('status, caller_type')
            .eq('id', log.call_session_id)
            .single();
          
          return {
            ...log,
            call_type: log.call_type as 'audio' | 'video',
            call_sessions: {
              status: session?.status || 'ended', 
              caller_type: (session?.caller_type as 'customer' | 'admin') || 'customer'
            },
            currentUserId: user.id
          };
        })
      );
      
      setCallLogs(logsWithSessions);
    } catch (error) {
      console.error('Failed to fetch call history:', error);
      toast({
        title: "Error",
        description: "Failed to load call history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getCallDirection = (log: CallLog, currentUserId: string) => {
    return log.caller_id === currentUserId ? 'outgoing' : 'incoming';
  };

  const getCallStatusBadge = (status: string) => {
    switch (status) {
      case 'ended':
        return <Badge variant="secondary">Completed</Badge>;
      case 'declined':
        return <Badge variant="destructive">Declined</Badge>;
      case 'missed':
        return <Badge variant="outline">Missed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Call History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {callLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No call history yet
          </div>
        ) : (
          <div className="space-y-3">
            {callLogs.map((log) => {
              const direction = log.caller_id === log.currentUserId ? 'outgoing' : 'incoming';
              
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Call Type & Direction Icon */}
                    <div className="flex items-center gap-1">
                      {log.call_type === 'video' ? (
                        <Video className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Phone className="w-4 h-4 text-muted-foreground" />
                      )}
                      {direction === 'outgoing' ? (
                        <PhoneOutgoing className="w-3 h-3 text-green-600" />
                      ) : (
                        <PhoneIncoming className="w-3 h-3 text-blue-600" />
                      )}
                    </div>

                    {/* Call Details */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {direction === 'outgoing' 
                            ? (userType === 'customer' ? 'Store' : 'Customer')
                            : (userType === 'customer' ? 'Store' : 'Customer')
                          }
                        </span>
                        {getCallStatusBadge(log.call_sessions.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(log.created_at)} • {formatDuration(log.duration_seconds)}
                      </div>
                    </div>
                  </div>

                  {/* Call Again Button */}
                  <Button variant="outline" size="sm">
                    Call Again
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};