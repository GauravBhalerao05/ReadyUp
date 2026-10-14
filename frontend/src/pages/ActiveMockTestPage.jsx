import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Clock,
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  X
} from 'lucide-react';
import { testService } from '../services/testService';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';

export default function ActiveMockTestPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const [session, setSession] = useState(location.state?.session || null);
  const [loading, setLoading] = useState(!session);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(30 * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const isSubmittedRef = useRef(false);

  // Initialize test session
  useEffect(() => {
    async function initSession() {
      if (!session) {
        try {
          // If no state passed, load standard mock
          const newSession = await testService.startMockTest('mock_tcs_01');
          setSession(newSession);
          const duration = (newSession.durationMinutes || 45) * 60;
          setRemainingSeconds(duration);
        } catch (err) {
          addToast({ title: 'Error', message: 'Failed to initialize mock test', type: 'error' });
          navigate('/tests');
        } finally {
          setLoading(false);
        }
      } else {
        const duration = (session.durationMinutes || 45) * 60;
        setRemainingSeconds(duration);
      }
    }
    initSession();
  }, [session, navigate, addToast]);

  // Countdown timer
  useEffect(() => {
    if (loading || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!isSubmittedRef.current) {
            handleAutoSubmitOnExpire();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, remainingSeconds]);

  const handleAutoSubmitOnExpire = () => {
    addToast({
      title: 'Time Expired!',
      message: 'Submitting your responses automatically...',
      type: 'warning'
    });
    performSubmit();
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const questions = session?.questions || [];
  const currentQ = questions[currentIndex];
  const currentAnswer = currentQ ? (answers[currentQ.questionId] || { selectedOption: null, markedForReview: false }) : {};

  const handleSelectOption = (optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.questionId]: {
        ...prev[currentQ.questionId],
        selectedOption: optionId,
        timeSpentSeconds: (prev[currentQ.questionId]?.timeSpentSeconds || 0) + 10
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

  const performSubmit = async () => {
    if (isSubmittedRef.current) return;
    isSubmittedRef.current = true;
    setIsSubmitting(true);

    try {
      const formattedAnswers = questions.map((q) => {
        const item = answers[q.questionId];
        return {
          questionId: q.questionId,
          selectedOption: item?.selectedOption || null,
          timeSpentSeconds: item?.timeSpentSeconds || 15,
          markedForReview: Boolean(item?.markedForReview)
        };
      });

      const result = await testService.submitAttempt(session.attemptId || attemptId, formattedAnswers);
      addToast({
        title: 'Mock Test Scored',
        message: `Your score: ${result.score}/${result.totalQuestions} (${result.percentage}%)`,
        type: result.passed ? 'success' : 'warning'
      });
      navigate(`/tests/review/${session.attemptId || attemptId}`, { state: { result } });
    } catch (err) {
      isSubmittedRef.current = false;
      addToast({
        title: 'Submission Failed',
        message: err.message || 'Please retry',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  if (loading || !currentQ) {
    return (
      <div className="py-24 text-center animate-pulse">
        <Clock className="w-12 h-12 text-teal-600 mx-auto mb-3 animate-spin" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Loading exam environment...
        </h3>
      </div>
    );
  }

  const answeredCount = Object.values(answers).filter((a) => a.selectedOption).length;
  const markedCount = Object.values(answers).filter((a) => a.markedForReview).length;
  const isTimerCritical = remainingSeconds < 300; // less than 5 mins

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Test Top Bar */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 card-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">
              OFFICIAL MOCK ASSESSMENT
            </span>
            <Badge variant="teal">{session.company || 'ReadyUp'}</Badge>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {session.title}
          </h2>
          <span className="text-xs text-slate-400">
            Question {currentIndex + 1} of {questions.length} • Passing Cutoff: {session.passingMarks || 6} marks
          </span>
        </div>

        {/* Live Timer Pill */}
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-xs font-bold transition-colors ${
              isTimerCritical
                ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 animate-pulse border border-rose-300'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200'
            }`}
          >
            <Clock className={`w-4 h-4 ${isTimerCritical ? 'text-rose-600' : 'text-teal-600'}`} />
            <span>{formatTimer(remainingSeconds)}</span>
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <span>Submit Test</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Examination View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Question Box (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 card-shadow min-h-[400px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-teal-600">
                    {currentQ.questionId}
                  </span>
                  <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-xs text-slate-500 font-medium">{currentQ.topic}</span>
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

            {/* Nav controls */}
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

        {/* Right Palette */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 card-shadow">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Question Palette
            </h4>

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

            {/* Status counts */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60 space-y-2 text-[11px] text-slate-500">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  Answered:
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{answeredCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Marked for Review:
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{markedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                  Unattempted:
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {questions.length - answeredCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95">
            <ShieldAlert className="w-12 h-12 text-teal-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Confirm Final Submission
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              You have answered {answeredCount} out of {questions.length} questions. You cannot change your answers after submission.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Return to Test
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={performSubmit}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                {isSubmitting ? 'Evaluating...' : 'Yes, Submit Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
