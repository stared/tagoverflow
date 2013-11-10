// require se_query.js

function httpGetJSON(theUrl)
{
  var xmlHttp = null;

  xmlHttp = new XMLHttpRequest();
  xmlHttp.open( "GET", theUrl, false );
  xmlHttp.send( null );
  return JSON.parse(xmlHttp.responseText);
}

function fetchSites()
{
  sites = seQuery("sites", {}, 10000);
  return sites.filter(function(x) {return x.site_type === "main_site";})
              .sort(function(x,y){
                if (x.name > y.name)
                  return 1;
                else
                  return -1; 
              });
}

function fetchSiteStats(siteName)
{
  return seQuery("info", {site: siteName}, 1);
}
    
function fetchPopularTags(siteName, tagLimit)
{
  return seQuery("tags", {site: siteName, sort: "popular", order: "desc"}, tagLimit);
}

// not all connections may appear (higher number of related tags?)
function fetchRelatedTags(siteName, tagName, tagLimit)
{
  var tagNameFixed = tagName.replace("#", "%23");  // for "C#" may be problems with other characteres
  return seQuery("tags/" + tagNameFixed + "/related", {site: siteName}, tagLimit);
}

function tagConnections(siteName, popularTags, tagLimit)
{
  var siteInfo = fetchSiteStats(siteName);
  var noQuestion = siteInfo[0].total_questions;
  var popularTagCount = {};
  var popularTagPos = {};
  for (var i = 0; i < popularTags.length; i++)
  {
    popularTagCount[popularTags[i].name] = popularTags[i].count;
    popularTagPos[popularTags[i].name] = i;
  }

  var links = [];
   
  for (var i = 0; i < popularTags.length; i++)
  {
    // // UGLY - delete ASAP ->
    // $(".site_info #loading_status").html("Loading tag info: " + (i+1) + "/" + popularTags.length + "...");
    // // <- UGLU - delete ASAP
    var relatedTags = fetchRelatedTags(siteName, popularTags[i].name, tagLimit);
    for (var j = 0; j < relatedTags.length; j++)
    {
      var relatedTag = relatedTags[j];
      if ((relatedTag.name in popularTagCount) && (popularTags[i].name < relatedTag.name))
      {
        var link = {count: relatedTag.count,
                    source: i,
                    target: popularTagPos[relatedTag.name],
                    source_name: popularTags[i].name,
                    target_name: relatedTag.name,
                    oe_ratio: (relatedTag.count * noQuestion) / (popularTags[i].count * popularTagCount[relatedTag.name])
                   };
         if ((link.count > 1) && (link.oe_ratio > 1))
         {
           links.push(link);
         }
      }
    }
  }

  // // UGLY - delete ASAP ->
  // $(".site_info #loading_status").html("");
  // // <- UGLU - delete ASAP
  
  return links;

}

function getNodesLinks(siteName, tagLimit)
{

  // var tagLimit = 20;
  var nodes = fetchPopularTags(siteName, tagLimit);
  var links = tagConnections(siteName, nodes, tagLimit); // change source & target name to number?
  return {nodes: nodes, links:links};
}

  
function fetchTopAskers(siteName, tagName)
{
  var askersSize = 5;
  var tagNameFixed = tagName.replace("#", "%23");  // for "C#" may be problems with other characteres
  return seQuery("tags/" + tagNameFixed + "/top-askers/all_time", {site: siteName}, askersSize);
}

function fetchTopAnswerers(siteName, tagName)
{
  var answerersSize = 5;
  var tagNameFixed = tagName.replace("#", "%23");
  return seQuery("tags/" + tagNameFixed + "/top-answerers/all_time", {site: siteName}, answerersSize);
}

// function fetchFrequentQuestions(siteName, tagName)
// {
//   var faqSize = 5;
//   var tagNameFixed = tagName.replace("#", "%23");
//   return seQuery("tags/" + tagNameFixed + "/faq", {site: siteName}, faqSize);
// }

function fetchTopQuestions(siteName, tagName)
{
  var howMany = 5;
  var tagNameFixed = tagName.replace("#", "%23");
  return seQuery("questions", {site: siteName, tagged: tagNameFixed, sort: "votes", order: "desc"}, howMany);
}

function fetchLastQuestions(siteName, tagName)
{
  var size = 100;
  //TODO: todate
  var tagNameFixed = tagName.replace("#", "%23");
  return seQuery("questions", {order: "desc", sort: "creation", tagged: tagNameFixed, site: siteName}, size);
  //return seQuery("questions?order=desc&sort=creation&tagged=" + tagNameFixed, {site: siteName}, size);
}

function answered(siteName, tagName)
{
  var questions=fetchLastQuestions(siteName, tagName);
  var questionNumber=questions.length;
  var answeredNumber=questions.filter(function(x) {return x.is_answered;}).length;
  if (questionNumber>0) {return answeredNumber/questionNumber}
  else {return 0};
}

var color = d3.scale.linear()
  .domain([0, 1])
  .range(["red", "blue"])

function tagsColors(siteName, tags)
{
  var colors ={}
  for (var i = 0; i < tags.length; i++)
  {
    tagName=tags[i].name;
    colors[tagName]=color(answered(siteName, tagName))
    //colors.push(tagName:color(answered(siteName, tagName)));
  };
  return colors;
};

// not yet finished
var SeDataLoader = function(site_name){
  this.status = "Initializing...";
  this.site_name = site_name;
  this.site_stats = fetchSiteStats(site_name);
  this.tags = [];

  // load site stats
  // load tags
  // load tags connections
  // create nodes & links
  // load auxiliary information
  // show loading status
  // tag info chached
  this.status = "DONE!";
};
