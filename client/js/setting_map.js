let floorVariants_full;
let spaceVariants_full;
let contentVariants_full;
let backgroundVariants_full;

let map_container = $("#map_container");
let outer_container = $("#container");

let work_map;

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

$(document).ready(function() {
    checkIfMasterUser().then(() => {
        $("#loading_curtain").addClass("hidden");
        getSettings().then((data) => {
            floorVariants_full = data.floorVariants_full;
            spaceVariants_full = data.spaceVariants_full;
            contentVariants_full = data.contentVariants_full;
            backgroundVariants_full = data.backgroundVariants_full;

            populateContentPicker();
        }).catch((error) => {
            console.log(error);
        });


        let mapName = sessionStorage.getItem('configureMapName');
        getMapByName(mapName).then((map) => {
            work_map = map;
            populateMap(work_map);
        }).catch((error) => {
            console.log(error);
        });
    }).catch((error) => {
        console.log(error);
        window.location.href = '/';
    });
});



function populateContentPicker(){
    let contentPicker = $("#content_picker");
    contentPicker.empty();
    let contentVariantsKeys = Object.keys(contentVariants_full);
    contentVariantsKeys.forEach((content) => {
        let content_element = $("<div class=\"content_element\" data-content=\"" + content + "\"></div>");
        let src_name = contentVariants_full[content];
        let content_img = $("<img src=\"../src/icons/" + src_name + "\" class=\"content_icon\" alt=\"er\">");
        let content_name = $("<p class=\"content_name\">" + content + "</p>");
        content_element.append(content_img);
        content_element.append(content_name);
        
        contentPicker.append(content_element);
    });
}

function populateMap(map){
    let mapName = map.name;
    let floor_type = map.settings.floor;
    let space_type = map.settings.space;
    let background_type = map.settings.background;
    let column_number = parseFloat(map.width);
    let row_number = parseFloat(map.height);
    let cells = map.cells;

    let floor_color = floorVariants_full[floor_type];
    $('html').css('--floor-color', floor_color);
    let space_color = spaceVariants_full[space_type];
    $('html').css('--space-color', space_color);
    let background_src = backgroundVariants_full[background_type];
    background_src = "../src/backgrounds/" + background_src;
    $('html').css('--map-background-image', 'url(' + background_src + ')');

    
    
    let hex_horizontal_width = parseFloat($('html').css('--hexagon-size'));
    let hex_vertical_width = hex_horizontal_width * Math.tan(Math.PI / 6);
    let hex_gap = parseFloat($('html').css('--hexagon-gap'));

    let container = map_container;
    container.find('.hex').remove();
    let calculated_cont_width = (column_number + 0.5) * hex_horizontal_width + (column_number - 1 + 0.5) * hex_gap   + 5 + $("#content_picker").width();
    let calculated_cont_height = (row_number * 1.5 + 0.5) * hex_vertical_width + (row_number - 1) * hex_gap * Math.sin(Math.PI / 3)   + 4 + $("#content_picker").height();
    container.css('min-width', calculated_cont_width + 'px');
    container.css('min-height', calculated_cont_height + 'px');

    cells.forEach((row, i) => {
        row.forEach((cell, j) => {
            let x = ((i+1) % 2) * (hex_horizontal_width + hex_gap) / 2 + j * (hex_horizontal_width + hex_gap);
            let y = hex_vertical_width / 2 + i * (1.5*hex_vertical_width + hex_gap * Math.sin(Math.PI / 3));

            let hex_content = [];
            cell.content.forEach((i, content) => {
                let src_name = contentVariants_full[content.type];
                let icon_hidden = content.isHidden ? "hidden" : "";
                let content_element = $("<img src=\"../src/icons/" + src_name + "\" class=\"content_icon" + " " + icon_hidden + "\" alt=\"er\">");

                hex_content.push(content_element);
            });
            let content_html = hex_content.join('');

            createHexagon(content_html, x, y, i, j, container, cell.isFloor, cell.isClosed);
        });
    });
    addDblClickEventToHexagons();
}

/**
 * Add content to a hexagon
 * 
 * @param {jquery object} content all DOM elemnts to put inside the hexagon
 * @param {jquery object} hexagon the hexagon to add the content to
 */
function addContentToHexagon(content, hexagon) {
    let $inner = hexagon.find('.inner');
    $inner.append(content);
    hexagon.append($inner);
}


outer_container.on('wheel', function(event){ //resize the map on mouse wheel
    debounce(resizeMap(event, map_container, outer_container, $("#content_picker")), 300)
});

handleDrag(map_container[0], outer_container[0]);

$("#back-to-main-page").click(function() {
    window.location.href = '/';
});

function addDblClickEventToHexagons(){
    $(".hex").on("dblclick", function() {
        let hex = $(this);
        let i = hex.data("row");
        let j = hex.data("column");
        let x = parseFloat(hex.css("left")) + hex.width();
        let y = parseFloat(hex.css("top")) - 0.5* hex.height();
        
        displayContentPicker(i, j, x, y);
    });
}

function displayContentPicker(hex_i, hex_j, x, y){
    let contentPicker = $("#content_picker");
    contentPicker.data("hex_i", hex_i);
    contentPicker.data("hex_j", hex_j);
    contentPicker.css("left", x);
    contentPicker.css("top", y);
    
    contentPicker.removeClass("hidden");

    clearTimeout(contentPicker.data('timeoutId'));
    let timeoutId = setTimeout(() => {
        contentPicker.addClass("hidden");
    }, 2000);
    contentPicker.data('timeoutId', timeoutId);
}
$("#content_picker").hover(function(){
    clearTimeout($(this).data('timeoutId'));
    $(this).removeClass("fading");
}, function(){
    $(this).addClass("fading");
    let timeoutId = setTimeout(() => {
        $(this).addClass("hidden");
    }, 1000);
    $(this).data('timeoutId', timeoutId);
});