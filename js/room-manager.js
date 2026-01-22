let currentRoom = null;
let currentUser = null;
let participantsListener = null;
let activitiesListener = null;

function createRoom(hostName) {
    return new Promise((resolve, reject) => {
        if (!hostName || hostName.trim() === '') {
            reject(new Error('Please enter your name'));
            return;
        }

        const roomCode = generateRoomCode();
        const userId = generateUserId();
        const timestamp = Date.now();

        const roomData = {
            host: userId,
            status: 'waiting',
            created_at: timestamp,
            participants: {
                [userId]: {
                    name: hostName.trim(),
                    joined_at: timestamp,
                    is_host: true
                }
            },
            activities: {}
        };

        const roomRef = database.ref(`rooms/${roomCode}`);
        
        roomRef.set(roomData)
            .then(() => {
                currentRoom = roomCode;
                currentUser = {
                    id: userId,
                    name: hostName.trim(),
                    is_host: true
                };
                
                localStorage.setItem('currentRoom', roomCode);
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                roomRef.onDisconnect().remove();
                
                resolve({ roomCode, userId });
            })
            .catch((error) => {
                reject(error);
            });
    });
}

function joinRoom(roomCode, playerName) {
    return new Promise((resolve, reject) => {
        if (!roomCode || roomCode.trim().length !== 6) {
            reject(new Error('Please enter a valid 6-character room code'));
            return;
        }

        if (!playerName || playerName.trim() === '') {
            reject(new Error('Please enter your name'));
            return;
        }

        const normalizedCode = roomCode.trim().toUpperCase();
        const roomRef = database.ref(`rooms/${normalizedCode}`);

        roomRef.once('value')
            .then((snapshot) => {
                if (!snapshot.exists()) {
                    reject(new Error('Room not found. Check the code and try again.'));
                    return;
                }

                const roomData = snapshot.val();
                
                if (roomData.status === 'playing') {
                    reject(new Error('Game already in progress. Cannot join now.'));
                    return;
                }

                const userId = generateUserId();
                const timestamp = Date.now();

                const participantData = {
                    name: playerName.trim(),
                    joined_at: timestamp,
                    is_host: false
                };

                const participantRef = roomRef.child(`participants/${userId}`);
                
                participantRef.set(participantData)
                    .then(() => {
                        currentRoom = normalizedCode;
                        currentUser = {
                            id: userId,
                            name: playerName.trim(),
                            is_host: false
                        };
                        
                        localStorage.setItem('currentRoom', normalizedCode);
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                        
                        participantRef.onDisconnect().remove();
                        
                        resolve({ roomCode: normalizedCode, userId });
                    })
                    .catch((error) => {
                        reject(error);
                    });
            })
            .catch((error) => {
                reject(error);
            });
    });
}

function leaveRoom() {
    if (!currentRoom || !currentUser) {
        return Promise.resolve();
    }

    const roomRef = database.ref(`rooms/${currentRoom}`);
    const userRef = roomRef.child(`participants/${currentUser.id}`);

    if (participantsListener) {
        database.ref(`rooms/${currentRoom}/participants`).off('value', participantsListener);
        participantsListener = null;
    }
    
    if (activitiesListener) {
        database.ref(`rooms/${currentRoom}/activities`).off('value', activitiesListener);
        activitiesListener = null;
    }

    userRef.onDisconnect().cancel();

    if (currentUser.is_host) {
        roomRef.onDisconnect().cancel();
        return roomRef.remove()
            .then(() => {
                localStorage.removeItem('currentRoom');
                localStorage.removeItem('currentUser');
                currentRoom = null;
                currentUser = null;
            });
    } else {
        return userRef.remove()
            .then(() => {
                localStorage.removeItem('currentRoom');
                localStorage.removeItem('currentUser');
                currentRoom = null;
                currentUser = null;
            });
    }
}

function addActivity(activityName, participantCount) {
    return new Promise((resolve, reject) => {
        if (!currentRoom || !currentUser) {
            reject(new Error('Not in a room'));
            return;
        }

        if (!activityName || activityName.trim() === '') {
            reject(new Error('Please enter an activity name'));
            return;
        }

        const count = parseInt(participantCount);
        if (isNaN(count) || count < 1 || count > 20) {
            reject(new Error('Participant count must be between 1 and 20'));
            return;
        }

        const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const activityData = {
            name: activityName.trim(),
            participant_count: count,
            submitted_by: currentUser.id,
            created_at: Date.now()
        };

        const activityRef = database.ref(`rooms/${currentRoom}/activities/${activityId}`);
        
        activityRef.set(activityData)
            .then(() => {
                resolve(activityId);
            })
            .catch((error) => {
                reject(error);
            });
    });
}

function listenToParticipants(callback) {
    if (!currentRoom) return;

    const participantsRef = database.ref(`rooms/${currentRoom}/participants`);
    
    participantsListener = participantsRef.on('value', (snapshot) => {
        const participants = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                participants.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
        }
        
        participants.sort((a, b) => a.joined_at - b.joined_at);
        callback(participants);
    });
}

function listenToActivities(callback) {
    if (!currentRoom) return;

    const activitiesRef = database.ref(`rooms/${currentRoom}/activities`);
    
    activitiesListener = activitiesRef.on('value', (snapshot) => {
        const activities = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                activities.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
        }
        
        activities.sort((a, b) => a.created_at - b.created_at);
        callback(activities);
    });
}

function startGame() {
    return new Promise((resolve, reject) => {
        if (!currentRoom || !currentUser || !currentUser.is_host) {
            reject(new Error('Only the host can start the game'));
            return;
        }

        const roomRef = database.ref(`rooms/${currentRoom}`);
        
        roomRef.once('value')
            .then((snapshot) => {
                const roomData = snapshot.val();
                
                if (!roomData.activities || Object.keys(roomData.activities).length === 0) {
                    reject(new Error('Add at least one activity before starting'));
                    return;
                }
                
                const participantCount = Object.keys(roomData.participants).length;
                if (participantCount < 2) {
                    reject(new Error('Need at least 2 participants to start'));
                    return;
                }

                return roomRef.update({ status: 'playing' });
            })
            .then(() => {
                resolve();
            })
            .catch((error) => {
                reject(error);
            });
    });
}

function getCurrentRoom() {
    return currentRoom;
}

function getCurrentUser() {
    return currentUser;
}
