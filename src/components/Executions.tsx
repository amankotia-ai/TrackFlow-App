import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter, 
  Search,
  Calendar,
  Download,
  ArrowUpRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { WorkflowExecution } from '../services/analyticsService';
import { Workflow } from '../types/workflow';
import { ApiClient } from '@/lib/apiClient';
import ExecutionTimeline from './ExecutionTimeline';

interface ExecutionsProps {
  workflows: Workflow[];
}

const Executions: React.FC<ExecutionsProps> = ({ workflows }) => {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [workflowFilter, setWorkflowFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    const fetchExecutions = async () => {
      setLoading(true);
      try {
        const days = dateRange === '24h' ? 1 : dateRange === '7d' ? 7 : 30;
        const response = await new ApiClient().getDetailedWorkflowExecutions(undefined, days);
        
        if (response.success && response.data) {
          setExecutions(response.data);
        } else if (response.error) {
          setError(response.error);
        }
      } catch (err) {
        console.error('Failed to fetch executions:', err);
        setError('Failed to load execution data');
      } finally {
        setLoading(false);
      }
    };

    fetchExecutions();
  }, [dateRange]);

  const filteredExecutions = executions.filter(exec => {
    // Search term
    const matchesSearch = 
      exec.page_url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exec.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || exec.status === statusFilter;
    
    // Workflow filter
    const matchesWorkflow = workflowFilter === 'all' || exec.workflow_id === workflowFilter;

    return matchesSearch && matchesStatus && matchesWorkflow;
  });

  const getWorkflowName = (id: string) => {
    return workflows.find(w => w.id === id)?.name || 'Unknown Workflow';
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="flex-1 bg-zinc-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Executions</h1>
            <p className="text-sm text-zinc-500 mt-1">Monitor and debug workflow executions in real-time</p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center px-4 py-2 border border-zinc-200 rounded-md bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Timeline Overview */}
        <ExecutionTimeline executions={executions} />

        {/* Filters & Search */}
        <div className="bg-white rounded-lg border border-zinc-200 p-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-1 gap-4 min-w-[300px]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by URL or ID..."
                className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-2 px-3 py-2 border border-zinc-200 rounded-md bg-zinc-50">
              <Filter className="w-4 h-4 text-zinc-500" />
              <select 
                className="bg-transparent border-none text-sm font-medium text-zinc-700 focus:ring-0 cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 border border-zinc-200 rounded-md bg-zinc-50">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <select 
                className="bg-transparent border-none text-sm font-medium text-zinc-700 focus:ring-0 cursor-pointer"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Executions Table */}
        <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-zinc-400 mb-4" />
              <p className="text-zinc-500">Loading execution data...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-red-500 mb-4" />
              <p className="text-red-600">{error}</p>
            </div>
          ) : filteredExecutions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-zinc-500">No executions found matching your criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Workflow</th>
                    <th className="px-6 py-4 font-medium">Page / Context</th>
                    <th className="px-6 py-4 font-medium">Duration</th>
                    <th className="px-6 py-4 font-medium">Time</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredExecutions.map((exec) => (
                    <tr key={exec.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {exec.status === 'success' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className={`capitalize font-medium ${
                            exec.status === 'success' ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {exec.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-zinc-900">
                          {getWorkflowName(exec.workflow_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs truncate text-zinc-600" title={exec.page_url || ''}>
                          {exec.page_url || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 font-mono">
                        {formatDuration(exec.execution_time_ms)}
                      </td>
                      <td className="px-6 py-4 text-zinc-600">
                        {formatDate(exec.executed_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-zinc-400 hover:text-zinc-900 transition-colors">
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Pagination (Simple placeholder) */}
        {!loading && filteredExecutions.length > 0 && (
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <div>Showing {filteredExecutions.length} results</div>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-zinc-200 rounded hover:bg-zinc-50 disabled:opacity-50" disabled>Previous</button>
              <button className="px-3 py-1 border border-zinc-200 rounded hover:bg-zinc-50 disabled:opacity-50" disabled>Next</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Executions;


