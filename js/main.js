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

    // scale y-axis proportional to inner rectangle:
    var yScale = d3.scaleLinear()
        .range([chartInnerHeight, 0])
        .domain([0, 1200]);


        

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

                console.log(csvData)
                console.log(statesData)
            // translate topojson:
            // still not sure what my plan is for AK and HI yet - remove or make them containers.. ugh
            var States = topojson.feature(statesData, statesData.objects.usStates).features;
            
            // calling ea fx below:
            States = joinData(States, csvData);
            var colorScale = makeColorScale(csvData);  
            setEnumerationUnits(States, map, path, colorScale);
            setChart(csvData, colorScale);


            createDropdown(csvData);//, "color", "Select Color/Size");
            //createDropdown(csvData, "x", "Select X");
            //createDropdown(csvData, "y", "Select Y");
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
                        //console.log(val)
                        //console.log(geojsonProps)
					});
                //console.log(geojsonProps)    
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

    // coordinated bar chart: 
	function setChart(csvData, colorScale) {
		
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

        // make bars + set values: 
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
            .attr("width", chartInnerWidth / csvData.length - 1) // width of ea bar
            .attr("x", function(d, i){
                return i * (chartInnerWidth / csvData.length) + leftPadding; // x-pos of ea bar
            })
            .attr("height", function(d){ 
                return chartInnerHeight - yScale(parseFloat(d[expressed])) + topBottomPadding; // height of ea bar
            })
            .attr("y", function(d){
                return yScale(parseFloat(d[expressed]));; // y-pos (bottom-aligned)
            })
            .style("fill", function(d){
                return colorScale(d[expressed]);
            });

        // bar annotations - state names: 
        var numbers = chart.selectAll(".labels") // these look bad but idc rn
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
            .attr("x", function(d, i){
                var fraction = chartInnerWidth / csvData.length;
                return (i * fraction + (fraction - 1) / 2) + leftPadding; // match x-pos of ea bar
            })
            .attr("y", function(d){
                return yScale(parseFloat(d[expressed])) + 15; // match y-pos + scoot down onto bar
            })
            .text(function(d){
                return d.state_abbr; // label w/ state name
            });

        // chart title: 
        var chartTitle = chart.append("text")
            .attr("x", chartInnerWidth/5)
            .attr("y", chartHeight/10)
            .attr("class", "chartTitle") // define class
            .text("Overall Incarceration Rate by State");	

        // y axis: 
        var yAxisScale = d3.axisLeft().scale(yScale);
        var yaxis = chart.append("g")
            .attr("class", "axis") // define class
            .attr("transform", translate)
            .call(yAxisScale);
    };





    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
        });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };

    //dropdown change event handler
    function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var state = d3.selectAll(".state").style("fill", function (d) {
            var value = d.properties[expressed];
            return colorScale(d.properties[expressed]);
        });

        //******//Sort, resize, and recolor bars
        var bars = d3.selectAll(".bars")
            //Sort bars
            .sort(function(a, b){
                return a[expressed] - b[expressed];
            })
            updateChart(bars, csvData.length, colorScale);



    }


    function updateChart(bars, n, colorScale){
        bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding; // x-pos of ea bar
        })
        .attr("height", function(d){ 
            return chartInnerHeight - yScale(parseFloat(d[expressed])) + topBottomPadding; // height of ea bar
        })
        .attr("y", function(d){
            return yScale(parseFloat(d[expressed]));; // y-pos (bottom-aligned)
        })
        .style("fill", function(d){
            return colorScale(d[expressed]);
        });
    }













})();