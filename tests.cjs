// Execute: node tests.cjs. Os testes não precisam de rede ou bibliotecas externas.
const assert=require('node:assert/strict'),F=require('./core.js');let checks=0;
const check=(actual,expected)=>{assert.deepEqual(actual,expected);checks++;};
const input={name:'Internet',amount:12000,date:'2026-10-14',month:'2026-10',nature:'Despesa',type:'Fixo',category:'Serviços',note:'',priority:'Normal',method:'Pix',card:'',repeat:false};
for(const [date,paid,key,label] of [['2026-10-12','','late','Atrasado há 1 dia'],['2026-10-11','','late','Atrasado há 2 dias'],['2026-10-13','','today','Vence hoje'],['2026-10-14','','tomorrow','Vence amanhã'],['2026-10-15','','upcoming','Vence em 2 dias'],['2026-10-16','','upcoming','Vence em 3 dias'],['','', 'upcoming','Sem data'],['2026-10-12','2026-10-13','paid','Pago em 13/10/2026']]){const s=F.status({...input,date,paidDate:paid},'2026-10-13');check([s.key,s.label],[key,label]);}
check(F.status({...input,nature:'Receita'},'2026-10-13').label,'Recebe amanhã');
check(F.addMonths('2026-01-31',1),'2026-02-28');check(F.addMonths('2024-01-31',1),'2024-02-29');check(F.addMonths('2026-12-31',1),'2027-01-31');
check(F.validDate('2026-02-30'),false);check(F.validDate('2024-02-29'),true);check(F.cents('0.29'),29);
const scheduled=F.schedule({...input,date:'2026-01-31',month:'2026-01'},3,1,'2026-02-01');check(scheduled.map(e=>e.date),['2026-01-31','2026-02-28','2026-03-31']);
check(F.debts({entries:scheduled})[0].balance,24000);check(F.debts({entries:scheduled})[0].remaining,2);
scheduled[1].paidDate='2026-02-28';check(F.debts({entries:scheduled})[0].balance,12000);scheduled[1].paidDate='';check(F.debts({entries:scheduled})[0].balance,24000);
const state=F.empty();state.entries=F.schedule({...input,date:'2026-01-31',month:'2026-01',repeat:true},1,1);
check(F.ensureRecurring(state,'2026-02'),1);check(state.entries[1].date,'2026-02-28');check(state.entries[1].paidDate,'');check(F.ensureRecurring(state,'2026-02'),0);check(F.ensureRecurring(state,'2026-03'),1);check(state.entries[2].date,'2026-03-31');
state.entries[2].repeat=false;check(F.ensureRecurring(state,'2026-04'),0);
const fixed=F.empty();fixed.entries=F.schedule(input,1,1);check(F.ensureRecurring(fixed,'2026-11',true,'2026-10'),1);check(F.ensureRecurring(fixed,'2026-11',true,'2026-10'),0);check(fixed.entries[1].paidDate,'');
const month=F.empty();month.entries=[...F.schedule({...input,amount:10000,date:'2026-10-12'},1,1),...F.schedule({...input,name:'Luz',amount:5000,type:'Variável',category:'Moradia',date:'2026-10-12'}),...F.schedule({...input,nature:'Receita',amount:100000,category:'Salário'})];const t=F.dashboard(month.entries,'2026-10-13');check([t.income,t.expense,t.balance,t.paid,t.pending,t.late,t.fixed,t.variable,t.percent],[100000,15000,85000,10000,5000,5000,10000,5000,50]);check(t.categories,{'Serviços':10000,'Moradia':5000});check(F.alerts(month.entries,'2026-10-13'),{today:0,tomorrow:0,late:1,count:1});
check(F.validate(JSON.parse(JSON.stringify(month))),month);assert.throws(()=>F.validate({...month,entries:[{...month.entries[0],amount:-1}]}));checks++;assert.throws(()=>F.schedule(input,3,4));checks++;
const migrated=F.migrate({salary:1900,extra:100,expenses:[{name:'Internet',value:120,type:'Fixo',date:'2026-10-14',paid:true},{name:'Água',value:50,type:'Variável',date:'',paid:false}]},'2026-10');check(F.dashboard(F.monthEntries(migrated,'2026-10')).balance,183000);check(F.validate(migrated),migrated);check(F.monthEntries(migrated,'2026-10').length,4);
check(F.csv([{...input,name:'=1+1',total:1,installment:1}]).includes('"\'=1+1"'),true);check(F.csv([{...input,name:'Conta "teste"',total:1,installment:1}]).includes('Conta ""teste""'),true);
console.log(`${checks} verificações: datas/status, centavos, parcelas, recorrência, novo mês, totais, migração, backup e CSV — OK.`);
