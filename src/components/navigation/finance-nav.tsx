import Link from 'next/link';
import { BadgeCheck, History, ReceiptText, Settings2, Wallet } from 'lucide-react';
const items = [
 {key:'overview',label:'Financial overview',href:'',icon:Wallet,description:'Balance and financial shortcuts'},
 {key:'contribute',label:'Submit a contribution',href:'/contribute',icon:Wallet,description:'Report a standard or additional payment'},
 {key:'expense',label:'Record a group expense',href:'/expenses/new',icon:ReceiptText,description:'Add an official group expense'},
 {key:'settings',label:'Standard contribution setting',href:'/settings',icon:Settings2,description:'Set the expected amount per member'},
 {key:'payments',label:'Payments awaiting verification',href:'/payments',icon:BadgeCheck,description:'Review submitted payments'},
 {key:'transactions',label:'Transaction history',href:'/transactions',icon:History,description:'Browse the official financial ledger'},
];
export function FinanceNav({groupId,active,canManage,isManager,pendingCount=0}:{groupId:string;active:string;canManage:boolean;isManager:boolean;pendingCount?:number}) {
 const visible=items.filter(i=>!(i.key==='expense'||i.key==='payments')||canManage).filter(i=>i.key!=='settings'||isManager);
 return <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visible.map(item=>{const Icon=item.icon;const selected=active===item.key;return <Link key={item.key} href={`/groups/${groupId}/finances${item.href}`} aria-current={selected?'page':undefined} className={`group flex min-h-[92px] items-center gap-3 rounded-2xl border p-4 transition active:scale-[.99] ${selected?'border-[#d6a84b] bg-[#fffaf0] shadow-sm':'border-slate-200 bg-white hover:border-slate-300'}`}><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${selected?'bg-[#10243a] text-[#e5bb68]':'bg-slate-100 text-[#10243a]'}`}><Icon size={20}/></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold leading-5 text-slate-900">{item.label}</span><span className="mt-1 block text-xs leading-4 text-slate-500">{item.description}</span></span>{item.key==='payments'&&pendingCount>0&&<span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">{pendingCount}</span>}</Link>})}</section>;
}
