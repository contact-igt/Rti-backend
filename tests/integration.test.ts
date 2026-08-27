import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';

type JsonObject = Record<string, any>;

let server: Server;
let baseUrl: string;
let modules: {
  clearLoginRateLimits: () => void;
  getOwnedApplicationById: (id: string, owner: string) => unknown;
  initializeDemoState: () => unknown;
  lookupSession: (token: string, now?: Date) => { status: string };
  resetDemoState: () => unknown;
  sessionStore: { create: (userId: string, ttlMinutes: number, now?: Date) => { token: string } };
  useApplicationStore: (store: unknown) => void;
  InMemoryDemoApplicationStore: new () => unknown;
};

const demoEmail = 'release-test@example.invalid';
const demoPassword = 'release-test-password';
const allowedOrigin = 'http://localhost:3000';

before(async () => {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DEMO_MODE: 'true',
    DEMO_USER_EMAIL: demoEmail,
    DEMO_USER_PASSWORD: demoPassword,
    DEMO_SESSION_TTL_MINUTES: '30',
    DEMO_PAYMENT_PROOF_TTL_MINUTES: '15',
    LOGIN_RATE_LIMIT_MAX: '5',
    LOGIN_RATE_LIMIT_WINDOW_MS: '60000',
    JSON_BODY_LIMIT: '1mb',
    FRONTEND_ORIGIN: allowedOrigin,
    OPENAI_API_KEY: '',
    OPENAI_MODEL: '',
    OPENAI_RTI_VECTOR_STORE_ID: ''
  });

  const [{ app }, rateLimit, applicationStore, demoState, auth, sessions] = await Promise.all([
    import('../src/app.js'),
    import('../src/middleware/login-rate-limit.js'),
    import('../src/stores/application.store.js'),
    import('../src/services/demo-state.service.js'),
    import('../src/services/demo-auth.service.js'),
    import('../src/stores/session.store.js')
  ]);
  modules = {
    clearLoginRateLimits: rateLimit.clearLoginRateLimits,
    getOwnedApplicationById: (await import('../src/services/rti-application.service.js'))
      .getOwnedApplicationById,
    initializeDemoState: demoState.initializeDemoState,
    lookupSession: auth.lookupSession,
    resetDemoState: demoState.resetDemoState,
    sessionStore: sessions.sessionStore,
    useApplicationStore: applicationStore.useApplicationStore,
    InMemoryDemoApplicationStore: applicationStore.InMemoryDemoApplicationStore
  };
  modules.useApplicationStore(new modules.InMemoryDemoApplicationStore());
  modules.resetDemoState();
  modules.clearLoginRateLimits();

  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert(address && typeof address === 'object');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function request(
  path: string,
  options: RequestInit & { json?: unknown } = {}
): Promise<{ status: number; headers: Headers; body: JsonObject }> {
  const headers = new Headers(options.headers);
  let body = options.body;
  if ('json' in options) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(options.json);
  }
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers, body });
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: text ? JSON.parse(text) : {}
  };
}

async function login(): Promise<string> {
  const response = await request('/api/auth/login', {
    method: 'POST',
    json: { email: demoEmail, password: demoPassword }
  });
  assert.equal(response.status, 200);
  return response.body.data.session.token;
}

function auth(token: string): HeadersInit {
  return { authorization: `Bearer ${token}` };
}

function centralReviewInput() {
  const problem =
    'My Central Government pension application is delayed and I need its recorded processing status.';
  const analysis = {
    issueType: 'Pension application processing delay',
    informationNeeded: ['Current status', 'File movement history', 'Recorded reasons for delay'],
    jurisdiction: 'central',
    clarificationNeeded: false,
    clarificationQuestion: null
  };
  const authority = {
    authorityId: 'central-doppw',
    authorityName: "Department of Pension & Pensioners' Welfare",
    jurisdiction: 'central'
  };
  const draft = {
    subject: 'Information regarding pension application processing',
    context: 'I seek records about the processing of my pension application.',
    questions: [
      'Please provide the current recorded status of the pension application.',
      'Please provide available file movement records and dates.',
      'Please provide copies of records containing reasons for any delay.'
    ],
    authorityId: authority.authorityId,
    warnings: []
  };
  const applicant = {
    fullName: 'Release Test Citizen',
    email: demoEmail,
    phone: null,
    addressLine1: 'Test Address, Central District',
    addressLine2: null,
    city: 'New Delhi',
    stateOrUt: 'Delhi',
    postalCode: '110001',
    country: 'India',
    citizenshipConfirmed: true,
    bplStatus: 'no'
  };
  return { problem, analysis, authority, draft, applicant, documents: [] };
}

