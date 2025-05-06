const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const router = express.Router();

const {JWT_SECRET, MASTER_PASSWORD} = require('../config');


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
	const User = mongooseConnection.model('User', {
		name: String,
		password: String,
		role: {
			type: String,
			enum: ['player', 'master'], 
		},
	});

	// initialize master user
	async function createMasterUser() {
		try {
			// Check if a master user already exists
			const existingMasterUser = await User.findOne({ name: 'master', role: 'master' });
			if (existingMasterUser){ //only update the password
				const masterPassword = MASTER_PASSWORD;
				const hashedPassword = await bcrypt.hash(masterPassword, 10);
				existingMasterUser.password = hashedPassword;
				await existingMasterUser.save();
				console.log('Master user updated successfully');
				return;
			}
	
			// If no master user exists, create one
			const masterPassword = MASTER_PASSWORD;
			const hashedPassword = await bcrypt.hash(masterPassword, 10);
	
			const newMasterUser = new User({
				name: 'master',
				password: hashedPassword,
				role: 'master',
			});
			await newMasterUser.save();
	
			console.log('Master user created successfully');
		} catch (error) {
			console.error('Error creating master user:', error);
		}
	}
	createMasterUser();

	async function registerUser(req, res) {
		try {
			const { name, password, role } = req.body;
	
			// Check if the user making the request is a master
			if (req.user.role !== 'master') {
				return res.status(403).json({ error: 'Only master users are allowed to create new users' });
			}
	
			// Check if user already exists
			const existingUser = await User.findOne({ name });
			if (existingUser) {
				return res.status(400).json({ error: 'User already exists' });
			}
	
			// Hash the password
			const hashedPassword = await bcrypt.hash(password, 10);
	
			// Create a new user
			const newUser = new User({
				name,
				password: hashedPassword,
				role,
			});
			await newUser.save();
	
			res.status(201).json({ message: 'User registered successfully' });
		} catch (e) {
			res.status(500).json({ error: 'Internal server error ' + e});
		}
	}

	async function deleteUser(req, res) {
		try {
			const name = req.query.name;

			// Check if the user making the request is a master
			if (req.user.role !== 'master') {
				return res.status(403).json({ error: 'Only master users are allowed to delete users' });
			}

			// Check if user exists
			const existingUser = await User.findOne({ name });
			({ name });
			if (!existingUser) {
				return res.status(404).json({ error: 'User not found' });
			}

			// Delete the user
			await User.deleteOne({ name });
			res.json({ message: 'User deleted successfully' });
		} catch (e) {
			res.status(500).json({ error: 'Internal server error ' + e});
		}
	}

	async function loginUser(req, res) {
		try {
			const { name, password } = req.body;
	
			// Find user by name
			const user = await User.findOne({ name });
			if (!user) {
				return res.status(401).json({ error: 'Invalid credentials' });
			}
	
			// Check password
			const passwordMatch = await bcrypt.compare(password, user.password);
			if (!passwordMatch) {
				return res.status(401).json({ error: 'Invalid credentials' });
			}
	
			// Generate JWT token
			const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
			res.json({ token });
		} catch (e) {
			res.status(500).json({ error: 'Internal server error ' + e });
		}
	}

	async function getPlayers(req, res) {
		try {
			const players = await User.find({ role: 'player' }).select('-password');
			res.json(players);
		} catch (e) {
			console.error('Error getting players:', e);
			res.status(500).json({ error: 'Internal server error ' + e});
		}
	}

	async function getPlayer(req, res) {
		try {
			const username = req.query.name;
			const player = await User.findOne({ name: username, role: 'player' }).select('-password');
			if (!player) {
				return res.status(404).json({ error: 'Player not found' });
			}
			res.json(player);
		} catch (e) {
			console.error('Error getting player:', e);
			res.status(500).json({ error: 'Internal server error ' + e });
		}
	}

	async function checkIfMaster(req, res){
		try {
			if (req.user.role !== 'master') {
				return res.status(403).json({ error: 'Only master users are allowed here' });
			}

			res.status(200).json({ message: 'Master user' });
		} catch (e) {
			console.error('Error getting user role:', e);
			res.status(500).json({ error: 'Internal server error ' + e });
		}
	}

	async function checkIfPlayer(req, res){
		try {
			if (req.user.role !== 'player') {
				return res.status(403).json({ error: 'You are not a player' });
			}

			res.status(200).json({ message: 'Player user' });
		} catch (e) {
			console.error('Error getting user role:', e);
			res.status(500).json({ error: 'Internal server error ' + e });
		}
	}


	//________________________________________________________________________________________________
	// api endpoint
	// we pass functions themselves as parameters to the router
	router.post('/register', authenticateToken, registerUser);
	router.delete('/users', authenticateToken, deleteUser);
	router.post('/login', loginUser);
	router.get('/players', getPlayers);
	router.get('/getPlayer', getPlayer);
	router.get('/checkIfMaster', authenticateToken, checkIfMaster);
	router.get('/checkIfPlayer', authenticateToken, checkIfPlayer);


	return router;
};