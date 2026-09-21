'use client';
import {useEffect,useState} from 'react';

function formatSalary(min:any,max:any){const a=Number(min)||0,b=Number(max)||0;if(!a&&!b)return '';const money=(n:number)=>'$'+Math.round(n).toLocaleString();if(a&&b)return Math.round(a)===Math.round(b)?money(a):money(a)+'–'+money(b);return money(a||b)}

export default function JobPage(){
 const[job,setJob]=useState<any>(null);
 useEffect(()=>{try{const raw=sessionStorage.getItem('hirevora:selectedJob');if(raw)setJob(JSON.parse(raw))}catch{}},[]);
 if(!job)return <main><nav><b>HIREVORA</b><a href="/">Back to job search</a></nav><section className="builder"><div><span className="pill">JOB DETAILS</span><h2>Job details aren't available.</h2><p>Return to the search and choose a job again.</p><a href="/">← Back to jobs</a></div></section></main>;
 return <main><nav><b>HIREVORA</b><a href="/">← Back to results</a></nav><section className="builder"><div><span className="pill">JOB DETAILS</span><h1>{job.title}</h1><p><strong>{job.company}</strong></p><p>{job.location}</p>{formatSalary(job.salaryMin,job.salaryMax)&&<p><strong>{formatSalary(job.salaryMin,job.salaryMax)}</strong></p>}{job.employmentType&&<p>{job.employmentType}</p>}{job.matchScore!=null&&<p><strong>{job.matchScore}% resume match</strong></p>}</div><div><h2>About this job</h2><p style={{whiteSpace:'pre-wrap'}}>{job.description||'The provider did not include a full description for this opening.'}</p>{job.url&&<a href={job.url} target="_blank" rel="noreferrer" className="applyButton">Apply on employer site →</a>}<p><small>You stay on Hirevora while reviewing the job. The application button opens the employer or listing provider only when you choose to apply.</small></p></div></section></main>
}
