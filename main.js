function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

var sites = fetchSites();
sitesDict = {};
for(var i=0; i < sites.length; i++){
  sitesDict[sites[i]["api_site_parameter"]] = sites[i]
}

d3.select("select#site_selector").selectAll("option")
    .data(sites)
    .enter()
      .append("option")
        .attr("value", function(d){ return d.api_site_parameter; })
        .html(function(d){ return d.name; })

var initialSite = getParameterByName("site").replace("/", "") || "stackoverflow";
if (!(initialSite in sitesDict)) {
  initialSite = "stackoverflow";
}

$("select#site_selector")[0].value = initialSite;

var body = d3.select("body");
var tooltip = new Tooltip("body");

preGraphDrawing();

d3.select("select#site_selector").on("change", function(){
  var queryString = "?site=" + d3.select("#site_selector").property("value");
  if (history.pushState) {
    var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + queryString;
    window.history.pushState({path:newurl}, '', newurl);
  }
  $("input#central_tag").val("");
  preGraphDrawing();  // now it may be even not needed
});

d3.select("select#pageSize").on("change", function(){
  preGraphDrawing();
});

d3.select("button#go").on("click", function(){
  preGraphDrawing();
});


function preGraphDrawing(){
  var siteName = $("select#site_selector")[0].value;
  var pageSize = parseInt($("select#pageSize")[0].value);
  var centralTag = $("input#central_tag")[0].value;
  seSiteData = new SeDataLoaderPerSite(siteName, pageSize, centralTag);
  seSiteData.run();
  // fires draw_graph() after doing necessary stuff
}

