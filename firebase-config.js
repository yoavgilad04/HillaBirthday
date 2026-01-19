const firebaseConfig = {
    apiKey: "AIzaSyCw_CkMBwnCe1vagAe3_EYrqeG1d32NVgc",
    authDomain: "hilla-birthday-game.firebaseapp.com",
    databaseURL: "https://hilla-birthday-game-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "hilla-birthday-game",
    storageBucket: "hilla-birthday-game.firebasestorage.app",
    messagingSenderId: "370117536308",
    appId: "1:370117536308:web:6597485c3d98c9dfa97861"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
