const EF_PROGRESS_STORAGE_KEY = 'ef_student_progress_v1';
const EF_TEACHER_STORAGE_KEY = 'ef_teacher_workspace_v1';
const EF_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Computer Science',
  'Chemistry',
  'Biology',
  'History',
  'Geography',
  'English'
];
const EF_SUBJECT_ICONS = {
  Mathematics: '🔢',
  Physics: '⚛️',
  'Computer Science': '💻',
  Chemistry: '🧪',
  Biology: '🧬',
  History: '📜',
  Geography: '🌍',
  English: '📖'
};
const EF_LEVELS = [
  { number: 0, name: 'Starter', minXp: 0, nextXp: 250 },
  { number: 1, name: 'Learner', minXp: 250, nextXp: 700 },
  { number: 2, name: 'Explorer', minXp: 700, nextXp: 1400 },
  { number: 3, name: 'Scholar', minXp: 1400, nextXp: 2300 },
  { number: 4, name: 'Expert', minXp: 2300, nextXp: 3500 },
  { number: 5, name: 'Master', minXp: 3500, nextXp: null }
];

function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem('ef_user')) || { name: 'Demo User', role: 'STUDENT' };
  } catch (e) {
    return { name: 'Demo User', role: 'STUDENT' };
  }
}

function getToken() {
  return sessionStorage.getItem('token') || '';
}

function logout() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('ef_user');
  window.location.href = 'index.html';
}

function createDefaultSubjectStats() {
  return EF_SUBJECTS.reduce((acc, subject) => {
    acc[subject] = {
      attempts: 0,
      avgScore: 0,
      bestScore: 0,
      lastLevel: 'Not Started',
      lastAttemptAt: ''
    };
    return acc;
  }, {});
}

function createDefaultStudentProgress() {
  return {
    examsTaken: 0,
    avgScore: 0,
    bestScore: 0,
    streak: 0,
    totalXp: 0,
    levelNumber: 0,
    levelName: 'Starter',
    uniqueSubjectsCount: 0,
    highestLevelReached: 'Not Started',
    lastExamDate: '',
    lastExamAt: '',
    badges: [],
    subjects: createDefaultSubjectStats(),
    history: []
  };
}

function getStudentProgressKey() {
  const user = getUser();
  return String(user.userId || user.email || user.name || 'guest').toLowerCase();
}

