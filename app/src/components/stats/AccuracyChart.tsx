interface TopicAccuracy {
  topic: string;
  materialTitle: string;
  correct: number;
  total: number;
  accuracy: number;
}

interface AccuracyChartProps {
  data: TopicAccuracy[];
  title: string;
}

export function AccuracyChart({ data, title }: AccuracyChartProps) {
  if (data.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
        <p className="text-xs text-slate-500">Brak danych — rozwiąż kilka quizów!</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-slate-300 truncate max-w-[70%]">{item.topic}</span>
              <span className={`text-xs font-bold ${
                item.accuracy >= 70 ? 'text-emerald-400' :
                item.accuracy >= 40 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {item.accuracy}% ({item.correct}/{item.total})
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  item.accuracy >= 70 ? 'bg-emerald-500' :
                  item.accuracy >= 40 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${item.accuracy}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
