# Setting Up Your First Playbook: A Complete Step-by-Step Guide

*Transform your website into an intelligent, personalized experience in just 15 minutes*

---

## 🎯 What You'll Accomplish

By the end of this guide, you'll have created and deployed your first TrackFlow playbook that automatically personalizes your website based on visitor behavior. We'll walk through every click, button, and configuration option using the actual TrackFlow interface.

**What We'll Build**: A mobile optimization playbook that automatically changes call-to-action text from "Click to Get Started" to "Tap to Get Started" when visitors are on mobile devices.

---

## 📋 Before We Start

**What You Need**:
- A TrackFlow account (sign up at your dashboard)
- Access to your website's HTML (to add one line of code)
- 15 minutes of your time

**What You'll Learn**:
- How to navigate the TrackFlow interface
- How to create workflows using the visual builder
- How to configure triggers and actions
- How to deploy your playbook to your website
- How to test that everything works

---

## 🚀 Step 1: Accessing Your Dashboard

1. **Log into TrackFlow** and you'll land on your **Dashboard**
   
2. **Navigate to Playbooks**: In the left sidebar, you'll see the navigation menu under "Organization". Click on **"Playbooks"** (the workflow icon)

3. **Understanding the Playbooks Page**: You'll see:
   - A header showing "Playbooks" with your total count
   - Action buttons in the top right: **"+ Create Playbook"** and **"Import"**
   - A list of existing playbooks (if any) showing their status, execution count, and last updated time

---

## 🎨 Step 2: Creating Your First Playbook

### Option A: Start from Scratch (Recommended for Learning)

1. **Click the "+ Create Playbook" button** in the top right corner of the Playbooks page

