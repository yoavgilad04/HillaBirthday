const landingPage = document.getElementById('landing-page');
const roomPage = document.getElementById('room-page');
const gamePage = document.getElementById('game-page');
const leaderboardPage = document.getElementById('leaderboard-page');

const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');

const joinModal = document.getElementById('join-modal');
const createModal = document.getElementById('create-modal');
const closeJoinModalBtn = document.getElementById('close-join-modal');
const closeCreateModalBtn = document.getElementById('close-create-modal');

const joinRoomSubmitBtn = document.getElementById('join-room-submit-btn');
const createRoomSubmitBtn = document.getElementById('create-room-submit-btn');

const roomCodeInput = document.getElementById('room-code-input');
const playerNameInput = document.getElementById('player-name-input');
const hostNameInput = document.getElementById('host-name-input');

const joinError = document.getElementById('join-error');
const createError = document.getElementById('create-error');
const activityError = document.getElementById('activity-error');

const displayRoomCode = document.getElementById('display-room-code');
const participantCount = document.getElementById('participant-count');
const activitiesCount = document.getElementById('activities-count');
const participantsList = document.getElementById('participants-list');
const activitiesList = document.getElementById('activities-list');

const leaveRoomBtn = document.getElementById('leave-room-btn');
const addActivityBtn = document.getElementById('add-activity-btn');
const activityNameInput = document.getElementById('activity-name-input');
const activityParticipantsInput = document.getElementById('activity-participants-input');

const hostControls = document.getElementById('host-controls');
const startGameBtn = document.getElementById('start-game-btn');

const rollActivityBtn = document.getElementById('roll-activity-btn');
const rollParticipantsBtn = document.getElementById('roll-participants-btn');
const nextActivityBtn = document.getElementById('next-activity-btn');
const endGameBtn = document.getElementById('end-game-btn');
const participantsDisplaySection = document.getElementById('participants-display-section');
const ratingSection = document.getElementById('rating-section');
const ratingList = document.getElementById('rating-list');
const skipRatingBtn = document.getElementById('skip-rating-btn');
const backToRoomBtn = document.getElementById('back-to-room-btn');

let currentRoundId = null;
let userRatings = {};

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    page.classList.add('active');
}

function showModal(modal) {
    modal.classList.add('active');
}

function hideModal(modal) {
    modal.classList.remove('active');
}

function showError(errorElement, message) {
    errorElement.textContent = message;
    errorElement.classList.add('active');
}

function hideError(errorElement) {
    errorElement.textContent = '';
    errorElement.classList.remove('active');
}

createRoomBtn.addEventListener('click', () => {
    showModal(createModal);
    hostNameInput.value = '';
    hideError(createError);
    hostNameInput.focus();
});

joinRoomBtn.addEventListener('click', () => {
    showModal(joinModal);
    roomCodeInput.value = '';
    playerNameInput.value = '';
    hideError(joinError);
    roomCodeInput.focus();
});

closeJoinModalBtn.addEventListener('click', () => {
    hideModal(joinModal);
});

closeCreateModalBtn.addEventListener('click', () => {
    hideModal(createModal);
});

joinModal.addEventListener('click', (e) => {
    if (e.target === joinModal) {
        hideModal(joinModal);
    }
});

createModal.addEventListener('click', (e) => {
    if (e.target === createModal) {
        hideModal(createModal);
    }
});

roomCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

createRoomSubmitBtn.addEventListener('click', () => {
    const hostName = hostNameInput.value.trim();
    
    hideError(createError);
    createRoomSubmitBtn.disabled = true;
    createRoomSubmitBtn.textContent = 'Creating...';
    
    createRoom(hostName)
        .then(({ roomCode }) => {
            hideModal(createModal);
            enterRoom(roomCode);
        })
        .catch((error) => {
            showError(createError, error.message);
            createRoomSubmitBtn.disabled = false;
            createRoomSubmitBtn.textContent = 'Create Game Room';
        });
});

joinRoomSubmitBtn.addEventListener('click', () => {
    const roomCode = roomCodeInput.value.trim();
    const playerName = playerNameInput.value.trim();
    
    hideError(joinError);
    joinRoomSubmitBtn.disabled = true;
    joinRoomSubmitBtn.textContent = 'Joining...';
    
    joinRoom(roomCode, playerName)
        .then(({ roomCode }) => {
            hideModal(joinModal);
            enterRoom(roomCode);
        })
        .catch((error) => {
            showError(joinError, error.message);
            joinRoomSubmitBtn.disabled = false;
            joinRoomSubmitBtn.textContent = 'Join Game';
        });
});

hostNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        createRoomSubmitBtn.click();
    }
});

playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinRoomSubmitBtn.click();
    }
});

function enterRoom(roomCode) {
    displayRoomCode.textContent = roomCode;
    showPage(roomPage);
    
    const user = getCurrentUser();
    if (user && user.is_host) {
        hostControls.style.display = 'block';
    } else {
        hostControls.style.display = 'none';
    }
    
    listenToParticipants(updateParticipantsList);
    listenToActivities(updateActivitiesList);
    
    listenToGameStatus();
}

function updateParticipantsList(participants) {
    participantCount.textContent = participants.length;
    participantsList.innerHTML = '';
    
    participants.forEach(participant => {
        const item = document.createElement('div');
        item.className = 'participant-item';
        
        if (participant.is_host) {
            item.classList.add('host');
        }
        
        item.innerHTML = `
            <span class="participant-icon">${participant.is_host ? '👑' : '👤'}</span>
            <span class="participant-name">${escapeHtml(participant.name)}</span>
            ${participant.is_host ? '<span class="host-badge">HOST</span>' : ''}
        `;
        
        participantsList.appendChild(item);
    });
}

