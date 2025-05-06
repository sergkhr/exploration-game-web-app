let floorVariants_full;
let spaceVariants_full;
let contentVariants_full;
let backgroundVariants_full;

let map_container = $("#map_container");
let outer_container = $("#container");

let work_game;
let work_map; // for map that is saved not inside the game itself

let waiting_for_turn_confirmation = false;


// connection to web socket server
const socket = io({
    auth: {
        token: sessionStorage.getItem("token")
    }
}); 

// let is_painting_mode = false;
// let painting_cell_type = "floor";

// let $work_content;


////////////////////////////////////////////////////////////////////
/////////////////API FUNCTIONS//////////////////////////////////////
////////////////////////////////////////////////////////////////////

function checkIfMasterUser(){
    return new Promise((resolve, reject) => {
        let token = sessionStorage.getItem('token');
        $.ajax({
            url: '/api/checkIfMaster',
            type: 'GET',
            headers: { "Authorization": `Bearer ${token}` },
            success: function(data) {
                console.log('Master user');
                resolve(data);
            },
            error: function(data) {
                console.log('Not master user');
                reject(data);
            }
        });
    });
}
function checkIfPlayerUser(){
    return new Promise((resolve, reject) => {
        let token = sessionStorage.getItem('token');
        $.ajax({
            url: '/api/checkIfPlayer',
            type: 'GET',
            headers: { "Authorization": `Bearer ${token}` },
            success: function(data) {
                console.log('Player user');
                resolve(data);
            },
            error: function(data) {
                console.log('Not player user');
                reject(data);
            }
        });
    });
}
function getSettings() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/api/games/settings',
            type: 'GET',
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

function getGameByName(gameName) {
    return new Promise((resolve, reject) => {
        let token = sessionStorage.getItem('token');
        $.ajax({
            url: '/api/games/getGame?name=' + gameName,
            type: 'GET',
            headers: { "Authorization": `Bearer ${token}` },
            success: function(data) {
                resolve(data);
            },
            error: function(data) {
                reject(data);
            }
        });
    });
}
function getMapByName(mapName) {
    return new Promise((resolve, reject) => {
        let token = sessionStorage.getItem('token');
        $.ajax({
            url: '/api/games/getMap?name=' + mapName,
            type: 'GET',
            headers: { "Authorization": `Bearer ${token}` },
            success: function(data) {
                resolve(data);
            },
            error: function(data) {
                reject(data);
            }
        });
    });
}


////////////////////////////////////////////////////////////////////
/////////////////STARTUP ROUTINE////////////////////////////////////
////////////////////////////////////////////////////////////////////

$(document).ready(function() {
    let gameName = sessionStorage.getItem('joiningGameName');
    let role = sessionStorage.getItem('role');

    if(role === "master"){
        checkIfMasterUser().then(() => {
            
            subscribeToJoinGame(gameName);
            getSettings().then((data) => {
                floorVariants_full = data.floorVariants_full;
                spaceVariants_full = data.spaceVariants_full;
                contentVariants_full = data.contentVariants_full;
                backgroundVariants_full = data.backgroundVariants_full;
    
                
                $("#top-button-block").addClass("master");
            }).catch((error) => {
                console.log(error);
            });

            
            getGameByName(gameName).then((game) => {
                work_game = game;
                let activeMap = work_game.activeMap;

                populateMap(activeMap, "master");
                outer_container.addClass("master");
                addRightClickChangeVisibility($(".hex"));
                addMasterCharacterMoveOnLeftClickToHex();

                let characterPosition = work_game.characterPosition;
                updateCharacterPosition(characterPosition.row, characterPosition.column);
            }).catch((error) => {
                console.log(error);
            });

            $("#loading_curtain").addClass("hidden");
        }).catch((error) => {
            console.log(error);
            window.location.href = '/';
        });
        return;
    }

    if(role === "player"){
        checkIfPlayerUser().then(() => {
            
            subscribeToJoinGame(gameName);
            getSettings().then((data) => {
                floorVariants_full = data.floorVariants_full;
                spaceVariants_full = data.spaceVariants_full;
                contentVariants_full = data.contentVariants_full;
                backgroundVariants_full = data.backgroundVariants_full;
    

                $("#top-button-block").addClass("player");
            }).catch((error) => {
                console.log(error);
            });
    
    
            
            getGameByName(gameName).then((game) => {
                work_game = game;
                let activeMap = work_game.activeMap;

                populateMap(activeMap);
                outer_container.addClass("player");
                addPlayerCharacterMoveOnLeftClickToHex();

                let characterPosition = work_game.characterPosition;
                updateCharacterPosition(characterPosition.row, characterPosition.column);
            }).catch((error) => {
                console.log(error);
            });

            $("#loading_curtain").addClass("hidden");
        }).catch((error) => {
            console.log(error);
            window.location.href = '/';
        });
        return;
    }

    //if role is not stored properly
    window.location.href = '/';
});


