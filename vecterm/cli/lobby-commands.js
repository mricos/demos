/**
 * Lobby CLI Commands
 *
 * Commands for P2P multiplayer lobby:
 * - lobby.create [gameName] - Create room
 * - lobby.join <roomId> - Join room
 * - lobby.leave - Leave room
 * - lobby.status - Show lobby info
 * - lobby.start [gameName] - Start game (host only)
 * - lobby.invite - Show share URL
 *
 * Credit commands:
 * - credits.balance - Show credits
 * - credits.add <amount> <type> [reason] - Add credits (dev tool)
 * - credits.history - Show transaction log
 * - credits.stats - Show stats
 *
 * Audio debug commands:
 * - audio.phantom.list - List phantom channels
 * - audio.phantom.mute <player> - Mute phantom
 * - audio.phantom.unmute <player> - Unmute phantom
 * - audio.spatial.debug - Show spatial audio state
 */

import { lobby } from '../core/lobby-manager.js';
import { addressResolver, initializeAddressResolver } from '../core/address-resolver.js';
import { spatialAudio } from '../audio/spatial-audio-engine.js';
import { phantomChannels } from '../audio/phantom-channels.js';
import { tinesSpatialAdapter } from '../audio/tines-spatial-adapter.js';
import { cliLog } from './terminal.js';

/**
 * Lobby commands
 */
export const lobbyCommands = {
  /**
   * Create new room
   */
  'lobby.create': async (args, store) => {
    const gameName = args[0] || 'quadrapong';

    try {
      const result = await lobby.createRoom(gameName);

      cliLog(`✓ Room created: ${result.roomId}`, 'success');
      cliLog(`  Share URL: ${result.shareUrl}`, 'info');
      cliLog(`  Peer ID: ${result.peerId}`, 'info');
      cliLog(`  Waiting for players (1/${lobby.topology.maxPlayers})...`, 'info');

      // Initialize address resolver
      initializeAddressResolver(lobby);

      // Dispatch to Redux
      store.dispatch({
        type: 'LOBBY_CREATED',
        payload: {
          roomId: result.roomId,
          shareUrl: result.shareUrl,
          isHost: true
        }
      });

    } catch (err) {
      cliLog(`Error: ${err.message}`, 'error');
    }
  },

  /**
   * Join existing room
   */
  'lobby.join': async (args, store) => {
    const roomId = args[0];

    if (!roomId) {
      cliLog('Usage: lobby.join <roomId>', 'error');
      return;
    }

    try {
      const result = await lobby.joinRoom(roomId);

      cliLog(`✓ Joined room: ${result.roomId}`, 'success');
      cliLog(`  Player ID: ${result.playerId}`, 'info');
      cliLog(`  Connecting to host...`, 'info');

      // Initialize address resolver
      initializeAddressResolver(lobby);

      // Dispatch to Redux
      store.dispatch({
        type: 'LOBBY_JOINED',
        payload: {
          roomId: result.roomId,
          playerId: result.playerId,
          isHost: false
        }
      });

    } catch (err) {
      cliLog(`Error: ${err.message}`, 'error');
    }
  },

  /**
   * Leave current room
   */
  'lobby.leave': (args, store) => {
    if (!lobby.roomId) {
      cliLog('Not in a lobby', 'info');
      return;
    }

    const roomId = lobby.roomId;
    lobby.leaveRoom();

    cliLog(`✓ Left room: ${roomId}`, 'success');

    // Dispatch to Redux
    store.dispatch({
      type: 'LOBBY_LEFT'
    });
  },

  /**
   * Show lobby status
   */
  'lobby.status': (args, store) => {
    if (!lobby.roomId) {
      cliLog('Not in a lobby', 'info');
      cliLog('Use "lobby.create" to host or "lobby.join <roomId>" to join', 'info');
      return;
    }

    const state = lobby.getLobbyState();

    cliLog(`\nLobby: ${state.roomId}`, 'info');
    cliLog(`Status: ${lobby.isHost ? 'HOST' : 'PLAYER'}`, 'info');
    cliLog(`Topology: ${state.topology?.name || 'unknown'}`, 'info');
    cliLog(`\nPlayers (${state.playerCount}/${state.maxPlayers}):`, 'info');

    state.players.forEach(p => {
      const badge = p.id === lobby.playerId ? '[YOU]' : p.isHost ? '[HOST]' : '';
      const status = p.connected ? '✓' : '✗';
      cliLog(`  ${status} ${p.position}: ${p.name} ${badge}`, 'info');
    });

    // Show topology map
    if (addressResolver && state.topology) {
      cliLog('\n' + addressResolver.getTopologyMap(), 'info');
    }
  },

  /**
   * Start game (host only)
   */
  'lobby.start': (args, store) => {
    const gameName = args[0] || 'quadrapong';

    if (!lobby.roomId) {
      cliLog('Not in a lobby', 'error');
      return;
    }

    if (!lobby.canStartGame()) {
      if (!lobby.isHost) {
        cliLog('Only the host can start the game', 'error');
      } else {
        cliLog('Need at least 2 players to start', 'error');
      }
      return;
    }

    if (lobby.startGame(gameName)) {
      cliLog(`✓ Game started: ${gameName}`, 'success');

      // Dispatch to Redux
      store.dispatch({
        type: 'GAME_START',
        payload: { game: gameName }
      });
    }
  },

  /**
   * Show invite URL
   */
  'lobby.invite': (args, store) => {
    if (!lobby.roomId) {
      cliLog('Not in a lobby', 'error');
      return;
    }

    const shareUrl = `${window.location.origin}/room/${lobby.roomId}`;
    cliLog(`\nShare this URL with friends:`, 'info');
    cliLog(`  ${shareUrl}`, 'success');
    cliLog(`\nPlayers can join by:`, 'info');
    cliLog(`  1. Visiting the URL above`, 'info');
    cliLog(`  2. Running: lobby.join ${lobby.roomId}`, 'info');

    // Copy to clipboard if possible
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        cliLog(`\n✓ URL copied to clipboard!`, 'success');
      }).catch(() => {
        // Silently fail
      });
    }
  }
};

