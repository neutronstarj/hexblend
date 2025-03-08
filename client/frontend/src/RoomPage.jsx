import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';

let socket;

export default function RoomPage() {
    const { code } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [players, setPlayers] = useState([]);
    const [isHost, setIsHost] = useState(false);

    const params = new URLSearchParams(location.search);
    const name = params.get("name");

    useEffect(() => {
        if (!name) {
            navigate("/");
        }

        socket = io('http://localhost:5001');

        // Join the lobby
        socket.emit('joinLobby', { username: name, lobbyCode: code });

        // Listen for updates
        socket.on('lobbyUpdated', ({ players }) => {
            console.log("Players in lobby:", players); // DEBUG LOG
            setPlayers(players);

            // If the first player in the list is this user, they are the host
            if (players.length > 0 && players[0].username === name) {
                setIsHost(true);
            } else {
                setIsHost(false);
            }
        });

        // Listen for game start
        socket.on('gameStarted', () => {
            navigate(`/game/${code}?name=${encodeURIComponent(name)}`);
        });

        return () => {
            socket.disconnect();
        };
    }, [code, name, navigate]);

    function startGame() {
        console.log("Starting game..."); // DEBUG LOG
        socket.emit('startGame', { lobbyCode: code });
    }

    function leaveRoom() {
        navigate('/');
    }

    return (
        <div className="w-screen min-h-screen bg-gray-100 flex flex-col items-center p-4">
            <h1 className="text-3xl font-bold">Lobby: {code}</h1>
            <p>Welcome, {name}!</p>

            <div className="border p-4 bg-white mt-4">
                <h2 className="text-xl font-bold">Players</h2>
                {players.length === 0 ? <p>Waiting for players...</p> : 
                    players.map((p, index) => (
                        <div key={p.username} className="flex items-center">
                            <span>{p.username}</span> {index === 0 && <span className="text-sm text-gray-500">(Host)</span>}
                        </div>
                    ))
                }
            </div>

            {/* Show the Start Game button ONLY if the user is the host */}
            {isHost && (
                <button
                    onClick={startGame}
                    className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                >
                    Start Game
                </button>
            )}

            <button onClick={leaveRoom} className="mt-4 p-2 bg-red-500 text-white rounded">
                Leave Lobby
            </button>
        </div>
    );
}
