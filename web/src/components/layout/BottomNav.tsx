import { NavLink } from 'react-router-dom';
import { Home, Calendar, Award, Users, User, Scan } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}

function NavButton({ to, label, icon, end }: NavItem) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-1 py-2 rounded-xl transition-colors min-w-0 flex-1',
          isActive ? 'text-brand' : 'text-gray-400',
        )
      }
    >
      {icon}
      <span className="text-[11px] font-medium truncate">{label}</span>
    </NavLink>
  );
}

export function AdminBottomNav({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100">
      <div className="flex items-center max-w-lg mx-auto px-2 pb-safe pt-1.5">
        <NavButton to="/admin" label="Home" icon={<Home size={22} />} end />
        <NavButton to="/admin/meetings" label="Meetings" icon={<Calendar size={22} />} />
        {isSuperAdmin && <NavButton to="/admin/roles" label="Roles" icon={<Award size={22} />} />}
        <NavButton to="/admin/members" label="Members" icon={<Users size={22} />} />
        <NavButton to="/admin/profile" label="Profile" icon={<User size={22} />} />
      </div>
    </nav>
  );
}

export function MemberBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100">
      <div className="flex items-center max-w-lg mx-auto px-2 pb-safe pt-1.5">
        <NavButton to="/home" label="Home" icon={<Home size={22} />} end />
        <NavButton to="/meetings" label="Meetings" icon={<Calendar size={22} />} />
        <NavButton to="/scan" label="Scan" icon={<Scan size={22} />} />
        <NavButton to="/members" label="Members" icon={<Users size={22} />} />
        <NavButton to="/profile" label="Profile" icon={<User size={22} />} />
      </div>
    </nav>
  );
}
