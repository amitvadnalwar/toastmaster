import { useNavigate } from 'react-router-dom';
import {
  Star, BookOpen, UserPlus, Radio, FileText, DollarSign, Shield,
  Info, ArrowRight, ChevronRight,
} from 'lucide-react';
import { AdminBottomNav } from '@/components/layout/BottomNav';

const CLUB_ROLES = [
  { key: 'president', label: 'President', icon: Star, desc: 'Leads the club and meeting' },
  { key: 'vp_education', label: 'VP Education', icon: BookOpen, desc: 'Manages educational programs' },
  { key: 'vp_membership', label: 'VP Membership', icon: UserPlus, desc: 'Recruits and retains members' },
  { key: 'vp_pr', label: 'VP Public Relations', icon: Radio, desc: 'Handles club publicity' },
  { key: 'secretary', label: 'Secretary', icon: FileText, desc: 'Maintains records and minutes' },
  { key: 'treasurer', label: 'Treasurer', icon: DollarSign, desc: 'Manages club finances' },
  { key: 'saa', label: 'Sergeant-at-Arms', icon: Shield, desc: 'Manages club logistics' },
];

export default function AdminRolesPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-full bg-[#f4f4f8]">
      <div className="bg-white border-b border-gray-100 px-5 py-4 sticky top-0 z-20">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Club Roles</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-28 max-w-lg mx-auto w-full">
        <p className="text-sm text-gray-500 leading-5 mb-5">
          Manage ExCom roles for your club. Assign members to leadership positions from the Members tab.
        </p>

        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Executive Committee</p>
        <div className="flex flex-col gap-2.5">
          {CLUB_ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.key}
                onClick={() => navigate('/admin/members')}
                className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm text-left active:scale-[0.99] transition-transform"
              >
                <div className="w-10 h-10 rounded-xl bg-[#fef2f2] flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-gray-900">{role.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{role.desc}</p>
                </div>
                <ChevronRight size={18} className="text-gray-400 shrink-0" />
              </button>
            );
          })}
        </div>

        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5 mt-6">Meeting Roles</p>
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 flex gap-2.5 items-start mb-3">
          <Info size={16} className="text-gray-500 shrink-0 mt-0.5" />
          <p className="text-[13px] text-gray-500 leading-[18px]">
            Meeting roles (TMOD, General Evaluator, Timer, etc.) are assigned per meeting. Open a meeting to manage its roster.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/meetings')}
          className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border-[1.5px] border-brand text-brand text-sm font-semibold active:bg-brand-50"
        >
          Go to Meetings
          <ArrowRight size={14} />
        </button>
      </div>

      <AdminBottomNav isSuperAdmin />
    </div>
  );
}
