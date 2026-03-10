import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { XPBar } from '@/components/gamification/XPBar';
import { AchievementCard } from '@/components/gamification/AchievementCard';
import { StreakCounter } from '@/components/dashboard/StreakCounter';
import { Modal } from '@/components/ui/Modal';
import { useProgress, useAchievements } from '@/hooks/useProgress';
import { useStreak } from '@/hooks/useStreak';
import { useAppStore } from '@/stores/appStore';
import { getLevelProgress, getLevelColor, ACHIEVEMENTS } from '@/services/gamification';
import { testConnection } from '@/services/aiService';
import { testOpenAIConnection } from '@/services/openaiService';
import { db, getSetting, setSetting } from '@/db/database';

export function ProfilePage() {
  const { totalXP, todayActivity, refresh } = useProgress();
  const { streak, todayActive } = useStreak();
  const { unlocked } = useAchievements();
  const { isDark, toggleTheme, dailyGoal, setDailyGoal } = useAppStore();
  const [showReset, setShowReset] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [openaiKey, setOpenaiKey] = useState('');
  const [openaiKeyStatus, setOpenaiKeyStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');

  const levelInfo = getLevelProgress(totalXP);

  useEffect(() => {
    getSetting('claude_api_key', '').then(setApiKey);
    getSetting('openai_api_key', '').then(setOpenaiKey);
  }, []);

  const handleSaveApiKey = async () => {
    await setSetting('claude_api_key', apiKey);
  };

  const handleTestConnection = async () => {
    setApiKeyStatus('testing');
    const ok = await testConnection(apiKey);
    setApiKeyStatus(ok ? 'ok' : 'error');
  };

  const handleSaveOpenaiKey = async () => {
    await setSetting('openai_api_key', openaiKey);
  };

  const handleTestOpenaiConnection = async () => {
    setOpenaiKeyStatus('testing');
    const ok = await testOpenAIConnection(openaiKey);
    setOpenaiKeyStatus(ok ? 'ok' : 'error');
  };

  const handleReset = async () => {
    await db.flashcardReviews.clear();
    await db.quizAttempts.clear();
    await db.codingAttempts.clear();
    await db.explanationAttempts.clear();
    await db.dailyActivity.clear();
    await db.achievements.clear();
    setShowReset(false);
    refresh();
  };

  return (
    <div>
      <Header title="Profil" right={
        <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      } />

      <div className="px-4 py-4 space-y-5">
        {/* Level display */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-5">
            <ProgressRing value={levelInfo.progress} size={90} strokeWidth={6} color={getLevelColor(levelInfo.level)}>
              <div className="text-center">
                <div className="text-xs font-bold" style={{ color: getLevelColor(levelInfo.level) }}>
                  {levelInfo.level}
                </div>
              </div>
            </ProgressRing>
            <div className="flex-1">
              <div className="text-2xl font-bold text-white">{totalXP} XP</div>
              <XPBar totalXP={totalXP} />
              <div className="mt-2">
                <StreakCounter streak={streak} todayActive={todayActive} />
              </div>
            </div>
          </div>
        </Card>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2">
          <Link to="/statystyki">
            <Card variant="default" className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 active:scale-[0.97] transition-transform">
              <div className="text-2xl mb-1">📊</div>
              <div className="text-sm font-semibold text-white">Statystyki</div>
              <div className="text-xs text-slate-400">Szczegółowe dane</div>
            </Card>
          </Link>
          <Link to="/powtorka">
            <Card variant="default" className="bg-gradient-to-br from-red-600/20 to-red-800/20 active:scale-[0.97] transition-transform">
              <div className="text-2xl mb-1">🔄</div>
              <div className="text-sm font-semibold text-white">Powtórka błędów</div>
              <div className="text-xs text-slate-400">Popraw odpowiedzi</div>
            </Card>
          </Link>
        </div>

        {/* Today stats */}
        {todayActivity && (
          <Card variant="default">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Dzisiejsze statystyki</h3>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Fiszki" value={todayActivity.flashcardsReviewed} />
              <Stat label="Quiz" value={todayActivity.quizAnswered} />
              <Stat label="Kodowanie" value={todayActivity.codingCompleted} />
            </div>
          </Card>
        )}

        {/* Achievements */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">
            Osiągnięcia ({unlocked.size}/{ACHIEVEMENTS.length})
          </h3>
          <div className="space-y-2">
            {ACHIEVEMENTS.map(a => (
              <AchievementCard key={a.id} achievement={a} unlocked={unlocked.has(a.id)} />
            ))}
          </div>
        </div>
      </div>

      {/* Settings modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Ustawienia">
        <div className="space-y-4">
          {/* Theme toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Tryb ciemny</span>
            <button
              onClick={toggleTheme}
              className={`w-12 h-6 rounded-full transition-colors relative ${isDark ? 'bg-blue-600' : 'bg-slate-600'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${isDark ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Daily goals */}
          <div>
            <p className="text-sm text-slate-300 mb-2">Cel dzienny</p>
            {([
              { key: 'flashcards', label: 'Fiszki' },
              { key: 'quizzes', label: 'Quiz' },
              { key: 'coding', label: 'Kodowanie' },
            ] as const).map(item => (
              <div key={item.key} className="flex items-center justify-between py-1">
                <span className="text-xs text-slate-400">{item.label}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDailyGoal({ [item.key]: Math.max(1, dailyGoal[item.key] - 1) })}
                    className="w-6 h-6 rounded bg-slate-700 text-white text-sm"
                  >-</button>
                  <span className="text-sm text-white w-6 text-center">{dailyGoal[item.key]}</span>
                  <button
                    onClick={() => setDailyGoal({ [item.key]: dailyGoal[item.key] + 1 })}
                    className="w-6 h-6 rounded bg-slate-700 text-white text-sm"
                  >+</button>
                </div>
              </div>
            ))}
          </div>

          {/* Claude API Key */}
          <div>
            <p className="text-sm text-slate-300 mb-2">Klucz API Claude</p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setApiKeyStatus('idle'); }}
              placeholder="sk-ant-..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Klucz przechowywany lokalnie w przeglądarce. Opcjonalny — do weryfikacji AI wyjaśnień i kodu.
            </p>
            <div className="flex gap-2 mt-2">
              <Button variant="secondary" size="sm" onClick={handleSaveApiKey}>
                Zapisz
              </Button>
              <Button variant="ghost" size="sm" onClick={handleTestConnection} disabled={!apiKey || apiKeyStatus === 'testing'}>
                {apiKeyStatus === 'testing' ? 'Testuję...' :
                 apiKeyStatus === 'ok' ? 'Połączono!' :
                 apiKeyStatus === 'error' ? 'Błąd!' : 'Testuj połączenie'}
              </Button>
            </div>
          </div>

          {/* OpenAI API Key */}
          <div>
            <p className="text-sm text-slate-300 mb-2">Klucz API OpenAI</p>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => { setOpenaiKey(e.target.value); setOpenaiKeyStatus('idle'); }}
              placeholder="sk-..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Do wyjaśniania pojęć w fiszkach i quizach (GPT-5 mini).
            </p>
            <div className="flex gap-2 mt-2">
              <Button variant="secondary" size="sm" onClick={handleSaveOpenaiKey}>
                Zapisz
              </Button>
              <Button variant="ghost" size="sm" onClick={handleTestOpenaiConnection} disabled={!openaiKey || openaiKeyStatus === 'testing'}>
                {openaiKeyStatus === 'testing' ? 'Testuję...' :
                 openaiKeyStatus === 'ok' ? 'Połączono!' :
                 openaiKeyStatus === 'error' ? 'Błąd!' : 'Testuj połączenie'}
              </Button>
            </div>
          </div>

          <Button variant="danger" onClick={() => setShowReset(true)} fullWidth size="sm">
            Resetuj postępy
          </Button>
        </div>
      </Modal>

      {/* Reset confirm */}
      <Modal isOpen={showReset} onClose={() => setShowReset(false)} title="Resetuj postępy">
        <p className="text-sm text-slate-300 mb-4">Czy na pewno chcesz zresetować wszystkie postępy? Tej operacji nie można cofnąć.</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowReset(false)} fullWidth>Anuluj</Button>
          <Button variant="danger" onClick={handleReset} fullWidth>Resetuj</Button>
        </div>
      </Modal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-800/60 rounded-lg p-2 text-center">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