function draw_graph(seSiteData){

d3.select("select#colorParameter").on("change", function(){
  if (seSiteData.status === "Done!") {
    colorize(graph.nodes, this.value);
  } else {
    retriveLastQuestions();
  }
});

var graph = {nodes: seSiteData.tags, links: seSiteData.links};

// community detection for graph
communitize(graph, function (link) {
  return link['oe_ratio'] - 1;
});
//console.log(d3.max(graph.nodes, function (d) {return d.community;}));

var comm_color = d3.scale.category10();

body.select("svg#graph").remove();
body.select("#theBar svg").remove();

var width = 1000,
    height = 700;

var svg = body.append("svg")
    .attr("id", "graph")
    .attr("width", width)
    .attr("height", height);

var count_scale = d3.scale.linear()
  .domain([0, d3.max(graph.nodes, function (d) { return d.count; })])
  .range([0, 2500]);

var eo_ratio_scale = function(oe_ratio) {
  return  Math.min( (oe_ratio - 1)/8 , 1);
};

// 8. is an engineering constant; maybe we should relate it more to the data
 

var force = d3.layout.force()
    .charge( function(d) { return -50 * Math.sqrt(count_scale(d.count)); })
    .linkDistance(40)
    .gravity(0.45)
    .size([width, height]);
    // .on("end", colorize);  // takes to long before it ends

  var main = svg.append("g")
   .attr("class", "graph");

  force
      .nodes(graph.nodes)
      .links(graph.links)
      .linkStrength(function (d) {
        return eo_ratio_scale(d['oe_ratio']);
      })
      .start();

  var drag = force.drag()
    .on("dragstart", function (d) {
      d3.event.sourceEvent.stopPropagation(); // silence other listeners
      d.moved = false;
    })
    .on("drag", function (d) {
      if (Math.pow(d3.event.dx, 2) + Math.pow(d3.event.dy, 2) > 25) {
        d.moved = true;
      }
    })
    .on("dragend", function (d) {
      if (d.moved === true) {
        if (d.fixed2 === true) {
          d3.select(this).classed("fixed", d.fixed = false);
          d.fixed2 = false;
        } else {
          d3.select(this).classed("fixed", d.fixed = true);
          d.fixed2 = true;
        }
      }
    });

  var link = main.selectAll(".link")
      .data(graph.links)
    .enter().append("line")
      .attr("class", "link")
      .style("stroke-width", function(d) {
        return 0.5 * Math.sqrt(count_scale(d.count))
      })
      .style("stroke-opacity", function(d) {
        return 0.5 * eo_ratio_scale(d['oe_ratio']);
      })
      .on("mouseover", function (d) {

        d3.select(this).style("stroke-opacity", 0.75);

        var text = "with " + d.source_name + " and " + d.target_name + " tags:<br><br>" +
                   siNumberApprox(d.count) + " questions<br>" +
                   d.oe_ratio.toFixed(2) + "x more likely than by chance";
        tooltip.show(text);

      })
      .on("mouseout", function (d) {
        d3.select(this).style("stroke-opacity", function(d) {
          return 0.5 * eo_ratio_scale(d['oe_ratio']);
        });
        tooltip.out();
      }); 

  var node = main.selectAll(".node_circle")
      .data(graph.nodes)
    .enter().append("circle")
      .attr("class", "node_circle")
      .attr("r", function(d) { return 0.5 * Math.sqrt(count_scale(d.count)); })
      .style("fill", function (d) {return comm_color(d.community);})
      .on("mouseover", function(d) { mouseover_node(d); })
      .on("mouseout", function(d) { mouseout_node(d); })
      .on("click", function(d){
        if (d3.event.defaultPrevented) return;
        click_node(d);
      })
      .on("dblclick", function (d) {
        d3.select(this).classed("fixed", d.fixed = false);
      })
      .call(drag);

  var label = main.selectAll(".node_label")
      .data(graph.nodes)
    .enter().append("text")
      .attr("class", "node_label")
      .attr("dx", function(d) { return 2 + 0.5 * Math.sqrt(count_scale(d.count)); })
      .attr("dy", ".4em")
      .attr("font-family", "Verdana")
      .attr("font-size", 10)
      .style("fill", "#000000")
      .text(function(d) { return d.name; });

  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });

    label.attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; });
  });

  var mouseover_node = function(z){ 

    var neighbors = {};
    neighbors[z.index] = true;

    link.filter(function(d){
        if (d.source == z) {
          neighbors[d.target.index] = true
          return true
        } else if (d.target == z) {
          neighbors[d.source.index] = true
          return true
        } else {
          return false
        }
      })
        .style("stroke-opacity", function(d) {
          return Math.sqrt(0.5 * eo_ratio_scale(d['oe_ratio']));
        });

    node.filter(function(d){ return neighbors[d.index] })
        .style("stroke-width", 3);

    label.filter(function(d){ return !neighbors[d.index] })
        .style("fill-opacity", 0.2);

    label.filter(function(d){ return neighbors[d.index] })
        .attr("font-size", 16);

  };

  var mouseout_node = function(z){ 
    link
      .style("stroke-opacity", function(d) {
        return 0.5 * eo_ratio_scale(d['oe_ratio']);
      });

    node
      .style("stroke-width", null);

    label
      .attr("font-size", 10)
      .style("fill-opacity", 1);

  };

  var click_node = function(z){
    //
    // Things that need to be fixed:
    // - working for conditional tags
    // - as asynchronous call
    //

    $(".tag_info #tag_name").html(z.name);
    $(".tag_info #tag_name")
      .hide()
      .attr('href', seSiteData.siteData.site_url + "/questions/tagged/" + z.name)
      .show();

    // $(".tag_info #dscr").html("count: " + z.count);


    var askers = fetchTopAskers(seSiteData.siteName, z.name);

    var d3asker = d3.select(".tag_info #askers .facelist").selectAll(".user_row")
      .data(askers);
    
    var asker = d3asker.enter()
      .append("div")
        .attr("class", "user_row")
        .append("a");


    asker.append("div")
      .attr("class", "userface")
        .append("img");

    asker
      .append("div")
        .attr("class", "username_wrapper")
        .append("div")
          .attr("class", "username");

    d3asker.select("a")
      .attr("href", null)
      .attr("href", function (d) { return d.user.link; });

    d3asker.select("a img")
      .attr("src", function (d) { return d.user.profile_image; })
      .attr("width", 32)
      .attr("height", 32);

    d3asker.select("a .username")
      .html(function (d) { return d.user.display_name; });

    d3asker.exit()
      .remove();


    var answerers = fetchTopAnswerers(seSiteData.siteName, z.name);

    var d3answerer = d3.select(".tag_info #answerers ul").selectAll("li")
      .data(answerers);
    
    var d3answerer = d3.select(".tag_info #answerers .facelist").selectAll(".user_row")
      .data(answerers);
    
    var answerer = d3answerer.enter()
      .append("div")
        .attr("class", "user_row")
        .append("a");


    answerer.append("div")
      .attr("class", "userface")
        .append("img");

    answerer
      .append("div")
        .attr("class", "username_wrapper")
        .append("div")
          .attr("class", "username");

    d3answerer.select("a")
      .attr("href", null)
      .attr("href", function (d) { return d.user.link; });

    d3answerer.select("a img")
      .attr("src", function (d) { return d.user.profile_image; })
      .attr("width", 32)
      .attr("height", 32);

    d3answerer.select("a .username")
      .html(function (d) { return d.user.display_name; });

    d3answerer.exit()
      .remove();


    var questions = fetchTopQuestions(seSiteData.siteName, z.name);

    var d3question = d3.select(".tag_info #questions ul").selectAll("li")
      .data(questions);

    d3question.enter()
      .append("li")
        .append("a");

    d3question.select("a")
      .attr("href", null)
      .attr("href", function (d) { return d.link; })
      .html(function (d) { return d.title; });

    d3question.exit()
      .remove();

  };

  // Below is asynch.
  var questionsDict;

  function retriveLastQuestions() {
    seSiteData.retriveLastQuestionsPerTag();
    questionsDict = seSiteData.lastQuestionsPerTagDict;
    setTimeout(colorizeTimeouted, 500);
  }

  function colorizeTimeouted(){
    if (seSiteData.status === "Done!") {
      colorize(graph.nodes, $("select#colorParameter").val());
    } else {
      setTimeout(colorizeTimeouted, 500);
    }
  }

  function color(lowcolor,highcolor,valuesDict){
    var values = [];
    for (key in valuesDict){
      values.push(valuesDict[key]);
    };
    var minvalue = d3.min(values);
    var maxvalue = d3.max(values);
    var colorScale = d3.scale.linear()
      .domain([minvalue, maxvalue])
      .range([lowcolor, highcolor])
    colors = {};
    for (key in valuesDict){
      colors[key]=colorScale(valuesDict[key]);
    };  
    return colors;
  };
  
  function asinh(x){
    return Math.log(x + Math.sqrt(x*x + 1))
  };
  
  function statsColors(questionsDict, func, startColor, stopColor){
    var valueDict = {};
    var valueList = [];
    for (tagName in questionsDict)
    {
      var value = func(questionsDict[tagName]);
      valueDict[tagName]=value;
      valueList.push(value);
    };
    var dict = {start:startColor, stop:stopColor, values:valueDict, range:[d3.min(valueList),d3.max(valueList)]};
    return dict
  };

