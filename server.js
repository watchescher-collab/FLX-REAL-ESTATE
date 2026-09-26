import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
import { fileURLToPath, pathToFileURL } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'flx.db');
const databaseMode = String(process.env.DB_MODE || '').toLowerCase();
const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/flx_real_estate';
const isPostgresMode = databaseMode === 'postgres' || (!databaseMode && Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL));
const sessions = new Map();
const loginFailures = new Map();
let postgresClient = null;

const getPostgresClient = async () => {
  if (!isPostgresMode) return null;
  if (!postgresClient) {
    postgresClient = new pg.Client({ connectionString: postgresUrl });
    await postgresClient.connect();
  }
  return postgresClient;
};

const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16);
  const derivedKey = await new Promise((resolve, reject) => {
    crypto.scrypt(String(password), salt, 64, (error, key) => error ? reject(error) : resolve(key));
  });
  return `scrypt$${salt.toString('base64')}$${derivedKey.toString('base64')}`;
};

const hashPasswordSync = (password) => {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
};

const verifyPassword = async (password, storedPassword) => {
  const stored = String(storedPassword || '');
  if (!stored.startsWith('scrypt$')) {
    const candidate = Buffer.from(String(password));
    const legacy = Buffer.from(stored);
    return candidate.length === legacy.length && crypto.timingSafeEqual(candidate, legacy);
  }

  const [, saltText, keyText] = stored.split('$');
  if (!saltText || !keyText) return false;
  const salt = Buffer.from(saltText, 'base64');
  const expected = Buffer.from(keyText, 'base64');
  if (salt.length !== 16 || expected.length !== 64) return false;
  const actual = await new Promise((resolve, reject) => {
    crypto.scrypt(String(password), salt, expected.length, (error, key) => error ? reject(error) : resolve(key));
  });
  return crypto.timingSafeEqual(actual, expected);
};

const provisionPostgresAdmin = async (client) => {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email && !password) return;
  if (!email || password.length < 4) throw new Error('Set both ADMIN_EMAIL and an ADMIN_PASSWORD/PIN of at least 4 characters.');

  if (email !== 'admin@flxrealestate.co.tz') {
    await client.query(`
      UPDATE users SET email=$1,password=$2,role='Admin',approval_status='Approved'
      WHERE email='admin@flxrealestate.co.tz'
    `, [email, await hashPassword(password)]);
  }

  await client.query(`
    INSERT INTO users (name, email, password, role, approval_status, approved_at)
    VALUES ('FLX Administrator', $1, $2, 'Admin', 'Approved', NOW())
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      password = EXCLUDED.password,
      role = 'Admin',
      approval_status = 'Approved',
      approved_at = COALESCE(users.approved_at, NOW())
  `, [email, await hashPassword(password)]);
};

