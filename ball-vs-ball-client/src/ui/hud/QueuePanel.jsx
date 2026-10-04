import React, { useCallback, useState } from 'react';
import InviteFriends from './InviteFriends.jsx';

/**
 * On an arena square before the duel starts: "Waiting For Opponent" (until one comes), Invite (opens the Invite
 * Friends window) and Leave.
 */
export default function QueuePanel({ onLeave, waiting = true }) {
  const [inviting, setInviting] = useState(false);
  const closeInvite = useCallback(() => setInviting(false), []); // stable, so the window doesn't reload its friends
  return (
    <>
      {waiting && <div className="waiting outlined">Waiting For Opponent</div>}
      <section className="queue-dock">
        <button type="button" className="invite-button outlined" onClick={() => setInviting(true)}>Invite</button>
        <button type="button" className="leave-button outlined" onClick={onLeave}>Leave</button>
      </section>
      {inviting && <InviteFriends onClose={closeInvite} />}
    </>
  );
}
