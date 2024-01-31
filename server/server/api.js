const express = require('express');
const router = express.Router();

// Define your API routes
router.get('/api/resource', (req, res) => {
    // Handle GET request for /api/resource
    res.json({ message: 'API resource' });
});

// Export the router
module.exports = router;