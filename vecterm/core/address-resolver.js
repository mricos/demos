/**
 * Address Resolver - Topology-Aware Address Resolution
 *
 * Resolves scoped addresses based on player position and topology:
 * - @me → your position
 * - @left → left neighbor in topology
 * - @right → right neighbor in topology
 * - @all → broadcast to all players
 * - @player1, @player2, etc. → specific player
 *
 * Examples:
 *   Input: /tines/osc1/freq
 *   Scope: @me
 *   Output: /player2/tines/osc1/freq (if you are player2)
 *
 *   Input: /tines/osc1/freq
 *   Scope: @left
 *   Output: /player1/tines/osc1/freq (if your left neighbor is player1)
 */

export class AddressResolver {
  constructor(lobbyManager) {
    this.lobby = lobbyManager;
  }

  /**
   * Resolve scoped address to full player-namespaced address(es)
   *
   * @param {string} address - Address like /tines/osc1/freq
   * @param {string} scope - Scope like @me, @left, @right, @all, @player1, etc.
   * @returns {string|string[]} - Resolved address(es)
   */
  resolve(address, scope = '@me') {
    // Normalize scope (add @ if missing)
    if (!scope.startsWith('@')) {
      scope = '@' + scope;
    }

    // Parse address
    const parts = address.split('/').filter(Boolean);

    if (parts.length === 0) {
      console.warn('Invalid address:', address);
      return address;
    }

    // Get topology and my position
    const topology = this.lobby.topology;
    const myPosition = this.lobby.getMyPosition();

    if (!topology) {
      // No lobby - solo play mode
      // Everything resolves to player1
      return this.buildAddress('player1', parts);
    }

    // Resolve scope to target position(s)
    let targetPositions;

    switch (scope) {
      case '@me':
        targetPositions = [myPosition];
        break;

      case '@left':
        const leftNeighbor = topology.neighborhoods[myPosition]?.left;
        targetPositions = leftNeighbor ? [leftNeighbor] : [myPosition];
        break;

      case '@right':
        const rightNeighbor = topology.neighborhoods[myPosition]?.right;
        targetPositions = rightNeighbor ? [rightNeighbor] : [myPosition];
        break;

      case '@all':
        // All positions in topology
        targetPositions = Object.keys(topology.neighborhoods);
        break;

      default:
        // Check if it's an explicit player position (@player1, @player2, etc.)
        const playerMatch = scope.match(/@(player\d+)/);
        if (playerMatch) {
          const position = playerMatch[1];
          if (topology.neighborhoods[position]) {
            targetPositions = [position];
          } else {
            console.warn(`Invalid player position: ${position}`);
            targetPositions = [myPosition]; // Fallback to self
          }
        } else {
          console.warn(`Invalid scope: ${scope}`);
          targetPositions = [myPosition]; // Fallback to self
        }
    }

    // Build resolved addresses
    const resolved = targetPositions.map(pos => this.buildAddress(pos, parts));

    // Return single address or array
    return resolved.length === 1 ? resolved[0] : resolved;
  }

  /**
   * Build full address with player position prefix
   */
  buildAddress(playerPosition, addressParts) {
    return '/' + playerPosition + '/' + addressParts.join('/');
  }

  /**
   * Parse full address into components
   *
   * @param {string} fullAddress - Address like /player2/tines/osc1/freq
   * @returns {object} - { playerPosition, module, instance, param }
   */
  parse(fullAddress) {
    const parts = fullAddress.split('/').filter(Boolean);

    if (parts.length < 3) {
      console.warn('Invalid full address:', fullAddress);
      return null;
    }

    return {
      playerPosition: parts[0],
      module: parts[1],
      instance: parts[2],
      param: parts[3] || null,
      fullAddress: fullAddress
    };
  }

  /**
   * Check if address is local (targets my position)
   */
  isLocal(fullAddress) {
    const parsed = this.parse(fullAddress);
    if (!parsed) return false;

    const myPosition = this.lobby.getMyPosition();
    return parsed.playerPosition === myPosition;
  }

