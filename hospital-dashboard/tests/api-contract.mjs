import assert from 'node:assert/strict';
import { createServer } from 'vite';

const session = new Map();
globalThis.window = {
  sessionStorage: { getItem: (key) => session.get(key) ?? null, setItem: (key, value) => session.set(key, value), removeItem: (key) => session.delete(key) },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
};

const requests = [];
globalThis.fetch = async (url, options = {}) => {
  requests.push({ url: String(url), ...options });
  return new Response(JSON.stringify(String(url).endsWith('/login')
    ? { access_token: 'test-token', hospital: { hospital_id: 1, name: 'Test Hospital' } }
    : {}), { headers: { 'Content-Type': 'application/json' } });
};

function assertRequest(requestsSinceCall, method, suffix) {
  const match = requestsSinceCall.find((request) => (request.method ?? 'GET') === method && request.url.endsWith(suffix));
  assert(match, `Expected ${method} ${suffix}`);
  assert.equal(match.headers.Authorization, 'Bearer test-token');
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { apiProviders: providers } = await server.ssrLoadModule('/src/providers/api/apiProviders.ts');
  await providers.auth.login('demo@example.test', 'fictional-test');

  const operations = [
    ['getResources', ['HSP-001'], 'GET', '/hospitals/HSP-001'],
    ['updateBeds', ['HSP-001', { general: { total: 1, occupied: 0 }, icu: { total: 1, occupied: 0 }, emergency: { total: 1, occupied: 0 } }], 'PUT', '/hospitals/HSP-001'],
    ['createDoctor', ['HSP-001', { name: 'Test' }], 'POST', '/hospitals/HSP-001/doctors/'],
    ['updateDoctor', ['HSP-001', 'id/1', { name: 'Updated' }], 'PUT', '/hospitals/HSP-001/doctors/id%2F1'],
    ['deleteDoctor', ['HSP-001', 'id/1'], 'DELETE', '/hospitals/HSP-001/doctors/id%2F1'],
    ['createAmbulance', ['HSP-001', { vehicleNumber: 'TEST' }], 'POST', '/hospitals/HSP-001/ambulances/'],
    ['updateAmbulance', ['HSP-001', 'id/1', {}], 'PUT', '/hospitals/HSP-001/ambulances/id%2F1'],
    ['deleteAmbulance', ['HSP-001', 'id/1'], 'DELETE', '/hospitals/HSP-001/ambulances/id%2F1'],
  ];

  for (const [method, args, verb, suffix] of operations) {
    const start = requests.length;
    await providers.resource[method](...args);
    assertRequest(requests.slice(start), verb, suffix);
  }

  const start = requests.length;
  await providers.auth.register({ hospitalName: 'Test' });
  assertRequest(requests.slice(start), 'POST', '/hospitals/');
  console.log('PASS: dashboard API paths, verbs, encoded identifiers, and authorization headers match the current backend adapter. Fetch is mocked; no live backend is modified.');
} finally {
  await server.close();
}
