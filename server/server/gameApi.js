const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const router = express.Router();

const {JWT_SECRET} = require('../config');

const {floorVariants_full, spaceVariants_full, contentVariants_full, backgroundVariants_full} = require('./settings');
// let floorVariants = floorVariants_full.map(variant => Object.keys(variant)[0]);
// let spaceVariants = spaceVariants_full.map(variant => Object.keys(variant)[0]);
// let contentVariants = contentVariants_full.map(variant => Object.keys(variant)[0]);
// let backgroundVariants = backgroundVariants_full.map(variant => Object.keys(variant)[0]);
let floorVariants = Object.keys(floorVariants_full);
let spaceVariants = Object.keys(spaceVariants_full);
let contentVariants = Object.keys(contentVariants_full);
let backgroundVariants = Object.keys(backgroundVariants_full);

console.log("content variants:\n" + contentVariants);

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
    async function getSettings(req, res) {
        try {
            res.json({ floorVariants_full, spaceVariants_full, contentVariants_full, backgroundVariants_full });
        } catch (e) {
            res.status(500).json({ error: 'Internal server error ' + e});
        }
    }

    //maps api
    const contentSchema = new mongoose.Schema({
        type: {type: String, enum: contentVariants, required: true},
        isHidden: {type: Boolean, required: true}
    });
    const cellSchema = new mongoose.Schema({
        isClosed: { type: Boolean, required: true },
        isFloor: { type: Boolean, required: true },
        content: [contentSchema]
    });
    const mapSchema = new mongoose.Schema({
        name: {type: String, unique: true, required: true},
		settings: {
            floor: {type: String, enum: floorVariants},
            space: {type: String, enum: spaceVariants},
            background: {type: String, enum: backgroundVariants}
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

            let { name, settings, width, height } = req.body;

            if (!name || !width || !height) {
                return res.status(400).json({ error: 'Invalid request' });
            }
            const existingMap = await GameMap.findOne({name});
            if (existingMap) {
                return res.status(400).json({ error: 'Map with this name already exists' });
            }

            width = parseInt(width);
            height = parseInt(height);

            // if settings are not provided, use the first variants from the settings as default
            if (!settings || !settings.floor || !settings.space || !settings.background) {
                if(!settings) {
                    settings = {};
                }
                if(!settings.floor) {
                    settings.floor = floorVariants[0];
                }
                if(!settings.space) {
                    settings.space = spaceVariants[0];
                }
                if(!settings.background) {
                    settings.background = backgroundVariants[0];
                }
            }

            if (!Number.isInteger(width) || !Number.isInteger(height) ||
            width <= 0 || height <= 0) {
                res.status(400).json({ error: 'Invalid map dimensions' });
                return;
            }

            let defaultCellsArray = Array.from({ length: height }, () =>
                Array.from({ length: width }, () => ({
                    isClosed: true,
                    isFloor: true,
                    content: []
                }))
            );

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

    async function updateGameMap(req, res) {
        try {
            // Check if the user making the request is a master
            if (req.user.role !== 'master') {
                return res.status(403).json({ error: 'Only master users are allowed to update maps' });
            }
    
            const name = req.query.name; // Get the map name from the query params
            const { settings, width, height, cells } = req.body; // Get updated map data from the request body

            //debugging
            // cells.forEach(row => {
            //     row.forEach(cell => {
            //         console.log("Cell content:", cell.content);
            //     });
            // });
            
            // Find the map by name
            let map = await GameMap.findOne({ name });
            if (!map) {
                return res.status(404).json({ error: 'Map not found' });
            }
    
            // Update map fields if provided in the request body
            if (settings) {
                map.settings = settings;
            }
            if (width) {
                map.width = width;
            }
            if (height) {
                map.height = height;
            }
            if (cells) {
                map.cells = cells;
            }
    
            // Save the updated map
            await map.save();
    
            res.json({ message: 'Map updated successfully' });
        } catch (e) {
            console.error('Error updating game map:', error);
            res.status(500).json({ error: 'Internal server error ' + e });
        }
    }

    async function deleteGameMap(req, res) {
        try {
            // Check if the user making the request is a master
            if (req.user.role !== 'master') {
                return res.status(403).json({ error: 'Only master users are allowed to delete maps' });
            }
    
            const name = req.query.name; // Get the map name from the query params
    
            // Find the map by name and delete it
            const deletedMap = await GameMap.findOneAndDelete({ name });

            if (!deletedMap) {
                return res.status(404).json({ error: 'Map not found' });
            }

            res.json({ message: 'Map deleted successfully' });
        } catch (e) {
            console.error('Error deleting game map:', error);
            res.status(500).json({ error: 'Internal server error ' + e });
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
    router.get('/settings', getSettings);
	router.get('/maps', authenticateToken, getGameMapsNames);
    router.get('/getMap', authenticateToken, getGameMapByName); // ?name=mapName
    router.post('/maps', authenticateToken, createGameMap);
    router.put('/maps', authenticateToken, updateGameMap); // ?name=mapName
    router.delete('/maps', authenticateToken, deleteGameMap); // ?name=mapName


	return router;
};