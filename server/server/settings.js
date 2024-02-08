const floorVariants = [
    "green", //grass, forest
    "gray" //stone pavement, stone floor
] 

const spaceVariants = [
    "blue" //water, sky
]

//________________________________________________________________________________________________
// content variants
let contentVariants = [
    "camp", //camp
    "cave", //caves, different types
]
const risks = [
    "risk_1", //risk low level
    "risk_2", //risk medium level
    "risk_3", //risk high level
    "risk_4" //risk very high level
]
contentVariants = contentVariants.concat(risks);
const buildings = [
    "building_1", //small buildings
    "building_2", //medium buildings
    "building_3", //large buildings
    "building_broken" //broken or very poor buildings
]
contentVariants = contentVariants.concat(buildings);

//________________________________________________________________________________________________

module.exports = {
    floorVariants,
    spaceVariants,
    contentVariants
};