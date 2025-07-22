# Workflow Builder - Node Documentation

## Overview

This document provides comprehensive documentation for all available trigger and action nodes in the Workflow Builder. Each node serves a specific purpose in creating personalized web experiences and automation workflows.

## Node Types

- **Triggers**: Initiate workflows based on specific conditions or events
- **Actions**: Execute specific operations when triggered
- **Conditions**: Evaluate criteria to determine workflow paths (Note: Only one condition can be used per workflow)

---

## 🎯 TRIGGER NODES

### Visitor Behavior Triggers

#### 1. Page Visits
**Category**: Visitor Behavior  
**Icon**: Eye  
**Description**: Trigger when visitor reaches specific number of page views

**Configuration Options**:
- **Number of Visits** (required): Trigger after this many page visits (default: 3)
- **Timeframe** (required): 
  - Current Session
  - Last 24 Hours
  - Last 7 Days
  - Last 30 Days

**Use Cases**:
- Show special offers to engaged visitors
- Display advanced content to repeat viewers
- Trigger loyalty programs for frequent visitors

---

#### 2. Time on Page
**Category**: Visitor Behavior  
**Icon**: Clock  
**Description**: Trigger when visitor spends specific time on page

**Configuration Options**:
- **Duration** (required): Time threshold to trigger (default: 30)
- **Time Unit** (required): Seconds or Minutes

**Use Cases**:
- Show exit-intent popups for engaged users
- Display additional content to interested visitors
- Trigger help widgets for users spending time on complex pages

---

#### 3. Scroll Depth
**Category**: Visitor Behavior  
**Icon**: ArrowDown  
**Description**: Trigger when visitor scrolls to specific page depth

**Configuration Options**:
- **Scroll Percentage** (required): Percentage of page scrolled (0-100, default: 50)
- **Target Element** (optional): CSS selector for specific element to track

**Use Cases**:
- Show newsletter signup at end of articles
- Display related content recommendations
- Trigger conversion offers for engaged readers

---

#### 4. User Journey
**Category**: Visitor Behavior  
**Icon**: Route  
**Description**: Trigger based on visitor navigation path

**Configuration Options**:
- **Page URLs** (required): List of page URLs (one per line)
- **Visit Order** (required): Any Order or Exact Sequence

**Use Cases**:
- Personalize experience based on browsing patterns
- Show targeted offers based on product interest
- Guide users through intended conversion funnels

---

#### 5. Repeat Visitor
**Category**: Engagement  
**Icon**: RotateCcw  
**Description**: Trigger for returning visitors based on visit count

**Configuration Options**:
- **Minimum Visit Count** (required): Minimum number of visits to trigger (default: 2)
- **Timeframe** (required): All Time, Last 30 Days, Last 7 Days, or Last 24 Hours

**Use Cases**:
- Show loyalty rewards to returning customers
- Display advanced features to experienced users
- Offer special pricing to frequent visitors

---

### Traffic Source Triggers

#### 6. UTM Parameters
**Category**: Traffic Source  
**Icon**: Link  
**Description**: Trigger based on incoming UTM parameters

**Configuration Options**:
- **UTM Parameter** (required): utm_source, utm_medium, utm_campaign, utm_term, or utm_content
- **Condition** (required): Equals, Contains, Starts With, or Parameter Exists
- **Common Values** (optional): Pre-defined values like Google, Facebook, Email, etc.
- **Custom Value** (optional): Custom value to match

**Use Cases**:
- Personalize landing pages by traffic source
- Show source-specific offers and messaging
- Track campaign performance with targeted experiences

---

### Device & Browser Triggers

#### 7. Device Type
**Category**: Device & Browser  
**Icon**: Smartphone  
**Description**: Trigger based on visitor device type

**Configuration Options**:
- **Device Type** (required): Mobile, Tablet, or Desktop

**Use Cases**:
- Optimize call-to-action buttons for mobile users
- Show device-specific content and layouts
- Adjust form complexity based on device capabilities

---

### Engagement Triggers

#### 8. Exit Intent
**Category**: Engagement  
**Icon**: LogOut  
**Description**: Trigger when user shows intent to leave the page

**Configuration Options**:
- **Detection Sensitivity** (required): Low, Medium, or High
- **Delay (milliseconds)** (required): Delay before triggering (default: 500)

**Use Cases**:
- Show exit-intent popups with special offers
- Display feedback forms before users leave
- Trigger cart abandonment prevention

---

#### 9. User Inactivity
**Category**: Engagement  
**Icon**: Timer  
**Description**: Trigger after user is inactive for specified time

**Configuration Options**:
- **Inactivity Duration** (required): Time of inactivity (default: 30)
- **Time Unit** (required): Seconds or Minutes

**Use Cases**:
- Show engagement prompts to inactive users
- Display help content for confused visitors
- Trigger re-engagement campaigns

---

### Location & Context Triggers

#### 10. Geolocation
**Category**: Location  
**Icon**: MapPin  
**Description**: Trigger based on visitor's geographic location

