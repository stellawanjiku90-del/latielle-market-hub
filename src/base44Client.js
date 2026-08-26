import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

let _client = null;

function getClient() {
  if (!_client) {
    _client = createClient({
      appId,
      token,
      functionsVersion,
      serverUrl: '',
      requiresAuth: false,
      appBaseUrl
    });
  }
  return _client;
}

export const base44 = new Proxy({}, {
  get(_, prop) {
    return getClient()[prop];
  }
});