2. **Playbook Created**: TrackFlow automatically creates a new playbook with:
   - **Name**: "New Playbook" (we'll change this)
   - **Status**: Draft (shown with a gray "Edit" icon)
   - **Description**: "A new personalization playbook"

3. **Open the Workflow Builder**: Click anywhere on your new playbook row to open the **Workflow Builder**

### Option B: Use a Template (Faster Start)

1. **Click "Templates"** in the left sidebar under "Organization"

2. **Browse Available Templates**: You'll see pre-built playbook templates including:
   - Mobile CTA Optimization
   - UTM Campaign Personalization
   - Exit Intent Conversion Recovery
   - Scroll Engagement Boost

3. **Select Mobile Template**: Find "Mobile CTA Optimization" and click **"Use Template"**

4. **Template Applied**: TrackFlow automatically creates a new playbook with the template configuration

---

## 🛠️ Step 3: Using the Workflow Builder

When you open a playbook, you'll see the **Workflow Builder** interface:

### Understanding the Interface

**Top Navigation Bar**:
- **← Back arrow**: Returns to Playbooks list
- **Playbook name**: "New Playbook" (click to edit)
- **Status indicator**: Shows if playbook is Draft, Active, or Paused
- **Action buttons**: Save, Integration, Settings

**Main Canvas**:
- Large white workspace where you'll build your workflow
- Grid background for easy alignment
- Zoom and pan controls

**Right Panel**:
- **Node Configuration**: Appears when you select a node
- **Properties**: Shows node settings and options

### Rename Your Playbook

1. **Click on "New Playbook"** in the top navigation
2. **Type your new name**: "Mobile CTA Optimization"
3. **Press Enter** or click elsewhere to save

---

## 🎯 Step 4: Adding Your First Trigger

Every playbook starts with a **trigger** - the condition that starts your personalization.

### Open the Node Library

1. **Click the "+ Add Node" button** in the toolbar (you'll see this prominently displayed)
   
2. **Node Library Opens**: A modal window appears showing:
   - **Triggers section**: Blue-colored nodes that start workflows
   - **Operations section**: Green-colored nodes that perform actions

### Add Device Type Trigger

1. **In the Triggers section**, find **"Device Type"** 
   - **Icon**: Smartphone icon
   - **Category**: Device & Browser
   - **Description**: "Trigger based on visitor device type"

2. **Click on the Device Type trigger** to add it to your workflow

3. **Trigger Added**: The trigger node appears on your canvas at the top, connected and ready to configure

### Configure the Device Trigger

1. **Click on the Device Type node** on your canvas to select it

2. **Configuration Panel Opens** on the right side showing:
   - **Node name**: "Device Type"
   - **Description**: Brief explanation
   - **Configuration options**

3. **Set Device Type**:
   - **Field**: "Device Type" (dropdown)
   - **Select**: "Mobile" from the options (Mobile, Tablet, Desktop)
   - The configuration automatically saves

**✅ Checkpoint**: You now have a trigger that activates when mobile visitors arrive on your website.

---

## ⚡ Step 5: Adding Your First Action

Now we'll add an action that executes when the trigger fires.

### Add Text Replacement Action

1. **Click "+ Add Node" again** to open the Node Library

2. **In the Operations section**, find **"Replace Text"**:
   - **Icon**: Type icon  
   - **Category**: Content Modification
   - **Description**: "Replace text content in selected elements"

3. **Click on Replace Text** to add it to your workflow

4. **Action Positioned**: TrackFlow automatically places the action below your trigger and connects them with a line

### Configure Text Replacement

1. **Click on the Replace Text node** to open its configuration panel

2. **Configure the Action**:
   
   **CSS Selector** (required):
   - **Field**: "CSS Selector"
   - **Enter**: `.cta-button, .btn, button`
   - **Description**: This targets common button classes on websites

   **New Text** (required):
   - **Field**: "New Text" 
   - **Enter**: `Tap to Get Started`
   - **Description**: Mobile-friendly call-to-action text

   **Original Text** (optional):
   - **Field**: "Original Text"
   - **Enter**: `Click to Get Started`
   - **Description**: Helps target the exact text to replace

3. **Configuration Saves Automatically**: The panel updates showing your settings

**✅ Checkpoint**: Your playbook now detects mobile devices and changes button text to be mobile-friendly.

---

## 🎮 Step 6: Testing Your Workflow

### Visual Verification

1. **Check the Connection**: Ensure there's a line connecting your Device Type trigger to your Replace Text action

2. **Review Configuration**: 
   - **Trigger**: Device Type = Mobile
   - **Action**: Replace text with mobile-friendly version
   - **Connection**: Trigger flows to action

### Save Your Playbook

1. **Click the "Save" button** in the top toolbar
   
2. **Success Message**: You'll see confirmation that your playbook was saved

3. **Status Check**: Your playbook status should show as "Draft"

---

## 🌐 Step 7: Setting Target URL

Before deploying, specify where your playbook should run.

### Configure Target URL

1. **Find the Target URL field** in the right configuration panel or workflow settings

2. **Set Your URL**:
   - **For all pages**: Enter `*` (asterisk)
   - **For specific page**: Enter `/pricing` or `/landing-page`
   - **For your domain**: Enter `https://yourwebsite.com`

3. **Save the Configuration**: The URL setting saves automatically

**Pro Tip**: Start with `*` to test on all pages, then narrow down later.

---

## 🚀 Step 8: Generating Integration Code

Now we'll get the code to add to your website.

### Open Integration Modal

1. **Click the "Integration" button** (Code2 icon) in the top toolbar

2. **Integration Modal Opens**: A large modal with multiple tabs:
   - **Head Code**: Code for your `<head>` section
   - **Body Code**: Optional debug code
   - **Instructions**: Detailed implementation guide
   - **Test Page**: Download a test page

### Copy the Head Code

1. **Head Code Tab** (should be selected by default)

2. **Copy the Code**: Click the **"Copy"** button next to the code block

3. **Code Example**: You'll copy something like:
   ```html
   <!-- Unified Workflow System with Anti-Flicker - Add to <head> section -->
   <script>
     // Configure anti-flicker settings
     window.unifiedWorkflowConfig = {
       maxHideTime: 5000,
       showLoadingIndicator: true,
       debug: false,
       hideMethod: 'opacity'
     };
   </script>
   <!-- Anti-flicker script (loads first to prevent FOOC) -->
   <script src="https://trackflow-app-production.up.railway.app/api/anti-flicker.js"></script>
   <!-- Main workflow system -->
   <script src="https://trackflow-app-production.up.railway.app/api/unified-workflow-system.js"></script>
   ```

### Read the Instructions

1. **Click the "Instructions" tab** to see detailed implementation guide

2. **Platform-Specific Instructions**: The guide shows how to add code to:
   - Webflow (Project Settings → Custom Code → Head Code)
   - WordPress (Theme Editor or Plugin)
   - Shopify (Theme Customization)
   - Custom websites (HTML `<head>` section)

---

## 🌍 Step 9: Adding Code to Your Website

### For Webflow Users

1. **Open Webflow Designer** for your project

2. **Go to Project Settings**: Click the gear icon in the top left

3. **Navigate to Custom Code**: Find "Custom Code" in the left sidebar

4. **Add to Head Code**: 
   - Click in the "Head Code" text area
   - **Paste the code** you copied from TrackFlow
   - **Save Changes**

5. **Publish Your Site**: Click "Publish" to make changes live

### For WordPress Users

1. **Access your WordPress admin**

2. **Go to Appearance → Theme Editor**

3. **Edit header.php**: Find and edit your theme's header.php file

4. **Add Before `</head>`**: 
   - Locate the closing `</head>` tag
   - **Paste the TrackFlow code** just before it
   - **Update File**

### For Custom Websites

1. **Open your website's HTML file**

2. **Find the `<head>` section**

3. **Add the code**: Paste the TrackFlow code anywhere in the `<head>` section

4. **Save and upload** your changes

---

## ✅ Step 10: Activating Your Playbook

### Return to TrackFlow

1. **Go back to your TrackFlow Playbooks list**

2. **Find your playbook**: "Mobile CTA Optimization"

3. **Change Status to Active**:
   - **Click the status dropdown** (currently shows "Draft")
   - **Select "Active"** from the options
   - **Status icon changes** to a green play button

**✅ Your playbook is now live!**

---

## 🧪 Step 11: Testing Your Live Playbook

### Test on Mobile Device

1. **Open your website on a mobile device** (or use browser dev tools)

2. **Switch to mobile view**: 
   - In Chrome: Press F12 → Click device icon → Select mobile device
   - In Safari: Develop → User Agent → Choose mobile device

3. **Look for changes**: Your buttons should now say "Tap to Get Started" instead of "Click to Get Started"

### Test Using Browser Dev Tools

1. **Open your website in Chrome**

2. **Open Developer Tools** (F12)

3. **Switch to mobile view**: Click the device icon in the top left of dev tools

4. **Refresh the page**: You should see the text change

5. **Check Console**: Look for messages starting with "🎯 Unified Workflow System"

### Troubleshooting

If your playbook isn't working:

1. **Check Console Messages**: Look for errors in browser dev tools
2. **Verify Code Installation**: Ensure the script is in your `<head>` section
3. **Check Selector**: Make sure your CSS selector matches your button elements
4. **Confirm Status**: Ensure playbook status is "Active" not "Draft"
5. **URL Targeting**: Verify your target URL setting includes the page you're testing

---

## 📊 Step 12: Monitoring Performance

### Check Execution Count

1. **Return to Playbooks list** in TrackFlow

2. **View Execution Count**: Your playbook will show how many times it has run

3. **Monitor Growth**: The count increases each time a mobile visitor triggers your playbook

### Understanding the Data

- **Executions**: Number of times the playbook triggered
- **Last Run**: When the playbook last executed
- **Status**: Current activation state

---

## 🎉 Congratulations!

You've successfully created, configured, and deployed your first TrackFlow playbook! Here's what you accomplished:

✅ **Created a mobile optimization playbook**  
✅ **Configured device-based triggering**  
✅ **Set up automated text replacement**  
✅ **Deployed to your live website**  
✅ **Tested the functionality**  

### What Happens Now

Your website is now automatically:
- **Detecting mobile visitors** in real-time
- **Changing button text** to be mobile-friendly
- **Improving user experience** for mobile users
- **Tracking performance** for optimization

---

## 🚀 Next Steps: Expand Your Personalization

Now that you've mastered the basics, try these advanced playbooks:

### 1. Exit Intent Popup
- **Trigger**: Exit Intent (when user tries to leave)
- **Action**: Display Overlay (show special offer popup)

### 2. UTM Campaign Personalization  
- **Trigger**: UTM Parameters (detect Google traffic)
- **Action**: Replace Text (show Google-specific messaging)

### 3. Scroll-Based Engagement
- **Trigger**: Scroll Depth (75% down the page)
- **Action**: Show Element (reveal newsletter signup)

### 4. Geographic Targeting
- **Trigger**: Geolocation (specific countries)
- **Action**: Replace Text (localized pricing/messaging)

---

## 💡 Pro Tips for Success

### CSS Selector Best Practices
- **Be specific but not too specific**: `.cta-button` is better than `div.container.main .cta-button`
- **Use multiple selectors**: `.cta-button, .btn, button` covers more cases
- **Test your selectors**: Use browser dev tools to verify elements are found

### Trigger Configuration Tips
- **Start broad, then narrow**: Begin with device type, add UTM parameters later
- **Use timeframes wisely**: Session-based tracking for immediate behavior
- **Consider user journey**: Multiple page visits indicate genuine interest

### Testing Recommendations
- **Test on real devices**: Emulation doesn't always match real behavior
- **Use incognito mode**: Avoid cache and previous session data
- **Check different browsers**: Ensure compatibility across platforms
- **Monitor console logs**: Debug mode provides valuable insights

### Performance Optimization
- **Use specific selectors**: Faster DOM queries improve performance
- **Limit active playbooks**: Start with 3-5 playbooks, add more gradually
- **Monitor execution counts**: High numbers indicate successful targeting

---

## 🆘 Common Issues and Solutions

### "Playbook not triggering"
- **Check playbook status**: Must be "Active", not "Draft"
- **Verify target URL**: Ensure URL pattern matches your page
- **Test trigger conditions**: Use browser dev tools to simulate mobile

### "Text not changing"
- **Inspect CSS selector**: Use dev tools to verify elements exist
- **Check original text**: Must match exactly (case-sensitive)
- **Look for multiple elements**: Selector might target wrong element

### "Code not working"
- **Verify script placement**: Must be in `<head>` section
- **Check for console errors**: JavaScript errors can block execution
- **Confirm script loading**: Check Network tab in dev tools

### "No execution count"
- **Wait a few minutes**: Tracking updates may have slight delay
- **Refresh the page**: Browser cache might show old data
- **Check trigger logic**: Ensure conditions are realistic

---

## 📚 Additional Resources

### TrackFlow Documentation
- **Workflow Nodes Documentation**: Complete guide to all triggers and actions
- **Integration Guides**: Platform-specific implementation instructions
- **Best Practices**: Advanced optimization techniques

### Learning Path
1. **Master basic triggers**: Device, UTM, scroll depth
2. **Explore actions**: Text replacement, overlays, redirects
3. **Advanced workflows**: Multi-step personalization
4. **Performance optimization**: Speed and conversion improvements

### Community and Support
- **Knowledge Base**: Searchable documentation
- **Video Tutorials**: Step-by-step visual guides  
- **Community Forum**: Connect with other TrackFlow users
- **Support Chat**: Get help when you need it

---

*You're now ready to create intelligent, personalized web experiences that adapt to every visitor in real-time. Start simple, test everything, and gradually build more sophisticated playbooks as you see results. Welcome to the future of website personalization!*

**Ready for your next playbook? Try the exit-intent popup template next!** 