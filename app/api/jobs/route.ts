import {NextRequest,NextResponse} from 'next/server';

type RawJob={id?:string;title?:string;company?:{display_name?:string};location?:{display_name?:string};redirect_url?:string;description?:string;salary_min?:number;salary_max?:number;created?:string;contract_time?:string;contract_type?:string};
type Job={id:string;title:string;company:string;location:string;url?:string;description:string;salaryMin:number|null;salaryMax:number|null;created:string|null;employmentType:string|null;matchScore:number|null;titleRelevance:number;source:string};
const stop=new Set('the a an and or to of in for with on at by from is are be as this that you your our we they their will can should must have has job role work experience skills years using about into'.split(' '));
function words(s:string){return [...new Set((s.toLowerCase().match(/[a-z][a-z+#.-]{2,}/g)||[]).filter(w=>!stop.has(w)))];}
function scoreJob(description:string,resume:string){const jw=words(description);if(!jw.length||!resume.trim())return null;const rw=new Set(words(resume));const hit=jw.filter(w=>rw.has(w)).length;return Math.min(100,Math.round((hit/jw.length)*100));}
function titleScore(jobTitle:string,query:string){const q=words(query),t=new Set(words(jobTitle));if(!q.length)return 0;return q.filter(w=>t.has(w)).length/q.length;}
function clean(s:string){return s.toLowerCase().replace(/&amp;/g,'and').replace(/[^a-z0-9]+/g,' ').trim();}
function dedupeKey(j:Job){return [clean(j.title),clean(j.company),clean(j.location)].join('|');}
function dedupe(jobs:Job[]){const seen=new Map<string,Job>();for(const j of jobs){const k=dedupeKey(j);const old=seen.get(k);if(!old||j.source==='USAJOBS')seen.set(k,j);}return [...seen.values()];}
function text(v:any){return typeof v==='string'?v:'';}
function usaDescription(d:any){const details=d?.UserArea?.Details||{};return text(details.JobSummary)||text(details.MajorDuties)||text(d?.QualificationSummary)||'';}
function usaLocation(d:any){const a=Array.isArray(d?.PositionLocation)?d.PositionLocation:[];return a.map((x:any)=>text(x?.LocationName)).filter(Boolean).join('; ')||'United States';}

export async function POST(req:NextRequest){
 const body=await req.json().catch(()=>({}));
 const title=String(body.title||'').trim(),location=String(body.location||'').trim(),resume=String(body.resume||''),remote=Boolean(body.remote);
 const locationMode=body.locationMode==='precise'?'precise':'general';
 const radius=Math.max(5,Math.min(100,Number(body.radius)||25));
 if(!title)return NextResponse.json({error:'Job title is required.'},{status:400});
 if(!remote&&!location)return NextResponse.json({error:'Location is required for local searches.'},{status:400});
 const jobs:Job[]=[]; const providerErrors:string[]=[];

 const id=process.env.ADZUNA_APP_ID,key=process.env.ADZUNA_APP_KEY;
 if(id&&key){
  const p=new URLSearchParams({app_id:id,app_key:key,results_per_page:'40',what:title,distance:String(radius),'content-type':'application/json',sort_by:'date'});
  if(remote)p.set('what_and','remote');
  else if(locationMode==='precise'){
   const [latRaw,lonRaw]=location.split(','),lat=Number(latRaw),lon=Number(lonRaw);
   if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180)return NextResponse.json({error:'Precise location is invalid.'},{status:400});
   p.set('latitude',String(lat));p.set('longitude',String(lon));
  }else p.set('where',location);
  try{
   const r=await fetch('https://api.adzuna.com/v1/api/jobs/us/search/1?'+p.toString(),{next:{revalidate:600}});
   if(!r.ok)throw new Error('Adzuna '+r.status);
   const d=await r.json();
   for(const j of d.results||[])jobs.push({id:'adzuna:'+String(j.id||j.redirect_url||Math.random()),title:j.title||'Untitled role',company:j.company?.display_name||'Employer',location:j.location?.display_name||'United States',url:j.redirect_url,description:j.description||'',salaryMin:j.salary_min??null,salaryMax:j.salary_max??null,created:j.created||null,employmentType:j.contract_time||j.contract_type||null,matchScore:scoreJob(j.description||'',resume),titleRelevance:titleScore(j.title||'',title),source:'Adzuna'});
  }catch{providerErrors.push('Adzuna');}
 }

 const usaKey=process.env.USAJOBS_API_KEY,usaEmail=process.env.USAJOBS_EMAIL;
 if(usaKey&&usaEmail){
  const p=new URLSearchParams({PositionTitle:title,ResultsPerPage:'50',Fields:'Full'});
  if(remote)p.set('RemoteIndicator','True');
  else if(locationMode==='general'){p.set('LocationName',location);p.set('Radius',String(radius));}
  try{
   const r=await fetch('https://data.usajobs.gov/api/search?'+p.toString(),{headers:{'User-Agent':usaEmail,'Authorization-Key':usaKey,'Host':'data.usajobs.gov'},next:{revalidate:600}});
   if(!r.ok)throw new Error('USAJOBS '+r.status);
   const d=await r.json();
   for(const item of d?.SearchResult?.SearchResultItems||[]){
    const j=item?.MatchedObjectDescriptor||{},desc=usaDescription(j),pay=j?.PositionRemuneration?.[0]||{};
    jobs.push({id:'usajobs:'+String(j.PositionID||item.MatchedObjectId||j.PositionURI),title:j.PositionTitle||'Federal position',company:j.OrganizationName||j.DepartmentName||'U.S. Federal Government',location:usaLocation(j),url:j.PositionURI||j.ApplyURI?.[0],description:desc,salaryMin:Number.isFinite(Number(pay.MinimumRange))?Number(pay.MinimumRange):null,salaryMax:Number.isFinite(Number(pay.MaximumRange))?Number(pay.MaximumRange):null,created:j.PublicationStartDate||j.PositionStartDate||null,employmentType:j.PositionSchedule?.[0]?.Name||null,matchScore:scoreJob(desc,resume),titleRelevance:titleScore(j.PositionTitle||'',title),source:'USAJOBS'});
   }
  }catch{providerErrors.push('USAJOBS');}
 }

 if(!id&&!key&&!usaKey&&!usaEmail)return NextResponse.json({jobs:[],setupRequired:true,error:'Live job provider credentials are not configured.'});
 const unique=dedupe(jobs).sort((a,b)=>resume.trim()?(b.matchScore??-1)-(a.matchScore??-1)||b.titleRelevance-a.titleRelevance:b.titleRelevance-a.titleRelevance);
 return NextResponse.json({jobs:unique,count:unique.length,providers:{adzuna:Boolean(id&&key),usajobs:Boolean(usaKey&&usaEmail)},providerErrors});
}

export async function GET(req:NextRequest){
 const q=req.nextUrl.searchParams;
 return POST(new NextRequest(req.url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:q.get('title'),location:q.get('location'),locationMode:q.get('locationMode'),radius:q.get('radius'),remote:q.get('remote')==='1'})}));
}
