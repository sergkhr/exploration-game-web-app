let floorVariants_full;
let spaceVariants_full;
let contentVariants_full;

let map_container = $("#map_container");

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




function populateMap(map){
    let mapName = map.name;
    let floor_type = map.settings.floor;
    let space_type = map.settings.space;
    let column_number = parseFloat(map.width);
    let row_number = parseFloat(map.height);
    let cells = map.cells;
    
    let hex_horizontal_width = parseFloat($('html').css('--hexagon-size'));
    let hex_vertical_width = hex_horizontal_width * Math.tan(Math.PI / 6);
    let hex_gap = parseFloat($('html').css('--hexagon-gap'));

    let container = map_container;
    container.empty();
    let calculated_cont_width = (column_number + 0.5) * hex_horizontal_width + (column_number - 1 + 0.5) * hex_gap;
    let calculated_cont_height = (row_number * 1.5 + 0.5) * hex_vertical_width + (row_number - 1) * hex_gap * Math.sin(Math.PI / 3);
    container.css('min-width', calculated_cont_width + 'px');
    container.css('min-height', calculated_cont_height + 'px');

    cells.forEach(( i, row) => {
        row.forEach((j, cell) => {
            let x = ((i+1) % 2) * (hex_horizontal_width + hex_gap) / 2 + (j-1) * (hex_horizontal_width + hex_gap);
            let y = hex_vertical_width / 2 + (i-1) * (1.5*hex_vertical_width + hex_gap * Math.sin(Math.PI / 3));

            let hex_content = [];
            cell.content.forEach((i, content) => {
                let src_name = contentVariants_full[content.type];
                let icon_hidden = content.isHidden ? "hidden" : "";
                let content_element = $("<img src=\"../src/icons/" + src_name + "\" class=\"content_icon" + " " + icon_hidden + "\" alt=\"er\">");

                hex_content.push(content_element);
            });
            let content_html = hex_content.join('');

            createHexagon(content_html, x, y, container, cell.isFloor, cell.isClosed);
        });
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
    $inner.append(content);
    hexagon.append($inner);
}



$("#container").on('wheel', function(event) {
    // Get the current scale of the inner div
    let currentScale = parseFloat(map_container.css('transform').split('(')[1].split(')')[0].split(',')[0]);
    let minScale = 0.01 * currentScale;
    let maxScale = 2 * currentScale;

    // Adjust the scale based on the direction of wheel scrolling
    let scaleChange = event.originalEvent.deltaY > 0 ? 0.9 : 1.1; // Adjust the scale factor as needed
    let newScale = currentScale * scaleChange;

    newScale = Math.max(minScale, Math.min(maxScale, newScale)); 

    // Apply the new scale to the inner div
    map_container.css('transform', 'scale(' + newScale + ')');

    // Prevent the default behavior of scrolling the page
    event.preventDefault();
});