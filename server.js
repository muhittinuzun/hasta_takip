const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// Sıvı verisi ekleme
app.post('/api/sivi', (req, res) => {
    const { amount, type } = req.body;
    const data = `${new Date().toLocaleDateString()},${new Date().toLocaleTimeString()},"${type}",${amount}\n`;
    
    fs.appendFileSync('data/sivi_takip.csv', data);
    res.json({ success: true });
});

// Sıvı verilerini getirme
app.get('/api/sivi', (req, res) => {
    const data = fs.readFileSync('data/sivi_takip.csv', 'utf8');
    res.send(data);
});

// Vital bulgu ekleme
app.post('/api/vital', (req, res) => {
    const { systolic, diastolic, pulse, notes } = req.body;
    const data = `${new Date().toLocaleDateString()},${new Date().toLocaleTimeString()},${systolic},${diastolic},${pulse},"${notes || ''}"\n`;
    
    fs.appendFileSync('data/vital_takip.csv', data);
    res.json({ success: true });
});

// Vital bulguları getirme
app.get('/api/vital', (req, res) => {
    const data = fs.readFileSync('data/vital_takip.csv', 'utf8');
    res.send(data);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 