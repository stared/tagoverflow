//Stolen from https://gist.github.com/nowherenearithaca/4449376

function linLegend(startcolor,stopcolor,minvalue,maxvalue) {
  var svgWidth = 100,
    svgHeight = 300,
    x1 = 5,
    barWidth = 30,
    y1 = 20,
    barHeight = 200,
    numberHues = 35,
    numberScaleLines = 5,
    tickFontSize = 12;
    
  var idGradient = "legendGradient";
	
  d3.select("#theBar svg").remove();
  
  var svgForLegendStuff = d3.select("#theBar").append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight);
   
  //create the empty gradient that we're going to populate later
  svgForLegendStuff.append("g")
    .append("defs")
    .append("linearGradient")
      .attr("id",idGradient)
      .attr("x1","0%")
      .attr("x2","0%")
      .attr("y1","100%")
      .attr("y2","0%"); // x1=0, x2=100%, y1=y2 results in a horizontal gradient
                        // it would have been vertical if x1=x2, y1=0, y2=100%
                        // See
                        // http://www.w3.org/TR/SVG/pservers.html#LinearGradients
                        // for more details and fancier things you can do
                        //create the bar for the legend to go into
                        // the "fill" attribute hooks the gradient up to this rect
                        
  var axisScale = d3.scale.linear()
    .domain([minvalue, maxvalue])
    .range([barHeight + y1, y1]);
    

  var yAxis = d3.svg.axis().scale(axisScale)
    .orient("right")
    .ticks(5)
    .tickSize(8, 3, 0)
    .ticks(numberScaleLines);
    
  svgForLegendStuff.append("g")
    .attr("class", "axis") 
    .attr("transform", "translate(" + barWidth + ",0)")
    .call(yAxis);
	//.attr("font-family", "sans-serif")
    //.attr("font-size", tickFontSize + "px");
    
  svgForLegendStuff.append("rect")
      .attr("fill","url(#" + idGradient + ")")
      .attr("x",x1)
      .attr("y",y1)
      .attr("width",barWidth)
      .attr("height",barHeight)
 
  var theData = [];
  var color = d3.scale.linear()  
      .domain([minvalue, maxvalue])
      .range([startcolor, stopcolor])
  
  var deltaValue = (maxvalue - minvalue)/(numberHues - 1);
  var deltaPercent = 1/(numberHues-1);
  var value, valuecolor, opacity, p;

  for (var i=0;i < numberHues;i++) {
    value = minvalue + deltaValue*i;
    valuecolor = color(value);
    opacity = 1;
    p = 0 + deltaPercent*i;
    theData.push({"rgb":valuecolor, "opacity":opacity, "percent":p});
  };   
   
  var stops = d3.select('#' + idGradient).selectAll('stop')
      .data(theData);
    stops.enter().append('stop');
    stops.attr('offset',function(d) {
        return d.percent;
      })
      .attr('stop-color',function(d) {
        return d.rgb;
      })
      .attr('stop-opacity',function(d) {
        return d.opacity;
      });
      
};
