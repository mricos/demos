const AppState = {
    IDLE: 'IDLE',
    RUNNING: 'RUNNING',
    PAUSED: 'PAUSED',
    ERROR: 'ERROR'
};

class StateManager {
    constructor() {
        this.currentState = AppState.IDLE;
        this.listeners = [];
    }

    setState(newState) {
        if (!Object.values(AppState).includes(newState)) {
            console.error(`Invalid state transition to ${newState}`);
            return;
        }
        this.currentState = newState;
        this.notifyListeners();
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(callback => callback(this.currentState));
    }
}

// Initialize the state manager
window.stateManager = new StateManager();

// Add state transition subscriptions
window.PubSub.subscribe('startTraining', () => {
    if (window.stateManager.currentState !== AppState.RUNNING) {
        window.stateManager.setState(AppState.RUNNING);
    }
});

window.PubSub.subscribe('pauseTraining', () => {
    if (window.stateManager.currentState === AppState.RUNNING) {
        window.stateManager.setState(AppState.PAUSED);
    }
});

window.PubSub.subscribe('trainingCompleted', () => {
    window.stateManager.setState(AppState.IDLE);
});
