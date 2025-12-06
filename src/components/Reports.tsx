import React, { useMemo, useState } from 'react';
import { Workflow } from '../types/workflow';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  Users, 
  Activity, 
  CheckCircle, 
  AlertTriangle,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface ReportsProps {
  workflows: Workflow[];
}

const Reports: React.FC<ReportsProps> = ({ workflows }) => {
  const [reportPeriod, setReportPeriod] = useState('30d');

  // Calculate aggregate metrics
  const metrics = useMemo(() => {
    const totalWorkflows = workflows.length;
    const activeWorkflows = workflows.filter(w => w.status === 'active').length;
    const totalExecutions = workflows.reduce((sum, w) => sum + w.executions, 0);
    
    // Mock success rate calculation (since we don't have full execution history here)
    // In a real app, we'd fetch this from the backend
    const successRate = 98.5; 
    const errorRate = 1.5;

    // Calculate estimated time saved (mock logic: 30s per execution)
    const timeSavedMinutes = totalExecutions * 0.5;
    const timeSavedHours = Math.round(timeSavedMinutes / 60);

    return {
      totalWorkflows,
      activeWorkflows,
      totalExecutions,
      successRate,
      errorRate,
      timeSavedHours
    };
  }, [workflows]);

  // Mock data for charts
  const performanceData = [
    { name: 'Mon', success: 400, error: 24 },
    { name: 'Tue', success: 300, error: 13 },
    { name: 'Wed', success: 550, error: 35 },
    { name: 'Thu', success: 480, error: 20 },
    { name: 'Fri', success: 620, error: 45 },
    { name: 'Sat', success: 200, error: 5 },
    { name: 'Sun', success: 150, error: 8 },
  ];

  const workflowDistributionData = [
    { name: 'Marketing', value: 45 },
    { name: 'Sales', value: 30 },
    { name: 'Support', value: 15 },
    { name: 'Other', value: 10 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="flex-1 bg-zinc-50 min-h-screen p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Report Header */}
        <div className="flex items-center justify-between bg-white p-6 rounded-lg border border-zinc-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-zinc-500 text-sm mb-1">
              <FileText className="w-4 h-4" />
              <span>Monthly Performance Report</span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">Executive Summary</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Generated on {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select 
              className="px-3 py-2 border border-zinc-200 rounded-md text-sm bg-zinc-50"
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last Quarter</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-md text-sm hover:bg-zinc-800">
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-medium text-zinc-900">Total Efficiency</h3>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-zinc-900">{metrics.timeSavedHours}h</div>
              <p className="text-sm text-zinc-500">Estimated manual hours saved</p>
            </div>
            <div className="mt-4 flex items-center text-xs text-green-600 font-medium">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12% from last month
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 text-green-600 rounded-md">
                <CheckCircle className="w-5 h-5" />
              </div>
              <h3 className="font-medium text-zinc-900">Success Rate</h3>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-zinc-900">{metrics.successRate}%</div>
              <p className="text-sm text-zinc-500">Across {metrics.totalExecutions.toLocaleString()} executions</p>
            </div>
            <div className="mt-4 flex items-center text-xs text-green-600 font-medium">
              <TrendingUp className="w-3 h-3 mr-1" />
              +0.5% stability increase
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-md">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-medium text-zinc-900">Active Playbooks</h3>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-zinc-900">{metrics.activeWorkflows}</div>
              <p className="text-sm text-zinc-500">Of {metrics.totalWorkflows} total workflows</p>
            </div>
            <div className="mt-4 w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full" 
                style={{ width: `${(metrics.activeWorkflows / metrics.totalWorkflows) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Trend */}
          <div className="bg-white p-6 rounded-lg border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium text-zinc-900 flex items-center gap-2">
                <BarChartIcon className="w-4 h-4 text-zinc-500" />
                Execution Volume
              </h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e4e4e7',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Bar dataKey="success" name="Successful" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="error" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-white p-6 rounded-lg border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium text-zinc-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-zinc-500" />
                Usage by Category
              </h3>
            </div>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={workflowDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {workflowDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Insights Table */}
        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
            <h3 className="font-medium text-zinc-900">Workflow Performance Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 uppercase bg-white border-b border-zinc-100">
                <tr>
                  <th className="px-6 py-3 font-medium">Workflow Name</th>
                  <th className="px-6 py-3 font-medium">Executions</th>
                  <th className="px-6 py-3 font-medium">Avg. Duration</th>
                  <th className="px-6 py-3 font-medium">Reliability</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {workflows.slice(0, 5).map((workflow) => (
                  <tr key={workflow.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-4 font-medium text-zinc-900">{workflow.name}</td>
                    <td className="px-6 py-4 text-zinc-600">{workflow.executions.toLocaleString()}</td>
                    <td className="px-6 py-4 text-zinc-600">1.2s</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 w-[98%]" />
                        </div>
                        <span className="text-xs text-zinc-600">98%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        workflow.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-zinc-100 text-zinc-800'
                      }`}>
                        {workflow.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 text-center">
            <button className="text-sm text-zinc-600 hover:text-zinc-900 font-medium">
              View All Workflows
            </button>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="text-center text-xs text-zinc-400 pt-4">
          <p>Report generated automatically by TrackFlow Analytics Engine.</p>
          <p>Data is updated in real-time. Metrics calculated based on last 30 days activity.</p>
        </div>

      </div>
    </div>
  );
};

export default Reports;


