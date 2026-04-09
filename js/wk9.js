// Activity 9 ~

// execute fx on load:
window.onload = setMap();

// wrapped fx for map:
function setMap() {
    // map frame: 
    var width = 960,
        height = 460;

    // map svg container:
    var map = d3
        .select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    // set projection (albers equal area conic for contiguous US)
    var projection = d3
        .geoAlbers()
        .center([-16, 40])
        .rotate([85.5, 2.5, 3.1])
        .parallels([8.41, 47.50])
        .scale(900)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath().projection(projection);

    // promise it's coming so asynchronous data loading doesn't make it angry:
    var promises = [
        d3.csv("data/incarceration.csv"),
        d3.json("data/usStates.topojson"),
    ];
    Promise.all(promises).then(callback);
    // callback fx once the gang's all here:
    function callback(data) {
        var csvData = data[0],
            statesData = data[1];
            //console.log(csvData);
            //console.log(statesData);

        // translate topojson:
        // not sure what my plan is for AK and HI yet
        var States = topojson.feature(statesData, statesData.objects.usStates);
        //console.log(States);
            
        // voila -> put states on map
        var states = map
            .append("path")
            .datum(States)
            .attr("class", "us")
            .attr("d", path);
    }

}