let floorVariants_full;
let spaceVariants_full;
let contentVariants_full;
let backgroundVariants_full;

let map_container = $("#map_container");
let outer_container = $("#container");

let work_game;
let work_map; // for map that is saved not inside the game itself

const socket = io(); // connection to web socket server

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
    const token = sessionStorage.getItem("token");
    if (!token) {
        console.error("Missing auth token");
        return;
    }

    socket.emit("toggleCellVisibility", {
        token: token,
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
}


