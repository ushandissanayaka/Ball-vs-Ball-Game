import React, { useEffect, useState } from 'react';
import { getInviteLink } from '../../bloxity/sdk.js';

/** On an arena square before the duel starts: "Waiting For Opponent" (until one comes), Invite and Leave. */
export default function QueuePanel({ onLeave, waiting = true }) {
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!note) return undefined;
    const timer = setTimeout(() => setNote(''), 2200);
    return () => clearTimeout(timer);
  }, [note]);

  const invite = async () => {
    const link = getInviteLink();
    try {
      if (navigator.share && window.matchMedia?.('(pointer: coarse)').matches) {
        await navigator.share({ title: 'Ball vs Ball', text: 'Duel me in Ball vs Ball!', url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      setNote('Invite link copied!');
    } catch {
      setNote(link);
    }
  };

  return (
    <>
      {waiting && <div className="waiting outlined">Waiting For Opponent</div>}
      <section className="queue-dock">
        {note && <div className="queue-note outlined">{note}</div>}
        <button type="button" className="invite-button outlined" onClick={invite}>Invite</button>
        <button type="button" className="leave-button outlined" onClick={onLeave}>Leave</button>
      </section>
    </>
  );
}
