import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

export function usePageTracking() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Fire-and-forget — don't block anything
    api.post('/track', { path: pathname }).catch(() => {});
  }, [pathname]);
}
