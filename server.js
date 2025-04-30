// import express, { json } from 'express';
// import Server from 'ws';

// const app = express();
// const wss = new Server({ port: 8080 });

// app.use(json()); // Middleware to parse JSON request bodies
const express = require('express');
const WebSocket = require('ws');

const app = express();
const wss = new WebSocket.Server({ port: 8080 });

app.use(express.json()); // Middleware to parse JSON request bodies

console.log("WebSocket server started on ws://localhost:8080");

let lightswitch = false; // State for light
let feedSwitch = false; // State for feed

const dataDictionary = {};

class espvals {
    constructor(temp, light, dist, turb) {
        this.temp = temp;
        this.light = light;
        this.dist = dist;
        this.turb = turb;
    }
}

function addEntry(temp, light, dist, turb) {
    const timestamp = Date.now(); // Get the current timestamp in milliseconds
    const value = new espvals(temp, light, dist, turb); // Create a new espvals object
    dataDictionary[timestamp] = value; // Add the object to the dictionary
    console.log(`Data added: ${JSON.stringify(value)} at timestamp ${timestamp}`);
  }

// Store connected WebSocket clients
let connectedClient = null;

// WebSocket server
wss.on('connection', (ws) => {
  console.log("New client connected");
  connectedClient = ws;

  // Handle incoming WebSocket messages
  ws.on('message', (message) => {
    console.log("Message from client:", message);
    try {
        // Parse the incoming JSON message
        const data = JSON.parse(message);
    
        if (data.temp !== undefined && data.light !== undefined && data.distance != undefined && data.turbidity != undefined) {
          addEntry(data.temp,data.light,data.distance,data.turbidity);
          console.log(`Temperature: ${data.temp} °C, Light: ${data.light ? 'Dark' : 'Bright'}, Distance: ${data.distance}, Turbidity: ${data.turbidity}`);
        } else {
          console.log("Invalid data format. Expected keys: 'temp' and 'light'.");
        }
      } catch (err) {
        console.error("Error parsing message as JSON:", err.message);
      }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log("Client disconnected");
    connectedClient = null;
  });
});

// API to get data
app.get('/api/data', (req, res) => {
  res.json(dataDictionary);
});

// POST API to handle commands
app.post('/api/command', (req, res) => {
  const { command } = req.body;

  if (!command) {
    return res.status(400).json({ error: "Missing 'command' in request body" });
  }

  if (command === "feed") {
    feedSwitch = true; // Set feed switch to true
    ws.send("feed");
    return res.json({ status: "Feed command sent" });
  } else if (command === "light on") {
    lightswitch = true; // Turn lights on
    ws.send("light on");
    return res.json({ status: "Light ON command sent" });
  } else if (command === "light off") {
    lightswitch = false; // Turn lights off
    ws.send("light off");
    return res.json({ status: "Light OFF command sent" });
  } else {
    return res.status(400).json({ error: "Invalid command. Use 'feed', 'light on', or 'light off'." });
  }
});

// Start the HTTP server
const port = 3000;
app.listen(port, () => {
  console.log(`HTTP server started on http://localhost:${port}`);
});
