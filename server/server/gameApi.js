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

let waiting_for_turn_confirmation = false;

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
module.exports = function(mongooseConnection, ws_server) {
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
    const characterSchema = new mongoose.Schema({
        row: {type: Number, required: true},
        column: {type: Number, required: true}
    });
    const gameSchema = new mongoose.Schema({
        name: {type: String, unique: true, required: true},
        mapName: {type: String, required: true},
        currentTime: {type: Number, required: true},
        settings: {
            timeToMove: {type: Number, required: true},
            riskDangerChance: [{type: Number, required: true}],
            riskTresureChance: [{type: Number, required: true}],
        },
        activeMap: mapSchema,
        characterPosition: characterSchema
    });

    const Game = mongooseConnection.model('Game', gameSchema);


	async function getGamesNames(req, res) {
		try {
			// Check if the user making the request is a master or player
			if (req.user.role !== 'master' && req.user.role !== 'player') {
				return res.status(403).json({ error: 'Only authorized users can fetch games' });
			}

			const games = await Game.find({}, 'name');
            const gameNames = games.map(game => game.name);
            res.json(gameNames);
		} catch (e) {
			res.status(500).json({ error: 'Internal server error ' + e});
		}
	}

    /**
     * Retrieves a game by name.
     * Accessible to both master and player users.
     */
    async function getGameByName(req, res) {
        try {
            // Allow only authorized users (master and player) to fetch games
            if (req.user.role !== 'master' && req.user.role !== 'player') {
                return res.status(403).json({ error: 'Only authorized users can fetch games' });
            }
            
            const gameName = req.query.name;
            const game = await Game.findOne({ name: gameName });
            if (!game) {
                return res.status(404).json({ error: 'Game not found' });
            }
            res.json(game);
        } catch (e) {
            res.status(500).json({ error: 'Internal server error ' + e });
        }
    }

    /**
     * Creates a new game.
     * Accessible only to master users.
     * Also checks that the map specified (via mapName) exists.
     */
    async function createGame(req, res) {
        try {
            // Only master users can create games.
            if (req.user.role !== 'master') {
                return res.status(403).json({ error: 'Only master users are allowed to create games' });
            }
            
            const { name, mapName, currentTime, settings } = req.body;
            if (!name || !mapName || currentTime === undefined || !settings) {
                return res.status(400).json({ error: 'Invalid request. Required fields: name, mapName, currentTime, settings.' });
            }
            
            // Check if a game with the same name already exists.
            const existingGame = await Game.findOne({ name });
            if (existingGame) {
                return res.status(400).json({ error: 'Game with this name already exists' });
            }
            
            // Check that the map used for the game exists.
            const existingMap = await GameMap.findOne({ name: mapName });
            if (!existingMap) {
                return res.status(400).json({ error: 'Map used for the game does not exist' });
            }

            let characterPosition = {row: 0, column: 0};
            
            // Create a new game object.
            let newGame = new Game({
                name,
                mapName,
                currentTime,
                settings,
                activeMap: existingMap, // Save the entire map, so every hex is closed by default
                characterPosition: characterPosition
            });
            
            await newGame.save();
            res.status(201).json({ message: 'Game created successfully' });
        } catch (e) {
            res.status(500).json({ error: 'Internal server error ' + e });
        }
    }

    /**
     * Updates an existing game.
     * Accessible only to master users.
     * Checks that, if the map is being updated, the new map exists.
     */
    async function updateGame(req, res) {
        try {
            // Only master users can update games.
            if (req.user.role !== 'master') {
                return res.status(403).json({ error: 'Only master users are allowed to update games' });
            }
            
            const gameName = req.query.name; // Game name passed as a query parameter
            const { mapName, currentTime, settings } = req.body; // Updated game data from the request body
            
            let game = await Game.findOne({ name: gameName });
            if (!game) {
                return res.status(404).json({ error: 'Game not found' });
            }
            
            // If updating the map, check that the new map exists.
            if (mapName) {
                const existingMap = await GameMap.findOne({ name: mapName });
                if (!existingMap) {
                    return res.status(400).json({ error: 'Map used for the game does not exist' });
                }
                game.mapName = mapName;
                game.activeMap = existingMap;
            }
            
            if (currentTime !== undefined) {
                game.currentTime = currentTime;
            }
            if (settings) {
                game.settings = settings;
            }
            
            await game.save();
            res.json({ message: 'Game updated successfully' });
        } catch (e) {
            res.status(500).json({ error: 'Internal server error ' + e });
        }
    }

    /**
     * Deletes an existing game.
     * Accessible only to master users.
     */
    async function deleteGame(req, res) {
        try {
            // Only master users can delete games.
            if (req.user.role !== 'master') {
                return res.status(403).json({ error: 'Only master users are allowed to delete games' });
            }
            
            const gameName = req.query.name;
            const deletedGame = await Game.findOneAndDelete({ name: gameName });
            if (!deletedGame) {
                return res.status(404).json({ error: 'Game not found' });
            }
            res.json({ message: 'Game deleted successfully' });
        } catch (e) {
            res.status(500).json({ error: 'Internal server error ' + e });
        }
    }



    //________________________________________________________________________________
    // web socket starts to appear

    /**
     * Changes visibility of a cell (toggles isClosed)
     * Does not check permission – make sure it's checked at the caller
     * 
     * @param {string} gameName - Name of the game to update
     * @param {number} i - Row index of the cell
     * @param {number} j - Column index of the cell
     */
    async function changeCellVisibility(gameName, i, j) {
        try {
            const game = await Game.findOne({ name: gameName });
            if (!game) {
                console.error(`Game "${gameName}" not found`);
                return;
            }

            // Validate cell coordinates
            const cells = game.activeMap.cells;
            if (!Array.isArray(cells) || !cells[i] || !cells[i][j]) {
                console.error(`Invalid cell coordinates (${i}, ${j})`);
                return;
            }

            // Toggle the isClosed value
            const cell = cells[i][j];
            cell.isClosed = !cell.isClosed;

            await game.save();

            // Notify all clients in the room about the change
            ws_server.to(gameName).emit('cellVisibilityChanged', {
                row: i,
                column: j,
                isClosed: cell.isClosed
            });

            console.log(`Cell (${i}, ${j}) visibility updated in game "${gameName}"`);
        } catch (e) {
            console.error('Error changing cell visibility:', e);
        }
    }


    /**
     * Возвращает список соседних координат и самой клетки
     * @param {number} i - строка (row)
     * @param {number} j - колонка (column)
     * @returns {Array} - массив из пар [i, j]
     */
    function getHexWithNeighbors(i, j) {
        // Смещения для соседей в чётных строках
        const evenRowOffsets = [
            [-1,  0], // top-left
            [-1,  1], // top-right
            [ 0, -1], // left
            [ 0,  0], // self
            [ 0,  1], // right
            [ 1,  0], // bottom-left
            [ 1,  1]  // bottom-right
        ];

        // Смещения для соседей в нечётных строках
        const oddRowOffsets = [
            [-1, -1], // top-left
            [-1,  0], // top-right
            [ 0, -1], // left
            [ 0,  0], // self
            [ 0,  1], // right
            [ 1, -1], // bottom-left
            [ 1,  0]  // bottom-right
        ];

        const offsets = (i % 2 === 0) ? evenRowOffsets : oddRowOffsets;

        return offsets.map(([di, dj]) => [i + di, j + dj]);
    }

    async function openCellsAroundCharacter(gameName){
        try {
            const game = await Game.findOne({ name: gameName });
            if (!game) {
                console.error(`Game "${gameName}" not found`);
                return;
            }
            let ch = game.characterPosition;
            let ch_i = ch.row;
            let ch_j = ch.column;
            const cells = game.activeMap.cells;
            if(!Array.isArray(cells)){
                console.error(`something wrong with cells, all of em`);
                return;
            };

            let allAround = getHexWithNeighbors(ch_i, ch_j);
            for (let [i, j] of allAround) {
                if (!cells[i] || !cells[i][j]) {
                    break;
                }
                let cell = cells[i][j];
                cell.isClosed = false;
            }

            await game.save();

            for (let [i, j] of allAround) {
                if (!cells[i] || !cells[i][j]) {
                    break;
                }
                let cell = cells[i][j];
                
                // Notify all clients in the room about the change
                //calls for each one - not best network optimization but works for now
                ws_server.to(gameName).emit('cellVisibilityChanged', {
                    row: i,
                    column: j,
                    isClosed: cell.isClosed
                });
            }
            
            console.log(`Cells updated around (${ch_i}, ${ch_j}) in game "${gameName}"`);
        } catch (e) {
            console.error('Error opening cells:', e);
        }
    }

    


    //middleware for authentication
    ws_server.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error("No token provided"));
    
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) return next(new Error("Invalid token"));
            socket.role = decoded.role; // save the user role from token
            next();
        });
    });

    //connection to room
    ws_server.on('connection', (socket) => {
        console.log("A new client connected");


        //client emits joinGame with gameName
        socket.on('joinGame', (gameName) => {
            socket.join(gameName);
            console.log(`Client joined game: ${gameName}`);

            // notify
            ws_server.to(gameName).emit('playerJoined', `A user joined game "${gameName}"`);
        });


        //process toggle cell visibility
        socket.on('toggleCellVisibility', async (data) => {
            const { gameName, i, j } = data;
    
            try {
                if (socket.role !== 'master') {
                    return socket.emit('error', { error: 'Only master can change visibility' });
                }
    
                await changeCellVisibility(gameName, i, j);
    
            } catch (e) {
                console.error("Error handling toggleCellVisibility:", e);
                socket.emit('error', { error: 'Invalid token or internal error' });
            }
        });



        /**
         * @param {String} gameName 
         * @returns {Structure} {row, column}
         */
        async function getCharacterPosition(gameName) {
            const game = await Game.findOne({ name: gameName });
            if (!game || !game.characterPosition) return null;
            return game.characterPosition;
        }

        //magic
        function areHexesAdjacent(x1, y1, x2, y2) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const isEvenRow = x1 % 2 === 0;
            const adjacentOffsets = isEvenRow
                ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
                : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];

            return adjacentOffsets.some(([dxOffset, dyOffset]) => dx === dxOffset && dy === dyOffset);
        }

        //receive player wants to move character
        socket.on('playerWantsToMoveCharacter', async (data) => {
            const { gameName, row, column } = data;
            
            if(waiting_for_turn_confirmation){
                socket.emit('moveDenied', { reason: 'Still waiting for master confirmation' });
                return;
            }
        
            const currentPosition = await getCharacterPosition(gameName);
            if (!currentPosition) {
                socket.emit('moveDenied', { reason: 'Character position not found' });
                return;
            }
        
            const isAdjacent = areHexesAdjacent(currentPosition.row, currentPosition.column, row, column);
            if (!isAdjacent) {
                socket.emit('moveDenied', { reason: 'Target cell is not adjacent' });
                return;
            }
        
            waiting_for_turn_confirmation = true;
            ws_server.to(gameName).emit('playerRequestedMove', { row, column, gameName });
        });

        //move character by master
        socket.on('moveCharacter', async (data) => {
            const { gameName, row, column } = data;
        
            try {
                if (socket.role !== 'master') {
                    socket.emit('moveDenied', { reason: 'Unauthorized' });
                    return;
                }
        
                const game = await Game.findOne({ name: gameName });
                if (!game) {
                    socket.emit('moveDenied', { reason: 'Game not found' });
                    return;
                }
        
                game.characterPosition = { row, column };
                await game.save();
                await openCellsAroundCharacter(gameName);
        
                waiting_for_turn_confirmation = false;
                ws_server.to(gameName).emit('characterMoved', { row, column });
        
            } catch (err) {
                socket.emit('moveDenied', { reason: 'Invalid token or internal error' });
            }
        });
    });









	//________________________________________________________________________________________________
	// api endpoint
	// we pass functions themselves as parameters to the router
    router.get('/settings', getSettings);

	router.get('/maps', authenticateToken, getGameMapsNames);
    router.get('/getMap', authenticateToken, getGameMapByName); // ?name=mapName
    router.post('/maps', authenticateToken, createGameMap);
    router.put('/maps', authenticateToken, updateGameMap); // ?name=mapName
    router.delete('/maps', authenticateToken, deleteGameMap); // ?name=mapName

    router.get('/games', authenticateToken, getGamesNames);
    router.get('/getGame', authenticateToken, getGameByName); // ?name=gameName
    router.post('/games', authenticateToken, createGame);
    router.put('/games', authenticateToken, updateGame); // ?name=gameName
    router.delete('/games', authenticateToken, deleteGame); // ?name=gameName

	return router;
};