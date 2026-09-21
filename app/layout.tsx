import './globals.css';
export const metadata={
 title:'Hirevora',
 description:'Find live jobs, compare opportunities, and build your future with Hirevora.',
 icons:{icon:'/icon.svg',shortcut:'/icon.svg',apple:'/icon.svg'}
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}