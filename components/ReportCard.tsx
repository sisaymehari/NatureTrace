import type { Report } from '@/types';
import { CATEGORY_COLORS } from '@/types';
import { MapPin, Clock, CheckCircle, Loader } from 'lucide-react';

interface Props {
  report: Report;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Loader className="w-3.5 h-3.5 text-yellow-500" />,
  verified: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  resolved: <CheckCircle className="w-3.5 h-3.5 text-blue-500" />,
};

export default function ReportCard({ report }: Props) {
  const colors = CATEGORY_COLORS[report.category];
  const timeAgo = getTimeAgo(report.created_at);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex gap-0">
      {report.photo_url && (
        <img
          src={report.photo_url}
          alt={report.species_name}
          className="w-24 h-24 flex-shrink-0 object-cover"
        />
      )}
      <div className="p-3 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
          >
            {report.category}
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
            {STATUS_ICON[report.status] ?? null}
            <span className="capitalize">{report.status}</span>
          </div>
        </div>
        <p className="font-semibold text-sm text-gray-900 truncate">{report.species_name}</p>
        {report.location_name && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{report.location_name}</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
          <Clock className="w-3 h-3" />
          {timeAgo}
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
