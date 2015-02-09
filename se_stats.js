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

function answersMd(questions) {
  return d3.median(questions, function (q) { return q.answer_count; });
}

function answersAv(questions) {
  return d3.mean(questions, function (q) { return q.answer_count; });
}


function questionsScoreMd(questions) {
  return d3.median(questions, function (q) { return q.score; });
}

function questionsScoreAv(questions) {
  return d3.mean(questions, function (q) { return q.score; });
}

function questionsScoreMax(questions) {
  return d3.max(questions, function (q) { return q.score; });
}

function questionsViewMd(questions){
  return d3.median(questions, function (q) { return q.view_count; });
}

function questionsViewAv(questions){
  return d3.mean(questions, function (q) { return q.view_count; });
}

function questionsViewMax(questions){
  return d3.mean(questions, function (q) { return q.view_count; });
}

function ownerReputationMd(questions){
  return d3.median(questions, function (q) { return q.owner.reputation; });
}

function ownerReputationAv(questions){
  return d3.mean(questions, function (q) { return q.owner.reputation; });
}

function ownerReputationMax(questions){
  return d3.median(questions, function (q) { return q.owner.reputation; });
}
