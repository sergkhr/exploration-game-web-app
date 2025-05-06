
function loadResizeCommon(){
    resizeContainerForContent($('#container .data-place'), ".data-block");
    resizeContainerForContent($('#container .buttons-place'), ".buttons-block");
}
$(document).ready(function() {
    //loadResizeCommon();
});
$(window).on('resize', function() {
    //loadResizeCommon();
});



//___________________________________________________________________________________________
// navigation click events
backwardDirections = {
    1: 1,
    2: 1,
    3: 1,
    4: 2,
    5: 3,
    6: 5,
    7: 5,
    8: 5
};

function showNavigation(dataIndex){
    $(".data-block").addClass("hidden");
    $(".buttons-block").addClass("hidden");

    $(`.data-block[data-index=${dataIndex}]`).removeClass("hidden");
    $(`.buttons-block[data-index=${dataIndex}]`).removeClass("hidden");
}
function populateSelectionList(listElement, children) {
    listElement.empty();
    children.forEach(child => {
        listElement.append(`<option value="${child}">${child}</option>`);
    });
}

$("#back-to-main-page").click(function() {
    showNavigation(1);
});
$("#back-button").click(function() {
    let dataIndex = $(".data-block:not(.hidden)").data("index");
    showNavigation(backwardDirections[dataIndex]);
});

$("#pick-player-role-btn").click(function() {
    getPlayersNames().then(players => {
        populateSelectionList($("#player-username-input"), players);
    });
    showNavigation(2);
});
$("#pick-master-role-btn").click(function() {
    showNavigation(3);
});

function userLogin(playerName, playerPassword) {
    return new Promise((resolve, reject) => {
        if (playerName === "" || playerPassword === "") {
            reject("User name or password is empty");
            return;
        }
        $.ajax({
            url: "/api/login",
            type: "POST",
            data: { name: playerName, password: playerPassword },
            success: function (data) {
                if (data.error) {
                    reject(data.error);
                    return;
                }
                sessionStorage.setItem("token", data.token);
                resolve();
            },
            error: function (xhr, textStatus, errorThrown) {
                if (xhr.status === 401) {
                    reject("Incorrect password or username");
                } else {
                    reject("Error during login: " + textStatus);
                }
            }
        });
    });
}

$("#player-login-button").click(function () {
    let playerName = $("#player-username-input").val();
    let playerPassword = $("#player-password-input").val();
    if(!playerName || !playerPassword || playerName === "" || playerPassword === ""){
        alert("Please enter the player name and password");
        return;
    }

    userLogin(playerName, playerPassword).then(() => {
        getGames().then(games => {
            populateSelectionList($("#game-name-selection-player"), games);
        });
        showNavigation(4);
    }).catch(error => {
        alert("Error during player login: " + error);
        console.error("Error during player login:", error);
    });
});

$("#master-login-button").click(function() {
    let masterPassword = $("#master-password-input").val();
    if (!masterPassword || masterPassword === "") {
        alert("Please enter the master password");
        return;
    }

    userLogin("master", masterPassword).then(() => {
        showNavigation(5);
    }).catch(error => {
        alert("Error during master login: " + error);
        console.error("Error during master login:", error);
    });
});

$("#master-join-game-button").click(function() {
    getGames().then(games => {
        populateSelectionList($("#game-name-selection"), games);
    });
    getGameMaps().then(maps => {
        populateSelectionList($("#game-map-selection"), maps);
    });
    showNavigation(6);
});

$("#master-set-map-button").click(function() {
    getGameMaps().then(maps => {
        populateSelectionList($("#map-name-selection"), maps);
    });
    showNavigation(7);
});

$("#set-users-button").click(function() {
    getPlayersNames().then(players => {
        populateSelectionList($("#player-username-deletion-input"), players);
    });
    showNavigation(8);
});

//___________________________________________________________________________________________
// work with player accounts
async function getPlayersNames(){
    try {
        const data = await $.get("/api/players");
        if (data.error) {
            alert(data.error);
            return [];
        }
        return data.map(player => player.name);
    } catch (error) {
        console.error("Error fetching players:", error);
        return [];
    }
}
function createPlayer(playerName, playerPassword) {
    return new Promise((resolve, reject) => {
        if (!playerName || !playerPassword || playerName === "" || playerPassword === "") {
            reject("Player name or password is empty");
            return;
        }
        let token = sessionStorage.getItem("token");
        if (!token) {
            reject("No token found");
            return;
        }
        $.ajax({
            url: "/api/register",
            type: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            data: { name: playerName, password: playerPassword, role: "player" },
            success: function (data) {
                resolve(data);
            },
            error: function (xhr, status, error) {;
                let errorMessages = JSON.parse(xhr.responseText);
                reject(error + ": " + errorMessages.error);
            }
        });
    });
}

