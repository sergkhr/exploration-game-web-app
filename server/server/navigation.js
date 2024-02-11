const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const {JWT_SECRET} = require('../config');

const path = require('path');

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];
	if (!token) {
		return res.status(401).json({ error: 'Unauthorized' });
	}
  
	jwt.verify(token, JWT_SECRET, (err, user) => {
		if (err) {
			return res.status(403).json({ error: 'Forbidden' });
		}
		req.user = user;
		next();
	});
}

router.get('/', (req, res) => {
    try{
        const resPath = path.resolve(__dirname, '../client/views/index.html');
        res.sendFile(resPath);
    } catch (e) {
        console.error('Error fetching index:', e);
        res.status(500).json({ error: 'Internal server error ' + e});
    }
    
});

router.get('/setting_map', (req, res) => {
    try {
        const resPath = path.resolve(__dirname, '../client/views/setting_map.html');
        res.sendFile(resPath);
    } catch (e) {
        console.error('Error fetching map settings:', e);
        res.status(500).json({ error: 'Internal server error ' + e });
    }
});

// Export the router
module.exports = router;