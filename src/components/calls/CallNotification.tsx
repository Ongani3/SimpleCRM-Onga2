import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Phone, PhoneOff, Video, Mic } from 'lucide-react';
import { CallSession } from '@/utils/CallManager';

interface CallNotificationProps {
  session: CallSession;
  onAccept: () => void;
  onDecline: () => void;
  callerName?: string;
}

export const CallNotification: React.FC<CallNotificationProps> = ({
  session,
  onAccept,
  onDecline,
  callerName = 'Unknown Caller'
}) => {
  const [isRinging, setIsRinging] = useState(true);

  useEffect(() => {
    // Create ringing sound effect
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsgBDuU1/LHdiwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmsgBDuU1/LHdiwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmsgBDuU1/LHdiwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmsgBDuU1/LHdiwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmsgBDuU1/LHdiwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmsgBDuU1/LHdiwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmsgBDuU1/LHdiwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmsgBDuU1/LHdiwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmsgBDuU1/LHdiwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmsgBDuU1/LHdiwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmsgBDuU1/LHdiwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmsgBDuU1/LHdiwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmsgBDuU1/LHdiwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmsgBDuU1/LHdiwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmsgBDuU1/LHdiwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmsgBDuU1/LHdiwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmsgBDuU');

    if (isRinging) {
      audio.loop = true;
      audio.play().catch(console.error);
    }

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [isRinging]);

  const handleAccept = () => {
    setIsRinging(false);
    onAccept();
  };

  const handleDecline = () => {
    setIsRinging(false);
    onDecline();
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 p-6">
        <div className="text-center">
          {/* Avatar */}
          <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            {session.call_type === 'video' ? (
              <Video className="w-12 h-12 text-primary-foreground" />
            ) : (
              <Mic className="w-12 h-12 text-primary-foreground" />
            )}
          </div>

          {/* Caller Info */}
          <h3 className="text-xl font-semibold mb-1">{callerName}</h3>
          <p className="text-muted-foreground mb-2">
            Incoming {session.call_type} call
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            {session.caller_type === 'customer' ? 'Customer calling store' : 'Store calling customer'}
          </p>

          {/* Pulse Animation */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-16 h-16 bg-green-500 rounded-full animate-ping opacity-75"></div>
              <div className="absolute inset-0 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <Phone className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-8">
            <Button
              variant="destructive"
              size="lg"
              onClick={handleDecline}
              className="w-16 h-16 rounded-full"
            >
              <PhoneOff className="w-8 h-8" />
            </Button>

            <Button
              size="lg"
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600"
            >
              <Phone className="w-8 h-8" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};