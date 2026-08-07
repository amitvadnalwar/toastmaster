import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PageSpinner } from '@/components/ui/Spinner';
import AlertDialog from '@/components/ui/AlertDialog';

import LoginPage from '@/pages/auth/LoginPage';
import ChangePasswordPage from '@/pages/auth/ChangePasswordPage';

import AdminHomePage from '@/pages/admin/HomePage';
import AdminMeetingsPage from '@/pages/admin/MeetingsPage';
import AdminMeetingDetailPage from '@/pages/admin/MeetingDetailPage';
import AdminNewMeetingPage from '@/pages/admin/NewMeetingPage';
import AdminRolesPage from '@/pages/admin/RolesPage';
import AdminMembersPage from '@/pages/admin/MembersPage';
import AdminNewMemberPage from '@/pages/admin/NewMemberPage';
import AdminMemberDetailPage from '@/pages/admin/MemberDetailPage';
import AdminProfilePage from '@/pages/admin/ProfilePage';

import MemberHomePage from '@/pages/member/HomePage';
import MemberMeetingsPage from '@/pages/member/MeetingsPage';
import MemberMeetingDetailPage from '@/pages/member/MeetingDetailPage';
import MeetingRosterPage from '@/pages/member/MeetingRosterPage';
import MeetingQrCodesPage from '@/pages/member/MeetingQrCodesPage';
import DisqualifyPage from '@/pages/member/DisqualifyPage';
import VotingResultsPage from '@/pages/member/VotingResultsPage';
import LeaderboardPage from '@/pages/member/LeaderboardPage';
import LeaderboardDetailPage from '@/pages/member/LeaderboardDetailPage';
import MemberNewMeetingPage from '@/pages/member/NewMeetingPage';
import MemberApplyRolePage from '@/pages/member/ApplyRolePage';
import MemberScanPage from '@/pages/member/ScanPage';
import MemberFeedbackPage from '@/pages/member/FeedbackPage';
import FeedbackDetailsPage from '@/pages/member/FeedbackDetailsPage';
import MeetingGuestsPage from '@/pages/member/MeetingGuestsPage';
import MemberFeedbackDetailPage from '@/pages/member/MemberFeedbackDetailPage';
import FeedbackHistoryPage from '@/pages/member/FeedbackHistoryPage';
import MeetingFeedbackReceivedPage from '@/pages/member/MeetingFeedbackReceivedPage';
import MemberProfilePage from '@/pages/member/ProfilePage';
import MemberMembersPage from '@/pages/member/MembersPage';

function RootRedirect() {
  const { session, appRole, mustChangePassword, _hydrated } = useAuthStore();

  if (!_hydrated) return <PageSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (mustChangePassword) return <Navigate to="/change-password" replace />;

  if (appRole === 'super_admin') {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/home" replace />;
}

export default function App() {
  const { setSession, clearAuth } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setSession(session);
      else clearAuth();
    });
    return () => subscription.unsubscribe();
  }, [setSession, clearAuth]);

  return (
    <>
      <AlertDialog />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />

        {/* Super admin only — unchanged from before */}
        <Route path="/admin" element={<ProtectedRoute roles={['super_admin']}><AdminHomePage /></ProtectedRoute>} />
        <Route path="/admin/meetings" element={<ProtectedRoute roles={['super_admin']}><AdminMeetingsPage /></ProtectedRoute>} />
        <Route path="/admin/meetings/new" element={<ProtectedRoute roles={['super_admin']}><AdminNewMeetingPage /></ProtectedRoute>} />
        <Route path="/admin/meetings/:id" element={<ProtectedRoute roles={['super_admin']}><AdminMeetingDetailPage /></ProtectedRoute>} />
        <Route path="/admin/roles" element={<ProtectedRoute roles={['super_admin']}><AdminRolesPage /></ProtectedRoute>} />
        <Route path="/admin/members" element={<ProtectedRoute roles={['super_admin']}><AdminMembersPage /></ProtectedRoute>} />
        <Route path="/admin/members/new" element={<ProtectedRoute roles={['admin', 'super_admin']}><AdminNewMemberPage /></ProtectedRoute>} />
        <Route path="/admin/members/:id" element={<ProtectedRoute roles={['super_admin']}><AdminMemberDetailPage /></ProtectedRoute>} />
        <Route path="/admin/profile" element={<ProtectedRoute roles={['super_admin']}><AdminProfilePage /></ProtectedRoute>} />

        {/* Member + admin — admin sees the same screens, with extra controls layered in */}
        <Route path="/home" element={<ProtectedRoute roles={['member', 'admin']}><MemberHomePage /></ProtectedRoute>} />
        <Route path="/meetings" element={<ProtectedRoute roles={['member', 'admin']}><MemberMeetingsPage /></ProtectedRoute>} />
        <Route path="/meetings/new" element={<ProtectedRoute roles={['admin']}><MemberNewMeetingPage /></ProtectedRoute>} />
        <Route path="/meetings/:id" element={<ProtectedRoute roles={['member', 'admin']}><MemberMeetingDetailPage /></ProtectedRoute>} />
        <Route path="/meetings/:id/roster" element={<ProtectedRoute roles={['member', 'admin', 'super_admin']}><MeetingRosterPage /></ProtectedRoute>} />
        <Route path="/meetings/:id/qr-codes" element={<ProtectedRoute roles={['admin', 'super_admin']}><MeetingQrCodesPage /></ProtectedRoute>} />
        <Route path="/meetings/:id/disqualify" element={<ProtectedRoute roles={['admin', 'super_admin']}><DisqualifyPage /></ProtectedRoute>} />
        <Route path="/meetings/:id/voting-results" element={<ProtectedRoute roles={['admin', 'super_admin']}><VotingResultsPage /></ProtectedRoute>} />
        <Route path="/meetings/:id/apply" element={<ProtectedRoute roles={['member', 'admin']}><MemberApplyRolePage /></ProtectedRoute>} />
        <Route path="/meetings/:id/feedback" element={<ProtectedRoute roles={['member', 'admin']}><MemberFeedbackPage /></ProtectedRoute>} />
        <Route path="/meetings/:id/feedback-details" element={<ProtectedRoute roles={['admin', 'super_admin']}><FeedbackDetailsPage /></ProtectedRoute>} />
        <Route path="/meetings/:id/guests" element={<ProtectedRoute roles={['admin', 'super_admin']}><MeetingGuestsPage /></ProtectedRoute>} />
        <Route path="/meetings/:id/feedback-details/:memberId" element={<ProtectedRoute roles={['admin', 'super_admin']}><MemberFeedbackDetailPage /></ProtectedRoute>} />
        <Route path="/scan" element={<ProtectedRoute roles={['member', 'admin']}><MemberScanPage /></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute roles={['member', 'admin']}><MemberMembersPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute roles={['member', 'admin']}><MemberProfilePage /></ProtectedRoute>} />
        <Route path="/feedback-history" element={<ProtectedRoute roles={['member', 'admin']}><FeedbackHistoryPage /></ProtectedRoute>} />
        <Route path="/feedback-history/:meetingId" element={<ProtectedRoute roles={['member', 'admin']}><MeetingFeedbackReceivedPage /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute roles={['member', 'admin']}><LeaderboardPage /></ProtectedRoute>} />
        <Route path="/leaderboard/:memberId" element={<ProtectedRoute roles={['member', 'admin']}><LeaderboardDetailPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
