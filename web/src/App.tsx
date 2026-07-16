import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PageSpinner } from '@/components/ui/Spinner';

import LoginPage from '@/pages/auth/LoginPage';
import ChangePasswordPage from '@/pages/auth/ChangePasswordPage';

import AdminDashboardPage from '@/pages/admin/DashboardPage';
import AdminMeetingDetailPage from '@/pages/admin/MeetingDetailPage';
import AdminNewMeetingPage from '@/pages/admin/NewMeetingPage';
import AdminMembersPage from '@/pages/admin/MembersPage';
import AdminNewMemberPage from '@/pages/admin/NewMemberPage';
import AdminMemberDetailPage from '@/pages/admin/MemberDetailPage';
import AdminProfilePage from '@/pages/admin/ProfilePage';

import MemberHomePage from '@/pages/member/HomePage';
import MemberMeetingsPage from '@/pages/member/MeetingsPage';
import MemberMeetingDetailPage from '@/pages/member/MeetingDetailPage';
import MemberScanPage from '@/pages/member/ScanPage';
import MemberFeedbackPage from '@/pages/member/FeedbackPage';
import MemberProfilePage from '@/pages/member/ProfilePage';
import MemberMembersPage from '@/pages/member/MembersPage';

function RootRedirect() {
  const { session, appRole, mustChangePassword, _hydrated } = useAuthStore();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  if (!_hydrated) return <PageSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (mustChangePassword) return <Navigate to="/change-password" replace />;

  if (from && from !== '/') return <Navigate to={from} replace />;

  if (appRole === 'admin' || appRole === 'super_admin') {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/home" replace />;
}

export default function App() {
  const { setSession, clearAuth } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setSession(session);
      else clearAuth();
    });

    return () => subscription.unsubscribe();
  }, [setSession, clearAuth]);

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin', 'super_admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/meetings/new"
        element={
          <ProtectedRoute roles={['admin', 'super_admin']}>
            <AdminNewMeetingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/meetings/:id"
        element={
          <ProtectedRoute roles={['admin', 'super_admin']}>
            <AdminMeetingDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/members"
        element={
          <ProtectedRoute roles={['super_admin']}>
            <AdminMembersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/members/new"
        element={
          <ProtectedRoute roles={['super_admin']}>
            <AdminNewMemberPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/members/:id"
        element={
          <ProtectedRoute roles={['super_admin']}>
            <AdminMemberDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute roles={['admin', 'super_admin']}>
            <AdminProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Member routes */}
      <Route
        path="/home"
        element={
          <ProtectedRoute roles={['member']}>
            <MemberHomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meetings"
        element={
          <ProtectedRoute roles={['member']}>
            <MemberMeetingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meetings/:id"
        element={
          <ProtectedRoute roles={['member']}>
            <MemberMeetingDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scan"
        element={
          <ProtectedRoute roles={['member']}>
            <MemberScanPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meetings/:id/feedback"
        element={
          <ProtectedRoute roles={['member']}>
            <MemberFeedbackPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute roles={['member']}>
            <MemberProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/members"
        element={
          <ProtectedRoute roles={['member']}>
            <MemberMembersPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
