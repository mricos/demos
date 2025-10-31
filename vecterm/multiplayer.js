/**
 * Vecterm Multiplayer Integration
 * Wires network client to Redux store and game loop
 */

import { network, createNetworkMiddleware, setupNetworkHandlers } from './network.js';
import { cliLog } from './cli/terminal.js';

// Initialize multiplayer system
export function initializeMultiplayer(store) {
  // Setup network event handlers
  setupNetworkHandlers(network, store);

  // Add network middleware to store (if not already added)
  // Note: This should ideally be done when creating the store
  // For now, we'll handle networking manually in the game loop

  // Log connection events
  network.on('joined', (data) => {
    cliLog(`Connected as ${data.name} (${data.playerId})`, 'success');
    store.dispatch({
      type: 'NETWORK_CONNECTED',
      payload: {
        playerId: data.playerId,
        playerName: data.name
      }
    });
  });

  network.on('disconnected', () => {
    cliLog('Disconnected from server', 'error');
  });

  network.on('lobby_created', (lobby) => {
    cliLog(`Lobby "${lobby.name}" created (${lobby.id})`, 'success');
  });

  network.on('lobby_joined', (lobby) => {
    cliLog(`Joined lobby "${lobby.name}" (${lobby.playerCount}/${lobby.maxPlayers})`, 'success');
  });

  network.on('player_joined', (data) => {
    cliLog(`${data.player.name} joined the lobby`, 'info');
  });

  network.on('player_left', (data) => {
    cliLog(`Player left the lobby`, 'info');
  });

  network.on('game_started', (data) => {
    cliLog('Game started!', 'success');
  });

  return network;
}

// Multiplayer CLI commands
export const multiplayerCommands = {
  // Connect to multiplayer server
  connect: (args, store) => {
    const name = args[0] || 'Player';
    network.connect(name).catch(err => {
      cliLog(`Failed to connect: ${err.message}`, 'error');
    });
  },

  // Disconnect from server
  disconnect: (args, store) => {
    network.disconnect();
    cliLog('Disconnected from multiplayer server', 'info');
  },

  // Create a new lobby
  lobby_create: (args, store) => {
    if (!network.connected) {
      cliLog('Not connected to server. Use "connect <name>" first.', 'error');
      return;
    }

    const name = args.slice(0, -1).join(' ') || 'My Lobby';
    const maxPlayers = parseInt(args[args.length - 1]) || 4;

    network.createLobby(name, maxPlayers);
  },

  // Join a lobby
  lobby_join: (args, store) => {
    if (!network.connected) {
      cliLog('Not connected to server. Use "connect <name>" first.', 'error');
      return;
    }

    const lobbyId = args[0];
    if (!lobbyId) {
      cliLog('Usage: lobby_join <lobbyId>', 'error');
      return;
    }

    network.joinLobby(lobbyId);
  },

  // Leave current lobby
  lobby_leave: (args, store) => {
    if (!network.connected) {
      cliLog('Not connected to server', 'error');
      return;
    }

    network.leaveLobby();
    cliLog('Left lobby', 'info');
  },

  // List available lobbies
  lobby_list: (args, store) => {
    if (!network.connected) {
      cliLog('Not connected to server. Use "connect <name>" first.', 'error');
      return;
    }

    network.listLobbies();

    // Wait a bit for response
    setTimeout(() => {
      const state = store.getState();
      const lobbies = state.network.lobbies;

      if (lobbies.length === 0) {
        cliLog('No lobbies available', 'info');
      } else {
        cliLog('Available lobbies:', 'info');
        lobbies.forEach(lobby => {
          const status = lobby.state === 'playing' ? '[PLAYING]' : '[WAITING]';
          cliLog(`  ${status} ${lobby.name} (${lobby.id}) - ${lobby.playerCount}/${lobby.maxPlayers} players`, 'info');
        });
      }
    }, 200);
  },

  // Start game (host only)
  game_start: (args, store) => {
    if (!network.connected) {
      cliLog('Not connected to server', 'error');
      return;
    }

    const state = store.getState();
    const lobby = state.network.currentLobby;

    if (!lobby) {
      cliLog('Not in a lobby', 'error');
      return;
    }

    if (lobby.host !== network.playerId) {
      cliLog('Only the host can start the game', 'error');
      return;
    }

    network.startGame();
  },

  // Show multiplayer status
  mp_status: (args, store) => {
    const state = store.getState();
    const net = state.network;

    if (!net.connected) {
      cliLog('Not connected to multiplayer server', 'info');
      cliLog('Use "connect <name>" to connect', 'info');
      return;
    }

    cliLog(`Connected as: ${net.playerName} (${net.playerId})`, 'info');

    if (net.currentLobby) {
      const lobby = net.currentLobby;
      cliLog(`\nCurrent lobby: ${lobby.name} (${lobby.id})`, 'info');
      cliLog(`Status: ${lobby.state}`, 'info');
      cliLog(`Players (${lobby.playerCount}/${lobby.maxPlayers}):`, 'info');
      lobby.players.forEach(player => {
        const badge = player.isHost ? '[HOST]' : '';
        cliLog(`  ${badge} ${player.name}`, 'info');
      });
    } else {
      cliLog('Not in a lobby', 'info');
      cliLog('Use "lobby_create <name> <maxPlayers>" to create one', 'info');
      cliLog('Use "lobby_list" to see available lobbies', 'info');
    }
  }
};

// Export network instance for direct use
export { network };
