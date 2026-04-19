-- ─────────────────────────────────────────────────────────────────────────────
-- ReconX AI · MySQL Schema v2
-- Run: mysql -u root -p < database/schema.sql
-- ─────────────────────────────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS reconx_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE reconx_db;

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    username      VARCHAR(80)     NOT NULL,
    email         VARCHAR(255)    NOT NULL,
    password_hash VARCHAR(255)    NOT NULL,
    role          ENUM('User','Admin') DEFAULT 'User',
    created_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_username (username),
    UNIQUE KEY uq_email    (email)
) ENGINE=InnoDB;

-- ── Scans ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scans (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED NOT NULL,
    target_url  VARCHAR(512) NOT NULL,
    scan_type   ENUM('Quick','Deep','Phishing','Custom') DEFAULT 'Quick',
    status      ENUM('Pending','Running','Completed','Failed','Stopping') DEFAULT 'Pending',
    score       TINYINT UNSIGNED DEFAULT 0,
    risk        ENUM('Low','Medium','High','Critical') DEFAULT 'Medium',
    raw_output  LONGTEXT,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user (user_id),
    CONSTRAINT fk_scan_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Findings ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS findings (
    id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    scan_id   INT UNSIGNED NOT NULL,
    severity  ENUM('Low','Medium','High','Critical') NOT NULL,
    title     VARCHAR(255) NOT NULL,
    endpoint  VARCHAR(512) DEFAULT '/',
    fix       TEXT,
    PRIMARY KEY (id),
    KEY idx_scan (scan_id),
    CONSTRAINT fk_finding_scan FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Reports ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    scan_id     INT UNSIGNED NOT NULL,
    report_json JSON,
    pdf_path    VARCHAR(512) DEFAULT NULL,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_scan_report (scan_id),
    CONSTRAINT fk_report_scan FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Audit Logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logs (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    INT UNSIGNED NOT NULL,
    action     VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45)  DEFAULT NULL,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_log_user (user_id),
    CONSTRAINT fk_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
