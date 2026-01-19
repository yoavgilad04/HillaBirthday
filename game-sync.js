function handleGameStateUpdate(gameState) {
    const user = getCurrentUser();
    if (!user) return;
    
    const phase = gameState.phase;
    
    showPage(gamePage);
    
    if (phase === 'rolling_activity') {
        showActivityRolling();
        hideRatingSection();
    } else if (phase === 'activity_revealed' && gameState.current_activity) {
        showActivityResult(gameState.current_activity);
        hideRatingSection();
        
        if (user.is_host) {
            showHostControls('roll_participants');
        }
    } else if (phase === 'rolling_participants') {
        showParticipantsRolling();
        hideRatingSection();
    } else if (phase === 'participants_revealed' && gameState.selected_participants) {
        const gameStateObj = getCurrentGameState();
        const selectedParticipants = gameStateObj.participants.filter(p => 
            gameState.selected_participants.includes(p.id)
        );
        showParticipantsResult(selectedParticipants);
        
        currentRoundId = `round_${Date.now()}`;
        showRatingSection(selectedParticipants);
        
        if (user.is_host) {
            showHostControls('next_activity');
        }
    } else if (phase === 'game_ended' && gameState.final_scores) {
        showLeaderboard(gameState.final_scores);
    } else if (phase === 'waiting_for_activity') {
        resetGameUI();
        
        if (user.is_host) {
            showHostControls('roll_activity');
        }
    }
}

function showActivityRolling() {
    const activityRoller = document.getElementById('activity-roller');
    const activityResult = document.getElementById('activity-result');
    
    activityResult.style.display = 'none';
    activityRoller.style.display = 'flex';
    activityRoller.classList.add('rolling');
    
    const rollerContent = activityRoller.querySelector('.roller-content');
    const emojis = ['🎯', '🎲', '🎪', '🎨', '🎭', '🎸', '⚽', '🎤', '🎬', '🎮'];
    
    const cycleInterval = setInterval(() => {
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        rollerContent.innerHTML = `
            <div class="roller-item">${randomEmoji}</div>
            <div class="roller-item">${randomEmoji}</div>
            <div class="roller-item">${randomEmoji}</div>
        `;
    }, 50);
    
    setTimeout(() => {
        clearInterval(cycleInterval);
        activityRoller.classList.remove('rolling');
    }, 2500);
}

function showActivityResult(activity) {
    const activityRoller = document.getElementById('activity-roller');
    const activityResult = document.getElementById('activity-result');
    const activityNameElement = document.getElementById('current-activity-name');
    const activityParticipantsElement = document.getElementById('current-activity-participants');
    const activityParticipantsTextElement = document.getElementById('current-activity-participants-text');
    
    activityRoller.style.display = 'none';
    
    if (activityNameElement) activityNameElement.textContent = activity.name;
    if (activityParticipantsElement) activityParticipantsElement.textContent = activity.participant_count;
    if (activityParticipantsTextElement) {
        activityParticipantsTextElement.textContent = activity.participant_count === 1 ? 'person needed' : 'people needed';
    }
    
    activityResult.style.display = 'block';
    participantsDisplaySection.style.display = 'block';
    
    createConfetti();
}

function showParticipantsRolling() {
    const participantsRoller = document.getElementById('participants-roller');
    const participantsResult = document.getElementById('participants-result');
    
    participantsResult.style.display = 'none';
    participantsResult.innerHTML = '';
    participantsRoller.style.display = 'flex';
    
    const gameStateObj = getCurrentGameState();
    const cycleInterval = setInterval(() => {
        const randomParticipant = getRandomElement(gameStateObj.participants);
        participantsRoller.innerHTML = `
            <div class="participant-rolling-item">
                👤 ${escapeHtml(randomParticipant.name)}
            </div>
        `;
    }, 80);
    
    setTimeout(() => {
        clearInterval(cycleInterval);
        participantsRoller.style.display = 'none';
    }, 2800);
}