/**
 * Credit commands
 */
export const creditCommands = {
  /**
   * Show credit balance
   */
  'credits.balance': (args, store) => {
    const profile = lobby.getPlayerProfile();

    cliLog(`\n💰 Credit Balance`, 'info');
    cliLog(`  Dev Credits:    ${profile.credits.dev}`, 'info');
    cliLog(`  Player Credits: ${profile.credits.player}`, 'info');

    cliLog(`\nStats:`, 'info');
    cliLog(`  Games Hosted: ${profile.stats.gamesHosted}`, 'info');
    cliLog(`  Games Played: ${profile.stats.gamesPlayed}`, 'info');
  },

  /**
   * Add credits (dev tool)
   */
  'credits.add': (args, store) => {
    const amount = parseInt(args[0]) || 1;
    const type = args[1] || 'player'; // 'dev' or 'player'
    const reason = args.slice(2).join(' ') || 'Manual addition';

    if (type !== 'dev' && type !== 'player') {
      cliLog('Usage: credits.add <amount> <type:dev|player> [reason]', 'error');
      return;
    }

    lobby.addCredits(type, amount, reason);

    const profile = lobby.getPlayerProfile();
    cliLog(`✓ Added ${amount} ${type} credits`, 'success');
    cliLog(`  New balance: ${profile.credits[type]}`, 'info');
  },

  /**
   * Show transaction history
   */
  'credits.history': (args, store) => {
    const profile = lobby.getPlayerProfile();
    const transactions = profile.transactions || [];

    if (transactions.length === 0) {
      cliLog('No transaction history', 'info');
      return;
    }

    cliLog(`\n📜 Transaction History (${transactions.length} total)`, 'info');

    // Show last 10 transactions
    const recent = transactions.slice(-10).reverse();

    recent.forEach((tx, i) => {
      const date = new Date(tx.timestamp).toLocaleString();
      const sign = tx.type === 'earn' ? '+' : '-';
      const amount = Math.abs(tx.amount);
      const emoji = tx.type === 'earn' ? '✓' : '○';

      cliLog(`${emoji} ${date}`, 'info');
      cliLog(`   ${sign}${amount} ${tx.creditType} - ${tx.reason}`, 'info');
      cliLog(`   Balance: ${tx.balance}`, 'info');
    });

    if (transactions.length > 10) {
      cliLog(`\n(Showing last 10 of ${transactions.length} transactions)`, 'info');
    }
  },

  /**
   * Show credit stats
   */
  'credits.stats': (args, store) => {
    const profile = lobby.getPlayerProfile();
    const transactions = profile.transactions || [];

    // Calculate stats
    const totalEarned = transactions
      .filter(tx => tx.type === 'earn')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalSpent = transactions
      .filter(tx => tx.type === 'spend')
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    cliLog(`\n📊 Credit Statistics`, 'info');
    cliLog(`  Total Earned: ${totalEarned}`, 'success');
    cliLog(`  Total Spent: ${totalSpent}`, 'info');
    cliLog(`  Net: ${totalEarned - totalSpent}`, 'info');
    cliLog(`\n  Current Balance:`, 'info');
    cliLog(`    Dev:    ${profile.credits.dev}`, 'info');
    cliLog(`    Player: ${profile.credits.player}`, 'info');
  }
};

