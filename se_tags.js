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
  
  // maybe something with setTimeout loop?
  for (var i = 0; i < popularTags.length; i++)
  {
    console.log("Tag neighbors: " + i + "/" + popularTags.length);
    // // UGLY - delete ASAP ->
    $(".site_info #loading_status").html("Loading tag info: " + (i+1) + "/" + popularTags.length + "...");
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

function fetchLastQuestions(siteName, tags)
{
  var size = 100;
  //TODO: todate
  var tagNameFixed = tagName.replace("#", "%23");
  return seQuery("questions", {order: "desc", sort: "creation", tagged: tagNameFixed, site: siteName}, size);
  //return seQuery("questions?order=desc&sort=creation&tagged=" + tagNameFixed, {site: siteName}, size);
}

function answered(questions)
{
  var questionNumber=questions.length;
  var answeredNumber=questions.filter(function(x) {return x.is_answered;}).length;
  if (questionNumber>0) {return answeredNumber/questionNumber;}
  else {return 0;};
}

function questionsScore(questions)
{
  var questionNumber=questions.length;
  var scoreSum = 0;
  for (var q = 0; q < questionNumber; q++)
  {
    scoreSum += questions[q].score;
  }
  if (questionNumber > 0) {return scoreSum / questionNumber;}
  else {return 0;};
}

var color = d3.scale.linear()
  .domain([0, 1])
  .range(["red", "blue"]);

function answeredColors(questionsDict)
{
  colors = {};
  for (var tagName in questionsDict)
  {
    colors[tagName] = color(answered(questionsDict[tagName]))
  }
  return colors;
}

function scoreColors(questionsDict)
{
  colors = {};
  for (var tagName in questionsDict)
  {
    colors[tagName]=color(questionsScore(questionsDict[tagName]));
  }
  return colors;
}

var arrayOfDictToDict = function(list, field){
  var res = {};
  for (var i=0; i < list.length; i++){
    res[list[i][field]] = list[i];
    res[list[i][field]]['pos'] = i;
  }
  return res;
};

var SeDataLoaderPerSite = function(siteName, tagLimit){
  this.status = "Initializing...";
  this.siteName = siteName;
  this.tagLimit = tagLimit;
  this.siteStats = null;

  this.run = function(){
    this.siteStats = fetchSiteStats(siteName)[0];
    $(".site_info #title").html(sitesDict[siteName].name);
    $(".site_info #dscr").html(sitesDict[siteName].audience);
    $(".site_info a").attr("href",sitesDict[siteName].site_url);
    this.retriveTags();
    this.retriveRelatedTags();
  };

  this.tags = [];
  this.tagsDict = {};
  this.links = [];
  this.relatedTagDict = {};
  this.lastQuestionsPerTagDict = {};

  this.retriveTags = function(){
    var tagLimit = this.tagLimit;
    // here we can do well with doing it synchronously
    this.tags = fetchPopularTags(siteName, tagLimit);
    this.tagsDict = arrayOfDictToDict(this.tags, "name");
  };

  // below, tag limit does not need to be the same
  this.retriveRelatedTags = function(){
    this.relatedTagDict = {};
    var tagLimit = this.tagLimit;  // this one does not need to be the same
    for (var i=0; i < this.tags.length; i++){
      var tagName = this.tags[i].name;
      var tagNameFixed = tagName.replace("#", "%23");  // for "C#" may be problems with other characteres
      seQueryAsync("tags/" + tagNameFixed + "/related",
                   {site: siteName},
                   tagLimit,
                   this.putRelatedTagInDict,
                   [tagName, this.relatedTagDict, this.tags.length, this]);
    }
  };

  this.retriveLastQuestionsPerTag = function(){
    this.lastQuestionsPerTagDict = {};
    var tagLimit = this.tagLimit;
    for (var i=0; i < this.tags.length; i++){
      var tagName = this.tags[i].name;
      var tagNameFixed = tagName.replace("#", "%23");  // for "C#" may be problems with other characteres
      seQueryAsync("questions",
                   {order: "desc", sort: "creation", tagged: tagNameFixed, site: siteName},
                   100,  // 100 last questions
                   this.putLastQuestionsPerTagDict,
                   [tagName, this.lastQuestionsPerTagDict, this.tags.length, this]);
    }
  };

  this.putRelatedTagInDict = function(x, tagName, targetDict, tagsLength, that){
    targetDict[tagName] = x.items;
    var progress = Object.keys(targetDict).length;
    if (progress === tagsLength) {
      // console.log("Related tags: DONE!");
      $(".site_info #loading_status").html("Loading tag neighbors: DONE!");
      that.processRelatedTags();  // onDone();  // this.processRelatedTags();
      // f--king with references
    } else {
      // console.log("Related tags: " + progress + "/" + tagsLength);
      $(".site_info #loading_status").html("Loading tag neighbors: " + (progress) + "/" + tagsLength + "...");
    }
  };

  this.putLastQuestionsPerTagDict = function(x, tagName, targetDict, tagsLength, that){
    targetDict[tagName] = x.items;
    var progress = Object.keys(targetDict).length;
    if (progress === tagsLength) {
      // console.log("Additional tag info: DONE!");
      $(".site_info #loading_status").html("Loading additional tag info: DONE!");
      that.status = "Done!";
      setTimeout(function(){
        $(".site_info #loading_status").html("");
      }, 1000);
      // and we can fire something
    } else {
      // console.log("Additional tag info: " + progress + "/" + tagsLength);
      $(".site_info #loading_status").html("Loading additional tag info: " + (progress) + "/" + tagsLength + "...");
    }
  };

  this.processRelatedTags = function(){
    var noOfQuestions = this.siteStats.total_questions;
    this.links = [];
    for (var tag1 in this.relatedTagDict)
    {
      var tag1info = this.tagsDict[tag1];
      var relatedTags = this.relatedTagDict[tag1];

      for (var i = 0; i < relatedTags.length; i++){
        var tag2info = relatedTags[i];
        var tag2 = tag2info.name;

        if ((tag2 in this.tagsDict) && (tag1 < tag2))
        // isnt this order stuff making as loose some entries?
        {
          var link = {count: tag2info.count,
                      source: this.tagsDict[tag1].pos,
                      target: this.tagsDict[tag2].pos,
                      source_name: tag1,
                      target_name: tag2,
                      oe_ratio: (tag2info.count * noOfQuestions) / (tag1info.count * this.tagsDict[tag2].count)
                     };
          // console.log(link.oe_ratio);
          if ((link.count > 1) && (link.oe_ratio > 1))
          {
            this.links.push(link);
          }
        }
      }
    }
    draw_graph(this);
  };

};