var statsList = ["community","answered","score","score_av","view","reputation"];  // not used by now
var statsDict = {
	answered: {
	  func: answered,
	  startColor: "sienna",
	  stopColor: "wheat"},
	score: {
	  func: questionsScore,
	  startColor:"green",
	  stopColor:"yellow"},
	score_av: {
	  func: questionsScoreAv,
	  startColor: "green", 
	  stopColor: "yellow"},
	view: {
	  func: questionsView, 
	  startColor: "blue", 
	  stopColor: "cyan"},
	reputation: {
	  func: ownerReputation,
	  startColor: "red",
	  stopColor: "yellow"}
	};

  function colorize (d, colorParameter) {
    if (colorParameter == "community") {
      node.style("fill", function(d){ return comm_color(d.community); });
      d3.select("#theBar svg").remove();
    } else {
      var statInfo = statsDict[colorParameter]
      var func = statInfo.func
      var start = statInfo.startColor
      var stop = statInfo.stopColor
      var data = statsColors(questionsDict,func,start,stop)

      var nodes_colors = color(data.start, data.stop, data.values);
      var valueDomain = data.range;
      var colorRange = [data.start, data.stop];
      legend(data.start, data.stop, data.range[0], data.range[1])
      
      node.style("fill", function(d){ return nodes_colors[d.name] } );
    }
    
  };

};

function Tooltip(parentDom) {

  var tooltip = d3.select(parentDom)
    .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 1e-6);

  this.show = function (html) {
    tooltip.style('opacity', 0.8)
      .style('left', (d3.event.pageX + 15) + 'px')
      .style('top', (d3.event.pageY + 8) + 'px')
      .html(html);
  };

  this.out = function () {
    tooltip
      .style('opacity', 1e-6);
  };

  this.destory = function () {
    tooltip.remove();
  };

}

function siNumberApprox (x) {
  var prefix = d3.formatPrefix(x);
  var scaled = prefix.scale(x);
  return scaled.toFixed(scaled < 10 ? 1 : 0) + prefix.symbol;
}