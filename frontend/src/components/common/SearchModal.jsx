import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Brain, Building2, Timer, BookOpen } from 'lucide-react';
import { initialCategories, initialCompanies, initialMockTests } from '../../services/mockData';

export default function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose ? onClose() : null;
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase();

  // Search through topics
  const matchingTopics = [];
  initialCategories.forEach((cat) => {
    cat.topics.forEach((t) => {
      if (t.name.toLowerCase().includes(q) || cat.name.toLowerCase().includes(q)) {
        matchingTopics.push({ ...t, categoryName: cat.name });
      }
    });
  });

  // Search through companies
  const matchingCompanies = initialCompanies.filter(
    (c) => c.name.toLowerCase().includes(q) || c.tagline.toLowerCase().includes(q)
  );

  // Search through mock tests
  const matchingTests = initialMockTests.filter(
    (t) => t.title.toLowerCase().includes(q) || t.company.toLowerCase().includes(q)
  );

  const handleSelect = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics, companies, tests..."
            className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {/* Topics */}
          {matchingTopics.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Aptitude Topics
              </p>
              <div className="space-y-1">
                {matchingTopics.slice(0, 4).map((top) => (
                  <button
                    key={top._id}
                    onClick={() => handleSelect(`/practice?topic=${encodeURIComponent(top.name)}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left hover:bg-teal-50 dark:hover:bg-slate-700/60 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Brain className="w-4 h-4 text-teal-600" />
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-700">
                          {top.name}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-2">
                          ({top.categoryName})
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-teal-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Practice →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Companies */}
          {matchingCompanies.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Hiring Companies
              </p>
              <div className="space-y-1">
                {matchingCompanies.slice(0, 3).map((comp) => (
                  <button
                    key={comp._id}
                    onClick={() => handleSelect(`/companies/${comp.slug}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left hover:bg-teal-50 dark:hover:bg-slate-700/60 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-sky-600" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-700">
                        {comp.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {comp.questionCount} Questions
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mock Tests */}
          {matchingTests.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Mock Tests
              </p>
              <div className="space-y-1">
                {matchingTests.slice(0, 3).map((test) => (
                  <button
                    key={test._id}
                    onClick={() => handleSelect('/tests')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left hover:bg-teal-50 dark:hover:bg-slate-700/60 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Timer className="w-4 h-4 text-amber-600" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-700">
                        {test.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{test.durationMinutes} mins</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchingTopics.length === 0 && matchingCompanies.length === 0 && matchingTests.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
