-- Demo Workflows for Target Page Testing
-- These workflows can be accessed via service role authentication
-- Run this script in your Supabase SQL Editor

-- Create a demo user for public workflows
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'demo@trackflow.app',
  NOW(),
  NOW(), 
  NOW(),
  '{"full_name": "Demo User"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Create demo user profile
INSERT INTO public.users (id, email, full_name, plan)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'demo@trackflow.app',
  'Demo User',
  'demo'
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  plan = EXCLUDED.plan;

-- Insert demo workflows
INSERT INTO public.workflows (
  id, user_id, name, description, is_active, status, target_url, created_at, updated_at
) VALUES 
(
  '11111111-1111-1111-1111-111111111111'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Mobile CTA Optimization',
  'Automatically optimize call-to-action buttons for mobile devices',
  true,
  'active',
  '*',
  NOW(),
  NOW()
),
(
  '22222222-2222-2222-2222-222222222222'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Google Traffic Personalization', 
  'Personalize content for visitors coming from Google search',
  true,
  'active',
  '*',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  status = EXCLUDED.status,
  target_url = EXCLUDED.target_url,
  updated_at = NOW();

-- Insert workflow nodes for Mobile CTA Optimization
INSERT INTO public.workflow_nodes (
  id, workflow_id, type, category, name, description, icon, position, config, inputs, outputs
) VALUES 
(
  'trigger-mobile',
  '11111111-1111-1111-1111-111111111111'::uuid,
  'trigger',
  'Device Detection',
  'Device Type',
  'Trigger when user is on mobile device',
  'Smartphone',
  '{"x": 100, "y": 100}'::jsonb,
  '{"deviceType": "mobile"}'::jsonb,
  ARRAY[]::text[],
  ARRAY['output']::text[]
),
(
  'action-mobile-cta',
  '11111111-1111-1111-1111-111111111111'::uuid,
  'action',
  'Content Modification',
  'Replace Text',
  'Change CTA text for mobile users',
  'Type', 
  '{"x": 400, "y": 100}'::jsonb,
  '{"selector": ".cta-button, button, .btn, [class*=\"cta\"], [class*=\"button\"]", "newText": "Tap to Get Started"}'::jsonb,
  ARRAY['input']::text[],
  ARRAY[]::text[]
)
ON CONFLICT (id, workflow_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  config = EXCLUDED.config;

-- Insert workflow nodes for Google Traffic Personalization  
INSERT INTO public.workflow_nodes (
  id, workflow_id, type, category, name, description, icon, position, config, inputs, outputs
) VALUES 
(
  'trigger-google',
  '22222222-2222-2222-2222-222222222222'::uuid,
  'trigger',
  'Traffic Source',
  'UTM Parameters',
  'Trigger for visitors from Google',
  'Link',
  '{"x": 100, "y": 100}'::jsonb,
  '{"parameter": "utm_source", "value": "google", "operator": "equals"}'::jsonb,
  ARRAY[]::text[],
  ARRAY['output']::text[]
),
(
  'action-google-headline',
  '22222222-2222-2222-2222-222222222222'::uuid,
  'action',
  'Content Modification', 
  'Replace Text',
  'Personalize headline for Google traffic',
  'Type',
  '{"x": 400, "y": 100}'::jsonb,
  '{"selector": "h1, .hero-headline, .headline, [class*=\"hero\"] h1, [class*=\"title\"]", "newText": "Welcome from Google! Special offer inside."}'::jsonb,
  ARRAY['input']::text[],
  ARRAY[]::text[]
)
ON CONFLICT (id, workflow_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  config = EXCLUDED.config;

-- Insert workflow connections
INSERT INTO public.workflow_connections (
  id, workflow_id, source_node_id, target_node_id, source_handle, target_handle
) VALUES 
(
  'conn-mobile',
  '11111111-1111-1111-1111-111111111111'::uuid,
  'trigger-mobile',
  'action-mobile-cta',
  'output',
  'input'
),
(
  'conn-google',
  '22222222-2222-2222-2222-222222222222'::uuid,
  'trigger-google', 
  'action-google-headline',
  'output',
  'input'
)
ON CONFLICT (id, workflow_id) DO UPDATE SET
  source_node_id = EXCLUDED.source_node_id,
  target_node_id = EXCLUDED.target_node_id;

-- Verify the demo workflows were created
SELECT 
  w.name,
  w.is_active,
  w.status,
  w.target_url,
  COUNT(wn.id) as node_count,
  COUNT(wc.id) as connection_count
FROM public.workflows w
LEFT JOIN public.workflow_nodes wn ON w.id = wn.workflow_id  
LEFT JOIN public.workflow_connections wc ON w.id = wc.workflow_id
WHERE w.user_id = '00000000-0000-0000-0000-000000000000'::uuid
GROUP BY w.id, w.name, w.is_active, w.status, w.target_url
ORDER BY w.name; 