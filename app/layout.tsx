import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Life OS — пространство для важного',description:'Персональный планировщик, календарь и ИИ-наставник'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ru"><body>{children}</body></html>}
