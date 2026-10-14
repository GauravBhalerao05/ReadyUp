import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Send,
  HelpCircle,
  X
} from 'lucide-react';
import { testService } from '../services/testService';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';

export default function PracticeSessionPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const [session, setSession] = useState(location.state?.session || null);
  const [loading, setLoading] = useState(!session);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: { selectedOption, markedForReview, timeSpentSeconds } }
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Fallback initialize if accessed directly
  useEffect(() => {
    async function loadFallback() {
      if (!session) {
        try {
          const newSession = await testService.startPractice({ count: 10 });
          setSession(newSession);
        } catch (err) {
          addToast({ title: 'Error', message: 'Could not load practice session', type: 'error' });
          navigate('/practice');
        } finally {
          setLoading(false);
        }
      }
    }
    loadFallback();
  }, [attemptId, session, navigate, addToast]);

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading || !session || !session.questions || session.questions.length === 0) {
    return (
      <div className="py-20 text-center animate-pulse">
        <Clock className="w-10 h-10 text-teal-600 mx-auto mb-3 animate-spin" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Preparing your practice drill...
        </h3>
      </div>
    );
  }

  const questions = session.questions;
  const currentQ = questions[currentIndex];
  const currentAnswer = answers[currentQ.questionId] || { selectedOption: null, markedForReview: false };

  const handleSelectOption = (optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.questionId]: {
        ...prev[currentQ.questionId],
        selectedOption: optionId,
        timeSpentSeconds: (prev[currentQ.questionId]?.timeSpentSeconds || 0) + 5
      }
    }));
  };

  const handleClearOption = () => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.questionId]: {
        ...prev[currentQ.questionId],
        selectedOption: null
      }
    }));
  };

  const handleToggleMarkReview = () => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.questionId]: {
        ...prev[currentQ.questionId],
        markedForReview: !prev[currentQ.questionId]?.markedForReview
      }
    }));
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const formattedAnswers = questions.map((q) => {
        const item = answers[q.questionId];
        return {
          questionId: q.questionId,
          selectedOption: item?.selectedOption || null,
          timeSpentSeconds: item?.timeSpentSeconds || 10,
          markedForReview: Boolean(item?.markedForReview)
        };
      });

      const result = await testService.submitAttempt(session.attemptId, formattedAnswers);
      addToast({
        title: 'Practice Submitted!',
        message: `Score: ${result.score}/${result.totalQuestions} (${result.percentage}%)`,
        type: result.passed ? 'success' : 'warning'
      });
      setShowSubmitModal(false);
      navigate(`/tests/review/${session.attemptId}`, { state: { result } });
    } catch (err) {
      addToast({
        title: 'Submission Error',
        message: err.message || 'Please retry',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const attemptedCount = Object.values(answers).filter((a) => a.selectedOption).length;
  const markedCount = Object.values(answers).filter((a) => a.markedForReview).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Session Bar */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 card-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">
            INTERACTIVE PRACTICE SESSION
          </span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {session.title}
          </h2>
          <span className="text-xs text-slate-400">
            Question {currentIndex + 1} of {questions.length} • {attemptedCount} answered
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <span>Finish & Submit</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Question Area (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 card-shadow min-h-[380px] flex flex-col justify-between">
            <div>
              {/* Question Meta Tag */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-teal-600 dark:text-teal-400 font-bold">
                    {currentQ.questionId}
                  </span>
                  <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-xs text-slate-500 capitalize">{currentQ.topic}</span>
                </div>
                <Badge variant={currentQ.difficulty}>{currentQ.difficulty}</Badge>
              </div>

              {/* Statement */}
              <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed mb-6 whitespace-pre-line">
                {currentQ.questionText}
              </p>

              {/* Options */}
              <div className="space-y-3">
                {currentQ.options.map((opt) => {
                  const isSelected = currentAnswer.selectedOption === opt.optionId;
                  return (
                    <div
                      key={opt.optionId}
                      onClick={() => handleSelectOption(opt.optionId)}
                      className={`p-4 rounded-2xl border text-sm font-medium transition-all cursor-pointer flex items-center gap-3.5 ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-teal-600 text-white'
                            : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {opt.optionId}
                      </div>
                      <span className="flex-1">{opt.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Question Controls */}
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMarkReview}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    currentAnswer.markedForReview
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{currentAnswer.markedForReview ? 'Marked for Review' : 'Mark Review'}</span>
                </button>

                {currentAnswer.selectedOption && (
                  <button
                    type="button"
                    onClick={handleClearOption}
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer px-2 py-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={currentIndex === questions.length - 1}
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Question Palette Sidebar (1 col) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 card-shadow">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Question Navigator
            </h4>

            {/* Grid of Number Pills */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const ans = answers[q.questionId];
                const isCurrent = idx === currentIndex;
                const isAnswered = ans && ans.selectedOption;
                const isMarked = ans && ans.markedForReview;

                let pillColor = 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300';
                if (isMarked) {
                  pillColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold';
                } else if (isAnswered) {
                  pillColor = 'bg-teal-600 text-white font-bold';
                }

                return (
                  <button
                    key={q.questionId}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl text-xs font-semibold transition-all cursor-pointer relative flex items-center justify-center ${pillColor} ${
                      isCurrent ? 'ring-2 ring-teal-500 ring-offset-2 dark:ring-offset-slate-900 scale-105' : ''
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isMarked && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-1 ring-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60 space-y-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-teal-600 shrink-0" />
                <span>Answered ({attemptedCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-amber-200 dark:bg-amber-800 shrink-0" />
                <span>Marked for Review ({markedCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-slate-200 dark:bg-slate-700 shrink-0" />
                <span>Unattempted ({questions.length - attemptedCount})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95">
            <CheckCircle2 className="w-12 h-12 text-teal-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Ready to submit your practice?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              You have answered {attemptedCount} of {questions.length} questions. Once submitted, your score and comprehensive solutions will be displayed.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Keep Solving
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                {isSubmitting ? 'Evaluating...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
