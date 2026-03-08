interface HeatmapDay {
  date: string;
  level: number;
  xp: number;
}

interface ActivityHeatmapProps {
  data: HeatmapDay[];
}

const levelColors = [
  'bg-slate-800',
  'bg-emerald-900',
  'bg-emerald-700',
  'bg-emerald-500',
  'bg-emerald-400',
];

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // Group into weeks (columns of 7)
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  const dayLabels = ['Pn', '', 'Śr', '', 'Pt', '', 'Nd'];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Aktywność (90 dni)</h3>
      <div className="flex gap-0.5 overflow-x-auto no-scrollbar">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1 flex-shrink-0">
          {dayLabels.map((label, i) => (
            <div key={i} className="w-6 h-3 flex items-center">
              <span className="text-[8px] text-slate-500">{label}</span>
            </div>
          ))}
        </div>
        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5 flex-shrink-0">
            {week.map((day, di) => (
              <div
                key={di}
                className={`w-3 h-3 rounded-sm ${levelColors[day.level]}`}
                title={`${day.date}: ${day.xp} XP`}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1 text-[9px] text-slate-500">
        <span>Mniej</span>
        {levelColors.map((color, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-sm ${color}`} />
        ))}
        <span>Więcej</span>
      </div>
    </div>
  );
}
