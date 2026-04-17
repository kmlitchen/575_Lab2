// Lab 2 ~

// wrap the whole thing tight for safe keeping:
(function () { 

	// define attributes in pseudo-global scope:
	var attrArray = ["Rate_All","Rate_WT","Ratio_WT_ST","Rate_BK","Ratio_BK_ST","Ratio_BK_WT"]; 
	var expressed = attrArray[0]; // set default to first attribute
    
    // chart dimensions:
	var chartWidth = window.innerWidth * 0.45,
		chartHeight = 460;
        leftPadding = 33, // i feel like there's a better way to do this
        rightPadding = 2,
        topBottomPadding = 10,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    // execute fx on load:
    window.onload = setMap();

    // make the map:
    function setMap() {
        // map frame: 
        var width = window.innerWidth * 0.45,
            height = 460;

        // map svg container:
        var map = d3
            .select("body")
            .append("svg")
            .attr("class", "map") // define class
            .attr("width", width)
            .attr("height", height);

        // set projection (albers equal area conic for contiguous US):
        var projection = d3
            .geoAlbers()
            .center([-13.5, 40])
            .rotate([85.5, 2.5, 3.1])
            .parallels([8.41, 47.50])
            .scale(650)
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

            // translate topojson:
            // still not sure what my plan is for AK and HI yet - remove or make them containers.. ugh
            var States = topojson.feature(statesData, statesData.objects.usStates).features;
            
            // calling ea fx below:
            States = joinData(States, csvData);
            var colorScale = makeColorScale(csvData);  
            setEnumerationUnits(States, map, path, colorScale);
            setChart(csvData, colorScale);
            createDropdown(csvData);
        }
    }

    // join attribute data + geojson:
    function joinData(States, csvData) {
		// loop through csv, for each item define primary key:
		for (var i = 0; i < csvData.length; i++) {
			var csvState = csvData[i]; // current state
			var csvKey = csvState.state_abbr; // csv primary key

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

        // min/max for equal interval
        var minmax = [
            d3.min(data, function(d) { return parseFloat(d[expressed]); }),
            d3.max(data, function(d) { return parseFloat(d[expressed]); })
        ];
        colorScale.domain(minmax);

        return colorScale;
    };

    // fill states by color scale:
	function setEnumerationUnits(States, map, path, colorScale) {
		// voila -> put states on map + fill by expressed attribute:
		var states = map
			.selectAll(".state") 
			.data(States)
			.enter()
			.append("path")
			.attr("class", function (d) {
				return "state " + d.properties.state_abbr; // define class
			})
			.attr("d", path)
			.style("fill", function (d) {
				var value = d.properties[expressed];                        	
				return colorScale(d.properties[expressed]);             
			})        
	}

    // make attribute drop-down:
    function createDropdown(csvData){
        // select by attribute: 
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown") // define class
            .on("change", function(){
                changeAttribute(this.value, csvData)
        });

        // set default:
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        // attribute name:
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };

    // event handler for updating attribute in dropdown: 
    function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;

        // scale y-axis proportional to inner rectangle:
        var yScale = d3.scaleLinear()
            .range([chartInnerHeight, 0])
            .domain([0, d3.max(csvData, function(d) { return parseFloat(d[expressed])})]);

        var yAxisScale = d3.axisLeft().scale(yScale);

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var state = d3.selectAll(".state").style("fill", function (d) {
            var value = d.properties[expressed];
            return colorScale(d.properties[expressed]);
        });

        //Sort, resize, and recolor bars
        var bars = d3.selectAll(".bars")
            //Sort bars
            .sort(function(a, b){
                return a[expressed] - b[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20
            })
            .duration(200);

        var labels = d3.selectAll(".labels")
            .sort(function(a, b){
                return a[expressed]-b[expressed] // sorting L -> H
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20
            })
            .duration(200)

        updateChart(bars, csvData, colorScale, labels)
        }

    // make coordinated bar chart - set initial view: 
	function setChart(csvData, colorScale) {

        // scale y-axis proportional to inner rectangle:
        var yScale = d3.scaleLinear()
            .range([chartInnerHeight, 0])
            .domain([0, d3.max(csvData, function(d) { return parseFloat(d[expressed])})]);
        var yAxisScale = d3.axisLeft().scale(yScale);
		
		// svg for entire bar chart:
		var chart = d3.select("body")
			.append("svg")
			.attr("width", chartWidth)
			.attr("height", chartHeight)
			.attr("class", "chart"); // define class

        // inner chart rectangle:
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground") // define class
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        // make bars -> add values w/ update fx: 
        var bars = chart.selectAll(".bars") // may flip to hz bar chart
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return a[expressed]-b[expressed] // sorting L -> H
            })
            .attr("class", function(d){         
                return "bars " + d.state_abbr; // define class
            })
            .attr("width", chartInnerWidth / csvData.length -0.5) // width of ea bar

        // make bar labels -> state names w/ update fx: 
        var labels = chart.selectAll(".labels") // these look bad but idc rn
            .data(csvData)
            .enter()
            .append("text")
            .sort(function(a, b){
                return a[expressed]-b[expressed] // sorting L -> H
            })
            .attr("class", function(d){ 
                return "labels " + d.state_abbr;   // define class
            })
            .attr("text-anchor", "middle") // center

        // chart title: 
        var chartTitle = chart.append("text")
            .attr("x", chartInnerWidth/5)
            .attr("y", chartHeight/10)
            .attr("class", "chartTitle") // define class
            .text(expressed + " by State");	

        // y-axis: 
        var yaxis = chart.append("g")
            .attr("class", "axis") // define class
            .attr("transform", translate)
            .call(yAxisScale);

        // set mutable values via update fx:
        updateChart(bars, csvData, colorScale, labels)
    };

    // fx to update mutable bar chart elements by attribute:
    function updateChart(bars, csvData, colorScale, labels){

        // scale y-axis proportional to inner rectangle:
        var yScale = d3.scaleLinear()
            .range([chartInnerHeight, 0])
            .domain([0, d3.max(csvData, function(d) { return parseFloat(d[expressed])})]);

        var yAxisScale = d3.axisLeft().scale(yScale);

        // call class for bar chart bars, labels -> set features per current attribute:
        bars
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding; // x-pos of ea bar
        })
        .attr("height", function(d){ 
            return chartInnerHeight - yScale(parseFloat(d[expressed])) // height of ea bar
        })
        .attr("y", function(d){
            return yScale(parseFloat(d[expressed])) + topBottomPadding; // y-pos (bottom-aligned)
        })
        .style("fill", function(d){
            return colorScale(d[expressed]);
        });

        labels
        .attr("x", function(d, i){
            var fraction = chartInnerWidth / csvData.length;
            return (i * fraction + (fraction - 1) / 2) + leftPadding; // match x-pos of ea bar
        })
        .attr("y", function(d){
            return yScale(parseFloat(d[expressed])) + 18; // match y-pos + scoot down onto bar
        })
        .text(function(d){
            return d.state_abbr; // label w/ state name
        });

        // set title by current attribute:
        var chartTitle = d3.select(".chartTitle")
            .text(expressed + " by State");
        // set y-axis by current attribute scale:
        var yaxis = d3.select(".axis") 
            .attr("transform", translate)
            .call(yAxisScale);
    }

})();