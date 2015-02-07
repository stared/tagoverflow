// requires se_query.js


//
// Functions for the whole StackExchange network
//

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

//
// Functions for a particular tag
//

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

function fetchTopQuestions(siteName, tagName)
{
  var howMany = 5;
  var tagNameFixed = tagName.replace("#", "%23");
  return seQuery("questions", {site: siteName, tagged: tagNameFixed, sort: "votes", order: "desc"}, howMany);
// return seQuery("tags/" + tagNameFixed + "/faq", {site: siteName}, howMany);
}

//
// Helpers
//

var arrayOfDictToDict = function(list, field){
  var res = {};
  for (var i=0; i < list.length; i++){
    res[list[i][field]] = list[i];
    res[list[i][field]]['pos'] = i;
  }
  return res;
};

//
// Dealing with tags from a particular StackExchange site
//

var SeDataLoaderPerSite = function(siteName, tagLimit, centralTag, delay){
  this.status = "Initializing...";
  this.siteName = siteName;
  this.tagLimit = tagLimit;
  this.centralTag = centralTag || undefined;
  this.delay = delay || 100;
  // see in SE API documentation:
  // "If a single IP is making more than 30 requests a second,
  // new requests will be dropped"
  // i.e. 33.(3) ms 
  // but anyway, even for slower requests,
  // longer bursts does not look good
  this.siteStats = null;

  // age of extracted data:
  // warning: Date object count in milisceconds,SEapi count in seconds.  
  this.month = 1*1000*60*60*24*30;
  this.today = new Date().getTime(); //actual date
  this.todate = Math.floor(new Date(this.today - this.month).getTime()/1000);
  
  this.siteData = sitesDict[siteName];
  // at least to have this info here

  this.fetchSiteStats = function (siteName)
  {
    return seQuery("info", {site: siteName}, 1);
  };

  this.fetchPopularTags = function(siteName, tagLimit)
  {
    if (this.centralTag == undefined) {
      return seQuery("tags",
                       {site: siteName, sort: "popular", order: "desc"},
                       tagLimit);
    } else {
      return seQuery("tags/" + this.centralTag + "/related",
                       {site: siteName, sort: "popular", order: "desc"},
                       tagLimit);
    }
  };

  this.run = function(){
    this.siteStats = this.fetchSiteStats(siteName)[0];

    if (this.centralTag) {
      try {
        this.centralTagCount = seQuery("tags/" + this.centralTag + "/info", {site: siteName}, 1)[0]['count'];
        // this.centralTagText = seQuery("tags/" + this.centralTag + "/wikis", {site: siteName}, 1)[0]['excerpt'];
        // if (this.centralTagText.length > 140) {
        //   this.centralTagText = this.centralTagText.slice(137) + "...";
        // }
      } catch (e) {
        $("#loading_status").html("No such tag.");
        alert("No such tag!");
        return;
      }

    } 

    if (!this.centralTag) {
      $(".site_info #site_name").html(this.siteData.name);
      $(".site_info #dscr").html(this.siteData.audience);
      $(".site_info #site_name").hide().attr("href", this.siteData.site_url).show();
    } else {
      $(".site_info #site_name").html(this.siteData.name + ": " + this.centralTag);
      // $(".site_info #dscr").html(this.centralTagText);
      $(".site_info #dscr").html("");
      $(".site_info #site_name").hide().attr("href", this.siteData.site_url + "/tagged/" + this.centralTag).show();
    }

    if (!this.centralTag) {
      this.noOfQuestions = this.siteStats.total_questions;
    } else {
      this.noOfQuestions = this.centralTagCount;
    }

    $(".site_info #count").html("(" + siNumberApprox(this.noOfQuestions) + ")");
      
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
    this.tags = this.fetchPopularTags(siteName, tagLimit);
    this.tagsDict = arrayOfDictToDict(this.tags, "name");
  };

  // below, tag limit does not need to be the same
  this.retriveRelatedTags = function(){
    this.relatedTagDict = {};
    var tagLimit = this.tagLimit;  // this one does not need to be the same
    var that = this;
    for (var i=0; i < this.tags.length; i++){
      (function(){
        var tagName = that.tags[i].name;
        var tagNames = [tagName];
        if (that.centralTag != undefined) {
          tagNames.push(that.centralTag);
        }
        tagNames = tagNames.join(";");
        setTimeout( function() {
            seQueryAsync("tags/" + tagNames + "/related",
                         {site: siteName},
                         tagLimit,
                         that.putRelatedTagInDict,
                         [tagName, that.relatedTagDict, that.tags.length, that]);
          }, i * that.delay);
      })();
    }
  };

  this.retriveLastQuestionsPerTag = function(){
    this.lastQuestionsPerTagDict = {};
    var tagLimit = this.tagLimit;
    var that = this;
    for (var i=0; i < this.tags.length; i++){
      (function(){
        var tagName = that.tags[i].name;
        var tagNames = [tagName];
        if (that.centralTag != undefined) {
          tagNames.push(that.centralTag);
        }
        tagNames = tagNames.join(";");
        setTimeout( function() {
            seQueryAsync("questions",
                         {order: "desc", sort: "creation", tagged: tagNames, site: siteName,
                         todate: that.todate}, // question age
                         100,  // 100 last questions
                         that.putLastQuestionsPerTagDict,
                         [tagName, that.lastQuestionsPerTagDict, that.tags.length, that]);
         }, i * that.delay);
      })();
    }
  };

  this.putRelatedTagInDict = function(x, tagName, targetDict, tagsLength, that){
    targetDict[tagName] = x.items;
    var progress = Object.keys(targetDict).length;
    if (progress === tagsLength) {
      $("#loading_status").show().html("Loading tag neighbors: DONE!");
      setTimeout(function(){
        $("#loading_status").html("").hide();
      }, 1000);
      that.processRelatedTags();
    } else {
      $("#loading_status").show().html("Loading tag neighbors: " + (progress) + "/" + tagsLength + "...");
    }
  };

  this.putLastQuestionsPerTagDict = function(x, tagName, targetDict, tagsLength, that){
    targetDict[tagName] = x.items;
    var progress = Object.keys(targetDict).length;
    if (progress === tagsLength) {
      $("#loading_status").show().html("Loading additional tag info: DONE!");
      that.status = "Done!";
      setTimeout(function(){
        $("#loading_status").html("").hide();
      }, 1000);
    } else {
      $("#loading_status").show().html("Loading additional tag info: " + (progress) + "/" + tagsLength + "...");
    }
  };

  this.processRelatedTags = function (includeCentralTag) {
    this.links = [];
    for (var tag1 in this.relatedTagDict)
    {
      var tag1info = this.tagsDict[tag1];
      var relatedTags = this.relatedTagDict[tag1];

      for (var i = 0; i < relatedTags.length; i++){
        var tag2info = relatedTags[i];
        var tag2 = tag2info.name;

        if ((tag2 in this.tagsDict) && (tag1 < tag2))
        // isn't this order stuff making sense as lose some entries?
        {
          var link = {count: tag2info.count,
                      source: this.tagsDict[tag1].pos,
                      target: this.tagsDict[tag2].pos,
                      source_name: tag1,
                      target_name: tag2,
                      oe_ratio: (tag2info.count * this.noOfQuestions) / (tag1info.count * this.tagsDict[tag2].count)
                     };
          if ((link.count > 1) && (link.oe_ratio > 1))
          {
            this.links.push(link);
          }
        }
      }
    }

    // if (includeCentralTag) {

    // }

    draw_graph(this);
  };

};
