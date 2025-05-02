import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import "./GamePage.css"; // CSS for .hex-shape if you want

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
  console.log("🧪 Raw URL Params:", {
    targetName: params.get("targetName"),
    targetHex: params.get("targetHex")
  });
  
  const name = params.get("name");

  const [timeRemaining, setTimeRemaining] = useState(60);
  const [targetColor, setTargetColor] = useState({ name: "Loading...", hex: "#FFFFFF" });
  const [userColors, setUserColors] = useState([]); // array of hex codes

  useEffect(() => {
    const hexRaw  = params.get("targetHex");     // e.g. "%234B544E"
    const nameRaw = params.get("targetName");    // e.g. "Nandor"
  
    if (hexRaw && nameRaw) {
      const hex  = decodeURIComponent(hexRaw);   // → "#4B544E"
      const name = decodeURIComponent(nameRaw);  // → "Nandor"
      console.log("🎯 useEffect – got from URL:", { hex, name });
      setTargetColor({ name, hex });
    }
  }, []);
  
  

  useEffect(() => {
    if (!name) {
      navigate('/');
      return;
    }

    socket = io('http://localhost:5001');

    socket.on('gameStarted', ({ targetName, targetHex, timeRemaining }) => {
      setTargetColor({ name: targetName, hex: targetHex });
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

  function handleArrowUp(index) {
    const colorHex = colorOptions[index].hex;
    setUserColors((prev) => [...prev, colorHex]);
  }

  function handleArrowDown(index) {
    const colorHex = colorOptions[index].hex;
    setUserColors((prev) => {
      const newArray = [...prev];
      const i = newArray.indexOf(colorHex);
      if (i !== -1) newArray.splice(i, 1);
      return newArray;
    });
  }

  function getBlendedColor() {
    if (userColors.length === 0) return "#FFFFFF";
    let r = 0, g = 0, b = 0;
    userColors.forEach((hex) => {
      const { r: rr, g: gg, b: bb } = hexToRGB(hex);
      r += rr; g += gg; b += bb;
    });
    r = Math.round(r / userColors.length);
    g = Math.round(g / userColors.length);
    b = Math.round(b / userColors.length);
    return rgbToHex(r, g, b);
  }

  function hexToRGB(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(x => x + x).join("");
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }

  function rgbToHex(r, g, b) {
    const toHex = (val) => val.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  const userBlendedHex = getBlendedColor();
  console.log("Rendering Target Color:", targetColor);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-white px-4 py-3 flex items-center justify-between shadow-md">
        <h1 className="text-2xl font-bold">hexblend</h1>
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
          style={{ backgroundColor: targetColor?.hex || "#FFFFFF" }}
        >
          <h2 className="text-3xl font-bold">{targetColor?.name || "Loading..."}</h2>
        </div>

        {/* User Blend Bar */}
        <div
          className="w-full max-w-3xl border-4 border-gray-300 rounded-md text-center p-6"
          style={{ backgroundColor: userBlendedHex }}
        >
          <h2 className="text-3xl font-bold">
            {userColors.length > 0 ? "Your Blend" : "No Colors Yet"}
          </h2>
        </div>

        {/* Color Picker */}
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
              />
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
