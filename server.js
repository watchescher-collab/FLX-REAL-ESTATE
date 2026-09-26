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
const databaseMode = String(process.env.DB_MODE || 'sqlite').toLowerCase();
const postgresUrl = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/flx_real_estate';
const isPostgresMode = databaseMode === 'postgres';
const sessions = new Map();
let postgresClient = null;

const getPostgresClient = async () => {
  if (!isPostgresMode) return null;
  if (!postgresClient) {
    postgresClient = new pg.Client({ connectionString: postgresUrl });
    await postgresClient.connect();
  }
  return postgresClient;
};

const postgresSchema = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Client',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

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
`;

const ensurePostgresSeedData = async () => {
  if (!isPostgresMode) return;

  const client = await getPostgresClient();
  await client.query(postgresSchema);

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

  const userCount = await client.query('SELECT COUNT(*)::int AS count FROM users');
  if (userCount.rows[0].count === 0) {
    await client.query(`
      INSERT INTO users (name, email, password, role) VALUES
        ('Aisha Mtega', 'client@flx.local', 'client123', 'Client'),
        ('Neema Joseph', 'owner@flx.local', 'owner123', 'Owner'),
        ('Baraka Hassan', 'agent@flx.local', 'agent123', 'Agent'),
        ('Daniel Kimaro', 'investor@flx.local', 'investor123', 'Investor'),
        ('FLX Admin', 'admin@flx.local', 'admin123', 'Admin')
    `);
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
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

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

    CREATE UNIQUE INDEX IF NOT EXISTS property_requests_pending_email_idx
      ON property_requests(property_id, client_email)
      WHERE status = 'Awaiting availability review' AND client_email <> '';
    CREATE UNIQUE INDEX IF NOT EXISTS property_requests_pending_phone_idx
      ON property_requests(property_id, normalized_phone)
      WHERE status = 'Awaiting availability review' AND normalized_phone <> '';
  `);

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
    ['Aisha Mtega', 'client@flx.local', 'client123', 'Client'],
    ['Neema Joseph', 'owner@flx.local', 'owner123', 'Owner'],
    ['Baraka Hassan', 'agent@flx.local', 'agent123', 'Agent'],
    ['Daniel Kimaro', 'investor@flx.local', 'investor123', 'Investor'],
    ['FLX Admin', 'admin@flx.local', 'admin123', 'Admin'],
  ];
  const insertDemoUser = db.prepare(`
    INSERT OR IGNORE INTO users (name, email, password, role)
    VALUES (?, ?, ?, ?)
  `);
  const insertDemoUsers = db.transaction((users) => {
    for (const user of users) insertDemoUser.run(...user);
  });
  insertDemoUsers(demoUsers);

  const savedCount = db.prepare('SELECT COUNT(*) AS count FROM saved_listings WHERE user_email = ?').get('admin@flx.local');
  if (!savedCount.count) {
    db.prepare('INSERT INTO saved_listings (user_email, property_id) VALUES (?, ?)').run('admin@flx.local', 1);
  }
};

createTables();
ensureListingLocationColumns();
removeLegacyOpsFixtures();
removeLegacyAgentFixtures();

