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
    // Analytics Events Table - with visitor_id for linking events to visitors
    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS analytics_events (
          id UUID DEFAULT generateUUIDv4(),
          event_type String,
          page_url String,
          element_selector String,
          timestamp DateTime DEFAULT now(),
          session_id String,
          visitor_id String DEFAULT '',
          user_id Nullable(String),
          workflow_id Nullable(String),
          metadata String,
          device_type String,
          browser_info String,
          country_code String DEFAULT 'unknown'
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (timestamp, event_type, visitor_id)
      `,
    });
    console.log('✅ Created analytics_events table');
    
    // Add visitor_id column if table already exists (migration)
    try {
      await client.command({
        query: `ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS visitor_id String DEFAULT ''`
      });
      console.log('✅ Added visitor_id column to analytics_events');
    } catch (e) {
      console.log('ℹ️ visitor_id column already exists or migration skipped');
    }
    
    // Add country_code column if table already exists (migration)
    try {
      await client.command({
        query: `ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS country_code String DEFAULT 'unknown'`
      });
      console.log('✅ Added country_code column to analytics_events');
    } catch (e) {
      console.log('ℹ️ country_code column already exists or migration skipped');
    }

    // Workflow Executions Table - with visitor_id
    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS workflow_executions (
          id UUID DEFAULT generateUUIDv4(),
          workflow_id String,
          visitor_id String DEFAULT '',
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
    
    // Add visitor_id column to workflow_executions if exists
    try {
      await client.command({
        query: `ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS visitor_id String DEFAULT ''`
      });
      console.log('✅ Added visitor_id column to workflow_executions');
    } catch (e) {
      console.log('ℹ️ visitor_id column in workflow_executions already exists or migration skipped');
    }

    // Visitor Journeys Table (Aggregated sessions) - with anonymous_name
    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS visitor_journeys (
          session_id String,
          visitor_id String,
          anonymous_name String DEFAULT '',
          start_time DateTime,
          end_time DateTime,
          page_count UInt32,
          event_count UInt32,
          device_type String,
          browser String DEFAULT '',
          country_code String,
          utm_source String,
          utm_campaign String,
          is_active UInt8 DEFAULT 1
        ) ENGINE = ReplacingMergeTree(end_time)
        PARTITION BY toYYYYMM(start_time)
        ORDER BY (visitor_id, session_id)
      `,
    });
    console.log('✅ Created visitor_journeys table');
    
    // Add new columns to visitor_journeys if exists
    try {
      await client.command({
        query: `ALTER TABLE visitor_journeys ADD COLUMN IF NOT EXISTS anonymous_name String DEFAULT ''`
      });
      await client.command({
        query: `ALTER TABLE visitor_journeys ADD COLUMN IF NOT EXISTS browser String DEFAULT ''`
      });
      await client.command({
        query: `ALTER TABLE visitor_journeys ADD COLUMN IF NOT EXISTS is_active UInt8 DEFAULT 1`
      });
      console.log('✅ Added new columns to visitor_journeys');
    } catch (e) {
      console.log('ℹ️ visitor_journeys columns already exist or migration skipped');
    }

    // Visitors Table - Persistent visitor profiles
    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS visitors (
          visitor_id String,
          anonymous_name String,
          first_seen DateTime DEFAULT now(),
          last_seen DateTime DEFAULT now(),
          total_sessions UInt32 DEFAULT 1,
          total_page_views UInt32 DEFAULT 0,
          total_events UInt32 DEFAULT 0,
          country_code String DEFAULT 'unknown',
          primary_device String DEFAULT 'desktop',
          primary_browser String DEFAULT '',
          utm_source_first String DEFAULT '',
          utm_campaign_first String DEFAULT '',
          is_identified UInt8 DEFAULT 0,
          identified_email String DEFAULT '',
          metadata String DEFAULT '{}'
        ) ENGINE = ReplacingMergeTree(last_seen)
        PARTITION BY toYYYYMM(first_seen)
        ORDER BY (visitor_id)
      `,
    });
    console.log('✅ Created visitors table');

    // Page Views Table - Detailed page visit tracking
    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS page_views (
          id UUID DEFAULT generateUUIDv4(),
          visitor_id String,
          session_id String,
          page_url String,
          page_path String,
          page_title String DEFAULT '',
          referrer String DEFAULT '',
          timestamp DateTime DEFAULT now(),
          time_on_page_ms UInt32 DEFAULT 0,
          scroll_depth UInt8 DEFAULT 0,
          country_code String DEFAULT 'unknown',
          device_type String DEFAULT 'desktop',
          browser String DEFAULT ''
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (visitor_id, session_id, timestamp)
      `,
    });
    console.log('✅ Created page_views table');

    // Visitor Activity Table - For activity heatmap
    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS visitor_activity (
          visitor_id String,
          activity_date Date,
          event_count UInt32 DEFAULT 0,
          page_view_count UInt32 DEFAULT 0,
          session_count UInt32 DEFAULT 0,
          total_time_ms UInt64 DEFAULT 0
        ) ENGINE = SummingMergeTree()
        PARTITION BY toYYYYMM(activity_date)
        ORDER BY (visitor_id, activity_date)
      `,
    });
    console.log('✅ Created visitor_activity table');

  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }

  await client.close();
  console.log('✨ Schema setup complete');
}

setup();
