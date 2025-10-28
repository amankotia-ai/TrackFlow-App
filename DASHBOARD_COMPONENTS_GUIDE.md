# Dashboard Components Guide

Quick reference for the new dashboard components and helper functions.

---

## 📦 Helper Functions (`src/utils/dashboardHelpers.ts`)

### `calculateTodayStats(executions)`

Calculates today's execution statistics with trend comparison.

**Input:**
```typescript
executions: WorkflowExecution[]
```

**Output:**
```typescript
{
  count: number;              // Today's execution count
  successRate: number;        // Success percentage (rounded)
  avgTime: number;           // Average execution time (ms)
  errorCount: number;        // Number of errors today
  yesterdayCount?: number;   // Yesterday's count for comparison
  trendPercentage?: number;  // Percentage change vs yesterday
}
```

**Example:**
```typescript
const todayStats = calculateTodayStats(executions);
// { count: 247, successRate: 96.4, avgTime: 124, errorCount: 9, trendPercentage: 23 }
```

---

### `detectAlerts(executions, workflows)`

Analyzes executions to detect issues requiring attention.

**Input:**
```typescript
executions: WorkflowExecution[]
workflows: Workflow[]
```

**Output:**
```typescript
Alert[] // Sorted by severity (high → medium → info)
```

**Alert Types:**
- **High**: Error rate > 20% in last 20 executions
- **Medium**: Execution time increased > 30% recently
- **Info**: No activity in 6+ hours for active playbook

**Example:**
```typescript
const alerts = detectAlerts(executions, workflows);
// [
//   { severity: 'high', playbook: 'Exit Modal', message: 'Failing 45% of the time', ... },
//   { severity: 'medium', playbook: 'Welcome Banner', message: 'Execution time increased 34%', ... }
// ]
```

---

### `groupExecutionsByTime(executions)`

Groups executions into time buckets for progressive disclosure.

**Input:**
```typescript
executions: WorkflowExecution[]
```

**Output:**
```typescript
{
  recent: WorkflowExecution[];   // Last 5 minutes
  last30: WorkflowExecution[];   // 5-30 minutes ago
  earlier: WorkflowExecution[];  // 30+ minutes ago
}
```

**Example:**
```typescript
const grouped = groupExecutionsByTime(executions);
// { recent: [...3 executions], last30: [...12 executions], earlier: [...156 executions] }
```

---

### `getDeviceBreakdown(executions)`

Analyzes device types from user agent strings.

**Input:**
```typescript
executions: WorkflowExecution[]
```

**Output:**
```typescript
{
  mobile: number;
  desktop: number;
  tablet: number;
  unknown: number;
}
```

**Example:**
```typescript
const devices = getDeviceBreakdown(executions);
// { mobile: 167, desktop: 70, tablet: 10, unknown: 0 }
```

---

### `getTopPerformers(executions, workflows, limit = 3)`

Identifies best performing playbooks.

**Input:**
```typescript
executions: WorkflowExecution[]
workflows: Workflow[]
limit?: number  // Default: 3
```

**Output:**
```typescript
TopPerformer[] // Sorted by success rate, then execution count
```

**Example:**
```typescript
const topPerformers = getTopPerformers(executions, workflows, 3);
// [
//   { name: 'Mobile Welcome', workflowId: '...', executions: 89, successRate: 100, avgTime: 98 },
//   { name: 'UTM Pricing', workflowId: '...', executions: 67, successRate: 98, avgTime: 112 }
// ]
```

---

### `getUniqueVisitorCount(executions)`

Counts unique sessions from executions.

**Input:**
```typescript
executions: WorkflowExecution[]
```

**Output:**
```typescript
number  // Count of unique session_ids
```

---

### `getUniquePagesCount(executions)`

Counts unique pages from executions.

**Input:**
```typescript
executions: WorkflowExecution[]
```

**Output:**
```typescript
number  // Count of unique page_urls
```

