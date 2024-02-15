let floorVariants_full;
let spaceVariants_full;
let contentVariants_full;

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
    }).catch((error) => {
        console.log(error);
        window.location.href = '/';
    });
});





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
