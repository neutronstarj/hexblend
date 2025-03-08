import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LobbyMenu from './LobbyMenu';
import RoomPage from './RoomPage';
import GamePage from './GamePage';

export default function App() {
    const [name, setName] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const googleName = params.get('name');
        if (googleName) {
            setName(googleName);
        }
    }, []);

    return (
        <Router>
            <Routes>
                <Route path="/" element={name ? <LobbyMenu name={name} /> : (
                    <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-100">
                        <h1 className="text-5xl font-bold mb-6">hexblend</h1>
                        <button onClick={() => window.location.href = 'http://localhost:5001/auth/google'}>
                            Sign in with Google
                        </button>
                        <button onClick={() => setName(`Guest-${Math.random().toString(36).substring(2, 6).toUpperCase()}`)}>
                            Play as Guest
                        </button>
                    </div>
                )} />
                <Route path="/room/:code" element={<RoomPage />} />
                <Route path="/game/:code" element={<GamePage />} />
            </Routes>
        </Router>
    );
}
