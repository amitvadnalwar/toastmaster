import { QRCodeCanvas } from 'qrcode.react';
import { CLUB_NAME } from '@/lib/constants';
import { formatDateShort } from '@/lib/utils';
import { CLUB_ROLE_LABELS } from '@/types';
import type { Meeting, Club, ClubOfficer } from '@/types';
import type { Agenda, AgendaItem } from '@/types/agenda';

interface Props {
  meeting: Meeting;
  agenda: Agenda;
  club: Club | null;
  officers: ClubOfficer[];
  guestUrl: string;
}

function gyr(item: AgendaItem): string | null {
  if (item.duration_green_sec == null) return null;
  const isFlat = item.duration_green_sec === item.duration_yellow_sec && item.duration_yellow_sec === item.duration_red_sec;
  const fmt = (s: number) => (s % 60 === 0 ? String(s / 60) : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
  if (isFlat) return `${fmt(item.duration_green_sec)} min`;
  return `${fmt(item.duration_green_sec)} / ${fmt(item.duration_yellow_sec ?? 0)} / ${fmt(item.duration_red_sec ?? 0)}`;
}

export default function AgendaReadView({ meeting, agenda, club, officers, guestUrl }: Props) {
  const hasWod = !!(agenda.word_of_day || agenda.idiom_of_day);

  return (
    <div id="agenda-print-root" className="agenda-print-root">
      {/* Banner */}
      <div className="bg-brand text-white rounded-2xl px-5 py-5 mb-5 print:rounded-none">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-1">{CLUB_NAME}</p>
        <h1 className="text-xl font-black leading-snug">{meeting.title}</h1>
        <p className="text-sm opacity-90 mt-1">{formatDateShort(meeting.scheduled_at)}{meeting.venue ? ` · ${meeting.venue}` : ''}</p>
        {meeting.theme && <p className="text-sm font-semibold mt-2 italic">Theme: &ldquo;{meeting.theme}&rdquo;</p>}
      </div>

      <div className="agenda-print-columns flex flex-col-reverse gap-5 print:flex-row print:items-start">
        {/* Sidebar */}
        <aside className="agenda-sidebar flex-shrink-0 print:w-64">
          <SectionCard title="Executive Committee">
            {officers.filter((o) => o.name).length === 0 ? (
              <p className="text-xs text-gray-400">Not set yet</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {officers.filter((o) => o.name).map((o) => (
                  <div key={o.club_role} className="flex justify-between gap-2 text-xs">
                    <span className="text-gray-500">{CLUB_ROLE_LABELS[o.club_role]}</span>
                    <span className="font-semibold text-gray-900 text-right">{o.name}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {club?.mission_statement && (
            <SectionCard title="Club Mission">
              <p className="text-xs text-gray-600 leading-relaxed">{club.mission_statement}</p>
            </SectionCard>
          )}

          <SectionCard title="Guest Registration">
            <div className="flex flex-col items-center gap-2">
              <QRCodeCanvas value={guestUrl} size={100} level="M" />
              <p className="text-[10px] text-gray-400 text-center break-all">{guestUrl}</p>
            </div>
          </SectionCard>

          {(club?.venue_address_url || meeting.venue) && (
            <SectionCard title="Venue">
              {club?.venue_address_url ? (
                <a href={club.venue_address_url} target="_blank" rel="noreferrer" className="text-xs text-brand break-all">
                  {meeting.venue ?? 'Get directions'}
                </a>
              ) : (
                <p className="text-xs text-gray-600">{meeting.venue}</p>
              )}
            </SectionCard>
          )}

          {(club?.instagram_url || club?.linkedin_url || club?.facebook_url || club?.whatsapp_invite_url) && (
            <SectionCard title="Social">
              <div className="flex flex-col gap-1 text-xs text-brand">
                {club.facebook_url && <a href={club.facebook_url} target="_blank" rel="noreferrer">Facebook</a>}
                {club.instagram_url && <a href={club.instagram_url} target="_blank" rel="noreferrer">Instagram</a>}
                {club.linkedin_url && <a href={club.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a>}
                {club.whatsapp_invite_url && <a href={club.whatsapp_invite_url} target="_blank" rel="noreferrer">WhatsApp</a>}
              </div>
            </SectionCard>
          )}
        </aside>

        {/* Main agenda table */}
        <div className="flex-1 min-w-0">
          {agenda.items.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-sm text-gray-400">
              No agenda has been published for this meeting yet.
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {agenda.items.map((item, i) => (
                <div key={item.id}>
                  {i > 0 && <div className="h-px bg-gray-100" />}
                  {item.item_type === 'section' ? (
                    <div className="bg-brand-light px-4 py-2.5">
                      <p className="text-xs font-bold text-brand uppercase tracking-wide">
                        {item.break_minutes ? `${item.break_minutes} Min Break & ` : ''}{item.title}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-[52px_1fr] sm:grid-cols-[52px_100px_1fr] gap-2 px-4 py-3 items-start">
                      <span className="text-xs font-bold text-gray-900">{item.computed_start_time}</span>
                      <span className="hidden sm:block text-[11px] text-gray-400">{gyr(item)}</span>
                      <div>
                        {item.item_type === 'speech' && (
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {item.path_code && <span className="text-[10px] font-bold text-brand bg-brand-light px-1.5 py-0.5 rounded">{item.path_code}</span>}
                            {item.level_project && <span className="text-[10px] font-semibold text-gray-400">{item.level_project}</span>}
                          </div>
                        )}
                        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                        <p className="sm:hidden text-[11px] text-gray-400 mt-0.5">{gyr(item)}</p>
                        {item.host_name && <p className="text-xs text-gray-500 mt-0.5">{item.host_name}</p>}
                        {item.evaluator_name && <p className="text-xs text-gray-400">M: {item.evaluator_name}</p>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {hasWod && (
            <div className="bg-white rounded-2xl shadow-sm p-4 mt-4">
              <p className="text-xs font-bold text-brand uppercase tracking-wide mb-2.5">Word &amp; Idiom of the Day</p>
              {agenda.word_of_day && (
                <div className="mb-2.5">
                  <p className="text-sm font-semibold text-gray-900">{agenda.word_of_day}</p>
                  {agenda.word_of_day_meaning && <p className="text-xs text-gray-500 mt-0.5">{agenda.word_of_day_meaning}</p>}
                  {agenda.word_of_day_usage && <p className="text-xs text-gray-400 italic mt-0.5">&ldquo;{agenda.word_of_day_usage}&rdquo;</p>}
                </div>
              )}
              {agenda.idiom_of_day && (
                <div>
                  <p className="text-sm font-semibold text-gray-900">{agenda.idiom_of_day}</p>
                  {agenda.idiom_of_day_meaning && <p className="text-xs text-gray-500 mt-0.5">{agenda.idiom_of_day_meaning}</p>}
                  {agenda.idiom_of_day_usage && <p className="text-xs text-gray-400 italic mt-0.5">&ldquo;{agenda.idiom_of_day_usage}&rdquo;</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2.5">{title}</p>
      {children}
    </div>
  );
}
