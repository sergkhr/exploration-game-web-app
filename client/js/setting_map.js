function loadResizeCommon(){
    resizeContainerForContent($('#container .data-place'), ".data-block");
    resizeContainerForContent($('#container .buttons-place'), ".buttons-block");
}
function checkIfMasterUser(){
    let token = sessionStorage.getItem('token');
    $.ajax({
        url: '/api/checkIfMaster',
        type: 'GET',
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem(token) },
        success: function(data) {
            console.log('Master user');
        },
        error: function(data) {
            console.log('Not master user');
            window.location.href = '/';
        }
    });
}
$(document).ready(function() {
    checkIfMasterUser();
    //loadResizeCommon();
});
$(window).on('resize', function() {
    //loadResizeCommon();
});