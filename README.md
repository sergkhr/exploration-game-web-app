# Api
- api ads /api to the url (root/api/do_your_thing)

# File structure
- inside the docker container the server.js is one level up \
    it has clients and server folders near it \
    inside the server folder there are the other files that are in the server folder originally

# File requarments
- pictures for the content of cells should be named as the content in the cell (check in settings.js in server)

# Functional logic
- updating the map is mostly on the client side\
    the server is only getting update request with whole map, when client saves the changes

# How to turn on/update
- update local files
- (temp) make sure .env filr exists in root directory and it has JWT_SECRET and MASTER_PASSWORD variables set. Take note that .env is in gitignore, so you might need to create it 
- run in root directory (where docker-compose.yml is located) "docker-compose up --build", for no logs: "docker-compose up --build -d"