function readProgressStore() {
  try {
    return JSON.parse(localStorage.getItem(EF_PROGRESS_STORAGE_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function writeProgressStore(store) {
  localStorage.setItem(EF_PROGRESS_STORAGE_KEY, JSON.stringify(store));
}

function getStudentProgress() {
  const user = getUser();
  if (user.role === 'TEACHER') return null;

  const store = readProgressStore();
  const key = getStudentProgressKey();

  if (!store[key]) {
    store[key] = createDefaultStudentProgress();
    writeProgressStore(store);
  }

  const progress = store[key];
  progress.subjects = { ...createDefaultSubjectStats(), ...(progress.subjects || {}) };
  progress.history = Array.isArray(progress.history) ? progress.history : [];
  progress.badges = Array.isArray(progress.badges) ? progress.badges : [];
  return progress;
}

function saveStudentProgress(progress) {
  const store = readProgressStore();
  store[getStudentProgressKey()] = progress;
  writeProgressStore(store);
  return progress;
}

function getLevelMeta(totalXp) {
  let current = EF_LEVELS[0];
  for (const level of EF_LEVELS) {
    if (totalXp >= level.minXp) current = level;
  }
  const nextLevel = EF_LEVELS.find((level) => level.number === current.number + 1) || null;
  const progressWithinLevel = nextLevel
    ? Math.round(((totalXp - current.minXp) / (nextLevel.minXp - current.minXp)) * 100)
    : 100;

  return {
    number: current.number,
    name: current.name,
    currentMinXp: current.minXp,
    nextXp: nextLevel ? nextLevel.minXp : null,
    progressPercent: Math.max(0, Math.min(100, progressWithinLevel))
  };
}

function getBadgeCatalog(progress) {
  const badges = [
    {
      id: 'first-exam',
      icon: '🎯',
      name: 'First Exam',
      unlocked: progress.examsTaken >= 1
    },
    {
      id: 'streak-5',
      icon: '🔥',
      name: '5-Day Streak',
      unlocked: progress.streak >= 5
    },
    {
      id: 'speed-demon',
      icon: '⚡',
      name: 'Speed Demon',
      unlocked: progress.history.some((item) => item.timeLeft >= 900 && item.percentage >= 70)
    },
    {
      id: 'scholar',
      icon: '🎓',
      name: 'Scholar',
      unlocked: progress.levelNumber >= 3
    },
    {
      id: 'perfect-score',
      icon: '💎',
      name: 'Perfect Score',
      unlocked: progress.history.some((item) => item.percentage === 100)
    },
    {
      id: 'hard-level',
      icon: '🧠',
      name: 'Hard Level',
      unlocked: progress.history.some((item) => item.levelReached === 'Hard')
    },
    {
      id: 'top-3',
      icon: '🏆',
      name: 'Top 3 Rank',
      unlocked: false
    },
    {
      id: 'ten-exams',
      icon: '📚',
      name: '10 Exams',
      unlocked: progress.examsTaken >= 10
    },
    {
      id: 'all-topics',
      icon: '🌟',
      name: 'All Topics',
      unlocked: progress.uniqueSubjectsCount >= EF_SUBJECTS.length
    },
    {
      id: 'champion',
      icon: '👑',
      name: 'Champion',
      unlocked: progress.examsTaken >= 5 && progress.avgScore >= 85
    }
  ];

  return badges.map((badge) => ({
    ...badge,
    statusText: badge.unlocked ? 'Earned' : 'Locked'
  }));
}

function updateEarnedBadges(progress) {
  progress.badges = getBadgeCatalog(progress)
    .filter((badge) => badge.unlocked)
    .map((badge) => badge.id);
}

function getLevelRank(levelReached) {
  return { 'Not Started': 0, Easy: 1, Medium: 2, Hard: 3 }[levelReached] || 0;
}

function getLevelLabelFromRank(rank) {
  return ['Not Started', 'Easy', 'Medium', 'Hard'][rank] || 'Not Started';
}

function getDateOnly(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function calculateStreak(previousDate, nextDate, existingStreak) {
  if (!previousDate) return 1;

  const prev = new Date(previousDate + 'T00:00:00');
  const current = new Date(nextDate + 'T00:00:00');
  const diffDays = Math.round((current - prev) / 86400000);

  if (diffDays <= 0) return existingStreak;
  if (diffDays === 1) return existingStreak + 1;
  return 1;
}

function calculateXpEarned(result) {
  const base = result.totalMarks * 12;
  const accuracyBonus = result.percentage;
  const levelBonus = result.levelReached === 'Hard' ? 60 : result.levelReached === 'Medium' ? 30 : 10;
  const perfectBonus = result.percentage === 100 ? 40 : 0;
  return base + accuracyBonus + levelBonus + perfectBonus;
}

function updateStudentProgressFromResult(result) {
  const progress = getStudentProgress();
  if (!progress) return null;

  const completedAt = result.completedAt || new Date().toISOString();
  const examDate = getDateOnly(completedAt);
  const xpEarned = calculateXpEarned(result);
  const nextHistory = [
    {
      id: String(Date.now()),
      subject: result.subject,
      totalMarks: result.totalMarks,
      maxMarks: result.maxMarks,
      percentage: result.percentage,
      correctCount: result.correctCount,
      wrongCount: result.wrongCount,
      levelReached: result.levelReached,
      easyCorrect: result.easyCorrect,
      mediumCorrect: result.mediumCorrect,
      hardCorrect: result.hardCorrect,
      easyMarks: result.easyMarks,
      mediumMarks: result.mediumMarks,
      hardMarks: result.hardMarks,
      timeLeft: result.timeLeft || 0,
      timeTakenSeconds: result.timeTakenSeconds || 0,
      completedAt,
      xpEarned
    },
    ...progress.history
  ];

  progress.history = nextHistory;
  progress.examsTaken = nextHistory.length;
  progress.totalXp += xpEarned;
  progress.avgScore = Math.round(nextHistory.reduce((sum, item) => sum + item.percentage, 0) / progress.examsTaken);
  progress.bestScore = Math.max(progress.bestScore || 0, result.percentage);
  progress.lastExamAt = completedAt;
  progress.streak = calculateStreak(progress.lastExamDate, examDate, progress.streak || 0);
  progress.lastExamDate = examDate;

  const subjectStats = progress.subjects[result.subject] || {
    attempts: 0,
    avgScore: 0,
    bestScore: 0,
    lastLevel: 'Not Started',
    lastAttemptAt: ''
  };
  const nextAttempts = subjectStats.attempts + 1;
  subjectStats.avgScore = Math.round(((subjectStats.avgScore * subjectStats.attempts) + result.percentage) / nextAttempts);
  subjectStats.bestScore = Math.max(subjectStats.bestScore || 0, result.percentage);
  subjectStats.attempts = nextAttempts;
  subjectStats.lastLevel = result.levelReached;
  subjectStats.lastAttemptAt = completedAt;
  progress.subjects[result.subject] = subjectStats;

  progress.uniqueSubjectsCount = Object.values(progress.subjects).filter((item) => item.attempts > 0).length;
  progress.highestLevelReached = getLevelLabelFromRank(Math.max(
    getLevelRank(progress.highestLevelReached),
    getLevelRank(result.levelReached)
  ));

  const levelMeta = getLevelMeta(progress.totalXp);
  progress.levelNumber = levelMeta.number;
  progress.levelName = levelMeta.name;
  updateEarnedBadges(progress);

  saveStudentProgress(progress);
  return progress;
}

function formatDisplayDate(value) {
  if (!value) return 'No attempts yet';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getSubjectPerformance(progress) {
  return EF_SUBJECTS.map((subject) => ({
    subject,
    icon: EF_SUBJECT_ICONS[subject] || '📘',
    ...(progress.subjects[subject] || {})
  }));
}

function createDefaultTeacherWorkspace() {
  return {
    questionBank: [],
    exams: [],
    students: [],
    recentActivity: []
  };
}

function getTeacherWorkspaceKey() {
  const user = getUser();
  return String(user.userId || user.email || user.name || 'teacher').toLowerCase();
}

function readTeacherStore() {
  try {
    return JSON.parse(localStorage.getItem(EF_TEACHER_STORAGE_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function writeTeacherStore(store) {
  localStorage.setItem(EF_TEACHER_STORAGE_KEY, JSON.stringify(store));
}

function getTeacherWorkspace() {
  const user = getUser();
  if (user.role !== 'TEACHER') return null;

  const store = readTeacherStore();
  const key = getTeacherWorkspaceKey();

  if (!store[key]) {
    store[key] = createDefaultTeacherWorkspace();
    writeTeacherStore(store);
  }

  const workspace = store[key];
  workspace.questionBank = Array.isArray(workspace.questionBank) ? workspace.questionBank : [];
  workspace.exams = Array.isArray(workspace.exams) ? workspace.exams : [];
  workspace.students = Array.isArray(workspace.students) ? workspace.students : [];
  workspace.recentActivity = Array.isArray(workspace.recentActivity) ? workspace.recentActivity : [];
  return workspace;
}

function saveTeacherWorkspace(workspace) {
  const store = readTeacherStore();
  store[getTeacherWorkspaceKey()] = workspace;
  writeTeacherStore(store);
  return workspace;
}

function addTeacherQuestion(question) {
  const workspace = getTeacherWorkspace();
  if (!workspace) return null;

  workspace.questionBank.unshift({
    id: String(Date.now() + Math.random()),
    createdAt: new Date().toISOString(),
    ...question
  });

  saveTeacherWorkspace(workspace);
  return workspace;
}

function removeTeacherQuestion(questionId) {
  const workspace = getTeacherWorkspace();
  if (!workspace) return null;

  workspace.questionBank = workspace.questionBank.filter((item) => item.id !== questionId);
  saveTeacherWorkspace(workspace);
  return workspace;
}

function getTeacherSubjectSummary(workspace) {
  return EF_SUBJECTS.map((subject) => {
    const questions = workspace.questionBank.filter((item) => item.subj === subject);
    const difficultyCounts = questions.reduce((acc, item) => {
      acc[item.diff] = (acc[item.diff] || 0) + 1;
      return acc;
    }, { easy: 0, medium: 0, hard: 0 });

    return {
      subject,
      questionCount: questions.length,
      difficultyCounts,
      studentCount: 0,
      status: questions.length ? 'Ready' : 'Needs Questions'
    };
  });
}

function getTeacherOverview(workspace) {
  const totalStudents = workspace.students.length;
  const totalQuestions = workspace.questionBank.length;
  const completionRate = 0;
  const classAvgScore = 0;

  const weakestTopics = getTeacherSubjectSummary(workspace)
    .filter((item) => item.questionCount > 0)
    .sort((a, b) => a.questionCount - b.questionCount)
    .slice(0, 5)
    .map((item) => ({
      name: item.subject,
      pct: Math.min(100, 35 + item.questionCount * 5)
    }));

  return {
    totalStudents,
    totalQuestions,
    completionRate,
    classAvgScore,
    weakestTopics,
    recentActivity: workspace.recentActivity.slice(0, 5)
  };
}

function getTeacherAnalytics(workspace) {
  const overview = getTeacherOverview(workspace);
  const distribution = [
    { label: '<40', value: 0, color: '#ef4444' },
    { label: '40-50', value: 0, color: '#f97316' },
    { label: '50-60', value: 0, color: '#f59e0b' },
    { label: '60-70', value: 0, color: '#10b981' },
    { label: '70-80', value: 0, color: '#10b981' },
    { label: '80-90', value: 0, color: '#6366f1' },
    { label: '90+', value: 0, color: '#8b5cf6' }
  ];

  return {
    ...overview,
    distribution
  };
}

function getDashboardRecommendations(progress) {
  if (!progress.examsTaken) {
    return [
      {
        icon: '🚀',
        title: 'Start your first exam',
        desc: 'All your values are at zero right now. Take one adaptive test and we will build your analysis from the real result.'
      },
      {
        icon: '📊',
        title: 'Dashboard updates automatically',
        desc: 'After each exam, your XP, average score, badges, subject strength, and result history will refresh from your actual performance.'
      },
      {
        icon: '🎯',
        title: 'Focus grows with attempts',
        desc: 'The more subjects you attempt, the more accurate your weak-topic and recommendation cards become.'
      }
    ];
  }

  const attemptedSubjects = getSubjectPerformance(progress)
    .filter((item) => item.attempts > 0)
    .sort((a, b) => a.avgScore - b.avgScore);
  const strongest = [...attemptedSubjects].sort((a, b) => b.avgScore - a.avgScore)[0];
  const weakest = attemptedSubjects[0];

  return [
    weakest
      ? {
          icon: '🎯',
          title: `${weakest.subject} needs attention`,
          desc: `Your current average is ${weakest.avgScore}%. Make this your next revision priority.`
        }
      : null,
    strongest
      ? {
          icon: '💡',
          title: `${strongest.subject} is your strongest subject`,
          desc: `You are averaging ${strongest.avgScore}%. Keep pushing there while improving weaker areas.`
        }
      : null,
    {
      icon: '🔥',
      title: `${progress.streak}-day streak`,
      desc: progress.streak
        ? 'Take one exam today to keep your momentum alive and continue building badges.'
        : 'Complete an exam today to start your streak.'
    }
  ].filter(Boolean);
}

function initNav(activePage) {
  const user = getUser();
  const isTeacher = user.role === 'TEACHER';
  const nav = document.getElementById('dash-nav');
  if (!nav) return;

  const studentLinks = `
    <a href="student-dashboard.html" class="nl ${activePage === 'overview' ? 'active' : ''}">Overview</a>
    <a href="student-subjects.html" class="nl ${activePage === 'subjects' ? 'active' : ''}">My Subjects</a>
    <a href="exam-select.html" class="nl ${activePage === 'exam' ? 'active' : ''}">Take Exam</a>
    <a href="my-results.html" class="nl ${activePage === 'results' ? 'active' : ''}">My Results</a>
    <a href="leaderboard.html" class="nl ${activePage === 'leaderboard' ? 'active' : ''}">Leaderboard</a>
    <a href="badges.html" class="nl ${activePage === 'badges' ? 'active' : ''}">Achievements</a>`;

  const teacherLinks = `
    <a href="teacherdashboard.html" class="nl ${activePage === 'overview' ? 'active' : ''}">Overview</a>
    <a href="teacher-subjects.html" class="nl ${activePage === 'subjects' ? 'active' : ''}">Subjects</a>
    <a href="upload-questions.html" class="nl ${activePage === 'upload' ? 'active' : ''}">Upload Questions</a>
    <a href="manage-exams.html" class="nl ${activePage === 'manage' ? 'active' : ''}">Manage Exams</a>
    <a href="analytics.html" class="nl ${activePage === 'analytics' ? 'active' : ''}">Analytics</a>`;

  nav.innerHTML = `
    <div class="dash-nav-inner">
      <a class="brand" href="index.html">
        <div class="brand-icon">E</div>
        <div class="brand-name">ExamForge</div>
      </a>
      <div class="nav-links-dash">
        ${isTeacher ? teacherLinks : studentLinks}
      </div>
      <div class="nav-user">
        <div class="user-info">
          <div class="user-name">${user.name}</div>
          <div class="user-role">${isTeacher ? 'Teacher' : 'Student'}</div>
        </div>
        <div class="avatar">${user.name[0].toUpperCase()}</div>
        <button class="btn-logout" onclick="logout()">Sign Out</button>
      </div>
    </div>`;

  const style = document.createElement('style');
  style.textContent = `
    #dash-nav { position:sticky; top:0; z-index:100; background:rgba(255,255,255,0.95); backdrop-filter:blur(16px); border-bottom:1px solid rgba(99,102,241,0.12); font-family:'Outfit',sans-serif; }
    .dash-nav-inner { display:flex; align-items:center; gap:0; padding:0 32px; height:62px; }
    .brand { display:flex; align-items:center; gap:9px; text-decoration:none; margin-right:28px; flex-shrink:0; }
    .brand-icon { width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg,#6366f1,#ec4899); display:flex; align-items:center; justify-content:center; font-size:17px; color:#fff; font-weight:800; }
    .brand-name { font-size:17px; font-weight:800; background:linear-gradient(135deg,#6366f1,#ec4899); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .nav-links-dash { display:flex; gap:4px; flex:1; overflow-x:auto; }
    .nl { padding:8px 14px; border-radius:8px; font-size:13px; font-weight:500; color:#6b7280; text-decoration:none; white-space:nowrap; transition:all .2s; }
    .nl:hover { background:#f3f4f6; color:#0d0d1a; }
    .nl.active { background:rgba(99,102,241,0.10); color:#6366f1; font-weight:600; }
    .nav-user { display:flex; align-items:center; gap:10px; margin-left:auto; flex-shrink:0; }
    .user-info { text-align:right; }
    .user-name { font-size:13px; font-weight:600; color:#0d0d1a; }
    .user-role { font-size:11px; color:#6b7280; }
    .avatar { width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#ec4899); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; color:#fff; }
    .btn-logout { padding:6px 14px; border-radius:8px; border:1px solid #e5e7eb; background:transparent; color:#6b7280; font-size:12px; cursor:pointer; font-family:'Outfit',sans-serif; transition:all .2s; }
    .btn-logout:hover { border-color:#ef4444; color:#ef4444; }
  `;
  document.head.appendChild(style);
}