const ensureUserWorkflowColumns = () => {
  const columns = new Set(db.prepare('PRAGMA table_info(users)').all().map((column) => column.name));
  const migrations = [
    ['username', "TEXT NOT NULL DEFAULT ''"],
    ['phone', "TEXT NOT NULL DEFAULT ''"],
    ['profile_picture', "TEXT NOT NULL DEFAULT ''"],
    ['is_demo', 'INTEGER NOT NULL DEFAULT 0'],
    ['client_category', "TEXT NOT NULL DEFAULT ''"],
    ['approval_status', "TEXT NOT NULL DEFAULT 'Approved'"],
    ['approved_by', 'INTEGER'],
    ['approved_at', 'TEXT'],
    ['last_login_at', 'TEXT'],
  ];
  for (const [name, definition] of migrations) {
    if (!columns.has(name)) db.exec(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS login_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS login_events_created_idx ON login_events(created_at DESC);
  `);
};

const postgresSchema = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(80) NOT NULL DEFAULT '',
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Client',
    phone VARCHAR(80) NOT NULL DEFAULT '',
    profile_picture TEXT NOT NULL DEFAULT '',
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    client_category VARCHAR(80) NOT NULL DEFAULT '',
    approval_status VARCHAR(30) NOT NULL DEFAULT 'Approved',
    approved_by INTEGER,
    approved_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS login_events (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS login_events_created_idx ON login_events(created_at DESC);

  CREATE TABLE IF NOT EXISTS listings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    price VARCHAR(120) NOT NULL,
    period VARCHAR(120) NOT NULL,
    image TEXT NOT NULL,
    badge VARCHAR(120) NOT NULL,
    tag VARCHAR(120) NOT NULL,
    verification TEXT NOT NULL,
    status VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    lat DOUBLE PRECISION DEFAULT -6.7924,
    lng DOUBLE PRECISION DEFAULT 39.2083,
    property_kind VARCHAR(40) NOT NULL DEFAULT 'Apartment',
    transaction_type VARCHAR(20) NOT NULL DEFAULT 'Rent',
    approval_status VARCHAR(30) NOT NULL DEFAULT 'Approved',
    owner_id INTEGER,
    agent_id INTEGER,
    created_by INTEGER,
    unit_label VARCHAR(255) NOT NULL DEFAULT '',
    bedrooms INTEGER NOT NULL DEFAULT 0,
    bathrooms DOUBLE PRECISION NOT NULL DEFAULT 0,
    features_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    images_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    videos_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    approval_note TEXT NOT NULL DEFAULT '',
    approved_by INTEGER,
    approved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS property_history (
    id UUID PRIMARY KEY,
    property_id INTEGER NOT NULL,
    actor_id INTEGER NOT NULL,
    action VARCHAR(40) NOT NULL,
    changes JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS property_media (
    id UUID PRIMARY KEY,
    property_id INTEGER NOT NULL REFERENCES listings(id),
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('photo', 'video')),
    mime_type VARCHAR(120) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    data BYTEA NOT NULL,
    byte_size INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS property_media_listing_idx ON property_media(property_id, created_at);

  CREATE TABLE IF NOT EXISTS saved_listings (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    property_id INTEGER NOT NULL,
    UNIQUE(user_email, property_id)
  );

  CREATE TABLE IF NOT EXISTS deals (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    progress INTEGER NOT NULL,
    status VARCHAR(120) NOT NULL,
    amount VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS owner_metrics (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(120) NOT NULL UNIQUE,
    key_value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS market_summary (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(120) NOT NULL UNIQUE,
    key_value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS neighborhoods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    avg_price INTEGER NOT NULL,
    avg_yield DOUBLE PRECISION NOT NULL,
    demand_score INTEGER NOT NULL,
    trend VARCHAR(80) NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS app_data (
    key_name VARCHAR(120) PRIMARY KEY,
    key_value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS crm_leads (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    client_name TEXT NOT NULL DEFAULT '',
    client_email TEXT NOT NULL DEFAULT '',
    client_phone TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    intent TEXT NOT NULL DEFAULT 'General',
    budget DOUBLE PRECISION,
    preferred_area TEXT NOT NULL DEFAULT '',
    property_id TEXT,
    consent BOOLEAN NOT NULL DEFAULT FALSE,
    urgency TEXT NOT NULL DEFAULT 'Normal',
    next_contact_at TIMESTAMPTZ,
    assigned_agent_id TEXT,
    owner_id TEXT NOT NULL DEFAULT 'system',
    stage TEXT NOT NULL DEFAULT 'New',
    loss_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS crm_leads_email_idx ON crm_leads(client_email);
  CREATE INDEX IF NOT EXISTS crm_leads_phone_idx ON crm_leads(client_phone);
  CREATE INDEX IF NOT EXISTS crm_leads_stage_idx ON crm_leads(stage);

  CREATE TABLE IF NOT EXISTS crm_activities (
    id UUID PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    body TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS crm_tasks (
    id UUID PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    due_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'Open',
    owner_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS property_requests (
    id UUID PRIMARY KEY,
    property_id INTEGER NOT NULL REFERENCES listings(id),
    crm_lead_id UUID NOT NULL REFERENCES crm_leads(id),
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL DEFAULT '',
    client_phone TEXT NOT NULL DEFAULT '',
    normalized_phone TEXT NOT NULL DEFAULT '',
    intent TEXT NOT NULL CHECK (intent IN ('Buy', 'Rent')),
    preferred_date TIMESTAMPTZ,
    consent BOOLEAN NOT NULL CHECK (consent = TRUE),
    status TEXT NOT NULL DEFAULT 'Awaiting availability review',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS property_requests_pending_email_idx ON property_requests(property_id, client_email) WHERE status = 'Awaiting availability review' AND client_email <> '';
  CREATE UNIQUE INDEX IF NOT EXISTS property_requests_pending_phone_idx ON property_requests(property_id, normalized_phone) WHERE status = 'Awaiting availability review' AND normalized_phone <> '';
`;

const ensurePostgresSeedData = async () => {
  if (!isPostgresMode) return;

  const client = await getPostgresClient();
  await client.query(postgresSchema);
  await client.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(80) NOT NULL DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT NOT NULL DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS client_category VARCHAR(80) NOT NULL DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) NOT NULL DEFAULT 'Approved';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by INTEGER;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
    CREATE TABLE IF NOT EXISTS login_events (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type VARCHAR(30) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS login_events_created_idx ON login_events(created_at DESC);
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS property_kind VARCHAR(40) NOT NULL DEFAULT 'Apartment';
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) NOT NULL DEFAULT 'Rent';
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) NOT NULL DEFAULT 'Approved';
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS owner_id INTEGER;
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS agent_id INTEGER;
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS created_by INTEGER;
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS unit_label VARCHAR(255) NOT NULL DEFAULT '';
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS bedrooms INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS bathrooms DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS features_json JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS images_json JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS videos_json JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS approval_note TEXT NOT NULL DEFAULT '';
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS approved_by INTEGER;
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    UPDATE listings SET images_json = jsonb_build_array(image) WHERE images_json = '[]'::jsonb AND COALESCE(image, '') <> '';
  `);

  const rows = await client.query('SELECT COUNT(*)::int AS count FROM listings');
  if (rows.rows[0].count === 0) {
    await client.query(`
      INSERT INTO listings (title, city, price, period, image, badge, tag, verification, status, description)
      VALUES
        ('Mlimani Comfort Hostel', 'UDSM West • Dar es Salaam', 'TZS 280k/sem', '2 Bed • Wi-Fi', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80', 'Verified', 'Water 24/7', 'Clean ministry title deed', 'Verified', 'Fully furnished student housing with 24/7 security, high-speed fiber internet, and a verified title deed in the UDSM corridor.'),
        ('Posta Golden Tower', 'CBD • Dar es Salaam', 'TZS 1.8M/mo', 'Commercial Office', 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80', 'Hot', 'Backup Generator', 'Power backup ready', 'Hot', 'Prime commercial tower suite with backup power, monitored security, and parking access close to the city center.'),
        ('Gezaulo Coastal Parcel', 'Kigamboni • Dar es Salaam', 'TZS 38M', 'Land • 80sqm', 'https://images.unsplash.com/photo-1472224371017-08207f84aaae?auto=format&fit=crop&w=900&q=80', 'New', 'Title Deed', 'Surveyed parcel', 'New', 'Coastal parcel with a clear title and strong upside for a boutique residence or short-stay holiday investment.')
    `);
  }

  await provisionPostgresAdmin(client);
  const demoAccounts = [
    ['FLX Administrator', 'admin@flx.local', 'admin123', 'Admin', '+255700000000', ''],
    ['Demo Client', 'client@flx.local', 'client123', 'Client', '+255700000001', 'University scholar (hostel)'],
    ['Demo Agent', 'agent@flx.local', 'agent123', 'Agent', '+255700000002', ''],
    ['Demo Owner', 'owner@flx.local', 'owner123', 'Owner', '+255700000003', ''],
    ['Demo Investor', 'investor@flx.local', 'investor123', 'Investor', '+255700000004', ''],
  ];
  const demoSeedMarker = await client.query("SELECT 1 FROM app_data WHERE key_name='demoAccountsSeeded'");
  for (const [name, email, password, role, phone, clientCategory] of demoAccounts) {
    await client.query(`
      INSERT INTO users (name,email,password,role,phone,client_category,approval_status,approved_at,is_demo)
      VALUES ($1,$2,$3,$4,$5,$6,'Approved',NOW(),TRUE)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        phone = EXCLUDED.phone,
        client_category = EXCLUDED.client_category,
        approval_status = 'Approved',
        approved_at = COALESCE(users.approved_at, NOW()),
        is_demo = TRUE
    `, [name, email, await hashPassword(password), role, phone, clientCategory]);
  }
  if (!demoSeedMarker.rows.length) {
    await client.query("INSERT INTO app_data (key_name,key_value) VALUES ('demoAccountsSeeded','true') ON CONFLICT(key_name) DO NOTHING");
  }
  const legacyUsers = await client.query("SELECT id, password FROM users WHERE password NOT LIKE 'scrypt$%'");
  for (const user of legacyUsers.rows) {
    await client.query('UPDATE users SET password = $1 WHERE id = $2', [await hashPassword(user.password), user.id]);
  }

  const marketCount = await client.query('SELECT COUNT(*)::int AS count FROM market_summary');
  if (marketCount.rows[0].count === 0) {
    await client.query(`
      INSERT INTO market_summary (key_name, key_value)
      VALUES ('overview', '{"averageAskingPrice":"TZS 32.8M","averageYield":"9.6%","hottestMarket":"Dar es Salaam","activeAreas":"18 micro-markets"}'),
             ('hotspots', '[{"city":"Dar es Salaam","label":"Best overall momentum","value":"11.4% average yield","tone":"strong"},{"city":"Arusha","label":"Fastest investor demand","value":"9.8% average yield","tone":"neutral"},{"city":"Dodoma","label":"Affordable growth zone","value":"7.6% avg rental yield","tone":"warm"}]'),
             ('recommendations', '["Student housing in UDSM and Mbezi remains highly liquid for rent-first buyers.","Commercial office inventory in CBD is outperforming for investor-focused clients.","Coastal and peri-urban land is gaining momentum as a diversification strategy."]'),
             ('lastUpdated', '2026-09-21T00:00:00.000Z')
    `);
  }

  const appDataCount = await client.query('SELECT COUNT(*)::int AS count FROM app_data');
  if (appDataCount.rows[0].count === 0) {
    await client.query(`
      INSERT INTO app_data (key_name, key_value)
      VALUES
        ('clientDashboard', '{"resident":{"name":"Juma Bakari","property":"Mlimani Comfort Hostel","room":"Room 204-B","status":"Lease active"},"stats":[{"label":"Water usage","value":"114 L/day","meta":"7% below average"},{"label":"Guest access","value":"2 passes","meta":"Approved for tonight"},{"label":"Household spend","value":"TZS 82,000","meta":"Food & essentials"},{"label":"Support","value":"On-call","meta":"Guard / caretaker active"}],"reminders":[{"time":"Thu 10:00","title":"Laundry pickup slot","body":"Next slot available in Block B utility bay."},{"time":"Fri 18:30","title":"Visitor pre-check","body":"Auntie Mariam, guest pass approved and QR ready."},{"time":"Sun 08:30","title":"Room inspection","body":"Checklist review with caretaker and student admin."}],"tickets":[{"id":1,"title":"Desk lamp socket fix","status":"In progress","eta":"ETA 3:00 PM"},{"id":2,"title":"Water pressure check","status":"Queued","eta":"Assigned: Facilities team"}]}'),
        ('agentDashboard', '{"profile":{"name":"Daudi M.","title":"BRELA No. RLCA-2024-TZ-8841 • FLX Verified"},"stats":[{"label":"Active Leads","value":"28","delta":"+5"},{"label":"Target Hit","value":"82%","delta":"Mtd"},{"label":"Conversion","value":"34%","delta":"Top 5%"}],"leads":[{"id":1,"title":"UDSM Hostel Hunt","note":"4 students ready tonight"},{"id":2,"title":"CBD Office Search","note":"2 legal teams"},{"id":3,"title":"Diaspora Land Buyers","note":"1 high-value lead"},{"id":4,"title":"Kigamboni Family Plot","note":"3 matches"}],"deals":[{"id":1,"title":"Kassim & Friends (4 Scholars)","status":"Urgent SLA 15m","note":"Active lead with strong conversion signal."},{"id":2,"title":"Adv. Brenda K. (LexAfrica TZ)","status":"Walkthrough Today","note":"Active lead with strong conversion signal."},{"id":3,"title":"Dr. Josephat M. (UK Diaspora)","status":"Drone Verification","note":"Active lead with strong conversion signal."}],"contracts":[{"id":1,"title":"Lease Draft","note":"3 pending"},{"id":2,"title":"Addendum","note":"1 ready"},{"id":3,"title":"RTA Add-on","note":"2 synced"},{"id":4,"title":"Shareable PDF","note":"4 generated"}]}'),
        ('ownerDashboard', '{"portfolio":{"totalRevenue":"TZS 14,800,000","occupancy":"94.1%","paymentBalance":"TZS 3,200,000","units":[{"name":"Room 102-A","label":"Mlimani Comfort Hostel","value":"TZS 1,200,000 / sem","status":"Ready"},{"name":"Bed 204-B","label":"Mlimani Comfort Hostel","value":"TZS 280,000 / sem","status":"Vacant"},{"name":"Suite 4B","label":"Posta Office Suites","value":"TZS 2,000,000 / month","status":"Leased"}]},"maintenance":[{"title":"Water pressure fix","location":"Mlimani Comfort Hostel","state":"Waiting for plumber"},{"title":"Gate sensor replacement","location":"Kijitonyama Apartments","state":"Technician on site"},{"title":"Roof leak inspection","location":"Posta Office Suites","state":"Approved by owner"}]}'),
        ('opsDashboard', '{"queue":[],"paymentSummary":null,"disputes":[],"auditTrail":[]}')
    `);
  }

  const opsRow = await client.query('SELECT key_value FROM app_data WHERE key_name = $1', ['opsDashboard']);
  if (opsRow.rows[0]) {
    try {
      const dashboard = JSON.parse(opsRow.rows[0].key_value);
      const seededQueue = [
        ['Parcel #492 (Gezaulole, Kigamboni)', 'CADASTRAL DRONE LOCK', 'RTK-GPS drone telemetry confirmed against Ministry registry.'],
        ['Mlimani Comfort Hostel Block B', 'PHYSICAL INSPECTION PASSED', 'Inspector Kavish: Physical geotagged checklist valid.'],
        ['Juma Bakari', 'STUDENT KYC', 'UDSM Law #2022-04-1184 • NIDA verified.'],
      ];
      const queue = (dashboard.queue || []).filter((item) => !seededQueue.some(([label, status, details]) => item.label === label && item.status === status && item.details === details));
      const disputes = (dashboard.disputes || []).filter((item) => !(item.title === 'Ocean View Apartment Masaki' && item.summary === 'Duplicate match: Cape Town Listing #921' && item.action === 'Ban & Freeze Account'));
      const paymentSummary = dashboard.paymentSummary?.balance === 'TZS 142,500,000' && dashboard.paymentSummary?.flags === '0 Security Flags • 100% Reconciled' ? null : dashboard.paymentSummary;
      if (queue.length !== (dashboard.queue || []).length || disputes.length !== (dashboard.disputes || []).length || paymentSummary !== dashboard.paymentSummary) {
        await client.query('UPDATE app_data SET key_value = $1 WHERE key_name = $2', [JSON.stringify({ ...dashboard, queue, disputes, paymentSummary }), 'opsDashboard']);
      }
    } catch {
    }
  }
};

fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const ensureListingLocationColumns = () => {
  const columns = db.prepare("PRAGMA table_info(listings)").all();
  const hasLat = columns.some((column) => column.name === 'lat');
  const hasLng = columns.some((column) => column.name === 'lng');

  if (!hasLat) {
    db.exec('ALTER TABLE listings ADD COLUMN lat REAL DEFAULT -6.7924');
  }
  if (!hasLng) {
    db.exec('ALTER TABLE listings ADD COLUMN lng REAL DEFAULT 39.2083');
  }

  db.exec(`
    UPDATE listings
    SET lat = COALESCE(lat, -6.7924), lng = COALESCE(lng, 39.2083)
    WHERE lat IS NULL OR lng IS NULL
  `);
};

const ensurePropertyWorkflowColumns = () => {
  const columns = db.prepare('PRAGMA table_info(listings)').all();
  const existing = new Set(columns.map((column) => column.name));
  const additions = [
    ['property_kind', "TEXT NOT NULL DEFAULT 'Apartment'"],
    ['transaction_type', "TEXT NOT NULL DEFAULT 'Rent'"],
    ['approval_status', "TEXT NOT NULL DEFAULT 'Approved'"],
    ['owner_id', 'INTEGER'],
    ['agent_id', 'INTEGER'],
    ['created_by', 'INTEGER'],
    ['unit_label', "TEXT NOT NULL DEFAULT ''"],
    ['bedrooms', 'INTEGER NOT NULL DEFAULT 0'],
    ['bathrooms', 'REAL NOT NULL DEFAULT 0'],
    ['features_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['images_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['videos_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['approval_note', "TEXT NOT NULL DEFAULT ''"],
    ['approved_by', 'INTEGER'],
    ['approved_at', 'TEXT'],
    ['updated_at', "TEXT NOT NULL DEFAULT ''"],
    ['deleted_at', 'TEXT'],
  ];
  for (const [name, definition] of additions) {
    if (!existing.has(name)) db.exec(`ALTER TABLE listings ADD COLUMN ${name} ${definition}`);
  }
  db.exec(`
    UPDATE listings
    SET images_json = json_array(image)
    WHERE (images_json IS NULL OR images_json = '[]') AND COALESCE(image, '') <> ''
  `);
  db.exec("UPDATE listings SET updated_at = COALESCE(NULLIF(updated_at, ''), CURRENT_TIMESTAMP) WHERE updated_at IS NULL OR updated_at = ''");
  db.exec(`
    CREATE TABLE IF NOT EXISTS property_history (
      id TEXT PRIMARY KEY,
      property_id INTEGER NOT NULL,
      actor_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      changes_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS property_history_record_idx ON property_history(property_id, created_at);
    CREATE TABLE IF NOT EXISTS property_media (
      id TEXT PRIMARY KEY,
      property_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
      mime_type TEXT NOT NULL,
      original_name TEXT NOT NULL,
      data BLOB NOT NULL,
      byte_size INTEGER NOT NULL,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS property_media_listing_idx ON property_media(property_id, created_at);
    CREATE INDEX IF NOT EXISTS listings_owner_idx ON listings(owner_id, approval_status);
    CREATE INDEX IF NOT EXISTS listings_agent_idx ON listings(agent_id, approval_status);
    CREATE INDEX IF NOT EXISTS listings_approval_idx ON listings(approval_status, deleted_at);
  `);
};

const createSessionToken = (user) => {
  const token = crypto.randomUUID();
  sessions.set(token, {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    issuedAt: Date.now(),
  });
  return token;
};

const getSessionUser = (req) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : req.query?.token || '';
  if (!token) return null;
  return sessions.get(token) || null;
};

const defaultProperties = [
  {
    id: 1,
    title: 'Mlimani Comfort Hostel',
    city: 'UDSM West • Dar es Salaam',
    price: 'TZS 280k/sem',
    period: '2 Bed • Wi-Fi',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
    badge: 'Verified',
    tag: 'Water 24/7',
    verification: 'Clean ministry title deed',
    status: 'Verified',
    description: 'Fully furnished student housing with 24/7 security, high-speed fiber internet, and a verified title deed in the UDSM corridor.',
    lat: -6.7720,
    lng: 39.2050,
  },
  {
    id: 2,
    title: 'Posta Golden Tower',
    city: 'CBD • Dar es Salaam',
    price: 'TZS 1.8M/mo',
    period: 'Commercial Office',
    image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80',
    badge: 'Hot',
    tag: 'Backup Generator',
    verification: 'Power backup ready',
    status: 'Hot',
    description: 'Prime commercial tower suite with backup power, monitored security, and parking access close to the city center.',
    lat: -6.8190,
    lng: 39.2830,
  },
  {
    id: 3,
    title: 'Gezaulo Coastal Parcel',
    city: 'Kigamboni • Dar es Salaam',
    price: 'TZS 38M',
    period: 'Land • 80sqm',
    image: 'https://images.unsplash.com/photo-1472224371017-08207f84aaae?auto=format&fit=crop&w=900&q=80',
    badge: 'New',
    tag: 'Title Deed',
    verification: 'Surveyed parcel',
    status: 'New',
    description: 'Coastal parcel with a clear title and strong upside for a boutique residence or short-stay holiday investment.',
    lat: -6.8280,
    lng: 39.3010,
  },
];

const defaultDeals = [
  { title: 'Mlimani Comfort - Lease Packet', progress: 82, status: 'Due in 2 days', amount: 'TZS 2.8M' },
  { title: 'Posta Tower - Handover', progress: 66, status: 'Awaiting docs', amount: 'TZS 5.2M' },
  { title: 'Kijitonyama - Buyer Intro', progress: 91, status: 'Ready to close', amount: 'TZS 9.1M' },
];

const defaultOwnerStats = {
  totalRevenue: 'TZS 14,800,000',
  occupancy: '90%',
  paymentBalance: 'TZS 3.2M',
};

const defaultMarketSummary = {
  overview: {
    averageAskingPrice: 'TZS 32.8M',
    averageYield: '9.6%',
    hottestMarket: 'Dar es Salaam',
    activeAreas: '18 micro-markets',
  },
  hotspots: [
    { city: 'Dar es Salaam', label: 'Best overall momentum', value: '11.4% average yield', tone: 'strong' },
    { city: 'Arusha', label: 'Fastest investor demand', value: '9.8% average yield', tone: 'neutral' },
    { city: 'Dodoma', label: 'Affordable growth zone', value: '7.6% avg rental yield', tone: 'warm' },
  ],
  recommendations: [
    'Student housing in UDSM and Mbezi remains highly liquid for rent-first buyers.',
    'Commercial office inventory in CBD is outperforming for investor-focused clients.',
    'Coastal and peri-urban land is gaining momentum as a diversification strategy.',
  ],
  lastUpdated: new Date().toISOString(),
};

const defaultNeighborhoods = [
  { name: 'Mbezi Beach', city: 'Dar es Salaam', avgPrice: 56000000, avgYield: 11.8, demandScore: 92, trend: 'Rising', note: 'Strong rental demand and lifestyle appeal.' },
  { name: 'Kijitonyama', city: 'Dar es Salaam', avgPrice: 47000000, avgYield: 10.5, demandScore: 89, trend: 'Stable', note: 'Balanced buyer demand for family homes and rentals.' },
  { name: 'Masaki', city: 'Dar es Salaam', avgPrice: 120000000, avgYield: 8.4, demandScore: 86, trend: 'Premium', note: 'Higher price point with strong long-term value.' },
  { name: 'Arusha City', city: 'Arusha', avgPrice: 42000000, avgYield: 9.9, demandScore: 87, trend: 'Hot', note: 'Good investor momentum and consistent occupancy.' },
  { name: 'Dodoma Central', city: 'Dodoma', avgPrice: 35000000, avgYield: 8.1, demandScore: 82, trend: 'Growth', note: 'Affordable entry with government-linked demand.' },
];

const defaultClientDashboard = {
  resident: {
    name: 'Juma Bakari',
    property: 'Mlimani Comfort Hostel',
    room: 'Room 204-B',
    status: 'Lease active',
  },
  stats: [
    { label: 'Water usage', value: '114 L/day', meta: '7% below average' },
    { label: 'Guest access', value: '2 passes', meta: 'Approved for tonight' },
    { label: 'Household spend', value: 'TZS 82,000', meta: 'Food & essentials' },
    { label: 'Support', value: 'On-call', meta: 'Guard / caretaker active' },
  ],
  reminders: [
    { time: 'Thu 10:00', title: 'Laundry pickup slot', body: 'Next slot available in Block B utility bay.' },
    { time: 'Fri 18:30', title: 'Visitor pre-check', body: 'Auntie Mariam, guest pass approved and QR ready.' },
    { time: 'Sun 08:30', title: 'Room inspection', body: 'Checklist review with caretaker and student admin.' },
  ],
  tickets: [
    { id: 1, title: 'Desk lamp socket fix', status: 'In progress', eta: 'ETA 3:00 PM' },
    { id: 2, title: 'Water pressure check', status: 'Queued', eta: 'Assigned: Facilities team' },
  ],
};

const defaultAgentDashboard = {
  stats: [],
  leads: [],
  deals: [],
  contracts: [],
};

const defaultOwnerDashboard = {
  portfolio: {
    totalRevenue: 'TZS 14,800,000',
    occupancy: '94.1%',
    paymentBalance: 'TZS 3,200,000',
    units: [
      { name: 'Room 102-A', label: 'Mlimani Comfort Hostel', value: 'TZS 1,200,000 / sem', status: 'Ready' },
      { name: 'Bed 204-B', label: 'Mlimani Comfort Hostel', value: 'TZS 280,000 / sem', status: 'Vacant' },
      { name: 'Suite 4B', label: 'Posta Office Suites', value: 'TZS 2,000,000 / month', status: 'Leased' },
    ],
  },
  maintenance: [
    { title: 'Water pressure fix', location: 'Mlimani Comfort Hostel', state: 'Waiting for plumber' },
    { title: 'Gate sensor replacement', location: 'Kijitonyama Apartments', state: 'Technician on site' },
    { title: 'Roof leak inspection', location: 'Posta Office Suites', state: 'Approved by owner' },
  ],
};

const defaultOpsDashboard = {
  queue: [],
  paymentSummary: null,
  disputes: [],
};

const removeLegacyOpsFixtures = () => {
  const row = db.prepare('SELECT key_value FROM app_data WHERE key_name = ?').get('opsDashboard');
  if (!row) return;

  let dashboard;
  try {
    dashboard = JSON.parse(row.key_value);
  } catch {
    return;
  }

  const seededQueue = [
    ['Parcel #492 (Gezaulole, Kigamboni)', 'CADASTRAL DRONE LOCK', 'RTK-GPS drone telemetry confirmed against Ministry registry.'],
    ['Mlimani Comfort Hostel Block B', 'PHYSICAL INSPECTION PASSED', 'Inspector Kavish: Physical geotagged checklist valid.'],
    ['Juma Bakari', 'STUDENT KYC', 'UDSM Law #2022-04-1184 • NIDA verified.'],
  ];
  const queue = (dashboard.queue || []).filter((item) => !seededQueue.some(([label, status, details]) => item.label === label && item.status === status && item.details === details));
  const disputes = (dashboard.disputes || []).filter((item) => !(item.title === 'Ocean View Apartment Masaki' && item.summary === 'Duplicate match: Cape Town Listing #921' && item.action === 'Ban & Freeze Account'));
  const paymentSummary = dashboard.paymentSummary?.balance === 'TZS 142,500,000' && dashboard.paymentSummary?.flags === '0 Security Flags • 100% Reconciled'
    ? null
    : dashboard.paymentSummary;

  if (queue.length === (dashboard.queue || []).length && disputes.length === (dashboard.disputes || []).length && paymentSummary === dashboard.paymentSummary) return;
  const nextDashboard = { ...dashboard, queue, disputes, paymentSummary };
  db.prepare('INSERT INTO app_data (key_name, key_value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value').run('opsDashboard', JSON.stringify(nextDashboard));
};

const removeLegacyAgentFixtures = () => {
  const demoTitles = ['UDSM Hostel Hunt', 'CBD Office Search', 'Diaspora Land Buyers', 'Kigamboni Family Plot'];
  const placeholders = demoTitles.map(() => '?').join(', ');
  const demoLeads = db.prepare(`SELECT id FROM crm_leads WHERE source = 'Legacy dashboard import' AND title IN (${placeholders})`).all(...demoTitles);
  if (demoLeads.length) {
    const removeLeads = db.transaction((leads) => {
      for (const lead of leads) {
        db.prepare('DELETE FROM crm_tasks WHERE lead_id = ?').run(lead.id);
        db.prepare('DELETE FROM crm_activities WHERE lead_id = ?').run(lead.id);
        db.prepare('DELETE FROM crm_leads WHERE id = ?').run(lead.id);
      }
    });
    removeLeads(demoLeads);
  }

  const row = db.prepare('SELECT key_value FROM app_data WHERE key_name = ?').get('agentDashboard');
  if (!row) return;
  try {
    const dashboard = JSON.parse(row.key_value);
    const deals = (dashboard.deals || []).filter((deal) => !['Kassim & Friends (4 Scholars)', 'Adv. Brenda K. (LexAfrica TZ)', 'Dr. Josephat M. (UK Diaspora)'].includes(deal.title));
    const contracts = (dashboard.contracts || []).filter((contract) => !['Lease Draft', 'Addendum', 'RTA Add-on', 'Shareable PDF'].includes(contract.title));
    if (deals.length === (dashboard.deals || []).length && contracts.length === (dashboard.contracts || []).length) return;
    db.prepare('INSERT INTO app_data (key_name, key_value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value')
      .run('agentDashboard', JSON.stringify({ ...dashboard, deals, contracts }));
  } catch {
  }
};

const createTables = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Client',
      phone TEXT NOT NULL DEFAULT '',
      profile_picture TEXT NOT NULL DEFAULT '',
      is_demo INTEGER NOT NULL DEFAULT 0,
      client_category TEXT NOT NULL DEFAULT '',
      approval_status TEXT NOT NULL DEFAULT 'Approved',
      approved_by INTEGER,
      approved_at TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS login_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS login_events_created_idx ON login_events(created_at DESC);

    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      city TEXT NOT NULL,
      price TEXT NOT NULL,
      period TEXT NOT NULL,
      image TEXT NOT NULL,
      badge TEXT NOT NULL,
      tag TEXT NOT NULL,
      verification TEXT NOT NULL,
      status TEXT NOT NULL,
      description TEXT NOT NULL,
      lat REAL DEFAULT -6.7924,
      lng REAL DEFAULT 39.2083
    );

    CREATE TABLE IF NOT EXISTS saved_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      property_id INTEGER NOT NULL,
      UNIQUE(user_email, property_id)
    );

    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      progress INTEGER NOT NULL,
      status TEXT NOT NULL,
      amount TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS owner_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_name TEXT NOT NULL UNIQUE,
      key_value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS market_summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_name TEXT NOT NULL UNIQUE,
      key_value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS neighborhoods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      avg_price INTEGER NOT NULL,
      avg_yield REAL NOT NULL,
      demand_score INTEGER NOT NULL,
      trend TEXT NOT NULL,
      note TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_data (
      key_name TEXT PRIMARY KEY,
      key_value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crm_leads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      client_name TEXT NOT NULL DEFAULT '',
      client_email TEXT NOT NULL DEFAULT '',
      client_phone TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'Agent intake',
      intent TEXT NOT NULL DEFAULT 'Buy',
      budget REAL,
      preferred_area TEXT NOT NULL DEFAULT '',
      property_id TEXT,
      consent INTEGER NOT NULL DEFAULT 0,
      urgency TEXT NOT NULL DEFAULT 'Normal',
      next_contact_at TEXT,
      assigned_agent_id TEXT,
      owner_id TEXT NOT NULL DEFAULT 'system',
      stage TEXT NOT NULL DEFAULT 'New',
      loss_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS crm_leads_email_idx ON crm_leads(client_email);
    CREATE INDEX IF NOT EXISTS crm_leads_phone_idx ON crm_leads(client_phone);
    CREATE INDEX IF NOT EXISTS crm_leads_stage_idx ON crm_leads(stage);

    CREATE TABLE IF NOT EXISTS crm_activities (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      body TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crm_tasks (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      due_at TEXT,
      status TEXT NOT NULL DEFAULT 'Open',
      owner_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS property_requests (
      id TEXT PRIMARY KEY,
      property_id INTEGER NOT NULL,
      crm_lead_id TEXT NOT NULL REFERENCES crm_leads(id),
      client_name TEXT NOT NULL,
      client_email TEXT NOT NULL DEFAULT '',
      client_phone TEXT NOT NULL DEFAULT '',
      normalized_phone TEXT NOT NULL DEFAULT '',
      intent TEXT NOT NULL CHECK (intent IN ('Buy', 'Rent')),
      preferred_date TEXT,
      consent INTEGER NOT NULL CHECK (consent = 1),
      status TEXT NOT NULL DEFAULT 'Awaiting availability review',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_requests (
      id TEXT PRIMARY KEY,
      service_slug TEXT NOT NULL,
      service_title TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_email TEXT NOT NULL DEFAULT '',
      client_phone TEXT NOT NULL DEFAULT '',
      intent TEXT NOT NULL CHECK (intent IN ('Buy', 'Rent')),
      preferred_date TEXT,
      note TEXT NOT NULL DEFAULT '',
      consent INTEGER NOT NULL CHECK (consent = 1),
      status TEXT NOT NULL DEFAULT 'Awaiting response',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS property_requests_pending_email_idx
      ON property_requests(property_id, client_email)
      WHERE status = 'Awaiting availability review' AND client_email <> '';
    CREATE UNIQUE INDEX IF NOT EXISTS property_requests_pending_phone_idx
      ON property_requests(property_id, normalized_phone)
      WHERE status = 'Awaiting availability review' AND normalized_phone <> '';
  `);

  ensureUserWorkflowColumns();

  const legacyAgentRow = db.prepare('SELECT key_value FROM app_data WHERE key_name = ?').get('agentDashboard');
  if (legacyAgentRow && !db.prepare('SELECT 1 FROM crm_leads LIMIT 1').get()) {
    try {
      const legacyDashboard = JSON.parse(legacyAgentRow.key_value);
      const insertLead = db.prepare(`
        INSERT INTO crm_leads (id, title, note, client_name, source, owner_id, stage, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertActivity = db.prepare(`
        INSERT INTO crm_activities (id, lead_id, type, body, actor_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const migrateLegacyLeads = db.transaction((leads) => {
        for (const legacyLead of leads) {
          const id = crypto.randomUUID();
          const createdAt = new Date().toISOString();
          const title = String(legacyLead.title || 'Imported lead');
          insertLead.run(id, title, String(legacyLead.note || ''), title, 'Legacy dashboard import', 'system', 'New', createdAt, createdAt);
          insertActivity.run(crypto.randomUUID(), id, 'created', 'Imported from the legacy agent dashboard.', 'system', createdAt);
        }
      });
      migrateLegacyLeads(Array.isArray(legacyDashboard.leads) ? legacyDashboard.leads : []);
    } catch {
    }
  }

  const listingCount = db.prepare('SELECT COUNT(*) AS count FROM listings').get();
  if (!listingCount.count) {
    const insertListing = db.prepare(`
      INSERT INTO listings (id, title, city, price, period, image, badge, tag, verification, status, description, lat, lng)
      VALUES (@id, @title, @city, @price, @period, @image, @badge, @tag, @verification, @status, @description, @lat, @lng)
    `);
    const insertMany = db.transaction((rows) => {
      for (const row of rows) insertListing.run(row);
    });
    insertMany(defaultProperties);
  }

  const dealCount = db.prepare('SELECT COUNT(*) AS count FROM deals').get();
  if (!dealCount.count) {
    const insertDeal = db.prepare(`
      INSERT INTO deals (title, progress, status, amount)
      VALUES (@title, @progress, @status, @amount)
    `);
    const insertManyDeals = db.transaction((rows) => {
      for (const row of rows) insertDeal.run(row);
    });
    insertManyDeals(defaultDeals);
  }

  const metricsCount = db.prepare('SELECT COUNT(*) AS count FROM owner_metrics').get();
  if (!metricsCount.count) {
    const insertMetric = db.prepare(`
      INSERT INTO owner_metrics (key_name, key_value)
      VALUES (@key_name, @key_value)
    `);
    insertMetric.run({ key_name: 'totalRevenue', key_value: defaultOwnerStats.totalRevenue });
    insertMetric.run({ key_name: 'occupancy', key_value: defaultOwnerStats.occupancy });
    insertMetric.run({ key_name: 'paymentBalance', key_value: defaultOwnerStats.paymentBalance });
  }

  const marketSummaryCount = db.prepare('SELECT COUNT(*) AS count FROM market_summary').get();
  if (!marketSummaryCount.count) {
    const insertSummary = db.prepare(`
      INSERT INTO market_summary (key_name, key_value)
      VALUES (@key_name, @key_value)
    `);
    insertSummary.run({ key_name: 'overview', key_value: JSON.stringify(defaultMarketSummary.overview) });
    insertSummary.run({ key_name: 'hotspots', key_value: JSON.stringify(defaultMarketSummary.hotspots) });
    insertSummary.run({ key_name: 'recommendations', key_value: JSON.stringify(defaultMarketSummary.recommendations) });
    insertSummary.run({ key_name: 'lastUpdated', key_value: defaultMarketSummary.lastUpdated });
  }

  const appDataCount = db.prepare('SELECT COUNT(*) AS count FROM app_data').get();
  if (!appDataCount.count) {
    const insertAppData = db.prepare(`
      INSERT INTO app_data (key_name, key_value)
      VALUES (@key_name, @key_value)
    `);
    const appData = {
      clientDashboard: JSON.stringify(defaultClientDashboard),
      agentDashboard: JSON.stringify(defaultAgentDashboard),
      ownerDashboard: JSON.stringify(defaultOwnerDashboard),
      opsDashboard: JSON.stringify(defaultOpsDashboard),
    };
    Object.entries(appData).forEach(([key, value]) => insertAppData.run({ key_name: key, key_value: value }));
  }

  const neighborhoodCount = db.prepare('SELECT COUNT(*) AS count FROM neighborhoods').get();
  if (!neighborhoodCount.count) {
    const insertNeighborhood = db.prepare(`
      INSERT INTO neighborhoods (name, city, avg_price, avg_yield, demand_score, trend, note)
      VALUES (@name, @city, @avg_price, @avg_yield, @demand_score, @trend, @note)
    `);
    const insertManyNeighborhoods = db.transaction((rows) => {
      for (const row of rows) insertNeighborhood.run(row);
    });
    insertManyNeighborhoods(defaultNeighborhoods.map((item) => ({
      name: item.name,
      city: item.city,
      avg_price: item.avgPrice,
      avg_yield: item.avgYield,
      demand_score: item.demandScore,
      trend: item.trend,
      note: item.note,
    })));
  }

  const demoUsers = [
    ['FLX Administrator', 'admin@flx.local', 'admin123', 'Admin', '+255700000000', ''],
    ['Demo Client', 'client@flx.local', 'client123', 'Client', '+255700000001', 'University scholar (hostel)'],
    ['Demo Agent', 'agent@flx.local', 'agent123', 'Agent', '+255700000002', ''],
    ['Demo Owner', 'owner@flx.local', 'owner123', 'Owner', '+255700000003', ''],
    ['Demo Investor', 'investor@flx.local', 'investor123', 'Investor', '+255700000004', ''],
  ];
  const demoSeedMarker = db.prepare("SELECT 1 FROM app_data WHERE key_name='demoAccountsSeeded'").get();
  const upsertDemoUser = db.prepare(`
    INSERT INTO users (name, email, password, role, phone, client_category, approval_status, approved_at, is_demo)
    VALUES (@name, @email, @password, @role, @phone, @clientCategory, 'Approved', CURRENT_TIMESTAMP, 1)
    ON CONFLICT(email) DO UPDATE SET
      name = excluded.name,
      password = excluded.password,
      role = excluded.role,
      phone = excluded.phone,
      client_category = excluded.client_category,
      approval_status = 'Approved',
      approved_at = COALESCE(users.approved_at, CURRENT_TIMESTAMP),
      is_demo = 1
  `);
  const insertDemoUsers = db.transaction((users) => {
    for (const [name, email, password, role, phone, clientCategory] of users) {
      upsertDemoUser.run({ name, email, password: hashPasswordSync(password), role, phone, clientCategory });
    }
  });
  insertDemoUsers(demoUsers);
  db.prepare("UPDATE users SET is_demo=1 WHERE email IN ('admin@flx.local','client@flx.local','agent@flx.local','owner@flx.local','investor@flx.local')").run();
  if (!demoSeedMarker) {
    db.prepare("INSERT INTO app_data (key_name,key_value) VALUES ('demoAccountsSeeded','true')").run();
  }

  const savedCount = db.prepare('SELECT COUNT(*) AS count FROM saved_listings WHERE user_email = ?').get('admin@flx.local');
  if (!savedCount.count) {
    db.prepare('INSERT INTO saved_listings (user_email, property_id) VALUES (?, ?)').run('admin@flx.local', 1);
  }
};

createTables();
ensureUserWorkflowColumns();
ensureListingLocationColumns();
ensurePropertyWorkflowColumns();
removeLegacyOpsFixtures();
removeLegacyAgentFixtures();

export const createApp = () => {
  const app = express();
  app.set('trust proxy', 1);
  const distDir = path.join(__dirname, 'dist');

  app.use(express.json({ limit: '2mb' }));
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^\/(?!api).*$/, (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'flx-real-estate-backend',
      database: isPostgresMode ? 'postgres' : 'sqlite',
      database_path: isPostgresMode ? postgresUrl : dbPath,
      timestamp: new Date().toISOString(),
    });
  });

  const normalizeListingRow = (row) => {
    const lat = row?.lat ?? row?.latitude;
    const lng = row?.lng ?? row?.longitude;
    return {
      ...row,
      lat: lat == null || lat === '' ? null : Number.isFinite(Number(lat)) ? Number(lat) : null,
      lng: lng == null || lng === '' ? null : Number.isFinite(Number(lng)) ? Number(lng) : null,
    };
  };

  const requireCrmAccess = (req, res, next) => {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: 'Sign in to access CRM records.' });
    if (!['Agent', 'Admin'].includes(session.role)) return res.status(403).json({ error: 'An Agent or Admin account is required.' });
    req.crmActor = session;
    next();
  };

  const requireAdmin = (req, res, next) => {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: 'Sign in with an Admin account.' });
    if (session.role !== 'Admin') return res.status(403).json({ error: 'Only Admins can perform this action.' });
    req.adminActor = session;
    next();
  };

  app.get('/api/admin/accounts', requireAdmin, async (_req, res) => {
    try {
      if (isPostgresMode) {
        const client = await getPostgresClient();
        const [accounts, events] = await Promise.all([
          client.query('SELECT id,name,email,role,phone,profile_picture,client_category,approval_status,approved_at,last_login_at,is_demo,created_at FROM users ORDER BY created_at DESC,id DESC'),
          client.query(`SELECT e.id,e.event_type,e.created_at,u.id AS user_id,u.name,u.email,u.role,u.client_category FROM login_events e JOIN users u ON u.id=e.user_id ORDER BY e.created_at DESC`),
        ]);
        return res.json({ accounts: accounts.rows, events: events.rows });
      }
      const accounts = db.prepare('SELECT id,name,email,role,phone,profile_picture,client_category,approval_status,approved_at,last_login_at,is_demo,created_at FROM users ORDER BY created_at DESC,id DESC').all();
      const events = db.prepare(`SELECT e.id,e.event_type,e.created_at,e.user_id,u.name,u.email,u.role,u.client_category FROM login_events e JOIN users u ON u.id=e.user_id ORDER BY e.created_at DESC`).all();
      return res.json({ accounts, events });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load account records.' });
    }
  });

  app.delete('/api/admin/accounts/:id', requireAdmin, async (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId === Number(req.adminActor.userId)) return res.status(400).json({ error: 'Select a different demo account.' });
    try {
      let result;
      if (isPostgresMode) {
        const client = await getPostgresClient();
        result = await client.query("DELETE FROM users WHERE id=$1 AND is_demo=TRUE AND role <> 'Admin' RETURNING id", [userId]);
        if (!result.rows.length) return res.status(404).json({ error: 'Demo account not found.' });
      } else {
        result = db.prepare("DELETE FROM users WHERE id=? AND is_demo=1 AND role <> 'Admin'").run(userId);
        if (!result.changes) return res.status(404).json({ error: 'Demo account not found.' });
      }
      return res.json({ ok: true, deletedId: userId });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Demo account could not be deleted.' });
    }
  });

  app.patch('/api/admin/accounts/:id/approval', requireAdmin, async (req, res) => {
    const decision = String(req.body?.decision || '');
    if (!['Approved', 'Rejected'].includes(decision)) return res.status(400).json({ error: 'Decision must be Approved or Rejected.' });
    const now = new Date().toISOString();
    try {
      let account;
      if (isPostgresMode) {
        const client = await getPostgresClient();
        const result = await client.query(`
          UPDATE users SET approval_status=$1,approved_by=$2,approved_at=$3
          WHERE id=$4 AND role IN ('Owner','Agent') AND approval_status='Pending'
          RETURNING id,name,email,role,client_category,approval_status,approved_at
        `, [decision, req.adminActor.userId, now, req.params.id]);
        account = result.rows[0];
        if (account) await client.query('INSERT INTO login_events (user_id,event_type,created_at) VALUES ($1,$2,$3)', [account.id, decision === 'Approved' ? 'account_approved' : 'account_rejected', now]);
      } else {
        const result = db.prepare(`
          UPDATE users SET approval_status=?,approved_by=?,approved_at=?
          WHERE id=? AND role IN ('Owner','Agent') AND approval_status='Pending'
        `).run(decision, req.adminActor.userId, now, Number(req.params.id));
        account = result.changes ? db.prepare('SELECT id,name,email,role,client_category,approval_status,approved_at FROM users WHERE id=?').get(Number(req.params.id)) : null;
        if (account) db.prepare('INSERT INTO login_events (user_id,event_type,created_at) VALUES (?,?,?)').run(account.id, decision === 'Approved' ? 'account_approved' : 'account_rejected', now);
      }
      if (!account) return res.status(404).json({ error: 'Pending Agent or Owner application not found.' });
      return res.json({ ok: true, account });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to update account approval.' });
    }
  });

  const requirePropertyAccess = (req, res, next) => {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: 'Sign in to manage property records.' });
    if (!['Owner', 'Agent', 'Admin'].includes(session.role)) return res.status(403).json({ error: 'An Owner, Agent, or Admin account is required.' });
    req.propertyActor = session;
    next();
  };

  const parseJsonList = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const normalizePropertyRecord = (row) => {
    const normalized = normalizeListingRow(row);
    const images = parseJsonList(row.images_json ?? row.images);
    if (!images.length && row.image) images.push(row.image);
    const videos = parseJsonList(row.videos_json ?? row.videos);
    if (!videos.length && row.video_url) videos.push(row.video_url);
    return {
      ...normalized,
      image: row.image || images[0] || '',
      video_url: row.video_url || videos[0] || '',
      features: parseJsonList(row.features_json ?? row.features),
      images,
      videos,
    };
  };

  const getPropertyById = async (id) => {
    if (isPostgresMode) {
      const client = await getPostgresClient();
      const result = await client.query('SELECT * FROM listings WHERE id = $1 AND deleted_at IS NULL', [id]);
      return result.rows[0] || null;
    }
    return db.prepare('SELECT * FROM listings WHERE id = ? AND deleted_at IS NULL').get(Number(id)) || null;
  };

  const actorCanEditProperty = (actor, property) => actor.role === 'Admin'
    || (actor.role === 'Owner' && Number(property.owner_id) === Number(actor.userId))
    || (actor.role === 'Agent' && (Number(property.agent_id) === Number(actor.userId) || Number(property.created_by) === Number(actor.userId)));

  const normalizePropertyInput = (body, existing = {}) => {
    const title = String(body.title ?? existing.title ?? '').trim();
    const city = String(body.city ?? existing.city ?? '').trim();
    const price = String(body.price ?? existing.price ?? '').trim();
    const period = String(body.period ?? existing.period ?? '').trim();
    const transactionType = String(body.transaction_type ?? existing.transaction_type ?? '').trim();
    const propertyKind = String(body.property_kind ?? existing.property_kind ?? '').trim();
    if (!title || !city || !price || !transactionType || !propertyKind) {
      throw Object.assign(new Error('Title, location, price, transaction type, and property kind are required.'), { status: 400 });
    }
    if (!['Rent', 'Sale'].includes(transactionType)) throw Object.assign(new Error('Transaction type must be Rent or Sale.'), { status: 400 });
    if (!['Hostel', 'Apartment', 'Frame', 'House', 'Land', 'Commercial', 'Other'].includes(propertyKind)) {
      throw Object.assign(new Error('Choose a supported property kind.'), { status: 400 });
    }
    const parseUrls = (value, label) => {
      const urls = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/\r?\n/) : [];
      const result = [...new Set(urls.map((url) => String(url).trim()).filter(Boolean))];
      if (result.length > 40) throw Object.assign(new Error(`${label} supports up to 40 links.`), { status: 400 });
      for (const url of result) {
        try {
          if (!['http:', 'https:'].includes(new URL(url).protocol)) throw new Error('scheme');
        } catch {
          throw Object.assign(new Error(`Every ${label.toLowerCase()} entry must be an absolute HTTP or HTTPS URL.`), { status: 400 });
        }
      }
      return result;
    };
    const rawFeatures = Array.isArray(body.features) ? body.features : typeof body.features === 'string' ? body.features.split(',') : parseJsonList(existing.features_json);
    const features = [...new Set(rawFeatures.map((feature) => String(feature).trim()).filter(Boolean))];
    if (features.length > 100 || features.some((feature) => feature.length > 100)) {
      throw Object.assign(new Error('Add up to 100 features, each up to 100 characters.'), { status: 400 });
    }
    const lat = body.lat === '' || body.lat == null ? null : Number(body.lat);
    const lng = body.lng === '' || body.lng == null ? null : Number(body.lng);
    if ((lat !== null && !Number.isFinite(lat)) || (lng !== null && !Number.isFinite(lng))) {
      throw Object.assign(new Error('Map coordinates must be valid numbers.'), { status: 400 });
    }
    return {
      title,
      city,
      price,
      period,
      transaction_type: transactionType,
      property_kind: propertyKind,
      description: String(body.description ?? existing.description ?? '').trim(),
      unit_label: String(body.unit_label ?? existing.unit_label ?? '').trim(),
      bedrooms: Math.max(0, Math.min(100, Number.parseInt(body.bedrooms ?? existing.bedrooms ?? 0, 10) || 0)),
      bathrooms: Math.max(0, Math.min(100, Number(body.bathrooms ?? existing.bathrooms ?? 0) || 0)),
      lat,
      lng,
      features,
      images: parseUrls(body.images ?? existing.images_json, 'Images'),
      videos: parseUrls(body.videos ?? existing.videos_json, 'Videos'),
      badge: String(body.badge ?? existing.badge ?? propertyKind).trim(),
      tag: String(body.tag ?? existing.tag ?? '').trim(),
      verification: String(body.verification ?? existing.verification ?? '').trim(),
    };
  };

  const validateUserRole = async (userId, role) => {
    if (!userId) return false;
    if (isPostgresMode) {
      const client = await getPostgresClient();
      const result = await client.query('SELECT 1 FROM users WHERE id = $1 AND role = $2', [userId, role]);
      return result.rowCount > 0;
    }
    return Boolean(db.prepare('SELECT 1 FROM users WHERE id = ? AND role = ?').get(userId, role));
  };

  const listPropertiesForActor = async (actor) => {
    if (isPostgresMode) {
      const client = await getPostgresClient();
      let result;
      if (actor.role === 'Admin') result = await client.query('SELECT * FROM listings WHERE deleted_at IS NULL ORDER BY updated_at DESC, id DESC');
      else if (actor.role === 'Owner') result = await client.query('SELECT * FROM listings WHERE deleted_at IS NULL AND owner_id = $1 ORDER BY updated_at DESC, id DESC', [actor.userId]);
      else result = await client.query('SELECT * FROM listings WHERE deleted_at IS NULL AND (agent_id = $1 OR created_by = $1) ORDER BY updated_at DESC, id DESC', [actor.userId]);
      return result.rows.map(normalizePropertyRecord);
    }
    const rows = actor.role === 'Admin'
      ? db.prepare('SELECT * FROM listings WHERE deleted_at IS NULL ORDER BY updated_at DESC, id DESC').all()
      : actor.role === 'Owner'
        ? db.prepare('SELECT * FROM listings WHERE deleted_at IS NULL AND owner_id = ? ORDER BY updated_at DESC, id DESC').all(actor.userId)
        : db.prepare('SELECT * FROM listings WHERE deleted_at IS NULL AND (agent_id = ? OR created_by = ?) ORDER BY updated_at DESC, id DESC').all(actor.userId, actor.userId);
    return rows.map(normalizePropertyRecord);
  };

  const appendUploadedMedia = async (properties) => {
    if (!properties.length) return properties;
    const ids = properties.map((property) => property.id);
    let mediaRows;
    if (isPostgresMode) {
      const client = await getPostgresClient();
      const result = await client.query('SELECT id, property_id, media_type FROM property_media WHERE property_id = ANY($1::int[]) ORDER BY created_at ASC', [ids]);
      mediaRows = result.rows;
    } else {
      const placeholders = ids.map(() => '?').join(',');
      mediaRows = db.prepare(`SELECT id, property_id, media_type FROM property_media WHERE property_id IN (${placeholders}) ORDER BY created_at ASC`).all(...ids);
    }
    const byProperty = new Map();
    for (const media of mediaRows) {
      const current = byProperty.get(Number(media.property_id)) || { images: [], videos: [] };
      current[media.media_type === 'video' ? 'videos' : 'images'].push(`/api/properties/${media.property_id}/media/${media.id}`);
      byProperty.set(Number(media.property_id), current);
    }
    return properties.map((raw) => {
      const property = normalizePropertyRecord(raw);
      const uploaded = byProperty.get(Number(property.id)) || { images: [], videos: [] };
      const images = [...new Set([...(property.images || []), ...uploaded.images])];
      const videos = [...new Set([...(property.videos || []), ...uploaded.videos])];
      return { ...property, images, videos, image: images[0] || '', video_url: videos[0] || '' };
    });
  };

  app.get('/api/properties', async (_req, res) => {
    if (isPostgresMode) {
      try {
        const client = await getPostgresClient();
        const result = await client.query("SELECT * FROM listings WHERE approval_status = 'Approved' AND deleted_at IS NULL ORDER BY id ASC");
        return res.json({ properties: await appendUploadedMedia(result.rows) });
      } catch (error) {
        return res.status(503).json({ error: error instanceof Error ? error.message : 'Live inventory is unavailable.' });
      }
    }
    const rows = await appendUploadedMedia(db.prepare("SELECT * FROM listings WHERE approval_status = 'Approved' AND deleted_at IS NULL ORDER BY id ASC").all());
    res.json({ properties: rows });
  });

  app.get('/api/property-workbench', requirePropertyAccess, async (req, res) => {
    try {
      const properties = await appendUploadedMedia(await listPropertiesForActor(req.propertyActor));
      res.json({ properties, actor: { id: req.propertyActor.userId, name: req.propertyActor.name, role: req.propertyActor.role } });
    } catch (error) {
      res.status(503).json({ error: error instanceof Error ? error.message : 'Property records are unavailable.' });
    }
  });

  app.get('/api/property-workbench/users', requirePropertyAccess, async (req, res) => {
    try {
      if (isPostgresMode) {
        const client = await getPostgresClient();
        const allowedRoles = req.propertyActor.role === 'Owner' ? ['Agent'] : ['Owner', 'Agent'];
        const result = await client.query('SELECT id, name, role FROM users WHERE role = ANY($1::text[]) ORDER BY name ASC', [allowedRoles]);
        return res.json({ owners: result.rows.filter((user) => user.role === 'Owner'), agents: result.rows.filter((user) => user.role === 'Agent') });
      }
      const roles = req.propertyActor.role === 'Owner' ? ['Agent'] : ['Owner', 'Agent'];
      const users = db.prepare(`SELECT id, name, role FROM users WHERE role IN (${roles.map(() => '?').join(',')}) ORDER BY name ASC`).all(...roles);
      res.json({ owners: users.filter((user) => user.role === 'Owner'), agents: users.filter((user) => user.role === 'Agent') });
    } catch (error) {
      res.status(503).json({ error: error instanceof Error ? error.message : 'User records are unavailable.' });
    }
  });

  app.post('/api/property-workbench/:id/media', requirePropertyAccess, express.raw({ type: '*/*', limit: '80mb' }), async (req, res) => {
    try {
      const property = await getPropertyById(req.params.id);
      if (!property) return res.status(404).json({ error: 'Property record not found.' });
      if (!actorCanEditProperty(req.propertyActor, property)) return res.status(403).json({ error: 'You do not have permission to add media to this property.' });
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: 'Choose a non-empty media file.' });
      const mediaType = String(req.get('x-media-kind') || '');
      const mimeType = String(req.get('content-type') || '').toLowerCase().split(';')[0].trim();
      const supported = mediaType === 'photo'
        ? ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(mimeType)
        : mediaType === 'video' && ['video/mp4', 'video/webm', 'video/quicktime'].includes(mimeType);
      if (!supported) return res.status(415).json({ error: 'Photos must be JPG, PNG, WebP, or AVIF; videos must be MP4, WebM, or MOV.' });
      const maxBytes = mediaType === 'photo' ? 15 * 1024 * 1024 : 70 * 1024 * 1024;
      if (req.body.length > maxBytes) return res.status(413).json({ error: `This ${mediaType} exceeds the ${mediaType === 'photo' ? '15 MB' : '70 MB'} limit.` });
      const mediaId = crypto.randomUUID();
      const originalName = decodeURIComponent(String(req.get('x-file-name') || `property-${mediaType}`)).replace(/[\\/\r\n\0]/g, '').slice(0, 255) || `property-${mediaType}`;
      const now = new Date().toISOString();
      if (isPostgresMode) {
        const client = await getPostgresClient();
        await client.query('BEGIN');
        try {
          await client.query('INSERT INTO property_media (id,property_id,media_type,mime_type,original_name,data,byte_size,created_by,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [mediaId, req.params.id, mediaType, mimeType, originalName, req.body, req.body.length, req.propertyActor.userId, now]);
          await client.query("UPDATE listings SET approval_status='Pending',status='Pending',approved_by=NULL,approved_at=NULL,updated_at=$1 WHERE id=$2", [now, req.params.id]);
          await client.query('INSERT INTO property_history (id,property_id,actor_id,action,changes,created_at) VALUES ($1,$2,$3,$4,$5::jsonb,$6)', [crypto.randomUUID(), req.params.id, req.propertyActor.userId, 'media_added', JSON.stringify({ media_id: mediaId, media_type: mediaType, original_name: originalName, byte_size: req.body.length }), now]);
          await client.query('COMMIT');
        } catch (error) { await client.query('ROLLBACK'); throw error; }
      } else {
        db.transaction(() => {
          db.prepare('INSERT INTO property_media (id,property_id,media_type,mime_type,original_name,data,byte_size,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(mediaId, Number(req.params.id), mediaType, mimeType, originalName, req.body, req.body.length, Number(req.propertyActor.userId), now);
          db.prepare("UPDATE listings SET approval_status='Pending',status='Pending',approved_by=NULL,approved_at=NULL,updated_at=? WHERE id=?").run(now, Number(req.params.id));
          db.prepare('INSERT INTO property_history (id,property_id,actor_id,action,changes_json,created_at) VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(), req.params.id, req.propertyActor.userId, 'media_added', JSON.stringify({ media_id: mediaId, media_type: mediaType, original_name: originalName, byte_size: req.body.length }), now);
        })();
      }
      res.status(201).json({ ok: true, media: { id: mediaId, media_type: mediaType, original_name: originalName, url: `/api/properties/${req.params.id}/media/${mediaId}` }, approval_status: 'Pending' });
    } catch (error) {
      res.status(error?.status || 500).json({ error: error instanceof Error ? error.message : 'Media could not be stored.' });
    }
  });

  app.delete('/api/property-workbench/:id/media/:mediaId', requirePropertyAccess, async (req, res) => {
    try {
      const property = await getPropertyById(req.params.id);
      if (!property) return res.status(404).json({ error: 'Property record not found.' });
      if (!actorCanEditProperty(req.propertyActor, property)) return res.status(403).json({ error: 'You do not have permission to remove media from this property.' });
      const now = new Date().toISOString();
      if (isPostgresMode) {
        const client = await getPostgresClient();
        await client.query('BEGIN');
        try {
          const deleted = await client.query('DELETE FROM property_media WHERE id=$1 AND property_id=$2 RETURNING id', [req.params.mediaId, req.params.id]);
          if (!deleted.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Uploaded media not found.' }); }
          await client.query("UPDATE listings SET approval_status='Pending',status='Pending',approved_by=NULL,approved_at=NULL,updated_at=$1 WHERE id=$2", [now, req.params.id]);
          await client.query('INSERT INTO property_history (id,property_id,actor_id,action,changes,created_at) VALUES ($1,$2,$3,$4,$5::jsonb,$6)', [crypto.randomUUID(), req.params.id, req.propertyActor.userId, 'media_removed', JSON.stringify({ media_id: req.params.mediaId }), now]);
          await client.query('COMMIT');
        } catch (error) { await client.query('ROLLBACK'); throw error; }
      } else {
        const deleted = db.prepare('DELETE FROM property_media WHERE id=? AND property_id=?').run(req.params.mediaId, Number(req.params.id));
        if (!deleted.changes) return res.status(404).json({ error: 'Uploaded media not found.' });
        db.transaction(() => {
          db.prepare("UPDATE listings SET approval_status='Pending',status='Pending',approved_by=NULL,approved_at=NULL,updated_at=? WHERE id=?").run(now, Number(req.params.id));
          db.prepare('INSERT INTO property_history (id,property_id,actor_id,action,changes_json,created_at) VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(), req.params.id, req.propertyActor.userId, 'media_removed', JSON.stringify({ media_id: req.params.mediaId }), now);
        })();
      }
      res.json({ ok: true, approval_status: 'Pending' });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Media could not be removed.' });
    }
  });

  app.get('/api/properties/:propertyId/media/:mediaId', async (req, res) => {
    try {
      let property;
      let media;
      if (isPostgresMode) {
        const client = await getPostgresClient();
        const result = await client.query('SELECT p.approval_status,p.deleted_at,m.mime_type,m.original_name,m.data,m.media_type FROM listings p JOIN property_media m ON m.property_id=p.id WHERE p.id=$1 AND m.id=$2', [req.params.propertyId, req.params.mediaId]);
        property = result.rows[0];
        media = property;
      } else {
        media = db.prepare('SELECT p.approval_status,p.deleted_at,m.mime_type,m.original_name,m.data,m.media_type FROM listings p JOIN property_media m ON m.property_id=p.id WHERE p.id=? AND m.id=?').get(Number(req.params.propertyId), req.params.mediaId);
        property = media;
      }
      if (!property || property.deleted_at || property.approval_status !== 'Approved') return res.sendStatus(404);
      res.setHeader('Content-Type', media.mime_type);
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(media.original_name)}`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(media.data);
    } catch {
      res.sendStatus(404);
    }
  });

  app.get('/api/property-workbench/:id/history', requirePropertyAccess, async (req, res) => {
    try {
      const property = await getPropertyById(req.params.id);
      if (!property) return res.status(404).json({ error: 'Property record not found.' });
      if (!actorCanEditProperty(req.propertyActor, property)) return res.status(403).json({ error: 'You do not have access to this property record.' });
      let history;
      if (isPostgresMode) {
        const client = await getPostgresClient();
        const result = await client.query('SELECT id, property_id, actor_id, action, changes AS changes_json, created_at FROM property_history WHERE property_id = $1 ORDER BY created_at DESC', [req.params.id]);
        history = result.rows.map((row) => ({ ...row, changes: row.changes_json }));
      } else {
        history = db.prepare('SELECT id, property_id, actor_id, action, changes_json, created_at FROM property_history WHERE property_id = ? ORDER BY created_at DESC').all(req.params.id)
          .map((row) => ({ ...row, changes: parseJsonList(row.changes_json) }));
      }
      res.json({ history });
    } catch (error) {
      res.status(503).json({ error: error instanceof Error ? error.message : 'Property history is unavailable.' });
    }
  });

  app.post('/api/property-workbench', requirePropertyAccess, async (req, res) => {
    const actor = req.propertyActor;
    let property;
    try {
      property = normalizePropertyInput(req.body || {});
      let ownerId = actor.role === 'Owner' ? Number(actor.userId) : (req.body?.owner_id ? Number(req.body.owner_id) : null);
      let agentId = actor.role === 'Agent' ? Number(actor.userId) : (req.body?.agent_id ? Number(req.body.agent_id) : null);
      if (ownerId && !(await validateUserRole(ownerId, 'Owner'))) return res.status(400).json({ error: 'Select a valid Owner account.' });
      if (agentId && !(await validateUserRole(agentId, 'Agent'))) return res.status(400).json({ error: 'Select a valid Agent account.' });
      if (actor.role === 'Owner' && ownerId !== Number(actor.userId)) return res.status(403).json({ error: 'Owners may create records only for their own account.' });
      if (actor.role === 'Agent' && agentId !== Number(actor.userId)) return res.status(403).json({ error: 'Agent assignments are recorded to the signed-in agent.' });

      const now = new Date().toISOString();
      const image = property.images[0] || '';
      let id;
      if (isPostgresMode) {
        const client = await getPostgresClient();
        await client.query('BEGIN');
        try {
          const result = await client.query(`
            INSERT INTO listings (title, city, price, period, image, badge, tag, verification, status, description, lat, lng, property_kind, transaction_type, approval_status, owner_id, agent_id, created_by, unit_label, bedrooms, bathrooms, features_json, images_json, videos_json, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Pending',$9,$10,$11,$12,$13,'Pending',$14,$15,$16,$17,$18,$19,$20::jsonb,$21::jsonb,$22::jsonb,$23)
            RETURNING *
          `, [property.title, property.city, property.price, property.period || (property.transaction_type === 'Rent' ? 'per month' : 'For sale'), image, property.badge || property.property_kind, property.tag, property.verification, property.description, property.lat, property.lng, property.property_kind, property.transaction_type, ownerId, agentId, actor.userId, property.unit_label, property.bedrooms, property.bathrooms, JSON.stringify(property.features), JSON.stringify(property.images), JSON.stringify(property.videos), now]);
          id = result.rows[0].id;
          await client.query('INSERT INTO property_history (id, property_id, actor_id, action, changes, created_at) VALUES ($1,$2,$3,$4,$5::jsonb,$6)', [crypto.randomUUID(), id, actor.userId, 'created', JSON.stringify({ approval_status: 'Pending', owner_id: ownerId, agent_id: agentId }), now]);
          await client.query('COMMIT');
          return res.status(201).json({ ok: true, property: normalizePropertyRecord(result.rows[0]) });
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
      const nextId = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM listings').get().nextId;
      const create = db.transaction(() => {
        db.prepare(`
          INSERT INTO listings (id,title,city,price,period,image,badge,tag,verification,status,description,lat,lng,property_kind,transaction_type,approval_status,owner_id,agent_id,created_by,unit_label,bedrooms,bathrooms,features_json,images_json,videos_json,updated_at)
          VALUES (@id,@title,@city,@price,@period,@image,@badge,@tag,@verification,'Pending',@description,@lat,@lng,@property_kind,@transaction_type,'Pending',@owner_id,@agent_id,@created_by,@unit_label,@bedrooms,@bathrooms,@features_json,@images_json,@videos_json,@updated_at)
        `).run({ id: nextId, ...property, period: property.period || (property.transaction_type === 'Rent' ? 'per month' : 'For sale'), image, owner_id: ownerId, agent_id: agentId, created_by: Number(actor.userId), features_json: JSON.stringify(property.features), images_json: JSON.stringify(property.images), videos_json: JSON.stringify(property.videos), updated_at: now });
        db.prepare('INSERT INTO property_history (id,property_id,actor_id,action,changes_json,created_at) VALUES (?,?,?,?,?,?)')
          .run(crypto.randomUUID(), nextId, actor.userId, 'created', JSON.stringify({ approval_status: 'Pending', owner_id: ownerId, agent_id: agentId }), now);
      });
      create();
      const saved = db.prepare('SELECT * FROM listings WHERE id = ?').get(nextId);
      res.status(201).json({ ok: true, property: normalizePropertyRecord(saved) });
    } catch (error) {
      res.status(error?.status || 500).json({ error: error instanceof Error ? error.message : 'Property record could not be created.' });
    }
  });

  app.put('/api/property-workbench/:id', requirePropertyAccess, async (req, res) => {
    const actor = req.propertyActor;
    try {
      const current = await getPropertyById(req.params.id);
      if (!current) return res.status(404).json({ error: 'Property record not found.' });
      if (!actorCanEditProperty(actor, current)) return res.status(403).json({ error: 'You do not have permission to edit this property record.' });
      const property = normalizePropertyInput(req.body || {}, current);
      let ownerId = Number(current.owner_id) || null;
      let agentId = Number(current.agent_id) || null;
      if (actor.role === 'Admin') {
        ownerId = req.body?.owner_id === '' || req.body?.owner_id == null ? null : Number(req.body.owner_id);
        agentId = req.body?.agent_id === '' || req.body?.agent_id == null ? null : Number(req.body.agent_id);
      } else if (actor.role === 'Agent' && req.body?.owner_id !== undefined) {
        ownerId = req.body.owner_id === '' || req.body.owner_id == null ? null : Number(req.body.owner_id);
      } else if (actor.role === 'Owner' && req.body?.agent_id !== undefined) {
        agentId = req.body.agent_id === '' || req.body.agent_id == null ? null : Number(req.body.agent_id);
      }
      if (ownerId && !(await validateUserRole(ownerId, 'Owner'))) return res.status(400).json({ error: 'Select a valid Owner account.' });
      if (agentId && !(await validateUserRole(agentId, 'Agent'))) return res.status(400).json({ error: 'Select a valid Agent account.' });
      const now = new Date().toISOString();
      const image = property.images[0] || '';
      const prior = normalizePropertyRecord(current);
      const changes = Object.fromEntries(['title','city','price','period','property_kind','transaction_type','description','unit_label','bedrooms','bathrooms','features','images','videos','owner_id','agent_id']
        .filter((field) => JSON.stringify(prior[field]) !== JSON.stringify(field === 'features' ? property.features : field === 'images' ? property.images : field === 'videos' ? property.videos : field === 'owner_id' ? ownerId : field === 'agent_id' ? agentId : property[field]))
        .map((field) => [field, { from: prior[field] ?? null, to: field === 'features' ? property.features : field === 'images' ? property.images : field === 'videos' ? property.videos : field === 'owner_id' ? ownerId : field === 'agent_id' ? agentId : property[field] }]));
      if (isPostgresMode) {
        const client = await getPostgresClient();
        await client.query('BEGIN');
        try {
          const result = await client.query(`
            UPDATE listings SET title=$1,city=$2,price=$3,period=$4,image=$5,badge=$6,tag=$7,verification=$8,status='Pending',description=$9,lat=$10,lng=$11,property_kind=$12,transaction_type=$13,approval_status='Pending',owner_id=$14,agent_id=$15,unit_label=$16,bedrooms=$17,bathrooms=$18,features_json=$19::jsonb,images_json=$20::jsonb,videos_json=$21::jsonb,approval_note='',approved_by=NULL,approved_at=NULL,updated_at=$22 WHERE id=$23 RETURNING *
          `, [property.title, property.city, property.price, property.period || (property.transaction_type === 'Rent' ? 'per month' : 'For sale'), image, property.badge || property.property_kind, property.tag, property.verification, property.description, property.lat, property.lng, property.property_kind, property.transaction_type, ownerId, agentId, property.unit_label, property.bedrooms, property.bathrooms, JSON.stringify(property.features), JSON.stringify(property.images), JSON.stringify(property.videos), now, req.params.id]);
          await client.query('INSERT INTO property_history (id,property_id,actor_id,action,changes,created_at) VALUES ($1,$2,$3,$4,$5::jsonb,$6)', [crypto.randomUUID(), req.params.id, actor.userId, 'updated', JSON.stringify(changes), now]);
          await client.query('COMMIT');
          return res.json({ ok: true, property: normalizePropertyRecord(result.rows[0]) });
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
      const update = db.transaction(() => {
        db.prepare(`UPDATE listings SET title=?,city=?,price=?,period=?,image=?,badge=?,tag=?,verification=?,status='Pending',description=?,lat=?,lng=?,property_kind=?,transaction_type=?,approval_status='Pending',owner_id=?,agent_id=?,unit_label=?,bedrooms=?,bathrooms=?,features_json=?,images_json=?,videos_json=?,approval_note='',approved_by=NULL,approved_at=NULL,updated_at=? WHERE id=?`)
          .run(property.title, property.city, property.price, property.period || (property.transaction_type === 'Rent' ? 'per month' : 'For sale'), image, property.badge || property.property_kind, property.tag, property.verification, property.description, property.lat, property.lng, property.property_kind, property.transaction_type, ownerId, agentId, property.unit_label, property.bedrooms, property.bathrooms, JSON.stringify(property.features), JSON.stringify(property.images), JSON.stringify(property.videos), now, Number(req.params.id));
        db.prepare('INSERT INTO property_history (id,property_id,actor_id,action,changes_json,created_at) VALUES (?,?,?,?,?,?)')
          .run(crypto.randomUUID(), req.params.id, actor.userId, 'updated', JSON.stringify(changes), now);
      });
      update();
      return res.json({ ok: true, property: normalizePropertyRecord(db.prepare('SELECT * FROM listings WHERE id = ?').get(Number(req.params.id))) });
    } catch (error) {
      res.status(error?.status || 500).json({ error: error instanceof Error ? error.message : 'Property record could not be updated.' });
    }
  });

  app.delete('/api/property-workbench/:id', requirePropertyAccess, async (req, res) => {
    try {
      const current = await getPropertyById(req.params.id);
      if (!current) return res.status(404).json({ error: 'Property record not found.' });
      if (!actorCanEditProperty(req.propertyActor, current)) return res.status(403).json({ error: 'You do not have permission to delete this property record.' });
      const now = new Date().toISOString();
      if (isPostgresMode) {
        const client = await getPostgresClient();
        await client.query('BEGIN');
        try {
          await client.query("UPDATE listings SET deleted_at=$1,approval_status='Withdrawn',updated_at=$1 WHERE id=$2", [now, req.params.id]);
          await client.query('INSERT INTO property_history (id,property_id,actor_id,action,changes,created_at) VALUES ($1,$2,$3,$4,$5::jsonb,$6)', [crypto.randomUUID(), req.params.id, req.propertyActor.userId, 'deleted', JSON.stringify({ deleted_at: now }), now]);
          await client.query('COMMIT');
        } catch (error) { await client.query('ROLLBACK'); throw error; }
      } else {
        db.transaction(() => {
          db.prepare("UPDATE listings SET deleted_at=?,approval_status='Withdrawn',updated_at=? WHERE id=?").run(now, now, Number(req.params.id));
          db.prepare('INSERT INTO property_history (id,property_id,actor_id,action,changes_json,created_at) VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(), req.params.id, req.propertyActor.userId, 'deleted', JSON.stringify({ deleted_at: now }), now);
        })();
      }
      res.json({ ok: true, id: String(req.params.id), approval_status: 'Withdrawn' });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Property record could not be withdrawn.' });
    }
  });

  app.patch('/api/property-workbench/:id/approval', requirePropertyAccess, async (req, res) => {
    if (req.propertyActor.role !== 'Admin') return res.status(403).json({ error: 'Only an Admin may approve property details.' });
    const decision = String(req.body?.decision || '');
    if (!['Approved', 'Needs_Revision'].includes(decision)) return res.status(400).json({ error: 'Decision must be Approved or Needs_Revision.' });
    const approvalNote = String(req.body?.note || '').trim();
    if (decision === 'Needs_Revision' && !approvalNote) return res.status(400).json({ error: 'Add a revision note before returning this listing.' });
    try {
      const current = await getPropertyById(req.params.id);
      if (!current) return res.status(404).json({ error: 'Property record not found.' });
      const now = new Date().toISOString();
      const status = decision === 'Approved' ? 'Approved' : 'Needs_Revision';
      if (isPostgresMode) {
        const client = await getPostgresClient();
        await client.query('BEGIN');
        try {
          const result = await client.query('UPDATE listings SET approval_status=$1,status=$2,approval_note=$3,approved_by=$4,approved_at=$5,updated_at=$5 WHERE id=$6 RETURNING *', [decision, status, approvalNote, req.propertyActor.userId, now, req.params.id]);
          await client.query('INSERT INTO property_history (id,property_id,actor_id,action,changes,created_at) VALUES ($1,$2,$3,$4,$5::jsonb,$6)', [crypto.randomUUID(), req.params.id, req.propertyActor.userId, 'approval', JSON.stringify({ approval_status: decision, note: approvalNote }), now]);
          await client.query('COMMIT');
          return res.json({ ok: true, property: normalizePropertyRecord(result.rows[0]) });
        } catch (error) { await client.query('ROLLBACK'); throw error; }
      }
      db.transaction(() => {
        db.prepare('UPDATE listings SET approval_status=?,status=?,approval_note=?,approved_by=?,approved_at=?,updated_at=? WHERE id=?').run(decision, status, approvalNote, req.propertyActor.userId, now, now, Number(req.params.id));
        db.prepare('INSERT INTO property_history (id,property_id,actor_id,action,changes_json,created_at) VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(), req.params.id, req.propertyActor.userId, 'approval', JSON.stringify({ approval_status: decision, note: approvalNote }), now);
      })();
      res.json({ ok: true, property: normalizePropertyRecord(db.prepare('SELECT * FROM listings WHERE id=?').get(Number(req.params.id))) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Approval decision could not be saved.' });
    }
  });

  app.post('/api/properties/:propertyId/requests', async (req, res) => {
    const propertyId = Number(req.params.propertyId);
    if (!Number.isInteger(propertyId) || propertyId < 1) return res.status(400).json({ error: 'A valid property ID is required.' });
    if (isPostgresMode) {
      const client = await getPostgresClient();
      const propertyResult = await client.query('SELECT id,title,city,status,price,period,approval_status,deleted_at FROM listings WHERE id=$1', [propertyId]);
      const property = propertyResult.rows[0];
      if (!property || property.deleted_at || property.approval_status !== 'Approved') return res.status(404).json({ error: 'This property is not currently published.' });
      if (/sold|full|unavailable|occupied|leased/i.test(String(property.status))) return res.status(409).json({ error: 'This listing is not accepting requests.' });
      const body = req.body || {};
      const clientName = String(body.client_name || '').trim();
      const email = String(body.client_email || '').trim().toLowerCase();
      const phone = String(body.client_phone || '').trim();
      const normalizedPhone = phone.replace(/\D/g, '');
      const intent = String(body.intent || '');
      if (!clientName) return res.status(400).json({ error: 'Your name is required.' });
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
      if (!email && normalizedPhone.length < 7) return res.status(400).json({ error: 'Provide an email address or a valid phone number.' });
      if (!['Buy', 'Rent'].includes(intent)) return res.status(400).json({ error: 'Choose Buy or Rent.' });
      const rentalListing = !/parcel|land|plot/i.test(`${property.title} ${property.period}`) && /\/(?:mo|sem)|per\s+(?:month|semester|week|night)|\bsemester\b/i.test(`${property.price} ${property.period}`);
      const expectedIntent = rentalListing ? 'Rent' : 'Buy';
      if (intent !== expectedIntent) return res.status(400).json({ error: `This listing accepts ${expectedIntent.toLowerCase()} requests only.` });
      if (body.consent !== true) return res.status(400).json({ error: 'Consent is required before we can share this request with the FLX team.' });
      const preferredDate = body.preferred_date ? new Date(body.preferred_date) : null;
      if (preferredDate && !Number.isFinite(preferredDate.getTime())) return res.status(400).json({ error: 'Preferred contact date is invalid.' });
      const leadId = crypto.randomUUID();
      const requestId = crypto.randomUUID();
      const now = new Date().toISOString();
      const note = `Client requested to ${intent.toLowerCase()} ${property.title} (${property.city}). Availability and payment have not been confirmed.`;
      try {
        await client.query('BEGIN');
        const duplicate = await client.query(`SELECT id FROM property_requests WHERE property_id=$1 AND status='Awaiting availability review' AND (($2 <> '' AND client_email=$2) OR ($3 <> '' AND normalized_phone=$3)) LIMIT 1`, [propertyId, email, normalizedPhone]);
        if (duplicate.rowCount) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'A pending request for this property already exists for these contact details.' });
        }
        await client.query(`INSERT INTO crm_leads (id,title,note,client_name,client_email,client_phone,source,intent,property_id,consent,urgency,owner_id,stage,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,'Marketplace',$7,$8,TRUE,'Normal','system','New',$9,$9)`, [leadId, `Property ${intent.toLowerCase()} request: ${property.title}`, note, clientName, email, phone, intent, String(propertyId), now]);
        await client.query('INSERT INTO crm_activities (id,lead_id,type,body,actor_id,created_at) VALUES ($1,$2,$3,$4,$5,$6)', [crypto.randomUUID(), leadId, 'created', note, 'client-inbound', now]);
        await client.query('INSERT INTO property_requests (id,property_id,crm_lead_id,client_name,client_email,client_phone,normalized_phone,intent,preferred_date,consent,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,$10)', [requestId, propertyId, leadId, clientName, email, phone, normalizedPhone, intent, preferredDate?.toISOString() || null, now]);
        if (preferredDate) await client.query('INSERT INTO crm_tasks (id,lead_id,title,due_at,status,owner_id,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$7)', [crypto.randomUUID(), leadId, 'Confirm requested property availability and contact client', preferredDate.toISOString(), 'Open', 'system', now]);
        await client.query('COMMIT');
        return res.status(201).json({ ok: true, request: { id: requestId, property_id: propertyId, crm_lead_id: leadId, status: 'Awaiting availability review', created_at: now }, payment_enabled: false, message: 'Request recorded for FLX review. This is not a reservation, availability confirmation, or payment.' });
      } catch (error) {
        await client.query('ROLLBACK');
        if (error?.code === '23505') return res.status(409).json({ error: 'A pending request for this property already exists for these contact details.' });
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Property request could not be saved.' });
      }
    }
    const property = db.prepare('SELECT id, title, city, status, price, period FROM listings WHERE id = ?').get(propertyId);
    if (!property) return res.status(404).json({ error: 'This property is no longer in the inventory.' });
    if (/sold|full|unavailable|occupied|leased/i.test(String(property.status))) {
      return res.status(409).json({ error: 'This listing is not accepting requests.' });
    }

    const body = req.body || {};
    const clientName = String(body.client_name || '').trim();
    const email = String(body.client_email || '').trim().toLowerCase();
    const phone = String(body.client_phone || '').trim();
    const normalizedPhone = phone.replace(/\D/g, '');
    const intent = String(body.intent || '');
    const consent = body.consent === true;
    if (!clientName) return res.status(400).json({ error: 'Your name is required.' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (!email && normalizedPhone.length < 7) return res.status(400).json({ error: 'Provide an email address or a valid phone number.' });
    if (!['Buy', 'Rent'].includes(intent)) return res.status(400).json({ error: 'Choose Buy or Rent.' });
    const isRentalListing = !/parcel|land|plot/i.test(`${property.title} ${property.period}`)
      && /\/(?:mo|sem)|per\s+(?:month|semester|week|night)|\bsemester\b/i.test(`${property.price} ${property.period}`);
    const expectedIntent = isRentalListing ? 'Rent' : 'Buy';
    if (intent !== expectedIntent) return res.status(400).json({ error: `This listing accepts ${expectedIntent.toLowerCase()} requests only.` });
    if (!consent) return res.status(400).json({ error: 'Consent is required before we can share this request with the FLX team.' });

    const requestId = crypto.randomUUID();
    const leadId = crypto.randomUUID();
    const now = new Date().toISOString();
    const note = `Client requested to ${intent.toLowerCase()} ${property.title} (${property.city}). Availability and payment have not been confirmed.`;
    try {
      const createRequest = db.transaction(() => {
        const duplicate = db.prepare(`
          SELECT id FROM property_requests
          WHERE property_id = ? AND status = 'Awaiting availability review'
            AND ((? <> '' AND client_email = ?) OR (? <> '' AND normalized_phone = ?))
          LIMIT 1
        `).get(propertyId, email, email, normalizedPhone, normalizedPhone);
        if (duplicate) return { duplicate: true };

        db.prepare(`
          INSERT INTO crm_leads (id, title, note, client_name, client_email, client_phone, source, intent, property_id, consent, urgency, owner_id, stage, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 'Marketplace', ?, ?, 1, 'Normal', 'system', 'New', ?, ?)
        `).run(leadId, `Property ${intent.toLowerCase()} request: ${property.title}`, note, clientName, email, phone, intent, String(propertyId), now, now);
        db.prepare('INSERT INTO crm_activities (id, lead_id, type, body, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(crypto.randomUUID(), leadId, 'created', note, 'client-inbound', now);
        db.prepare(`
          INSERT INTO property_requests (id, property_id, crm_lead_id, client_name, client_email, client_phone, normalized_phone, intent, preferred_date, consent, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        `).run(requestId, propertyId, leadId, clientName, email, phone, normalizedPhone, intent, body.preferred_date ? String(body.preferred_date) : null, now);
        if (body.preferred_date) {
          db.prepare('INSERT INTO crm_tasks (id, lead_id, title, due_at, status, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(crypto.randomUUID(), leadId, 'Confirm requested property availability and contact client', String(body.preferred_date), 'Open', 'system', now, now);
        }
        return { duplicate: false };
      }, { mode: 'immediate' });

      const result = createRequest();
      if (result.duplicate) return res.status(409).json({ error: 'A pending request for this property already exists for these contact details.' });
    } catch (error) {
      if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'A pending request for this property already exists for these contact details.' });
      throw error;
    }

    res.status(201).json({
      ok: true,
      request: { id: requestId, property_id: propertyId, crm_lead_id: leadId, status: 'Awaiting availability review', created_at: now },
      payment_enabled: false,
      message: 'Request recorded for FLX review. This is not a reservation, availability confirmation, or payment.',
    });
  });

  app.post('/api/service-requests', (req, res) => {
    const body = req.body || {};
    const serviceSlug = String(body.service_slug || '').trim();
    const serviceTitle = String(body.service_title || '').trim();
    const clientName = String(body.client_name || '').trim();
    const email = String(body.client_email || '').trim().toLowerCase();
    const phone = String(body.client_phone || '').trim();
    const normalizedPhone = phone.replace(/\D/g, '');
    const intent = String(body.intent || '').trim();
    const note = String(body.note || '').trim();
    const preferredDate = body.preferred_date ? new Date(body.preferred_date) : null;
    if (!serviceSlug || !serviceTitle) return res.status(400).json({ error: 'A valid service is required.' });
    if (!clientName) return res.status(400).json({ error: 'Your name is required.' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (!email && normalizedPhone.length < 7) return res.status(400).json({ error: 'Provide an email address or a valid phone number.' });
    if (!['Buy', 'Rent'].includes(intent)) return res.status(400).json({ error: 'Choose Buy or Rent.' });
    if (preferredDate && !Number.isFinite(preferredDate.getTime())) return res.status(400).json({ error: 'Preferred contact date is invalid.' });
    if (body.consent !== true) return res.status(400).json({ error: 'Consent is required before FLX can respond.' });

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    if (isPostgresMode) {
      const createServiceRequest = async () => {
        const client = await getPostgresClient();
        const result = await client.query(
          `INSERT INTO service_requests (id, service_slug, service_title, client_name, client_email, client_phone, intent, preferred_date, note, consent, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, 'Awaiting response', $10, $10)
           RETURNING *`,
          [id, serviceSlug, serviceTitle, clientName, email, phone, intent, preferredDate ? preferredDate.toISOString() : null, note, now],
        );
        return result.rows[0];
      };

      createServiceRequest().then((request) => {
        res.status(201).json({ ok: true, request: { id: request.id, service_slug: request.service_slug, service_title: request.service_title, client_name: request.client_name, client_email: request.client_email, client_phone: request.client_phone, intent: request.intent, preferred_date: request.preferred_date, note: request.note, status: request.status }, message: 'Your service request was sent to the FLX team. We will contact you as soon as we confirm the next step.' });
      }).catch((error) => {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Service request could not be saved.' });
      });
      return;
    }

    db.prepare(`
      INSERT INTO service_requests (id, service_slug, service_title, client_name, client_email, client_phone, intent, preferred_date, note, consent, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'Awaiting response', ?, ?)
    `).run(id, serviceSlug, serviceTitle, clientName, email, phone, intent, preferredDate ? preferredDate.toISOString() : null, note, now, now);

    res.status(201).json({
      ok: true,
      request: {
        id,
        service_slug: serviceSlug,
        service_title: serviceTitle,
        client_name: clientName,
        client_email: email,
        client_phone: phone,
        intent,
        preferred_date: preferredDate ? preferredDate.toISOString() : null,
        note,
        status: 'Awaiting response',
      },
      message: 'Your service request was sent to the FLX team. We will contact you as soon as we confirm the next step.',
    });
  });

  app.post('/api/contact', (req, res) => {
    const body = req.body || {};
    const clientName = String(body.client_name || '').trim();
    const email = String(body.client_email || '').trim().toLowerCase();
    const phone = String(body.client_phone || '').trim();
    const normalizedPhone = phone.replace(/\D/g, '');
    const message = String(body.message || '').trim();
    if (!clientName) return res.status(400).json({ error: 'Your name is required.' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (!email && normalizedPhone.length < 7) return res.status(400).json({ error: 'Provide an email address or a valid phone number.' });
    if (!message) return res.status(400).json({ error: 'A message is required.' });
    if (body.consent !== true) return res.status(400).json({ error: 'Consent is required before FLX can respond.' });

    if (isPostgresMode) {
      const createPostgresContact = async () => {
        const client = await getPostgresClient();
        const leadId = crypto.randomUUID();
        const now = new Date().toISOString();
        await client.query('BEGIN');
        try {
          const duplicate = await client.query(`SELECT id FROM crm_leads WHERE source='Website contact' AND stage NOT IN ('Won','Lost') AND (($1 <> '' AND LOWER(client_email)=$1) OR ($2 <> '' AND client_phone LIKE $3)) LIMIT 1`, [email, normalizedPhone, normalizedPhone ? `%${normalizedPhone.slice(-9)}` : '']);
          if (duplicate.rowCount) {
            await client.query('ROLLBACK');
            return { duplicate: true };
          }
          await client.query(`INSERT INTO crm_leads (id,title,note,client_name,client_email,client_phone,source,intent,consent,urgency,owner_id,stage,created_at,updated_at) VALUES ($1,'Website contact request',$2,$3,$4,$5,'Website contact','General',TRUE,'Normal','system','New',$6,$6)`, [leadId, message, clientName, email, phone, now]);
          await client.query('INSERT INTO crm_activities (id,lead_id,type,body,actor_id,created_at) VALUES ($1,$2,$3,$4,$5,$6)', [crypto.randomUUID(), leadId, 'created', 'General website contact received with consent.', 'client-inbound', now]);
          await client.query('COMMIT');
          return { duplicate: false, id: leadId, created_at: now };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      };
      createPostgresContact().then((result) => {
        if (result.duplicate) return res.status(409).json({ error: 'An unresolved contact request already exists for these contact details.' });
        res.status(201).json({ ok: true, request: { id: result.id, status: 'Awaiting FLX response', created_at: result.created_at } });
      }).catch((error) => res.status(500).json({ error: error instanceof Error ? error.message : 'Contact request could not be saved.' }));
      return;
    }

    const createContact = db.transaction(() => {
      const duplicate = db.prepare(`
        SELECT id FROM crm_leads WHERE source = 'Website contact'
          AND stage NOT IN ('Won', 'Lost')
          AND ((? <> '' AND LOWER(client_email) = ?) OR (? <> '' AND REPLACE(REPLACE(REPLACE(REPLACE(client_phone, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ?))
        LIMIT 1
      `).get(email, email, normalizedPhone, normalizedPhone ? `%${normalizedPhone.slice(-9)}` : '');
      if (duplicate) return { duplicate: true };

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO crm_leads (id, title, note, client_name, client_email, client_phone, source, intent, consent, urgency, owner_id, stage, created_at, updated_at)
        VALUES (?, 'Website contact request', ?, ?, ?, ?, 'Website contact', 'General', 1, 'Normal', 'system', 'New', ?, ?)
      `).run(id, message, clientName, email, phone, now, now);
      db.prepare('INSERT INTO crm_activities (id, lead_id, type, body, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), id, 'created', 'General website contact received with consent.', 'client-inbound', now);
      return { duplicate: false, id, created_at: now };
    }, { mode: 'immediate' });

    const result = createContact();
    if (result.duplicate) return res.status(409).json({ error: 'An unresolved contact request already exists for these contact details.' });
    res.status(201).json({ ok: true, request: { id: result.id, status: 'Awaiting FLX response', created_at: result.created_at } });
  });

  app.get('/api/locations', async (_req, res) => {
    let rows;
    if (isPostgresMode) {
      try {
        const client = await getPostgresClient();
        const result = await client.query("SELECT id, title, city, lat, lng, price, status, description FROM listings WHERE approval_status = 'Approved' AND deleted_at IS NULL ORDER BY id ASC");
        rows = result.rows.map(normalizeListingRow);
      } catch (error) {
        return res.status(503).json({ error: error instanceof Error ? error.message : 'Property locations are unavailable.' });
      }
    } else rows = db.prepare("SELECT id, title, city, lat, lng, price, status, description FROM listings WHERE approval_status = 'Approved' AND deleted_at IS NULL ORDER BY id ASC").all().map(normalizeListingRow);
    res.json({
      locations: rows.map((row) => ({
        id: row.id,
        title: row.title,
        city: row.city,
        lat: row.lat,
        lng: row.lng,
        price: row.price,
        status: row.status,
        description: row.description,
      })),
      count: rows.length,
    });
  });

  app.get('/api/market-summary', (_req, res) => {
    const entries = db.prepare('SELECT key_name, key_value FROM market_summary').all();
    const summary = Object.fromEntries(entries.map((entry) => [entry.key_name, entry.key_value]));
    const neighborhoodsRows = db.prepare('SELECT name, city, avg_price AS avgPrice, avg_yield AS avgYield, demand_score AS demandScore, trend, note FROM neighborhoods ORDER BY avg_price DESC').all();

    res.json({
      overview: summary.overview ? JSON.parse(summary.overview) : defaultMarketSummary.overview,
      hotspots: summary.hotspots ? JSON.parse(summary.hotspots) : defaultMarketSummary.hotspots,
      recommendations: summary.recommendations ? JSON.parse(summary.recommendations) : defaultMarketSummary.recommendations,
      neighborhoods: neighborhoodsRows,
      lastUpdated: summary.lastUpdated || defaultMarketSummary.lastUpdated,
    });
  });

  app.get('/api/neighborhoods', (_req, res) => {
    const rows = db.prepare('SELECT name, city, avg_price AS avgPrice, avg_yield AS avgYield, demand_score AS demandScore, trend, note FROM neighborhoods ORDER BY avg_price DESC').all();
    res.json({ areas: rows });
  });

  app.post('/api/market-summary', (req, res) => {
    const { overview, hotspots, recommendations, lastUpdated } = req.body || {};
    if (!overview || !hotspots || !recommendations) {
      return res.status(400).json({ error: 'overview, hotspots, and recommendations are required.' });
    }

    db.prepare('INSERT INTO market_summary (key_name, key_value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value').run('overview', JSON.stringify(overview));
    db.prepare('INSERT INTO market_summary (key_name, key_value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value').run('hotspots', JSON.stringify(hotspots));
    db.prepare('INSERT INTO market_summary (key_name, key_value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value').run('recommendations', JSON.stringify(recommendations));
    db.prepare('INSERT INTO market_summary (key_name, key_value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value').run('lastUpdated', String(lastUpdated || new Date().toISOString()));

    res.json({ ok: true, message: 'Market summary updated.' });
  });

  app.get('/api/deals', (_req, res) => {
    const rows = db.prepare('SELECT * FROM deals ORDER BY id ASC').all();
    res.json({ deals: rows });
  });

  app.post('/api/legal/actions', (req, res) => {
    const { transactionId, action, rail, phone } = req.body || {};
    if (!transactionId || !action) {
      return res.status(400).json({ error: 'transactionId and action are required.' });
    }

    const current = db.prepare('SELECT key_value FROM app_data WHERE key_name = ?').get('legalActions');
    const actions = current ? JSON.parse(current.key_value) : [];
    const nextAction = { id: Date.now(), transactionId, action, rail: rail || null, phone: phone || null, created_at: new Date().toISOString() };
    actions.unshift(nextAction);
    db.prepare('INSERT INTO app_data (key_name, key_value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value').run('legalActions', JSON.stringify(actions));
    res.status(201).json({ ok: true, action: nextAction, actions });
  });

  app.get('/api/dashboard', (_req, res) => {
    const metrics = db.prepare('SELECT key_name, key_value FROM owner_metrics').all();
    const map = Object.fromEntries(metrics.map((item) => [item.key_name, item.key_value]));

    res.json({
      totalRevenue: map.totalRevenue || defaultOwnerStats.totalRevenue,
      occupancy: map.occupancy || defaultOwnerStats.occupancy,
      paymentBalance: map.paymentBalance || defaultOwnerStats.paymentBalance,
      propertiesCount: db.prepare('SELECT COUNT(*) AS count FROM listings').get().count,
    });
  });

  app.get('/api/client/dashboard', (_req, res) => {
    const row = db.prepare('SELECT key_value FROM app_data WHERE key_name = ?').get('clientDashboard');
    res.json(row ? JSON.parse(row.key_value) : defaultClientDashboard);
  });

  app.post('/api/client/dashboard', (req, res) => {
    const payload = req.body || defaultClientDashboard;
    db.prepare('INSERT INTO app_data (key_name, key_value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value').run('clientDashboard', JSON.stringify(payload));
    res.json({ ok: true, dashboard: payload });
  });

  app.post('/api/client/tickets', (req, res) => {
    const { title, status = 'Open', eta = 'Assigned' } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Ticket title is required.' });
    const current = db.prepare('SELECT key_value FROM app_data WHERE key_name = ?').get('clientDashboard');
    const dashboard = current ? JSON.parse(current.key_value) : defaultClientDashboard;
    const nextTicket = { id: Date.now(), title, status, eta };
    dashboard.tickets = [...(dashboard.tickets || []), nextTicket];
    db.prepare('INSERT INTO app_data (key_name, key_value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value').run('clientDashboard', JSON.stringify(dashboard));
    res.status(201).json({ ok: true, ticket: nextTicket, dashboard });
  });

  const listCrmLeads = ({ stage, search } = {}) => {
    const clauses = [];
    const values = [];
    if (stage) {
      clauses.push('stage = ?');
      values.push(stage);
    }
    if (search) {
      const digits = String(search).replace(/\D/g, '');
      clauses.push(`(LOWER(title) LIKE ? OR LOWER(client_name) LIKE ? OR LOWER(client_email) LIKE ?${digits ? ' OR client_phone LIKE ?' : ''})`);
      const term = `%${String(search).trim().toLowerCase()}%`;
      values.push(term, term, term);
      if (digits) values.push(`%${digits}%`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return db.prepare(`SELECT * FROM crm_leads ${where} ORDER BY updated_at DESC`).all(...values).map((lead) => ({
      ...lead,
      consent: Boolean(lead.consent),
      note: lead.note,
    }));
  };

  const getAgentDashboard = (actor) => {
    const row = db.prepare('SELECT key_value FROM app_data WHERE key_name = ?').get('agentDashboard');
    const dashboard = row ? JSON.parse(row.key_value) : defaultAgentDashboard;
    const leads = listCrmLeads().map((lead) => ({
      ...lead,
      title: lead.title,
      note: lead.note,
    }));
    return {
      ...dashboard,
      profile: { name: actor.name, title: actor.role },
      stats: [],
      leads,
      deals: [],
      contracts: [],
    };
  };

  app.get('/api/agent/dashboard', requireCrmAccess, (req, res) => res.json(getAgentDashboard(req.crmActor)));

  app.post('/api/agent/dashboard', requireCrmAccess, (req, res) => {
    const payload = req.body || defaultAgentDashboard;
    db.prepare('INSERT INTO app_data (key_name, key_value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value').run('agentDashboard', JSON.stringify(payload));
    res.json({ ok: true, dashboard: getAgentDashboard(req.crmActor) });
  });

  app.get('/api/agent/leads', requireCrmAccess, (req, res) => {
    const leads = listCrmLeads({ stage: req.query.stage, search: req.query.search });
    res.json({ leads });
  });

  app.post('/api/agent/leads/bulk-assign', requireCrmAccess, (req, res) => {
    const leadIds = Array.isArray(req.body?.lead_ids) ? [...new Set(req.body.lead_ids.map(String))] : [];
    const assignedAgentId = String(req.body?.assigned_agent_id || '').trim();
    if (!leadIds.length || !assignedAgentId) return res.status(400).json({ error: 'Select leads and provide an agent ID.' });
    const placeholders = leadIds.map(() => '?').join(', ');
    const leads = db.prepare(`SELECT id FROM crm_leads WHERE id IN (${placeholders})`).all(...leadIds);
    if (leads.length !== leadIds.length) return res.status(404).json({ error: 'One or more selected leads were not found.' });
    const now = new Date().toISOString();
    const actorId = String(req.crmActor.userId);
    db.transaction(() => {
      for (const lead of leads) {
        db.prepare('UPDATE crm_leads SET assigned_agent_id = ?, updated_at = ? WHERE id = ?').run(assignedAgentId, now, lead.id);
        db.prepare('INSERT INTO crm_activities (id, lead_id, type, body, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(crypto.randomUUID(), lead.id, 'assigned', `Assigned to ${assignedAgentId}.`, actorId, now);
      }
    })();
    res.json({ ok: true, dashboard: getAgentDashboard(req.crmActor) });
  });

  app.post('/api/agent/leads', requireCrmAccess, (req, res) => {
    const body = req.body || {};
    const title = String(body.title || body.client_name || '').trim();
    if (!title) return res.status(400).json({ error: 'Lead name or title is required.' });
    const email = String(body.client_email || '').trim().toLowerCase();
    const phone = String(body.client_phone || '').trim();
    const normalizedPhone = phone.replace(/\D/g, '');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (body.intent && !['Buy', 'Rent'].includes(body.intent)) return res.status(400).json({ error: 'Intent must be Buy or Rent.' });
    if (body.urgency && !['Low', 'Normal', 'High', 'Urgent'].includes(body.urgency)) return res.status(400).json({ error: 'Urgency must be Low, Normal, High, or Urgent.' });
    const duplicate = email
      ? db.prepare('SELECT * FROM crm_leads WHERE LOWER(client_email) = ? LIMIT 1').get(email)
      : null;
    const phoneDuplicate = !duplicate && normalizedPhone.length >= 7
      ? db.prepare("SELECT * FROM crm_leads WHERE REPLACE(REPLACE(REPLACE(REPLACE(client_phone, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ? LIMIT 1").get(`%${normalizedPhone.slice(-9)}`)
      : null;
    if (duplicate || phoneDuplicate) {
      return res.status(409).json({ error: 'A lead with this email or phone already exists.', duplicate: { id: (duplicate || phoneDuplicate).id } });
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const assignedAgentId = body.assigned_agent_id ? String(body.assigned_agent_id) : null;
    const actorId = String(req.crmActor.userId);
    const lead = {
      id,
      title,
      note: String(body.note || body.message || ''),
      client_name: String(body.client_name || title),
      client_email: email,
      client_phone: phone,
      source: String(body.source || 'Agent intake'),
      intent: body.intent || 'Buy',
      budget: Number.isFinite(Number(body.budget)) && body.budget !== '' ? Number(body.budget) : null,
      preferred_area: String(body.preferred_area || ''),
      property_id: body.property_id ? String(body.property_id) : null,
      consent: Boolean(body.consent),
      urgency: body.urgency || 'Normal',
      next_contact_at: body.next_contact_at ? String(body.next_contact_at) : null,
      assigned_agent_id: assignedAgentId,
      owner_id: String(req.crmActor.userId),
      stage: 'New',
      loss_reason: null,
      created_at: now,
      updated_at: now,
    };

    const createLead = db.transaction(() => {
      db.prepare(`
        INSERT INTO crm_leads (id, title, note, client_name, client_email, client_phone, source, intent, budget, preferred_area, property_id, consent, urgency, next_contact_at, assigned_agent_id, owner_id, stage, created_at, updated_at)
        VALUES (@id, @title, @note, @client_name, @client_email, @client_phone, @source, @intent, @budget, @preferred_area, @property_id, @consent, @urgency, @next_contact_at, @assigned_agent_id, @owner_id, @stage, @created_at, @updated_at)
      `).run({ ...lead, consent: Number(lead.consent) });
      db.prepare('INSERT INTO crm_activities (id, lead_id, type, body, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), id, 'created', `Lead created from ${lead.source}.`, actorId, now);
      if (assignedAgentId) {
        db.prepare('INSERT INTO crm_activities (id, lead_id, type, body, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(crypto.randomUUID(), id, 'assigned', `Assigned to ${assignedAgentId}.`, actorId, now);
      }
      if (lead.next_contact_at) {
        db.prepare('INSERT INTO crm_tasks (id, lead_id, title, due_at, status, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(crypto.randomUUID(), id, 'Contact lead', lead.next_contact_at, 'Open', assignedAgentId || actorId, now, now);
      }
    });
    createLead();
    const savedLead = db.prepare('SELECT * FROM crm_leads WHERE id = ?').get(id);
    res.status(201).json({ ok: true, lead: { ...savedLead, consent: Boolean(savedLead.consent) }, dashboard: getAgentDashboard(req.crmActor) });
  });

  app.patch('/api/agent/leads/:leadId', requireCrmAccess, (req, res) => {
    const lead = db.prepare('SELECT * FROM crm_leads WHERE id = ?').get(req.params.leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });
    const stage = req.body?.stage || req.body?.status;
    const allowedStages = ['New', 'Contacted', 'Qualified', 'Viewing', 'Offer', 'Won', 'Lost'];
    if (!stage || !allowedStages.includes(stage)) return res.status(400).json({ error: 'Choose a valid lead lifecycle stage.' });
    const lossReason = String(req.body?.loss_reason || '').trim();
    if (stage === 'Lost' && !lossReason) return res.status(400).json({ error: 'A reason is required when marking a lead Lost.' });

    const now = new Date().toISOString();
    const actorId = String(req.crmActor.userId);
    db.transaction(() => {
      db.prepare('UPDATE crm_leads SET stage = ?, loss_reason = ?, updated_at = ? WHERE id = ?').run(stage, stage === 'Lost' ? lossReason : null, now, lead.id);
      db.prepare('INSERT INTO crm_activities (id, lead_id, type, body, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), lead.id, 'stage_changed', `${lead.stage} -> ${stage}${stage === 'Lost' ? `: ${lossReason}` : ''}`, actorId, now);
    })();
    res.json({ ok: true, lead: db.prepare('SELECT * FROM crm_leads WHERE id = ?').get(lead.id), dashboard: getAgentDashboard(req.crmActor) });
  });

  app.get('/api/agent/leads/:leadId/activities', requireCrmAccess, (req, res) => {
    if (!db.prepare('SELECT 1 FROM crm_leads WHERE id = ?').get(req.params.leadId)) return res.status(404).json({ error: 'Lead not found.' });
    const activities = db.prepare('SELECT * FROM crm_activities WHERE lead_id = ? ORDER BY created_at ASC, rowid ASC').all(req.params.leadId);
    res.json({ activities });
  });

  app.get('/api/agent/leads/:leadId/tasks', requireCrmAccess, (req, res) => {
    if (!db.prepare('SELECT 1 FROM crm_leads WHERE id = ?').get(req.params.leadId)) return res.status(404).json({ error: 'Lead not found.' });
    const tasks = db.prepare('SELECT * FROM crm_tasks WHERE lead_id = ? ORDER BY due_at ASC, created_at ASC').all(req.params.leadId);
    res.json({ tasks });
  });

  app.get('/api/owner', (_req, res) => {
    const row = db.prepare('SELECT key_value FROM app_data WHERE key_name = ?').get('ownerDashboard');
    res.json(row ? JSON.parse(row.key_value) : defaultOwnerDashboard);
  });

  app.post('/api/owner', (req, res) => {
    const payload = req.body || defaultOwnerDashboard;
    db.prepare('INSERT INTO app_data (key_name, key_value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value').run('ownerDashboard', JSON.stringify(payload));
    res.json({ ok: true, dashboard: payload, portfolio: payload.portfolio || defaultOwnerDashboard.portfolio });
  });

  app.post('/api/owner/units', (req, res) => {
    const { name, label, value, status } = req.body || {};
    if (!name || !label) return res.status(400).json({ error: 'Unit name and label are required.' });
    const current = db.prepare('SELECT key_value FROM app_data WHERE key_name = ?').get('ownerDashboard');
    const dashboard = current ? JSON.parse(current.key_value) : defaultOwnerDashboard;
    const nextUnit = { name, label, value: value || 'TZS 0', status: status || 'New' };
    dashboard.portfolio = dashboard.portfolio || { totalRevenue: 'TZS 0', occupancy: '0%', paymentBalance: 'TZS 0', units: [] };
    dashboard.portfolio.units = [nextUnit, ...(dashboard.portfolio.units || [])];
    db.prepare('INSERT INTO app_data (key_name, key_value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value').run('ownerDashboard', JSON.stringify(dashboard));
    res.status(201).json({ ok: true, dashboard, portfolio: dashboard.portfolio });
  });

  app.get('/api/ops/dashboard', (_req, res) => {
    const row = db.prepare('SELECT key_value FROM app_data WHERE key_name = ?').get('opsDashboard');
    res.json(row ? JSON.parse(row.key_value) : defaultOpsDashboard);
  });

  app.post('/api/ops/dashboard', (req, res) => {
    const payload = req.body || defaultOpsDashboard;
    db.prepare('INSERT INTO app_data (key_name, key_value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value').run('opsDashboard', JSON.stringify(payload));
    res.json({ ok: true, dashboard: payload });
  });

  app.post('/api/ops/incidents', (req, res) => {
    const { title, summary, action } = req.body || {};
    if (!title || !summary) return res.status(400).json({ error: 'Incident title and summary are required.' });
    const current = db.prepare('SELECT key_value FROM app_data WHERE key_name = ?').get('opsDashboard');
    const dashboard = current ? JSON.parse(current.key_value) : defaultOpsDashboard;
    const createdAt = new Date().toISOString();
    dashboard.disputes = [{ title, summary, action: action || 'Escalate case', status: 'Open', createdAt }, ...(dashboard.disputes || [])];
    dashboard.auditTrail = [{ id: crypto.randomUUID(), action: 'Incident created', target: title, at: createdAt }, ...(dashboard.auditTrail || [])];
    db.prepare('INSERT INTO app_data (key_name, key_value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value').run('opsDashboard', JSON.stringify(dashboard));
    res.status(201).json({ ok: true, dashboard });
  });

  app.get('/api/admin/properties', requireAdmin, async (_req, res) => {
    if (isPostgresMode) {
      try {
        const client = await getPostgresClient();
        const result = await client.query('SELECT * FROM listings ORDER BY id ASC');
        return res.json({ properties: result.rows });
      } catch (error) {
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load admin properties.' });
      }
    }

    const rows = db.prepare('SELECT * FROM listings ORDER BY id ASC').all();
    res.json({ properties: rows });
  });

  app.post('/api/admin/properties', requireAdmin, async (req, res) => {
    const { title, city, price, period, image, badge, tag, verification, status, description, lat, lng, location } = req.body || {};
    const nextLat = Number(location?.lat ?? lat ?? -6.7924);
    const nextLng = Number(location?.lng ?? lng ?? 39.2083);

    if (!title || !city || !price) {
      return res.status(400).json({ error: 'Title, city and price are required.' });
    }

    if (isPostgresMode) {
      try {
        const client = await getPostgresClient();
        const query = `
          INSERT INTO listings (title, city, price, period, image, badge, tag, verification, status, description, lat, lng, approval_status, created_by, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending', $9, $10, $11, 'Pending', $12, NOW())
        `;
        await client.query(query, [title, city, price, period || 'On request', image || 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80', badge || 'New', tag || '', verification || '', description || '', nextLat, nextLng, req.adminActor.userId]);
        const result = await client.query('SELECT * FROM listings ORDER BY id ASC');
        return res.status(201).json({ ok: true, properties: result.rows.map(normalizeListingRow) });
      } catch (error) {
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to create property.' });
      }
    }

    const nextId = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM listings').get().nextId;
    db.prepare(`
      INSERT INTO listings (id, title, city, price, period, image, badge, tag, verification, status, description, lat, lng, approval_status, created_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, 'Pending', ?, ?)
    `).run(
      nextId,
      title,
      city,
      price,
      period || 'On request',
      image || 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80',
      badge || 'New',
      tag || '',
      verification || '',
      description || '',
      Number.isFinite(nextLat) ? nextLat : -6.7924,
      Number.isFinite(nextLng) ? nextLng : 39.2083,
      req.adminActor.userId,
      new Date().toISOString(),
    );

    const rows = db.prepare('SELECT * FROM listings ORDER BY id ASC').all().map(normalizeListingRow);
    res.status(201).json({ ok: true, properties: rows });
  });

  app.put('/api/admin/properties/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, city, price, period, image, badge, tag, verification, status, description, lat, lng, location } = req.body || {};
    const nextLat = Number(location?.lat ?? lat ?? -6.7924);
    const nextLng = Number(location?.lng ?? lng ?? 39.2083);
    if (!title || !city || !price) {
      return res.status(400).json({ error: 'Title, city and price are required.' });
    }

    if (isPostgresMode) {
      try {
        const client = await getPostgresClient();
        await client.query(
          `UPDATE listings SET title = $1, city = $2, price = $3, period = $4, image = $5, badge = $6, tag = $7, verification = $8, status = 'Pending', description = $9, lat = $10, lng = $11, approval_status = 'Pending', approved_by = NULL, approved_at = NULL, updated_at = NOW() WHERE id = $12`,
          [title, city, price, period || 'On request', image || 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80', badge || 'New', tag || '', verification || '', description || '', nextLat, nextLng, id],
        );
        const result = await client.query('SELECT * FROM listings ORDER BY id ASC');
        return res.json({ ok: true, properties: result.rows.map(normalizeListingRow) });
      } catch (error) {
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to update property.' });
      }
    }

    const current = db.prepare('SELECT * FROM listings WHERE id = ?').get(Number(id));
    if (!current) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    db.prepare(`
      UPDATE listings
      SET title = ?, city = ?, price = ?, period = ?, image = ?, badge = ?, tag = ?, verification = ?, status = 'Pending', description = ?, lat = ?, lng = ?, approval_status = 'Pending', approved_by = NULL, approved_at = NULL, updated_at = ?
      WHERE id = ?
    `).run(
      title,
      city,
      price,
      period || current.period || 'On request',
      image || current.image || 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80',
      badge || current.badge || 'New',
      tag || current.tag || 'Verified',
      verification || current.verification || 'Ready for intake',
      description || current.description || 'Fresh listing added from FLX operations.',
      Number.isFinite(nextLat) ? nextLat : current.lat ?? -6.7924,
      Number.isFinite(nextLng) ? nextLng : current.lng ?? 39.2083,
      new Date().toISOString(),
      Number(id),
    );

    const rows = db.prepare('SELECT * FROM listings ORDER BY id ASC').all().map(normalizeListingRow);
    res.json({ ok: true, properties: rows });
  });

  app.delete('/api/admin/properties/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;

    if (isPostgresMode) {
      try {
        const client = await getPostgresClient();
        await client.query('DELETE FROM listings WHERE id = $1', [id]);
        const result = await client.query('SELECT * FROM listings ORDER BY id ASC');
        return res.json({ ok: true, properties: result.rows });
      } catch (error) {
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to delete property.' });
      }
    }

    db.prepare('DELETE FROM listings WHERE id = ?').run(Number(id));
    const rows = db.prepare('SELECT * FROM listings ORDER BY id ASC').all();
    res.json({ ok: true, properties: rows });
  });

  app.get('/api/saved', (req, res) => {
    const email = String(req.query.email || 'admin@flx.local');
    const rows = db.prepare('SELECT property_id FROM saved_listings WHERE user_email = ? ORDER BY id ASC').all(email);
    res.json({ savedIds: rows.map((row) => Number(row.property_id)) });
  });

  app.post('/api/saved', (req, res) => {
    const { email = 'admin@flx.local', propertyId } = req.body || {};
    if (!propertyId) {
      return res.status(400).json({ error: 'Missing propertyId' });
    }

    const exists = db.prepare('SELECT 1 FROM saved_listings WHERE user_email = ? AND property_id = ?').get(email, Number(propertyId));
    if (exists) {
      db.prepare('DELETE FROM saved_listings WHERE user_email = ? AND property_id = ?').run(email, Number(propertyId));
      return res.json({ saved: false, savedIds: db.prepare('SELECT property_id FROM saved_listings WHERE user_email = ? ORDER BY id ASC').all(email).map((row) => Number(row.property_id)) });
    }

    db.prepare('INSERT INTO saved_listings (user_email, property_id) VALUES (?, ?)').run(email, Number(propertyId));
    const savedIds = db.prepare('SELECT property_id FROM saved_listings WHERE user_email = ? ORDER BY id ASC').all(email).map((row) => Number(row.property_id));
    res.json({ saved: true, savedIds });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, phone, username, identifier, password } = req.body || {};
    const loginIdentifier = String(identifier || email || phone || username || '').trim();
    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Email, phone, username, and password are required.' });
    }

    const normalizedIdentifier = loginIdentifier.toLowerCase();
    const normalizedPhone = loginIdentifier.replace(/[^0-9+]/g, '').toLowerCase();
    const nowMs = Date.now();
    const attemptKey = `${req.ip || req.socket.remoteAddress}:${normalizedIdentifier}`;
    const priorAttempts = loginFailures.get(attemptKey);
    const attempts = !priorAttempts || nowMs - priorAttempts.startedAt > 15 * 60 * 1000
      ? { count: 0, startedAt: nowMs }
      : priorAttempts;
    if (attempts.count >= 5) return res.status(429).json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' });
    let user;
    if (isPostgresMode) {
      try {
        const client = await getPostgresClient();
        const result = await client.query(
          'SELECT * FROM users WHERE LOWER(COALESCE(email, \'\')) = $1 OR LOWER(COALESCE(phone, \'\')) = $2 OR LOWER(COALESCE(username, \'\')) = $3 OR LOWER(COALESCE(name, \'\')) = $4 LIMIT 1',
          [normalizedIdentifier, normalizedPhone, normalizedIdentifier, normalizedIdentifier],
        );
        user = result.rows[0];
      } catch (error) {
        return res.status(503).json({ error: error instanceof Error ? error.message : 'Authentication service unavailable.' });
      }
    } else {
      user = db.prepare(`
        SELECT * FROM users
        WHERE LOWER(COALESCE(email, '')) = ?
           OR LOWER(COALESCE(phone, '')) = ?
           OR LOWER(COALESCE(username, '')) = ?
           OR LOWER(COALESCE(name, '')) = ?
        LIMIT 1
      `).get(normalizedIdentifier, normalizedPhone, normalizedIdentifier, normalizedIdentifier);
    }

    if (!user || !(await verifyPassword(password, user.password))) {
      loginFailures.set(attemptKey, { count: attempts.count + 1, startedAt: attempts.startedAt });
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    loginFailures.delete(attemptKey);
    if (user.approval_status !== 'Approved') {
      return res.status(403).json({ approval_required: true, approval_status: user.approval_status, error: user.approval_status === 'Rejected' ? 'This account application was not approved. Contact FLX support.' : 'Your account is awaiting FLX approval.' });
    }

    const now = new Date().toISOString();
    if (!String(user.password).startsWith('scrypt$')) {
      user.password = await hashPassword(password);
      if (isPostgresMode) {
        const client = await getPostgresClient();
        await client.query('UPDATE users SET password = $1 WHERE id = $2', [user.password, user.id]);
      } else db.prepare('UPDATE users SET password = ? WHERE id = ?').run(user.password, user.id);
    }
    if (isPostgresMode) {
      const client = await getPostgresClient();
      await client.query('UPDATE users SET last_login_at = $1 WHERE id = $2', [now, user.id]);
      await client.query('INSERT INTO login_events (user_id, event_type, created_at) VALUES ($1, $2, $3)', [user.id, 'login', now]);
    } else {
      const transaction = db.transaction(() => {
        db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, user.id);
        db.prepare('INSERT INTO login_events (user_id, event_type, created_at) VALUES (?, ?, ?)').run(user.id, 'login', now);
      });
      transaction();
    }

    const token = createSessionToken(user);

    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        profile_picture: user.profile_picture || '',
        client_category: user.client_category || '',
        approval_status: user.approval_status,
      },
    });
  });

  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role, client_category: clientCategory, phone, username } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').trim();
    const cleanUsername = String(username || '').trim();
    if (!name || (!cleanEmail && !cleanPhone) || !password) {
      return res.status(400).json({ error: 'Name, email or phone, and password are required.' });
    }
    if (String(password).length < 6) return res.status(400).json({ error: 'Use a password with at least 6 characters.' });

    const normalizedEmail = cleanEmail;
    const requestedRole = String(role || 'Client');
    const usernameValue = cleanUsername || cleanEmail.split('@')[0] || `user-${Date.now()}`;
    const clientCategories = ['University scholar (hostel)', 'Frame (business space)', 'Apartment (residential tenants)', 'Land or property buyers'];
    if (!['Client', 'Owner', 'Agent', 'Investor'].includes(requestedRole)) {
      return res.status(400).json({ error: 'Public registration is available for Client, Owner, Agent, or Investor accounts only.' });
    }
    if (requestedRole === 'Client' && !clientCategories.includes(clientCategory)) return res.status(400).json({ error: 'Choose a client account category.' });
    const approvalStatus = ['Owner', 'Agent'].includes(requestedRole) ? 'Pending' : 'Approved';
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    let existing;
    if (isPostgresMode) {
      try {
        const client = await getPostgresClient();
        const emailMatch = normalizedEmail ? await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]) : { rows: [] };
        const phoneMatch = cleanPhone ? await client.query('SELECT id FROM users WHERE LOWER(COALESCE(phone, \'\')) = $1', [cleanPhone.replace(/\s+/g, '').toLowerCase()]) : { rows: [] };
        const usernameMatch = usernameValue ? await client.query('SELECT id FROM users WHERE LOWER(COALESCE(username, \'\')) = $1', [usernameValue.toLowerCase()]) : { rows: [] };
        existing = emailMatch.rows[0] || phoneMatch.rows[0] || usernameMatch.rows[0];
      } catch (error) {
        return res.status(503).json({ error: error instanceof Error ? error.message : 'Registration service unavailable.' });
      }
    } else {
      const duplicateClauses = [];
      const duplicateParams = [];
      if (normalizedEmail) {
        duplicateClauses.push("LOWER(COALESCE(email, '')) = ?");
        duplicateParams.push(normalizedEmail);
      }
      if (cleanPhone) {
        duplicateClauses.push("LOWER(COALESCE(phone, '')) = ?");
        duplicateParams.push(cleanPhone.replace(/\s+/g, '').toLowerCase());
      }
      if (usernameValue) {
        duplicateClauses.push("LOWER(COALESCE(username, '')) = ?");
        duplicateParams.push(usernameValue.toLowerCase());
      }
      existing = duplicateClauses.length
        ? db.prepare(`SELECT id FROM users WHERE ${duplicateClauses.join(' OR ')} LIMIT 1`).get(...duplicateParams)
        : null;
    }
    if (existing) {
      return res.status(409).json({ error: 'An account already exists for that email or phone number.' });
    }

    let user;
    if (isPostgresMode) {
      try {
        const client = await getPostgresClient();
        const result = await client.query(`
          INSERT INTO users (name, username, email, password, role, phone, client_category, approval_status, approved_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $8 = 'Approved' THEN NOW() ELSE NULL END)
          RETURNING id, name, username, email, role, phone, client_category, approval_status
        `, [String(name).trim(), usernameValue, normalizedEmail || `user-${Date.now()}@flx.local`, passwordHash, requestedRole, cleanPhone, requestedRole === 'Client' ? clientCategory : '', approvalStatus]);
        user = result.rows[0];
        await client.query('INSERT INTO login_events (user_id, event_type, created_at) VALUES ($1, $2, $3)', [user.id, 'signup', now]);
      } catch (error) {
        if (error?.code === '23505') return res.status(409).json({ error: 'Account already exists for that email.' });
        return res.status(503).json({ error: error instanceof Error ? error.message : 'Registration service unavailable.' });
      }
    } else {
      const result = db.prepare(`
        INSERT INTO users (name, username, email, password, role, phone, client_category, approval_status, approved_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(String(name).trim(), usernameValue, normalizedEmail || `user-${Date.now()}@flx.local`, passwordHash, requestedRole, cleanPhone, requestedRole === 'Client' ? clientCategory : '', approvalStatus, approvalStatus === 'Approved' ? now : null);
      user = db.prepare('SELECT id, name, email, role, phone, client_category, approval_status FROM users WHERE id = ?').get(result.lastInsertRowid);
      db.prepare('INSERT INTO login_events (user_id, event_type, created_at) VALUES (?, ?, ?)').run(user.id, 'signup', now);
    }
    if (approvalStatus === 'Pending') {
      return res.status(202).json({ ok: true, pending_approval: true, message: `Your ${requestedRole.toLowerCase()} account is waiting for FLX approval.`, user });
    }
    const token = createSessionToken(user);
    res.status(201).json({ ok: true, token, user });
  });

  app.get('/api/auth/session', async (req, res) => {
    const session = getSessionUser(req);
    if (!session) {
      return res.status(401).json({ error: 'No active session.' });
    }

    let user;
    if (isPostgresMode) {
      try {
        const client = await getPostgresClient();
        const result = await client.query('SELECT id, name, email, role, phone, profile_picture, client_category, approval_status FROM users WHERE email = $1', [String(session.email).trim().toLowerCase()]);
        user = result.rows[0];
      } catch (error) {
        return res.status(503).json({ error: error instanceof Error ? error.message : 'Authentication service unavailable.' });
      }
    } else user = db.prepare('SELECT id, name, email, role, phone, profile_picture, client_category, approval_status FROM users WHERE email = ?').get(String(session.email).trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Session user no longer exists.' });
    }

    res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone || '', profile_picture: user.profile_picture || '', client_category: user.client_category || '', approval_status: user.approval_status } });
  });

  app.patch('/api/auth/profile', async (req, res) => {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: 'Sign in to edit your profile.' });
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').trim();
    const profilePicture = req.body?.profile_picture == null ? undefined : String(req.body.profile_picture);
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' });
    if (profilePicture && (!/^data:image\/(?:png|jpeg|webp);base64,/.test(profilePicture) || profilePicture.length > 1_500_000)) return res.status(400).json({ error: 'Profile photos must be PNG, JPEG, or WebP under 1 MB.' });

    try {
      let user;
      if (isPostgresMode) {
        const client = await getPostgresClient();
        const result = await client.query('UPDATE users SET name=$1,email=$2,phone=$3,profile_picture=COALESCE($4,profile_picture) WHERE id=$5 RETURNING id,name,email,role,phone,profile_picture,client_category,approval_status', [name, email, phone, profilePicture, session.userId]);
        user = result.rows[0];
      } else {
        db.prepare('UPDATE users SET name=?,email=?,phone=?,profile_picture=COALESCE(?,profile_picture) WHERE id=?').run(name, email, phone, profilePicture ?? null, session.userId);
        user = db.prepare('SELECT id,name,email,role,phone,profile_picture,client_category,approval_status FROM users WHERE id=?').get(session.userId);
      }
      if (!user) return res.status(404).json({ error: 'Account not found.' });
      session.email = user.email;
      session.name = user.name;
      session.picture = user.profile_picture || '';
      return res.json({ ok: true, user });
    } catch (error) {
      if (error?.code === '23505' || String(error?.code) === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'That email is already in use.' });
      return res.status(500).json({ error: 'Unable to update profile.' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : String(req.body?.token || '');
    if (token) sessions.delete(token);
    res.json({ ok: true });
  });

  app.post('/api/units', requireAdmin, (req, res) => {
    const { title, city, price, period, image, badge, tag, verification, status, description } = req.body || {};
    if (!title || !city || !price) {
      return res.status(400).json({ error: 'Title, city and price are required.' });
    }

    const nextId = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM listings').get().nextId;
    db.prepare(`
      INSERT INTO listings (id, title, city, price, period, image, badge, tag, verification, status, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nextId,
      title,
      city,
      price,
      period || 'On request',
      image || 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80',
      badge || 'New',
      tag || 'Verified',
      verification || 'Ready for intake',
      status || 'New',
      description || 'Fresh listing added from FLX operations.',
    );

    const rows = db.prepare('SELECT * FROM listings ORDER BY id ASC').all();
    res.status(201).json({ ok: true, properties: rows });
  });

  return app;
};

const PORT = Number(process.env.PORT || 3001);

const isDirectRun = (() => {
  try {
    const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
    return invokedPath === import.meta.url;
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  const startServer = async () => {
    if (isPostgresMode) await ensurePostgresSeedData();
    const app = createApp();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend running on http://localhost:${PORT} (${isPostgresMode ? 'postgres' : 'sqlite'})`);
    });
  };
  startServer().catch((error) => {
    console.error('Backend startup failed:', error);
    process.exitCode = 1;
  });
}
