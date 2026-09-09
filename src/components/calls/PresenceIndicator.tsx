import React from 'react';
import { UserPresence } from '@/utils/CallManager';

interface PresenceIndicatorProps {
  status: UserPresence['status'];
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  status,
  size = 'md',
  showLabel = false
}) => {
  const getStatusColor = (status: UserPresence['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'busy':
      case 'in_call':
        return 'bg-red-500';
      case 'away':
        return 'bg-yellow-500';
      case 'offline':
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: UserPresence['status']) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'busy':
        return 'Busy';
      case 'in_call':
        return 'In Call';
      case 'away':
        return 'Away';
      case 'offline':
      default:
        return 'Offline';
    }
  };

  const getSizeClass = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2';
      case 'lg':
        return 'w-4 h-4';
      case 'md':
      default:
        return 'w-3 h-3';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`${getSizeClass(size)} ${getStatusColor(status)} rounded-full`} />
      {showLabel && (
        <span className="text-sm text-muted-foreground">
          {getStatusLabel(status)}
        </span>
      )}
    </div>
  );
};