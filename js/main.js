(function(){
    //pseudo-global variables
    var attrArray = ["GDP (1000 per capita)", "Poplation (per 10 square of mi)","Forest area(%)2020", "Foreign investment(% GDP)", 
    "Renewable Electricity(% of total)", "CO2 emissions (metric tons)"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
    chartHeight = 500,
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 18,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 140]);

    //begin script when window loads
    window.onload = setMap();

    //Example 1.3 line 4...set up choropleth map
    function setMap() {

        document.getElementById('title').innerHTML =  'Europe Union Interactive Map'; 
        
        document.getElementById('mapcontent').innerHTML = "<p><font size = '+2'>T</font>he European Union is a unique economic and political partnership between 27 European countries and has delivered over half a century of peace, stability and prosperity. In this interactive map, users can explore the development of the Europe Union such as <b>GDP</b>, <b>Population</b>, and <b>Forest Area</b> for each Europe country. Finally, you also can explore more information by clicking following link<sup> <a href = 'https://www.worldbank.org/en/home'> *</a></sup> .</p>";
        
        
        //map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 500;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on France
        var projection = d3.geoAlbers()
            .center([8, 48.2])
            .rotate([-2, 0, 0])
            .parallels([43, 62])
            .scale(900)
            .translate([width / 2, height / 2]);

        var path = d3.geoPath()
            .projection(projection);

        //use Promise.all to parallelize asynchronous data loading
        var promises = [];    
        promises.push(d3.csv("data/europe_data.csv")); //load attributes from csv    
        promises.push(d3.json("data/EuropeCountries.topojson")); //load background spatial data    
        Promise.all(promises).then(callback);

        function callback(data) {

            setGraticule(map,path);

            var csvData = data[0],
                europe = data[1];
            console.log(csvData);
            console.log(europe);

            //translate europe TopoJSON
            //var europeCountries = topojson.feature(europe, europe.objects.EuropeCountries);
            var europe = topojson.feature(europe, europe.objects.EuropeCountries).features;

            //create the color scale
            europeRegions = joinData(europe, csvData)
            var colorScale = makeColorScale(csvData);

            setEnumerationUnits(europeRegions,map,path,colorScale);
            //add coordinated visualization to the map
            setChart(csvData, colorScale);
            createDropdown(csvData);
           
            }}
    function setGraticule(map,path){
		var graticule = d3.geoGraticule()
	            .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

	        //create graticule background
	        var gratBackground = map.append("path")
	            .datum(graticule.outline()) //bind graticule background
	            .attr("class", "gratBackground") //assign class for styling
	            .attr("d", path) //project graticule

	        //create graticule lines
	        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
	            .data(graticule.lines()) //bind graticule lines to each element to be created
	            .enter() //create an element for each datum
	            .append("path") //append each element to the svg as a path element
	            .attr("class", "gratLines") //assign class for styling
	            .attr("d", path); //project graticule lines
	}

    function joinData(europeRegions,csvData){
		//loop through csv to assign each set of csv attribute values to geojson region
        for (var i=0; i<csvData.length; i++){
            var csvRegion = csvData[i]; //the current region
            var csvKey = csvRegion.admin; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a=0; a<europeRegions.length; a++){

                var geojsonProps = europeRegions[a].properties; //the current region geojson properties
                var geojsonKey = europeRegions[a].properties.admin; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
                        europeRegions[a].properties[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
            console.log(europeRegions)
        }   ;
	        return europeRegions;
	}
    //Example 1.4 line 11...function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#ffffd4",
            "#fee391",
            "#fec44f",
            "#fe9929",
            "#d95f0e",
            "#993404"
        ];
    
        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);
    
        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };
    
        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);
    
        return colorScale;
    };

    function setEnumerationUnits(europeRegions,map,path,colorScale){
        //add France regions to map
        var regions = map.selectAll(".regions")
            .data(europeRegions)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "regions " + d.properties.admin;
            })
            .attr("d", path)
            .style("fill", function(d){
                var value = d.properties[expressed];
                if (value){
                    return colorScale(value);
                }else{ return "#ccc";}
            })
            .on("mouseover", function(event,d){
                highlight(d.properties);
            })
            .on("mouseout", function (event, d) {
                dehighlight(d.properties);
            })
            .on("mousemove",moveLabel)
        
            var desc = regions.append("desc").text('{"stroke": "#000", "stroke-width": "0.5px"}');
        
    }
       
    function setChart(csvData, colorScale){
        
        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");
    
        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
    
        //create a scale to size bars proportionally to frame and for axis
        // var yScale = d3.scaleLinear()
        //     .range([463, 0])
        //     .domain([0, 100]);
    
        //set bars for each province
        var bars = chart
            .selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function (a, b) {
                return b[expressed] - a[expressed];
            })
            .attr("class", function (d) {
                return "bar " + d.admin;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .on("mouseover", function(event,d){
                highlight(d);
            })
            .on("mouseout", function (event, d) {
                dehighlight(d);
            })
            .on("mousemove", moveLabel);
            
        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 40)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Number of " + expressed + " in each region");

        updateChart(bars, csvData.length, colorScale);

        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);
    
        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);
    
        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        var desc = bars.append("desc").text('{"stroke": "none", "stroke-width": "0px"}');
        
    };

    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .attr("transform", "translate(" + translateX + "," + translateY + ")")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");
        
        var translateX=0;
        var translateY= 100;
        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };
    //dropdown change event handler
    function changeAttribute(attribute, csvData){
        //change the expressed attribute
        expressed = attribute;
        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var regions = d3.selectAll(".regions")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                var value = d.properties[expressed];
                if(value){
                    return colorScale(value);
                }else{
                    return "#ccc";
                }  
            })
         //re-sort, resize, and recolor bars
         var bars = d3
            .selectAll(".bar")
            //re-sort bars
            .sort(function (a, b) {
                return b[expressed] - a[expressed];
            })
            .transition()
            .delay(function(d,i){
                return i*20;
            })
            .duration(500)
        
        var domainArray = [];
        for (var i=0; i<csvData.length; i++){
            var val = parseFloat(csvData[i][expressed]);
            domainArray.push(val);
        };
        var max = d3.max(domainArray);
        var min = d3.min(domainArray);

        yScale = d3.scaleLinear()
            .range([500, 0])
            .domain([min-20, max]);
        var yAxis = d3.axisLeft()
            .scale(yScale);
    
        d3.select(".axis").call(yAxis)

        updateChart(bars, csvData.length, colorScale);
    }
    function updateChart(bars, n, colorScale) {
        //position bars
        bars.attr("x", function (d, i) {
            return i * (chartInnerWidth / n) + leftPadding;
        })
            //size/resize bars
            .attr("height", function (d, i) {
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function (d, i) {
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function (d) {
                var value = d[expressed];
                if (value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });

        //at the bottom of updateChart()...add text to chart title
        var chartTitle = d3
            .select(".chartTitle")
            .text("Number of " + expressed + " in each Country");
    }

    //function to highlight enumeration units and bars
    function highlight(props){
        //change stroke
        var selected = d3.selectAll("." + props.admin)
            .style("stroke", "blue")
            .style("stroke-width", "2");
        setLabel(props);
    };

    //function to reset the element style on mouseout
    function dehighlight(props) {
        var selected = d3
            .selectAll("." + props.admin)
            .style("stroke", function () {
                return getStyle(this, "stroke");
            })
            .style("stroke-width", function () {
                return getStyle(this, "stroke-width");
            });

        function getStyle(element, styleName) {
            var styleText = d3.select(element).select("desc").text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        }
        //remove info label
        d3.select(".infolabel").remove();
    }

    //function to create dynamic label
    function setLabel(props){
        //label content
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.admin + "_label")
            .html(labelAttribute);

        var regionName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.admin);
    };

    //function to move info label with mouse
    function moveLabel(){
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;

        //use coordinates of mousemove event to set label coordinates
        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;

        //horizontal label coordinate, testing for overflow
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        //vertical label coordinate, testing for overflow
        var y = event.clientY < 75 ? y2 : y1; 

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };


})();