---

### `calculateHourlyData(executions)`

Processes hourly execution data for timeline chart.

**Input:**
```typescript
executions: WorkflowExecution[]
```

**Output:**
```typescript
Array<{
  hour: number;      // 0-23
  success: number;   // Success count
  error: number;     // Error count
  total: number;     // Total count
}>
```

---

## 🎨 Components

### `AlertsSection`

Displays critical issues requiring attention.

**Props:**
```typescript
{
  alerts: Alert[]
}
```

**Features:**
- Only renders when alerts exist
- Color-coded severity (red/yellow/blue)
- Action buttons per alert
- Expandable details

**Usage:**
```tsx
<AlertsSection alerts={dashboardData.alerts} />
```

---

### `ExecutionTimeline`

24-hour bar chart showing execution volumes.

**Props:**
```typescript
{
  executions: WorkflowExecution[]
}
```

**Features:**
- Hourly breakdown (24 bars)
- Success (green) and error (red) stacked bars
- Interactive tooltips
- Summary stats below chart

**Usage:**
```tsx
<ExecutionTimeline executions={recentExecutions} />
```

---

### `EnhancedStatCard`

Reusable metric card with trends and sub-metrics.

**Props:**
```typescript
{
  title: string;
  value: string | number;
  icon: LucideIcon;
  subMetric?: string;
  trend?: {
    value: number;     // Percentage change
    label: string;     // e.g., "vs yesterday"
  };
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}
```

**Features:**
- Icon with colored background
- Large value display
- Trend indicators (↑↓)
- Optional sub-metric
- Optional action button

**Usage:**
```tsx
<EnhancedStatCard
  title="Executions Today"
  value={247}
  icon={Zap}
  subMetric="⚠️ 9 errors to review"
  trend={{ value: 23, label: 'vs yesterday' }}
/>
```

---

### `TopPerformers`

Displays top performing playbooks with rankings.

**Props:**
```typescript
{
  performers: TopPerformer[]
}
```

**Features:**
- Medal-style ranking (🥇🥈🥉)
- Execution count
- Success rate percentage
- Average execution time
- Empty state when no data

**Usage:**
```tsx
<TopPerformers performers={dashboardData.topPerformers} />
```

---

### `EnhancedExecutionList`

Time-grouped execution display with progressive disclosure.

**Props:**
```typescript
{
  groupedExecutions: TimeGroupedExecutions;
  workflows: Workflow[];
}
```

**Features:**
- Recent (5 min): Always expanded, full details
- Last 30 min: Collapsible summary
- Earlier: Collapsible summary
- Device detection
- Page URLs
- Error messages
- Empty state

**Usage:**
```tsx
<EnhancedExecutionList 
  groupedExecutions={dashboardData.groupedExecutions} 
  workflows={workflows}
/>
```

**Execution Card Details:**
- ✅ Status icon (success/error)
- Playbook name
- Time ago
- 📍 Page URL
- 📱/💻 Device type and name
- ⚡ Execution time
- ⚠️ Error message (when failed)

---

## 🎯 Complete Dashboard Usage Example

