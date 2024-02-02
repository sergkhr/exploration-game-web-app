

function loadResizeCommon(){
    resizeContainerForContent($('#container .data-place'), ".data-block");
    resizeContainerForContent($('#container .buttons-place'), ".buttons-block");
}
$(window).on('load', function() {
    loadResizeCommon();
});
$(window).on('resize', function() {
    loadResizeCommon();
});