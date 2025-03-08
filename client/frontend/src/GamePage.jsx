// GamePage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import "./GamePage.css"; // CSS for .hex-shape if you want

// For simplicity, define your color options here
const colorOptions = [
  { name: "White", hex: "#FFFFFF" },
  { name: "Black", hex: "#000000" },
  { name: "Pink", hex: "#FF1493" },
  { name: "Orange", hex: "#FFA500" },
  { name: "Lime", hex: "#00FF00" },
  { name: "Cyan", hex: "#00FFFF" },
  { name: "Purple", hex: "#8000FF" },
  { name: "Magenta", hex: "#FF00FF" },
];

let socket;

export default function GamePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const name = params.get("name");

  const [timeRemaining, setTimeRemaining] = useState(60);
  const [targetColor, setTargetColor] = useState({ name: "Loading...", hex: "#FFFFFF" });
  const [userColors, setUserColors] = useState([]); // array of hex codes chosen by player

  // ------------------------
  // Socket & Lifecycle Setup
  // ------------------------
  useEffect(() => {
    if (!name) {
      navigate('/');
    }

    socket = io('http://localhost:5001');

    // If we get these events, set data
    socket.on('gameStarted', ({ targetColor, targetHex, timeRemaining }) => {
      setTargetColor({ name: targetColor, hex: targetHex });
      setTimeRemaining(timeRemaining);
    });

    socket.on('updateTimer', ({ timeRemaining }) => {
      setTimeRemaining(timeRemaining);
    });

    socket.on('roundEnded', () => {
      alert("Round over!");
    });

    return () => {
      socket.disconnect();
    };
  }, [code, name, navigate]);

  // ------------------------
  // Up/Down Arrow Functions
  // ------------------------
  function handleArrowUp(index) {
    // Add 1 instance of this color to userColors
    const colorHex = colorOptions[index].hex;
    setUserColors((prev) => [...prev, colorHex]);
  }

  function handleArrowDown(index) {
    // Remove 1 instance of this color if present
    const colorHex = colorOptions[index].hex;
    setUserColors((prev) => {
      const newArray = [...prev];
      const firstIndex = newArray.indexOf(colorHex);
      if (firstIndex !== -1) {
        newArray.splice(firstIndex, 1); // remove that color once
      }
      return newArray;
    });
  }

  // ------------------------
  // Blend the User's Colors
  // ------------------------
  function getBlendedColor() {
    if (userColors.length === 0) {
      return "#FFFFFF"; // default if user has no colors
    }
    let rSum = 0, gSum = 0, bSum = 0;
    userColors.forEach((hex) => {
      const { r, g, b } = hexToRGB(hex);
      rSum += r;
      gSum += g;
      bSum += b;
    });
    const count = userColors.length;
    const r = Math.round(rSum / count);
    const g = Math.round(gSum / count);
    const b = Math.round(bSum / count);
    return rgbToHex(r, g, b);
  }

  // Helper to convert HEX → {r,g,b}
  function hexToRGB(hex) {
    let trimmed = hex.replace("#", "");
    if (trimmed.length === 3) {
      // convert #FFF to #FFFFFF
      trimmed = trimmed.split("").map(x => x + x).join("");
    }
    const num = parseInt(trimmed, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }
  // Helper to convert (r,g,b) → hex string
  function rgbToHex(r, g, b) {
    const toHex = (val) => val.toString(16).padStart(2, "0");
    return "#" + toHex(r) + toHex(g) + toHex(b);
  }

  const userBlendedHex = getBlendedColor();

  // ------------------------
  // Render UI
  // ------------------------
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white px-4 py-3 flex items-center justify-between shadow-md">
        <h1 className="text-2xl font-bold">hexblend</h1>
        {/* Timer, top-right */}
        <div className="flex items-center space-x-2">
          <div className="text-gray-500">
            <span className="font-semibold">Time Remaining: </span>
            {timeRemaining}s
          </div>
        </div>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center p-4 space-y-8">
        {/* Target Color Bar */}
        <div
          className="w-full max-w-3xl border-4 border-gray-300 rounded-md text-center p-6"
          style={{ backgroundColor: targetColor.hex }}
        >
          <h2 className="text-3xl font-bold">{targetColor.name}</h2>
        </div>

        {/* User Canvas Bar */}
        <div
          className="w-full max-w-3xl border-4 border-gray-300 rounded-md text-center p-6"
          style={{ backgroundColor: userBlendedHex }}
        >
          <h2 className="text-3xl font-bold">
            {userColors.length > 0 ? "Your Blend" : "No Colors Yet"}
          </h2>
        </div>

        {/* Color Selection Row */}
        <div className="flex flex-row items-center justify-center space-x-6 overflow-x-auto">
          {colorOptions.map((color, i) => (
            <div key={i} className="flex flex-col items-center">
              <button
                onClick={() => handleArrowUp(i)}
                className="text-xl bg-white p-1 mb-1 rounded hover:bg-gray-200"
              >
                ▲
              </button>
              <div
                className="hex-shape w-16 h-16"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              ></div>
              <button
                onClick={() => handleArrowDown(i)}
                className="text-xl bg-white p-1 mt-1 rounded hover:bg-gray-200"
              >
                ▼
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
