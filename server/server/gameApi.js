const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const {JWT_SECRET} = require('../config');

const {floorVariants, spaceVariants, contentVariants} = require('./settings');


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

//________________________________________________________________________________________________
// Export the router
// actual implementation is also here
module.exports = function(mongooseConnection) {
    const contentScheme = new mongoose.Schema({
        type: {type: String, enum: contentVariants, required: true},
        isHidden: {type: Boolean, required: true}
    });
    const cellSchema = new mongoose.Schema({
        isClosed: { type: Boolean, required: true },
        isFloor: { type: Boolean, required: true },
        content: [contentScheme]
    });
    const mapSchema = new mongoose.Schema({
        name: {type: String, unique: true, required: true},
		settings: {
            floor: {type: String, enum: floorVariants},
            space: {type: String, enum: spaceVariants}
        },
        width: { type: Number, required: true },
        height: { type: Number, required: true },
        cells: [[cellSchema]]
    });

	const GameMap = mongooseConnection.model('GameMap', mapSchema);

	async function getGameMapsNames(req, res) {
		try {
			// Check if the user making the request is a master
			if (req.user.role !== 'master') {
				return res.status(403).json({ error: 'Only master users are allowed to fetch maps' });
			}

			const maps = await GameMap.find({}, 'name');
            const mapNames = maps.map(map => map.name);
            res.json(mapNames);
		} catch (e) {
			res.status(500).json({ error: 'Internal server error ' + e});
		}
	}

    async function getGameMapByName(req, res) {
        try {
            // Check if the user making the request is a master
            if (req.user.role !== 'master') {
                return res.status(403).json({ error: 'Only master users are allowed to fetch maps' });
            }

            const mapName = req.query.name;
            const map = await GameMap.findOne({name: mapName});
            res.json(map);
        } catch (e) {
            res.status(500).json({ error: 'Internal server error ' + e});
        }
    }

    async function createGameMap(req, res) {
        try {
            // Check if the user making the request is a master
            if (req.user.role !== 'master') {
                return res.status(403).json({ error: 'Only master users are allowed to create maps' });
            }
            let defaultCellsArray = Array.from({ length: height }, () =>
                Array.from({ length: width }, () => ({
                    isClosed: true,
                    isFloor: true,
                    content: []
                }))
            );

            const { name, settings, width, height } = req.body;
            if (!name || !settings || !width || !height) {
                return res.status(400).json({ error: 'Invalid request' });
            }
            const existingMap = await GameMap.findOne({name});
            if (existingMap) {
                return res.status(400).json({ error: 'Map with this name already exists' });
            }

            const map = new GameMap({
                name,
                settings,
                width,
                height,
                cells: defaultCellsArray
            });
            await map.save();
            res.status(201).json({ message: 'Map created successfully' });
        } catch (e) {
            res.status(500).json({ error: 'Internal server error ' + e});
        }
    }

    //________________________________________________________________________________________________
    // game api
    const gameSchema = new mongoose.Schema({
        name: {type: String, unique: true, required: true},
        mapName: {type: String, required: true},
        currentTime: {type: Number, required: true},
        settings: {
            timeToMove: {type: Number, required: true},
            riskDangerChance: [{type: Number, required: true}],
            riskTresureChance: [{type: Number, required: true}],
        },
        activeMap: mapSchema
    });

    const Game = mongooseConnection.model('Game', gameSchema);

	//________________________________________________________________________________________________
	// api endpoint
	// we pass functions themselves as parameters to the router
	router.get('/maps', authenticateToken, getGameMapsNames);
    router.get('/maps', authenticateToken, getGameMapByName); // ?name=mapName
    router.post('/maps', authenticateToken, createGameMap);


	return router;
};