const API = import.meta.env.VITE_API_URL || '/api';
export async function api(path, options={}) {
 const token=localStorage.getItem('latielle_token');
 const res=await fetch(`${API}${path}`,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{ }),...(options.headers||{})}});
 const body=await res.json().catch(()=>null);
 if(!res.ok) throw new Error(body?.error||`Request failed (${res.status})`);
 return body;
}
export const authApi={
 register:(data)=>api('/auth/register',{method:'POST',body:JSON.stringify(data)}),
 login:(data)=>api('/auth/login',{method:'POST',body:JSON.stringify(data)}),
 me:()=>api('/me')
};
