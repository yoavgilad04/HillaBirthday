let blessingsListener = null;

function addBlessing(name, message, photoFile) {
    return new Promise((resolve, reject) => {
        if (!name || name.trim() === '') {
            reject(new Error('Please enter your name'));
            return;
        }

        if (!message || message.trim() === '') {
            reject(new Error('Please write a message'));
            return;
        }

        const blessingId = `blessing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = Date.now();

        if (photoFile) {
            const storageRef = storage.ref(`blessings/${blessingId}/${photoFile.name}`);
            const uploadTask = storageRef.put(photoFile);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Upload is ' + progress + '% done');
                },
                (error) => {
                    reject(error);
                },
                () => {
                    uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                        const blessingData = {
                            name: name.trim(),
                            message: message.trim(),
                            photo_url: downloadURL,
                            created_at: timestamp
                        };

                        saveBlessingToDatabase(blessingId, blessingData)
                            .then(() => resolve(blessingId))
                            .catch(reject);
                    });
                }
            );
        } else {
            const blessingData = {
                name: name.trim(),
                message: message.trim(),
                photo_url: null,
                created_at: timestamp
            };

            saveBlessingToDatabase(blessingId, blessingData)
                .then(() => resolve(blessingId))
                .catch(reject);
        }
    });
}

function saveBlessingToDatabase(blessingId, blessingData) {
    const blessingRef = database.ref(`blessings/${blessingId}`);
    return blessingRef.set(blessingData);
}

function listenToBlessings(callback) {
    const blessingsRef = database.ref('blessings');
    
    blessingsListener = blessingsRef.on('value', (snapshot) => {
        const blessings = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                blessings.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
        }
        
        blessings.sort((a, b) => b.created_at - a.created_at);
        callback(blessings);
    });
}

function stopListeningToBlessings() {
    if (blessingsListener) {
        database.ref('blessings').off('value', blessingsListener);
        blessingsListener = null;
    }
}