export const createApp = () => {
  const app = express();
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
    const lat = Number(row?.lat ?? row?.latitude ?? -6.7924);
    const lng = Number(row?.lng ?? row?.longitude ?? 39.2083);
    return {
      ...row,
      lat: Number.isFinite(lat) ? lat : -6.7924,
      lng: Number.isFinite(lng) ? lng : 39.2083,
    };
  };

  const requireCrmAccess = (req, res, next) => {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: 'Sign in to access CRM records.' });
    if (!['Agent', 'Admin'].includes(session.role)) return res.status(403).json({ error: 'An Agent or Admin account is required.' });
    req.crmActor = session;
    next();
  };

  app.get('/api/properties', (_req, res) => {
    const rows = db.prepare('SELECT * FROM listings ORDER BY id ASC').all().map(normalizeListingRow);
    res.json({ properties: rows });
  });

  app.post('/api/properties/:propertyId/requests', (req, res) => {
    const propertyId = Number(req.params.propertyId);
    if (!Number.isInteger(propertyId) || propertyId < 1) return res.status(400).json({ error: 'A valid property ID is required.' });
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

  app.get('/api/locations', (_req, res) => {
    const rows = db.prepare('SELECT id, title, city, lat, lng, price, status, description FROM listings ORDER BY id ASC').all().map(normalizeListingRow);
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

  app.get('/api/admin/properties', requireCrmAccess, async (_req, res) => {
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

  app.post('/api/admin/properties', requireCrmAccess, async (req, res) => {
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
          INSERT INTO listings (title, city, price, period, image, badge, tag, verification, status, description, lat, lng)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `;
        await client.query(query, [title, city, price, period || 'On request', image || 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80', badge || 'New', tag || 'Verified', verification || 'Ready for intake', status || 'New', description || 'Fresh listing added from FLX operations.', nextLat, nextLng]);
        const result = await client.query('SELECT * FROM listings ORDER BY id ASC');
        return res.status(201).json({ ok: true, properties: result.rows.map(normalizeListingRow) });
      } catch (error) {
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to create property.' });
      }
    }

    const nextId = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM listings').get().nextId;
    db.prepare(`
      INSERT INTO listings (id, title, city, price, period, image, badge, tag, verification, status, description, lat, lng)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      Number.isFinite(nextLat) ? nextLat : -6.7924,
      Number.isFinite(nextLng) ? nextLng : 39.2083,
    );

    const rows = db.prepare('SELECT * FROM listings ORDER BY id ASC').all().map(normalizeListingRow);
    res.status(201).json({ ok: true, properties: rows });
  });

  app.put('/api/admin/properties/:id', requireCrmAccess, async (req, res) => {
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
          `UPDATE listings SET title = $1, city = $2, price = $3, period = $4, image = $5, badge = $6, tag = $7, verification = $8, status = $9, description = $10, lat = $11, lng = $12 WHERE id = $13`,
          [title, city, price, period || 'On request', image || 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80', badge || 'New', tag || 'Verified', verification || 'Ready for intake', status || 'New', description || 'Fresh listing added from FLX operations.', nextLat, nextLng, id],
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
      SET title = ?, city = ?, price = ?, period = ?, image = ?, badge = ?, tag = ?, verification = ?, status = ?, description = ?, lat = ?, lng = ?
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
      status || current.status || 'New',
      description || current.description || 'Fresh listing added from FLX operations.',
      Number.isFinite(nextLat) ? nextLat : current.lat ?? -6.7924,
      Number.isFinite(nextLng) ? nextLng : current.lng ?? 39.2083,
      Number(id),
    );

    const rows = db.prepare('SELECT * FROM listings ORDER BY id ASC').all().map(normalizeListingRow);
    res.json({ ok: true, properties: rows });
  });

  app.delete('/api/admin/properties/:id', requireCrmAccess, async (req, res) => {
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

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT id, name, email, role FROM users WHERE email = ? AND password = ?').get(String(email).trim().toLowerCase(), String(password));
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
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
      },
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Account already exists for that email.' });
    }

    const result = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(String(name).trim(), normalizedEmail, String(password), String(role || 'Client'));
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = createSessionToken(user);
    res.status(201).json({ ok: true, token, user });
  });

  app.get('/api/auth/session', (req, res) => {
    const session = getSessionUser(req);
    if (!session) {
      return res.status(401).json({ error: 'No active session.' });
    }

    const user = db.prepare('SELECT id, name, email, role FROM users WHERE email = ?').get(String(session.email).trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Session user no longer exists.' });
    }

    res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : String(req.body?.token || '');
    if (token) sessions.delete(token);
    res.json({ ok: true });
  });

  app.post('/api/units', (req, res) => {
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
  const app = createApp();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}
