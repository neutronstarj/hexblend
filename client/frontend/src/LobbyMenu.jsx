import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LobbyMenu({ name }) {
    const navigate = useNavigate();

    function createRoom() {
        fetch('http://localhost:5001/lobbies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        })
        .then(res => res.json())
        .then(data => {
            if (data.code) {
                navigate(`/room/${data.code}?name=${encodeURIComponent(name)}`);
            } else {
                alert('Failed to create room');
            }
        })
        .catch(err => alert('Error creating room: ' + err.message));
    }

    return (
        <div>
            <h1>Welcome, {name}</h1>
            <button onClick={createRoom}>Create Room</button>
        </div>
    );
}
