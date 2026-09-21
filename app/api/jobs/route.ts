import {NextRequest,NextResponse} from 'next/server';

type RawJob={id?:string;title?:string;company?:{display_name?:string};location?:{display_name?:string};redirect_url?:string;description?:string;salary_min?:number;salary_max?:number;created?:string;contract_time?:string;contract_type?:string};
const stop=new Set('the a an and or to of in for with on at by from is are be as this that you your our we they their will can should must have has job role work experience skills years using about into'.split(' '));
function words(s:string){return [...new Set((s.toLowerCase().match(/[a-z][a-z+#.-]{2,}/g)||[]).filter(w=>!stop.has(w)))];}
function scoreJob(description:string,resume:string){const jw=words(description);if(!jw.length||!resume.trim())return null;const rw=new Set(words(resume));const hit=jw.filter(w=>rw.has(w)).length;return Math.min(100,Math.round((hit/jw.length)*100));}

export async function POST(req:NextRequest){
 const body=await req.json().catch(()=>({}));const title=String(body.title||'').trim(),location=String(body.location||'').trim(),radius=String(body.radius||25),resume=String(body.resume||''),remote=Boolean(body.remote);
 if(!title)return NextResponse.json({error:'Job title is required.'},{status:400});
 if(!remote&&!location)return NextResponse.json({error:'Location is required for local searches.'},{status:400});
 const id=process.env.ADZUNA_APP_ID,key=process.env.ADZUNA_APP_KEY;
 if(!id||!key)return NextResponse.json({jobs:[],setupRequired:true,error:'Live job provider credentials are not configured.'});
 const p=new URLSearchParams({app_id:id,app_key:key,results_per_page:'40',what:title,distance:radius,'content-type':'application/json',sort_by:'date'});
 if(remote)p.set('what_and','remote'); else if(location.includes(',')){const [lat,lon]=location.split(',');p.set('latitude',lat);p.set('longitude',lon);} else p.set('where',location);
 try{
  const r=await fetch('https://api.adzuna.com/v1/api/jobs/us/search/1?'+p.toString(),{next:{revalidate:600}});
  if(!r.ok)throw new Error('provider');
  const d=await r.json();
  const jobs=(d.results||[]).map((j:RawJob)=>({id:j.id,title:j.title||'Untitled role',company:j.company?.display_name||'Employer',location:j.location?.display_name||'United States',url:j.redirect_url,description:j.description||'',salaryMin:j.salary_min??null,salaryMax:j.salary_max??null,created:j.created||null,employmentType:j.contract_time||j.contract_type||null,matchScore:scoreJob(j.description||'',resume)})).sort((a:any,b:any)=>(b.matchScore??-1)-(a.matchScore??-1));
  return NextResponse.json({jobs,count:jobs.length});
 }catch{return NextResponse.json({jobs:[],error:'Live job search is temporarily unavailable.'},{status:502});}
}

export async function GET(req:NextRequest){
 const q=req.nextUrl.searchParams;
 return POST(new NextRequest(req.url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:q.get('title'),location:q.get('location'),radius:q.get('radius'),remote:q.get('remote')==='1'})}));
}