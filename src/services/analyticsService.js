const TestAttempt = require('../models/TestAttempt');
const Bookmark = require('../models/Bookmark');
const Question = require('../models/Question');

const getStudentDashboard = async (user) => {
  const attempts = await TestAttempt.find({ user: user._id, status: 'completed' })
    .sort({ submittedAt: -1 })
    .limit(30);

  const totalAttempts = attempts.length;
  let totalQuestionsAnswered = 0;
  let totalCorrect = 0;
  let totalTimeSeconds = 0;
  let passedCount = 0;

  const topicAggregate = {};
  const categoryAggregate = {
    'Quantitative Aptitude': { total: 0, correct: 0 },
    'Logical Reasoning': { total: 0, correct: 0 },
    'Verbal Ability': { total: 0, correct: 0 }
  };

  attempts.forEach((att) => {
    totalQuestionsAnswered += att.attemptedCount || 0;
    totalCorrect += att.correctCount || 0;
    totalTimeSeconds += att.durationSeconds || 0;
    if (att.passed) passedCount += 1;

    (att.topicBreakdown || []).forEach((tb) => {
      if (!topicAggregate[tb.topic]) {
        topicAggregate[tb.topic] = {
          topic: tb.topic,
          category: tb.category,
          total: 0,
          correct: 0
        };
      }
      topicAggregate[tb.topic].total += tb.total;
      topicAggregate[tb.topic].correct += tb.correct;

      if (tb.category && categoryAggregate[tb.category]) {
        categoryAggregate[tb.category].total += tb.total;
        categoryAggregate[tb.category].correct += tb.correct;
      }
    });
  });

  const overallAccuracy =
    totalQuestionsAnswered > 0 ? Number(((totalCorrect / totalQuestionsAnswered) * 100).toFixed(1)) : 0;
  const passRate = totalAttempts > 0 ? Number(((passedCount / totalAttempts) * 100).toFixed(1)) : 0;
  const totalHours = Number((totalTimeSeconds / 3600).toFixed(1));

  // Compute topic masteries
  const topicList = Object.values(topicAggregate).map((t) => {
    const accuracy = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
    return {
      topic: t.topic,
      category: t.category,
      totalQuestions: t.total,
      accuracy
    };
  });

  // Sort by lowest accuracy first for targeted recommendations
  topicList.sort((a, b) => a.accuracy - b.accuracy);

  const weakTopics = topicList.filter((t) => t.accuracy < 60 && t.totalQuestions >= 3);
  const strongTopics = topicList.filter((t) => t.accuracy >= 75 && t.totalQuestions >= 3);

  // Formulate "Next Best Action" (matching the prominent card in the design system screenshot)
  let nextBestAction = null;
  if (weakTopics.length > 0) {
    const target = weakTopics[0];
    nextBestAction = {
      label: 'RECOMMENDED PRACTICE',
      title: `Practice ${target.topic}`,
      description: `Your accuracy in ${target.topic} is ${target.accuracy}%. Solve a curated 10-question practice set to build speed and accuracy.`,
      ctaText: 'Start Practice →',
      actionType: 'PRACTICE',
      targetTopic: target.topic,
      targetCategory: target.category
    };
  } else if (totalAttempts === 0) {
    nextBestAction = {
      label: 'GET STARTED',
      title: 'Take your first Diagnostic Mock Test',
      description: 'Establish your baseline aptitude readiness with a 30-minute comprehensive mock test.',
      ctaText: 'Start Test →',
      actionType: 'MOCK_TEST',
      targetTestSlug: 'general-aptitude-diagnostic'
    };
  } else {
    nextBestAction = {
      label: 'KEEP UP MOMENTUM',
      title: 'Take a Company-Specific Mock Test',
      description: 'You have solid foundation across core topics. Test your pacing against top hiring patterns.',
      ctaText: 'View Mock Tests →',
      actionType: 'MOCK_TEST_LIST'
    };
  }

  // Count bookmarks
  const bookmarkCount = await Bookmark.countDocuments({ user: user._id });

  // Weekly Goal Circular Progress Indicator (matching screenshot's circular 50% widget)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const testsThisWeek = attempts.filter((a) => new Date(a.submittedAt) >= oneWeekAgo).length;
  const weeklyTarget = 4;
  const weeklyProgressPercentage = Math.min(100, Math.round((testsThisWeek / weeklyTarget) * 100));

  return {
    student: {
      name: user.name,
      email: user.email,
      department: user.department,
      graduationYear: user.graduationYear
    },
    metrics: [
      {
        id: 'tests_attempted',
        label: 'Tests Completed',
        value: totalAttempts,
        subtext: `${testsThisWeek} this week`,
        icon: 'FileCheck'
      },
      {
        id: 'avg_accuracy',
        label: 'Average Accuracy',
        value: `${overallAccuracy}%`,
        subtext: 'Across all topics',
        icon: 'Target'
      },
      {
        id: 'practice_time',
        label: 'Study Time',
        value: `${totalHours} hrs`,
        subtext: 'Active practice time',
        icon: 'Clock'
      },
      {
        id: 'pass_rate',
        label: 'Pass Rate',
        value: `${passRate}%`,
        subtext: `${passedCount} of ${totalAttempts} passed`,
        icon: 'Award'
      }
    ],
    nextBestAction,
    weeklyProgress: {
      percentage: weeklyProgressPercentage,
      current: testsThisWeek,
      target: weeklyTarget,
      label: 'Weekly Mock Test Goal'
    },
    categoryBreakdown: Object.entries(categoryAggregate).map(([name, data]) => ({
      category: name,
      accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      totalAttempted: data.total
    })),
    weakTopics: weakTopics.slice(0, 5),
    strongTopics: strongTopics.slice(0, 5),
    recentAttempts: attempts.slice(0, 5).map((att) => ({
      id: att._id,
      title: att.title,
      type: att.type,
      submittedAt: att.submittedAt,
      score: att.score,
      totalMarks: att.totalMarks,
      percentage: att.percentage,
      passed: att.passed,
      statusBadge: att.passed ? 'Passed' : 'Needs Review'
    })),
    bookmarkCount
  };
};

module.exports = {
  getStudentDashboard
};
