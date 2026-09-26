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

test('admin demo account uses the documented password and logs in successfully', async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@flx.local', password: 'admin123' }),
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.user.role, 'Admin');
    assert.ok(payload.token);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('investor demo account uses the documented password and logs in successfully', async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'investor@flx.local', password: 'investor123' }),
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.user.role, 'Investor');
    assert.ok(payload.token);
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

test('property workbench links Owner, Agent, and Admin with admin-only publication', async () => {
  const app = createApp();
  const server = app.listen(0);

  const login = async (port, email, password) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(response.status, 200);
    return response.json();
  };

  try {
    const port = server.address().port;
    const [owner, agent, admin, client] = await Promise.all([
      login(port, 'owner@flx.local', 'owner123'),
      login(port, 'agent@flx.local', 'agent123'),
      login(port, 'admin@flx.local', 'admin123'),
      login(port, 'client@flx.local', 'client123'),
    ]);
    const headers = (token) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

    const clientDenied = await fetch(`http://127.0.0.1:${port}/api/property-workbench`, { headers: headers(client.token) });
    assert.equal(clientDenied.status, 403);

    const assignmentOptions = await fetch(`http://127.0.0.1:${port}/api/property-workbench/users`, { headers: headers(owner.token) });
    const options = await assignmentOptions.json();
    assert.ok(options.agents.some((record) => Number(record.id) === Number(agent.user.id)));

    const createResponse = await fetch(`http://127.0.0.1:${port}/api/property-workbench`, {
      method: 'POST',
      headers: headers(owner.token),
      body: JSON.stringify({
        title: 'Workbench apartment test',
        city: 'Mikocheni, Dar es Salaam',
        price: 'TZS 950,000',
        period: 'per month',
        transaction_type: 'Rent',
        property_kind: 'Apartment',
        unit_label: 'Flat 3B',
        bedrooms: 2,
        bathrooms: 2,
        description: 'Test record for the property workbench.',
        features: ['Wi-Fi', 'Balcony', 'Master bedroom'],
        images: ['https://example.test/property-front.jpg'],
        videos: ['https://example.test/property-tour.mp4'],
        lat: -6.774,
        lng: 39.245,
        agent_id: agent.user.id,
      }),
    });
    const created = await createResponse.json();
    assert.equal(createResponse.status, 201);
    assert.equal(created.property.approval_status, 'Pending');
    assert.equal(Number(created.property.owner_id), Number(owner.user.id));
    assert.equal(Number(created.property.agent_id), Number(agent.user.id));
    assert.deepEqual(created.property.features, ['Wi-Fi', 'Balcony', 'Master bedroom']);
    assert.deepEqual(created.property.images, ['https://example.test/property-front.jpg']);
    assert.deepEqual(created.property.videos, ['https://example.test/property-tour.mp4']);

    const uploadedPhoto = Buffer.from('property-photo-bytes');
    const uploadResponse = await fetch(`http://127.0.0.1:${port}/api/property-workbench/${created.property.id}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner.token}`, 'Content-Type': 'image/jpeg', 'X-Media-Kind': 'photo', 'X-File-Name': 'front-room.jpg' },
      body: uploadedPhoto,
    });
    const uploaded = await uploadResponse.json();
    assert.equal(uploadResponse.status, 201);
    assert.match(uploaded.media.url, /\/api\/properties\/\d+\/media\//);
    assert.equal(uploaded.approval_status, 'Pending');

    const notPublicYet = await fetch(`http://127.0.0.1:${port}/api/properties`);
    const unpublished = await notPublicYet.json();
    assert.ok(!unpublished.properties.some((record) => Number(record.id) === Number(created.property.id)));

    const ownerApprovalDenied = await fetch(`http://127.0.0.1:${port}/api/property-workbench/${created.property.id}/approval`, {
      method: 'PATCH', headers: headers(owner.token), body: JSON.stringify({ decision: 'Approved' }),
    });
    assert.equal(ownerApprovalDenied.status, 403);

    const agentUpdateResponse = await fetch(`http://127.0.0.1:${port}/api/property-workbench/${created.property.id}`, {
      method: 'PUT',
      headers: headers(agent.token),
      body: JSON.stringify({ ...created.property, description: 'Agent verified apartment details.' }),
    });
    const agentUpdated = await agentUpdateResponse.json();
    assert.equal(agentUpdateResponse.status, 200);
    assert.equal(agentUpdated.property.approval_status, 'Pending');
    assert.equal(agentUpdated.property.description, 'Agent verified apartment details.');

    const approvalResponse = await fetch(`http://127.0.0.1:${port}/api/property-workbench/${created.property.id}/approval`, {
      method: 'PATCH',
      headers: headers(admin.token),
      body: JSON.stringify({ decision: 'Approved', note: 'Details verified.' }),
    });
    const approved = await approvalResponse.json();
    assert.equal(approvalResponse.status, 200);
    assert.equal(approved.property.approval_status, 'Approved');

    const publicResponse = await fetch(`http://127.0.0.1:${port}/api/properties`);
    const publicPayload = await publicResponse.json();
    const publishedProperty = publicPayload.properties.find((record) => Number(record.id) === Number(created.property.id));
    assert.ok(publishedProperty);
    assert.ok(publishedProperty.images.includes(uploaded.media.url));
    const photoResponse = await fetch(`http://127.0.0.1:${port}${uploaded.media.url}`);
    assert.equal(photoResponse.status, 200);
    assert.equal(Buffer.from(await photoResponse.arrayBuffer()).toString(), uploadedPhoto.toString());

    const removePhotoResponse = await fetch(`http://127.0.0.1:${port}/api/property-workbench/${created.property.id}/media/${uploaded.media.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${owner.token}` },
    });
    assert.equal(removePhotoResponse.status, 200);
    const hiddenAfterMediaEdit = await fetch(`http://127.0.0.1:${port}/api/properties`);
    assert.ok(!(await hiddenAfterMediaEdit.json()).properties.some((record) => Number(record.id) === Number(created.property.id)));

    const approveAgain = await fetch(`http://127.0.0.1:${port}/api/property-workbench/${created.property.id}/approval`, {
      method: 'PATCH', headers: headers(admin.token), body: JSON.stringify({ decision: 'Approved', note: 'Media set checked.' }),
    });
    assert.equal(approveAgain.status, 200);

    const historyResponse = await fetch(`http://127.0.0.1:${port}/api/property-workbench/${created.property.id}/history`, { headers: headers(admin.token) });
    const historyPayload = await historyResponse.json();
    assert.ok(historyPayload.history.some((entry) => entry.action === 'created'));
    assert.ok(historyPayload.history.some((entry) => entry.action === 'updated'));
    assert.ok(historyPayload.history.some((entry) => entry.action === 'approval'));
    assert.ok(historyPayload.history.some((entry) => entry.action === 'media_added'));
    assert.ok(historyPayload.history.some((entry) => entry.action === 'media_removed'));

    const ownerDeleteResponse = await fetch(`http://127.0.0.1:${port}/api/property-workbench/${created.property.id}`, { method: 'DELETE', headers: headers(owner.token) });
    assert.equal(ownerDeleteResponse.status, 200);
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

