# Environment Components Guide

## Overview

Environment Components is a powerful feature in TrackFlow that allows you to save and reuse frequently used CSS selectors, URLs, and other component references across your workflows. Similar to Postman's environment variables, this feature helps you:

- **Save time**: No need to remember or re-enter complex CSS selectors
- **Maintain consistency**: Use the same selectors across multiple workflows
- **Increase productivity**: Quickly access your most-used components
- **Track usage**: See which components are used most frequently

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Components](#creating-components)
3. [Using Components in Workflows](#using-components-in-workflows)
4. [Managing Components](#managing-components)
5. [Component Types](#component-types)
6. [Best Practices](#best-practices)
7. [Database Setup](#database-setup)

---

## Getting Started

### Accessing Environment Components

There are two ways to access Environment Components:

1. **From the Workflow Builder**: Click the "Components" button in the top toolbar
2. **From Node Configuration**: Click the "Components" button next to any CSS selector field

### First Time Setup

1. Run the database migration to create the necessary tables:
   ```bash
   # Execute the SQL schema in your Supabase project
   psql -h your-db-host -U postgres -d your-database -f environment-components-schema.sql
   ```

2. The feature will automatically be available in your workflow builder

---

## Creating Components

### Method 1: From the Components Manager

1. Open the Workflow Builder
2. Click the **"Components"** button in the top toolbar
3. Click **"Add Component"**
4. Fill in the form:
   - **Name**: A descriptive name (e.g., "Primary Button")
   - **Type**: Select the component type (CSS Selector, URL, Text, or Custom)
   - **Value**: The actual value (e.g., `.btn-primary`)
   - **Description**: Optional description of what this component represents
   - **Tags**: Optional tags for easier searching and organization

5. Click **"Create"**

### Method 2: Quick Create During Workflow Building

1. When configuring a node with a CSS selector field
2. Enter your selector manually or paste it
3. After verifying it works, save it as a component for future use

### Example: Creating a CSS Selector Component

```
Name: Homepage Hero CTA Button
Type: CSS Selector
Value: #hero-section .cta-button.primary
Description: The main call-to-action button on the homepage hero section
Tags: homepage, cta, button
```

---

## Using Components in Workflows

### In the Node Configuration Panel

1. Open a workflow and add a node that requires a CSS selector (e.g., "Click Element", "Replace Text")
2. Click to configure the node
3. In the CSS selector field, click the **"Components"** button
4. Browse or search for your desired component
5. Click on the component to select it
6. The component value will be automatically inserted into the field

### Component Selection Features

- **Filter by Type**: Quickly filter components by type (CSS Selectors, URLs, etc.)
- **Search**: Search by name, description, value, or tags
- **Sort Options**:
  - By Name (alphabetical)
  - By Usage (most used first)
  - By Recent (recently updated first)

### Auto-Increment Usage Counter

Every time you use a component, its usage count automatically increments. This helps you:
- See which components are most valuable
- Identify unused components that can be deleted
- Sort by most frequently used for quick access

---

## Managing Components

### Viewing Components

The Components Manager displays:
- **Component name** and type badge
- **Description** (if provided)
- **Value** in a code block for easy reading
- **Tags** for organization
- **Usage count** showing how many times it's been used
- **Last updated date**

### Editing Components

1. Click the **Edit** button (pencil icon) on any component
2. Modify the fields as needed
3. Click **"Update"**

**Note**: Updating a component will affect all workflows using it. Be careful when editing widely-used components.

### Duplicating Components

1. Click the **Duplicate** button (copy icon)
2. A copy will be created with " (Copy)" appended to the name
3. Edit the duplicate as needed

This is useful for:
- Creating variations of existing components
- Testing changes without affecting the original
- Creating templates for similar components

### Deleting Components

1. Click the **Delete** button (trash icon)
2. Confirm the deletion

**Warning**: Deleting a component does not update workflows that use it. The selector value will remain in those workflows, but you'll lose the ability to quickly update them all at once.

---

## Component Types

### CSS Selector

The most common type for TrackFlow workflows.

**Use Cases**:
- Button selectors: `.btn-primary`, `#submit-button`
- Form fields: `input[name="email"]`, `#signup-form`
- Content areas: `.article-content`, `#main-section`
- Navigation: `.nav-menu a`, `header .logo`

**Examples**:
```
Name: Newsletter Signup Form
Type: CSS Selector
Value: #newsletter-signup-form
```

```
Name: Product Add to Cart Button
Type: CSS Selector
Value: .product-card .add-to-cart-btn
```

### URL

Store frequently used URLs.

**Use Cases**:
- Landing pages
- Product pages
- API endpoints
- External resources

**Example**:
```
Name: Product Listing Page
Type: URL
Value: https://example.com/products
```

### Text

Store reusable text snippets.

**Use Cases**:
- Common messages
- Template text
- Placeholder content

**Example**:
```
Name: Welcome Message
Type: Text
Value: Welcome back! We've personalized this page just for you.
```

### Custom

For any other type of value that doesn't fit the above categories.

---

## Best Practices

### Naming Conventions

Use clear, descriptive names that explain what the component represents:

✅ **Good**:
- "Homepage Hero CTA Button"
- "Product Price Display"
- "User Profile Avatar"
- "Mobile Menu Toggle"

❌ **Avoid**:
- "button1"
- "selector"
- "test"
- "temp"

### Organization with Tags

Use tags to create logical groups:

**By Page/Section**:
- `homepage`, `product-page`, `checkout`, `profile`

**By Component Type**:
- `button`, `form`, `navigation`, `modal`

**By Purpose**:
- `cta`, `signup`, `conversion`, `analytics`

**Example**:
```
Name: Checkout Submit Button
Tags: checkout, button, cta, conversion
```

### Add Descriptions

Always add descriptions for complex or important selectors:

```
Name: Dynamic Product Grid
Value: .products-container .product-item:nth-child(n+5)
Description: Targets product items from the 5th onwards in the grid. 
             Used for showing special offers to users who scroll.
```

### Regular Maintenance

1. **Review Usage**: Periodically check usage counts to identify:
   - Unused components that can be deleted
   - Highly-used components that might need optimization

2. **Update Outdated Selectors**: When website structures change, update components rather than creating new ones

3. **Clean Up Duplicates**: Remove duplicate or redundant components

### Version Control

For critical selectors, consider:
- Adding version numbers to names: "Primary Button v2"
- Using tags to mark versions: `v1`, `v2`, `current`, `legacy`
- Keeping detailed descriptions of what changed

### Testing Before Saving

Always test your selectors in a workflow before saving them as components:

1. Create a test workflow
2. Add the selector manually
3. Test that it works correctly
4. Then save it as a component

---

## Advanced Features

### Quick Access

Components are sorted by usage count, so your most-used selectors appear first when sorting by "Usage". This creates a self-organizing library that adapts to your needs.

### Bulk Updates

If you need to update a selector across multiple workflows:

1. Update the component once
2. Go to each workflow
3. Remove and re-add the selector from components
4. This ensures all workflows use the updated value

### Search Tips

The search functionality looks in:
- Component names
- Descriptions
- Values (the actual selector)
- Tags

Use partial matches for broad searches:
- Search "button" to find all button-related components
- Search ".btn" to find all components with that class selector

---

## Database Setup

### Running the Migration

The environment components feature requires a database table. Run this SQL in your Supabase SQL Editor:

```sql
-- See environment-components-schema.sql for the complete migration
```

### Key Features of the Schema

- **Row Level Security (RLS)**: Users can only see and modify their own components
- **Auto-timestamps**: Tracks when components are created and updated
- **Usage tracking**: Automatically counts how often components are used
- **Indexed fields**: Fast searching and filtering
- **Unique names**: Prevents duplicate component names per user

### Permissions

The schema automatically handles permissions:
- ✅ Users can create their own components
- ✅ Users can view their own components
- ✅ Users can edit their own components
- ✅ Users can delete their own components
- ❌ Users cannot see other users' components

---

## Troubleshooting

### Component Not Appearing in List

**Possible causes**:
1. Check your filter settings (type filter)
2. Check your search query
3. Verify you're logged in with the correct account
4. Refresh the components list

### Usage Count Not Updating

The usage count increments when you:
- Select a component from the selector modal
- Click on a component to use it

It does **not** increment when:
- You manually type the same selector
- You copy/paste a selector value

### "Component Not Found" Error

This can happen if:
- The component was deleted
- You don't have permission to access it
- There's a database connection issue

**Solution**: Create a new component with the same value

---

## Example Workflows

### Scenario 1: E-commerce Personalization

Save these components:
```
1. Product Card - .product-card
2. Add to Cart Button - .product-card .add-to-cart
3. Price Display - .product-card .price
4. Product Title - .product-card h3.title
```

Use them in workflows to:
- Highlight recently viewed products
- Show personalized discount badges
- Change CTA text based on cart contents

### Scenario 2: SaaS Application

Save these components:
```
1. Onboarding Tooltip Container - #onboarding-tooltips
2. Feature Tour Button - .feature-tour-trigger
3. Upgrade CTA - .upgrade-banner .cta-button
4. User Dashboard Widget - .dashboard-widget
```

Use them in workflows to:
- Show contextual help to new users
- Promote upgrades to free tier users
- Personalize dashboard based on usage

### Scenario 3: Content Website

Save these components:
```
1. Article Body - .article-content
2. Newsletter Signup - #newsletter-signup
3. Related Articles - .related-articles-section
4. Social Share Buttons - .social-share-buttons
```

Use them in workflows to:
- Show newsletter signup after reading time threshold
- Personalize related article recommendations
- Trigger social sharing prompts

---

## Future Enhancements

Planned features for Environment Components:

- [ ] **Export/Import**: Share component libraries between team members
- [ ] **Component Sets**: Group related components into collections
- [ ] **Visual Selector Picker**: Click elements on a page to create components
- [ ] **Component Testing**: Validate selectors against live pages
- [ ] **Workflow Impact Analysis**: See which workflows use a component
- [ ] **Component Analytics**: Track component effectiveness
- [ ] **Collaborative Libraries**: Team-wide component sharing

---

## Support

If you encounter issues or have suggestions for Environment Components:

1. Check this documentation first
2. Review the database schema setup
3. Check browser console for errors
4. Verify Supabase connection and permissions

---

## Summary

Environment Components streamline your workflow creation process by:

✅ Eliminating the need to remember complex selectors  
✅ Ensuring consistency across workflows  
✅ Tracking what works best (via usage counts)  
✅ Making updates easier when websites change  
✅ Organizing your most important selectors in one place  

Start building your component library today and watch your workflow creation speed increase dramatically!

