import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from './server.js';

test('market summary and neighborhoods endpoints are available', async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const port = server.address().port;
    const marketResponse = await fetch(`http://127.0.0.1:${port}/api/market-summary`);
    const market = await marketResponse.json();
    assert.equal(marketResponse.status, 200);
    assert.ok(Array.isArray(market.neighborhoods));
    assert.ok(typeof market.overview === 'object');

    const neighborhoodsResponse = await fetch(`http://127.0.0.1:${port}/api/neighborhoods`);
    const neighborhoods = await neighborhoodsResponse.json();
    assert.equal(neighborhoodsResponse.status, 200);
    assert.ok(Array.isArray(neighborhoods.areas));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('property and location APIs return database-backed coordinates for listings', async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/properties`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(payload.properties));
    assert.ok(payload.properties.length > 0);
    const first = payload.properties[0];
    assert.ok(Number.isFinite(Number(first.lat)) || Number.isFinite(Number(first.latitude)));
    assert.ok(Number.isFinite(Number(first.lng)) || Number.isFinite(Number(first.longitude)));

    const locationsResponse = await fetch(`http://127.0.0.1:${port}/api/locations`);
    const locationsPayload = await locationsResponse.json();
    assert.equal(locationsResponse.status, 200);
    assert.ok(Array.isArray(locationsPayload.locations));
    assert.ok(locationsPayload.locations.length > 0);
    const location = locationsPayload.locations[0];
    assert.ok(Number.isFinite(Number(location.lat)));
    assert.ok(Number.isFinite(Number(location.lng)));

    const adminInventoryResponse = await fetch(`http://127.0.0.1:${port}/api/admin/properties`);
    assert.equal(adminInventoryResponse.status, 401);
    const publicCreateResponse = await fetch(`http://127.0.0.1:${port}/api/admin/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Unauthorized listing', city: 'Dar es Salaam', price: 'TZS 1' }),
    });
    assert.equal(publicCreateResponse.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('agent CRM persists qualified leads, rejects duplicates, and records lifecycle activity', async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const port = server.address().port;
    const unauthorizedResponse = await fetch(`http://127.0.0.1:${port}/api/agent/leads`);
    assert.equal(unauthorizedResponse.status, 401);

    const loginResponse = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'agent@flx.local', password: 'agent123' }),
    });
    const login = await loginResponse.json();
    assert.equal(loginResponse.status, 200);
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${login.token}` };
    const dashboardResponse = await fetch(`http://127.0.0.1:${port}/api/agent/dashboard`, { headers });
    const agentDashboard = await dashboardResponse.json();
    assert.equal(agentDashboard.profile.name, login.user.name);
    assert.deepEqual(agentDashboard.deals, []);
    assert.deepEqual(agentDashboard.contracts, []);
    const email = `crm-${randomUUID()}@example.test`;
    const phone = `+255 7${randomUUID().replace(/\D/g, '').padEnd(8, '0').slice(0, 8)}`;
    const nextContactAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const createResponse = await fetch(`http://127.0.0.1:${port}/api/agent/leads`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Mbezi rental search',
        client_name: 'Test Client',
        client_email: email,
        client_phone: phone,
        source: 'Website campaign',
        intent: 'Rent',
        budget: 850000,
        preferred_area: 'Mbezi',
        consent: true,
        urgency: 'High',
        next_contact_at: nextContactAt,
        assigned_agent_id: 'agent-test',
      }),
    });
    const created = await createResponse.json();

    assert.equal(createResponse.status, 201);
    assert.match(created.lead.id, /^[0-9a-f-]{36}$/i);
    assert.equal(created.lead.stage, 'New');
    assert.equal(created.lead.client_email, email);
    assert.equal(created.lead.intent, 'Rent');
    assert.equal(created.lead.consent, true);
    assert.ok(created.lead.created_at);
    assert.equal(created.lead.owner_id, String(login.user.id));
    assert.equal(created.lead.assigned_agent_id, 'agent-test');

    const assignmentResponse = await fetch(`http://127.0.0.1:${port}/api/agent/leads/bulk-assign`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ lead_ids: [created.lead.id], assigned_agent_id: 'agent-reassigned' }),
    });
    assert.equal(assignmentResponse.status, 200);

    const duplicateResponse = await fetch(`http://127.0.0.1:${port}/api/agent/leads`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'Duplicate', client_email: email }),
    });
    assert.equal(duplicateResponse.status, 409);

    const duplicatePhoneResponse = await fetch(`http://127.0.0.1:${port}/api/agent/leads`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'Duplicate phone', client_phone: phone }),
    });
    assert.equal(duplicatePhoneResponse.status, 409);

    const invalidLostResponse = await fetch(`http://127.0.0.1:${port}/api/agent/leads/${created.lead.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ stage: 'Lost' }),
    });
    assert.equal(invalidLostResponse.status, 400);

    const stageResponse = await fetch(`http://127.0.0.1:${port}/api/agent/leads/${created.lead.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ stage: 'Qualified', actor_id: 'agent-test' }),
    });
    assert.equal(stageResponse.status, 200);

    const [activitiesResponse, tasksResponse] = await Promise.all([
      fetch(`http://127.0.0.1:${port}/api/agent/leads/${created.lead.id}/activities`, { headers }),
      fetch(`http://127.0.0.1:${port}/api/agent/leads/${created.lead.id}/tasks`, { headers }),
    ]);
    const { activities } = await activitiesResponse.json();
    const { tasks } = await tasksResponse.json();
    assert.ok(activities.some((activity) => activity.type === 'stage_changed' && activity.body.includes('New -> Qualified')));
    assert.ok(activities.some((activity) => activity.type === 'assigned' && activity.body.includes('agent-reassigned')));
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].due_at, nextContactAt);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('client property requests require consent and never claim a payment or reservation', async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const port = server.address().port;
    const email = `request-${randomUUID()}@example.test`;
    const requestBody = {
      client_name: 'Property Request Test',
      client_email: email,
      intent: 'Rent',
      consent: true,
      preferred_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    const consentResponse = await fetch(`http://127.0.0.1:${port}/api/properties/1/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...requestBody, consent: false }),
    });
    assert.equal(consentResponse.status, 400);

    const wrongIntentResponse = await fetch(`http://127.0.0.1:${port}/api/properties/1/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...requestBody, intent: 'Buy' }),
    });
    assert.equal(wrongIntentResponse.status, 400);

    const response = await fetch(`http://127.0.0.1:${port}/api/properties/1/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const payload = await response.json();
    assert.equal(response.status, 201);
    assert.equal(payload.request.status, 'Awaiting availability review');
    assert.equal(payload.payment_enabled, false);
    assert.match(payload.message, /not a reservation.*or payment/i);

    const duplicateResponse = await fetch(`http://127.0.0.1:${port}/api/properties/1/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    assert.equal(duplicateResponse.status, 409);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('landing-page contact form records one consented CRM request', async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const port = server.address().port;
    const body = {
      client_name: 'Landing Contact Test',
      client_email: `landing-${randomUUID()}@example.test`,
      message: 'Please contact me about current rental options.',
      consent: true,
    };
    const response = await fetch(`http://127.0.0.1:${port}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    assert.equal(response.status, 201);
    assert.equal(payload.request.status, 'Awaiting FLX response');

    const duplicateResponse = await fetch(`http://127.0.0.1:${port}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal(duplicateResponse.status, 409);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('production root route serves the built Vite app', async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /<div id="root"><\/div>|<script type="module"/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
