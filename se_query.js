var apiName = "http://api.stackexchange.com/2.1/";
var apiKey = "of3hmyFapahonChi8EED6g((";

function httpGetJSON(theUrl)
{
  var xmlHttp = null;

  xmlHttp = new XMLHttpRequest();
  xmlHttp.open("GET", theUrl, false);
  xmlHttp.send(null);
  return JSON.parse(xmlHttp.responseText);
}

function httpGetJSONasync(theUrl, func, args)
{
  var xmlHttp = null;
  var args = args || []; 
  xmlHttp = new XMLHttpRequest();
  xmlHttp.onload = function(){ func.apply(null, [JSON.parse(this.responseText)].concat(args)); };
  xmlHttp.open("GET", theUrl, true);
  xmlHttp.send(null);
}


var seQuery = function(command, dict, noOfItems){
  var pageSize = noOfItems || 100;
  pageSize = Math.min(pageSize, 100);
  var queryString = apiName + command + "/?";
  for (var k in dict) {
    queryString += k + "=" + dict[k] + "&";
  }
  var res = [];
  queryString += "key=" + apiKey + "&pagesize=" + pageSize;
  for (var i=0; (noOfItems === undefined) || (i * pageSize < noOfItems); i++){
    var resp = httpGetJSON(queryString + "&page=" + (i+1));
    if (resp.items === undefined){
      console.log("Error with SE API:\n(call: "
                  + queryString + "&page=" + (i+1) + ")\n"
                  + JSON.stringify(resp, null, 2)
      );
      return undefined;
    }
    res = res.concat(resp.items);
    if (resp.has_more === false)
      break;
  }
  return res;
};

var seQueryAsync = function(command, dict, noOfItems, func, args){
  var pageSize = noOfItems || 100;
  if (pageSize > 100){
    concole.log("aync calls for only up to 100 elements at once");
    return false;
  }
  var queryString = apiName + command + "/?";
  for (var k in dict) {
    queryString += k + "=" + dict[k] + "&";
  }
  var res = [];
  queryString += "key=" + apiKey + "&pagesize=" + pageSize;
  httpGetJSONasync(queryString, func, args);
};
