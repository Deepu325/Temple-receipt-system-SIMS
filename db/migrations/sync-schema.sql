-- Add sync-related fields to existing tables
ALTER TABLE receipts ADD COLUMN sync_id TEXT UNIQUE;
ALTER TABLE receipts ADD COLUMN last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE receipts ADD COLUMN is_synced INTEGER DEFAULT 0;
ALTER TABLE receipts ADD COLUMN sync_version INTEGER DEFAULT 1;

ALTER TABLE poojas ADD COLUMN sync_id TEXT UNIQUE;
ALTER TABLE poojas ADD COLUMN last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE poojas ADD COLUMN is_synced INTEGER DEFAULT 0;
ALTER TABLE poojas ADD COLUMN sync_version INTEGER DEFAULT 1;

-- Add system settings table
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    sync_id TEXT UNIQUE,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_synced INTEGER DEFAULT 0,
    sync_version INTEGER DEFAULT 1
);

-- Add sync state table
CREATE TABLE IF NOT EXISTS sync_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    last_sync_timestamp TIMESTAMP,
    system_role TEXT NOT NULL, -- 'ADMIN' or 'STAFF'
    system_id TEXT UNIQUE NOT NULL,
    cloud_last_sync TEXT
);

-- Add users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL, -- 'ADMIN' or 'STAFF'
    active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT UNIQUE,
    is_synced INTEGER DEFAULT 0,
    sync_version INTEGER DEFAULT 1
);
