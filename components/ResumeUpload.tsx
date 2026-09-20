'use client';
import { ChangeEvent, DragEvent, useRef, useState } from 'react';

export default function ResumeUpload({onText}:{onText:(text:string)=>void}) {
  const input=useRef<HTMLInputElement>(null);
  const [name,setName]=useState('');
  const [note,setNote]=useState('PDF, DOC, DOCX or TXT');

  async function handle(file?:File){
    if(!file)return;
    setName(file.name);
    if(file.type==='text/plain'||file.name.toLowerCase().endsWith('.txt')){
      onText(await file.text());
      setNote('Resume loaded and ready to review.');
    } else {
      setNote('Resume selected. Document text extraction will process this file in the next processing step.');
    }
  }
  function change(e:ChangeEvent<HTMLInputElement>){handle(e.target.files?.[0])}
  function drop(e:DragEvent<HTMLDivElement>){e.preventDefault();handle(e.dataTransfer.files?.[0])}
  return <div className="resumeUpload" onDragOver={e=>e.preventDefault()} onDrop={drop}>
    <input ref={input} hidden type="file" accept=".pdf,.doc,.docx,.txt" onChange={change}/>
    <button type="button" className="uploadButton" onClick={()=>input.current?.click()}>Upload existing resume</button>
    <strong>{name||'Drop your resume here'}</strong>
    <span>{note}</span>
  </div>
}