/**
 * Audio debug commands
 */
export const audioDebugCommands = {
  /**
   * List phantom channels
   */
  'audio.phantom.list': (args, store) => {
    if (!phantomChannels.initialized) {
      cliLog('Phantom channels not initialized', 'info');
      return;
    }

    const phantoms = phantomChannels.getAllPhantoms();

    if (phantoms.length === 0) {
      cliLog('No phantom channels', 'info');
      return;
    }

    cliLog(`\n🎵 Phantom Channels (${phantoms.length})`, 'info');

    phantoms.forEach(({ position, tines, spatialSources }) => {
      const volume = tines.masterGain.gain.value.toFixed(2);
      const spatialStatus = spatialSources ? '3D' : 'Mono';

      cliLog(`  ${position}:`, 'info');
      cliLog(`    Volume: ${volume}`, 'info');
      cliLog(`    Spatial: ${spatialStatus}`, 'info');
      cliLog(`    Oscillators: ${tines.oscillators.length}`, 'info');
    });
  },

  /**
   * Mute phantom
   */
  'audio.phantom.mute': (args, store) => {
    const playerPosition = args[0];

    if (!playerPosition) {
      cliLog('Usage: audio.phantom.mute <player>', 'error');
      cliLog('Example: audio.phantom.mute player2', 'error');
      return;
    }

    if (!phantomChannels.hasPhantom(playerPosition)) {
      cliLog(`No phantom for ${playerPosition}`, 'error');
      return;
    }

    phantomChannels.mutePhantom(playerPosition, true);
    cliLog(`✓ Muted phantom: ${playerPosition}`, 'success');
  },

  /**
   * Unmute phantom
   */
  'audio.phantom.unmute': (args, store) => {
    const playerPosition = args[0];

    if (!playerPosition) {
      cliLog('Usage: audio.phantom.unmute <player>', 'error');
      return;
    }

    if (!phantomChannels.hasPhantom(playerPosition)) {
      cliLog(`No phantom for ${playerPosition}`, 'error');
      return;
    }

    phantomChannels.mutePhantom(playerPosition, false);
    cliLog(`✓ Unmuted phantom: ${playerPosition}`, 'success');
  },

  /**
   * Show spatial audio debug info
   */
  'audio.spatial.debug': (args, store) => {
    if (!spatialAudio.initialized) {
      cliLog('Spatial audio not initialized', 'info');
      return;
    }

    spatialAudio.debug();
  },

  /**
   * Show Tines spatial adapter status
   */
  'audio.status': (args, store) => {
    const status = tinesSpatialAdapter.getStatus();

    cliLog(`\n🎵 Audio System Status`, 'info');
    cliLog(`  Initialized: ${status.initialized}`, 'info');
    cliLog(`  Owned Tines: ${status.hasOwnedTines ? 'Yes' : 'No'}`, 'info');

    cliLog(`\nSpatial Audio:`, 'info');
    cliLog(`  Initialized: ${status.spatialAudio.initialized}`, 'info');
    cliLog(`  Sources: ${status.spatialAudio.sources}`, 'info');

    cliLog(`\nPhantom Channels:`, 'info');
    cliLog(`  Initialized: ${status.phantomChannels.initialized}`, 'info');
    cliLog(`  Count: ${status.phantomChannels.count}`, 'info');

    cliLog(`\nNetworking:`, 'info');
    cliLog(`  Connected: ${status.networking.connected}`, 'info');
    cliLog(`  Broadcast Collisions: ${status.networking.broadcastCollisions}`, 'info');
    cliLog(`  Broadcast OSC: ${status.networking.broadcastOSC}`, 'info');
  }
};

/**
 * Combined export of all lobby-related commands
 */
export const allLobbyCommands = {
  ...lobbyCommands,
  ...creditCommands,
  ...audioDebugCommands
};
