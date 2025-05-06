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
 * @param {boolean} isFloor if the hexagon is a floor or a space
 * @param {boolean} isClosed if the hexagon is closed by the fog of war, meant for the game, not for creation
 */
function createHexagon(content, x, y, i, j, container, isFloor=true, isClosed=true){
    let hexagon = $('<div class="hex" data-row="' + i + '" data-column="' + j + '"></div>');

    // Create the inner div and add the content
    let $inner = $('<div class="inner"></div>').append(content);

    // Create the corner divs
    let $corner1 = $('<div class="corner-1"></div>');
    let $corner2 = $('<div class="corner-2"></div>');

    // Append the inner div and corner divs to the main hexagon container
    hexagon.append($inner, $corner1, $corner2);

    hexagon.css('left', x);
    hexagon.css('top', y);

    if(!isFloor) hexagon.addClass('space');
    if(isClosed) hexagon.addClass('closed');
    
    container.append(hexagon);
}


//________________________________________________________________________________________________
// controlling the map
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        const context = this;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(context, args);
        }, delay);
    };
}

function limitTranslationX(translateX, scale, map_container, outer_container, gap=300) {
    let map_c = $(map_container);
    let outer_c = $(outer_container);
    let TranslateX_limit = map_c.width() * scale / 2 + outer_c.width() / 2 - gap;
    return Math.min(TranslateX_limit, Math.max(-TranslateX_limit, translateX));
}
function limitTranslationY(translateY, scale, map_container, outer_container, gap=300) {
    let map_c = $(map_container);
    let outer_c = $(outer_container);
    let TranslateY_limit = map_c.height() * scale / 2 + outer_c.height() / 2 - gap;
    return Math.min(TranslateY_limit, Math.max(-TranslateY_limit, translateY));
}

/**
 * function that controlls the resizing of map and everything inside of it
 * 
 * @param {Event} event object
 * @param {jquery object} map_containter
 * @param {jquery object} outer_container
 * @param {jquery objects list} non_resized_elements - elements to be resized with the map
 */
function resizeMap(event, map_container, outer_container, non_resized_elements=null){
    // Get the current scale of the inner div
    let currentTransform = map_container.css('transform');
    let currentScale = 1;
    let minScale = 0.2 * currentScale;
    let maxScale = 2 * currentScale;

    let currentTranslateX = 0;
    let currentTranslateY = 0;
    
    // Parse the current transform to get scale and translation values
    if (currentTransform && currentTransform !== 'none') {
        const transformValues = currentTransform.match(/-?[\d\.]+/g);
        if (transformValues.length === 6) { // Check if it includes scale and translate
            currentScale = parseFloat(transformValues[0]);
            currentTranslateX = parseFloat(transformValues[4]);
            currentTranslateY = parseFloat(transformValues[5]);
        }
    }
    
    

    // Adjust the scale based on the direction of wheel scrolling
    let scaleChange = event.originalEvent.deltaY > 0 ? 0.9 : 1.1; // Adjust the scale factor as needed
    let newScale = currentScale * scaleChange;

    newScale = Math.max(minScale, Math.min(maxScale, newScale)); 
    let newTranslateX = currentTranslateX * newScale / currentScale;
    let newTranslateY = currentTranslateY * newScale / currentScale;

    newTranslateX = limitTranslationX(newTranslateX, newScale, map_container, outer_container);
    newTranslateY = limitTranslationY(newTranslateY, newScale, map_container, outer_container);

    // Apply the new scale to the inner div
    map_container.css('transform', `translate(${newTranslateX}px, ${newTranslateY}px) scale(${newScale})`);
    
    if(non_resized_elements){
        non_resized_elements.each(function(){
            $(this).css('transform', `scale(${1/newScale})`);
        });
    }

    event.preventDefault();
}



// Function to handle map dragging
function handleDrag(element, container) {
    let isDragging = false;
    let startX, startY, initialX, initialY;
  
    // Disable right-click context menu
    container.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    });
  
    // Mouse down event listener
    container.addEventListener('mousedown', function(event) {
        if (event.button === 1) { // Check if middle mouse button is clicked
            isDragging = true;
            startX = event.clientX;
            startY = event.clientY;
            initialX = getTranslateX(element);
            initialY = getTranslateY(element);
        }
    });
  
    // Mouse move event listener
    container.addEventListener('mousemove', function(event) {
        if (isDragging) {
            const deltaX = event.clientX - startX;
            const deltaY = event.clientY - startY;
            const scale = getScale(element);
            let newTranslateX = initialX + deltaX;
            let newTranslateY = initialY + deltaY;
            newTranslateX = limitTranslationX(newTranslateX, scale, element, container);
            newTranslateY = limitTranslationY(newTranslateY, scale, element, container);

            element.style.transform = `translate(${newTranslateX}px, ${newTranslateY}px) scale(${scale})`;
        }
    });
  
    // Mouse up event listener
    container.addEventListener('mouseup', function() {
        isDragging = false;
    });
  
    // Mouse leave event listener
    container.addEventListener('mouseleave', function() {
        isDragging = false;
    });
  
    // Function to get the scale of the element
    function getScale(element) {
        const transformMatrix = window.getComputedStyle(element).transform;
        if (transformMatrix && transformMatrix !== 'none') {
            const matrix = transformMatrix.split(', ');
            return parseFloat(matrix[0].split('(')[1]);
        }
        return 1; // Default scale if not set
    }

    function getTranslateX(element) {
        const transformMatrix = window.getComputedStyle(element).transform;
        if (transformMatrix && transformMatrix !== 'none') {
            const matrix = transformMatrix.split(', ');
            return parseFloat(matrix[4]);
        }
        return 0; // Default 
    }

    function getTranslateY(element) {
        const transformMatrix = window.getComputedStyle(element).transform;
        if (transformMatrix && transformMatrix !== 'none') {
            const matrix = transformMatrix.split(', ');
            return parseFloat(matrix[5]);
        }
        return 0; // Default 
    }
}
