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

// API Routes
app.route('/api/sivi')
    .get((req, res) => {
        db.all('SELECT * FROM sivi_takip ORDER BY tarih DESC, saat DESC', [], (err, rows) => {
            if (err) {
                console.error('Veri getirme hatası:', err);
                res.status(500).json({ success: false, error: err.message });
                return;
            }
            res.json(rows);
        });
    })
    .post((req, res) => {
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
    })
    .delete((req, res) => {
        const { tarih, saat, tur } = req.body;
        console.log('Silme isteği alındı:', { tarih, saat, tur });

        // Veritabanındaki kayıtları kontrol et
        db.all('SELECT * FROM sivi_takip', [], (err, rows) => {
            if (err) {
                console.error('Veritabanı okuma hatası:', err);
                res.status(500).json({ success: false, error: err.message });
                return;
            }

            console.log('Veritabanındaki kayıtlar:', rows);

            db.run(
                'DELETE FROM sivi_takip WHERE tarih = ? AND saat = ? AND tur = ?',
                [tarih, saat, tur],
                function(err) {
                    if (err) {
                        console.error('Silme hatası:', err);
                        res.status(500).json({ success: false, error: err.message });
                        return;
                    }

                    if (this.changes === 0) {
                        // Eşleşen kayıt bulunamadı, farklı format dene
                        const date = new Date(tarih + ' ' + saat);
                        const formattedDate = date.toLocaleDateString();
                        const formattedTime = date.toLocaleTimeString();

                        db.run(
                            'DELETE FROM sivi_takip WHERE tarih = ? AND saat = ? AND tur = ?',
                            [formattedDate, formattedTime, tur],
                            function(err) {
                                if (err) {
                                    console.error('İkinci silme denemesi hatası:', err);
                                    res.status(500).json({ success: false, error: err.message });
                                    return;
                                }
                                console.log('İkinci deneme silinen kayıt sayısı:', this.changes);
                                res.json({ 
                                    success: true, 
                                    changes: this.changes,
                                    message: 'Kayıt başarıyla silindi'
                                });
                            }
                        );
                    } else {
                        console.log('Silinen kayıt sayısı:', this.changes);
                        res.json({ 
                            success: true, 
                            changes: this.changes,
                            message: 'Kayıt başarıyla silindi'
                        });
                    }
                }
            );
        });
    });

app.route('/api/vital')
    .get((req, res) => {
        db.all('SELECT * FROM vital_takip ORDER BY tarih DESC, saat DESC', [], (err, rows) => {
            if (err) {
                console.error('Veri getirme hatası:', err);
                res.status(500).json({ success: false, error: err.message });
                return;
            }
            res.json(rows);
        });
    })
    .post((req, res) => {
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
    })
    .delete((req, res) => {
        const { tarih, saat } = req.body;
        console.log('Silme isteği alındı:', { tarih, saat });

        // Veritabanındaki kayıtları kontrol et
        db.all('SELECT * FROM vital_takip', [], (err, rows) => {
            if (err) {
                console.error('Veritabanı okuma hatası:', err);
                res.status(500).json({ success: false, error: err.message });
                return;
            }

            console.log('Veritabanındaki kayıtlar:', rows);

            db.run(
                'DELETE FROM vital_takip WHERE tarih = ? AND saat = ?',
                [tarih, saat],
                function(err) {
                    if (err) {
                        console.error('Silme hatası:', err);
                        res.status(500).json({ success: false, error: err.message });
                        return;
                    }

                    if (this.changes === 0) {
                        // Eşleşen kayıt bulunamadı, farklı format dene
                        const date = new Date(tarih + ' ' + saat);
                        const formattedDate = date.toLocaleDateString();
                        const formattedTime = date.toLocaleTimeString();

                        db.run(
                            'DELETE FROM vital_takip WHERE tarih = ? AND saat = ?',
                            [formattedDate, formattedTime],
                            function(err) {
                                if (err) {
                                    console.error('İkinci silme denemesi hatası:', err);
                                    res.status(500).json({ success: false, error: err.message });
                                    return;
                                }
                                console.log('İkinci deneme silinen kayıt sayısı:', this.changes);
                                res.json({ 
                                    success: true, 
                                    changes: this.changes,
                                    message: 'Kayıt başarıyla silindi'
                                });
                            }
                        );
                    } else {
                        console.log('Silinen kayıt sayısı:', this.changes);
                        res.json({ 
                            success: true, 
                            changes: this.changes,
                            message: 'Kayıt başarıyla silindi'
                        });
                    }
                }
            );
        });
    });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

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