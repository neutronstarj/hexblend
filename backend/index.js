require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;
//for google auth 
const fetch = require('node-fetch');
const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;


// 🔹 1. Connect to MongoDB
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// 🔹 2. Middleware setup
app.use(cors());
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5001/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        // Redirect to frontend with user name in query
        const displayName = encodeURIComponent(req.user.displayName);
        res.redirect(`http://localhost:5173/?name=${displayName}`);
    }
);

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

async function getRandomNamedColor() {
    // Step 1: Get random color from Colormind
    const paletteRes = await fetch("http://colormind.io/api/", {
        method: "POST",
        body: JSON.stringify({ model: "default" })
    });

    const paletteData = await paletteRes.json();
    const [r, g, b] = paletteData.result[0]; // Just pick the first color

    // Step 2: Get color name from The Color API
    const nameRes = await fetch(`https://www.thecolorapi.com/id?rgb=${r},${g},${b}`);
    const nameData = await nameRes.json();

    return {
        name: nameData.name.value,
        hex: nameData.hex.value,
        rgb: { r, g, b }
    };
}

// 🔹 3. Define Lobby Schema & Model
const LobbySchema = new mongoose.Schema({
    code: String,
    targetColor: { r: Number, g: Number, b: Number },
    players: [{ username: String, color: { r: Number, g: Number, b: Number } }]
});
const Lobby = mongoose.model('Lobby', LobbySchema);

// 🔹 4. Generate Random Lobby Code & Colors
function generateLobbyCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateRandomColor() {
    return { r: rand255(), g: rand255(), b: rand255() };
}

function rand255() {
    return Math.floor(Math.random() * 256);
}

// 🔹 5. API Endpoints
app.get('/', (req, res) => {
    res.send('Server running.');
});

// app.post('/lobbies', async (req, res) => {
//     try {
//         const targetColor = await getRandomNamedColor();
//         const lobby = new Lobby({
//             code: generateLobbyCode(),
//             targetColor,
//             players: []
//         });

//         await lobby.save();
//         res.json({ code: lobby.code, targetColor });
//     } catch (error) {
//         console.error("Error creating lobby:", error);
//         res.status(500).json({ error: "Failed to create lobby" });
//     }
// });

app.post('/lobbies', async (req, res) => {
    try {
        const targetColor = await getRandomNamedColor();
        console.log("🎯 Generated Target Color:", targetColor); // <--- log this

        const lobby = new Lobby({
            code: generateLobbyCode(),
            targetColor,
            players: []
        });

        await lobby.save();
        res.json({ code: lobby.code, targetColor }); // make sure this is included!
    } catch (error) {
        console.error(" Error creating lobby:", error);
        res.status(500).json({ error: "Failed to create lobby" });
    }
});


app.get('/lobbies/:code', async (req, res) => {
    const lobby = await Lobby.findOne({ code: req.params.code });
    if (lobby) {
        res.json(lobby);
    } else {
        res.status(404).json({ message: 'Room not found' });
    }
});

// 🔹 6. Handle Socket.IO Connections
io.on('connection', (socket) => {
    console.log("A user connected:", socket.id); 

    // 🟢 Player Joins a Lobby
    socket.on('joinLobby', async ({ username, lobbyCode }) => {
        const lobby = await Lobby.findOne({ code: lobbyCode });
        if (!lobby) {
            socket.emit('lobbyError', 'Lobby not found');
            return;
        }

        if (!lobby.players.some(player => player.username === username)) {
            lobby.players.push({ username, color: { r: 127, g: 127, b: 127 } });
            await lobby.save();
        }

        socket.join(lobbyCode);
        broadcastLobbyUpdate(lobbyCode);
    });

    // 🟡 Player Updates Their Color
    socket.on('updateColor', async ({ username, lobbyCode, color }) => {
        const lobby = await Lobby.findOne({ code: lobbyCode });
        const player = lobby.players.find(p => p.username === username);
        if (player) {
            player.color = color;
            await lobby.save();
        }
        broadcastLobbyUpdate(lobbyCode);
    });

    // 🔴 Host Starts the Game
    socket.on('startGame', ({ lobbyCode }) => {
        console.log(`Game starting for lobby: ${lobbyCode}`);

        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        io.to(lobbyCode).emit('gameStarted', {
            targetColor: randomColor.name,
            targetHex: randomColor.hex,
            timeRemaining: 60,
        });

        console.log(`🔥 Emitted gameStarted event to ${lobbyCode}`);

        let timeLeft = 60;
        const timer = setInterval(() => {
            timeLeft--;
            io.to(lobbyCode).emit('updateTimer', { timeRemaining: timeLeft });

            if (timeLeft <= 0) {
                clearInterval(timer);
                io.to(lobbyCode).emit('roundEnded');
            }
        }, 1000);
    });

    // 🛑 Player Disconnects
    socket.on('disconnect', () => {
        console.log("User disconnected:", socket.id);
    });
});

// 🔹 7. Broadcast Lobby Updates
async function broadcastLobbyUpdate(lobbyCode) {
    const lobby = await Lobby.findOne({ code: lobbyCode });
    io.to(lobbyCode).emit('lobbyUpdated', { players: lobby.players });
}

// 🔹 8. List of Colors for the Game
const colors = [
    { name: "Kiwi Squeeze", hex: "#C1FFC1" },
    { name: "Sunset Orange", hex: "#FE5A1D" },
    { name: "Ocean Blue", hex: "#1E90FF" },
    { name: "Bubblegum Pink", hex: "#FF69B4" },
    { name: "Electric Lime", hex: "#CCFF00" },
];

// 🔹 9. Start the Server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
