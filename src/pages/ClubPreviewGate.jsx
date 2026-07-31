import { useEffect, useState } from 'react';

import { loadMembershipPreviewAccess } from '../api/client';
import ClubComingSoon from './ClubComingSoon';

const ClubPreviewGate = ({ children }) => {
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
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
  }, []);

  return isAllowed ? children : <ClubComingSoon />;
};

export default ClubPreviewGate;
