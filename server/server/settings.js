const floorVariants = [
    {"green": "40, 122, 50"}, //grass, forest
    {"gray": "87, 110, 98"} //stone pavement, stone floor
] 

const spaceVariants = [
    {"blue": "26, 115, 217"} //water, sky
]

//________________________________________________________________________________________________
// content variants
// keys are the names of the content, values are the names of the images
let contentVariants = [
    {"camp": "camp_icon.png"}, //camp
    {"cave": "cave_icon.png"}, //caves, different types
]
const risks = [
    {"risk_1": "risk_1_icon.png"}, //risk low level
    {"risk_2": "risk_2_icon.png"}, //risk medium level
    {"risk_3": "risk_3_icon.png"}, //risk high level
    {"risk_4": "risk_4_icon.png"} //risk very high level
]
contentVariants = contentVariants.concat(risks);
const buildings = [
    {"building_1": "building_1_icon.png"}, //small buildings
    {"building_2": "building_2_icon.png"}, //medium buildings
    {"building_3": "building_3_icon.png"}, //large buildings
    {"building_broken": "building_broken_icon.png"} //broken or very poor buildings
]
contentVariants = contentVariants.concat(buildings);

//________________________________________________________________________________________________

module.exports = {
    floorVariants_full: floorVariants,
    spaceVariants_full: spaceVariants,
    contentVariants_full: contentVariants
};