function populateMap(map, role="player"){
    let mapName = map.name;
    let floor_type = map.settings.floor;
    let space_type = map.settings.space;
    let background_type = map.settings.background;
    let column_number = parseFloat(map.width);
    let row_number = parseFloat(map.height);
    let cells = map.cells;

    let mapNameContainer = $("#mapNameContainer")
    mapNameContainer.data("mapName", mapName);
    mapNameContainer.html("map: " + mapName);


    // populateColorPicker(floor_type, space_type);
    changeColors(floor_type, space_type);

    // populateBackgroundPicker(background_type);
    changeBackground(background_type);
    
    
    let hex_horizontal_width = parseFloat($('html').css('--hexagon-size'));
    let hex_vertical_width = hex_horizontal_width * Math.tan(Math.PI / 6);
    let hex_gap = parseFloat($('html').css('--hexagon-gap'));

    let container = map_container;
    container.find('.hex').remove();
    let calculated_cont_width = (column_number + 0.5) * hex_horizontal_width + (column_number - 1 + 0.5) * hex_gap   + 5;
    let calculated_cont_height = (row_number * 1.5 + 0.5) * hex_vertical_width + (row_number - 1) * hex_gap * Math.sin(Math.PI / 3)   + 4 ;
    container.css('min-width', calculated_cont_width + 'px');
    container.css('min-height', calculated_cont_height + 'px');

    cells.forEach((row, i) => {
        row.forEach((cell, j) => {
            let x = ((i+1) % 2) * (hex_horizontal_width + hex_gap) / 2 + j * (hex_horizontal_width + hex_gap);
            let y = hex_vertical_width / 2 + i * (1.5*hex_vertical_width + hex_gap * Math.sin(Math.PI / 3));

            let hex_content = [];
            cell.content.forEach((content) => {
                let src_name = contentVariants_full[content.type];
                let icon_hidden = content.isHidden ? "hidden" : "";
                let content_element = $("<img src=\"../src/icons/" + src_name + "\" data-content-type=\"" + content.type + "\" class=\"content_icon" + " " + icon_hidden + "\" alt=\"er\">");
            
                hex_content.push(content_element);
            });
            let content_html = hex_content.join('');

            createHexagon(hex_content, x, y, i, j, container, cell.isFloor, cell.isClosed);
        });
    });
    
}


///////////////////////////////////////////////////////////////////////////
////////////////////BIG CONTROLS///////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////


$("#back-to-main-page").click(function() {
    window.location.href = '/';
});

outer_container.on('wheel', function(event){ //resize the map on mouse wheel
    debounce(resizeMap(event, map_container, outer_container, $(".hex_menu")), 300)
});

handleDrag(map_container[0], outer_container[0]);


/**
 * changes the css variables for colors for floor and space hexagons
 * 
 * @param {key} floor_type, what type from settings to use for floors
 * @param {key} space_type, what type from settings to use for spaces
 */
function changeColors(floor_type, space_type){
    let floor_color = floorVariants_full[floor_type];
    $('html').css('--floor-color', floor_color);
    let space_color = spaceVariants_full[space_type];
    $('html').css('--space-color', space_color);
}

/**
 * changes the css variable for background picture
 * 
 * @param {key} background_type, what type from settings to use
 */
function changeBackground(background_type){
    let background_src = backgroundVariants_full[background_type];
    background_src = "../src/backgrounds/" + background_src;
    $('html').css('--map-background-image', 'url(' + background_src + ')');
}


//turn confirmation stuff
function showConfirmButton(){
    $("#complete-turn-button").removeClass("hidden");
    waiting_for_turn_confirmation = true;
}
$("#complete-turn-button").click(function(){
    let character = $("#character");
    let to_i = character.data("row");
    let to_j = character.data("column");

    socket.emit('moveCharacter', {
        gameName: work_game.name,
        row: to_i,
        column: to_j
    });
}); 

///////////////////////////////////////////////////////////////////////////
////////////////////HEXAGON CONTROLS///////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

/**
 * attaches a right click to the element
 * 
 * @param {jquery_object} element to which modifing menu will be attached
 */
function addRightClickChangeVisibility($element) {
    $element.on('contextmenu', function(e) {
        e.preventDefault();
        let hex = $(this);
        let i = hex.data("row");
        let j = hex.data("column");

        requestToggleCellVisibility(work_game.name, i, j)
    });
}


function requestToggleCellVisibility(gameName, i, j) {
    socket.emit("toggleCellVisibility", {
        gameName: gameName,
        i: i,
        j: j
    });
}


