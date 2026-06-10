import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Toggle } from '@/components/ui/Toggle';
import { XPBar } from '@/components/gamification/XPBar';
import { AchievementCard } from '@/components/gamification/AchievementCard';
import { StreakCounter } from '@/components/dashboard/StreakCounter';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useProgress, useAchievements } from '@/hooks/useProgress';
import { useStreak } from '@/hooks/useStreak';
import { useAppStore } from '@/stores/appStore';
import { getLevelProgress, getLevelColor, ACHIEVEMENTS } from '@/services/gamification';
import { testConnection } from '@/services/aiService';
import { testOpenAIConnection } from '@/services/openaiService';
import { getApiKey, setApiKey } from '@/services/cryptoService';
import { isSoundEnabled, setSoundEnabled } from '@/services/soundService';
import { isHapticsEnabled, setHapticsEnabled } from '@/services/haptics';
import { exportBackup, importBackup } from '@/services/backupService';
import { db } from '@/db/database';

type KeyStatus = 'idle' | 'testing' | 'ok' | 'error';

export function ProfilePage() {
  const { totalXP, todayActivity, refresh } = useProgress();
  const { streak, todayActive } = useStreak();
  const { unlocked } = useAchievements();
  const { dailyGoal, setDailyGoal } = useAppStore();
  const { showToast } = useToast();
  const [showReset, setShowReset] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [claudeKey, setClaudeKey] = useState('');
  const [claudeStatus, setClaudeStatus] = useState<KeyStatus>('idle');
  const [openaiKey, setOpenaiKey] = useState('');
  const [openaiStatus, setOpenaiStatus] = useState<KeyStatus>('idle');
  const [sound, setSound] = useState(true);
  const [haptic, setHaptic] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const levelInfo = getLevelProgress(totalXP);

  useEffect(() => {
    getApiKey('claude_api_key').then(setClaudeKey);
    getApiKey('openai_api_key').then(setOpenaiKey);
    setSound(isSoundEnabled());
    setHaptic(isHapticsEnabled());
  }, []);

  const saveClaudeKey = async () => {
    await setApiKey('claude_api_key', claudeKey.trim());
    showToast('Klucz Claude zapisany (zaszyfrowany)', '🔐', 'success');
  };

  const saveOpenaiKey = async () => {
    await setApiKey('openai_api_key', openaiKey.trim());
    showToast('Klucz OpenAI zapisany (zaszyfrowany)', '🔐', 'success');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      await importBackup(file);
      showToast('Postępy przywrócone z kopii!', '✅', 'success');
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Błąd importu', '⚠️', 'warning');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = async () => {
    await db.flashcardReviews.clear();
    await db.quizAttempts.clear();
    await db.codingAttempts.clear();
    await db.explanationAttempts.clear();
    await db.dailyActivity.clear();
    await db.achievements.clear();
    await db.dailyQuests.clear();
    setShowReset(false);
    refresh();
  };

  return (
    <div>
      <Header title="Profil" right={
        <button
          onClick={() => setShowSettings(true)}
          className="flex h-11 w-11 items-center justify-center text-slate-400 hover:text-white"
          aria-label="Ustawienia"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      } />

      <div className="px-4 py-4 space-y-5">
        {/* Level display */}
        <Card variant="glow" padding="lg">
          <div className="flex items-center gap-5">
            <ProgressRing value={levelInfo.progress} size={90} strokeWidth={6} color={getLevelColor(levelInfo.level)} gradient={false}>
              <div className="text-center">
                <div className="text-xs font-bold" style={{ color: getLevelColor(levelInfo.level) }}>
                  {levelInfo.level}
                </div>
              </div>
            </ProgressRing>
            <div className="flex-1">
              <div className="text-2xl font-extrabold text-white tnum">{totalXP} XP</div>
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
            <Card variant="default" className="active:scale-[0.97] transition-transform">
              <div className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/25 bg-indigo-500/10 text-xl">📊</div>
              <div className="text-sm font-semibold text-white">Statystyki</div>
              <div className="text-xs text-slate-400">Szczegółowe dane</div>
            </Card>
          </Link>
          <Link to="/powtorka">
            <Card variant="default" className="active:scale-[0.97] transition-transform">
              <div className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/25 bg-rose-500/10 text-xl">🔄</div>
              <div className="text-sm font-semibold text-white">Powtórka błędów</div>
              <div className="text-xs text-slate-400">Popraw odpowiedzi</div>
            </Card>
          </Link>
        </div>

        {/* Today stats */}
        {todayActivity && (
          <Card variant="default">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Dzisiejsze statystyki</h3>
            <div className="grid grid-cols-3 gap-3">
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
        <div className="space-y-6">
          {/* Sound & haptics */}
          <section>
            <SectionTitle>Dźwięk i wibracje</SectionTitle>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">🔊 Dźwięki</span>
                <Toggle checked={sound} onChange={v => { setSound(v); setSoundEnabled(v); }} label="Dźwięki" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">📳 Wibracje (Android)</span>
                <Toggle checked={haptic} onChange={v => { setHaptic(v); setHapticsEnabled(v); }} label="Wibracje" />
              </div>
            </div>
          </section>

          {/* Daily goals */}
          <section>
            <SectionTitle>Cel dzienny</SectionTitle>
            {([
              { key: 'flashcards', label: '🎴 Fiszki' },
              { key: 'quizzes', label: '❓ Quiz' },
              { key: 'coding', label: '💻 Kodowanie' },
            ] as const).map(item => (
              <div key={item.key} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-slate-300">{item.label}</span>
                <div className="flex items-center gap-2">
                  <Stepper onClick={() => setDailyGoal({ [item.key]: Math.max(1, dailyGoal[item.key] - 1) })}>−</Stepper>
                  <span className="text-sm text-white w-7 text-center tnum">{dailyGoal[item.key]}</span>
                  <Stepper onClick={() => setDailyGoal({ [item.key]: dailyGoal[item.key] + 1 })}>+</Stepper>
                </div>
              </div>
            ))}
          </section>

          {/* AI keys */}
          <section>
            <SectionTitle>Klucze API (AI)</SectionTitle>
            <p className="text-[11px] text-slate-500 mb-3">
              🔐 Klucze są szyfrowane (AES-GCM) i nigdy nie opuszczają Twojego urządzenia poza wywołaniami API.
            </p>
            <KeyInput
              label="Claude (recenzja kodu)"
              placeholder="sk-ant-..."
              value={claudeKey}
              status={claudeStatus}
              onChange={v => { setClaudeKey(v); setClaudeStatus('idle'); }}
              onSave={saveClaudeKey}
              onTest={async () => {
                setClaudeStatus('testing');
                setClaudeStatus(await testConnection(claudeKey) ? 'ok' : 'error');
              }}
            />
            <KeyInput
              label="OpenAI (wyjaśnienia)"
              placeholder="sk-..."
              value={openaiKey}
              status={openaiStatus}
              onChange={v => { setOpenaiKey(v); setOpenaiStatus('idle'); }}
              onSave={saveOpenaiKey}
              onTest={async () => {
                setOpenaiStatus('testing');
                setOpenaiStatus(await testOpenAIConnection(openaiKey) ? 'ok' : 'error');
              }}
            />
          </section>

          {/* Backup */}
          <section>
            <SectionTitle>Kopia zapasowa</SectionTitle>
            <p className="text-[11px] text-slate-500 mb-3">
              Postępy trzymane są lokalnie w przeglądarce — zrób kopię, by ich nie stracić.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" fullWidth onClick={() => exportBackup()}>
                ⬇️ Eksportuj
              </Button>
              <Button variant="secondary" size="sm" fullWidth disabled={importing} onClick={() => fileInputRef.current?.click()}>
                {importing ? 'Importuję...' : '⬆️ Importuj'}
              </Button>
              <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
            </div>
          </section>

          {/* Danger zone */}
          <section>
            <SectionTitle>Strefa zagrożenia</SectionTitle>
            <Button variant="danger" onClick={() => setShowReset(true)} fullWidth size="sm">
              Resetuj postępy
            </Button>
          </section>
        </div>
      </Modal>

      {/* Reset confirm */}
      <Modal isOpen={showReset} onClose={() => setShowReset(false)} title="Resetuj postępy">
        <p className="text-sm text-slate-300 mb-4">
          Czy na pewno chcesz zresetować wszystkie postępy? Tej operacji nie można cofnąć.
          Rozważ wcześniej eksport kopii zapasowej.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowReset(false)} fullWidth>Anuluj</Button>
          <Button variant="danger" onClick={handleReset} fullWidth>Resetuj</Button>
        </div>
      </Modal>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{children}</h4>;
}

function Stepper({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-400/15 bg-white/5 text-base text-white active:scale-95 transition-transform"
    >
      {children}
    </button>
  );
}

function KeyInput({ label, placeholder, value, status, onChange, onSave, onTest }: {
  label: string;
  placeholder: string;
  value: string;
  status: KeyStatus;
  onChange: (v: string) => void;
  onSave: () => void;
  onTest: () => void;
}) {
  return (
    <div className="mb-4">
      <p className="text-sm text-slate-300 mb-1.5">{label}</p>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-xl border border-slate-400/15 bg-white/5 px-3 py-2.5 font-mono text-sm text-white placeholder-slate-600 focus:border-indigo-500/50 focus:outline-none focus:shadow-[0_0_12px_rgba(99,102,241,0.25)]"
      />
      <div className="mt-2 flex gap-2">
        <Button variant="secondary" size="sm" onClick={onSave}>Zapisz</Button>
        <Button variant="ghost" size="sm" onClick={onTest} disabled={!value || status === 'testing'}>
          {status === 'testing' ? 'Testuję...' :
           status === 'ok' ? '✓ Połączono!' :
           status === 'error' ? '✗ Błąd klucza' : 'Testuj połączenie'}
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-400/10 bg-white/[0.03] p-2 text-center">
      <div className="text-lg font-bold text-white tnum">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
