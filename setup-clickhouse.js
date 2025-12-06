import { createClient } from '@clickhouse/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DATABASE || 'default',
});

async function setup() {
  console.log('🏗️  Setting up ClickHouse schema...');

  try {
    // Analytics Events Table
    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS analytics_events (
          id UUID DEFAULT generateUUIDv4(),
          event_type String,
          page_url String,
          element_selector String,
          timestamp DateTime DEFAULT now(),
          session_id String,
          user_id Nullable(String),
          workflow_id Nullable(String),
          metadata String,
          device_type String,
          browser_info String
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (timestamp, event_type)
      `,
    });
    console.log('✅ Created analytics_events table');

    // Workflow Executions Table
    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS workflow_executions (
          id UUID DEFAULT generateUUIDv4(),
          workflow_id String,
          user_id Nullable(String),
          status String,
          execution_time_ms UInt32,
          timestamp DateTime DEFAULT now(),
          error_message Nullable(String),
          page_url String,
          session_id String
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (workflow_id, timestamp)
      `,
    });
    console.log('✅ Created workflow_executions table');

    // Visitor Journeys Table (Aggregated sessions)
    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS visitor_journeys (
          session_id String,
          visitor_id String,
          start_time DateTime,
          end_time DateTime,
          page_count UInt32,
          event_count UInt32,
          device_type String,
          country_code String,
          utm_source String,
          utm_campaign String
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(start_time)
        ORDER BY (start_time, session_id)
      `,
    });
    console.log('✅ Created visitor_journeys table');

  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }

  await client.close();
  console.log('✨ Schema setup complete');
}

setup();

