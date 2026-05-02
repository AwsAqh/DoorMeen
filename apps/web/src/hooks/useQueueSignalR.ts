import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';

export interface UseQueueSignalRProps {
  queueId: string;
  onCustomerJoined?: (customer: any) => void;
  onCustomerVerified?: (customer: any) => void;
  onCustomerLeft?: (customerId: number) => void;
  onCustomerStatusChanged?: (resDto: any) => void;
  onCustomerServed?: (customerId: number) => void;
  onMessageUpdated?: (message: string | null) => void;
}

export function useQueueSignalR({
  queueId,
  onCustomerJoined,
  onCustomerVerified,
  onCustomerLeft,
  onCustomerStatusChanged,
  onCustomerServed,
  onMessageUpdated,
}: UseQueueSignalRProps) {
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const callbacksRef = useRef({
    onCustomerJoined,
    onCustomerVerified,
    onCustomerLeft,
    onCustomerStatusChanged,
    onCustomerServed,
    onMessageUpdated,
  });

  // Update refs on every render to ensure always capturing the latest scope
  callbacksRef.current = {
    onCustomerJoined,
    onCustomerVerified,
    onCustomerLeft,
    onCustomerStatusChanged,
    onCustomerServed,
    onMessageUpdated,
  };

  useEffect(() => {
    if (!queueId) return;

    const API = import.meta.env.VITE_API_BASE_URL;
    
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API}/hubs/queue`, {
        withCredentials: true
      })
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;

    let isMounted = true;
    const startConnection = async () => {
      try {
        await connection.start();
        if (!isMounted) {
          // If unmounted while starting, stop it immediately
          connection.stop().catch(console.error);
          return;
        }
        setIsConnected(true);
        console.log('SignalR Connected.');
        
        // Join the queue group to receive its specific events
        await connection.invoke('JoinQueueGroup', queueId);
      } catch (err) {
        if (!isMounted) return; // Ignore errors if already unmounted (like "stopped during negotiation")
        console.error('SignalR Connection Error: ', err);
      }
    };

    // Event listeners mapped to props
    connection.on('CustomerJoined', (customer) => {
      callbacksRef.current.onCustomerJoined?.(customer);
    });

    connection.on('CustomerVerified', (customer) => {
      callbacksRef.current.onCustomerVerified?.(customer);
    });

    connection.on('CustomerLeft', (customerId) => {
      callbacksRef.current.onCustomerLeft?.(customerId);
    });

    connection.on('CustomerStatusChanged', (resDto) => {
      callbacksRef.current.onCustomerStatusChanged?.(resDto);
    });

    connection.on('CustomerServed', (customerId) => {
      callbacksRef.current.onCustomerServed?.(customerId);
    });

    connection.on('MessageUpdated', (message) => {
      callbacksRef.current.onMessageUpdated?.(message);
    });

    startConnection();

    return () => {
      isMounted = false;
      if (connectionRef.current) {
        // Leave the group properly only if fully connected
        if (connectionRef.current.state === signalR.HubConnectionState.Connected) {
          connectionRef.current.invoke('LeaveQueueGroup', queueId).catch(console.error);
        }
        
        connectionRef.current.stop()
          .then(() => {
            if (isMounted) setIsConnected(false);
          })
          .catch(console.error);
      }
    };
  }, [queueId]);

  return { isConnected, connection: connectionRef.current };
}
