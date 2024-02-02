//get standart animation time from :root css variable from 0.3s to 300
let standartAnimationTime = parseFloat($('html').css('--standart-animation-time').replace("s", '')) * 1000;


/**
 * @param {jquery object} container the container to resize
 * @param {string} childrenSelector the selector for children to count
 * 
 * Resizes the container to fit the content
 * Should be used for containers that have children that are hidden and shown
 * With only one child visible at a time 
 */
function resizeContainerForContent(container, childrenSelector=null) {
    let visibleChildren;
    if (childrenSelector) {
        visibleChildren = container.children(childrenSelector).not('.hidden');
    } else {
        visibleChildren = container.children().not('.hidden');
    }
    let maxHeight = 0;
    visibleChildren.each(function() {
        let height = $(this).outerHeight();
        if (height > maxHeight) {
            maxHeight = height;
        }
    });
    //animate the container to the new height
    container.animate({height: maxHeight}, standartAnimationTime);
}