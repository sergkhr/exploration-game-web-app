const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');


const app = express();
const PORT = process.env.PORT || 3000;
const apiRouter = require('./server/userApi');
const navigation = require('./server/navigation');

mongoose.connect('mongodb://mongo:27017/exploration_game', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
});

app.use(express.static('client'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/', navigation);
app.use('/api', apiRouter(mongoose.connection));


app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});