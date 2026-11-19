import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, createApiClient } from '../../shared/api/apiClient';
import { getApiBaseUrl } from '../../shared/api/apiConfig';
import { useAuth } from '../auth/AuthContext';
import { listApiAttempts, listApiNotifications, markApiNotificationRead, type ApiNotification, type ApiNotificationAttempt } from './notificationsApi';
interface State { notices: ApiNotification[]; attempts: ApiNotificationAttempt[]; busy: boolean; loaded: boolean; error: string; uncertain: boolean }
const initial = (signedIn: boolean): State => ({ notices: [], attempts: [], busy: signedIn, loaded: false, error: '', uncertain: false });
export function useNotificationApi(mode: 'inbox' | 'attempts') {
  const { session, invalidateSession } = useAuth();
  const token = session?.accessToken ?? null;
  const userId = session?.user.id;
  const [owner, setOwner] = useState(token);
  const [state, setState] = useState<State>(() => initial(Boolean(token)));
  if (owner !== token) { setOwner(token); setState(initial(Boolean(token))); }
  const pending = useRef<AbortController | null>(null);
  const read = useCallback(() => {
    if (!token || userId === undefined || pending.current) return Promise.resolve(false);
    const controller = new AbortController(); pending.current = controller;
    return Promise.resolve().then(async () => {
      const client = createApiClient(getApiBaseUrl());
      const notices = mode === 'inbox' ? await listApiNotifications(client, token, userId, controller.signal) : [];
      const attempts = mode === 'attempts' ? await listApiAttempts(client, token, controller.signal) : [];
      if (controller.signal.aborted) return false;
      setState({ notices, attempts, loaded: true, busy: false, error: '', uncertain: false });
      return true;
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return false;
      if (cause instanceof ApiError && cause.status === 401) invalidateSession(token);
      setState((previous) => ({ ...previous, busy: false, error: cause instanceof ApiError && cause.status === 403 ? 'No tienes permiso para consultar esta información.' : cause instanceof Error ? cause.message : 'No se pudo consultar la información.' }));
      return false;
    }).finally(() => { if (pending.current === controller) pending.current = null; });
  }, [token, userId, mode, invalidateSession]);
  useEffect(() => {
    void read();
    return () => { pending.current?.abort(); pending.current = null; };
  }, [read]);
  function refresh() {
    if (pending.current) return Promise.resolve(false);
    setState((previous) => ({ ...previous, busy: true, error: '' }));
    return read();
  }
  async function markRead(notificationId: number) {
    if (mode !== 'inbox' || !token || userId === undefined || pending.current || state.uncertain || !state.loaded || !state.notices.some((notice) => notice.id === notificationId && !notice.isRead)) return { ok: false, message: '' };
    const controller = new AbortController(); pending.current = controller;
    setState((previous) => ({ ...previous, busy: true, error: '' }));
    try {
      const client = createApiClient(getApiBaseUrl());
      await markApiNotificationRead(client, token, controller.signal, notificationId);
      const notices = await listApiNotifications(client, token, userId, controller.signal);
      if (controller.signal.aborted) return { ok: false, message: '' };
      setState({ notices, attempts: [], loaded: true, busy: false, error: '', uncertain: false });
      const confirmed = notices.find((notice) => notice.id === notificationId);
      return { ok: true, message: confirmed?.isRead ? 'Notificación marcada como leída y confirmada por el servidor.' : 'Bandeja consultada. El servidor todavía no confirma ese aviso como leído.' };
    } catch (cause: unknown) {
      if (controller.signal.aborted) return { ok: false, message: '' };
      if (cause instanceof ApiError && cause.status === 401) invalidateSession(token);
      const message = cause instanceof ApiError && cause.status === 403 ? 'No tienes permiso para marcar esta notificación.' : cause instanceof Error ? cause.message : 'No se pudo actualizar la notificación.';
      setState((previous) => ({ ...previous, busy: false, uncertain: true, error: `${message} Consulta la bandeja antes de repetir la acción.` }));
      return { ok: false, message: '' };
    } finally { if (pending.current === controller) pending.current = null; }
  }
  return { ...state, refresh, markRead };
}
