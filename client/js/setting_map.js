let floorVariants_full;
let spaceVariants_full;
let contentVariants_full;
let backgroundVariants_full;

let map_container = $("#map_container");
let outer_container = $("#container");

let work_map;

let is_painting_mode = false;
let painting_cell_type = "floor";

let $work_content;


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
function updateMapByName(mapName, settings, mapWidth, mapHeight, cells) {
    return new Promise((resolve, reject) => {
        let token = sessionStorage.getItem('token');
        $.ajax({
            url: '/api/games/maps?name=' + mapName,
            type: 'PUT',
            headers: { "Authorization": `Bearer ${token}` },
            data: JSON.stringify({ settings: settings, width: mapWidth, height: mapHeight, cells: cells }),
            contentType: 'application/json', // Ensure the data is sent as JSON
            success: function(data) {
                resolve(data);
            },
            error: function (xhr, status, error) {
                let errorMessages = JSON.parse(xhr.responseText);
                reject(error + ": " + errorMessages.error);
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
            addClickEventToModifyingMenu()
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
    contentVariantsKeys.forEach((contentType) => {
        let content_element = $("<div class=\"content_element\" data-content=\"" + contentType + "\"></div>");
        
        let src_name = contentVariants_full[contentType];
        let content_img = $("<img src=\"../src/icons/" + src_name + "\" data-content-type=\"" + contentType + "\" class=\"content_icon\" alt=\"er\">");

        let content_name = $("<p class=\"content_name\">" + contentType + "</p>");
        content_element.append(content_img);
        content_element.append(content_name);
        
        contentPicker.append(content_element);
    });
}

function populateColorPicker(current_floor_type, current_space_type){
    let floorVariantSelect = $("#floor-variant-select");
    let spaceVariantSelect = $("#space-variant-select");
    floorVariantSelect.empty();
    spaceVariantSelect.empty();
    let floorVariantsKeys = Object.keys(floorVariants_full);
    let spaceVariantsKeys = Object.keys(spaceVariants_full);
    
    // Populate floor variant select
    floorVariantsKeys.forEach((key) => {
        let option = $("<option></option>").val(key).text(key);
        if (key === current_floor_type) {
            option.prop("selected", true);
        }
        floorVariantSelect.append(option);
    });

    // Populate space variant select
    spaceVariantsKeys.forEach((key) => {
        let option = $("<option></option>").val(key).text(key);
        if (key === current_space_type) {
            option.prop("selected", true);
        }
        spaceVariantSelect.append(option);
    });

    addOnChangeColorPicker();
}

function populateBackgroundPicker(current_background_type){
    let backgroundVariantSelect = $("#background-variant-select");
    backgroundVariantSelect.empty();
    let backgroundVariantsKeys = Object.keys(backgroundVariants_full);

    // Populate floor variant select
    backgroundVariantsKeys.forEach((key) => {
        let option = $("<option></option>").val(key).text(key);
        if (key === current_background_type) {
            option.prop("selected", true);
        }
        backgroundVariantSelect.append(option);
    });

    addOnChangeBackgroundPicker();
}

function populateMap(map){
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


    populateColorPicker(floor_type, space_type);

    populateBackgroundPicker(background_type);
    
    
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

/**
 * also calls color change from selected types once,
 * so use once after selects are initialized with types, 
 * and it will configure the colors for the map in css 
 */
function addOnChangeColorPicker(){
    let floorVariantSelect = $("#floor-variant-select");
    let spaceVariantSelect = $("#space-variant-select");
    function updateColors() {
        let chosen_floor_type = floorVariantSelect.val();
        let chosen_space_type = spaceVariantSelect.val();

        changeColors(chosen_floor_type, chosen_space_type);
    }

    // Attach event listeners for the 'change' event on both select elements
    floorVariantSelect.on("change", updateColors);
    spaceVariantSelect.on("change", updateColors);

    // Initial call to update colors with the current selection
    updateColors();
}

/**
 * also calls background change from selected types once,
 * so use once after selects are initialized with types, 
 * and it will configure the background for the map in css 
 */
function addOnChangeBackgroundPicker(){
    let backgroundVariantSelect = $("#background-variant-select");
    function updateBackground() {
        let chosen_background_type = backgroundVariantSelect.val();

        changeBackground(chosen_background_type);
    }

    // Attach event listeners for the 'change' event on select element
    backgroundVariantSelect.on("change", updateBackground);

    // Initial call to update colors with the current selection
    updateBackground();
}


/**
 * Retrieves the current map settings and cells from the DOM.
 * The settings are read from the select elements,
 * and the cells are built by iterating over each hexagon in the map container.
 * @returns {Object} An object containing settings and cells
 */
function getMapSettingsAndCells() {
    // Get settings from the select elements
    let settings = {
        floor: $("#floor-variant-select").val(),
        space: $("#space-variant-select").val(),
        background: $("#background-variant-select").val()
    };

    // Initialize an empty 2D array for cells
    let cells = [];

    // Iterate over each hexagon in the map container
    $("#map_container .hex").each(function() {
        let $hex = $(this);
        // Retrieve row and column indices from data attributes
        let row = $hex.data("row");
        let col = $hex.data("column");

        // Ensure the row exists in the cells array
        if (!cells[row]) {
            cells[row] = [];
        }

        // Determine cell properties based on hexagon classes:
        let isFloor = !$hex.hasClass("space");
        let isClosed = $hex.hasClass("closed");

        // Build the content array by iterating over children of the .inner element
        let content = [];
        $hex.find(".inner").children(".content_icon").each(function() {
            let $child = $(this);
            let type = $child.data("content-type");
            let isHidden = $child.hasClass("hidden");
            // Push the content object to the array
            content.push({ type: type, isHidden: isHidden });
        });

        // Construct the cell object and assign it to the corresponding position in the cells array
        cells[row][col] = {
            isFloor: isFloor,
            isClosed: isClosed,
            content: content
        };
    });

    return { settings: settings, cells: cells };
}
$("#save-button").click(function(){
    let mapName = $("#mapNameContainer").data("mapName");

    // Retrieve the current settings and cells from the map
    let result = getMapSettingsAndCells();
    let settings = result.settings;
    let cells = result.cells;

    // Optionally update mapWidth and mapHeight if needed (here we use null to indicate no update)
    let mapWidth = null;
    let mapHeight = null;
    

    // Call the API function to update the map by its name
    updateMapByName(mapName, settings, mapWidth, mapHeight, cells)
        .then((data) => {
            console.log("Map updated successfully", data);
        })
        .catch((error) => {
            console.error("Error updating map", error);
        });
});

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
function addModifyingMenu($content) {
    $content.on('contextmenu', function(e) {
        e.preventDefault();
        displayModifyingMenu($content)
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
        addModifyingMenu(content);
        
        hexagon.append($inner);
    } else {
        console.log("Hexagon already contains maximum content.");
    }
}


////////////////////////////////////////////////////////////////////
/////////////////MODIFYING CONTENT//////////////////////////////////
////////////////////////////////////////////////////////////////////

function displayModifyingMenu($content){
    let modifyingMenu = $("#content_modifier");
    $work_content = $content;
    let hex = $content.parent().parent();
    
    let x = parseFloat(hex.css("left")) + $content.position().left + $content.width();
    let y = parseFloat(hex.css("top")) + $content.position().top;
    
    modifyingMenu.css("left", x);
    modifyingMenu.css("top", y);
    
    modifyingMenu.removeClass("hidden");

    clearTimeout(modifyingMenu.data('timeoutId'));
    let timeoutId = setTimeout(() => {
        modifyingMenu.addClass("hidden");
    }, 2000);
    modifyingMenu.data('timeoutId', timeoutId);
}

$("#content_modifier").hover(function(){
    clearTimeout($(this).data('timeoutId'));
    $(this).removeClass("fading");
}, function(){
    $(this).addClass("fading");
    let timeoutId = setTimeout(() => {
        $(this).addClass("hidden");
    }, 1000);
    $(this).data('timeoutId', timeoutId);
});

function addClickEventToModifyingMenu() {
    $("#change_content_visibility").on("click", function() {
        $work_content.toggleClass("hidden");
        $("#content_modifier").addClass("hidden");
    });

    $("#delete_content").on("click", function(){
        $work_content.remove();
        $("#content_modifier").addClass("hidden");
    });
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

