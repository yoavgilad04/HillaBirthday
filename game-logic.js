let currentGameState = {
    activities: [],
    usedActivities: [],
    currentActivity: null,
    selectedParticipants: [],
    participants: [],
    phase: 'waiting'
};

let gameListener = null;
let gameStateListener = null;

function initializeGame() {
    if (!getCurrentRoom()) return;

    const roomRef = database.ref(`rooms/${getCurrentRoom()}`);
    
    roomRef.once('value').then((snapshot) => {
        const roomData = snapshot.val();
        
        if (!roomData) return;
        
        currentGameState.activities = roomData.activities ? 
            Object.keys(roomData.activities).map(key => ({
                id: key,
                ...roomData.activities[key]
            })) : [];
        
        currentGameState.participants = roomData.participants ? 
            Object.keys(roomData.participants).map(key => ({
                id: key,
                ...roomData.participants[key]
            })) : [];
        
        currentGameState.usedActivities = [];
        updateActivitiesRemaining();
        
        listenToGameState();
    });
    
    gameListener = roomRef.child('status').on('value', (snapshot) => {
        if (snapshot.val() === 'waiting') {
            stopGameStateListener();
            if (typeof showPage !== 'undefined') {
                const roomPageElement = document.getElementById('room-page');
                if (roomPageElement) showPage(roomPageElement);
            }
        }
    });
}

function listenToGameState() {
    if (!getCurrentRoom()) return;
    
    const gameStateRef = database.ref(`rooms/${getCurrentRoom()}/game_state`);
    
    gameStateListener = gameStateRef.on('value', (snapshot) => {
        if (!snapshot.exists()) return;
        
        const gameState = snapshot.val();
        
        if (typeof handleGameStateUpdate === 'function') {
            handleGameStateUpdate(gameState);
        }
    });
}

function stopGameStateListener() {
    if (gameStateListener && getCurrentRoom()) {
        database.ref(`rooms/${getCurrentRoom()}/game_state`).off('value', gameStateListener);
        gameStateListener = null;
    }
}

function updateActivitiesRemaining() {
    const remaining = currentGameState.activities.length - currentGameState.usedActivities.length;
    const remainingElement = document.getElementById('activities-remaining');
    if (remainingElement) {
        remainingElement.textContent = remaining;
    }
}

function rollActivity() {
    return new Promise((resolve, reject) => {
        const user = getCurrentUser();
        if (!user || !user.is_host) {
            reject(new Error('Only host can roll activity'));
            return;
        }
        
        const availableActivities = currentGameState.activities.filter(
            activity => !currentGameState.usedActivities.includes(activity.id)
        );
        
        if (availableActivities.length === 0) {
            reject(new Error('No more activities left!'));
            return;
        }
        
        updateGameState({ phase: 'rolling_activity', current_activity: null, selected_participants: [] })
            .then(() => {
                return new Promise((resolveDelay) => setTimeout(resolveDelay, 2500));
            })
            .then(() => {
                const selectedActivity = getRandomElement(availableActivities);
                currentGameState.currentActivity = selectedActivity;
                currentGameState.usedActivities.push(selectedActivity.id);
                
                return updateGameState({ 
                    phase: 'activity_revealed', 
                    current_activity: selectedActivity,
                    used_activities: currentGameState.usedActivities
                });
            })
            .then(() => {
                updateActivitiesRemaining();
                resolve();
            })
            .catch(reject);
    });
}

function rollParticipants() {
    return new Promise((resolve, reject) => {
        const user = getCurrentUser();
        if (!user || !user.is_host) {
            reject(new Error('Only host can roll participants'));
            return;
        }
        
        if (!currentGameState.currentActivity) {
            reject(new Error('No activity selected'));
            return;
        }
        
        const count = currentGameState.currentActivity.participant_count;
        
        if (currentGameState.participants.length < count) {
            reject(new Error(`Not enough participants. Need ${count}, have ${currentGameState.participants.length}`));
            return;
        }
        
        updateGameState({ phase: 'rolling_participants' })
            .then(() => {
                return new Promise((resolveDelay) => setTimeout(resolveDelay, 2800));
            })
            .then(() => {
                const selectedParticipants = getRandomElements(currentGameState.participants, count);
                currentGameState.selectedParticipants = selectedParticipants;
                
                return updateGameState({ 
                    phase: 'participants_revealed', 
                    selected_participants: selectedParticipants.map(p => p.id)
                });
            })
            .then(() => {
                resolve();
            })
            .catch(reject);
    });
}

function resetCurrentActivity() {
    const user = getCurrentUser();
    if (!user || !user.is_host) return;
    
    currentGameState.currentActivity = null;
    currentGameState.selectedParticipants = [];
    
    return updateGameState({ 
        phase: 'waiting_for_activity',
        current_activity: null,
        selected_participants: []
    });
}

function updateGameState(stateUpdate) {
    if (!getCurrentRoom()) return Promise.reject(new Error('Not in a room'));
    
    const gameStateRef = database.ref(`rooms/${getCurrentRoom()}/game_state`);
    return gameStateRef.update(stateUpdate);
}

function endGame() {
    return new Promise((resolve, reject) => {
        if (!getCurrentRoom() || !getCurrentUser() || !getCurrentUser().is_host) {
            reject(new Error('Only the host can end the game'));
            return;
        }
        
        const roomRef = database.ref(`rooms/${getCurrentRoom()}`);
        
        calculateFinalScores()
            .then((scores) => {
                return updateGameState({ 
                    phase: 'game_ended',
                    final_scores: scores
                });
            })
            .then(() => {
                return roomRef.update({ status: 'ended' });
            })
            .then(() => {
                resolve();
            })
            .catch((error) => {
                reject(error);
            });
    });
}

function calculateFinalScores() {
    return new Promise((resolve) => {
        if (!getCurrentRoom()) {
            resolve([]);
            return;
        }
        
        const ratingsRef = database.ref(`rooms/${getCurrentRoom()}/ratings`);
        
        ratingsRef.once('value').then((snapshot) => {
            const scores = {};
            
            currentGameState.participants.forEach(participant => {
                scores[participant.id] = {
                    name: participant.name,
                    total_score: 0,
                    times_selected: 0
                };
            });
            
            if (snapshot.exists()) {
                const ratings = snapshot.val();
                
                Object.keys(ratings).forEach(roundKey => {
                    const roundRatings = ratings[roundKey];
                    
                    Object.keys(roundRatings).forEach(participantId => {
                        if (scores[participantId]) {
                            scores[participantId].times_selected += 1;
                            
                            const participantRatings = roundRatings[participantId];
                            Object.keys(participantRatings).forEach(voterId => {
                                scores[participantId].total_score += participantRatings[voterId] || 0;
                            });
                        }
                    });
                });
            }
            
            const sortedScores = Object.keys(scores)
                .map(id => ({
                    id,
                    ...scores[id]
                }))
                .sort((a, b) => b.total_score - a.total_score);
            
            resolve(sortedScores);
        });
    });
}

function submitRating(participantId, rating) {
    if (!getCurrentRoom() || !getCurrentUser()) return Promise.reject(new Error('Not in a room'));
    
    const roundId = `round_${Date.now()}`;
    const voterId = getCurrentUser().id;
    const ratingRef = database.ref(`rooms/${getCurrentRoom()}/ratings/${roundId}/${participantId}/${voterId}`);
    
    return ratingRef.set(rating);
}

function createConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            
            container.appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 3500);
        }, i * 30);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getAvailableActivitiesCount() {
    return currentGameState.activities.length - currentGameState.usedActivities.length;
}

function getCurrentGameState() {
    return currentGameState;
}
