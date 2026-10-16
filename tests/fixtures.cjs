const Judge=require('../dist/judge-core.js');
const cases=require('../dist/cases.js');
const clone=value=>JSON.parse(JSON.stringify(value));
function submission(){return {case:clone(cases[0]),transcript:'We would confirm household income, expenses and risk tolerance before recommending products. We would build an emergency fund and review the plan quarterly.',answers:['We would review accounts quarterly and after a major life change.','We would pay the statement balance in full and monitor spending.'],photos:[]};}
function scorecard(input=submission()){
  return {summary:'Synthetic evaluation of observable content. Live delivery and teamwork are unassessed.',rows:Judge.rubric(input.case.indicators).map(r=>({id:r.id,score:Math.min(4,r.max),evidence:'The team identifies missing client facts.',rationale:'This demonstrates developing case application but needs quantified assumptions.',improvement:'Specify the facts to request and explain how they change the recommendation.',references:[{source:'transcript',quote:'confirm household income, expenses and risk tolerance',detail:''}]}))};
}
module.exports={submission,scorecard,clone};
