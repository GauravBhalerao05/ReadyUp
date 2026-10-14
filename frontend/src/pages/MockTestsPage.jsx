import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Timer,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Award,
  Layers,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { testService } from '../services/testService';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';

export default function MockTestsPage() {
  const [mockTests, setMockTests] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(true);

  // Modal for test start confirmation & instructions
  const [selectedTest, setSelectedTest] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    async function loadTests() {
      try {
        const res = await testService.getMockTests();
        setMockTests(res || []);
      } catch (err) {
        console.error('Failed to load mock tests:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTests();
  }, []);

  const handleStartTest = async (test) => {
    setIsStarting(true);
    try {
      const session = await testService.startMockTest(test._id);
      addToast({
        title: 'Mock Test Started',
        message: `${session.title} • Timer running`,
        type: 'info'
      });
      setSelectedTest(null);
      navigate(`/tests/take/${session.attemptId}`, { state: { session } });
    } catch (err) {
      addToast({
        title: 'Could not launch mock test',
        message: err.message,
        type: 'error'
      });
    } finally {
      setIsStarting(false);
    }
  };

  const filteredTests = mockTests.filter(
    (t) => selectedType === 'all' || t.type === selectedType
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <span className="text-[11px] font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400">
          EXAM SIMULATION
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
          Full-Length Mock Tests
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Standardized placement assessments with live timers and authoritative server evaluation
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { label: 'All Assessments', value: 'all' },
          { label: 'Company Mocks', value: 'company_mock' },
          { label: 'Topic Tests', value: 'topic_test' },
          { label: 'Diagnostic Assessments', value: 'diagnostic' }
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSelectedType(tab.value)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedType === tab.value
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Test Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTests.map((test) => (
          <div
            key={test._id}
            className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 card-shadow hover:card-shadow-hover transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <Badge variant={test.company === 'General' ? 'neutral' : 'teal'}>
                  {test.company}
                </Badge>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  <span>{test.durationMinutes} mins</span>
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                {test.title}
              </h3>

              <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Questions:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {test.totalQuestions} Questions
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Total Marks:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {test.totalMarks} Marks
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Passing Cutoff:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {test.passingMarks} Marks (60%)
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Exam format verified
              </span>
              <button
                onClick={() => setSelectedTest(test)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                <span>Instructions</span>
                <Play className="w-3 h-3 fill-white" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Instructions & Confirmation Dialog */}
      {selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">
                  TEST INSTRUCTIONS & RULES
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedTest.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTest(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/40">
                <div>
                  <span className="text-[11px] text-teal-700 dark:text-teal-400 block font-medium">Duration</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedTest.durationMinutes} Mins</span>
                </div>
                <div>
                  <span className="text-[11px] text-teal-700 dark:text-teal-400 block font-medium">Questions</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedTest.totalQuestions}</span>
                </div>
                <div>
                  <span className="text-[11px] text-teal-700 dark:text-teal-400 block font-medium">Pass Cutoff</span>
                  <span className="text-sm font-bold text-emerald-600">{selectedTest.passingMarks} Marks</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                  Important Guidelines:
                </span>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  {(selectedTest.instructions || [
                    'Each question carries 1 mark. There is no negative marking.',
                    'The countdown timer starts as soon as you launch the test.',
                    'Do not refresh or navigate away from the browser during the assessment.'
                  ]).map((inst, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                      <span>{inst}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedTest(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isStarting}
                onClick={() => handleStartTest(selectedTest)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <span>{isStarting ? 'Starting Timer...' : 'Start Mock Test Now'}</span>
                <Play className="w-3.5 h-3.5 fill-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
