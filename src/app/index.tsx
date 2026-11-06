import { Redirect } from 'expo-router';
import { useUser } from '@/ui/hooks';

export default function Index() {
  const u = useUser();
  if (!u) return <Redirect href="/login" />;
  return <Redirect href={u.role === 'student' ? '/(hs)' : '/(cb)'} />;
}
