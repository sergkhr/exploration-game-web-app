const express = require('express');
const mongoose = require('mongoose');


const app = express();
const PORT = process.env.PORT || 3000;
const apiRouter = require('./server/api');
const navigation = require('./server/navigation');

const JWT_SECRET = 'lhyiubpugopasgbUSVpgoasgSGSAhiog';

mongoose.connect('mongodb://mongo:27017/exploration_game', {
	useNewUrlParser: true,
	useUnifiedTopology: true
});

app.use(express.static('client'));

app.use('/', navigation);
app.use('/api', apiRouter);


app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});