```tsx
import React, { useMemo } from 'react';
import { CheckCircle, Users, Zap, Smartphone } from 'lucide-react';
import AlertsSection from './AlertsSection';
import ExecutionTimeline from './ExecutionTimeline';
import EnhancedStatCard from './EnhancedStatCard';
import TopPerformers from './TopPerformers';
import EnhancedExecutionList from './EnhancedExecutionList';
import {
  calculateTodayStats,
  detectAlerts,
  groupExecutionsByTime,
  getDeviceBreakdown,
  getTopPerformers,
  getUniqueVisitorCount,
  getUniquePagesCount
} from '../utils/dashboardHelpers';

function Dashboard({ workflows, executions }) {
  // Calculate all analytics
  const dashboardData = useMemo(() => {
    return {
      todayStats: calculateTodayStats(executions),
      alerts: detectAlerts(executions, workflows),
      groupedExecutions: groupExecutionsByTime(executions),
      deviceBreakdown: getDeviceBreakdown(executions),
      topPerformers: getTopPerformers(executions, workflows, 3),
      uniqueVisitors: getUniqueVisitorCount(executions),
      uniquePages: getUniquePagesCount(executions)
    };
  }, [executions, workflows]);

  return (
    <div className="space-y-6">
      {/* Alerts */}
      <AlertsSection alerts={dashboardData.alerts} />

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <EnhancedStatCard
          title="Executions Today"
          value={dashboardData.todayStats.count}
          icon={Zap}
          subMetric={`${dashboardData.todayStats.errorCount} errors`}
          trend={{
            value: dashboardData.todayStats.trendPercentage,
            label: 'vs yesterday'
          }}
        />
        
        <EnhancedStatCard
          title="Success Rate (24h)"
          value={`${dashboardData.todayStats.successRate}%`}
          icon={CheckCircle}
          subMetric="Excellent performance"
        />
        
        <EnhancedStatCard
          title="Unique Visitors"
          value={dashboardData.uniqueVisitors}
          icon={Users}
          subMetric={`${dashboardData.uniquePages} unique pages`}
        />
        
        <EnhancedStatCard
          title="Top Device"
          value="67%"
          icon={Smartphone}
          subMetric="Mobile (Desktop: 28%)"
        />
      </div>

      {/* Timeline */}
      <ExecutionTimeline executions={executions} />

      {/* Top Performers */}
      <TopPerformers performers={dashboardData.topPerformers} />

      {/* Recent Activity */}
      <EnhancedExecutionList 
        groupedExecutions={dashboardData.groupedExecutions}
        workflows={workflows}
      />
    </div>
  );
}
```

---

## 🎨 Styling

All components use Tailwind CSS with the following design tokens:

**Colors:**
- Primary: `primary-*` (blue)
- Secondary: `secondary-*` (gray)
- Success: `green-*`
- Error: `red-*`
- Warning: `yellow-*`
- Info: `blue-*`

**Spacing:**
- Card padding: `p-6`
- Section spacing: `space-y-6`
- Grid gap: `gap-4`

**Borders:**
- Default: `border border-secondary-200`
- Rounded: `rounded-lg`

**Text:**
- Titles: `font-semibold text-secondary-900`
- Labels: `text-sm text-secondary-600`
- Metrics: `text-xs text-secondary-500`

---

## 📊 Data Requirements

All components expect standard `WorkflowExecution` objects:

```typescript
interface WorkflowExecution {
  id: string;
  workflow_id: string;
  user_id: string;
  status: 'success' | 'error' | 'timeout';
  execution_time_ms: number | null;
  error_message: string | null;
  page_url: string | null;
  user_agent: string | null;
  session_id: string | null;
  executed_at: string;
}
```

And `Workflow` objects:

```typescript
interface Workflow {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'error';
  createdAt: Date;
  // ... other fields
}
```

---

## 🚀 Performance Tips

1. **Use useMemo** for analytics calculations:
   ```tsx
   const dashboardData = useMemo(() => {
     return { /* calculations */ };
   }, [executions, workflows]);
   ```

2. **Fetch enough data**: Get 100+ executions for accurate analytics

3. **Group calculations**: Do all analytics in one useMemo block

4. **Lazy load**: Only render timeline/performers when data exists

5. **Progressive disclosure**: Keep recent detailed, older summarized

---

## 🎉 That's it!

You now have a complete, production-ready dashboard with:
- ✅ Smart alerts
- ✅ Trend analysis
- ✅ Visual timeline
- ✅ Performance rankings
- ✅ Time-grouped activity
- ✅ Device analytics
- ✅ Visitor tracking

**Happy monitoring!** 📊

