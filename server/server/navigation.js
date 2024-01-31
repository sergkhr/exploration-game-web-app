const express = require('express');
const router = express.Router();

const path = require('path');

router.get('/', (req, res) => {
    const resPath = path.resolve(__dirname, '../client/views/index.html');
    res.sendFile(resPath);
});

// Export the router
module.exports = router;