/* Regras financeiras puras: valores em centavos, datas sem conversão de fuso. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Finance = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const uid = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  function today(now = new Date()) { return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; }
  function validDate(d) {
    if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    const [y,m,day] = d.split('-').map(Number), v = new Date(Date.UTC(y,m-1,day));
    return y >= 1900 && y <= 2200 && v.getUTCFullYear() === y && v.getUTCMonth() === m-1 && v.getUTCDate() === day;
  }
  const validMonth = m => typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && Number(m.slice(0,4)) >= 1900 && Number(m.slice(0,4)) <= 2200;
  function addMonths(date, count) {
    if (!validDate(date) || !Number.isInteger(count)) throw Error('Data inválida.');
    const [y,m,d] = date.split('-').map(Number), dest = new Date(Date.UTC(y,m-1+count,1));
    const last = new Date(Date.UTC(dest.getUTCFullYear(),dest.getUTCMonth()+1,0)).getUTCDate();
    return `${dest.getUTCFullYear()}-${String(dest.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`;
  }
  const moveMonth = (month,n) => addMonths(month+'-01',n).slice(0,7);
  function cents(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 1e10) throw Error('Valor inválido.');
    return Math.round((n + Number.EPSILON) * 100);
  }
  const money = value => (value/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const dayNumber = date => {const [y,m,d]=date.split('-').map(Number);return Date.UTC(y,m-1,d)/86400000;};
  function status(e, now=today()) {
    const revenue=e.nature==='Receita';
    if (e.paidDate) return {key:'paid',label:(revenue?'Recebido em ':'Pago em ')+formatDate(e.paidDate),color:'green',days:0};
    if (!e.date) return {key:'upcoming',label:'Sem data',color:'gray',days:null};
    const days=dayNumber(e.date)-dayNumber(now);
    if(days<0)return {key:'late',label:`${revenue?'Recebimento atrasado':'Atrasado'} há ${-days} ${days===-1?'dia':'dias'}`,color:'red',days};
    if(days===0)return {key:'today',label:revenue?'Recebe hoje':'Vence hoje',color:'orange',days};
    if(days===1)return {key:'tomorrow',label:revenue?'Recebe amanhã':'Vence amanhã',color:'yellow',days};
    return {key:'upcoming',label:`${revenue?'Recebe':'Vence'} em ${days} dias`,color:'gray',days};
  }
  function formatDate(d){return d?d.split('-').reverse().join('/'):'Sem data';}
  const monthOf=e=>e.date?e.date.slice(0,7):e.month;
  function monthEntries(state,month){return state.entries.filter(e=>monthOf(e)===month);}
  function dashboard(entries,now=today()) {
    let income=0,expense=0,paid=0,pending=0,late=0,received=0,fixed=0,variable=0,paidCount=0,count=0; const categoryTotals=new Map();
    for(const e of entries){if(e.nature==='Receita'){income+=e.amount;if(e.paidDate)received+=e.amount;continue;}
      count++;expense+=e.amount;categoryTotals.set(e.category,(categoryTotals.get(e.category)||0)+e.amount);
      if(e.type==='Fixo')fixed+=e.amount;else variable+=e.amount;
      if(e.paidDate){paid+=e.amount;paidCount++;}else{pending+=e.amount;if(status(e,now).key==='late')late+=e.amount;}
    }
    return {income,expense,balance:income-expense,paid,pending,late,received,fixed,variable,categories:Object.fromEntries(categoryTotals),count,paidCount,percent:count?Math.round(paidCount/count*100):0};
  }
  function alerts(entries,now=today()){
    const result={today:0,tomorrow:0,late:0,count:0};
    for(const e of entries){if(e.nature!=='Despesa'||e.paidDate)continue;result.count++;const k=status(e,now).key;if(k in result)result[k]++;}
    return result;
  }
  function empty(){return {version:3,entries:[],cards:[],goals:[],settings:{theme:'light',savingsGoal:0,budgets:{},notifications:false}};}
  function schedule(input,total=1,alreadyPaid=0,now=today()){
    if(!Number.isInteger(total)||total<1||total>360||!Number.isInteger(alreadyPaid)||alreadyPaid<0||alreadyPaid>total)throw Error('Parcelamento inválido.');
    if(total>1&&!input.date)throw Error('Informe o vencimento da primeira parcela.');
    const seriesId=total>1?uid():'',recurringId=input.repeat?uid():'';
    return Array.from({length:total},(_,i)=>({...input,id:uid(),date:input.date?addMonths(input.date,i):'',month:input.date?addMonths(input.date,i).slice(0,7):input.month,dueDay:input.date?Number(input.date.slice(8)):1,seriesId,installment:i+1,total,repeat:total===1&&Boolean(input.repeat),recurringId,paidDate:i<alreadyPaid?now:'',demo:Boolean(input.demo)}));
  }
  // Cria uma ocorrência por série recorrente no mês; chamadas repetidas são idempotentes.
  function ensureRecurring(state,month,copyFixed=false,sourceMonth=moveMonth(month,-1)){
    const source=copyFixed?monthEntries(state,sourceMonth):state.entries.filter(e=>e.repeat);
    let added=0;const seen=new Set();
    for(const e of source){
      if(e.total>1||(!copyFixed&&!e.repeat)||(copyFixed&&e.type!=='Fixo'&&!e.repeat))continue;
      const group=e.recurringId||e.id;if(seen.has(group))continue;seen.add(group);
      if(monthOf(e)>=month)continue;
      if(state.entries.some(x=>monthOf(x)===month&&(x.recurringId||x.id)===group))continue;
      const all=state.entries.filter(x=>(x.recurringId||x.id)===group&&monthOf(x)<month).sort((a,b)=>monthOf(b).localeCompare(monthOf(a)));
      const latest=all[0]||e;
      if(!copyFixed&&!latest.repeat)continue;
      const [targetYear,targetMonth]=month.split('-').map(Number);
      const day=Math.min(latest.dueDay||Number(latest.date.slice(8))||1,new Date(Date.UTC(targetYear,targetMonth,0)).getUTCDate());
      const date=latest.date?month+'-'+String(day).padStart(2,'0'):'';
      state.entries.push({...latest,id:uid(),recurringId:group,date,month,paidDate:''});added++;
    }return added;
  }
  function debts(state,now=today()){
    const groups=new Map();
    for(const e of state.entries){if(e.nature!=='Despesa'||!e.seriesId)continue;if(!groups.has(e.seriesId))groups.set(e.seriesId,{id:e.seriesId,name:e.name,card:e.card||'',total:0,paid:0,remaining:0,balance:0,next:''});const g=groups.get(e.seriesId);g.total++;if(e.paidDate)g.paid++;else{g.remaining++;g.balance+=e.amount;if(!g.next||e.date<g.next)g.next=e.date;}}
    return [...groups.values()].sort((a,b)=>b.balance-a.balance);
  }
  function migrate(old,month=today().slice(0,7)){
    if(!old||!Array.isArray(old.expenses)||!Number.isFinite(old.salary)||!Number.isFinite(old.extra))throw Error('Backup antigo inválido.');
    const state=empty();for(const e of old.expenses){const date=e.date||'';if(date&&!validDate(date))throw Error('Data antiga inválida.');state.entries.push(...schedule({name:String(e.name||'Conta').slice(0,120),amount:cents(e.value||0),date,month:date?date.slice(0,7):month,nature:'Despesa',type:e.type==='Fixo'?'Fixo':'Variável',category:'Outros',note:'',priority:'Normal',method:'Pix',card:'',repeat:false},1,e.paid?1:0));}
    for(const [name,value] of [['Salário',old.salary],['Extra',old.extra]])if(value>0)state.entries.push(...schedule({name,amount:cents(value),date:month+'-01',month,nature:'Receita',type:name==='Salário'?'Fixo':'Variável',category:name,note:'Importado do aplicativo anterior.',priority:'Normal',method:'Pix',card:'',repeat:false}));return state;
  }
  function validate(raw){
    if(raw&&Array.isArray(raw.expenses))return migrate(raw);
    if(!raw||raw.version!==3||!Array.isArray(raw.entries)||raw.entries.length>10000||!Array.isArray(raw.cards)||!Array.isArray(raw.goals)||!raw.settings)throw Error('Formato de backup inválido.');
    const seen=new Set(),isMoney=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e12;
    const str=(s,max=500)=>typeof s==='string'&&s.length<=max;
    for(const e of raw.entries){if(!str(e.id,100)||!e.id||seen.has(e.id)||!str(e.name,120)||!e.name.trim()||!isMoney(e.amount)||!validMonth(e.month)||!str(e.date)||e.date&&!validDate(e.date)||!['Receita','Despesa'].includes(e.nature)||!['Fixo','Variável'].includes(e.type)||!str(e.category,80)||!str(e.note,2000)||!['Normal','Alta'].includes(e.priority)||!['Dinheiro','Pix','Cartão','Boleto'].includes(e.method)||!str(e.card,100)||!str(e.seriesId,100)||!str(e.recurringId,100)||!Number.isInteger(e.installment)||!Number.isInteger(e.total)||e.total<1||e.total>360||e.installment<1||e.installment>e.total||typeof e.repeat!=='boolean'||!str(e.paidDate)||e.paidDate&&!validDate(e.paidDate)||e.repeat&&e.total>1)throw Error('Lançamento inválido no backup.');seen.add(e.id);}
    for(const c of raw.cards)if(!str(c.id,100)||!str(c.name,80)||!isMoney(c.limit)||!Number.isInteger(c.closing)||c.closing<1||c.closing>31||!Number.isInteger(c.due)||c.due<1||c.due>31)throw Error('Cartão inválido.');
    for(const g of raw.goals)if(!str(g.id,100)||!str(g.name,120)||!isMoney(g.target)||!isMoney(g.saved))throw Error('Meta inválida.');
    if(!['light','dark'].includes(raw.settings.theme)||!isMoney(raw.settings.savingsGoal)||typeof raw.settings.notifications!=='boolean'||!raw.settings.budgets||typeof raw.settings.budgets!=='object'||Array.isArray(raw.settings.budgets)||Object.entries(raw.settings.budgets).some(([k,v])=>!str(k,80)||!isMoney(v)))throw Error('Configurações inválidas.');
    for(const e of raw.entries)if(e.dueDay!==undefined&&(!Number.isInteger(e.dueDay)||e.dueDay<1||e.dueDay>31))throw Error('Dia de recorrência inválido.');
    return JSON.parse(JSON.stringify(raw));
  }
  function csv(entries){
    const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const safe=v=>typeof v==='string'&&/^[=+@\-\t\r]/.test(v)?"'"+v:v;
    const rows=[['Nome','Natureza','Tipo','Categoria','Valor (R$)','Vencimento/recebimento','Data paga/recebida','Parcela','Parcelas totais','Prioridade','Forma','Cartão','Observação'],...entries.map(e=>[e.name,e.nature,e.type,e.category,(e.amount/100).toFixed(2).replace('.',','),formatDate(e.date),e.paidDate?formatDate(e.paidDate):'',e.installment,e.total,e.priority,e.method,e.card,e.note])];
    return '\uFEFF'+rows.map(row=>row.map(v=>quote(safe(v))).join(';')).join('\r\n');
  }
  return {uid,today,validDate,validMonth,addMonths,moveMonth,cents,money,status,formatDate,monthOf,monthEntries,dashboard,alerts,empty,schedule,ensureRecurring,debts,migrate,validate,csv};
});
