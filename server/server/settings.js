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
    {"camp": "camp_icon.svg"}, //camp
    {"cave": "cave_icon.svg"}, //caves, different types
]
const risks = [
    {"risk_1": "risk_1_icon.svg"}, //risk low level
    {"risk_2": "risk_2_icon.svg"}, //risk medium level
    {"risk_3": "risk_3_icon.svg"}, //risk high level
    {"risk_4": "risk_4_icon.svg"} //risk very high level
]
contentVariants = contentVariants.concat(risks);
const buildings = [
    {"building_1": "building_1_icon.svg"}, //small buildings
    {"building_2": "building_2_icon.svg"}, //medium buildings
    {"building_3": "building_3_icon.svg"}, //large buildings
    {"building_broken": "building_broken_icon.svg"} //broken or very poor buildings
]
contentVariants = contentVariants.concat(buildings);

//________________________________________________________________________________________________

module.exports = {
    floorVariants_full: floorVariants,
    spaceVariants_full: spaceVariants,
    contentVariants_full: contentVariants
};