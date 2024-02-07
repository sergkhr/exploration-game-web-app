

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
function showNavigation(dataIndex){
    $(".data-block").addClass("hidden");
    $(".buttons-block").addClass("hidden");

    $(`.data-block[data-index=${dataIndex}]`).removeClass("hidden");
    $(`.buttons-block[data-index=${dataIndex}]`).removeClass("hidden");
}
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
function populatePlayersList(playersList, players) {
    playersList.empty();
    players.forEach(player => {
        playersList.append(`<option value="${player}">${player}</option>`);
    });
}

$("#back-to-main-page").click(function() {
    showNavigation(1);
});
$("#pick-player-role-btn").click(function() {
    getPlayersNames().then(players => {
        populatePlayersList($("#player-username-input"), players);
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
        $.post("/api/login", { name: playerName, password: playerPassword }, function (data) {
            if (data.error) {
                reject(data.error);
                return;
            }
            sessionStorage.setItem("token", data.token);
            resolve();
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
        //TODO: load active games list
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
    //TODO: load active games list
    showNavigation(6);
});

$("#master-set-map-button").click(function() {
    //TODO: load existing maps list
    showNavigation(7);
});

$("#set-users-button").click(function() {
    getPlayersNames().then(players => {
        populatePlayersList($("#player-username-deletion-input"), players);
    });
    showNavigation(8);
});

//___________________________________________________________________________________________
// work with player accounts
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
            populatePlayersList($("#player-username-deletion-input"), players);
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
            populatePlayersList($("#player-username-deletion-input"), players);
        });
    }).catch(error => {
        alert("Error during player deletion: " + error);
        console.error("Error during player deletion:", error);
    });
});