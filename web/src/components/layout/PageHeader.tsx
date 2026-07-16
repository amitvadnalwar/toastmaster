import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  backPath?: string;
  right?: ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  back,
  backPath,
  right,
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 sticky top-0 z-20">
      <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          {back && (
            <button
              onClick={() => (backPath ? navigate(backPath) : navigate(-1))}
              className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 shrink-0"
            >
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 leading-tight truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  );
}