function updateActivitiesList(activities) {
    activitiesCount.textContent = activities.length;
    
    if (activities.length === 0) {
        activitiesList.innerHTML = '<div class="empty-state">No activities yet. Add one below!</div>';
        return;
    }
    
    activitiesList.innerHTML = '';
    const user = getCurrentUser();
    const isHost = user && user.is_host;
    
    activities.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        
        let displayName = activity.name;
        if (!isHost) {
            const firstWord = activity.name.trim().split(/\s+/)[0];
            displayName = firstWord + ' ******';
        }
        
        item.innerHTML = `
            <div class="activity-info">
                <div class="activity-name">${escapeHtml(displayName)}</div>
            </div>
            <span class="participant-badge">${activity.participant_count} ${activity.participant_count === 1 ? 'person' : 'people'}</span>
        `;
        
        activitiesList.appendChild(item);
    });
}

addActivityBtn.addEventListener('click', () => {
    const activityName = activityNameInput.value.trim();
    const participantCount = activityParticipantsInput.value;
    
    hideError(activityError);
    addActivityBtn.disabled = true;
    addActivityBtn.textContent = 'Adding...';
    
    addActivity(activityName, participantCount)
        .then(() => {
            activityNameInput.value = '';
            activityParticipantsInput.value = '1';
            addActivityBtn.disabled = false;
            addActivityBtn.textContent = 'Add Activity';
        })
        .catch((error) => {
            showError(activityError, error.message);
            addActivityBtn.disabled = false;
            addActivityBtn.textContent = 'Add Activity';
        });
});

activityNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addActivityBtn.click();
    }
});

leaveRoomBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to leave the room?')) {
        leaveRoom()
            .then(() => {
                showPage(landingPage);
            });
    }
});

startGameBtn.addEventListener('click', () => {
    startGameBtn.disabled = true;
    startGameBtn.textContent = 'Starting...';
    
    startGame()
        .then(() => {
            initializeGame();
            updateGameState({ phase: 'waiting_for_activity' });
        })
        .catch((error) => {
            alert(error.message);
            startGameBtn.disabled = false;
            startGameBtn.textContent = '🎮 Start Game';
        });
});

rollActivityBtn.addEventListener('click', () => {
    const user = getCurrentUser();
    if (!user || !user.is_host) {
        alert('Only the host can roll activities');
        return;
    }
    
    rollActivityBtn.disabled = true;
    rollActivityBtn.textContent = '🎲 Rolling...';
    
    rollActivity()
        .then(() => {
            rollActivityBtn.style.display = 'none';
            rollParticipantsBtn.style.display = 'block';
            participantsDisplaySection.style.display = 'block';
            nextActivityBtn.style.display = 'none';
        })
        .catch((error) => {
            alert(error.message);
            rollActivityBtn.disabled = false;
            rollActivityBtn.textContent = '🎲 Roll Activity';
        });
});

rollParticipantsBtn.addEventListener('click', () => {
    const user = getCurrentUser();
    if (!user || !user.is_host) {
        alert('Only the host can roll participants');
        return;
    }
    
    rollParticipantsBtn.disabled = true;
    rollParticipantsBtn.textContent = '👥 Rolling...';
    
    rollParticipants()
        .then(() => {
            rollParticipantsBtn.style.display = 'none';
            nextActivityBtn.style.display = 'block';
        })
        .catch((error) => {
            alert(error.message);
            rollParticipantsBtn.disabled = false;
            rollParticipantsBtn.textContent = '👥 Roll Participants';
        });
});

nextActivityBtn.addEventListener('click', () => {
    const remaining = getAvailableActivitiesCount();
    
    if (remaining === 0) {
        if (confirm('No more activities! End the game?')) {
            endGameBtn.click();
        }
        return;
    }
    
    resetCurrentActivity();
    resetGameUI();
});

endGameBtn.addEventListener('click', () => {
    const user = getCurrentUser();
    if (!user || !user.is_host) {
        alert('Only the host can end the game');
        return;
    }
    
    if (confirm('Are you sure you want to end the game and show final scores?')) {
        endGameBtn.disabled = true;
        
        endGame()
            .catch((error) => {
                alert(error.message);
                endGameBtn.disabled = false;
            });
    }
});

function resetGameUI() {
    rollActivityBtn.style.display = 'block';
    rollActivityBtn.disabled = false;
    rollActivityBtn.textContent = '🎲 Roll Activity';
    
    rollParticipantsBtn.style.display = 'none';
    rollParticipantsBtn.disabled = false;
    rollParticipantsBtn.textContent = '👥 Roll Participants';
    
    nextActivityBtn.style.display = 'none';
    participantsDisplaySection.style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.addEventListener('beforeunload', () => {
    leaveRoom();
});

function listenToGameStatus() {
    if (!getCurrentRoom()) return;
    
    const statusRef = database.ref(`rooms/${getCurrentRoom()}/status`);
    
    statusRef.on('value', (snapshot) => {
        const status = snapshot.val();
        
        if (status === 'playing') {
            showPage(gamePage);
            initializeGame();
        } else if (status === 'waiting') {
            showPage(roomPage);
        } else if (status === 'ended') {
            const gameStateRef = database.ref(`rooms/${getCurrentRoom()}/game_state`);
            gameStateRef.once('value').then((stateSnapshot) => {
                const gameState = stateSnapshot.val();
                if (gameState && gameState.final_scores) {
                    showLeaderboard(gameState.final_scores);
                }
            });
        }
    });
}