function getHexByCoordinates(i, j) {
    return $(".hex").filter(function() {
        return $(this).data("row") === i && $(this).data("column") === j;
    }).first(); // возвращает первый найденный hex
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


///////////////////////////////////////////////////////////////////////////
////////////////////CHARATER POSITIONING///////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

function updateCharacterPosition(row, column){
    let character = $("#character");
    let hex = getHexByCoordinates(row, column);
    if (!hex.length) {
        console.log("Hex not found");
        return; 
    }

    const x = parseFloat(hex.css("left")) + (hex.outerWidth() - character.outerWidth()) / 2;

    character.css("left", x + "px");
    character.css("top", hex.css("top"));

    character.data("row", row);
    character.data("column", column);

    $("#character-ghost").addClass("hidden");
    waiting_for_turn_confirmation = false;
    $("#complete-turn-button").addClass("hidden");
}

/**
 * changes the character position and leaves the "ghost" behind
 * @param {Number} row where to move
 * @param {Number} column where to move
 * @returns 
 */
function characterMoveByPlayer(row, column){
    let character = $("#character");
    let character_ghost = $("#character-ghost");
    let hex = getHexByCoordinates(row, column);
    if (!hex.length) {
        console.log("Hex not found");
        return; 
    }

    character_ghost.css("left", character.css("left"));
    character_ghost.css("top", character.css("top"));
    character_ghost.data("row", character.data("row"));
    character_ghost.data("column", character.data("column"));
    character_ghost.removeClass("hidden");


    const x = parseFloat(hex.css("left")) + (hex.outerWidth() - character.outerWidth()) / 2;

    character.css("left", x + "px");
    character.css("top", hex.css("top"));
    character.data("row", row);
    character.data("column", column);
}

/**
 * adds left click to all .hex
 * on click tries to move the character to the clicked hex
 * 
 * Checks for everything here
 */
function addMasterCharacterMoveOnLeftClickToHex(){
    $(".hex").on("click", function(event) {
        let character = $("#character");
        let from_i = character.data("row");
        let from_j = character.data("column");
        

        let hex = $(this);
        let to_i = hex.data("row");
        let to_j = hex.data("column")

        if(from_i === to_i && from_j === to_j) return;

        socket.emit('moveCharacter', {
            gameName: work_game.name,
            row: to_i,
            column: to_j
        });
    });
}


/**
 * adds left click to all .hex
 * on click tries to move the character to the clicked hex
 * 
 * Checks for everything here
 */
function addPlayerCharacterMoveOnLeftClickToHex(){
    $(".hex").on("click", function(event) {
        let character = $("#character");
        let from_i = character.data("row");
        let from_j = character.data("column");
        

        let hex = $(this);
        let to_i = hex.data("row");
        let to_j = hex.data("column")

        if(!areHexesAdjacent(from_i, from_j, to_i, to_j)){
            console.warn("players can only move character to an adjacent hex");
            return;
        }
        if(hex.hasClass("space")){
            console.warn("players cannot move character to the space hexes");
            return;
        }
        if(from_i === to_i && from_j === to_j) return;
        if(waiting_for_turn_confirmation){
            console.warn("still waiting for turn to be confirmed by master");
            return;
        }


        if(!confirm("Are you sure you want to request the move there?")) return;

        socket.emit('playerWantsToMoveCharacter', {
            gameName: work_game.name,
            row: to_i,
            column: to_j
        });
    });
}

///////////////////////////////////////////////////////////////////////////
////////////////////WEB SOCKET PROCESSING///////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

function subscribeToJoinGame(gameName){
    socket.emit('joinGame', gameName);


    // listen to players joining
    socket.on('playerJoined', (message) => {
        console.log("Server:", message);
    });


    //listen to cells changing visibility
    socket.on("cellVisibilityChanged", ({ row, column, isClosed }) => {
        console.log(`Cell at (${row}, ${column}) changed visibility`);
        
        let hex = getHexByCoordinates(row, column);
        if (hex.length) {
            // Hex found
            if(isClosed) hex.addClass("closed");
            else hex.removeClass("closed");
        } else {
            console.log("Hex not found");
        }
    });

    socket.on('moveDenied', (reason) => {
        console.erroe("move was denied, reason: " + reason);
    });

    socket.on('characterMoved', ({row, column}) =>{
        updateCharacterPosition(row, column);
    });


    //when move is being done by player
    socket.on('playerRequestedMove', ({ row, column, gameName }) => {
        characterMoveByPlayer(row, column);
        
        //master route
        if(outer_container.hasClass('master')){
            showConfirmButton();
            return;
        }

        //player route
        if(outer_container.hasClass('player')){
            waiting_for_turn_confirmation = true;
            console.log("Ждем подтверждения хода мастером")
            return;
        }
    });
}


