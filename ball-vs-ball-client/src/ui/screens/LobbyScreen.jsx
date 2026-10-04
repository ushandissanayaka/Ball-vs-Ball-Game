import React, { useEffect, useState } from 'react';
import { useNow } from '../hooks/useNow.js';
import QuestPanel from '../hud/QuestPanel.jsx';
import QuickJoin from '../hud/QuickJoin.jsx';
import SideMenu from '../hud/SideMenu.jsx';
import Wallet from '../hud/Wallet.jsx';
import PlayDock from '../hud/PlayDock.jsx';
import Joystick, { JumpButton } from '../hud/Joystick.jsx';
import DuelHud, { JoinPrompt } from '../hud/DuelHud.jsx';
import DailyRewards from '../popups/DailyRewards.jsx';
import Store from '../popups/Store.jsx';
import Inventory from '../popups/Inventory.jsx';
import EmoteWheel from '../popups/EmoteWheel.jsx';

/** Restarts the little lift-and-pop on whichever HUD button was clicked (see .pop in hud.css). */
function popButton(event) {
  const button = event.target.closest('button');
  if (!button) return;
  button.classList.remove('pop');
  void button.offsetWidth; // restart the animation on repeated clicks
  button.classList.add('pop');
}

/**
 * The HUD laid over the 3D world. Only its controls catch the pointer; drags elsewhere move the camera. On a
 * duel square the lobby panels give way to the duel's (the wallet stays for choosing, where gems buy rerolls).
 * One window at a time opens over the lobby: Daily Rewards (open when the game starts), Store, Inventory, or
 * the emote wheel (also on R). Escape closes it.
 */
export default function LobbyScreen({ lobby, profile, duel, duelActions, shopActions }) {
  const now = useNow(1000);
  const inDuel = Boolean(duel.duel);
  const [popup, setPopup] = useState('daily');
  const toggle = (name) => setPopup((current) => (current === name ? null : name));
  const close = () => setPopup(null);

  useEffect(() => {
    const onKey = (event) => {
      if (event.target.closest?.('input, textarea') || event.repeat) return;
      if (event.code === 'Escape') setPopup(null);
      if (event.code === 'KeyR' && !inDuel) toggle('emotes');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inDuel]);

  return (
    <div className="hud" onClick={popButton} onAnimationEnd={(event) => event.target.classList.remove('pop')}>
      {!inDuel && (
        <>
          <SideMenu onOpen={toggle} />
          <div className="hud-right">
            <QuestPanel quests={profile.quests} resetsAt={profile.questsResetAt} now={now} />
            <QuickJoin entries={lobby.quickJoin} />
          </div>
          <PlayDock level={profile.level} />
          <Joystick />
          <JumpButton />
        </>
      )}
      {(!inDuel || duel.duel.phase === 'choose') && <Wallet coins={profile.coins} gems={profile.gems} coinBoost={profile.coinBoost} now={now} />}
      {!inDuel && popup === 'daily' && <DailyRewards daily={profile.daily} onClaim={shopActions.claimDaily} onClose={close} />}
      {!inDuel && popup === 'store' && <Store profile={profile} now={now} actions={shopActions} onClose={close} />}
      {!inDuel && popup === 'inventory' && <Inventory owned={profile} onFuse={shopActions.fuse} onClose={close} />}
      {!inDuel && popup === 'emotes' && <EmoteWheel onClose={close} />}
      {inDuel && <DuelHud duel={duel.duel} gems={profile.gems} actions={duelActions} />}
      {duel.prompt && <JoinPrompt at={duel.prompt} onJoin={duelActions.join} />}
      {duel.note && <div className="duel-note outlined">{duel.note}</div>}
    </div>
  );
}
