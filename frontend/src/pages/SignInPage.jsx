/**
 * Sign In Page
 *
 *
 *   Props:
 *   - `routing="path"` → tells Clerk this component lives at a fixed URL path
 *   - `path="/sign-in"` → the URL path where this component is mounted
 *   - `afterSignInUrl` → where to redirect after successful sign-in
 *     We redirect to /dashboard, where App.jsx will call /auth/me and
 *     redirect to /onboarding if the DB profile doesn't exist yet.
 *   - `signUpUrl` → link shown at the bottom "Don't have an account?"
 */

import { SignIn } from '@clerk/react';

const SignInPage = () => (
  <div className="page">
    <div className="auth-wrapper">
      <div className="auth-logo">SkillBridge</div>
      <SignIn routing="path" path="/sign-in" afterSignInUrl="/dashboard" signUpUrl="/sign-up" />
    </div>
  </div>
);

export default SignInPage;