**Configuration Options**:
- **Location Type** (required): Country, State/Region, or City
- **Target Locations** (required): List of locations (one per line)
- **Condition** (required): Is in list or Is not in list

**Use Cases**:
- Show location-specific offers and pricing
- Display regional content and languages
- Comply with location-based regulations

---

#### 11. Session Status
**Category**: Context  
**Icon**: Users  
**Description**: Trigger based on user login or session status

**Configuration Options**:
- **Session Status** (required): Logged in, Not logged in, Session expiring, or New user
- **Session Duration** (optional): Minutes before expiry (for session expiring trigger)

**Use Cases**:
- Show login prompts to anonymous users
- Display member-exclusive content
- Trigger session extension prompts

---

## ⚡ ACTION NODES

### Content Modification Actions

#### 1. Replace Text
**Category**: Content Modification  
**Icon**: Type  
**Description**: Replace text content in selected elements

**Configuration Options**:
- **CSS Selector** (required): CSS selector for target element(s)
- **New Text** (required): Text to replace with
- **Original Text** (optional): Specific text to replace

**Use Cases**:
- Personalize headlines and messaging
- Update call-to-action text based on context
- Modify product descriptions for different audiences

---

#### 2. Hide Element
**Category**: Content Modification  
**Icon**: EyeOff  
**Description**: Hide selected elements from view

**Configuration Options**:
- **CSS Selector** (required): CSS selector for element(s) to hide
- **Hide Animation** (required): No Animation, Fade Out, or Slide Up

**Use Cases**:
- Remove irrelevant content for specific audiences
- Hide promotional banners for certain users
- Simplify interfaces for mobile users

---

#### 3. Show Element
**Category**: Content Modification  
**Icon**: Eye  
**Description**: Show previously hidden elements

**Configuration Options**:
- **CSS Selector** (required): CSS selector for element(s) to show
- **Show Animation** (required): No Animation, Fade In, or Slide Down

**Use Cases**:
- Display special offers for qualified visitors
- Show advanced features to experienced users
- Reveal hidden content based on user behavior

---

#### 4. Modify CSS
**Category**: Content Modification  
**Icon**: Palette  
**Description**: Apply custom CSS styles to elements

**Configuration Options**:
- **CSS Selector** (required): CSS selector for target element(s)
- **CSS Property** (optional): Common properties like background-color, color, font-size, etc.
- **Custom CSS Property** (optional): Custom property name
- **CSS Value** (required): New value for the CSS property

**Use Cases**:
- Change colors and styling for different user segments
- Adjust layout and spacing for better UX
- Apply brand variations for different campaigns

---

### Navigation Actions

#### 5. Redirect User
**Category**: Navigation  
**Icon**: ExternalLink  
**Description**: Redirect visitor to a different page

**Configuration Options**:
- **Redirect URL** (required): URL to redirect the visitor to
- **Delay (seconds)** (optional): Delay before redirect (0 for immediate)
- **Open in New Tab** (optional): Whether to open in new tab

**Use Cases**:
- Redirect to special landing pages
- Send visitors to conversion pages
- Create A/B testing flows
- Implement exit-intent redirects

---

#### 6. Button Press
**Category**: Navigation  
**Icon**: MousePointer  
**Description**: Change navigation path when a button is clicked

**Configuration Options**:
- **Button Selector** (required): CSS selector for the button to monitor
- **New Navigation Path** (required): The navigation path to change to when button is clicked
- **Navigation Type** (required): Push State (Add to History), Replace State (No History), or Full Page Redirect
- **Delay (seconds)** (optional): Delay before navigation change (0 for immediate)

**Use Cases**:
- Change navigation behavior for specific buttons
- Create custom button interactions
- Implement dynamic navigation flows
- Override default button behaviors

---

### Advanced UI Actions

#### 6. Display Overlay
**Category**: Advanced UI  
**Icon**: Square  
**Description**: Show custom overlay, popup, or modal

**Configuration Options**:
- **Overlay Type** (required): Popup Modal, Banner Notification, Sidebar Slide-in, Tooltip, Fullscreen Overlay, or Corner Notification
- **Position** (required): Center, Top, Bottom, Left, Right, or corners
- **Overlay Width** (required): Small (300px), Medium (500px), Large (700px), Full Width, or Auto
- **Animation** (required): Fade In, Slide In, Zoom In, Bounce In, or No Animation
- **HTML Content** (required): HTML content to display
- **Show Close Button** (optional): Display X button to close
- **Show Backdrop** (optional): Semi-transparent background
- **Auto Close** (optional): Automatically close after time
- **Auto Close Delay** (optional): Time before auto-closing

**Use Cases**:
- Show promotional offers and announcements
- Display important notifications and alerts
- Create immersive content experiences
- Implement feedback and survey forms

---

### Advanced Integration Actions

#### 7. Custom Event
**Category**: Advanced Integration  
**Icon**: Code  
**Description**: Trigger custom JavaScript events or analytics

