
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { socketUpdateSession } from '../features/sessions/sessionSlice';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL.replace('/api', '');

// Singleton socket — one persistent connection for the whole app session
let globalSocket = null;
let globalUserId = null;

const useSocket = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const socketRef = useRef(null);
  const navigateRef = useRef(navigate);

  // Keep navigateRef always current (no dependency issues)
  navigateRef.current = navigate;

  useEffect(() => {
    if (!user || !user._id) {
      // User logged out — clean up socket
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
        globalUserId = null;
      }
      return;
    }

    // Same user already has an active socket — just return it
    if (globalSocket && globalSocket.connected && globalUserId === user._id) {
      socketRef.current = globalSocket;
      return;
    }

    // Disconnect stale socket (e.g. different user or disconnected state)
    if (globalSocket) {
      globalSocket.disconnect();
      globalSocket = null;
    }

    const socket = io(BACKEND_URL, {
      query: { userId: user._id },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    globalSocket = socket;
    globalUserId = user._id;
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.io connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket.io disconnected:', reason);
    });

    socket.on('sessionUpdate', (payload) => {
      console.log('Real-time Session Update:', payload.status);
      dispatch(socketUpdateSession(payload));
      if (payload.status === 'QUESTIONS_READY') {
        navigateRef.current(`/interview/${payload.sessionId}`);
      }
    });

    // No cleanup disconnect — socket stays alive across page navigations
    return () => {};
  }, [user?._id, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  return socketRef.current;
};

export default useSocket;