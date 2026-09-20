import {NextRequest,NextResponse} from 'next/server';
export async function GET(req:NextRequest){
 const q=req.nextUrl.searchParams,title=q.get('title')||'',location=q.get('location')||'',radius=q.get('radius')||'25';
 const id=process.env.ADZUNA_APP_ID,key=process.env.ADZUNA_APP_KEY;
 if(!id||!key)return NextResponse.json({jobs:[],setupRequired:true});
 const p=new URLSearchParams({app_id:id,app_key:key,results_per_page:'30',what:title,distance:radius,'content-type':'application/json'});
 if(location&&!location.includes(','))p.set('where',location);
 else if(location){const [lat,lon]=location.split(',');p.set('latitude',lat);p.set('longitude',lon);}
 try{const r=await fetch('https://api.adzuna.com/v1/api/jobs/us/search/1?'+p.toString(),{next:{revalidate:900}});if(!r.ok)throw new Error('provider');const d=await r.json();const jobs=(d.results||[]).map((j:any)=>({id:j.id,title:j.title,company:j.company?.display_name||'Employer',location:j.location?.display_name||'United States',url:j.redirect_url,description:j.description||'',salaryMin:j.salary_min||null,salaryMax:j.salary_max||null}));return NextResponse.json({jobs});}catch{return NextResponse.json({jobs:[],error:'Job provider unavailable'},{status:502});}
}