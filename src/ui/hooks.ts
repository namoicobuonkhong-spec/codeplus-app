/* Móc dữ liệu thời gian thực + đồng hồ. */
import { createContext, useContext, useEffect, useState } from 'react';
import { api, type Filter } from '../data/api';
import type { UserDoc } from '../../shared/logic';

export function useDoc<T = any>(path: string | null | undefined): T | null | undefined {
  const [v, setV] = useState<T | null | undefined>(undefined);
  useEffect(() => { if (!path) { setV(null); return; } setV(undefined); return api.watchDoc<T>(path, setV); }, [path]);
  return v;
}
export function useQuery<T = any>(coll: string | null | undefined, filters: Filter[] = []): T[] | undefined {
  const key = coll ? coll + JSON.stringify(filters) : '';
  const [v, setV] = useState<T[] | undefined>(undefined);
  useEffect(() => { if (!coll) { setV([]); return; } setV(undefined); return api.watchQuery<T>(coll, filters, setV); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}
export function useNow(ms = 1000) {
  const [n, setN] = useState(api.now());
  useEffect(() => { const t = setInterval(() => setN(api.now()), ms); return () => clearInterval(t); }, [ms]);
  return n;
}

export const AuthCtx = createContext<{ user: UserDoc | null | undefined }>({ user: undefined });
export const useUser = () => useContext(AuthCtx).user;
export const useMe = () => useContext(AuthCtx).user as UserDoc;