function showParticipantsResult(participants) {
    const participantsRoller = document.getElementById('participants-roller');
    const participantsResult = document.getElementById('participants-result');
    
    participantsRoller.style.display = 'none';
    participantsResult.innerHTML = '';
    
    participants.forEach((participant, index) => {
        const participantElement = document.createElement('div');
        participantElement.className = 'selected-participant';
        participantElement.innerHTML = `
            <span style="font-size: 1.5rem;">🎯</span>
            <span>${escapeHtml(participant.name)}</span>
        `;
        participantsResult.appendChild(participantElement);
    });
    
    participantsResult.style.display = 'flex';
    createConfetti();
}

function showRatingSection(participants) {
    ratingSection.style.display = 'block';
    ratingList.innerHTML = '';
    userRatings = {};
    
    participants.forEach(participant => {
        const ratingCard = document.createElement('div');
        ratingCard.className = 'rating-card';
        
        ratingCard.innerHTML = `
            <div class="rating-card-header">
                <span style="font-size: 1.5rem;">🎯</span>
                <span class="rating-participant-name">${escapeHtml(participant.name)}</span>
            </div>
            <div class="rating-stars" data-participant-id="${participant.id}">
                ${[1, 2, 3, 4, 5].map(rating => 
                    `<button class="star-btn" data-rating="${rating}">⭐</button>`
                ).join('')}
            </div>
        `;
        
        ratingList.appendChild(ratingCard);
        
        const starBtns = ratingCard.querySelectorAll('.star-btn');
        starBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const rating = parseInt(btn.getAttribute('data-rating'));
                const participantId = btn.parentElement.getAttribute('data-participant-id');
                
                userRatings[participantId] = rating;
                
                starBtns.forEach((starBtn, index) => {
                    if (index < rating) {
                        starBtn.classList.add('active');
                    } else {
                        starBtn.classList.remove('active');
                    }
                });
                
                submitRating(participantId, rating);
            });
        });
    });
}

function hideRatingSection() {
    ratingSection.style.display = 'none';
    userRatings = {};
}

function showHostControls(control) {
    rollActivityBtn.style.display = 'none';
    rollParticipantsBtn.style.display = 'none';
    nextActivityBtn.style.display = 'none';
    
    if (control === 'roll_activity') {
        rollActivityBtn.style.display = 'block';
        rollActivityBtn.disabled = false;
        rollActivityBtn.textContent = '🎲 Roll Activity';
    } else if (control === 'roll_participants') {
        rollParticipantsBtn.style.display = 'block';
        rollParticipantsBtn.disabled = false;
        rollParticipantsBtn.textContent = '👥 Roll Participants';
    } else if (control === 'next_activity') {
        nextActivityBtn.style.display = 'block';
    }
}

function showLeaderboard(scores) {
    showPage(leaderboardPage);
    
    const leaderboardList = document.getElementById('leaderboard-list');
    leaderboardList.innerHTML = '';
    
    scores.forEach((score, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.style.setProperty('--index', index);
        
        const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
        
        item.innerHTML = `
            <div class="leaderboard-rank">${rankEmoji}</div>
            <div class="leaderboard-info">
                <div class="leaderboard-name">${escapeHtml(score.name)}</div>
            </div>
            <div class="leaderboard-score">${score.total_score}</div>
        `;
        
        leaderboardList.appendChild(item);
    });
    
    createConfetti();
}

skipRatingBtn.addEventListener('click', () => {
    hideRatingSection();
});

backToRoomBtn.addEventListener('click', () => {
    const user = getCurrentUser();
    if (!user || !user.is_host) {
        alert('Only the host can return to the room');
        return;
    }
    
    if (confirm('Return to room? This will reset the game.')) {
        const roomRef = database.ref(`rooms/${getCurrentRoom()}`);
        roomRef.update({ status: 'waiting' }).then(() => {
            showPage(roomPage);
        });
    }
});
