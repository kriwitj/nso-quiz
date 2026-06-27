'use client';
import { useEffect, useRef, useCallback } from 'react';
import { getSocket, connectSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';

export function useSocket(autoConnect = true) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (autoConnect) {
      socketRef.current = connectSocket();
    } else {
      socketRef.current = getSocket();
    }

    return () => {
      // Don't disconnect on unmount — connection is shared
    };
  }, [autoConnect]);

  const emit = useCallback((event: string, data?: any) => {
    const s = socketRef.current || getSocket();
    s.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    const s = socketRef.current || getSocket();
    s.on(event, handler);
    return () => s.off(event, handler);
  }, []);

  const off = useCallback((event: string, handler?: (...args: any[]) => void) => {
    const s = socketRef.current || getSocket();
    if (handler) s.off(event, handler);
    else s.off(event);
  }, []);

  return { socket: socketRef.current, emit, on, off };
}
