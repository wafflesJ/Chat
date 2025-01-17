// Import Firebase methods from the module
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, set, get, child, push } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";  // <-- Add push here

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBG1tMotVmZ0f4m1WvLjnnyFNKi2By8sCM",
    authDomain: "chat-e8744.firebaseapp.com",
    databaseURL: "https://chat-e8744-default-rtdb.firebaseio.com",
    projectId: "chat-e8744",
    storageBucket: "chat-e8744.firebasestorage.app",
    messagingSenderId: "1027837600017",
    appId: "1:1027837600017:web:9c91324fba108af9fbecb0",
    measurementId: "G-4NYBJF0BNW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the Firebase Realtime Database
const db = getDatabase(app);

const loginPage = document.getElementById('loginPage');
const chatPage = document.getElementById('chatPage');
const loginForm = document.getElementById('loginForm');
const userIDInput = document.getElementById('userID');
const passwordInput = document.getElementById('password');
const messageList = document.getElementById('messageList');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const imageInput = document.getElementById('imageInput');

// State
let userID = null;
let socket = null;

// Add a message to the list
function addMessage(content, isSelf = false, isImage = false) {
    const message = document.createElement('div');
    message.className = 'message' + (isSelf ? ' self' : '');
    if (isImage) {
        const img = document.createElement('img');
        img.src = content;
        message.appendChild(img);
    } else {
        message.textContent = content;
    }
    messageList.appendChild(message);
    messageList.scrollTop = messageList.scrollHeight; // Auto-scroll to the bottom
}

// WebSocket event handlers


function setupWebSocket() {
    if (socket) return; // If socket already exists, don't create a new one

    socket = new WebSocket("wss://websockets-3ihk.onrender.com"); // Replace with your server URL

    socket.onopen = () => {
        console.log('WebSocket connection established.');
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.userID !== userID) {
                if (data.type === "message") {
                    addMessage(`[${data.userID}]: ${data.content}`);
                } else if (data.type === "image") {
                    addMessage(data.content, false, true);
                }
            }
        } catch (err) {
            console.error("Error parsing message:", err);
        }
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
        console.log('WebSocket connection closed.');
    };
}


// Handle login
// Your existing code...

// Check if the user is already logged in and the login is not expired
function checkLoginStatus() {
    const storedUserID = localStorage.getItem('userID');
    const storedTimestamp = localStorage.getItem('loginTimestamp');
        console.log(storedTimestamp);
    if (storedUserID && storedTimestamp) {
        const currentTime = Date.now();
        const oneWeekInMillis = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

        // If the login is still valid (less than 1 week old), use the stored userID
        if (currentTime - storedTimestamp < oneWeekInMillis) {
            userID = storedUserID;
            loginPage.style.display = 'none';
            chatPage.style.display = 'block';
            setupWebSocket();
            loadMessagesFromFirebase();
        } else {
          
            // If login expired, clear localStorage and show login page
            localStorage.removeItem('userID');
            localStorage.removeItem('loginTimestamp');
            loginPage.style.display = 'block';
            chatPage.style.display = 'none';
        }
    } else {
        // No stored userID, show login page
        loginPage.style.display = 'block';
        chatPage.style.display = 'none';
    }
}

// Function to check if the user exists and create a new account if needed
function checkUserExistence(userID, password) {
    const userRef = ref(db, 'users/' + userID);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            console.log("User exists:", userID);
            // User exists, proceed to login
            loginUser(userID,password);
        } else {
            // User does not exist, create a new account with the password
            createNewAccount(userID, password);
        }
    }).catch((error) => {
        console.error("Error checking user existence:", error);
    });
}

// Function to log in the user
// Function to log in the user
function loginUser(userID, password) {
    const userRef = ref(db, 'users/' + userID);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const storedPassword = snapshot.val().password; // Get the stored password from Firebase

            if (storedPassword === password) {
                // Password matches, proceed with login
                // Store userID and timestamp in localStorage for persistent login
                localStorage.setItem('userID', userID);
                localStorage.setItem('loginTimestamp', Date.now());

                // Proceed to chat page
                loginPage.style.display = 'none';
                chatPage.style.display = 'block';
                setupWebSocket();
                loadMessagesFromFirebase();
            } else {
                // Password doesn't match, show an error message
                //alert("Incorrect password.");
            }
        } else {
            // User does not exist, show an error message
           ///alert("User does not exist.");
        }
    }).catch((error) => {
        console.error("Error logging in:", error);
    });
}