$("#create-player-button").click(function() {
    let playerName = $("#new-player-name-input").val();
    let playerPassword = $("#new-player-password-input").val();
    if (!playerName || !playerPassword || playerName === "" || playerPassword === "") {
        alert("Please enter the player name and password");
        return;
    }
    
    createPlayer(playerName, playerPassword).then(() => {
        console.log("Player created");
        getPlayersNames().then(players => {
            populateSelectionList($("#player-username-deletion-input"), players);
        });
    }).catch(error => {
        alert("Error during player creation: " + error);
        console.error("Error during player creation:", error);
    });
});

function deletePlayer(playerName) {
    return new Promise((resolve, reject) => {
        if (playerName == "") {
            reject("Player name is empty");
            return;
        }
        let token = sessionStorage.getItem("token");
        if (!token) {
            reject("No token found");
            return;
        }
        $.ajax({
            //query parameter name
            url: `/api/users?name=${playerName}`,
            type: "DELETE",
            headers: { "Authorization": `Bearer ${token}` },
            success: function (data) {
                resolve(data);
            },
            error: function (xhr, status, error) {
                let errorMessages = JSON.parse(xhr.responseText);
                reject(error + ": " + errorMessages.error);
            }
        });
    });
}

$("#delete-player-button").click(function() {
    let playerName = $("#player-username-deletion-input").val();
    if (!playerName || playerName === "") {
        alert("Please enter the player name");
        return;
    }
    
    deletePlayer(playerName).then(() => {
        console.log("Player deleted");
        getPlayersNames().then(players => {
            populateSelectionList($("#player-username-deletion-input"), players);
        });
    }).catch(error => {
        alert("Error during player deletion: " + error);
        console.error("Error during player deletion:", error);
    });
});

//___________________________________________________________________________________________
// work with game maps
function getGameMaps() {
    return new Promise((resolve, reject) => {
        let token = sessionStorage.getItem("token");
        if (!token) {
            reject("No token found");
            return;
        }
        $.ajax({
            url: "/api/games/maps",
            type: "GET",
            headers: { "Authorization": `Bearer ${token}` },
            success: function (data) {
                resolve(data);
            },
            error: function (xhr, status, error) {
                let errorMessages = JSON.parse(xhr.responseText);
                reject(error + ": " + errorMessages.error);
            }
        });
    });
}
function createGameMap(mapName, mapWidth, mapHeight) {
    return new Promise((resolve, reject) => {
        if (!mapName || mapName === "") {
            reject("Map name is empty");
            return;
        }
        let token = sessionStorage.getItem("token");
        if (!token) {
            reject("No token found");
            return;
        }
        $.ajax({
            url: "/api/games/maps",
            type: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            data: { name: mapName, width: mapWidth, height: mapHeight},
            success: function (data) {
                resolve(data);
            },
            error: function (xhr, status, error) {
                let errorMessages = JSON.parse(xhr.responseText);
                reject(error + ": " + errorMessages.error);
            }
        });
    });
}

$("#create-map-button").click(function() {
    let mapName = $("#new-map-name-input").val();
    let mapWidth = parseInt($("#new-map-width-input").val());
    let mapHeight = parseInt($("#new-map-height-input").val());
    if (!mapName || mapName === "" || !mapWidth || mapWidth === "" ||
            !mapHeight || mapHeight === "") {
        alert("Please enter the map name, width and height");
        return;
    }

    if (!Number.isInteger(mapWidth) || !Number.isInteger(mapHeight) ||
            mapWidth <= 0 || mapHeight <= 0) {
        alert("Width and height should be positive integers");
        return;
    }
    
    createGameMap(mapName, mapWidth, mapHeight).then(() => {
        console.log("Map created");
        getGameMaps().then(maps => {
            populateSelectionList($("#map-name-selection"), maps);
        });
    }).catch(error => {
        alert("Error during map creation: " + error);
        console.error("Error during map creation:", error);
    });
});

function deleteGameMap(mapName) {
    return new Promise((resolve, reject) => {
        if (mapName == "") {
            reject("Map name is empty");
            return;
        }
        let token = sessionStorage.getItem("token");
        if (!token) {
            reject("No token found");
            return;
        }
        $.ajax({
            //query parameter name
            url: `/api/games/maps?name=${mapName}`,
            type: "DELETE",
            headers: { "Authorization": `Bearer ${token}` },
            success: function (data) {
                resolve(data);
            },
            error: function (xhr, status, error) {
                let errorMessages = JSON.parse(xhr.responseText);
                reject(error + ": " + errorMessages.error);
            }
        });
    });
}

$("#delete-map-button").click(function() {
    let mapName = $("#map-name-selection").val();
    if (!mapName || mapName === "") {
        alert("Please select the map name");
        return;
    }

    if (confirm(`Are you sure you want to delete the map "${mapName}"?`)) {
        deleteGameMap(mapName).then(() => {
            console.log("Map deleted");
            getGameMaps().then(maps => {
                populateSelectionList($("#map-name-selection"), maps);
            });
        }).catch(error => {
            alert("Error during map deletion: " + error);
            console.error("Error during map deletion:", error);
        });
    }
});

