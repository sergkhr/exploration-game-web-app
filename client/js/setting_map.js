let floorVariants_full;
let spaceVariants_full;
let contentVariants_full;
let backgroundVariants_full;

let map_container = $("#map_container");
let outer_container = $("#container");

let work_map;

let is_painting_mode = false;
let painting_cell_type = "floor";


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



////////////////////////////////////////////////////////////////////
/////////////////STARTUP ROUTINE////////////////////////////////////
////////////////////////////////////////////////////////////////////

$(document).ready(function() {
    checkIfMasterUser().then(() => {
        $("#loading_curtain").addClass("hidden");
        getSettings().then((data) => {
            floorVariants_full = data.floorVariants_full;
            spaceVariants_full = data.spaceVariants_full;
            contentVariants_full = data.contentVariants_full;
            backgroundVariants_full = data.backgroundVariants_full;

            addPaintingModeCheckboxChange();
            addCellTypeToPaintChange();

            populateContentPicker();
        }).catch((error) => {
            console.log(error);
        });


        let mapName = sessionStorage.getItem('configureMapName');
        getMapByName(mapName).then((map) => {
            work_map = map;
            populateMap(work_map);
            addLeftClickEventToHexagons();
            addClickEventToContentPicker();
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
    
}


///////////////////////////////////////////////////////////////////////////
////////////////////BIG CONTROLS///////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////


$("#back-to-main-page").click(function() {
    window.location.href = '/';
});

outer_container.on('wheel', function(event){ //resize the map on mouse wheel
    debounce(resizeMap(event, map_container, outer_container, $("#content_picker")), 300)
});

handleDrag(map_container[0], outer_container[0]);

///////////////////////////////////////////////////////////////////////////
////////////////////HEXAGON CONTROLS///////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

function addLeftClickEventToHexagons(){
    $(".hex").on("click", function(event) {
        if(event.button !== 0) return;

        if(is_painting_mode){
            paintHexagon($(this));
            return;
        }
        
        let hex = $(this);
        let i = hex.data("row");
        let j = hex.data("column");
        let x = parseFloat(hex.css("left")) + hex.width();
        let y = parseFloat(hex.css("top")) - 0.5* hex.height();
        
        displayContentPicker(i, j, x, y);
    });
}

/**
 * attaches a deletion function to the element
 * 
 * @param {jquery object} element to which a deletion function will be attached
 */
function addSelfDeletion($content) {
    $content.on('contextmenu', function(e) {
        e.preventDefault();
        $(this).remove();
    });
}

////////////////////////////////////////////////////////////////////
/////////////////ADDING CONTENT AND CONTENT PICKER///////////////////
////////////////////////////////////////////////////////////////////

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


function addClickEventToContentPicker() {
    // Навешиваем обработчик клика на все элементы внутри #content_picker с классом .content_element
    $("#content_picker .content_element").on("click", function() {
        // Получаем выбранный элемент: берем первого потомка (например, <img>)
        let $selectedContent = $(this).children().first();

        // Получаем данные шестиугольника, в который нужно добавить контент
        let $contentPicker = $("#content_picker");
        let hexRow = $contentPicker.data("hex_i");
        let hexColumn = $contentPicker.data("hex_j");

        // Находим нужный шестиугольник по данным row и column
        let $hexagon = $(".hex").filter(function() {
            return $(this).data("row") === hexRow && $(this).data("column") === hexColumn;
        }).first();

        // Если шестиугольник найден, добавляем в него выбранный контент.
        // Используем .clone(), чтобы не перемещать оригинальный элемент из content_picker.
        if ($hexagon.length > 0) {
            addContentToHexagon($selectedContent.clone(), $hexagon);
        }
    });
}


/**
 * Add content to a hexagon
 * 
 * @param {jquery object} content all DOM elemnts to put inside the hexagon
 * @param {jquery object} hexagon the hexagon to add the content to
 */
function addContentToHexagon(content, hexagon) {
    let $inner = hexagon.find('.inner');
    if ($inner.children().length < 8) {
        $inner.append(content);
        addSelfDeletion(content);
        
        hexagon.append($inner);
    } else {
        console.log("Hexagon already contains maximum content.");
    }
}

////////////////////////////////////////////////////////////////////
/////////////////PAINTING CELL TYPES CONTROLS///////////////////////
////////////////////////////////////////////////////////////////////

function addPaintingModeCheckboxChange(){
    $("#painting-mode-checkbox").on("change", function() {
        is_painting_mode = $(this).prop("checked");
        console.log("Painting mode:", is_painting_mode);
    });
}

function addCellTypeToPaintChange(){
    $("input[name='cell-type']").on("change", function() {
        painting_cell_type = $(this).val();
        console.log("Painting cell type:", painting_cell_type);
    });
}

function paintHexagon(hexagon){
    if (painting_cell_type === "space") {
        hexagon.addClass("space");
    } else if (painting_cell_type === "floor") {
        hexagon.removeClass("space");
    }
}