test('BE-14 isolated integration and regression suite', async (t) => {
  await t.test('security headers, aligned degraded health, and CORS', async () => {
    const health = await request('/health');
    const versioned = await request('/api/v1/health');
    assert.equal(health.status, 200);
    assert.deepEqual(versioned.body, health.body);
    assert.equal(health.body.applicationStore, 'memory');
    assert.equal(health.body.database, 'unavailable');
    assert.equal(health.body.ai, 'degraded');
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(health.headers.get('x-frame-options'), 'DENY');
    assert.equal(health.headers.get('x-powered-by'), null);

    const preflight = await request('/api/auth/login', {
      method: 'OPTIONS',
      headers: { origin: allowedOrigin, 'access-control-request-method': 'POST' }
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), allowedOrigin);
    const denied = await request('/health', { headers: { origin: 'https://unexpected.example' } });
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
  });

  await t.test('malformed and oversized JSON fail safely', async () => {
    const invalid = await request('/api/rti/analyse', {
      method: 'POST',
      json: { problem: 'too short' }
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, 'INVALID_INPUT');

    const malformed = await request('/api/rti/analyse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"problem":'
    });
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.error.code, 'INVALID_INPUT');

    const oversized = await request('/api/rti/analyse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ problem: 'x'.repeat(1_100_000) })
    });
    assert.equal(oversized.status, 413);
    assert.equal(oversized.body.error.code, 'REQUEST_TOO_LARGE');
  });

  await t.test('auth lifecycle, invalid login, expiry, and rate limiting', async () => {
    modules.clearLoginRateLimits();
    const token = await login();
    const session = await request('/api/auth/session', { headers: auth(token) });
    assert.equal(session.status, 200);
    assert.equal(session.body.data.authenticated, true);
    const logout = await request('/api/auth/logout', { method: 'POST', headers: auth(token) });
    assert.equal(logout.status, 200);
    assert.equal((await request('/api/auth/session', { headers: auth(token) })).status, 401);

    modules.clearLoginRateLimits();
    for (let index = 0; index < 5; index += 1) {
      const invalid = await request('/api/auth/login', {
        method: 'POST',
        json: { email: demoEmail, password: 'wrong-password' }
      });
      assert.equal(invalid.status, 401);
      assert.equal(invalid.body.error.code, 'INVALID_CREDENTIALS');
    }
    const limited = await request('/api/auth/login', {
      method: 'POST',
      json: { email: demoEmail, password: 'wrong-password' }
    });
    assert.equal(limited.status, 429);
    assert.equal(limited.body.error.code, 'TOO_MANY_ATTEMPTS');

    const expired = modules.sessionStore.create('user_demo_citizen', -1);
    assert.equal(modules.lookupSession(expired.token).status, 'expired');
    modules.clearLoginRateLimits();
  });

  await t.test('analysis, authority, draft, applicant, and review fallback flow', async () => {
    const input = centralReviewInput();
    const analysed = await request('/api/rti/analyse', {
      method: 'POST',
      json: { problem: input.problem }
    });
    assert.equal(analysed.status, 200);
    assert.equal(analysed.body.meta.source, 'fallback');

    const authority = await request('/api/rti/authority', {
      method: 'POST',
      json: { analysis: input.analysis, jurisdictionAnswer: 'central' }
    });
    assert.equal(authority.status, 200);
    assert.equal(authority.body.data.status, 'recommended');

    const draft = await request('/api/rti/draft', {
      method: 'POST',
      json: { problem: input.problem, analysis: input.analysis, authority: input.authority }
    });
    assert.equal(draft.status, 200);
    assert.equal(draft.body.meta.source, 'fallback');

    assert.equal(
      (await request('/api/rti/applicant/validate', { method: 'POST', json: input.applicant }))
        .status,
      200
    );
    const review = await request('/api/rti/review', { method: 'POST', json: input });
    assert.equal(review.status, 200);
    assert.equal(review.body.data.feeStatus, 'standard_fee');
  });

  await t.test('State flow is blocked before filing progression', async () => {
    const stateAnalysis = {
      issueType: 'State service records',
      informationNeeded: ['Status records'],
      jurisdiction: 'state',
      clarificationNeeded: false,
      clarificationQuestion: null
    };
    const authority = await request('/api/rti/authority', {
      method: 'POST',
      json: { analysis: stateAnalysis, jurisdictionAnswer: 'state', state: 'Karnataka' }
    });
    assert.equal(authority.status, 422);
    assert.equal(authority.body.error.code, 'STATE_FLOW_NOT_SUPPORTED');

    const stateDraft = await request('/api/rti/draft', {
      method: 'POST',
      json: {
        problem: 'I need Karnataka department processing records for my State application.',
        analysis: stateAnalysis,
        authority: { authorityId: 'state-invented', authorityName: 'Invented State Office', jurisdiction: 'state' }
      }
    });
    assert.equal(stateDraft.status, 422);
    assert.equal(stateDraft.body.error.code, 'STATE_FLOW_NOT_SUPPORTED');
  });

  await t.test('server-issued payment proof, application, idempotency, tracking, reply, and appeal', async () => {
    modules.clearLoginRateLimits();
    const token = await login();
    const input = centralReviewInput();
    const review = { ...input, feeStatus: 'standard_fee' };

    assert.equal((await request('/api/rti/payment', { method: 'POST', json: { feeStatus: 'standard_fee', mode: 'demo_upi' } })).status, 401);
    const issued = await request('/api/rti/payment', {
      method: 'POST',
      headers: auth(token),
      json: { feeStatus: 'standard_fee', mode: 'demo_upi' }
    });
    assert.equal(issued.status, 200);
    const { payment, paymentProofToken } = issued.body.data;

    const failedPayment = await request('/api/rti/payment', {
      method: 'POST',
      headers: auth(token),
      json: { feeStatus: 'standard_fee', mode: 'demo_card', simulateFailure: true }
    });
    const failedSubmission = await request('/api/rti/applications', {
      method: 'POST',
      headers: auth(token),
      json: {
        submissionKey: 'release-failed-payment',
        review,
        payment: failedPayment.body.data.payment,
        paymentProofToken: failedPayment.body.data.paymentProofToken
      }
    });
    assert.equal(failedSubmission.status, 422);
    assert.equal(failedSubmission.body.error.code, 'PAYMENT_FAILED');

    const forged = await request('/api/rti/applications', {
      method: 'POST',
      headers: auth(token),
      json: {
        submissionKey: 'release-forged-payment',
        review,
        payment: { ...payment, amountPaise: 0 },
        paymentProofToken
      }
    });
    assert.equal(forged.status, 422);
    assert.equal(forged.body.error.code, 'PAYMENT_PROOF_INVALID');

    const bplPayment = await request('/api/rti/payment', {
      method: 'POST',
      headers: auth(token),
      json: { feeStatus: 'bpl_exempt', mode: 'bpl_exempt' }
    });
    const missingBplProof = await request('/api/rti/applications', {
      method: 'POST',
      headers: auth(token),
      json: {
        submissionKey: 'release-bpl-without-proof',
        review: {
          ...review,
          applicant: { ...review.applicant, bplStatus: 'yes' },
          feeStatus: 'bpl_exempt'
        },
        payment: bplPayment.body.data.payment,
        paymentProofToken: bplPayment.body.data.paymentProofToken
      }
    });
    assert.equal(missingBplProof.status, 422);
    assert.equal(missingBplProof.body.error.code, 'BPL_PROOF_REQUIRED');

    const submission = {
      submissionKey: 'release-central-application',
      review,
      payment,
      paymentProofToken
    };
    const created = await request('/api/rti/applications', {
      method: 'POST',
      headers: auth(token),
      json: submission
    });
    assert.equal(created.status, 200);
    const application = created.body.data.application;
    assert.equal(application.registrationNumber.endsWith('-000003'), true);

    const repeated = await request('/api/rti/applications', {
      method: 'POST',
      headers: auth(token),
      json: submission
    });
    assert.equal(repeated.status, 200);
    assert.equal(repeated.body.data.application.id, application.id);

    const reusedProof = await request('/api/rti/applications', {
      method: 'POST',
      headers: auth(token),
      json: { ...submission, submissionKey: 'release-reused-proof' }
    });
    assert.equal(reusedProof.status, 422);
    assert.equal(reusedProof.body.error.code, 'PAYMENT_PROOF_USED');

    const list = await request('/api/rti/applications', { headers: auth(token) });
    assert.equal(list.status, 200);
    assert(list.body.data.some((item: JsonObject) => item.id === application.id));
    const detail = await request(`/api/rti/applications/${application.id}`, { headers: auth(token) });
    assert.equal(detail.status, 200);
    assert.equal(modules.getOwnedApplicationById(application.id, 'wrong-owner'), undefined);

    const tracked = await request(`/api/rti/track/${application.registrationNumber}`);
    assert.equal(tracked.status, 200);
    assert.equal('applicant' in tracked.body.data, false);
    assert.equal('payment' in tracked.body.data, false);
    assert.equal('governmentReply' in tracked.body.data, false);

    const reply = await request(`/api/rti/applications/${application.id}/reply`, {
      method: 'POST',
      headers: auth(token),
      json: { scenario: 'pension_partial_reply' }
    });
    assert.equal(reply.status, 200);
    const analysed = await request(`/api/rti/applications/${application.id}/reply/analyse`, {
      method: 'POST',
      headers: auth(token),
      json: {}
    });
    assert.equal(analysed.status, 200);
    assert.equal(analysed.body.meta.source, 'fallback');
    assert.equal(
      (await request(`/api/rti/applications/${application.id}/appeal/guidance`, { headers: auth(token) })).status,
      200
    );
    assert.equal(
      (
        await request(`/api/rti/applications/${application.id}/appeal/draft`, {
          method: 'POST',
          headers: auth(token),
          json: {}
        })
      ).status,
      200
    );
  });

  await t.test('unknown resources and RAG provider absence fail safely', async () => {
    modules.clearLoginRateLimits();
    const token = await login();
    assert.equal((await request('/api/rti/applications/unknown', { headers: auth(token) })).status, 404);
    assert.equal((await request('/api/rti/track/UNKNOWN-REGISTRATION')).status, 404);
    const knowledge = await request('/api/rti/knowledge/ask', {
      method: 'POST',
      json: { question: 'What is the Right to Information Act, 2005?', jurisdiction: 'central' }
    });
    assert.equal(knowledge.status, 200);
    assert.equal(knowledge.body.data.grounded, false);
    assert.equal(knowledge.body.meta.source, 'fallback');
  });

  await t.test('demo reset restores seeds and invalidates sessions and payment proofs', async () => {
    modules.clearLoginRateLimits();
    const token = await login();
    const reset = await request('/api/demo/reset', { method: 'POST', headers: auth(token), json: {} });
    assert.equal(reset.status, 200);
    assert.equal(reset.body.data.applications, 2);
    assert.equal((await request('/api/auth/session', { headers: auth(token) })).status, 401);
    modules.clearLoginRateLimits();
    const freshToken = await login();
    const list = await request('/api/rti/applications', { headers: auth(freshToken) });
    assert.deepEqual(
      list.body.data.map((item: JsonObject) => item.id).sort(),
      ['app_demo_pending', 'app_demo_pension']
    );
  });
});
