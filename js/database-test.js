const statusElement = document.getElementById('connection-status');
const testWriteBtn = document.getElementById('test-write-btn');
const testReadBtn = document.getElementById('test-read-btn');
const testResultElement = document.getElementById('test-result');

function updateStatus(message, type) {
    statusElement.className = `status-indicator ${type}`;
    statusElement.innerHTML = `<span>${message}</span>`;
}

function displayResult(message, isError = false) {
    testResultElement.textContent = message;
    testResultElement.style.background = isError ? '#FFEBEE' : '#E8F5E9';
    testResultElement.style.color = isError ? '#f44336' : '#4CAF50';
}

function testConnection() {
    const connectedRef = database.ref('.info/connected');
    
    connectedRef.on('value', (snapshot) => {
        if (snapshot.val() === true) {
            updateStatus('✅ Connected to Firebase!', 'connected');
        } else {
            updateStatus('❌ Disconnected from Firebase', 'error');
        }
    });
}

function testWrite() {
    testWriteBtn.disabled = true;
    testWriteBtn.textContent = 'Writing...';
    
    const testRef = database.ref('test/connection');
    const testData = {
        message: 'Hello from Hilla Birthday Game!',
        timestamp: Date.now(),
        status: 'success'
    };
    
    testRef.set(testData)
        .then(() => {
            displayResult(`✅ Write successful!\n\nData written:\n${JSON.stringify(testData, null, 2)}`, false);
            testWriteBtn.disabled = false;
            testWriteBtn.textContent = 'Write Test Data';
        })
        .catch((error) => {
            displayResult(`❌ Write failed:\n${error.message}`, true);
            testWriteBtn.disabled = false;
            testWriteBtn.textContent = 'Write Test Data';
        });
}

function testRead() {
    testReadBtn.disabled = true;
    testReadBtn.textContent = 'Reading...';
    
    const testRef = database.ref('test/connection');
    
    testRef.once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                displayResult(`✅ Read successful!\n\nData retrieved:\n${JSON.stringify(data, null, 2)}`, false);
            } else {
                displayResult('⚠️ No data found. Try writing data first!', false);
            }
            testReadBtn.disabled = false;
            testReadBtn.textContent = 'Read Test Data';
        })
        .catch((error) => {
            displayResult(`❌ Read failed:\n${error.message}`, true);
            testReadBtn.disabled = false;
            testReadBtn.textContent = 'Read Test Data';
        });
}

testWriteBtn.addEventListener('click', testWrite);
testReadBtn.addEventListener('click', testRead);

testConnection();
