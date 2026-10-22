import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  BookOpen,
  FolderGit2,
  Building2,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  History,
  Plus
} from 'lucide-react';
import { coordinatorService } from '../services/coordinatorService';
import MetricCard from '../components/common/MetricCard';
import Badge from '../components/common/Badge';

export default function CoordinatorDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadCoordinatorDashboard() {
      try {
        const res = await coordinatorService.getDashboard();
        setData(res);
      } catch (err) {
        console.error('Failed to load coordinator dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCoordinatorDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const rawMetrics = data?.metrics;
  const metrics = Array.isArray(rawMetrics)
    ? rawMetrics
    : Array.isArray(data?.metricCards)
    ? data.metricCards
    : rawMetrics
    ? [
        {
          label: 'Total Questions',
          value: rawMetrics.totalQuestions ?? 0,
          subtext: `${rawMetrics.activeQuestions ?? 0} active in live repository`,
          icon: 'BookOpen',
          color: 'teal'
        },
        {
          label: 'Verified Content',
          value: rawMetrics.verifiedQuestions ?? 0,
          subtext: 'Reviewed by placement faculty',
          icon: 'CheckCircle2',
          color: 'emerald'
        },
        {
          label: 'Active Mock Tests',
          value: rawMetrics.activeTests ?? 0,
          subtext: 'Available for student simulations',
          icon: 'FolderGit2',
          color: 'amber'
        },
        {
          label: 'Pending Review',
          value: rawMetrics.needsReview ?? 0,
          subtext: 'Requires coordinator validation',
          icon: 'FileSpreadsheet',
          color: 'rose'
        }
      ]
    : [];
  const recentImports = data?.importHistory || data?.recentImports || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-amber-700 dark:text-amber-400">
            T&P COORDINATOR WORKSPACE
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Question Bank Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Upload verified placement aptitude spreadsheets and curate campus test questions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/coordinator/questions')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-teal-600" />
            <span>Browse Questions</span>
          </button>
          <button
            onClick={() => navigate('/coordinator/import')}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import Spreadsheet</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <MetricCard
            key={m.label}
            label={m.label}
            value={m.value}
            subtext={m.subtext}
            icon={m.icon}
            color={m.color}
          />
        ))}
      </div>

      {/* Quick Upload CTA Card */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/30 rounded-3xl p-6 sm:p-8 border border-teal-100 dark:border-teal-900/60 card-shadow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-600/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                BULK QUESTION IMPORT WORKFLOW
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Upload New Aptitude Spreadsheet (.xlsx / .csv)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                Parse questions, validate line-by-line syntax, review preview rows, and publish directly to the live question repository without developer intervention.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/coordinator/import')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer shrink-0"
          >
            <span>Launch Upload Wizard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Recent Uploads Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 card-shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Spreadsheet Import Activity
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              History of staged and committed question batches
            </p>
          </div>
          <button
            onClick={() => navigate('/coordinator/history')}
            className="text-xs font-semibold text-teal-600 hover:underline cursor-pointer"
          >
            View all history →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/60 text-slate-400 uppercase font-semibold">
                <th className="pb-3 pl-1">Filename</th>
                <th className="pb-3">Uploaded Date</th>
                <th className="pb-3">Uploader</th>
                <th className="pb-3">Total Rows</th>
                <th className="pb-3">Inserted</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentImports.map((item) => (
                <tr key={item.importBatchId} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="py-3.5 pl-1 font-semibold text-slate-800 dark:text-slate-200">
                    {item.filename}
                  </td>
                  <td className="py-3.5 text-slate-500">
                    {new Date(item.uploadedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 text-slate-600 dark:text-slate-400">
                    {item.uploaderName}
                  </td>
                  <td className="py-3.5 font-mono text-slate-700 dark:text-slate-300">
                    {item.totalRows}
                  </td>
                  <td className="py-3.5 text-emerald-600 font-semibold">
                    +{item.insertedCount}
                  </td>
                  <td className="py-3.5">
                    <Badge variant={item.status === 'published' ? 'Passed' : 'Needs Review'}>
                      {item.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
