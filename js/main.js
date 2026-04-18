// Lab 2 ~

// wrap the whole thing tight for safe keeping:
(function () { 

	// define pseudo-global attributes in pseudo-global scope:
	var attrArray = ["Total Incarceration Rate","White Incarceration Rate","Black Incarceration Rate","Incarceration Ratio: White to Total","Incarceration Ratio:  Black to Total","Incarceration Ratio: Black to White"]; 
	var expressed = attrArray[0]; // set default to first attribute
        // chart dimensions:
	    var chartWidth = window.innerWidth * 0.45,
		    chartHeight = 460;
            leftPadding = 33, 
            rightPadding = 2,
            topBottomPadding = 10,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    // map map map! on load:
    window.onload = setMap();

    // make the map -> promise, callback: (onload)
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
            // alas, Alaska and Hawaii didn't make the cut (rip)
            var States = topojson.feature(statesData, statesData.objects.usStates).features;
            
            // calling ea fx below:
            States = joinData(States, csvData);
            var colorScale = makeColorScale(csvData);  
            setEnumerationUnits(States, map, path, colorScale);
            setChart(csvData, colorScale);
            createDropdown(csvData);

            // html text at bottom of the page: (I got annoyed with styling)
            var webText = "<p class = body>" +
                "<br> <b> Is Our Justice System Just? </b> <br>" +
                    "Select an attribute from the drop-down menu and click on any grapic to retreive more detail. <br>" + 
                "<br> <b> What Do You See? </b> <br>" +
                    "Racially disparate outcomes in our state prisons reflect an amalgamation of factors persisting throughout our criminal justice process. " + 
                    "Incarceration in prison is the result of a process that begins in encounters with law enforcement and progresses through stages of arrest, detention, bail, legal representation, sentencing, fines, and community supervision programs (probation and parole). " +
                    "Individual-level biases amongst communities, law enforcement, and judges, as well as institutional factors that systemically disadvantage black people, including harsh laws, minimum sentences, strict probation terms, and high fees create cumulative effects that " + 
                    "abjectly fail to equitably distribute justice, creating clearly racialized lines along which we delineate whose freedom we hold most dear. Note the following: " +
                        "<ul class = body>" + 
                        "<li>Compare incarceration ratios for black versus white residents. Do any states incarcerate white residents at a lower rate than black residents? At a higher rate than their overall incarceration rate?  </li>" +
                        "<li>Compare the Black to White Incarceration Ratio to the Total Incarceration Rate. What geographic trends do you notice? How does this align with your regional expectations for cultural attitudes of anti-blackness? Of crime and punishment as a whole?" +
                        "<li>States throughout the Northeast are known for having relatively progressive criminal justice policies. Do current policies inherently seem to address racial disparity in the justice system?</li>" +
                        "<li>What institutional factors beyond those strictly present within the justice system may contribute to the trends seen here?</li>" +
                        "<li>Explore the visualization. What other interesteing trends do you notice?</li>" +
                        "</ul> <br>" +
                "<p class = body> <br> <b> For More Information: </b> <br>" +
                    "Visit the <a href='https://www.prisonpolicy.org/' target='_blank'> Prison Policy Initiative Website.</a>" + 
                    " Data for incarcerated populations in U.S. state prisons were compiled from 2021 data from the Bureau of Justice Statistics. All incarceration rates shown are normalized per 100,000 residents in each state within each respective demographic." +
                    " Ratios were manually generated through direct comparisons for normalized demographic data rates. For simplicity, specific demographic information is only displayed for black and white residents, although racial and ethnic disparities in incarceration rates" +
                    " are also observed amongst Hispanic, American Indian, Asian and Pacific Islander, and multi-racial populations. Only the lower 48 U.S. states are shown."

            var htmlText = d3.select("body")
                .append("div")
                .attr("class","indent")
                .html(webText)
        }
    }

    // join attribute data + geojson: (callback fx)
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

    // make color scale: (callback fx)
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
        colorScale.domain(minmax)

        return colorScale
        colorScale.style("opactiy" , 0.9)
    };

    // fill states by color scale: (callback fx)
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
				var value = d.properties[expressed]                        	
				return colorScale(d.properties[expressed])           
			})    
            .on("click", function(event, d){
                highlight(d.properties);
            })
            .on("mouseout", function(event, d){
                dehighlight(d.properties);
            }) 
	}   

    // make attribute drop-down: (callback fx)
    function createDropdown(csvData, map){
        // select by attribute: 
        var dropdown = d3.select(".drop")
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

    // event handler for updating attribute in dropdown: (createDropdown fx)
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

    // make coordinated bar chart - set initial view: (callback fx)
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
            .on("click", function(event, d){
                highlight(d);
            })
            .on("mouseout", function(event, d){
                dehighlight(d);
            })

        // make bar labels -> state names w/ update fx: 
        var labels = chart.selectAll(".labels") // these look bad but idc rn
            .data(csvData)
            .enter()
            .append("text")
            .sort(function(a, b){
                return a[expressed]-b[expressed] // sorting L -> H
            })
            .attr("class", function(d){ 
                return "labels " //+ d.state_abbr;   // define class
            })
            .attr("text-anchor", "middle") // center

        // chart title: 
        var chartTitle = chart.append("text")
            .attr("x", chartInnerWidth/7)
            .attr("y", chartHeight/15)
            .attr("class", "chartTitle") // define class
            .text(expressed + " Per State");	

        // y-axis: 
        var yaxis = chart.append("g")
            .attr("class", "axis") // define class
            .attr("transform", translate)
            .call(yAxisScale);

        // set mutable values via update fx:
        updateChart(bars, csvData, colorScale, labels)
    };

    // update mutable chart elements by attribute: (changeAttribute + setChart fxs)
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
            return yScale(parseFloat(d[expressed])) + topBottomPadding - 2//chartInnerHeight + 1.5 * topBottomPadding 
             ; // match y-pos + scoot down onto bar
        })
        .text(function(d){
            return d.state_abbr; // label w/ state name
        });

        // set title by current attribute:
        var chartTitle = d3.select(".chartTitle")
            .text(expressed + " Per State");
        // set y-axis by current attribute scale:
        var yaxis = d3.select(".axis") 
            .attr("transform", translate)
            .call(yAxisScale);
    }

    // highlight enumeration units and bars: (setEnumerationUnits + setChart fxs)
    function highlight(props){
        // remove previous label: (i.e. if you click the same state again)
        d3.select(".infolabel")
            .remove();
        // reset to current label:
        setLabel(props)
        
        // style by class:
        var selected = d3.selectAll("." + props.state_abbr)
            .attr("class", function (d) {
                // class list for ea element:
                let elemClasses = this.classList;
                // add "selected": 
                elemClasses += " selected"; // define class
                d3.selectAll("." + props.state_abbr)
                    .style("opacity", 1.0)
                return elemClasses
            })
        // raises selected element: (consistent boarders, etc.)
        selected.raise();
    };

    // dehighlight enumeration units and bars: (setEnumerationUnits + setChart fxs)
    function dehighlight(props) {
        // remove previous label:
        d3.select(".infolabel")
            .remove()

        // un-style by class:
        var selected = d3.selectAll("." + props.state_abbr)
            .attr("class", function () {
                //get current list of classes for each element
                let elemClasses = this.classList; 
                //remove class "selected" from class list
                elemClasses.remove("selected")
                d3.selectAll("." + props.state_abbr)
                    .style("opacity", 0.85)
                return elemClasses
            })
    };

    // attribute value pop-ups: (highlight fx)
    function setLabel(props){
        // label content: 
        // set conditional units by expressed attributes:
        if (expressed.includes("Total Incarceration"))
            unit = "";
        if (expressed.includes("White"))
            unit = "white";
        if (expressed.includes("Black"))
            unit = "black";
        if (expressed.includes("to Total"))
            unit2 = "total rate for the state";
        if (expressed.includes("to White"))
            unit2 = "rate for white people";
        // set label content by metric: 
        var labelAttribute
        if (expressed.includes("Rate"))
            labelAttribute =  "In " + props.state_abbr + " there are <b>" + props[expressed] + "</b> total "
                + unit + " people incarcerated per 100,000 " + unit + " residents";
        if (expressed.includes("to")) 
            labelAttribute =  "In " + props.state_abbr + " the incarceration rate for " + unit + " people is <b>" 
                + props[expressed] + "</b> times the " + unit2;

        // make infolabel div:
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.state_abbr + "_label")
            .html(labelAttribute)

        // label positioning: (width by screen bound)
        var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;
        // (x,y) pos var: 
        var x1 = event.clientX + 10,
            y1 = event.clientY - 25,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;
        // set (x,y) relative to event loc: (adjust for overflow)
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        var y = event.clientY < 75 ? y2 : y1;      
        // place label pos:
        infolabel.style("left", x + "px")
        infolabel.style("top", y + "px")
    };
})();