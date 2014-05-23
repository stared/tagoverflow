/*
SETagStats = function (questions) {
  this.questions = questions;
  
  this.mean = function (field) {
  
  }
  
  this.answered = {};
}
*/

function answered(questions)
{
  var questionNumber=questions.length;
  var answeredNumber=questions.filter(function(x) {return x.is_answered;}).length;
  if (questionNumber>0) {return answeredNumber/questionNumber;}
  else {return 0;}
}

function questionsScore(questions) {
  return d3.median(questions, function (q) { return q.score; });
}

function questionsScoreAv(questions) {
  return d3.mean(questions, function (q) { return q.score; });
}

function questionsView(questions){
  return d3.median(questions, function (q) { return q.view_count; });
}

function ownerReputation(questions){
  return d3.median(questions, function (q) { return q.owner.reputation; });
}
