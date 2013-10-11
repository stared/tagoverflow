var apiName = "http://api.stackexchange.com/2.1/";
var apiKey = "of3hmyFapahonChi8EED6g((";

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
  var sites = httpGetJSON(apiName
              + "sites"
              + "?key="
              + apiKey
              + "&pagesize=100").items;
  return sites.filter(function(x) {return x.site_type === "main_site";});
}

function fetchSiteStats(siteName)
{
  return httpGetJSON(apiName
              + "info?site="
              + siteName
              + "&key="
              + apiKey).items;
}
    
function fetchPopularTags(siteName, pageSize)
{
  return httpGetJSON(apiName
              + "tags?pagesize="
              + pageSize
              + "&order=desc&sort=popular&site="
              + siteName
              + "&key="
              + apiKey).items;
}

// not all connections may appear (higher number of related tags?)
function fetchRelatedTags(siteName, tagName, pageSize)
{
  return httpGetJSON(apiName 
              + "tags/"
              + tagName.replace("#", "%23")  // may be problems with other characteres
              + "/related?pagesize="
              + pageSize
              + "&site="
              + siteName
              + "&key="
              + apiKey).items;
}

function tagConnections(siteName, popularTags, pageSize)
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
    var relatedTags = fetchRelatedTags(siteName, popularTags[i].name, pageSize);
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
  
  return links;

}

function getNodesLinks(siteName, pageSize)
{

  // var pageSize = 20;
  var nodes = fetchPopularTags(siteName, pageSize);
  var links = tagConnections(siteName, nodes, pageSize); // change source & target name to number?
  return {nodes: nodes, links:links};
  
}
