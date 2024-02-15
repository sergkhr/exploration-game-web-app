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

/**
 * Create one hexagon for the map
 * 
 * @param {jquey object} content all DOM elemnts to put inside the hexagon
 * @param {int} x horizontal position of hexagon left top corner from left
 * @param {int} y vertical position of hexagon left top corner from top
 * @param {jquery object} container the container that will hold the map
 */
function createHexagon(content, x, y, container){
    let hexagon = $('<div class="hex"></div>');

    // Create the inner div and add the content
    let $inner = $('<div class="inner"></div>').text(content);

    // Create the corner divs
    let $corner1 = $('<div class="corner-1"></div>');
    let $corner2 = $('<div class="corner-2"></div>');

    // Append the inner div and corner divs to the main hexagon container
    hexagon.append($inner, $corner1, $corner2);

    hexagon.css('left', x);
    hexagon.css('top', y);
    
    
    container.append(hexagon);
}