**Configuration Options**:
- **Event Type** (required): Analytics Event, Custom JavaScript, API Call, or DOM Event
- **Event Name** (required): Name of the event to trigger
- **Event Data (JSON)** (optional): JSON data to send with event
- **Target Element** (optional): Element to attach event to (for DOM events)

**Use Cases**:
- Track custom analytics events
- Trigger third-party integrations
- Execute custom JavaScript functions
- Send data to external APIs

---

### Lead Generation Actions

#### 8. Progressive Form
**Category**: Lead Generation  
**Icon**: FileText  
**Description**: Show progressive profiling form fields

**Configuration Options**:
- **Form Container** (required): Container where form field will be added
- **Field Type** (required): Email, Phone, Text, Textarea, Select, Radio, Checkbox, Number, Date, or URL
- **Field Name** (required): Internal name for the form field
- **Field Label** (required): Label text displayed to user
- **Placeholder Text** (optional): Placeholder text for input
- **Required Field** (optional): Whether field is required
- **Options** (optional): Options for select/radio buttons
- **Progressive Step** (required): Step number in sequence

**Use Cases**:
- Implement progressive profiling strategies
- Reduce form abandonment with step-by-step collection
- Personalize form fields based on user data
- Create multi-step lead qualification

---

### Personalization Actions

#### 9. Dynamic Content
**Category**: Personalization  
**Icon**: User  
**Description**: Show personalized content based on user data

**Configuration Options**:
- **Content Type** (required): Product/Content Recommendations, Personalized Message, Location-Specific Content, or Behavior-Based Content
- **Data Source** (required): Browsing History, Purchase History, User Preferences, Geographic Location, or Current Session Data
- **Target Container** (required): Where to display the dynamic content
- **Content Template** (required): HTML template with placeholder variables

**Use Cases**:
- Show personalized product recommendations
- Display location-specific content and offers
- Create behavior-based messaging
- Implement dynamic content personalization

---

## 🔄 CONDITION NODES

*Note: Only one condition node can be used per workflow*

Condition nodes were previously available but have been removed from the current implementation. They included:
- Page URL conditions
- Time-based conditions
- Other contextual evaluations

---

## 📝 Configuration Field Types

### Field Types Reference

- **text**: Single-line text input
- **textarea**: Multi-line text input
- **number**: Numeric input
- **select**: Dropdown selection
- **boolean**: True/false checkbox
- **css-selector**: CSS selector input with validation
- **url**: URL input with validation

### Common Configuration Patterns

#### CSS Selectors
Used throughout many nodes to target specific elements:
- `#element-id` - Target by ID
- `.class-name` - Target by class
- `tag-name` - Target by HTML tag
- `[attribute="value"]` - Target by attribute

#### Animation Options
Common across visual nodes:
- **No Animation**: Instant change
- **Fade**: Smooth opacity transition
- **Slide**: Movement transition
- **Zoom**: Scale transition
- **Bounce**: Elastic transition

---

## 🚀 Best Practices

### Workflow Design
1. **Start with Triggers**: Every workflow must begin with exactly one trigger
2. **Chain Actions**: Connect multiple actions to create complex behaviors
3. **Test Thoroughly**: Verify each node configuration before deployment
4. **Monitor Performance**: Track workflow execution and effectiveness

### Node Configuration
1. **Use Specific Selectors**: Precise CSS selectors prevent unintended targeting
2. **Set Appropriate Delays**: Balance user experience with functionality
3. **Provide Fallbacks**: Consider what happens when elements don't exist
4. **Optimize for Performance**: Minimize DOM manipulation and heavy operations

### Common Workflows
1. **Exit Intent Popup**: Exit Intent Trigger → Display Overlay Action
2. **Mobile Optimization**: Device Type Trigger → Modify CSS Action
3. **UTM Personalization**: UTM Parameters Trigger → Replace Text Action
4. **Scroll Engagement**: Scroll Depth Trigger → Show Element Action
5. **Progressive Profiling**: Time on Page Trigger → Progressive Form Action

---

## 🔧 Technical Notes

### Browser Compatibility
- All nodes work in modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers fully supported
- Legacy browser support may vary by node type

### Performance Considerations
- Trigger evaluation happens in real-time
- Complex CSS selectors may impact performance
- Limit simultaneous active workflows for optimal performance

### Security & Privacy
- All personalization data is processed client-side
- No sensitive data is transmitted without user consent
- Geolocation requires user permission
- GDPR and privacy compliance built-in

---

## 📊 Analytics & Tracking

### Built-in Metrics
- Workflow execution count
- Node performance metrics
- User engagement tracking
- Conversion attribution

### Custom Tracking
Use the Custom Event action to:
- Send data to analytics platforms
- Track custom conversion events
- Integrate with third-party tools
- Monitor workflow effectiveness

---

*This documentation is current as of the latest version. For updates and additional features, please refer to the application's built-in help system.* 