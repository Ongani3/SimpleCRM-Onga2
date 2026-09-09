import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import { CallSession } from '@/utils/CallManager';
import { endExternalCallSession } from '@/utils/ExternalCall';

interface CallInterfaceProps {
  session: CallSession;
  onEndCall: () => void;
}

export const CallInterface: React.FC<CallInterfaceProps> = ({
  session,
  onEndCall
}) => {
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const handleEndCall = async () => {
    await endExternalCallSession(session.id);
    onEndCall();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const roomID = session.id; // Use session ID as room ID for the external service

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Video Area - full screen iframe */}
      <div className="w-full h-full relative">
        <iframe
          src={`/WEB_UIKITS.html?roomID=${roomID}`}
          title="Video Call"
          allow="camera; microphone; display-capture"
          className="w-full h-full border-0"
        ></iframe>

        {/* Overlay Header - minimal and semi-transparent */}
        <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Phone className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-white">
                {session.caller_type === 'customer' ? 'Store Call' : 'Customer Call'}
              </h3>
              <p className="text-sm text-white/80">
                {formatDuration(callDuration)} • {session.call_type}
              </p>
            </div>
          </div>
          <div className="text-sm font-medium px-3 py-1 bg-green-500 text-white rounded-full">
            Connected
          </div>
        </div>

        {/* Minimal Overlay Controls - positioned higher to avoid external app buttons */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
          <Button
            variant="destructive"
            size="lg"
            onClick={handleEndCall}
            className="w-14 h-14 rounded-full shadow-lg bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};