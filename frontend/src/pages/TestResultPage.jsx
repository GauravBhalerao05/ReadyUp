import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  Bookmark,
  Share2,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { testService } from '../services/testService';
import { bookmarkService } from '../services/bookmarkService';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';

export default function TestResultPage() {
  const { attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [result, setResult] = useState(location.state?.result || null);
  const [loading, setLoading] = useState(!result);
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [bookmarkModal, setBookmarkModal] = useState({ open: false, questionId: '', note: '' });

  useEffect(() => {
    async function loadReview() {
      if (!result) {
        try {
          const res = await testService.getAttemptReview(attemptId);
          setResult(res);
        } catch (err) {
          console.error('Failed to load review:', err);
        } finally {
          setLoading(false);
        }
      }
    }
    loadReview();
  }, [attemptId, result]);

  const toggleExpand = (qId) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const handleOpenBookmark = (questionId) => {
    setBookmarkModal({ open: true, questionId, note: '' });
  };

  const handleSaveBookmark = async (e) => {
    e.preventDefault();
    try {
      await bookmarkService.addBookmark(bookmarkModal.questionId, bookmarkModal.note);
      addToast({
        title: 'Saved to Revision Centre',
        message: 'Question bookmarked with your personal note.',
        type: 'success'
      });
      setBookmarkModal({ open: false, questionId: '', note: '' });
    } catch (err) {
      addToast({
        title: 'Could not bookmark',
        message: err.message,
        type: 'error'
      });
    }
  };

  if (loading || !result) {
    return (
      <div className="py-24 text-center animate-pulse">
        <Award className="w-12 h-12 text-teal-600 mx-auto mb-3 animate-bounce" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Calculating test evaluation & topic breakdown...
        </h3>
      </div>
    );
  }

  const detailed = result.detailedAnswers || [];
  const topicBreakdown = result.topicBreakdown || [];
  const recommendations = result.recommendations || [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Top Banner Card: Score & Pass/Fail */}
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 card-shadow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">
                ASSESSMENT RESULTS
              </span>
              <Badge variant={result.passed ? 'Passed' : 'Needs Review'}>
                {result.passed ? 'Cutoff Cleared' : 'Needs Reinforcement'}
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {result.title}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Attempt ID: <span className="font-mono">{result.attemptId}</span> • Evaluated on {new Date(result.submittedAt || Date.now()).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Score donut or badge */}
            <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900/60 text-center min-w-[120px]">
              <span className="text-3xl font-extrabold text-teal-700 dark:text-teal-400">
                {result.score}/{result.totalMarks}
              </span>
              <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                {result.percentage}% Accuracy
              </span>
            </div>
          </div>
        </div>

        {/* 4 Quick Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/60">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-center">
            <span className="text-[11px] text-slate-400 block font-medium">Attempted</span>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {result.attemptedCount} / {result.totalQuestions}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 text-center">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-medium">Correct</span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {result.correctCount}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 text-center">
            <span className="text-[11px] text-rose-700 dark:text-rose-400 block font-medium">Incorrect</span>
            <span className="text-lg font-bold text-rose-700 dark:text-rose-300">
              {result.incorrectCount}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-center">
            <span className="text-[11px] text-slate-400 block font-medium">Unanswered</span>
            <span className="text-lg font-bold text-slate-700 dark:text-slate-300">
              {result.unansweredCount}
            </span>
          </div>
        </div>
      </div>

      {/* Recommendations & Topic Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Topic Breakdown (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 card-shadow">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Sectional & Topic Performance
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Accuracy breakdown by aptitude syllabus domain
          </p>

          <div className="space-y-3">
            {topicBreakdown.map((t) => (
              <div key={t.topic} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {t.topic}
                  </span>
                  <span className="font-semibold text-teal-600 dark:text-teal-400">
                    {t.accuracy}% ({t.correct}/{t.total})
                  </span>
                </div>
                {/* Accuracy progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      t.accuracy >= 75 ? 'bg-emerald-500' : t.accuracy >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.max(5, t.accuracy)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Recommendations (1 col) */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 card-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Next Steps
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Rule-based recommendations for your next practice
            </p>

            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl text-xs leading-relaxed border ${
                    rec.status === 'strong'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <span className="font-bold block mb-0.5">{rec.topic}:</span>
                  {rec.message}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate('/practice')}
            className="w-full mt-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer text-center"
          >
            Launch Target Topic Drill →
          </button>
        </div>
      </div>

      {/* Detailed Question Review List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Question-by-Question Solutions & Explanations
          </h3>
          <span className="text-xs text-slate-400">
            {detailed.length} questions reviewed
          </span>
        </div>

        <div className="space-y-4">
          {detailed.map((item, idx) => {
            const isExpanded = expandedQuestions[item.questionId] !== false; // expanded by default
            return (
              <div
                key={item.questionId}
                className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 sm:p-6 border border-slate-100 dark:border-slate-800 card-shadow space-y-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-mono font-bold text-teal-600">
                      {item.questionId}
                    </span>
                    <Badge variant={item.isCorrect ? 'Passed' : item.selectedOption ? 'Changes Requested' : 'neutral'}>
                      {item.isCorrect ? 'Correct' : item.selectedOption ? 'Incorrect' : 'Unanswered'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenBookmark(item.questionId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs flex items-center gap-1"
                      title="Bookmark for Revision"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Bookmark</span>
                    </button>
                  </div>
                </div>

                {/* Question Statement */}
                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                  {item.questionText}
                </p>

                {/* Options Review */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {item.options.map((opt) => {
                    const isCorrect = opt.optionId === item.correctOption;
                    const isSelected = opt.optionId === item.selectedOption;

                    let optStyle = 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300';
                    if (isCorrect) {
                      optStyle = 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold';
                    } else if (isSelected && !isCorrect) {
                      optStyle = 'border-rose-400 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
                    }

                    return (
                      <div
                        key={opt.optionId}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${optStyle}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-800 border flex items-center justify-center font-bold text-[11px]">
                            {opt.optionId}
                          </span>
                          <span>{opt.text}</span>
                        </div>
                        {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        {isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Box */}
                {item.explanation && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      Step-by-Step Solution:
                    </span>
                    {item.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bookmark Modal (Form 7) */}
      {bookmarkModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <span className="text-xs font-bold text-teal-600 uppercase">
                Add to Revision Centre
              </span>
              <button
                onClick={() => setBookmarkModal({ open: false, questionId: '', note: '' })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBookmark} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Question ID
                </label>
                <input
                  type="text"
                  value={bookmarkModal.questionId}
                  readOnly
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Personal Revision Note (Optional)
                </label>
                <textarea
                  rows="3"
                  value={bookmarkModal.note}
                  onChange={(e) => setBookmarkModal({ ...bookmarkModal, note: e.target.value })}
                  placeholder="e.g. Remember to convert hours to 1-day fractions before solving..."
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBookmarkModal({ open: false, questionId: '', note: '' })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                >
                  Save Bookmark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
