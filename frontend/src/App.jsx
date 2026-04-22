/**
 * App.jsx — Top-level router
 */

import { useAuth } from '@clerk/react';
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api, setupAuthInterceptor } from './lib/api.js';
import DashboardPage from './pages/DashboardPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import SignInPage from './pages/SignInPage.jsx';
import SignUpPage from './pages/SignUpPage.jsx';

// sessionStorage key used to preserve invite params across onboarding
const INVITE_REDIRECT_KEY = 'skillbridge_invite_redirect';

const App = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // dbUser: our DB user row (has role, institutionId, etc.)
  // null  = not yet fetched
  // false = signed in but not onboarded
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  const profileErrorView = (
    <div className="page">
      <div className="card" style={{ maxWidth: 480 }}>
        <h2>Profile load failed</h2>
        <p className="muted">{profileError}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    </div>
  );

  // Effect 1: set up Axios auth interceptor
  useEffect(() => {
    if (isSignedIn && getToken) {
      setupAuthInterceptor(getToken);
    }
  }, [isSignedIn, getToken]);

  // Effect 2: fetch DB profile on auth state change
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setDbUser(null);
      setProfileError('');
      return;
    }

    const fetchUser = async () => {
      setLoading(true);
      setProfileError('');
      try {
        const { data } = await api.get('/auth/me');
        setDbUser(data.user);

        // If we were waiting for onboarding and now have a profile,
        // check if there's a saved invite redirect
        const savedRedirect = sessionStorage.getItem(INVITE_REDIRECT_KEY);
        if (savedRedirect) {
          sessionStorage.removeItem(INVITE_REDIRECT_KEY);
          navigate(savedRedirect, { replace: true });
        }
      } catch (err) {
        if (err.response?.status === 404) {
          // Signed into Clerk but no DB profile yet → onboarding needed
          setDbUser(false);

          // If user clicked an invite link first, save it so we can
          // redirect back to /join after onboarding completes
          if (location.pathname === '/join' && location.search) {
            sessionStorage.setItem(INVITE_REDIRECT_KEY, `/join${location.search}`);
          }

          navigate('/onboarding', { replace: true });
          return;
        }

        setProfileError(
          err.response?.data?.error ??
            'Unable to load your profile. Ensure backend is running and CORS is configured.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [isLoaded, isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clerk still hydrating or fetching profile
  if (!isLoaded || loading) {
    return (
      <div className="page">
        <p className="muted">Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/*  Public  */}
      <Route
        path="/sign-in/*"
        element={
          isSignedIn ? (
            dbUser === false ? (
              <Navigate to="/onboarding" replace />
            ) : dbUser ? (
              <Navigate to="/dashboard" replace />
            ) : profileError ? (
              profileErrorView
            ) : (
              <div className="page">
                <p className="muted">Loading profile...</p>
              </div>
            )
          ) : (
            <SignInPage />
          )
        }
      />
      <Route
        path="/sign-up/*"
        element={
          isSignedIn ? (
            dbUser === false ? (
              <Navigate to="/onboarding" replace />
            ) : dbUser ? (
              <Navigate to="/dashboard" replace />
            ) : profileError ? (
              profileErrorView
            ) : (
              <div className="page">
                <p className="muted">Loading profile...</p>
              </div>
            )
          ) : (
            <SignUpPage />
          )
        }
      />

      {/* Onboarding  */}
      {/* Only accessible when signed in but no DB profile yet */}
      <Route
        path="/onboarding"
        element={
          !isSignedIn ? (
            <Navigate to="/sign-in" replace />
          ) : dbUser ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <OnboardingPage
              onComplete={(user) => {
                setDbUser(user);
                // Check if there's a pending invite redirect
                const savedRedirect = sessionStorage.getItem(INVITE_REDIRECT_KEY);
                if (savedRedirect) {
                  sessionStorage.removeItem(INVITE_REDIRECT_KEY);
                  navigate(savedRedirect, { replace: true });
                } else {
                  navigate('/dashboard', { replace: true });
                }
              }}
            />
          )
        }
      />

      {/* Invite join link  */}
      {/* /join?token=xxx&batchId=yyy */}
      <Route
        path="/join"
        element={
          !isSignedIn ? (
            // Not signed in → go sign up first; invite params preserved by Effect 2
            <Navigate to="/sign-up" replace />
          ) : dbUser === false ? (
            <Navigate to="/onboarding" replace />
          ) : dbUser ? (
            <DashboardPage dbUser={dbUser} />
          ) : profileError ? (
            profileErrorView
          ) : (
            <div className="page">
              <p className="muted">Loading...</p>
            </div>
          )
        }
      />

      {/* Main dashboard */}
      <Route
        path="/dashboard/*"
        element={
          !isSignedIn ? (
            <Navigate to="/sign-in" replace />
          ) : profileError ? (
            profileErrorView
          ) : dbUser === false ? (
            <Navigate to="/onboarding" replace />
          ) : dbUser ? (
            <DashboardPage dbUser={dbUser} />
          ) : (
            <div className="page">
              <p className="muted">Loading profile...</p>
            </div>
          )
        }
      />

      {/* Default */}
      <Route path="*" element={<Navigate to={isSignedIn ? '/dashboard' : '/sign-in'} replace />} />
    </Routes>
  );
};

export default App;
