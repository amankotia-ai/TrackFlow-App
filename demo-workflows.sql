-- 🚀 Demo Workflows for Production Schema
-- Run this AFTER setting up your main supabase-schema.sql
-- This creates sample workflows for immediate testing

-- First, create a demo user (or use your actual user ID)
-- Replace 'your-user-id-here' with your actual Supabase auth user ID

-- Create demo workflows using the save_workflow_complete function
DO $$ 
DECLARE
    demo_user_id UUID;
    workflow1_id UUID;
    workflow2_id UUID;
    workflow3_id UUID;
BEGIN
    -- Get the first user ID (replace with your actual user ID)
    SELECT id INTO demo_user_id FROM auth.users LIMIT 1;
    
    IF demo_user_id IS NULL THEN
        RAISE NOTICE 'No users found. Please sign up first and replace with your user ID.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Creating demo workflows for user: %', demo_user_id;
    
    -- Workflow 1: Mobile CTA Optimization
    SELECT public.save_workflow_complete(
        NULL, -- new workflow
        demo_user_id,
        'Mobile CTA Optimization',
        'Optimizes call-to-action buttons for mobile devices by changing "Click" to "Tap"',
        true, -- is_active
        'active', -- status
        '*', -- target_url (all pages)
        '[
            {
                "id": "trigger-mobile-1",
                "type": "trigger",
                "category": "Device & Browser",
                "name": "Device Type",
                "description": "Triggers when user is on mobile device",
                "icon": "Smartphone",
                "position": {"x": 100, "y": 100},
                "config": {"deviceType": "mobile"},
                "inputs": [],
                "outputs": ["mobile-detected"]
            },
            {
                "id": "action-replace-1",
                "type": "action", 
                "category": "Content Modification",
                "name": "Replace Text",
                "description": "Replace Click with Tap for mobile users",
                "icon": "Type",
                "position": {"x": 400, "y": 100},
                "config": {
                    "selector": ".cta-button, button, .btn, [class*=\"cta\"], [class*=\"button\"]",
                    "newText": "Tap to Get Started",
                    "originalText": "Click to Get Started"
                },
                "inputs": ["mobile-input"],
                "outputs": []
            }
        ]',
        '[
            {
                "id": "connection-1",
                "sourceNodeId": "trigger-mobile-1",
                "targetNodeId": "action-replace-1", 
                "sourceHandle": "mobile-detected",
                "targetHandle": "mobile-input"
            }
        ]'
    ) INTO workflow1_id;
    
    -- Workflow 2: UTM Google Personalization
    SELECT public.save_workflow_complete(
        NULL,
        demo_user_id,
        'UTM Google Personalization',
        'Personalizes headlines for visitors coming from Google ads',
        true,
        'active',
        '*',
        '[
            {
                "id": "trigger-utm-1",
                "type": "trigger",
                "category": "Traffic Source", 
                "name": "UTM Parameters",
                "description": "Triggers when utm_source equals google",
                "icon": "Link",
                "position": {"x": 100, "y": 200},
                "config": {
                    "parameter": "utm_source",
                    "operator": "equals",
                    "value": "google"
                },
                "inputs": [],
                "outputs": ["google-traffic"]
            },
            {
                "id": "action-headline-1",
                "type": "action",
                "category": "Content Modification",
                "name": "Replace Text", 
                "description": "Replace headline for Google visitors",
                "icon": "Type",
                "position": {"x": 400, "y": 200},
                "config": {
                    "selector": "h1, .hero-headline, .main-headline, [class*=\"headline\"]",
                    "newText": "Welcome from Google! Special offer inside."
                },
                "inputs": ["google-input"],
                "outputs": []
            }
        ]',
        '[
            {
                "id": "connection-2", 
                "sourceNodeId": "trigger-utm-1",
                "targetNodeId": "action-headline-1",
                "sourceHandle": "google-traffic",
                "targetHandle": "google-input"
            }
        ]'
    ) INTO workflow2_id;
    
    -- Workflow 3: Exit Intent Popup
    SELECT public.save_workflow_complete(
        NULL,
        demo_user_id,
        'Exit Intent Popup',
        'Shows a popup when users try to leave the page',
        true,
        'active', 
        '*',
        '[
            {
                "id": "trigger-exit-1",
                "type": "trigger",
                "category": "Engagement",
                "name": "Exit Intent",
                "description": "Triggers when user moves cursor towards browser top",
                "icon": "LogOut",
                "position": {"x": 100, "y": 300},
                "config": {
                    "sensitivity": "medium",
                    "delay": 500
                },
                "inputs": [],
                "outputs": ["exit-detected"]
            },
            {
                "id": "action-popup-1",
                "type": "action",
                "category": "User Interface",
                "name": "Show Element",
                "description": "Display exit intent popup",
                "icon": "Square", 
                "position": {"x": 400, "y": 300},
                "config": {
                    "selector": "#exit-popup, .exit-intent-modal, .exit-popup",
                    "animation": "slide",
                    "delay": 0
                },
                "inputs": ["exit-input"],
                "outputs": []
            }
        ]',
        '[
            {
                "id": "connection-3",
                "sourceNodeId": "trigger-exit-1", 
                "targetNodeId": "action-popup-1",
                "sourceHandle": "exit-detected",
                "targetHandle": "exit-input"
            }
        ]'
    ) INTO workflow3_id;
    
    RAISE NOTICE 'Demo workflows created successfully!';
    RAISE NOTICE 'Workflow 1 ID: %', workflow1_id;
    RAISE NOTICE 'Workflow 2 ID: %', workflow2_id;
    RAISE NOTICE 'Workflow 3 ID: %', workflow3_id;
    
END $$;

-- Verify the workflows were created
SELECT 
    'Demo Workflows Created' as status,
    COUNT(*) as count,
    string_agg(name, ', ') as workflow_names
FROM workflows 
WHERE is_active = true;

-- Show the complete workflow structure
SELECT 
    w.name,
    w.description,
    w.is_active,
    w.status,
    jsonb_array_length(wn.nodes) as node_count,
    jsonb_array_length(wn.connections) as connection_count
FROM workflows w
JOIN workflows_with_nodes wn ON w.id = wn.id
WHERE w.is_active = true
ORDER BY w.created_at DESC; 