// Handle login form submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    userID = userIDInput.value.trim();
    const password = document.getElementById('password').value.trim(); // Assuming there's a password input

    if (userID && password) {
        // Check if the user exists and validate the password
        loginUser(userID, password);
    }
});


// Function to create a new account
function createNewAccount(userID, password) {
    const newUserRef = ref(db, 'users/' + userID);
    set(newUserRef, {
        password: password
    }).then(() => {
        console.log("New account created for:", userID);
        // After creating the account, log the user in
        loginUser(userID);
    }).catch((error) => {
        console.error("Error creating account:", error);
    });
}

// Handle login form submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    userID = userIDInput.value.trim();
    const password = document.getElementById('password').value.trim(); // Assuming there's a password input

    if (userID && password) {
        // Check if the user exists or create a new account
        checkUserExistence(userID, password);
    }
});

// Handle sign out
function signOut() {
    localStorage.removeItem('userID');
    localStorage.removeItem('loginTimestamp');
    loginPage.style.display = 'block';
    chatPage.style.display = 'none';
}

// Call checkLoginStatus() when the page loads
checkLoginStatus();

// Add sign out functionality (you can attach this to a sign-out button)
const signOutButton = document.getElementById('signOutButton');
if (signOutButton) {
    signOutButton.addEventListener('click', signOut);
}



// Handle sending messages or images
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    const imageFile = imageInput.files[0];

    if (message) {
        const payload = { type: "message", content: message, userID };
        addMessage(`[You]: ${message}`, true);
        socket.send(JSON.stringify(payload));
        saveMessageToFirebase(payload);
        messageInput.value = '';
    }

    if (imageFile) {
        const reader = new FileReader();
        reader.onload = () => {
            const payload = { type: "image", content: reader.result, userID };
            addMessage(reader.result, true, true);
            socket.send(JSON.stringify(payload));
            saveMessageToFirebase(payload);
        };
        reader.readAsDataURL(imageFile);
        imageInput.value = ''; // Clear the file input
    }
});

// Save a message to Firebase Realtime Database
// Save a message to Firebase Realtime Database
function saveMessageToFirebase(message) {
    const messagesRef = ref(db, 'messages');
    const newMessageRef = push(messagesRef);  // Use push() to create a new child node
    const timestamp = Date.now();  // Current timestamp in milliseconds

    const messageWithTimestamp = {
        ...message,
        timestamp: timestamp  // Add timestamp to the message
    };

    set(newMessageRef, messageWithTimestamp)  // Use set() to store the data in that new child node
        .then(() => console.log("Message saved to Firebase"))
        .catch((error) => console.error("Error saving message:", error));
}


// Load messages from Firebase Realtime Database
// Load messages from Firebase Realtime Database
function loadMessagesFromFirebase() {
    const messagesRef = ref(db, 'messages');
    get(messagesRef).then((snapshot) => {
        if (snapshot.exists()) {
            messageList.innerHTML = ''; // Clear the list before reloading messages
            const currentTime = Date.now();  // Current timestamp
            const threeDaysAgo = currentTime - (3 * 24 * 60 * 60 * 1000);  // 3 days in milliseconds

            snapshot.forEach((childSnapshot) => {
                const message = childSnapshot.val();
                
                // Only load messages from the last 3 days
                if (message.timestamp >= threeDaysAgo) {
                    if (message.userID !== userID) {
                        if (message.type === "message") {
                            addMessage(`[${message.userID}]: ${message.content}`, message.userID === userID);
                        } else if (message.type === "image") {
                            addMessage(message.content, message.userID === userID, true);
                        }
                    } else {
                        if (message.type === "message") {
                            addMessage(`[You]: ${message.content}`, message.userID === userID);
                        } else if (message.type === "image") {
                            addMessage(message.content, message.userID === userID, true);
                        }
                    }
                }
            });
        }
    }).catch((error) => {
        console.error("Error loading messages:", error);
    });
}

