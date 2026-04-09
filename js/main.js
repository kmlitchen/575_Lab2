// Activity 10 ~

// wrap the whole thing up for safe keeping:
(function () { 

	// define attributes in pseudo-global scope:
	var attrArray = ["Rate_All","Rate_WT","Ratio_WT_ST","Rate_BK","Ratio_BK_ST","Ratio_BK_WT"]; 
	var expressed = attrArray[0]; // set default to first attribute

    // execute fx on load:
    window.onload = setMap();

    // make the map:
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

        // set projection (albers equal area conic for contiguous US):
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
                console.log(csvData);
                console.log(statesData);

            // translate topojson:
            // still not sure what my plan is for AK and HI yet
            var States = topojson.feature(statesData, statesData.objects.usStates).features;
            console.log(States);
            
            // calling fx below:
            States = joinData(States, csvData);
            var colorScale = makeColorScale(csvData);  
            setEnumerationUnits(States, map, path, colorScale);
        }
    }

    // join attribute data + geojson:
    function joinData(States, csvData) {
		// loop through csv, for each item define primary key:
		for (var i = 0; i < csvData.length; i++) {
			var csvState = csvData[i]; // current state
			var csvKey = csvState.St_Abbr; // CSV primary key

			// loop through geojson, for each set primary key: 
			for (var a = 0; a < States.length; a++) {
				var geojsonProps = States[a].properties; // current state geojson properties
				var geojsonKey = geojsonProps.state_abbr; // geojson primary key

				// if keys match, assign csv value to geojson properties object:
				if (geojsonKey == csvKey) {
					attrArray.forEach(function (attr) {
						var val = parseFloat(csvState[attr]); // get csv attribute value
						geojsonProps[attr] = val; // assign attribute and value to geojson properties
					});
				}
			}
		}
		return States;
	}

    // make color scale:
	function makeColorScale(data){
		var colorClasses = [
			"#fee5d9",
			"#fcbba1",
			"#fc9272",
			"#fb6a4a",
			"#de2d26",
            "#a50f15",
		];
	
		// color scale generator:
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build two-value array of minimum and maximum expressed attribute values
        var minmax = [
            d3.min(data, function(d) { return parseFloat(d[expressed]); }),
            d3.max(data, function(d) { return parseFloat(d[expressed]); })
        ];
        //assign two-value array as scale domain
        colorScale.domain(minmax);

        return colorScale;
};

	function setEnumerationUnits(States, map, path, colorScale) {
		// voila -> put states on map + fill by attribute
		var states = map
			.selectAll(".state")
			.data(States)
			.enter()
			.append("path")
			.attr("class", function (d) {
				return "state " + d.properties.St_abbr;
			})
			.attr("d", path)
			.style("fill", function (d) {
				//check to make sure a data value exists, if not set color to gray
				var value = d.properties[expressed];            
				if(value) {            	
					return colorScale(d.properties[expressed]);            
				} else {            	
					return "#ccc";            
				}    
			})
	}

})();