function goToConfigureMap(mapName){
    //store the map name in the session storage
    sessionStorage.setItem("configureMapName", mapName);
    let token = sessionStorage.getItem("token");
    if (!token) {
        alert("No token found");
        return;
    }

    window.location.href = "/setting_map";
}

$("#configure-map-button").click(function() {
    let mapName = $("#map-name-selection").val();
    if (!mapName || mapName === "") {
        alert("Please select the map name");
        return;
    }
    goToConfigureMap(mapName);
});


//___________________________________________________________________________________________
// work with games

function getGames() {
    return new Promise((resolve, reject) => {
        let token = sessionStorage.getItem("token");
        if (!token) {
            reject("No token found");
            return;
        }
        $.ajax({
            url: "/api/games/games",
            type: "GET",
            headers: { "Authorization": `Bearer ${token}` },
            success: function (data) {
                resolve(data);
            },
            error: function (xhr, status, error) {
                let errorMessages = JSON.parse(xhr.responseText);
                reject(error + ": " + errorMessages.error);
            }
        });
    });
}


function createGame(gameName, mapName, settings, currentTime=0) {
    return new Promise((resolve, reject) => {
        if (!gameName || gameName === "") {
            reject("Game name is empty");
            return;
        }
        let token = sessionStorage.getItem("token");
        if (!token) {
            reject("No token found");
            return;
        }
        $.ajax({
            url: "/api/games/games",
            type: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            data: { name: gameName, mapName: mapName, currentTime: currentTime, settings: settings},
            success: function (data) {
                resolve(data);
            },
            error: function (xhr, status, error) {
                let errorMessages = JSON.parse(xhr.responseText);
                reject(error + ": " + errorMessages.error);
            }
        });
    });
}
$("#create-game-button").click(function() {
    let gameName = $("#new-game-name-input").val();
    let mapName = $("#game-map-selection").val();
    let currentTime = 0; // for now
    let settings = {
        timeToMove: $("#new-game-timeToMove-input").val(),
        riskDangerChance: [0.5, 0.5, 0.5, 0.5], // for now
        riskTresureChance: [0.5, 0.5, 0.5, 0.5] // for now
    };
    
    if (!gameName || gameName === "" || !mapName || mapName === "") {
        alert("Please enter the game name and map name");
        return;
    }
    if (!settings.timeToMove || settings.timeToMove === ""){
        alert("Please enter the game time to move");
        return;
    }
    if(settings.timeToMove < 0){
        if(!confirm("Do you really want negative time to move?")) return;
    }

    createGame(gameName, mapName, settings, currentTime).then(() => {
        console.log("Game created");
        getGames().then(games => {
            populateSelectionList($("#game-name-selection"), games);
        });
    }).catch(error => {
        alert("Error during game creation: " + error);
        console.error("Error during game creation:", error);
    });
});


function deleteGame(gameName) {
    return new Promise((resolve, reject) => {
        if (gameName == "") {
            reject("Game name is empty");
            return;
        }
        let token = sessionStorage.getItem("token");
        if (!token) {
            reject("No token found");
            return;
        }
        $.ajax({
            //query parameter name
            url: `/api/games/games?name=${gameName}`,
            type: "DELETE",
            headers: { "Authorization": `Bearer ${token}` },
            success: function (data) {
                resolve(data);
            },
            error: function (xhr, status, error) {
                let errorMessages = JSON.parse(xhr.responseText);
                reject(error + ": " + errorMessages.error);
            }
        });
    });
}
$("#delete-game-button").click(function() {
    let gameName = $("#game-name-selection").val();
    if (!gameName || gameName === "") {
        alert("Please select the game name");
        return;
    }

    if (confirm(`Are you sure you want to delete the game "${gameName}"?`)) {
        deleteGame(gameName).then(() => {
            console.log("Game deleted");
            getGames().then(games => {
                populateSelectionList($("#game-name-selection"), games);
            });
        }).catch(error => {
            alert("Error during game deletion: " + error);
            console.error("Error during game deletion:", error);
        });
    }
});


/**
 * 
 * @param {*} gameName game to be loaded 
 * @param {*} role master or player based on that differnet startup routine will be performed
 * @returns none
 */
function joinGame(gameName, role){
    //store the map name in the session storage
    sessionStorage.setItem("joiningGameName", gameName);
    sessionStorage.setItem("role", role);
    let token = sessionStorage.getItem("token");
    if (!token) {
        alert("No token found");
        return;
    }

    window.location.href = "/gameplay";
}

//master
$("#join-game-button").click(function() {
    let gameName = $("#game-name-selection").val();
    if (!gameName || gameName === "") {
        alert("Please select the game name");
        return;
    }
    joinGame(gameName, "master");
});
//player
$("#join-game-button-player").click(function() {
    let gameName = $("#game-name-selection-player").val();
    if (!gameName || gameName === "") {
        alert("Please select the game name");
        return;
    }
    joinGame(gameName, "player");
});