  /**
   * Get target player ID from full address
   */
  getTargetPlayerId(fullAddress) {
    const parsed = this.parse(fullAddress);
    if (!parsed) return null;

    const playerEntry = this.lobby.getPlayerByPosition(parsed.playerPosition);
    return playerEntry ? playerEntry[0] : null; // Return player ID
  }

  /**
   * Get all neighbors of current player
   */
  getNeighbors() {
    const topology = this.lobby.topology;
    if (!topology) return { left: null, right: null };

    const myPosition = this.lobby.getMyPosition();
    const neighborhood = topology.neighborhoods[myPosition];

    return {
      left: neighborhood?.left || null,
      right: neighborhood?.right || null
    };
  }

  /**
   * Resolve scope to player positions (without building full address)
   */
  resolveScope(scope) {
    // Normalize scope
    if (!scope.startsWith('@')) {
      scope = '@' + scope;
    }

    const topology = this.lobby.topology;
    const myPosition = this.lobby.getMyPosition();

    if (!topology) {
      return ['player1']; // Solo mode
    }

    switch (scope) {
      case '@me':
        return [myPosition];

      case '@left':
        const left = topology.neighborhoods[myPosition]?.left;
        return left ? [left] : [myPosition];

      case '@right':
        const right = topology.neighborhoods[myPosition]?.right;
        return right ? [right] : [myPosition];

      case '@all':
        return Object.keys(topology.neighborhoods);

      default:
        const playerMatch = scope.match(/@(player\d+)/);
        if (playerMatch) {
          const position = playerMatch[1];
          return topology.neighborhoods[position] ? [position] : [myPosition];
        }
        return [myPosition];
    }
  }

  /**
   * Get position display name (for UI)
   */
  getPositionDisplayName(position) {
    const playerEntry = this.lobby.getPlayerByPosition(position);
    if (playerEntry) {
      const [playerId, playerData] = playerEntry;
      return `${playerData.name} (${position})`;
    }
    return position;
  }

  /**
   * Validate address format
   */
  isValidAddress(address) {
    const parts = address.split('/').filter(Boolean);
    // Need at least module/instance
    return parts.length >= 2;
  }

  /**
   * Validate scope format
   */
  isValidScope(scope) {
    // Normalize scope
    if (!scope.startsWith('@')) {
      scope = '@' + scope;
    }

    const validScopes = ['@me', '@left', '@right', '@all'];
    if (validScopes.includes(scope)) return true;

    // Check player position pattern
    return /@player[1-4]/.test(scope);
  }

  /**
   * Get topology visualization for debugging
   */
  getTopologyMap() {
    const topology = this.lobby.topology;
    if (!topology) return 'No topology (solo mode)';

    const myPosition = this.lobby.getMyPosition();
    let map = `Topology: ${topology.name}\n`;
    map += `Max Players: ${topology.maxPlayers}\n\n`;

    Object.entries(topology.neighborhoods).forEach(([position, neighbors]) => {
      const marker = position === myPosition ? '→' : ' ';
      const playerName = this.getPositionDisplayName(position);

      map += `${marker} ${playerName}\n`;
      map += `   Left:  ${neighbors.left || 'none'}\n`;
      map += `   Right: ${neighbors.right || 'none'}\n\n`;
    });

    return map;
  }

  /**
   * Test address resolution (for debugging)
   */
  testResolve(address, scope) {
    console.log(`\n=== Address Resolution Test ===`);
    console.log(`Input Address: ${address}`);
    console.log(`Scope: ${scope}`);
    console.log(`My Position: ${this.lobby.getMyPosition()}`);

    const resolved = this.resolve(address, scope);

    if (Array.isArray(resolved)) {
      console.log(`Resolved (broadcast):`);
      resolved.forEach(addr => console.log(`  → ${addr}`));
    } else {
      console.log(`Resolved: ${resolved}`);
    }

    console.log(`==============================\n`);
    return resolved;
  }
}

// Create singleton instance (will be initialized with lobby later)
export let addressResolver = null;

export function initializeAddressResolver(lobbyManager) {
  addressResolver = new AddressResolver(lobbyManager);
  return addressResolver;
}
