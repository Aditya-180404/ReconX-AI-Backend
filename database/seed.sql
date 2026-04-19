-- ─────────────────────────────────────────────────────────────────────────────
-- ReconX AI · Seed Data for Demo / Development
-- Password for demo accounts: ReconX@2026!
-- bcrypt hash generated with 12 rounds — update if you change the password
-- ─────────────────────────────────────────────────────────────────────────────
USE reconx_db;

-- ── Demo Users ────────────────────────────────────────────────────────────────
INSERT IGNORE INTO users (username, email, password_hash, role) VALUES
  ('admin',   'admin@reconx.ai',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhCBCFOkaBqe2uV.aTqXAe', 'Admin'),
  ('operator','demo@reconx.ai',    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhCBCFOkaBqe2uV.aTqXAe', 'User');

-- ── Demo Scans ────────────────────────────────────────────────────────────────
INSERT IGNORE INTO scans (id, user_id, target_url, scan_type, status, score, risk) VALUES
  (1, 1, 'https://api.production.com',  'Deep',       'Completed', 76,  'Medium'),
  (2, 1, 'https://auth.staging.io',     'Quick',      'Completed', 42,  'Critical'),
  (3, 1, 'https://vpn.corp.net',        'Compliance', 'Completed', 91,  'Low'),
  (4, 2, 'https://dashboard.corp.io',   'Stealth',    'Completed', 63,  'High');

-- ── Demo Findings ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO findings (scan_id, severity, title, endpoint, fix) VALUES
  (1, 'Critical', 'SQL Injection — /api/v1/login',         '/api/v1/login',  'Use parameterised queries. Never interpolate user input into SQL strings.'),
  (1, 'Medium',   'Missing Content-Security-Policy Header', '/',              'Add CSP header to all HTTP responses.'),
  (1, 'Low',      'Cookie Missing HttpOnly Flag',           '/login',         'Set HttpOnly; Secure; SameSite=Strict on all session cookies.'),
  (2, 'Critical', 'Exposed .env Configuration File',        '/.env',          'Block .env at the web server. Never commit to source control.'),
  (2, 'High',     'Weak CORS Policy — Allow-Origin: *',    '/api/*',         'Whitelist only trusted origins explicitly.'),
  (3, 'Low',      'robots.txt Discloses Admin Path',        '/robots.txt',    'Remove sensitive paths from robots.txt.'),
  (4, 'High',     'Outdated Nginx 1.14.0 — CVE-2021-23017','Port 443',       'Upgrade Nginx to ≥ 1.25.x.');

-- ── Demo Reports ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO reports (scan_id, report_json) VALUES
  (1, '{"executive_summary":"Scan of api.production.com found 1 critical SQL injection and 2 lower-severity issues.","security_score":76,"overall_risk":"Medium"}'),
  (2, '{"executive_summary":"Scan of auth.staging.io revealed critical .env exposure. Immediate action required.","security_score":42,"overall_risk":"Critical"}'),
  (3, '{"executive_summary":"vpn.corp.net is well hardened. Minor informational findings only.","security_score":91,"overall_risk":"Low"}');
