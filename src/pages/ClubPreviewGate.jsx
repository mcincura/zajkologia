import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { loadMembershipPreviewAccess } from '../api/client';
import ClubComingSoon from './ClubComingSoon';
import {
  hasClubPreviewPresentationUnlock,
  unlockClubPreviewPresentation,
} from '../utils/clubPreviewUnlock';

const ClubPreviewGate = ({ children, loginOnly = false }) => {
  const [isAllowed, setIsAllowed] = useState(null);
  const [presentationUnlocked, setPresentationUnlocked] = useState(
    () => !loginOnly && hasClubPreviewPresentationUnlock(),
  );

  useEffect(() => {
    if (loginOnly) return undefined;
    let active = true;

    loadMembershipPreviewAccess()
      .then((allowed) => {
        if (active) setIsAllowed(allowed === true);
      })
      .catch(() => {
        if (active) setIsAllowed(false);
      });

    return () => {
      active = false;
    };
  }, [loginOnly]);

  if (loginOnly || isAllowed === true) return children;

  // Do not redirect while entitlement is being resolved. Redirecting between
  // /klub and /klub/prihlasenie created a loop for already-authenticated users.
  // The API still protects every member-only post and asset.
  if (isAllowed === null) {
    return (
      <main className="membership-page" id="main-content">
        <section className="membership-empty" aria-live="polite">
          <p>Načítavam Zajkológia Klub…</p>
        </section>
      </main>
    );
  }

  // The five-tap flag is only a path to the real login. It never bypasses the
  // server decision or exposes the club UI to an unauthenticated visitor.
  if (presentationUnlocked) return <Navigate to="/klub/prihlasenie" replace />;

  return (
    <ClubComingSoon
      onPreviewUnlock={() => {
        unlockClubPreviewPresentation();
        setPresentationUnlocked(true);
      }}
    />
  );
};

export default ClubPreviewGate;
