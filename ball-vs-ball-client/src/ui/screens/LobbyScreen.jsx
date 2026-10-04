import React from 'react';
import { useNow } from '../hooks/useNow.js';
import QuestPanel from '../hud/QuestPanel.jsx';
import QuickJoin from '../hud/QuickJoin.jsx';
import SideMenu from '../hud/SideMenu.jsx';
import Wallet from '../hud/Wallet.jsx';
import PlayDock from '../hud/PlayDock.jsx';
import Joystick, { JumpButton } from '../hud/Joystick.jsx';
import DuelHud, { JoinPrompt } from '../hud/DuelHud.jsx';

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
 */
export default function LobbyScreen({ lobby, profile, duel, duelActions }) {
  const now = useNow(1000);
  const inDuel = Boolean(duel.duel);
  return (
    <div className="hud" onClick={popButton} onAnimationEnd={(event) => event.target.classList.remove('pop')}>
      {!inDuel && (
        <>
          <SideMenu />
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
      {inDuel && <DuelHud duel={duel.duel} gems={profile.gems} actions={duelActions} />}
      {duel.prompt && <JoinPrompt at={duel.prompt} onJoin={duelActions.join} />}
      {duel.note && <div className="duel-note outlined">{duel.note}</div>}
    </div>
  );
}
