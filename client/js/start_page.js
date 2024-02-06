

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


// navigation click events
function showNavigation(dataIndex){
    $(".data-block").addClass("hidden");
    $(".buttons-block").addClass("hidden");

    $(`.data-block[data-index=${dataIndex}]`).removeClass("hidden");
    $(`.buttons-block[data-index=${dataIndex}]`).removeClass("hidden");
}

$("#back-to-main-page").click(function() {
    showNavigation(1);
});
$("#pick-player-role-btn").click(function() {
    getPlayersNames().then(players => {
        populatePlayersList(players);
    });
    showNavigation(2);
});
$("#pick-master-role-btn").click(function() {
    showNavigation(3);
});


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
function populatePlayersList(players) {
    const $playersList = $("#player-username-input");
    $playersList.empty();
    players.forEach(player => {
        $playersList.append(`<option value="${player}">${player}</option>`);
    });
}


//________________________________________________________________________________________________
$("#player-login-button").click(function() {
    let playerName = $("#player-name-input").val();
    let playerPassword = $("#player-password-input").val();
    if (playerName === "" || playerPassword === "") {
        alert("Please enter the player name and password");
        return;
    }
    $.post("/api/login", {name: playerName, password: playerPassword}, function(data) {
        if (data.error) {
            alert(data.error);
            return;
        }
        sessionStorage.setItem("token", data.token);
    }).then(() => {
        showNavigation(4);
    });
});

$("#master-login-button").click(function() {
    let masterPassword = $("#master-password-input").val();
    if (masterPassword === "") {
        alert("Please enter the master password");
        return;
    }
    $.post("/api/login", {name: "master", password: masterPassword}, function(data) {
        if (data.error) {
            alert(data.error);
            return;
        }
        sessionStorage.setItem("token", data.token);
    }).then(() => {
        showNavigation(5);
    });
});