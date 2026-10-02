import React from 'react';
import { useNow } from '../hooks/useNow.js';
import QuestPanel from '../hud/QuestPanel.jsx';
import QuickJoin from '../hud/QuickJoin.jsx';
import SideMenu from '../hud/SideMenu.jsx';
import Wallet from '../hud/Wallet.jsx';
import PlayDock from '../hud/PlayDock.jsx';

/** Restarts the little lift-and-pop on whichever HUD button was clicked (see .pop in hud.css). */
function popButton(event) {
  const button = event.target.closest('button');
  if (!button) return;
  button.classList.remove('pop');
  void button.offsetWidth; // restart the animation on repeated clicks
  button.classList.add('pop');
}

/** The lobby HUD laid over the 3D world. Only its controls catch the pointer; drags elsewhere move the camera. */
export default function LobbyScreen({ lobby, profile }) {
  const now = useNow(1000);
  return (
    <div className="hud" onClick={popButton} onAnimationEnd={(event) => event.target.classList.remove('pop')}>
      <SideMenu />
      <div className="hud-right">
        <QuestPanel quests={profile.quests} resetsAt={profile.questsResetAt} now={now} />
        <QuickJoin entries={lobby.quickJoin} />
      </div>
      <Wallet coins={profile.coins} gems={profile.gems} coinBoost={profile.coinBoost} now={now} />
      <PlayDock level={profile.level} />
    </div>
  );
}
