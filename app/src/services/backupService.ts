// Progress backup — export/import all learning data as a JSON file
// so clearing the browser cache never means losing months of progress.
// API keys and crypto material are deliberately excluded.

import { db } from '@/db/database';

const BACKUP_VERSION = 3;
const EXCLUDED_SETTINGS = ['claude_api_key', 'openai_api_key', 'claude_api_key_enc', 'openai_api_key_enc'];

interface BackupFile {
  version: number;
  exportedAt: string;
  tables: {
    flashcardReviews: unknown[];
    quizAttempts: unknown[];
    codingAttempts: unknown[];
    explanationAttempts: unknown[];
    dailyActivity: unknown[];
    achievements: unknown[];
    dailyQuests: unknown[];
    userSettings: unknown[];
  };
}

export async function exportBackup(): Promise<void> {
  const settings = (await db.userSettings.toArray()).filter(s => !EXCLUDED_SETTINGS.includes(s.key));
  const backup: BackupFile = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tables: {
      flashcardReviews: await db.flashcardReviews.toArray(),
      quizAttempts: await db.quizAttempts.toArray(),
      codingAttempts: await db.codingAttempts.toArray(),
      explanationAttempts: await db.explanationAttempts.toArray(),
      dailyActivity: await db.dailyActivity.toArray(),
      achievements: await db.achievements.toArray(),
      dailyQuests: await db.dailyQuests.toArray(),
      userSettings: settings,
    },
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nauka-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Replaces current progress with backup contents. Throws on invalid file. */
export async function importBackup(file: File): Promise<void> {
  const text = await file.text();
  const backup = JSON.parse(text) as BackupFile;

  if (!backup || typeof backup.version !== 'number' || !backup.tables) {
    throw new Error('Nieprawidłowy plik kopii zapasowej');
  }
  const t = backup.tables;
  const required = ['flashcardReviews', 'quizAttempts', 'codingAttempts', 'dailyActivity'] as const;
  for (const name of required) {
    if (!Array.isArray(t[name])) throw new Error(`Brak tabeli ${name} w kopii`);
  }

  const stripIds = (rows: unknown[]) =>
    rows.map(r => {
      const { id: _id, ...rest } = r as Record<string, unknown>;
      return rest;
    });

  await db.transaction(
    'rw',
    [db.flashcardReviews, db.quizAttempts, db.codingAttempts, db.explanationAttempts, db.dailyActivity, db.achievements, db.dailyQuests, db.userSettings],
    async () => {
      await db.flashcardReviews.clear();
      await db.flashcardReviews.bulkAdd(stripIds(t.flashcardReviews) as never[]);
      await db.quizAttempts.clear();
      await db.quizAttempts.bulkAdd(stripIds(t.quizAttempts) as never[]);
      await db.codingAttempts.clear();
      await db.codingAttempts.bulkAdd(stripIds(t.codingAttempts) as never[]);
      await db.explanationAttempts.clear();
      await db.explanationAttempts.bulkAdd(stripIds(t.explanationAttempts ?? []) as never[]);
      await db.dailyActivity.clear();
      await db.dailyActivity.bulkAdd(stripIds(t.dailyActivity) as never[]);
      await db.achievements.clear();
      await db.achievements.bulkAdd((t.achievements ?? []) as never[]);
      await db.dailyQuests.clear();
      await db.dailyQuests.bulkAdd(stripIds(t.dailyQuests ?? []) as never[]);

      // Settings: merge (keep current API keys), overwrite the rest
      for (const row of stripIds(t.userSettings ?? []) as { key: string; value: string }[]) {
        if (EXCLUDED_SETTINGS.includes(row.key)) continue;
        const existing = await db.userSettings.where('key').equals(row.key).first();
        if (existing) await db.userSettings.update(existing.id!, { value: row.value });
        else await db.userSettings.add(row);
      }
    },
  );
}