test('server auth categorizes clients and routes Agent and Owner signups through Admin approval', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const headers = (token) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });
  const signup = (body) => fetch(`http://127.0.0.1:${port}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });

  try {
    const adminResponse = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@flx.local', password: 'admin123' }),
    });
    const admin = await adminResponse.json();
    assert.equal(adminResponse.status, 200);

    const invalidClient = await signup({ name: 'No Category', email: `nocat-${randomUUID()}@example.test`, password: 'Long-enough-test-password', role: 'Client' });
    assert.equal(invalidClient.status, 400);
    const publicAdmin = await signup({ name: 'Fake Admin', email: `fake-admin-${randomUUID()}@example.test`, password: 'Long-enough-test-password', role: 'Admin' });
    assert.equal(publicAdmin.status, 400);

    const clientEmail = `category-client-${randomUUID()}@example.test`;
    const clientResponse = await signup({ name: 'Hostel Scholar', email: clientEmail, password: 'Long-enough-test-password', role: 'Client', client_category: 'University scholar (hostel)' });
    const clientPayload = await clientResponse.json();
    assert.equal(clientResponse.status, 201);
    assert.equal(clientPayload.user.client_category, 'University scholar (hostel)');
    assert.equal(clientPayload.user.approval_status, 'Approved');

    const clientLoginResponse = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clientEmail, password: 'Long-enough-test-password' }),
    });
    const clientLogin = await clientLoginResponse.json();
    assert.equal(clientLoginResponse.status, 200);
    assert.equal(clientLogin.user.client_category, 'University scholar (hostel)');
    const profileResponse = await fetch(`http://127.0.0.1:${port}/api/auth/profile`, {
      method: 'PATCH', headers: headers(clientLogin.token),
      body: JSON.stringify({ name: 'Updated Hostel Scholar', email: clientEmail, phone: '+255 700 123 456' }),
    });
    const updatedProfile = await profileResponse.json();
    assert.equal(profileResponse.status, 200);
    assert.equal(updatedProfile.user.name, 'Updated Hostel Scholar');
    assert.equal(updatedProfile.user.phone, '+255 700 123 456');

    const agentEmail = `pending-agent-${randomUUID()}@example.test`;
    const agentResponse = await signup({ name: 'Pending Agent', email: agentEmail, password: 'Long-enough-test-password', role: 'Agent' });
    const agentPayload = await agentResponse.json();
    assert.equal(agentResponse.status, 202);
    assert.equal(agentPayload.pending_approval, true);
    const blockedLogin = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: agentEmail, password: 'Long-enough-test-password' }),
    });
    assert.equal(blockedLogin.status, 403);
    assert.equal((await blockedLogin.json()).approval_required, true);

    const ownerEmail = `pending-owner-${randomUUID()}@example.test`;
    const ownerResponse = await signup({ name: 'Pending Owner', email: ownerEmail, password: 'Long-enough-test-password', role: 'Owner' });
    const ownerPayload = await ownerResponse.json();
    assert.equal(ownerResponse.status, 202);

    const deniedAccounts = await fetch(`http://127.0.0.1:${port}/api/admin/accounts`, { headers: headers(clientPayload.token) });
    assert.equal(deniedAccounts.status, 403);
    const accountResponse = await fetch(`http://127.0.0.1:${port}/api/admin/accounts`, { headers: headers(admin.token) });
    const accountData = await accountResponse.json();
    assert.equal(accountResponse.status, 200);
    assert.ok(accountData.accounts.some((account) => account.email === clientEmail && account.name === 'Updated Hostel Scholar' && account.client_category === 'University scholar (hostel)'));
    assert.ok(accountData.events.some((event) => event.email === clientEmail && event.event_type === 'signup'));

    const approveAgent = await fetch(`http://127.0.0.1:${port}/api/admin/accounts/${agentPayload.user.id}/approval`, {
      method: 'PATCH', headers: headers(admin.token), body: JSON.stringify({ decision: 'Approved' }),
    });
    assert.equal(approveAgent.status, 200);
    const agentLogin = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: agentEmail, password: 'Long-enough-test-password' }),
    });
    assert.equal(agentLogin.status, 200);

    const rejectOwner = await fetch(`http://127.0.0.1:${port}/api/admin/accounts/${ownerPayload.user.id}/approval`, {
      method: 'PATCH', headers: headers(admin.token), body: JSON.stringify({ decision: 'Rejected' }),
    });
    assert.equal(rejectOwner.status, 200);
    const rejectedOwnerLogin = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ownerEmail, password: 'Long-enough-test-password' }),
    });
    assert.equal(rejectedOwnerLogin.status, 403);

    const finalAuditResponse = await fetch(`http://127.0.0.1:${port}/api/admin/accounts`, { headers: headers(admin.token) });
    const finalAudit = await finalAuditResponse.json();
    assert.ok(finalAudit.events.some((event) => event.email === agentEmail && event.event_type === 'account_approved'));
    assert.ok(finalAudit.events.some((event) => event.email === agentEmail && event.event_type === 'login'));
    assert.ok(finalAudit.events.some((event) => event.email === ownerEmail && event.event_type === 'account_rejected'));

    const throttleEmail = `throttle-${randomUUID()}@example.test`;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failedLogin = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: throttleEmail, password: 'wrong-pin' }),
      });
      assert.equal(failedLogin.status, 401);
    }
    const throttledLogin = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: throttleEmail, password: 'wrong-pin' }),
    });
    assert.equal(throttledLogin.status, 429);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
