const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const net = require('net');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// Veritabanı bağlantısı
const db = new sqlite3.Database('database.sqlite', (err) => {
    if (err) {
        console.error('Veritabanı bağlantı hatası:', err);
    } else {
        console.log('Veritabanına bağlanıldı');
    }
});

// Tabloları oluştur
db.serialize(() => {
    // Sıvı takip tablosu
    db.run(`CREATE TABLE IF NOT EXISTS sivi_takip (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tarih TEXT,
        saat TEXT,
        tur TEXT,
        miktar INTEGER
    )`);

    // Vital bulgu tablosu
    db.run(`CREATE TABLE IF NOT EXISTS vital_takip (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tarih TEXT,
        saat TEXT,
        sistolik INTEGER,
        diastolik INTEGER,
        nabiz INTEGER,
        notlar TEXT
    )`);
});

// Sıvı verisi ekleme
app.post('/api/sivi', (req, res) => {
    const { amount, type } = req.body;
    const tarih = new Date().toLocaleDateString();
    const saat = new Date().toLocaleTimeString();

    db.run(
        'INSERT INTO sivi_takip (tarih, saat, tur, miktar) VALUES (?, ?, ?, ?)',
        [tarih, saat, type, amount],
        function(err) {
            if (err) {
                console.error('Veri ekleme hatası:', err);
                res.status(500).json({ success: false, error: err.message });
                return;
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Sıvı verilerini getirme
app.get('/api/sivi', (req, res) => {
    db.all(
        'SELECT * FROM sivi_takip ORDER BY tarih DESC, saat DESC',
        [],
        (err, rows) => {
            if (err) {
                console.error('Veri getirme hatası:', err);
                res.status(500).json({ success: false, error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

// Vital bulgu ekleme
app.post('/api/vital', (req, res) => {
    const { systolic, diastolic, pulse, notes } = req.body;
    const tarih = new Date().toLocaleDateString();
    const saat = new Date().toLocaleTimeString();

    db.run(
        'INSERT INTO vital_takip (tarih, saat, sistolik, diastolik, nabiz, notlar) VALUES (?, ?, ?, ?, ?, ?)',
        [tarih, saat, systolic, diastolic, pulse, notes],
        function(err) {
            if (err) {
                console.error('Veri ekleme hatası:', err);
                res.status(500).json({ success: false, error: err.message });
                return;
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Vital bulguları getirme
app.get('/api/vital', (req, res) => {
    db.all(
        'SELECT * FROM vital_takip ORDER BY tarih DESC, saat DESC',
        [],
        (err, rows) => {
            if (err) {
                console.error('Veri getirme hatası:', err);
                res.status(500).json({ success: false, error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

const PORT = process.env.PORT || 3000;

// Port kullanılabilirlik kontrolü
const server = net.createServer();

server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log('Port 3000 kullanımda, alternatif port deneniyor...');
        const altPort = 3001;
        app.listen(altPort, () => {
            console.log(`Server running on alternative port ${altPort}`);
        });
    }
});

server.once('listening', () => {
    server.close();
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

server.listen(PORT);

// Uygulama kapatıldığında veritabanı bağlantısını kapat
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Veritabanı kapatma hatası:', err);
        } else {
            console.log('Veritabanı bağlantısı kapatıldı');
        }
        process.exit(0);
    });
}); 