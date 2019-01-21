const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

//Load Trip Paths
const trips = fs.readdirSync(path.resolve(__dirname, 'trips'));

app.use(express.static(path.resolve(__dirname, '../client')));

app.get('/trip/:tripID', (req, res) => {
    let tripID = req.params.tripID;
    
    res.sendFile(path.resolve(__dirname, 'trips', trips[tripID]));
});

app.get('/trips', (req, res) => {
    res.json({tripCount: trips.length});
})

app.listen(process.env.PORT, () => {
    console.info('Server Started on ',  'http://localhost:' + process.env.PORT);
});