-- Initialize development database with extensions
-- This file runs when the Docker container starts for the first time

-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create test database for unit tests
CREATE DATABASE stufflibrary_test;

-- Connect to test database and enable extensions there too
\c stufflibrary_test;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";