import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { useStore } from '../lib/store';

export default function Index() {
  const [target, setTarget] = useState<'/(tabs)/lenda' | '/setup' | null>(null);
  const setCredentials = useStore((s) => s.setCredentials);

  useEffect(() => {
    // Handle companion://connect?url=...&secret=... deep link (from dashboard QR)
    async function handleDeepLink(url: string) {
      const parsed = Linking.parse(url);
      const wsUrl = parsed.queryParams?.url as string | undefined;
      const secret = parsed.queryParams?.secret as string | undefined;
      if (parsed.scheme === 'companion' && parsed.path === 'connect' && wsUrl && secret) {
        try {
          const httpBase = wsUrl.replace(/^ws:\/\//i, 'http://').replace(/^wss:\/\//i, 'https://');
          const r = await fetch(`${httpBase}/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret }),
          });
          if (r.ok) {
            const { token } = await r.json() as { token: string };
            await SecureStore.setItemAsync('serverUrl', wsUrl);
            await SecureStore.setItemAsync('token', token);
            setCredentials(wsUrl, token);
            setTarget('/(tabs)/lenda');
            return;
          }
        } catch {}
      }
    }

    // Check for initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Listen for deep links while app is open
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

    // Normal startup: check stored credentials
    SecureStore.getItemAsync('serverUrl').then((url) =>
      SecureStore.getItemAsync('token').then((token) => {
        setTarget(url && token ? '/(tabs)/lenda' : '/setup');
      })
    );

    return () => sub.remove();
  }, []);

  if (!target) return null;
  return <Redirect href={target} />;
}
